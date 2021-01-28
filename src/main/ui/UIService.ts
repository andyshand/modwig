import { interceptPacket } from "../core/WebsocketToSocket"
import { BESService, EventRouter, getService, makeEvent } from "../core/Service"
import { SettingsService } from "../core/SettingsService"
import { ShortcutsService } from "../shortcuts/Shortcuts"
import _ from 'underscore'
import { BitwigService } from "../bitwig/BitwigService"

const { Keyboard, Bitwig, UI } = require('bindings')('bes')


/**
 * UI Service is basically responsible for keeping an up to date (insofar as possbile) representation of the Bitwig UI.
 * e.g. currently active tool, whether they are entering a value. Some of this stuff still remains in the mod service but we will
 * gradually move things over to here when it makes sense.
 */
export class UIService extends BESService {

    // Other services
    settingsService = getService<SettingsService>('SettingsService')
    shortcutsService = getService<ShortcutsService>("ShortcutsService")
    bitwigService = getService<BitwigService>("BitwigService")

    // Internal state
    activeTool = 0
    previousTool = 0
    activeToolKeyDownAt = new Date()
    uiMainWindow = new UI.BitwigWindow({})
    uiScale
    apiEventRouter = new EventRouter<any>()
    idsByEventType: {[type: string] : number} = {}
    hasOnReloadModsCb = false

    // Events
    events = {       
        toolChanged: makeEvent<number>()
    }

    getApi({ makeEmitterEvents, onReloadMods }) {
        const that = this
        if (!this.hasOnReloadModsCb) {
            this.hasOnReloadModsCb = true
            onReloadMods(() => {
                this.log('Reloading mods', this.idsByEventType)
                for (const eventName in this.idsByEventType) {
                    Keyboard.off(this.idsByEventType[eventName])
                    this.log('Removed id ' + this.idsByEventType[eventName])
                }
                this.idsByEventType = {}
                this.apiEventRouter.clear()
                this.hasOnReloadModsCb = false
            })
        }

        return {
            ...UI,
            MainWindow: this.uiMainWindow,
            get activeTool() {
                return that.activeTool
            },
            ...makeEmitterEvents({
                activeToolChanged: this.events.toolChanged
            }),
            scaleXY: (args) => this.scaleXY(args),
            scale: (point) => this.scaleXY({x: point, y: 0}).x,
            unScaleXY: (args) => this.unScaleXY(args),
            unScale: (point) => this.unScaleXY({x: point, y: 0}).x,
            bwToScreen: (args) => this.bwToScreen(args),
            screenToBw: (args) => this.screenToBw(args),
            get doubleClickInterval() {
                return 250
            },
            Mouse: {
                on: (event, cb) => {
                    this.apiEventRouter.listen(event, cb)
                    if (!this.idsByEventType[event]) {
                        const id = Keyboard.on(event, (...args) => {
                            this.apiEventRouter.emit(event, ...args)
                        })
                        this.log(`Id for ${event} is ${id}`)
                        this.idsByEventType[event] = id
                    }
                }
            }
        }
    }

    onReloadMods() {

    }

    modalWasOpen

    checkIfModalOpen() {
        if (process.env.SCREENSHOTS !== 'true') {
            return
        }

        UI.invalidateLayout()
        const layout = this.uiMainWindow.getLayoutState()

        // FIXME because of lack of explicit ordering of event listeners between services,
        // the ShortcutsService will receive one round of inputs that correspond to an invalid UI
        // state if the modal is triggered by keyboard shortcuts.
        if (layout.modalOpen && !this.modalWasOpen) {
            this.log('Modal is open, pausing shortcuts')
            this.shortcutsService.pause()
            this.modalWasOpen = true
        } else if (!layout.modalOpen && this.modalWasOpen) {
            this.log('Modal closed, unpausing shortcuts')
            this.shortcutsService.unpause()
            this.modalWasOpen = false
        }
    }

    async activate() {
        // Track tool changes via number keys
        Keyboard.on('keydown', event => {
            const asNumber = parseInt(event.lowerKey, 10)
            if (asNumber !== this.activeTool && !(event.Meta || event.Shift || event.Control || event.Alt) && asNumber > 0 && asNumber < 6)  {
                this.previousTool = this.activeTool
                this.activeTool = asNumber
                this.activeToolKeyDownAt = new Date()
                this.events.toolChanged.emit(this.activeTool)
            }
        })
        
        Keyboard.on('keyup', event => {
            UI.invalidateLayout()

            const asNumber = parseInt(event.lowerKey, 10)
            if (asNumber === this.activeTool && new Date().getTime() - this.activeToolKeyDownAt.getTime() > 250)  {
                this.activeTool = this.previousTool
                this.activeToolKeyDownAt = new Date(0)
                this.events.toolChanged.emit(this.activeTool)
            }

            this.checkIfModalOpen()
        })

        Keyboard.on('mouseup', event => {
            // Layout could have always changed on mouse up
            UI.invalidateLayout()

            // Attempt to track when user is entering a text field
            // FIXME for scaling
            if (Bitwig.isActiveApplication() 
            && event.y > 1000 
            && event.Meta 
            && !event.Shift 
            && !event.Alt 
            && !event.Control 
            && !this.eventIntersectsPluginWindows(event) 
            && !this.bitwigService.browserIsOpen) {
                // Assume they are clicking to enter a value by keyboard
                this.shortcutsService.setEnteringValue(true)
            }
            
            this.checkIfModalOpen()
        })

        this.settingsService.onSettingValueChange('uiScale', val => {
            this.uiScale = parseInt(val, 10) / 100
            UI.updateUILayoutInfo({scale: parseInt(val, 10) / 100})
            this.log(`Ui scale set to ${this.uiScale}`)
        })

        interceptPacket('ui', undefined, (packet) => {
            this.log('Updating UI from packet: ', packet)
            UI.updateUILayoutInfo(packet.data)
        })
    }

    eventIntersectsPluginWindows(event) {
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

    bwToScreen({ x, y, ...rest }) {
        const frame = this.uiMainWindow.getFrame()
        const scaled = this.scaleXY({ x, y })
        return {
            x: scaled.x + frame.x,
            y: scaled.y + frame.y,
            ...rest
        }
    }

    screenToBw({ x, y, ...rest }) {
        const frame = this.uiMainWindow.getFrame()
        const bwRelative = {
            x: x - frame.x,
            y: y - frame.y,
            ...rest
        }
        return this.unScaleXY(bwRelative)
    }

    scaleXY({ x, y, ...rest }) {
        return {
            x: x * this.uiScale,
            y: y * this.uiScale,
            ...rest
        }
    }

    unScaleXY({ x, y, ...rest }) {
        return {
            x: x / this.uiScale,
            y: y / this.uiScale,
            ...rest
        }
    }
}
