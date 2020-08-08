import { BrowserWindow, screen } from "electron";
import { url } from "../core/Url";
import { sendPacketToBitwig, interceptPacket } from "../../connector/shared/WebsocketToSocket";
import { returnMouseAfter, whenActiveListener } from "../../connector/shared/EventUtils";
import { getDb } from "../db";
import { ProjectTrack } from "../db/entities/ProjectTrack";
import { SelectQueryBuilder } from "typeorm";
import { Project } from "../db/entities/Project";
const { execSync } = require('child_process')
const { Keyboard, Mouse, MainWindow, Bitwig } = require('bindings')('bes')
let windowOpen

let currTrack: string | null = null
let currProject: string | null = null
let waitingToScroll = false
const WINDOW_HEIGHT = 400
const WINDOW_WIDTH = 500

export async function setupNavigation() {
    const db = await getDb()
    const projectTracks = db.getRepository(ProjectTrack)
    const projects = db.getRepository(Project)
    const loadScrollForTrack = async name => {
        if (!currProject) return 0
        const saved = await projectTracks.findOne({
            where: (qb: SelectQueryBuilder<ProjectTrack>) => {
                qb.where({
                    name
                }).andWhere('ProjectTrack_project.name = :currProject', { currProject })
            }
        });
        return saved?.scroll || 0
    }
    const saveScrollForCurrentTrack = async (dX) => {
        if (currTrack && currProject) {
            const currScroll = await loadScrollForTrack(currTrack)
            const newScroll = Math.max(0, currScroll + dX)
            let {id: projectId} = await projects.findOne({where: {name: currProject}})
            if (!projectId) {
                projectId = await projects.save(projects.create({name: currProject }))
            }

            const existingTrack = await projectTracks.findOne({where: {name: currTrack}})
            if (existingTrack) {
                await projectTracks.update(existingTrack.id, {scroll: newScroll});
            } else {
                const newTrack = projectTracks.create({ 
                    name: currTrack,
                    scroll: newScroll,
                    project_id: projectId
                })
                await projectTracks.save(newTrack);
            }
        }
    }
    
    windowOpen = new BrowserWindow({ 
        width: WINDOW_WIDTH, 
        height: WINDOW_HEIGHT, 
        frame: false, 
        show: false,
        // transparent: true,
        webPreferences: {
            nodeIntegration: true,
        },
        alwaysOnTop: process.env.NODE_ENV !== 'dev'
    })
    windowOpen.loadURL(url('/#/search'))

    let middleMouseDown = false
    let lastX = 0

    Keyboard.addEventListener('keydown', whenActiveListener(event => {
        const { lowerKey, Control, Meta } = event
        if (Meta) {
            if (lowerKey === 'F1') {
                sendPacketToBitwig({type: 'tracknavigation/back'})
            } else if (lowerKey === 'F2') {
                sendPacketToBitwig({type: 'tracknavigation/forward'})
            }
            waitingToScroll = true
        }
        if (lowerKey === 'Space' && Control) {
            // Control + space pressed
            const { width, height } = screen.getPrimaryDisplay().workAreaSize
            windowOpen.setBounds({   
                x: width / 2 - WINDOW_WIDTH / 2,
                y: height - WINDOW_HEIGHT * 2,
                width: WINDOW_WIDTH,
                height: WINDOW_HEIGHT
            }, false)
            windowOpen.show()
            windowOpen.focus()
            // windowOpen.webContents.openDevTools()
        } else if (windowOpen && lowerKey === "Escape") {
            // escape pressed
            // but we quit from client atm
        }
    }))
    
    function doScroll(dX) {
        returnMouseAfter(() => {
            const frame = MainWindow.getFrame()
            const startX = frame.x + frame.w - 50
            const startY = frame.y + frame.h - 160
            Mouse.setPosition(startX, startY)
            Mouse.down(1)
            Mouse.setPosition(startX - dX, startY)
            Mouse.up(1)
            middleMouseDown = false
        })
    }

    interceptPacket('tracksearch/confirm', undefined, ({ type, data: trackName }) => {
        waitingToScroll = true
        console.log('waiting to scroll: ', trackName)
    })
    interceptPacket('trackselected', undefined, async ({ type, data: { name, position, selected, project }}) => {
        if (selected) {
            currProject = project.name
            const targetScroll = await loadScrollForTrack(name)
            if (targetScroll > 0) {
                doScroll(targetScroll)
            }
            waitingToScroll = false
            currTrack = name
        }
    })

    // Scroll position tracking
    Keyboard.addEventListener('mousedown', whenActiveListener(event => {
        if (event.y >= 1159 && event.x > 170) {
            if (event.button === 1) {
                middleMouseDown = true
                lastX = event.x
            } else if (event.button === 0 && event.Alt && currTrack && currTrack.toLowerCase() === 'mixing') {
                // Alt click to jump to track in name of macro (if current track is "mixing")
                execSync(`echo "" | pbcopy`)
                Keyboard.keyPress('a', {Meta: true}) // select all
                Keyboard.keyPress('c', {Meta: true}) // copy!
                Keyboard.keyPress('Escape') // esc
                const output = execSync(`pbpaste`).toString().trim()
                if (output.length > 0) {
                    sendPacketToBitwig({type: 'tracksearch/confirm', data: output})
                }
            }
        }
    }))
    Keyboard.addEventListener('mouseup', whenActiveListener(event => {
        middleMouseDown = false
    }))
    Keyboard.addEventListener('mousemoved', whenActiveListener(event => {
        if (middleMouseDown) {
            const dX = event.x - lastX
            saveScrollForCurrentTrack(-dX)
            lastX = event.x
        }
    }))
}
