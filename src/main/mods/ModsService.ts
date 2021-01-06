import { sendPacketToBitwig, interceptPacket, sendPacketToBrowser, addAPIMethod, sendPacketToBitwigPromise, SocketMiddlemanService } from "../core/WebsocketToSocket"
import { BESService, getService, makeEvent } from "../core/Service"
import { returnMouseAfter, whenActiveListener } from "../../connector/shared/EventUtils"
import { getDb } from "../db"
import { ProjectTrack } from "../db/entities/ProjectTrack"
import { Project } from "../db/entities/Project"
import { getResourcePath } from '../../connector/shared/ResourcePath'
import { SettingsService } from "../core/SettingsService"
import { promises as fs } from 'fs'
import * as path from 'path'
import { Setting } from "../db/entities/Setting"
import { createDirIfNotExist, exists as fileExists, filesAreEqual } from "../core/Files"
import { logWithTime } from "../core/Log"
import { ShortcutsService } from "../shortcuts/Shortcuts"
import { debounce } from '../../connector/shared/engine/Debounce'
import _ from 'underscore'
import { BrowserWindow, clipboard } from "electron"
import { url } from "../core/Url"
import { normalizeBitwigAction } from "./actionMap"
const chokidar = require('chokidar')
const colors = require('colors');

let nextId = 0
let modsLoading = false
function intersectsPluginWindows(event) {
    if ('_intersectsPluginWindows' in event) {
        return event._intersectsPluginWindows
    }
    const pluginLocations = Bitwig.getPluginWindowsPosition()
    for (const key in pluginLocations) {
        const {x, y, w, h, ...rest} = pluginLocations[key]
        if (event.x >= x && event.x < x + w && event.y >= y && event.y < y + h) {
            let out = {
                id: key,
                x,
                y,
                w,
                h,
                ...rest
            }
            event._intersectsPluginWindows = true
            return out
        }
    }
    event._intersectsPluginWindows = false
    return false
}

export function showMessage(msg, { timeout } = { timeout: 5000 }) {
    openCanvasWindow(`/canvas`, {
        data: {
            notifications: [
                {
                    content: msg,
                    id: nextId++,
                    timeout,
                    date: new Date().getTime()
                }   
            ]
        },
        width: 2560,
        height: 1440
    })
}

export function updateCanvas(state) {
    openCanvasWindow(`/canvas`, {
        data: state,
        width: 2560,
        height: 1440
    })
}

/**
* Opens a floating window for a short amount of time, fading out afterwards. Meant for brief display of contextual information
*/
function makeWindowOpener() {
    let floatingWindowInfo: {
        window: BrowserWindow,
        path: string
    } | undefined
    let fadeOutTimeout: any
    return function openFloatingWindow(path, options: {x?: number, y?: number, data?: any, timeout?: number, width: number, height: number}) {
       if (fadeOutTimeout) {
           clearTimeout(fadeOutTimeout)
       }
   
       const debug = false
    //    logWithTime(`Opening floating window with path: ${path} and options: `, options)
    //    logWithTime(`Floating window info: `, floatingWindowInfo)
       if (!floatingWindowInfo || path !== floatingWindowInfo.path) {
           floatingWindowInfo?.window.close()
           floatingWindowInfo = {
               path,
               window: new BrowserWindow({ 
                   width: options.width, 
                   height: options.height, 
                   opacity: 1,
                   frame: false,
                   show: false,
                   alwaysOnTop: true,
                   focusable: debug,
                   closable: debug,
                   x: options.x ?? MainWindow.getMainScreen().w / 2 - options.width / 2,
                   y: options.y ?? MainWindow.getMainScreen().h / 2 - options.height / 2,
                   transparent: true,
                   fullscreenable: false,
                   webPreferences: {
                       webSecurity: false,
                       nodeIntegration: true,
                   }
               })
           }
           if (!debug) {
            floatingWindowInfo.window.setIgnoreMouseEvents(true);
           }
           floatingWindowInfo.window.loadURL(url(`/#/loading`))
           // ;(floatingWindowInfo!.window as any).toggleDevTools()    
       }
   
       if (options.data) {
           floatingWindowInfo!.window.webContents.executeJavaScript(`
                window.tryLoadURL = (tries = 0) => {
                   window.data = ${JSON.stringify(options.data)}
                   if (window.loadURL) {
                       window.loadURL(\`${path}\`)
                   } else if (tries < 10) {
                       setTimeout(() => tryLoadURL(tries + 1), 100)
                   } else {
                       console.error(\`Couldn't find loadURL on window, something went wrong\`)
                   }
               }
               tryLoadURL()
           `).then(() => {
               logWithTime('Showing window')
               floatingWindowInfo!.window.setOpacity(1)
               floatingWindowInfo!.window.showInactive()
   
               function doFadeOut(opacity: number = 1) {
                   const newOpacity = opacity - .1
                   if (newOpacity <= 0) {
                       floatingWindowInfo!.window.hide()
                   } else {   
                       floatingWindowInfo!.window.setOpacity(newOpacity)
                       fadeOutTimeout = setTimeout(() => {
                           doFadeOut(newOpacity)
                       }, 50)
                   }
               }
           
               if (options.timeout && !debug) {
                fadeOutTimeout = setTimeout(() => {
                    doFadeOut(1)
                }, options.timeout)
                }
           }).catch(e => {
               logWithTime(colors.red(e))
           })
       }
   }
}

const openFloatingWindow = makeWindowOpener()
const openCanvasWindow = makeWindowOpener()

const { Keyboard, Mouse, MainWindow, Bitwig, UI } = require('bindings')('bes')
const UIMainWindow = new UI.BitwigWindow({})

interface ModInfo {
    name: string
    version: string
    settingsKey: string
    description: string
    category: string
    id: string
    path: string
    noReload: boolean
    valid: boolean
    error?: any
}

interface CueMarker {
    name: string
    position: number
    color: string
}

interface Device {
    name: string
}

export class ModsService extends BESService {
    currProject: string | null = null
    currTrack: string | null = null
    cueMarkers: CueMarker[] = []
    currDevice: Device | null = null
    browserIsOpen = false
    settingsService = getService<SettingsService>('SettingsService')
    folderWatcher?: any
    controllerScriptFolderWatcher?: any
    latestModsMap: { [name: string]: Partial<ModInfo> } = {}
    onReloadMods: Function[] = []
    refreshCount = 0
    shortcutsService = getService<ShortcutsService>("ShortcutsService")
    suckitService = getService<SocketMiddlemanService>("SocketMiddlemanService")
    activeEngineProject: string | null = null
    tracks: any[] = []
    activeModApiIds: {[key: string]: boolean} = {}
    events = {
        selectedTrackChanged: makeEvent<any>(),
        browserOpen: makeEvent<boolean>(),
        projectChanged: makeEvent<number>(),
        modsReloaded: makeEvent<void>(),
        activeEngineProjectChanged: makeEvent<string>()
    }

    get simplifiedProjectName() {
        if (!this.currProject) {
            return null
        }
        return this.currProject.split(/v[0-9]+/)[0].trim().toLowerCase()
    }

    lastLogMsg = ''
    sameMessageCount = 0
    waitingMessagesByModId: {[modId: string]: {msg: string, count: number}[]} = {}

    logTimeout 
    eventLogger = ({msg, modId}) => {
        if (process.env.NO_LOG) {
            return
        }

        const messagesForMod = this.waitingMessagesByModId[modId] || []
        const lastMessage = messagesForMod[messagesForMod.length - 1]
        if (lastMessage && lastMessage.msg === msg) {
            messagesForMod[messagesForMod.length - 1].count++
        } else {
            messagesForMod.push({msg, count: 1})
        }
        this.waitingMessagesByModId[modId] = messagesForMod

        clearTimeout(this.logTimeout)
        this.logTimeout = setTimeout(() => {
            for (const { msg, count } of messagesForMod) {
                this.logForModWebOnly(modId, msg + (count > 1 ? ` (${count})` : ''))
            }
            this.waitingMessagesByModId[modId] = []
        }, 250)
    }

    logForMod(modId: string, ...args: any[]) {
        this.logForModWebOnly(modId, ...args)
        logWithTime(colors.green(modId), ...args)
    }

    logForModWebOnly(modId: string, ...args: any[]) {
        const socketsForWithModId = this.suckitService.getActiveWebsockets().filter(({id, ws, activeModLogKey}) => activeModLogKey === modId)
        for (const socc of socketsForWithModId) {
            socc.send({
                type: 'log',
                data: args
            })
        }
    }

    async makeApi(mod) {
        const db = await getDb()
        const projectTracks = db.getRepository(ProjectTrack)
        const projects = db.getRepository(Project)
        const that = this
        
        const defaultData = { }
        async function loadDataForTrack(name: string, project: string) {
            const existingProject = await projects.findOne({ where: { name: project } })
            if (!existingProject) {
                that.log(`No project exists for ${project} (track name: ${name}), returning default data`)
                return defaultData
            }
            const saved = await projectTracks.findOne({
                where: {
                    project_id: existingProject.id,
                    name
                }
            });
            let data = saved ? saved.data : defaultData
            return data
        }
        async function getProjectIdForName(project: string, create: boolean = false) : Promise<string | null> {
            const existingProject = await projects.findOne({ where: { name: project } })
            if (!existingProject && create) {
                const newProjectId = (await projects.save(projects.create({ name: project, data: {} }))).id
                that.log(`Created new project with id ${newProjectId}`)
                return newProjectId
            } else {
                return existingProject?.id ?? null
            }
        }
        async function createOrUpdateTrack(track: string, project: string, data: any) {
            const projectId = await getProjectIdForName(project, true)
            const existingTrack = await projectTracks.findOne({ where: { name: track, project_id: projectId } })
            if (existingTrack) {
                logWithTime(`Updating track (${existingTrack.name} (id: ${existingTrack.id})) with data: `, data)
                await projectTracks.update(existingTrack.id, { data: {...existingTrack.data, ...data} });
            } else {
                const newTrack = projectTracks.create({
                    name: track,
                    project_id: projectId,
                    data,
                    scroll: 0 // TODO remove
                })
                await projectTracks.save(newTrack);
            }
        }
        
        const wrappedOnForReloadDisconnect = (parent) => {
            return (...args) => {
                const id = parent.on(...args)
                this.onReloadMods.push(() => {
                    parent.off(id)
                })
            }
        }

        const makeEmitterEvents = (mapOfKeysAndEmitters: {[key: string]: any}) => {
            let handlers = {}
            for (const key in mapOfKeysAndEmitters) {
                const emitter = mapOfKeysAndEmitters[key]
                handlers[key] = {
                    on: (cb: Function) => {
                        let id = emitter.listen(cb)
                        this.onReloadMods.push(() => {
                            handlers[key].off(id)
                        })
                        return id
                    },
                    off: (id) => {
                        // console.log('Removing listener id:' + id)
                        emitter.stopListening(id)
                    }
                }            
            }
            return {
                on: (eventName: string, cb: Function) => {
                    const wrappedCb = (...args) => {
                        try {
                            this.logForMod(mod.id, `Event ${colors.yellow(eventName)} received`)
                            cb(...args)
                        } catch (e) {
                            this.logForMod(mod.id, colors.red(e))
                        }
                    }
                    return handlers[eventName].on(wrappedCb)
                },
                off: (eventName: string, id: number) => {
                    handlers[eventName].off(id)
                }
            }
        }

        const KeyboardEvent = {
            noModifiers() {
                return !(this.Meta || this.Control || this.Alt || this.Shift)
            }
        }

        const MouseEvent = {
            intersectsPluginWindows() {
                return intersectsPluginWindows(this)
            }
        }

        const addNotAlreadyIn = (obj, parent) => {
            for (const key in parent) {
                if (!(key in obj)) {
                    obj[key] = parent[key]
                }
            }
            return obj
        }
        const thisApiId = nextId++
        const api = {
            id: thisApiId,
            log: (...args) => {
                this.logForMod(mod.id, ...args)
            },
            error: (...args) => {
                logWithTime(`${colors.red(mod.id)}:`, ...args)
                this.logForMod(mod.id, ...args)
            },
            Keyboard: {
                ...Keyboard,
                on: (eventName: string, cb: Function) => {
                    const wrappedCb = (event, ...rest) => {
                        this.logForModWebOnly(mod.id, `${eventName}`)
                        Object.setPrototypeOf(event, KeyboardEvent)
                        cb(event, ...rest)
                    }
                    wrappedOnForReloadDisconnect(Keyboard)(eventName, wrappedCb)
                },
                type: (str, opts?) => {
                    String(str).split('').forEach(char => {
                        Keyboard.keyPress(char === ' ' ? 'Space' : char, opts)
                    })
                }
            },
            whenActiveListener: whenActiveListener,
            Mouse: {
                ...Mouse,
                on: (eventName: string, cb: Function) => {
                    const wrappedCb = async (event, ...rest) => {
                        this.eventLogger({msg: eventName, modId: mod.id})
                        Object.setPrototypeOf(event, MouseEvent)

                        try {
                            // Add Bitwig coordinates
                            const bwPos = await this.shortcutsService.screenToBw({x: event.x, y: event.y})
                            event.bitwigX = bwPos.x
                            event.bitwigY = bwPos.y
                        } catch (e) {
                            // Bitwig may not be open
                            this.log(colors.red(e))
                        }

                        cb(event, ...rest)
                    }
                    if (eventName === 'click') {
                        let downEvent, downTime
                        api.Mouse.on('mousedown', (event) => {
                            downTime = new Date()
                            downEvent = JSON.stringify(event)
                        })
                        api.Mouse.on('mouseup', (event, ...rest) => {
                            if (JSON.stringify(event) === downEvent && downTime && new Date().getTime() - downTime.getTime() < 250) {
                                wrappedCb(event, ...rest)
                            }
                        })
                    } else if (eventName === 'doubleClick') {
                        let lastClickTime = new Date(0)
                        api.Mouse.on('click', (event, ...rest) => {
                            if (new Date().getTime() - lastClickTime.getTime() < 250) {
                                wrappedCb(event, ...rest)
                                lastClickTime = new Date(0)
                            } else {
                                lastClickTime = new Date()
                            }
                        })
                    } else {
                        wrappedOnForReloadDisconnect(Keyboard)(eventName, wrappedCb)
                    }
                },
                click: (...args) => {
                    const button = args[0]
                    if (typeof button !== 'number') {
                        return Mouse.click(0, ...args)
                    } else {
                        return Mouse.click(...args)
                    }
                },
                lockX: Keyboard.lockX,
                lockY: Keyboard.lockY,
                returnAfter: returnMouseAfter  ,
                avoidingPluginWindows: async (point, cb) => {
                    if (!intersectsPluginWindows(point)) {
                        return Promise.resolve(cb())
                    }
                    const pluginPositions = Bitwig.getPluginWindowsPosition()
                    const displayDimensions = MainWindow.getMainScreen()
                    let tempPositions = {}
                    for (const key in pluginPositions) {
                        tempPositions[key] = {
                            ...pluginPositions[key],
                            x: displayDimensions.w - 1,
                            y: displayDimensions.h - 1,
                        }
                    }
                    Bitwig.setPluginWindowsPosition(tempPositions)
                    return new Promise<void>(res => {
                        setTimeout(async () => {
                            const result = cb()
                            if (result && result.then) {
                                await result
                            }
                            Bitwig.setPluginWindowsPosition(pluginPositions)
                            res()
                        }, 100)
                    })
                }          
            },
            UI: addNotAlreadyIn({
                MainWindow: UIMainWindow
            }, UI),
            Bitwig: addNotAlreadyIn({
                closeFloatingWindows: Bitwig.closeFloatingWindows,
                get isAccessibilityOpen() {
                    return Bitwig.isAccessibilityOpen()
                },
                get isPluginWindowActive() {
                    return Bitwig.isPluginWindowActive()
                },
                get tracks() {
                    return that.tracks
                },
                get isBrowserOpen() {
                    return that.browserIsOpen
                },
                isActiveApplication(...args) {
                    return Bitwig.isActiveApplication(...args)
                },
                MainWindow,
                get currentTrack() {
                    return that.currTrack
                },
                get currentDevice() {
                    return that.currDevice
                },
                get cueMarkers() {
                    return that.cueMarkers
                },
                get currentProject() {
                    return that.simplifiedProjectName
                },
                sendPacket: packet => {
                    return sendPacketToBitwig(packet)
                },
                sendPacketPromise: packet => {
                    return sendPacketToBitwigPromise(packet)
                },
                runAction: action => {
                    let actions = action
                    if (!Array.isArray(actions)) {
                        actions = [action]
                    }
                    return sendPacketToBitwigPromise({type: 'action', data: actions.map(normalizeBitwigAction)})
                },
                showMessage: showMessage,
                intersectsPluginWindows: event => {
                    return intersectsPluginWindows({
                        ...event,
                        ...(this.shortcutsService.bwToScreen(event))
                    })
                },
                scaleXY: (args) => this.shortcutsService.scaleXY(args),
                unScaleXY: (args) => this.shortcutsService.unScaleXY(args),
                bwToScreen: (args) => this.shortcutsService.bwToScreen(args),
                screenToBw: (args) => this.shortcutsService.screenToBw(args),
                click: (button, positionAndStuff, ...rest) => {
                    return api.Mouse.click(button, this.shortcutsService.bwToScreen(positionAndStuff), ...rest)
                },
                doubleClick: (button, positionAndStuff, ...rest) => {
                    return api.Mouse.doubleClick(button, this.shortcutsService.bwToScreen(positionAndStuff), ...rest)
                },
                setMousePosition: (x, y, ...rest) => {
                    const screen = this.shortcutsService.bwToScreen({ x , y })
                    return api.Mouse.setPosition(screen.x, screen.y, ...rest)
                },
                getMousePosition: () => {
                    const pos = api.Mouse.getPosition()
                    return this.shortcutsService.screenToBw(pos)
                },
                ...makeEmitterEvents({
                    selectedTrackChanged: this.events.selectedTrackChanged,
                    browserOpen: this.events.browserOpen,
                    projectChanged: this.events.projectChanged,
                    activeEngineProjectChanged: this.events.activeEngineProjectChanged
                })
            }, Bitwig),
            MainDisplay: {
                getDimensions() {
                    return MainWindow.getMainScreen()
                }
            },
            Db: {
                getTrackData: async (name, options: {modId?: string} = {}) => {
                    if (!this.simplifiedProjectName) {
                        this.logForMod(mod.id, colors.yellow('Tried to get track data but no project loaded'))
                        return null
                    }
                    return (await loadDataForTrack(name, this.simplifiedProjectName))[options?.modId ?? mod.id] || {}
                },
                setCurrentProjectData: async (data) => {
                    if (!this.simplifiedProjectName) {
                        this.logForMod(mod.id, colors.yellow('Tried to set project data but no project loaded'))
                        return null
                    }
                    const projectName = this.simplifiedProjectName
                    const projectId = await getProjectIdForName(projectName, true)
                    const project = await projects.findOne(projectId)
                    this.logForMod(mod.id, `Setting project data: `, data)
                    await projects.update(projectId, {
                        data: {
                            ...project.data,
                            [mod.id]: data
                        }
                    })
                },
                getCurrentProjectData: async () => {
                    if (!this.simplifiedProjectName) {
                        this.logForMod(mod.id, colors.yellow('Tried to get project data but no project loaded'))
                        return null
                    }
                    const project = this.simplifiedProjectName
                    const existingProject = await projects.findOne({ where: { name: project } })
                    return existingProject?.data[mod.id] ?? {}
                },
                setTrackData: (name, data) => {
                    if (!this.simplifiedProjectName) {
                        this.logForMod(mod.id, colors.yellow('Tried to set track data but no project loaded'))
                        return null
                    }
                    return createOrUpdateTrack(name, this.simplifiedProjectName, {[mod.id]: data})
                },
                setExistingTracksData: async (data, exclude: string[] = []) => {
                    if (!this.simplifiedProjectName) {
                        this.logForMod(mod.id, colors.yellow('Tried to set track data but no project loaded'))
                        return null
                    }
                    const project = this.simplifiedProjectName
                    const existingProject = await projects.findOne({ where: { name: project } })
                    if (!existingProject) {
                        return
                    }
          
                    const tracksInProject = await projectTracks.find({ where: { project_id: existingProject.id } })
                    for (const track of tracksInProject) {
                        if (exclude.indexOf(track.name) === -1) {
                            await api.Db.setTrackData(track.name, data)
                        }
                    }
                },
                getCurrentTrackData: () => {
                    return api.Db.getTrackData(api.Bitwig.currentTrack)
                },
                setCurrentTrackData: (data) => {
                    return api.Db.setTrackData(api.Bitwig.currentTrack, data)
                },
            },
            Mod: {
                _openFloatingWindow: openFloatingWindow,
                setEnteringValue: val => {
                    this.shortcutsService.enteringValue = val
                },
                runAction: (actionId, ...args) => {
                    return this.shortcutsService.runAction(actionId, ...args)
                },
                runActions: (...actionIds: string[]) => {
                    for (const action of actionIds) {
                        api.Mod.runAction(action)
                    }
                },
                registerAction: (action) => {
                    action.category = action.category || mod.category
                    this.shortcutsService.registerAction({
                        ...action, 
                        mod: mod.id,
                        action: async (...args) => {
                            try {
                                await (async () => action.action(...args))()
                            } catch (e) {
                                this.logForMod(mod.id, colors.red(e))
                            }
                        }
                    }, modsLoading)
                },
                _registerShortcut: (keys: string[], runner: Function) => {
                    this.shortcutsService.registerAction({
                        id: mod.id + '/' + keys.join('+'),
                        mod: mod.id,
                        defaultSetting: {
                            keys
                        },
                        isTemp: true,
                        action: async (...args) => {
                            try {
                                await (async () => runner(...args))()
                            } catch (e) {
                                this.logForMod(mod.id, colors.red(e))
                            }
                        }
                    }, modsLoading)
                },
                registerShortcutMap: (shortcutMap) => {
                    for (const keys in shortcutMap) {
                        api.Mod._registerShortcut(keys.split(' '), shortcutMap[keys])
                    }
                },
                setInterval: (fn, ms) => {
                    const id = setInterval(fn, ms)
                    this.log('Added interval id: ' + id)
                    this.onReloadMods.push(() => {
                        clearInterval(id)
                        this.log('Clearing interval id: ' + id)
                    })
                    return id
                },
                get isActive() {
                    return thisApiId in that.activeModApiIds
                },
                onExit: (cb) => {
                    this.onReloadMods.push(cb)
                },
                getClipboard() {
                    return clipboard.readText()
                },
                interceptPacket: (type: string, ...rest) => {
                    const remove = interceptPacket(type, ...rest)
                    this.onReloadMods.push(remove)
                },
                ...makeEmitterEvents({
                    actionTriggered: this.shortcutsService.events.actionTriggered   
                })
            },
            wait: ms => new Promise(res => {
                setTimeout(res, ms)
            }),
            debounce,
            showNotification: (notif) => this.showNotification(notif)
        }
        const wrapFunctionsWithTryCatch = (value, key?: string) => {
            if (typeof value === 'object') {
                for (const k in value) {
                    const desc = Object.getOwnPropertyDescriptor(value, k);
                    if ((!desc || !desc.get) && typeof value[k] === 'function') {
                        value[k] = wrapFunctionsWithTryCatch(value[k], k);
                    }
                    else if ((!desc || !desc.get) && typeof value[k] === 'object') {
                        value[k] = wrapFunctionsWithTryCatch(value[k], k);
                    }
                }
            } else if (typeof value === 'function') {
                return (...args) => {
                    try {
                        const called = value.name || key || 'Unknown function'
                        if (value !== api.log) {
                            this.logForModWebOnly(mod.id, `Called ${called}`)
                        }
                        return value(...args)
                    } catch (e) {
                        console.error(colors.red(`${mod.id} threw an error while calling "${colors.yellow(value.name)}":`))
                        console.error(colors.red(`arguments were: `), ...args)
                        console.error(e)
                        console.error(e.stack)
                        throw e
                    }
                }
            }
            return value
        }
        return {
            ...wrapFunctionsWithTryCatch(api),
            _,
        }
    }
    async getModsWithInfo({category, inMenu} = {} as any) : Promise<(ModInfo & {key: string, value: any})[]> {
        const db = await getDb()
        const settings = db.getRepository(Setting) 
        const where = {type: 'mod'} as any
        if (category) {
            where.category = category
        }
        const results = await settings.find({where})
        const byKey = {}
        for (const r of results) {
            byKey[r.key] = r
        }
        return Object.keys(this.latestModsMap).map(settingKey => {
            const res = byKey[settingKey] ? this.settingsService.postload(byKey[settingKey]) : {
                value: { 
                    enabled: false,
                    keys: []
                }
            }
            const modInfo = this.latestModsMap[settingKey]
            return {
                ...res,
                ...modInfo
            }
        }).filter((mod) => {
            return inMenu ? mod.value.showInMenu : true
        }) as any
    }

    showNotification(notification) {
        openCanvasWindow(`/canvas`, {
            data: {
                notifications: [
                    {
                        id: nextId++,
                        timeout: 3000,
                        date: new Date().getTime(),
                        ...notification,
                    }   
                ]
            },
            width: 2560,
            height: 1440
        })
    }

    async activate() {
        interceptPacket('message', undefined, async ({ data: { msg } }) => {
            showMessage(msg)
        })
        interceptPacket('project', undefined, async ({ data: { name: projectName, hasActiveEngine, selectedTrack } }) => {
            const projectChanged = this.currProject !== projectName
            if (projectChanged) {
                this.currProject = projectName
                this.events.projectChanged.emit(projectName)
                if (hasActiveEngine) {
                    this.activeEngineProject = projectName
                    this.events.activeEngineProjectChanged.emit(projectName)
                }
            }
            if (selectedTrack && this.currTrack !== selectedTrack.name) {
                const prev = this.currTrack
                this.currTrack = selectedTrack.name
                this.events.selectedTrackChanged.emit(this.currTrack, prev)
            }
        })
        interceptPacket('tracks', undefined, async ({ data: tracks }) => {
            this.tracks = tracks
        })
        interceptPacket('device', undefined, async ({ data: device }) => {
            this.currDevice = device
        })
        interceptPacket('cue-markers', undefined, async ({ data: cueMarkers }) => {
            this.cueMarkers = cueMarkers
        })
        interceptPacket('browser/state', undefined, ({ data }) => {
            this.log('received browser state packet: ' + data.isOpen)
            const previous = this.browserIsOpen
            this.browserIsOpen = data.isOpen
            updateCanvas({
                browserIsOpen: data.isOpen
            })
            this.events.browserOpen.emit(data, previous)
        })

        // API endpoint to set the current log for specific websocket
        interceptPacket('api/mods/log', ({ data: modId }, websocket) => {
            websocket.activeModLogKey = modId
        })
        interceptPacket('bitwig/log', undefined, (packet) => {
            logWithTime(colors.yellow(`Bitwig: ` + packet.data.msg))
            if (packet.data.modId) {
                this.logForMod(packet.data.modId, packet.data.msg)
            }
        })

        addAPIMethod('api/mods', async () => {
            const mods = await this.getModsWithInfo() as any
            const db = await getDb()
            const settings = db.getRepository(Setting) 
            for (const mod of mods) {
                const settingsForMod = await settings.find({where: {
                    mod: mod.id
                }})
                mod.actions = settingsForMod.map(setting => {
                    const action = this.shortcutsService.actions[setting.key]
                    return {
                        ...this.settingsService.postload(setting),
                        ...action,
                        notFound: !action
                    }
                })
            }
            return mods
        })

        const refreshFolderWatcher = async () => {
            this.log('Refreshing folder watcher')
            if (this.folderWatcher) {
                this.folderWatcher.close()
                this.folderWatcher = null
            }
            const folderPaths = await this.getModsFolderPaths()
            this.log('Watching ' + folderPaths)
            this.folderWatcher = chokidar.watch(folderPaths, {
                ignoreInitial : true
            }).on('all', (event, path) => {
                this.log(event, path)
                this.refreshMods(path.indexOf('bitwig.js') === -1)
            });
            if (process.env.NODE_ENV === 'dev' && !this.controllerScriptFolderWatcher) {
                const mainScript = getResourcePath('/controller-script/bes.control.js')
                this.log('Watching ' + mainScript)
                this.controllerScriptFolderWatcher = chokidar.watch([mainScript], {
                    ignoreInitial : true
                }).on('all', (event, path) => {
                    this.log(event, path)
                    this.refreshMods()
                });
            }
        }
        this.settingsService.events.settingUpdated.listen(data => {
            const key = data.key!
            if (key === 'userLibraryPath') {
                refreshFolderWatcher()
            } else if (key.indexOf('mod') === 0) {
                const modData = this.latestModsMap[key]
                const value = JSON.parse(data.value)
                // console.log(modData)
                if (!modData.noReload) {
                    showMessage(`Settings changed, restarting Modwig...`)
                    this.refreshMods()
                } else {
                    this.log('Mod marked as `noReload`, not reloading')
                    const data = {
                        [modData.id!]: value.enabled
                    }
                    showMessage(`${modData.name}: ${value.enabled ? 'Enabled' : 'Disabled'}`)
                    sendPacketToBitwig({type: 'settings/update', data })

                    // FIXME shortcuts service deregisters on settingUpdated event, so re-register all in a setTimeout
                    setTimeout(async () => {
                        const mods = await this.getModsWithInfo()
                        for (const mod of mods) {
                            this.registerEnableDisableShortcut(mod)
                        }
                    }, 100)
                }               
            }
        })

        this.refreshMods()
        refreshFolderWatcher()

        Keyboard.on('mouseup', event => {
            // FIXME for scaling
            if (Bitwig.isActiveApplication() && event.y > 1000 && event.Meta && !event.Shift && !event.Alt && !event.Control && !intersectsPluginWindows(event) && !this.browserIsOpen) {
                // Assume they are clicking to enter a value by keyboard
                this.shortcutsService.setEnteringValue(true)
            }
        })

        this.shortcutsService.events.enteringValue.listen(enteringValue => {
            updateCanvas({
                enteringValue
            })
        })

        
        this.shortcutsService.events.actionTriggered.listen(((action, context) => {
            this.showNotification({
                type: 'actionTriggered',
                data: {
                    title: action.title || action.id,
                    ...context
                }
            })
        }) as any)

        // Could do with moving the following handlers into a separate "UIService"
        this.settingsService.onSettingValueChange('uiScale', val => {
            UI.updateUILayout({scale: parseInt(val, 10) / 100})
        })

        interceptPacket('ui', undefined, (packet) => {
            this.log('Updating UI from packet: ', packet)
            UI.updateUILayout(packet.data)
        })
    }

    async registerEnableDisableShortcut(mod: ModInfo) {
        // Re-register shortcuts for disabling/enabling mods
        const enabledValue = await this.settingsService.getSettingValue(mod.settingsKey)
        if (enabledValue && enabledValue.keys.length > 0) {
            this.shortcutsService.registerShortcut(enabledValue, async () => {
                const currentVal = (await this.settingsService.getSettingValue(mod.settingsKey))
                await this.settingsService.setSettingValue(mod.settingsKey, {
                    ...currentVal,
                    enabled: !currentVal.enabled
                })
            })
        }
    }

    async getModsFolderPaths() : Promise<string[]> {
        const userLibPath = await this.settingsService.userLibraryPath()
        const exists = typeof userLibPath === 'string' && await fileExists(userLibPath)
        if (exists) {
            await createDirIfNotExist(path.join(userLibPath!, 'Modwig'))
            await createDirIfNotExist(path.join(userLibPath!, 'Modwig', 'Mods'))
        }
        return [
            getResourcePath('/default-mods'),
            ...(exists ? [path.join((await this.settingsService.modwigLibraryLocation())!, 'Mods')] : [])
        ]
    }

    async copyControllerScript() {
        const userLibPath = await this.settingsService.userLibraryPath()
        try {
            await fs.access(userLibPath!)
        } catch (e) {
            return this.log("Not copying controller script until user library path set")
        }
        
        try {
            const controllerSrcFolder = getResourcePath('/controller-script')
            const controllerDestFolder = path.join(userLibPath!, 'Controller Scripts', 'Modwig')

            await createDirIfNotExist(controllerDestFolder)
            for (const file of await fs.readdir(controllerSrcFolder)) {
                const src = path.join(controllerSrcFolder, file)
                const dest = path.join(controllerDestFolder, file)
                if (!(await filesAreEqual(src, dest))){
                    await fs.copyFile(src, dest)
                }
            }
        } catch (e) {
            console.error(e)   
        }
    }

    async gatherModsFromPaths(paths: string[], {type}: {type: 'bitwig' | 'local'}) {
        let modsById = {}
        // Load mods from all folders, with latter folders having higher precedence (overwriting by id)
        for (const modsFolder of paths) {
            const files = await fs.readdir(modsFolder)
            for (const filePath of files) {
                const actualType = filePath.indexOf('bitwig.js') >= 0 ? 'bitwig' : 'local'
                // console.log(filePath, actualType)
                if (actualType !== type) {
                    continue;
                }
                try { 
                    const contents = await fs.readFile(path.join(modsFolder, filePath), 'utf8')
                    const checkForTag = (tag) => {
                        const result = new RegExp(`@${tag} (.*)`).exec(contents)
                        return result ? result[1] : undefined
                    }
                    const id = checkForTag('id')
                    const name = checkForTag('name') ?? 'No name set'
                    const description = checkForTag('description') || ''
                    const category = checkForTag('category') ?? 'global'
                    const version = checkForTag('version') ?? '0.0.1'
                    const noReload = contents.indexOf('@noReload') >= 0
                    const settingsKey = `mod/${id}`
                    const p = path.join(modsFolder, filePath)
                    const isDefault = p.indexOf(getResourcePath('/default-mods')) >= 0
                    const actualId = id === undefined ? ('temp' + nextId++) : id

                    modsById[actualId] = {
                        id: actualId,
                        name,
                        settingsKey,
                        description,
                        category,
                        version,
                        contents,
                        noReload,
                        path: p,
                        isDefault,
                        valid: id !== undefined
                    }
                } catch (e) {
                    this.log(colors.red(`Error with ${filePath}`, e))
                }
            }
        }
        return modsById
    }

    async initModAndStoreInMap(mod) {
        if (mod.valid) {
            // Don't add settings for invalid (not loaded properly mods)
            await this.settingsService.insertSettingIfNotExist({
                key: mod.settingsKey,
                value: {
                    enabled: false,
                    keys: []
                },
                type: 'mod',
                category: mod.category
            })
        }

        this.registerEnableDisableShortcut(mod)
        this.latestModsMap[mod.settingsKey] = mod
    }

    async isModEnabled(mod) {
        return (await this.settingsService.getSetting(mod.settingsKey))?.value.enabled ?? false;
    }

    async refreshLocalMods() {
        const modsFolders = await this.getModsFolderPaths()
        this.activeModApiIds = {}
        modsLoading = true

        try {
            const modsById = await this.gatherModsFromPaths(modsFolders, { type: 'local'})

            // await ;(async () => {
                for (const modId in modsById) {
                    const mod = modsById[modId]
                    this.initModAndStoreInMap(mod)
                    const isEnabled = await this.isModEnabled(mod)
                    if (isEnabled) {
                        const api = await this.makeApi(mod)
                        // Populate function scope with api objects
                        try { 
                            this.log('Enabling local mod: ' + modId)
                            let setVars = ''
                            for (const key in api) {
                                setVars += `const ${key} = api["${key}"]\n`
                            }
                            eval(setVars + mod.contents)
                            this.log('Enabled local mod: ' + colors.green(modId))
                        } catch (e) {
                            mod.error = e
                            this.log(colors.red(e))   
                            showMessage(`There was an error loading mod ${modId}: ${e}`)
                        }
                        this.activeModApiIds[api.id] = true
                    }
                }
            // })()
        } catch (e) {
            console.error(e)
        }

        modsLoading = false
        this.shortcutsService.updateShortcutCache()
    }

    async refreshBitwigMods(noWriteFile: boolean) {
        const modsFolders = await this.getModsFolderPaths()
        let controllerScript = `
// AUTO GENERATED BY MODWIG
function loadMods(api) {


function modsImpl(api) {
    for (var key in api) {
        var toRun = key + ' = api["' + key + '"]'
        println(toRun)
        eval(toRun)
    }
        `
        const modsById = await this.gatherModsFromPaths(modsFolders, { type: 'bitwig'})
        const defaultControllerScriptSettings = {}

        for (const modId in modsById) {
            const mod = modsById[modId]
            this.initModAndStoreInMap(mod)
            const isEnabled = await this.isModEnabled(mod)
            if (isEnabled || mod.noReload) {
                this.log('Enabled Bitwig Mod: ' + colors.green(modId))
                defaultControllerScriptSettings[modId] = isEnabled
                controllerScript += `
// ${mod.path}
// 
// 
// 
//
;(() => { 
${mod.contents.replace(/Mod\.enabled/g, `settings['${modId}']`)} 
})()
`
            }
        }
        controllerScript += `}
${Object.keys(defaultControllerScriptSettings).map(key => {
return `settings['${key}'] = ${defaultControllerScriptSettings[key]}`
}).join('\n')}            
modsImpl(api)            
\n}`
        const controllerScriptMods = getResourcePath('/controller-script/mods.js')
        if (!noWriteFile) {
            await fs.writeFile(controllerScriptMods, controllerScript)
            await this.copyControllerScript()
        }
    }

    async refreshMods(localOnly = false) {
        this.log('Refreshing mods')
        
        // Handlers to disconnect any dangling callbacks etc
        for (const func of this.onReloadMods) {
            try {
                func()
            } catch (e) {
                console.error('Error when running onReloadMod', e)
            }
        }

        this.shortcutsService.tempActions = {}
        this.onReloadMods = []
        this.latestModsMap = {}
        
        await this.refreshLocalMods()
        await this.refreshBitwigMods(localOnly)
        if (this.refreshCount === 0) {
            showMessage(`${Object.keys(this.latestModsMap).length} Mods loaded`)
        } else {
            showMessage(`Reloaded ${localOnly ? 'local' : 'all'} mods (${Object.keys(this.latestModsMap).length} loaded)`)
        }
        this.refreshCount++

        sendPacketToBrowser({
            type: 'event/mods-reloaded'
        })
        this.events.modsReloaded.emit()
    }
}
