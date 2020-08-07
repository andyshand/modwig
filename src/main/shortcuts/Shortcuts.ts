import { sendPacketToBitwig } from "../../connector/shared/WebsocketToSocket"

const { MainWindow, Keyboard } = require('bindings')('bes')

/**
 * With value entry we don't actually pass any value to Bitwig, rather we click and focus
 * a Bitwig field for input, and then relay the typed keys to our own view in the center of the screen -
 * so as not to require glancing to the top left of the screen.
 */
export function setupShortcuts() {
    const listenerId = Keyboard.addEventListener('keydown', async event => {
        if (event.keyCode === 0x12 && event.meta) {
            sendPacketToBitwig({
                type: 'tracksearch/confirm',
                data: `mixing`
            })
        } else if (event.keyCode === 0x19 && event.meta) {
            sendPacketToBitwig({
                type: 'tracksearch/confirm',
                data: `Master`
            })
        } else if (event.keyCode === 0x0D && event.ctrl) {
            // w
            Keyboard.keyPress(0x7E) // arrow up
        } else if (event.keyCode === 0x00 && event.ctrl) {
            // a
            Keyboard.keyPress(0x7B) // arrow left
        } else if (event.keyCode === 0x01 && event.ctrl) {
            // s
            Keyboard.keyPress(0x7D) // arrow down
        } else if (event.keyCode === 0x02 && event.ctrl) {
            // d
            Keyboard.keyPress(0x7C) // arrow right
        }
    })
}
