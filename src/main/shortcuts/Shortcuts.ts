import { sendPacketToBitwig } from "../../connector/shared/WebsocketToSocket"
import { whenActiveListener } from "../../connector/shared/EventUtils"
const { Keyboard } = require('bindings')('bes')

/**
 * With value entry we don't actually pass any value to Bitwig, rather we click and focus
 * a Bitwig field for input, and then relay the typed keys to our own view in the center of the screen -
 * so as not to require glancing to the top left of the screen.
 */
export function setupShortcuts() {
    const listenerId = Keyboard.addEventListener('keydown', whenActiveListener(event => {
        const { lowerKey, Meta } = event
        if (lowerKey === '1' && Meta) {
            sendPacketToBitwig({
                type: 'tracksearch/confirm',
                data: `mixing`
            })
        } else if (lowerKey === '9' && Meta) {
            sendPacketToBitwig({
                type: 'tracksearch/confirm',
                data: `Master`
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
    }))
}
