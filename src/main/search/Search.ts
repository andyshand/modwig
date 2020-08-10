import { BrowserWindow, screen, app } from "electron";
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
let currTrackScroll = 0

const WINDOW_HEIGHT = 480
const WINDOW_WIDTH = 370

export async function setupNavigation() {
    const db = await getDb()
    const projectTracks = db.getRepository(ProjectTrack)
    const projects = db.getRepository(Project)
    
    async function loadScrollForTrack(name: string, project: string) {
        const existingProject = await projects.findOne({where: {name: project}})
        if (!existingProject) return 0

        const saved = await projectTracks.findOne({
            where: {
                project_id: existingProject.id,
                name
            }
        });
        return saved?.scroll || 0
    }
    const defaultFields = {scroll: 0, data: {}}
    async function createOrUpdateTrack(track: string, project: string, fields: Partial<typeof defaultFields> = {scroll: 0, data: {}}) {
        const existingProject = await projects.findOne({where: {name: project}})
        let projectId = existingProject?.id
        if (!projectId) {
            projectId = await projects.save(projects.create({name: project }))
        }

        const existingTrack = await projectTracks.findOne({where: {name: track}})
        if (existingTrack) {
            console.log(`updating track (${existingTrack.name}) with fields: ` + fields)
            await projectTracks.update(existingTrack.id, fields);
        } else {
            const newTrack = projectTracks.create({ 
                name: track,
                project_id: projectId,
                ...defaultFields, 
                ...fields
            })
            await projectTracks.save(newTrack);
        }
    }
    async function saveScrollForTrack(scroll, track, project) {
        return createOrUpdateTrack(track, project, {
            scroll
        })
    }
    
    windowOpen = new BrowserWindow({ 
        width: WINDOW_WIDTH, 
        height: WINDOW_HEIGHT, 
        frame: false, 
        show: true,
        // transparent: true,
        webPreferences: {
            nodeIntegration: true,
        }
        // alwaysOnTop: true
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
            // const { width, height } = screen.getPrimaryDisplay().workAreaSize
            // windowOpen.setBounds({   
            //     x: width / 2 - WINDOW_WIDTH / 2,
            //     y: height - WINDOW_HEIGHT * 2,
            //     width: WINDOW_WIDTH,
            //     height: WINDOW_HEIGHT
            // }, false)
            windowOpen.show()
            windowOpen.focus()
            // windowOpen.webContents.openDevTools()
        } else if (windowOpen && lowerKey === "Escape") {
            // escape pressed, but we quit from client atm
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

    interceptPacket('tracksearch/confirm', undefined, ({ data: trackName }) => {
        waitingToScroll = true
        console.log('waiting to scroll: ', trackName)
    })
    interceptPacket('trackselected', undefined, async ({ data: { name: newTrackName, selected, project }}) => {
        if (selected) {
            if (currTrack && currProject) {
                saveScrollForTrack(currTrackScroll, currTrack, currProject)
            }
            currProject = project.name
            currTrackScroll = await loadScrollForTrack(newTrackName, currProject!)
            if (currTrackScroll > 0) {
                doScroll(currTrackScroll)
            }
            waitingToScroll = false
            currTrack = newTrackName
        }
    })
    interceptPacket('project', undefined, async ({ data: { name: projectName } }) => {
        currProject = projectName
    })
    interceptPacket('tracks', undefined, async ({ data: tracks}) => {
        const existingProject = await projects.findOne({where: {name: currProject }})
        console.log('Sending tracks for project ', existingProject.id)
        if (existingProject) {
            // We might have save-data to add to each track
            for (const t of tracks) {
                const savedTrack = await projectTracks.findOne({where: {project_id: existingProject.id, name: t.name}})
                if (savedTrack) {
                    t.data = savedTrack.data
                }
            }
            return { modified: true }
        }
    })
    interceptPacket('track/save', ({ data: { name: trackName, data }}) => {
        if (typeof currProject === 'string') {
            createOrUpdateTrack(trackName, currProject, { data })
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
            currTrackScroll = Math.max(0, currTrackScroll - dX)            
            console.log(currTrackScroll)
            lastX = event.x
        }
    }))
}
