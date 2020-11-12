import { sendPacketToBitwig, interceptPacket, sendPacketToBrowser, addAPIMethod, sendPacketToBitwigPromise } from "../core/WebsocketToSocket"
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
import { BrowserWindow } from "electron"
import { url } from "../core/Url"
const chokidar = require('chokidar')
const colors = require('colors');

let floatingWindowInfo: {
    window: BrowserWindow,
    path: string
} | undefined

let fadeOutTimeout: any
/**
 * Opens a floating window for a short amount of time, fading out afterwards. Meant for brief display of contextual information
 */
function openFloatingWindow(path, options: {data?: any, timeout: number, width: number, height: number}) {
    if (fadeOutTimeout) {
        clearTimeout(fadeOutTimeout)
    }

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
                // focusable: false,
                // closable: false,
                x: MainWindow.getMainScreen().w / 2 - options.width / 2,
                y: MainWindow.getMainScreen().h / 2 - options.height / 2,
                transparent: true,
                fullscreenable: false,
                webPreferences: {
                    webSecurity: false,
                    nodeIntegration: true,
                }
            })
        }
        // ;(floatingWindowInfo!.window as any).toggleDevTools()    
    }

    floatingWindowInfo.window.loadURL(url(`/#/loading`))
    if (options.data) {
        floatingWindowInfo!.window.webContents.executeJavaScript(`
            window.data = ${JSON.stringify(options.data)};
            window.loadURL(\`${path}\`)
        `).then(() => {
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
        
            fadeOutTimeout = setTimeout(() => {
                doFadeOut(1)
            }, options.timeout)
        })
    }
}

const { Keyboard, Mouse, MainWindow, Bitwig } = require('bindings')('bes')

interface ModInfo {
    name: string
    version: string
    description: string
    category: string
    id: string
    path: string
    noReload: boolean
}

export class ModsService extends BESService {
    currProject: string | null = null
    currTrack: string | null = null
    browserIsOpen = false
    settingsService = getService<SettingsService>('SettingsService')
    folderWatcher?: any
    controllerScriptFolderWatcher?: any
    latestModsMap: { [name: string]: Partial<ModInfo> } = {}
    onReloadMods: Function[] = []
    shortcutsService = getService<ShortcutsService>("ShortcutsService")
    activeEngineProject: string | null = null
    tracks: any[] = []
    events = {
        selectedTrackChanged: makeEvent<any>(),
        browserOpen: makeEvent<boolean>(),
        projectChanged: makeEvent<number>(),
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
    waitingMessages: {msg: string, count: number}[] = []

    logTimeout 
    eventLogger = (msg) => {
        if (this.waitingMessages[this.waitingMessages.length - 1]?.msg === msg ?? false) {
            this.waitingMessages[this.waitingMessages.length - 1].count++
        } else {
            this.waitingMessages.push({msg, count: 1})
        }
        clearTimeout(this.logTimeout)
        this.logTimeout = setTimeout(() => {
            for (const { msg, count } of this.waitingMessages) {
                logWithTime(msg + (count > 1 ? ` (${count})` : ''))
            }
            this.waitingMessages = []
        }, 250)
    }

    async makeApi(mod) {
        const db = await getDb()
        const projectTracks = db.getRepository(ProjectTrack)
        const projects = db.getRepository(Project)
        
        const defaultData = { }
        async function loadDataForTrack(name: string, project: string) {
            const existingProject = await projects.findOne({ where: { name: project } })
            if (!existingProject) return defaultData
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
                return (await projects.save(projects.create({ name: project }))).id
            } else {
                return existingProject?.id ?? null
            }
        }
        async function createOrUpdateTrack(track: string, project: string, data: any) {
            const projectId = await getProjectIdForName(project)
            const existingTrack = await projectTracks.findOne({ where: { name: track, project_id: projectId } })
            if (existingTrack) {
                logWithTime(`updating track (${existingTrack.name} (id: ${existingTrack.id})) with data: `, data)
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
                    return handlers[eventName].on(cb)
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
                const pluginLocations = Object.values(Bitwig.getPluginWindowsPosition())
                const event = this
                return pluginLocations.some(({x,y,w,h}) => {
                    return event.x >= x && event.x < x + w && event.y >= y && event.y < y + h
                })
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
        const that = this
        const api = {
            log: (...args) => logWithTime(`${colors.green(mod.id)}:`, ...args),
            Keyboard: {
                ...Keyboard,
                on: (eventName: string, cb: Function) => {
                    const wrappedCb = (event, ...rest) => {
                        this.eventLogger(`${colors.cyan(eventName)} -> ${colors.green(mod.id)}`)
                        Object.setPrototypeOf(event, KeyboardEvent)
                        cb(event, ...rest)
                    }
                    wrappedOnForReloadDisconnect(Keyboard)(eventName, wrappedCb)
                },
            },
            whenActiveListener: whenActiveListener,
            Mouse: {
                ...Mouse,
                on: (eventName: string, cb: Function) => {
                    const wrappedCb = (event, ...rest) => {
                        this.eventLogger(`${colors.cyan(eventName)} -> ${colors.green(mod.id)}`)
                        Object.setPrototypeOf(event, MouseEvent)
                        cb(event, ...rest)
                    }
                    wrappedOnForReloadDisconnect(Keyboard)(eventName, wrappedCb)
                },
                returnAfter: returnMouseAfter            
            },
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
                get isActiveApplication() {
                    return Bitwig.isActiveApplication()
                },
                MainWindow,
                get currentTrack() {
                    return that.currTrack
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
                    return sendPacketToBitwigPromise({type: 'action', data: action})
                },
                showMessage: message => {
                    sendPacketToBitwig({type: 'message', data: message})
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
                        console.warn('Tried to get track data but no project loaded')
                        return null
                    }
                    return (await loadDataForTrack(name, this.simplifiedProjectName))[options?.modId ?? mod.id] || {}
                },
                setCurrentProjectData: async (data) => {
                    if (!this.simplifiedProjectName) {
                        console.warn('Tried to set track data but no project loaded')
                        return null
                    }
                    const projectName = this.simplifiedProjectName
                    const projectId = await getProjectIdForName(projectName, true)
                    const project = await projects.findOne(projectId)
                    await projects.update(projectId, {
                        data: {
                            ...project.data,
                            [mod.id]: data
                        }
                    })
                },
                getCurrentProjectData: async () => {
                    if (!this.simplifiedProjectName) {
                        console.warn('Tried to set track data but no project loaded')
                        return null
                    }
                    const project = this.simplifiedProjectName
                    const existingProject = await projects.findOne({ where: { name: project } })
                    return existingProject?.data[mod.id] ?? {}
                },
                setTrackData: (name, data) => {
                    if (!this.simplifiedProjectName) {
                        console.warn('Tried to set track data but no project loaded')
                        return null
                    }
                    return createOrUpdateTrack(name, this.simplifiedProjectName, {[mod.id]: data})
                },
                setExistingTracksData: async (data, exclude: string[] = []) => {
                    if (!this.simplifiedProjectName) {
                        console.warn('Tried to set track data but no project loaded')
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
                runAction: (actionId, ...args) => {
                    return this.shortcutsService.runAction(actionId, ...args)
                },
                registerAction: (action) => {
                    action.category = action.category || mod.category
                    this.shortcutsService.registerAction({...action, mod: mod.id})
                },
                setInterval: (fn, ms) => {
                    const id = setInterval(fn, ms)
                    logWithTime('Added interval id: ' + id)
                    this.onReloadMods.push(() => {
                        clearInterval(id)
                        logWithTime('Clearing interval id: ' + id)
                    })
                }
            },
            wait: ms => new Promise(res => {
                setTimeout(res, ms)
            }),
            debounce
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
                        this.eventLogger(`${colors.blue(value.name || key || 'Unknown function')} <- ${colors.green(mod.id)}`)
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
    async getMods({category, inMenu} = {} as any) {
        const db = await getDb()
        const settings = db.getRepository(Setting) 
        const where = {type: 'mod'} as any
        if (category) {
            where.category = category
        }
        const results = await settings.find({where})
        return results.filter(mod => mod.key in this.latestModsMap).map(res => {
            res = this.settingsService.postload(res)
            const modInfo = this.latestModsMap[res.key]
            return {
                ...res,
                ...modInfo
            }
        }).filter((mod) => {
            return inMenu ? mod.value.showInMenu : true
        })
    }
    async activate() {
        // Listen out for the current track/project state from the controller script
        interceptPacket('trackselected', undefined, async ({ data: { name: newTrackName, selected, project } }) => {
            if (selected) {
                const prev = this.currTrack
                this.currProject = project.name
                this.currTrack = newTrackName
                this.events.selectedTrackChanged.emit(this.currTrack, prev)
            }
        })
        interceptPacket('project', undefined, async ({ data: { name: projectName, hasActiveEngine } }) => {
            const projectChanged = this.currProject !== projectName
            if (projectChanged) {
                this.currProject = projectName
                this.events.projectChanged.emit(projectName)
                if (hasActiveEngine) {
                    this.activeEngineProject = projectName
                    this.events.activeEngineProjectChanged.emit(projectName)
                }
            }
        })
        interceptPacket('tracks', undefined, async ({ data: tracks }) => {
            this.tracks = tracks
        })
        interceptPacket('browser/state', undefined, ({ data: {isOpen} }) => {
            const previous = this.browserIsOpen
            this.browserIsOpen = isOpen
            this.events.browserOpen.emit(isOpen, previous)
        })
        addAPIMethod('api/mods', async () => {
            const mods = await this.getMods()
            const db = await getDb()
            const settings = db.getRepository(Setting) 
            for (const mod of mods) {
                const settingsForMod = await settings.find({where: {
                    mod: mod.id
                }})
                mod.actions = settingsForMod.map(setting => {
                    return this.settingsService.postload(setting)
                })
            }
            return mods
        })

        const refreshFolderWatcher = async () => {
            logWithTime('Refreshing folder watcher')
            if (this.folderWatcher) {
                this.folderWatcher.close()
                this.folderWatcher = null
            }
            const folderPaths = await this.getModsFolderPaths()
            logWithTime('Watching ' + folderPaths)
            this.folderWatcher = chokidar.watch(folderPaths, {
                ignoreInitial : true
            }).on('all', (event, path) => {
                logWithTime(event, path)
                this.refreshMods(path.indexOf('bitwig.js') === -1)
            });
            if (process.env.NODE_ENV === 'dev' && !this.controllerScriptFolderWatcher) {
                const mainScript = getResourcePath('/controller-script/bes.control.js')
                logWithTime('Watching ' + mainScript)
                this.controllerScriptFolderWatcher = chokidar.watch([mainScript], {
                    ignoreInitial : true
                }).on('all', (event, path) => {
                    logWithTime(event, path)
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
                    sendPacketToBitwig({type: 'message', data: `Settings changed, restarting Modwig...`})
                    this.refreshMods()
                } else {
                    logWithTime('Mod marked as `noReload`, not reloading')
                    const data = {
                        [modData.id!]: value.enabled
                    }
                    sendPacketToBitwig({type: 'message', data: `${modData.name}: ${value.enabled ? 'Enabled' : 'Disabled'}`})
                    sendPacketToBitwig({type: 'settings/update', data })
                }
            }
        })

        this.refreshMods()
        refreshFolderWatcher()

        // Register shortcuts for disabling/enabling mods
        const modShortcuts = await this.getMods()
        for (const mod of modShortcuts) {
            if (mod.value.keys.length > 0) {
                this.shortcutsService.registerShortcut(mod.value, async () => {
                    const value = (await this.settingsService.getSettingValue(mod.key))
                    await this.settingsService.setSettingValue(mod.key, {
                        ...value,
                        enabled: !value.enabled
                    })
                })
            }
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
            return logWithTime("Not copying controller script until user library path set")
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
                    const checkForTag = (tag, required = true) => {
                        const result = new RegExp(`@${tag} (.*)`).exec(contents)
                        if (!result && required) {
                            throw new Error(`Missing @${tag} tag`)
                        }
                        return result ? result[1] : undefined
                    }
                    const id = checkForTag('id')!
                    const name = checkForTag('name')!
                    const description = checkForTag('description', false) || ''
                    const category = checkForTag('category', false) || 'global'
                    const version = checkForTag('version', false) || '0.0.1'
                    const noReload = contents.indexOf('@noReload') >= 0
                    const settingsKey = `mod/${id}`
                    modsById[id] = {
                        id,
                        name,
                        settingsKey,
                        description,
                        category,
                        version,
                        contents,
                        noReload,
                        path: path.join(modsFolder, filePath)
                    }
                } catch (e) {
                    console.error(`Error with ${filePath}`)
                    console.error(e)
                }
            }
        }
        return modsById
    }

    async initMod(mod) {
        await this.settingsService.insertSettingIfNotExist({
            key: mod.settingsKey,
            value: {
                enabled: false,
                keys: []
            },
            type: 'mod',
            category: mod.category
        })
        this.latestModsMap[mod.settingsKey] = mod
    }

    async isModEnabled(mod) {
        return (await this.settingsService.getSetting(mod.settingsKey)).value.enabled
    }

    async refreshLocalMods() {
        const modsFolders = await this.getModsFolderPaths()

        try {
            const modsById = await this.gatherModsFromPaths(modsFolders, { type: 'local'})
            
            ;(async () => {
                for (const modId in modsById) {
                    const mod = modsById[modId]
                    this.initMod(mod)
                    const isEnabled = await this.isModEnabled(mod)
                    if (isEnabled) {
                        const api = await this.makeApi(mod)
                        // Populate function scope with api objects
                        try { 
                            logWithTime('Enabling local mod: ' + modId)
                            let setVars = ''
                            for (const key in api) {
                                setVars += `const ${key} = api["${key}"]\n`
                            }
                            eval(setVars + mod.contents)
                            logWithTime('Enabled local mod: ' + colors.green(modId))
                        } catch (e) {
                            console.error(e)   
                        }
                    }
                }
            })()
        } catch (e) {
            console.error(e)
        }
    }

    async refreshBitwigMods() {
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
            this.initMod(mod)
            const isEnabled = await this.isModEnabled(mod)
            if (isEnabled || mod.noReload) {
                logWithTime('Enabled Bitwig Mod: ' + colors.green(modId))
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
        await fs.writeFile(controllerScriptMods, controllerScript)
        await this.copyControllerScript()
    }

    async refreshMods(localOnly = false) {
        logWithTime('Refreshing mods')
        
        // Handlers to disconnect any dangling callbacks etc
        for (const func of this.onReloadMods) {
            try {
                func()
            } catch (e) {
                console.error('Error when running onReloadMod', e)
            }
        }
        this.onReloadMods = []

        await this.refreshLocalMods()
        if (!localOnly) {
            await this.refreshBitwigMods()
        } else {
            sendPacketToBitwig({
                type: 'message',
                data: 'Reloaded local mods'
            })
        }
    }
}
