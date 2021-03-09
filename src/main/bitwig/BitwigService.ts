import { interceptPacket } from "../core/WebsocketToSocket"
import { BESService, getService, makeEvent } from "../core/Service"
import { SettingsService } from "../core/SettingsService"
import { ShortcutsService } from "../shortcuts/Shortcuts"
import _ from 'underscore'
import { PopupService } from "../popup/PopupService"

const { Keyboard, Bitwig, UI } = require('bindings')('bes')

/**
 * Bitwig Service keeps track of Bitwig internal state, whether the browser is open etc.
 */
export class BitwigService extends BESService {

    // Other services
    settingsService = getService<SettingsService>('SettingsService')
    shortcutsService = getService<ShortcutsService>("ShortcutsService")
    popupService = getService<PopupService>('PopupService')

    // Internal state
    browserIsOpen = false
    transportState = 'stopped'
    tracks: any[] = []

    // Events
    events = {
        transportStateChanged: makeEvent<string>(),
        browserOpen: makeEvent<boolean>()
    }

    async activate() {
        interceptPacket('browser/state', undefined, ({ data }) => {
            this.log('received browser state packet: ' + data.isOpen)
            const previous = this.browserIsOpen
            this.browserIsOpen = data.isOpen
            this.events.browserOpen.emit(data, previous)
        })
        interceptPacket('transport/state', undefined, ({ data: state }) => {
            this.log('received transport state packet: ' + state)
            const previous = this.transportState
            this.transportState = state
            if (this.transportState !== previous) {
                this.events.transportStateChanged.emit(state, previous)
            }
        })
        interceptPacket('tracks', undefined, (_ as any).debounce(async ({ data: tracks }) => {
            this.tracks = tracks
            // Check for duplicate track names
            const uniqNames = (_ as any).uniq(this.tracks.map(t => t.name))
            const numberOfDuplicates = tracks.length - uniqNames.length
            if (numberOfDuplicates > 0) {
                this.popupService.showMessage(`Modwig works best when all tracks have unique names. Check the settings for the 'Rename Tracks' action to auto-rename ${numberOfDuplicates} tracks`)
            }
        }, 1000))
    }
}
