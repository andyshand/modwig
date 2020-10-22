import { sendPacketToBitwig, interceptPacket, sendPacketToBrowser, addAPIMethod } from "../core/WebsocketToSocket"
import { BESService, getService } from "../core/Service"
import { returnMouseAfter, whenActiveListener } from "../../connector/shared/EventUtils"
import { getDb } from "../db"
import { ProjectTrack } from "../db/entities/ProjectTrack"
import { Project } from "../db/entities/Project"
import { getResourcePath } from '../../connector/shared/ResourcePath'
import { SettingsService } from "../core/SettingsService"
import { promises as fs } from 'fs'
import * as path from 'path'
import {Notification} from 'electron'
import { Setting } from "../db/entities/Setting"
import { createDirIfNotExist, exists as fileExists } from "../core/Files"
import { logWithTime } from "../core/Log"
const chokidar = require('chokidar')

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
    devFolderWatcher?: any
    latestModsMap: { [name: string]: Partial<ModInfo> } = {}
    onReloadMods: Function[] = []

    async makeApi() {
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
            return saved?.data || defaultData
        }
        async function createOrUpdateTrack(track: string, project: string, data: any) {
            const existingProject = await projects.findOne({ where: { name: project } })
            let projectId = existingProject?.id
            if (!projectId) {
                projectId = await projects.save(projects.create({ name: project }))
            }

            const existingTrack = await projectTracks.findOne({ where: { name: track } })
            if (existingTrack) {
                logWithTime(`updating track (${existingTrack.name}) with data: ` + data)
                await projectTracks.update(existingTrack.id, { data });
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

        const makeEvents = (eventMap) => {
            // TODO
            return {
                on() {
                    // Add listener to current mod script context
                }
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

        const that = this
        const api = {
            Keyboard: {
                ...Keyboard,
                on: wrappedOnForReloadDisconnect(Keyboard),
            },
            whenActiveListener: whenActiveListener,
            Mouse: {
                ...Mouse,
                on: wrappedOnForReloadDisconnect(Keyboard),
                returnAfter: returnMouseAfter            },
            Bitwig: {
                closeFloatingWindows: Bitwig.closeFloatingWindows,
                get isAccessibilityOpen() {
                    return Bitwig.isAccessibilityOpen()
                },
                get isPluginWindowActive() {
                    return Bitwig.isPluginWindowActive()
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
                    return that.currProject
                },
                ...makeEvents([
                    'selectedTrackChanged'
                ])
            },
            Db: {
                getTrackData: (name) => {
                    if (!this.currProject) {
                        return null
                    }
                    return loadDataForTrack(name, this.currProject)
                },
                setTrackData: (name, data) => {
                    if (!this.currProject) {
                        return null
                    }
                    return createOrUpdateTrack(name, this.currProject, data)
                },
                getCurrentTrackData: () => {
                    return api.Db.getTrackData(api.Bitwig.currentTrack)
                },
                setCurrentTrackData: (data) => {
                    return api.Db.setTrackData(api.Bitwig.currentTrack, data)
                },
            }
        }
        return api
    }
    async getMods({category, inMenu} = {} as any) {
        const db = await getDb()
        const settings = db.getRepository(Setting) 
        const where = {type: 'mod'} as any
        if (category) {
            where.category = category
        }
        const results = await settings.find({where})
        return results.map(res => {
            res = this.settingsService.postload(res)
            if (res.key in this.latestModsMap) {
                const modInfo = this.latestModsMap[res.key]
                res = {
                    ...res,
                    ...modInfo
                }
            }
            return res
        }).filter((mod) => {
            return inMenu ? mod.value.showInMenu : true
        })
    }
    activate() {
        // Listen out for the current track/project state from the controller script
        interceptPacket('trackselected', undefined, async ({ data: { name: newTrackName, selected, project } }) => {
            if (selected) {
                this.currProject = project.name
                this.currTrack = newTrackName
            }
        })
        interceptPacket('project', undefined, async ({ data: { name: projectName } }) => {
            this.currProject = projectName
        })
        interceptPacket('browser/state', undefined, ({ data: {isOpen} }) => {
            this.browserIsOpen = isOpen
        })
        addAPIMethod('api/mods/category', async ({ category }) => {
            return await this.getMods({category})
        })

        const refreshFolderWatcher = async () => {
            logWithTime('Refreshing folder watcher')
            if (this.folderWatcher) {
                this.folderWatcher.close()
                this.folderWatcher = null
            }
            const folderPaths = await this.getModsFolderPaths()
            console.log('Watching ' + folderPaths)
            this.folderWatcher = chokidar.watch(folderPaths, {
                ignoreInitial : true
            }).on('all', (event, path) => {
                logWithTime(event, path)
                // new Notification({
                //     title: 'Reloading mods',
                //     body: `${path} changed`
                // }).show()
                this.refreshMods()
            });
            if (process.env.NODE_ENV === 'dev' && !this.devFolderWatcher) {
                const mainScript = getResourcePath('/controller-script/bes.control.js')
                console.log('Watching ' + mainScript)
                this.devFolderWatcher = chokidar.watch([mainScript], {
                    ignoreInitial : true
                }).on('all', (event, path) => {
                    logWithTime(event, path)
                    // new Notification({
                    //     title: 'Reloading controller script',
                    //     body: `${path} changed`
                    // }).show()
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
    }

    async getModsFolderPaths() : Promise<string[]> {
        const userLibPath = await this.settingsService.userLibraryPath()
        const exists = await fileExists(userLibPath)
        if (exists) {
            await createDirIfNotExist(path.join(userLibPath, 'Modwig'))
            await createDirIfNotExist(path.join(userLibPath, 'Modwig', 'Mods'))
        }
        return [
            getResourcePath('/default-mods'),
            ...(exists ? [path.join(await this.settingsService.modwigLibraryLocation(), 'Mods')] : [])
        ]
    }

    async copyControllerScript() {
        const userLibPath = await this.settingsService.userLibraryPath()
        try {
            await fs.access(userLibPath)
        } catch (e) {
            return logWithTime("Not copying controller script until user library path set")
        }
        
        try {
            const controllerSrcFolder = getResourcePath('/controller-script')
            const controllerDestFolder = path.join(userLibPath, 'Controller Scripts', 'Modwig')

            await createDirIfNotExist(controllerDestFolder)
            for (const file of await fs.readdir(controllerSrcFolder)) {
                await fs.copyFile(path.join(controllerSrcFolder, file), path.join(controllerDestFolder, file))
            }
        } catch (e) {
            console.error(e)   
        }
    }

    async refreshMods() {
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
        let mainScript = ''
        try {
            const modsById = {}
            const defaultControllerScriptSettings = {}

            // Load mods from all folders, with latter folders having higher precedence (overwriting by id)
            for (const modsFolder of modsFolders) {
                const files = await fs.readdir(modsFolder)
                this.latestModsMap = {}
                for (const filePath of files) {
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
                        console.error(e)
                    }
                }
            }

            for (const modId in modsById) {
                const mod = modsById[modId]
                await this.settingsService.insertSettingIfNotExist({
                    key: mod.settingsKey,
                    value: {
                        enabled: true,
                        keys: []
                    },
                    type: 'mod',
                    category: mod.category
                })
                this.latestModsMap[mod.settingsKey] = mod
                const isEnabled = (await this.settingsService.getSetting(mod.settingsKey)).value.enabled
                if (isEnabled || mod.noReload) {
                    if (mod.path.indexOf('bitwig.js') >= 0) {
                        // Controller script mod
                        defaultControllerScriptSettings[modId] = isEnabled
                        controllerScript += `
// ${mod.path}
// 
// 
// 
//
${mod.contents.replace(/Mod\.enabled/g, `settings['${modId}']`)}
                        `
                    } else {
                        // Standard mods
                        mainScript += mod.contents
                    }
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

            ;(async () => {
                const api = await this.makeApi()
                // Populate function scope with api objects
                try { 
                    let setVars = ''
                    for (const key in api) {
                        setVars += `const ${key} = api["${key}"]
`
                    }
                    eval(setVars + mainScript)
                } catch (e) {
                    console.error(e)   
                }
            })()
        } catch (e) {
            console.error(e)
        }
    }
}
