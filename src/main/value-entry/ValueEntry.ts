import { BrowserWindow } from "electron";
import { url } from "../core/Url";
import { isFrontmostApplication } from "../core/BitwigUI";
import { returnMouseAfter } from "../../connector/shared/MouseUtils";
const { MainWindow, Keyboard, Mouse } = require('bindings')('bes')
let valueEntryWindow
let typedSoFar = ''
let open = false

/**
 * With value entry we don't actually pass any value to Bitwig, rather we click and focus
 * a Bitwig field for input, and then relay the typed keys to our own view in the center of the screen -
 * so as not to require glancing to the top left of the screen.
 */
export function setupValueEntry() {
    valueEntryWindow = new BrowserWindow({ 
        width: 200, 
        height: 80, 
        webPreferences: {
            nodeIntegration: true
        },
        frame: false, 
        show: false,
        alwaysOnTop: true
    })
    valueEntryWindow.loadURL(url('/#/value-entry'))

    const listenerId = Keyboard.addEventListener('keydown', async event => {
        // `isFrontMostApplication` is currently time consuming, so only run it when we're not
        // already open
        if (!open && await isFrontmostApplication() && event.keycode === 36 && event.cmdKey) {
            valueEntryWindow.webContents.executeJavaScript(`window.updateTypedValue('')`);
            valueEntryWindow.moveTop()
            // start value entry
            open = true
            typedSoFar = ''
            const frame = MainWindow.getFrame()
            // console.log('frame', frame.x, frame.y)
            const clickAt = {
                x: frame.x + 120,
                y: frame.y + 140
            }
            // console.log('clicking at ', clickAt)
            returnMouseAfter(() => {
                Mouse.click(0, { cmd: true, x: clickAt.x, y: clickAt.y })
            })
        } else if (event.keycode === 53 || event.keycode === 36) {
            // escape or enter (without cmd)
            // close value entry
            valueEntryWindow.hide()
            open = false
        } else if (open) {
            if (event.keycode === 51) {
                // backspace
                typedSoFar = typedSoFar.substr(0, typedSoFar.length - 1)
            } else {
                typedSoFar += ({
                    0x12: '1',
                    0x13: '2', 
                    0x14: '3',
                    0x15: '4',
                    0x17: event.shiftKey ? '%' : '5',
                    0x16: '6',
                    0x1A: '7',
                    0x1C: '8',
                    0x19: '9',
                    0x1D: '0',
                    0x2F: '.',
                    0x1B: '-',
                    0x18: '+'
                }[event.keycode] || '')
            }
            valueEntryWindow.webContents.executeJavaScript(`window.updateTypedValue('${typedSoFar}')`);
        }
    })
}
