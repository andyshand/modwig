import { sendPacketToBitwig, interceptPacket, sendPacketToBrowser } from "../core/WebsocketToSocket"
import { BESService, getService } from "../core/Service"
import { returnMouseAfter } from "../../connector/shared/EventUtils"
import { getDb } from "../db"
import { ProjectTrack } from "../db/entities/ProjectTrack"
import { Project } from "../db/entities/Project"

const { Keyboard, Mouse, MainWindow, Bitwig } = require('bindings')('bes')

export class ModsService extends BESService {
    currProject: string | null = null
    currTrack: string | null = null
    browserIsOpen = false

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
            Mouse: {
                ...Mouse,
                on: Keyboard.on,
                returnAfter: returnMouseAfter
            },
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
    }
}
