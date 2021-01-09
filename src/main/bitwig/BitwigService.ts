import { interceptPacket } from "../core/WebsocketToSocket"
import { BESService, getService, makeEvent } from "../core/Service"
import { SettingsService } from "../core/SettingsService"
import { ShortcutsService } from "../shortcuts/Shortcuts"
import _ from 'underscore'

const { Keyboard, Bitwig, UI } = require('bindings')('bes')

/**
 * Bitwig Service keeps track of Bitwig internal state, whether the browser is open etc.
 */
export class BitwigService extends BESService {

    // Other services
    settingsService = getService<SettingsService>('SettingsService')
    shortcutsService = getService<ShortcutsService>("ShortcutsService")

    // Internal state
    browserIsOpen = false

    // Events
    events = {
        browserOpen: makeEvent<boolean>()
    }

    async activate() {
        interceptPacket('browser/state', undefined, ({ data }) => {
            this.log('received browser state packet: ' + data.isOpen)
            const previous = this.browserIsOpen
            this.browserIsOpen = data.isOpen
            this.events.browserOpen.emit(data, previous)
        })
    }
}
