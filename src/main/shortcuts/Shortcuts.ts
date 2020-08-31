import { sendPacketToBitwig } from "../core/WebsocketToSocket"

const { Keyboard, MainWindow, Bitwig } = require('bindings')('bes')

let lastEscape = new Date()
/**
 * With value entry we don't actually pass any value to Bitwig, rather we click and focus
 * a Bitwig field for input, and then relay the typed keys to our own view in the center of the screen -
 * so as not to require glancing to the top left of the screen.
 */
export function setupShortcuts() {
    const listenerId = Keyboard.addEventListener('keydown', event => {
        const { lowerKey, nativeKeyCode, Meta, Control, Alt } = event
        // console.log(lowerKey, event.Meta, event.Control)
        const noMods = !(Meta || Control || Alt)

        if (Bitwig.isActiveApplication()) {
            if (nativeKeyCode === 10 && Meta) {
                sendPacketToBitwig({
                    type: 'tracksearch/confirm',
                    data: `mixing`
                })
            } else if (lowerKey === '9' && Meta) {
                sendPacketToBitwig({
                    type: 'tracksearch/confirm',
                    data: `Master`
                })
            } else if (lowerKey === 'Escape' && !event.Meta) {
                if (new Date().getTime() - lastEscape.getTime() < 250) {
                    // Double-tapped escape
                    Bitwig.closeFloatingWindows()
                    lastEscape = new Date(0)
                } else {
                    lastEscape = new Date()
                }
            } else if (lowerKey === 'b') {
                sendPacketToBitwig({
                    type: 'action',
                    data: [
                        `focus_or_toggle_detail_editor`,
                        `focus_or_toggle_device_panel`,
                        `show_insert_popup_browser`
                    ]
                })
            } else if (lowerKey === 'Enter' && noMods) {
                sendPacketToBitwig({
                    type: 'browser/confirm'
                })
            } else if (lowerKey === 'Escape' && event.Meta) {
                sendPacketToBitwig({
                    type: 'browser/filters/clear'
                })
            } else if (lowerKey === 'ArrowLeft' && event.Control) {
                sendPacketToBitwig({
                    type: 'browser/tabs/previous'
                })
            } else if (lowerKey === '1' && event.Meta) {
                sendPacketToBitwig({
                    type: 'browser/tabs/set',
                    data: 0
                })
            } else if (lowerKey === '2' && event.Meta) {
                sendPacketToBitwig({
                    type: 'browser/tabs/set',
                    data: 1
                })
            } else if (lowerKey === '3' && event.Meta) {
                sendPacketToBitwig({
                    type: 'browser/tabs/set',
                    data: 2
                })
            } else if (lowerKey === '4' && event.Meta) {
                sendPacketToBitwig({
                    type: 'browser/tabs/set',
                    data: 3
                })
            } else if (lowerKey === '5' && event.Meta) {
                sendPacketToBitwig({
                    type: 'browser/tabs/set',
                    data: 4
                })
            } else if (lowerKey === 'ArrowRight' && event.Control) {
                sendPacketToBitwig({
                    type: 'browser/tabs/next'
                })
            } else if (lowerKey === 'w' && event.Control) {
                Keyboard.keyPress('ArrowUp')
            } else if (lowerKey === 'a' && event.Control) {
                Keyboard.keyPress('ArrowLeft')
            } else if (lowerKey === 's' && event.Control) {
                Keyboard.keyPress('ArrowDown')
            } else if (lowerKey === 'd' && event.Control) {
                Keyboard.keyPress('ArrowRight')
            }
        } else {
            // if (lowerKey === 'z' && event.Meta && !event.Shift) {
            //     sendPacketToBitwig({
            //         type: 'application/undo'
            //     })
            // } else if (lowerKey === 'z' && event.Meta && event.Shift) {
            //     sendPacketToBitwig({
            //         type: 'application/redo'
            //     })
            // }
        }
    })
}
