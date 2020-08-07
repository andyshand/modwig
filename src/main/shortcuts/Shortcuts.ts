import { sendPacketToBitwig } from "../../connector/shared/WebsocketToSocket"

const { MainWindow, Keyboard } = require('bindings')('bes')

/**
 * With value entry we don't actually pass any value to Bitwig, rather we click and focus
 * a Bitwig field for input, and then relay the typed keys to our own view in the center of the screen -
 * so as not to require glancing to the top left of the screen.
 */
export function setupShortcuts() {
    const listenerId = Keyboard.addEventListener('keydown', async event => {
        if (event.keycode === 0x12 && event.cmd) {
            sendPacketToBitwig({
                type: 'tracksearch/confirm',
                data: `mixing`
            })
        } else if (event.keycode === 0x19 && event.cmd) {
            sendPacketToBitwig({
                type: 'tracksearch/confirm',
                data: `Master`
            })
        }
    })
}
