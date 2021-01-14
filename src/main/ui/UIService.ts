import { interceptPacket } from "../core/WebsocketToSocket"
import { BESService, getService, makeEvent } from "../core/Service"
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

    // Events
    events = {       
        toolChanged: makeEvent<number>()
    }

    getApi({ makeEmitterEvents }) {
        const that = this
        return {
            ...UI,
            MainWindow: this.uiMainWindow,
            get activeTool() {
                return that.activeTool
            },
            ...makeEmitterEvents({
                activeToolChanged: this.events.toolChanged
            })
        }
    }

    modalWasOpen

    checkIfModalOpen() {
        if (!process.env.SCREENSHOTS) {
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
            UI.updateUILayoutInfo({scale: parseInt(val, 10) / 100})
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
}
