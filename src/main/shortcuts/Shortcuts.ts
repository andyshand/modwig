import { sendPacketToBitwig, interceptPacket } from "../core/WebsocketToSocket"
import { BESService } from "../core/Service"

const { Keyboard, MainWindow, Bitwig } = require('bindings')('bes')

let lastEscape = new Date()
let renaming = false

export class ShortcutsService extends BESService {
    browserIsOpen
    browserText = ''

    activate() {
        interceptPacket('browser/state', undefined, ({ data: {isOpen} }) => {
            this.browserIsOpen = isOpen
            if (isOpen) {
                this.browserText = ''
            }
        })

        Keyboard.addEventListener('keydown', event => {
            const { lowerKey, nativeKeyCode, Meta, Shift, Control, Alt } = event
            console.log(event)
            const noMods = !(Meta || Control || Alt)

            // Prevent shortcuts from triggering when renaming something
            if (Bitwig.isActiveApplication() && lowerKey === 'r' && Meta && !Shift && !Alt) {
                renaming = true
            } else if (lowerKey === 'Enter' || lowerKey === 'Escape') {
                renaming = false
            }

            if (Bitwig.isActiveApplication() && !renaming) {
                if (lowerKey === 'F6') {
                    sendPacketToBitwig({
                        type: 'bugfix/buzzing'
                    })
                } else if (lowerKey === '§' && Meta) {
                    sendPacketToBitwig({
                        type: 'devices/selected/layer/select-first'
                    })
                } else if (lowerKey === 'e' && Control) {
                    sendPacketToBitwig({
                        type: 'devices/selected/chain/insert-at-end'
                    })
                } else if (lowerKey === 'q' && Control) {
                    sendPacketToBitwig({
                        type: 'devices/selected/chain/insert-at-start'
                    })
                } else if (lowerKey === '[' && Meta) {
                    sendPacketToBitwig({
                        type: `devices/${Shift ? `chain` : `selected`}/collapse`
                    })
                } else if (lowerKey === ']' && Meta) {
                    sendPacketToBitwig({
                        type: `devices/${Shift ? `chain` : `selected`}/expand`
                    })
                } else if (lowerKey === '9' && Meta) {
                    sendPacketToBitwig({
                        type: 'tracksearch/confirm',
                        data: `Master`
                    })
                } else if (lowerKey === 'Escape' && !Meta && !Alt) {
                    if (new Date().getTime() - lastEscape.getTime() < 250) {
                        // Double-tapped escape
                        Bitwig.closeFloatingWindows()
                        lastEscape = new Date(0)
                    } else {
                        lastEscape = new Date()
                    }
                } else if (lowerKey === 'd' && !this.browserIsOpen && noMods) {
                    sendPacketToBitwig({
                        type: 'action',
                        data: [
                            `focus_or_toggle_detail_editor`,
                            `focus_or_toggle_device_panel`
                        ]
                    })
                } else if (lowerKey === 'b' && !this.browserIsOpen) {
                    if (Shift) {
                        // insert at end of selected layer
                        sendPacketToBitwig({
                            type: 'devices/selected/layer/insert-at-end'
                        })
                    } else {
                        sendPacketToBitwig({
                            type: 'action',
                            data: [
                                `focus_or_toggle_detail_editor`,
                                `focus_or_toggle_device_panel`,
                                `show_insert_popup_browser`,
                                `Select All`
                            ]
                        })
                    }
                } else if (lowerKey === 'Enter' && noMods) {
                    sendPacketToBitwig({
                        type: this.browserText.length > 0 ? 'browser/select-and-confirm' : 'browser/confirm'
                    })
                } else if (lowerKey === 'Escape' && Alt) {
                    sendPacketToBitwig({
                        type: 'browser/filters/clear'
                    })
                } else if (lowerKey === 'Escape' && Meta) {
                    sendPacketToBitwig({
                        type: this.browserText.length > 0 ? 'browser/select-and-confirm' : 'browser/confirm'
                    })
                } else if (lowerKey === 'ArrowLeft' && Control) {
                    sendPacketToBitwig({
                        type: 'browser/tabs/previous'
                    })
                } else if (!isNaN(parseInt(lowerKey))) {
                    const i = parseInt(lowerKey) - 1
                
                    if (this.browserIsOpen) {
                        // navigate browser tabs
                        sendPacketToBitwig({
                            type: 'browser/tabs/set',
                            data: i
                        })
                    } else {
                       if (Shift) {
                            // navigate device layers
                            sendPacketToBitwig({
                                type: 'devices/selected/layers/select',
                                data: i
                            })
                        } else {
                            // navigate device slots
                            sendPacketToBitwig({
                                type: 'devices/selected/slot/select',
                                data: i
                            })
                        }
                    }
                } else if (lowerKey === 'ArrowUp' && Meta || (Control && Meta && lowerKey === 'w')) {
                    sendPacketToBitwig({
                        type: 'devices/selected/navigate-up'
                    })
                } else if (lowerKey === 'ArrowRight' && Control) {
                    sendPacketToBitwig({
                        type: 'browser/tabs/next'
                    })
                } else if (lowerKey === 'w' && Control) {
                    Keyboard.keyPress('ArrowUp')
                } else if (lowerKey === 'a' && Control) {
                    Keyboard.keyPress('ArrowLeft')
                } else if (lowerKey === 's' && Control) {
                    Keyboard.keyPress('ArrowDown')
                } else if (lowerKey === 'd' && Control) {
                    Keyboard.keyPress('ArrowRight')
                } else if (this.browserIsOpen && /[a-z]{1}/.test(lowerKey) && noMods) {
                    // Typing in browser
                    this.browserText += lowerKey
                }
                if (Bitwig.isPluginWindowActive()) {
                    if (lowerKey === 'r' && noMods) {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Toggle Record'
                        })
                    } else if (lowerKey === 'w') {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Select previous track'
                        })
                    } else if (lowerKey === 's') {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Select next track'
                        })
                    }
                }
            } 
        })
    }
}
