import { sendPacketToBitwig } from "../../connector/shared/WebsocketToSocket"

const { MainWindow, Keyboard } = require('bindings')('bes')

/**
 * With value entry we don't actually pass any value to Bitwig, rather we click and focus
 * a Bitwig field for input, and then relay the typed keys to our own view in the center of the screen -
 * so as not to require glancing to the top left of the screen.
 */
export function setupShortcuts() {
    const listenerId = Keyboard.addEventListener('keydown', async event => {
        const { lowerKey, meta } = event
        if (lowerKey === '1' && meta) {
            sendPacketToBitwig({
                type: 'tracksearch/confirm',
                data: `mixing`
            })
        } else if (lowerKey === '9' && meta) {
            sendPacketToBitwig({
                type: 'tracksearch/confirm',
                data: `Master`
            })
        } else if (lowerKey === 'w' && event.ctrl) {
            Keyboard.keyPress('ArrowUp')
        } else if (lowerKey === 'a' && event.ctrl) {
            Keyboard.keyPress('ArrowLeft')
        } else if (lowerKey === 's' && event.ctrl) {
            Keyboard.keyPress('ArrowDown')
        } else if (lowerKey === 'd' && event.ctrl) {
            Keyboard.keyPress('ArrowRight')
        } 
    })
}
