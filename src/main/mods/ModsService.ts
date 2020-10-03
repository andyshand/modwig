import { sendPacketToBitwig, interceptPacket, sendPacketToBrowser } from "../core/WebsocketToSocket"
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
const chokidar = require('chokidar')

const { Keyboard, Mouse, MainWindow, Bitwig } = require('bindings')('bes')

export class ModsService extends BESService {
    currProject: string | null = null
    currTrack: string | null = null
    browserIsOpen = false
    settingsService = getService<SettingsService>('SettingsService')
    folderWatcher?: any
    devFolderWatcher?: any

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
                console.log(`updating track (${existingTrack.name}) with data: ` + data)
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
            return {
                on() {
                    // Add listener to current mod script context
                }
            }
        }

        const that = this
        const api = {
            Keyboard: {
                ...Keyboard,
            },
            whenActiveListener: whenActiveListener,
            Mouse: {
                ...Mouse,
                on: Keyboard.on,
                returnAfter: returnMouseAfter            },
            Bitwig: {
                ...Bitwig,
                get isBrowserOpen() {
                    return that.browserIsOpen
                },
                // Replace with getter for consistency
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

        const refreshFolderWatcher = async () => {
            console.log('Refreshing folder watcher')
            if (this.folderWatcher) {
                this.folderWatcher.close()
                this.folderWatcher = null
            }
            const folderPath = await this.getModsFolderPath()
            this.folderWatcher = chokidar.watch(folderPath, {
                ignoreInitial : true
            }).on('all', (event, path) => {
                console.log(event, path)
                // new Notification({
                //     title: 'Reloading mods',
                //     body: `${path} changed`
                // }).show()
                this.refreshMods()
            });
            if (process.env.NODE_ENV === 'dev' && !this.devFolderWatcher) {
                this.devFolderWatcher = chokidar.watch(getResourcePath('/controller-script/bes.control.js'), {
                    ignoreInitial : true
                }).on('all', (event, path) => {
                    console.log(event, path)
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
            }
        })

        this.refreshMods()
        refreshFolderWatcher()
    }

    async getModsFolderPath() {
        return process.env.NODE_ENV === 'dev' ? getResourcePath('/default-mods') : path.join(await this.settingsService.modwigLibraryLocation(), 'Mods')
    }

    async copyControllerScript() {
        try {
            const controllerSrcFolder = getResourcePath('/controller-script')
            const controllerDestFolder = path.join(await this.settingsService.userLibraryPath(), 'Controller Scripts', 'Modwig')

            try {
                await fs.access(controllerDestFolder)
            } catch (e) {
                await fs.mkdir(controllerDestFolder)
            }

            for (const file of await fs.readdir(controllerSrcFolder)) {
                await fs.copyFile(path.join(controllerSrcFolder, file), path.join(controllerDestFolder, file))
            }
        } catch (e) {
            console.error(e)   
        }
    }

    async refreshMods() {
        console.log('Refreshing mods')
        const modsFolder = await this.getModsFolderPath()
        let controllerScript = `
// AUTO GENERATED BY MODWIG
function loadMods(api) {
for (var key in api) {
    var toRun = key + ' = api["' + key + '"]'
    println(toRun)
    eval(toRun)
}
        `
        let mainScript = ''
        try {
            const files = await fs.readdir(modsFolder)
            for (const filePath of files) {
                try { 
                    const contents = await fs.readFile(path.join(modsFolder, filePath), 'utf8')
                    if (filePath.indexOf('bitwig.js') >= 0) {
                        // Controller script mod
                        controllerScript += `
// ${filePath}
// 
// 
// 
//
${contents}
                        `
                    } else {
                        // Standard mods
                        mainScript += contents
                    }
                } catch (e) {
                    console.error(e)
                }
            }

            controllerScript += `\n}`
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
