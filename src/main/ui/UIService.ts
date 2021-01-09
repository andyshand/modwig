import { interceptPacket } from "../core/WebsocketToSocket"
import { BESService, getService, makeEvent } from "../core/Service"
import { SettingsService } from "../core/SettingsService"
import { ShortcutsService } from "../shortcuts/Shortcuts"
import _ from 'underscore'
import { BitwigService } from "../bitwig/BitwigService"

const { Keyboard, Bitwig, UI } = require('bindings')('bes')
const UIMainWindow = new UI.BitwigWindow({})

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

    // Events
    events = {       
        toolChanged: makeEvent<number>()
    }

    getApi({ makeEmitterEvents }) {
        const that = this
        return {
            MainWindow: UIMainWindow,
            get activeTool() {
                return that.activeTool
            },
            ...makeEmitterEvents({
                activeToolChanged: this.events.toolChanged
            })
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
            const asNumber = parseInt(event.lowerKey, 10)
            if (asNumber === this.activeTool && new Date().getTime() - this.activeToolKeyDownAt.getTime() > 250)  {
                this.activeTool = this.previousTool
                this.activeToolKeyDownAt = new Date(0)
                this.events.toolChanged.emit(this.activeTool)
            }
        })

        Keyboard.on('mouseup', event => {
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
        })

        this.settingsService.onSettingValueChange('uiScale', val => {
            UI.updateUILayout({scale: parseInt(val, 10) / 100})
        })

        interceptPacket('ui', undefined, (packet) => {
            this.log('Updating UI from packet: ', packet)
            UI.updateUILayout(packet.data)
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
