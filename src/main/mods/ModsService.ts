import { sendPacketToBitwig, interceptPacket, sendPacketToBrowser, addAPIMethod, sendPacketToBitwigPromise, SocketMiddlemanService } from "../core/WebsocketToSocket"
import { BESService, getService, makeEvent } from "../core/Service"
import { returnMouseAfter, whenActiveListener } from "../../connector/shared/EventUtils"
import { getDb } from "../db"
import { ProjectTrack } from "../db/entities/ProjectTrack"
import { clamp } from "../../connector/shared/Math"
import { Project } from "../db/entities/Project"
import { getResourcePath } from '../../connector/shared/ResourcePath'
import { SettingsService } from "../core/SettingsService"
import { promises as fs } from 'fs'
import * as path from 'path'
import { Setting } from "../db/entities/Setting"
import { createDirIfNotExist, exists as fileExists, filesAreEqual, getTempDirectory, writeStrFile } from "../core/Files"
import { logWithTime } from "../core/Log"
import { ShortcutsService } from "../shortcuts/Shortcuts"
import { debounce, wait } from '../../connector/shared/engine/Debounce'
import _ from 'underscore'
import { BrowserWindow, clipboard } from "electron"
import { url } from "../core/Url"
import { normalizeBitwigAction } from "./actionMap"
import { UIService } from "../ui/UIService"
import { BitwigService } from "../bitwig/BitwigService"
const chokidar = require('chokidar')
const colors = require('colors');

const KeyboardEvent = {
    noModifiers() {
        return !(this.Meta || this.Control || this.Alt || this.Shift)
    }
}

let nextId = 0
let modsLoading = false

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
        path: string,
        lastOptions: string
    } | undefined
    let fadeOutTimeout: any
    return function openFloatingWindow(path, options: {x?: number, y?: number, data?: any, timeout?: number, width: number, height: number}) {
       if (fadeOutTimeout) {
           clearTimeout(fadeOutTimeout)
       }
   
       const debug = false
    //    logWithTime(`Opening floating window with path: ${path} and options: `, options)
    //    logWithTime(`Floating window info: `, floatingWindowInfo)

       const optsStr = (_ as any).omit(options, 'data')
    //    logWithTime(optsStr)
       if (!floatingWindowInfo || path !== floatingWindowInfo.path) {
           logWithTime('Opening new window')
           floatingWindowInfo?.window.close()
           floatingWindowInfo = {
               path,
               lastOptions: optsStr,
               window: new BrowserWindow({ 
                   width: options.width, 
                   height: options.height, 
                   opacity: 1,
                   frame: false,
                   hasShadow: false,
                   show: false,
                   alwaysOnTop: true,
                   focusable: debug,
                   closable: debug,
                   x: options.x ?? MainWindow.getMainScreen().w / 2 - options.width / 2,
                   y: options.y ?? MainWindow.getMainScreen().h / 2 - options.height / 2,
                   transparent: true,
                   fullscreenable: false,
                   webPreferences: {
                       enableRemoteModule: true,
                       webSecurity: false,
                       nodeIntegration: true
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
                   const path = \`${path}\`
                   window.data = ${JSON.stringify(options.data)}
                   if (window.didUpdateState && window.didUpdateState(path)) {
                       return 'updatedState'
                   } else if (window.loadURL) {
                       window.loadURL(path)
                       return 'loadedUrl'
                   } else if (tries < 10) {
                       setTimeout(() => tryLoadURL(tries + 1), 100)
                       return 'trying again'
                   } else {
                       console.error(\`Couldn't find loadURL on window, something went wrong\`)
                       return 'no loadURL'
                   }
               }
               tryLoadURL()
           `).then((result) => {
            //    logWithTime(result)
            //    logWithTime('Showing window')
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

interface SettingInfo {
    name: string
    description?: string
}

export class ModsService extends BESService {

    // Services
    settingsService = getService<SettingsService>('SettingsService')
    shortcutsService = getService<ShortcutsService>("ShortcutsService")
    suckitService = getService<SocketMiddlemanService>("SocketMiddlemanService")
    uiService = getService<UIService>("UIService")
    bitwigService = getService<BitwigService>("BitwigService")

    // Internal state
    currProject: string | null = null
    currTrack: any | null = null
    cueMarkers: CueMarker[] = []
    currDevice: Device | null = null
    folderWatcher?: any
    controllerScriptFolderWatcher?: any
    latestModsMap: { [name: string]: Partial<ModInfo> } = {}
    onReloadMods: Function[] = []
    refreshCount = 0
    activeEngineProject: string | null = null
    tracks: any[] = []
    activeModApiIds: {[key: string]: boolean} = {}
    settingKeyInfo: {[key: string]: SettingInfo} = {}

    // Events
    events = {
        selectedTrackChanged: makeEvent<any>(),
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
        if (process.env.DEBUG !== 'true') {
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
        if (process.env.DEBUG === 'true') {
            this.logForModWebOnly(modId, ...args)
            logWithTime(colors.green(modId), ...args)
        }
    }

    logForModWebOnly(modId: string, ...args: any[]) {
        // const socketsForWithModId = this.suckitService.getActiveWebsockets().filter(({id, ws, activeModLogKey}) => activeModLogKey === modId)
        // for (const socc of socketsForWithModId) {
        //     socc.send({
        //         type: 'log',
        //         data: args
        //     })
        // }
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
            const out = {
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
                once: (eventName: string, cb: Function) => {
                    const id = out.on(eventName, (...args) => {
                        out.off(eventName, id)
                        cb(...args)
                    })
                },
                off: (eventName: string, id: number) => {
                    handlers[eventName].off(id)
                }
            }
            return out
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
        const uiApi = this.uiService.getApi({ 
            makeEmitterEvents, 
            onReloadMods: cb => this.onReloadMods.push(cb) 
        })

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
                        const eventCopy = {...event}
                        this.logForModWebOnly(mod.id, `${eventName}`)
                        Object.setPrototypeOf(eventCopy, KeyboardEvent)
                        cb(eventCopy, ...rest)
                    }
                    wrappedOnForReloadDisconnect(Keyboard)(eventName, wrappedCb)
                },
                type: (str, opts?) => {
                    String(str).split('').forEach(char => {
                        Keyboard.keyPress(char === ' ' ? 'Space' : char, opts)
                    })
                }
            },
            Shortcuts: this.shortcutsService.getApi(),
            whenActiveListener: whenActiveListener,
            Rect: {
                containsPoint(rect, point) {
                    return point.x >= rect.x 
                        && point.x < rect.x + rect.w 
                        && point.y >= rect.y
                        && point.y < rect.y + rect.h
                },
                containsX(rect, x) {
                    return x >= rect.x 
                        && x < rect.x + rect.w
                },
                containsY(rect, y) {
                    return y >= rect.y
                        && y < rect.y + rect.h
                }
            },
            Mouse: uiApi.Mouse,
            UI: uiApi.UI,
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
                    return that.bitwigService.browserIsOpen
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
                getFocusedPluginWindow: () => {
                    const pluginWindows = Bitwig.getPluginWindowsPosition()
                    return Object.values(pluginWindows).find((w: any) => w.focused)
                },
                showMessage: showMessage,
                intersectsPluginWindows: event => this.uiService.eventIntersectsPluginWindows(event),
                ...makeEmitterEvents({
                    selectedTrackChanged: this.events.selectedTrackChanged,
                    browserOpen: this.bitwigService.events.browserOpen,
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
                    return api.Db.getTrackData(api.Bitwig.currentTrack.name)
                },
                setCurrentTrackData: (data) => {
                    return api.Db.setTrackData(api.Bitwig.currentTrack.name, data)
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
                registerSetting: settingSpec => {
                    const defaultValue = JSON.stringify(settingSpec.value ?? {})
                    const actualKey = `mod/${mod.id}/${settingSpec.id}`
                    const type = settingSpec.type ?? 'boolean'

                    const setting = {
                        name: settingSpec.name,
                        type,
                        category: 'global',
                        value: defaultValue,
                        key: actualKey,
                        mod: mod.id
                    }
                    this.log(`Registering setting for ${mod.id}: `, setting.name)
                    this.settingsService.insertSettingIfNotExist(setting)
                    this.settingKeyInfo[actualKey] = {
                        name: settingSpec.name,
                        description: settingSpec.description
                    }

                    return {
                        getValue: async () => {
                            return (await that.settingsService.getSettingValue(actualKey)).enabled
                        }
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
            debounce,
            throttle: (_ as any).throttle,
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
                        timeout: notification.timeout ?? 3000,
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
        interceptPacket('notification', undefined, async ({ data: notif }) => {
            this.showNotification(notif)
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
            if (selectedTrack && (!this.currTrack || (this.currTrack.name !== selectedTrack.name))) {
                const prev = this.currTrack
                this.currTrack = selectedTrack
                this.events.selectedTrackChanged.emit(this.currTrack, prev)
            }
        })
        interceptPacket('tracks', undefined, async ({ data: tracks }) => {
            this.tracks = tracks
            // this.log(tracks)
        })
        interceptPacket('device', undefined, async ({ data: device }) => {
            this.currDevice = device
        })
        interceptPacket('cue-markers', undefined, async ({ data: cueMarkers }) => {
            this.cueMarkers = cueMarkers
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
                mod.actions = settingsForMod
                    .filter(setting => setting.type === 'mod' || setting.type === 'shortcut')
                    .map(setting => {
                        const action = this.shortcutsService.actions[setting.key]
                        return {
                            ...this.settingsService.postload(setting),
                            ...action,
                            notFound: !action
                        }
                    })
                mod.settings = settingsForMod
                    .filter(setting => setting.type !== 'mod' && setting.type !== 'shortcut')
                    .map(setting => {
                        const info = this.settingKeyInfo[setting.key]
                        return {
                            ...this.settingsService.postload(setting),
                            ...info,
                            notFound: !info
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
        this.settingsService.events.settingUpdated.listen(setting => {
            // this.log(setting)
            const key = setting.key!
            if (key === 'userLibraryPath') {
                refreshFolderWatcher()
            } else if (key.indexOf('mod') === 0) {
                if (setting.type === 'mod') {
                    const modData = this.latestModsMap[key]
                    const value = JSON.parse(setting.value)
                    const reload = !modData.noReload
                    showMessage(`${modData.name}: ${value.enabled ? 'Enabled' : 'Disabled'}`)

                    if (reload) {
                        this.refreshMods()
                    } else {
                        this.log('Mod marked as `noReload`, not reloading')
                        const data = {
                            [modData.id!]: value.enabled
                        }
                        sendPacketToBitwig({type: 'settings/update', data })
                    }         
                } else if (setting.type === 'boolean') {
                    const info = this.settingKeyInfo[key]
                    if (!info) {
                        return this.log(`Setting updated (${setting.key}) but no info found, mod no longer exists?`)
                    }
                    const value = JSON.parse(setting.value)
                    if (setting.type === 'boolean') {
                        showMessage(`${info.name}: ${value.enabled ? 'Enabled' : 'Disabled'}`)
                    }
                }      
            }
        })

        this.refreshMods()
        refreshFolderWatcher()

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

        this.bitwigService.events.browserOpen.listen(isOpen => {
            updateCanvas({
                browserIsOpen: isOpen
            })
        })
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
                const src = (await fs.readFile(path.join(controllerSrcFolder, file))).toString().replace(
                    /process\.env\.([a-zA-Z_-][a-zA-Z-_0-9]+)/g,
                    (match, name) => {
                        // this.log(match, name)
                        return JSON.stringify(process.env[name])
                    }
                )
                const dest = path.join(controllerDestFolder, file)
                if ((await fs.readFile(dest)).toString() !== src){
                    await fs.writeFile(dest, src)
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

        this.latestModsMap[mod.settingsKey] = mod
    }

    async isModEnabled(mod) {
        if (process.env.SAFE_MODE === 'true') {
            return false
        }
        return (await this.settingsService.getSetting(mod.settingsKey))?.value.enabled ?? false;
    }

    tempDir

    wrappedOnForReloadDisconnect = (parent) => {
        return (...args) => {
            const id = parent.on(...args)
            this.onReloadMods.push(() => {
                parent.off(id)
            })
        }
    }

    staticApi = {
        wait: wait,
        clamp: clamp,
        showMessage
    }

    async refreshLocalMods() {
        const modsFolders = await this.getModsFolderPaths()
        this.activeModApiIds = {}
        modsLoading = true

        if (!this.tempDir) {
            this.tempDir = await getTempDirectory()
        }

        try {
            const modsById = await this.gatherModsFromPaths(modsFolders, { type: 'local'})
            let fileOut = ''
            let enabledMods: any[] = []

            for (const modId in modsById) {
                const mod = modsById[modId]
                this.initModAndStoreInMap(mod)
                const isEnabled = await this.isModEnabled(mod)
                if (isEnabled) {
                    const api = await this.makeApi(mod)
                    this.activeModApiIds[api.id] = true
                    // Populate function scope with api objects
                    
                        let thisModI = enabledMods.length         
                        fileOut += `
function mod${thisModI}({ ${[...Object.keys(api), ...Object.keys(this.staticApi)].join(', ')} }) {
${mod.contents}
}
`
                    enabledMods.push({mod, api})
                }
            }

            if (enabledMods.length) {
                try {
                    fileOut += `
module.exports = {
    ${enabledMods.map((_, i) => `mod${i}`).join(',\n')}
}
`
                    const p = path.join(this.tempDir, `mods${nextId++}.js`)
                    await writeStrFile(fileOut, p)
                    this.log(`Mods written to ${p}`)

                    const modsOut = require(p)
                    for (let i = 0; i < enabledMods.length; i++) {
                        const {mod, api} = enabledMods[i]
                        try {
                            this.log('Enabling local mod: ' + mod.id)
                            const allApi = {...api, ...this.staticApi}
                            modsOut[`mod${i}`](allApi)
                        } catch (e) {
                            this.log(colors.red(`Error loading mod ${mod.id}: `), e)
                        }
                    }
                } catch (e) {
                    console.error(e)
                    this.log(colors.red(`Error loading mods`))
                }
            }
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
