import { BrowserWindow } from "electron";
import { url } from "../core/Url";
import { isFrontmostApplication } from "../core/BitwigUI";
import { returnMouseAfter } from "../../connector/shared/MouseUtils";
const { MainWindow, Keyboard, Mouse } = require('bindings')('bes')
let valueEntryWindow
let typedSoFar = ''
let open = false
let mousePosBefore = {x: 0, y: 0}

/**
 * With value entry we don't actually pass any value to Bitwig, rather we click and focus
 * a Bitwig field for input, and then relay the typed keys to our own view in the center of the screen -
 * so as not to require glancing to the top left of the screen.
 */
export function setupValueEntry() {
    valueEntryWindow = new BrowserWindow({ 
        width: 250, 
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
        // F1 or F2
        if (!open && await isFrontmostApplication() && event.keyCode === 0x7A || event.keyCode === 0x78) {
            // start value entry
            open = true
            typedSoFar = ''
            const frame = MainWindow.getFrame()
            // console.log('frame', frame.x, frame.y)
            const clickAt = event.keyCode === 0x7A ? {
                x: frame.x + 120,
                y: frame.y + 140
            } : {
                x: frame.x + 150, 
                y: frame.y + 269
            } // modulator
            // console.log('clicking at ', clickAt)
            returnMouseAfter(() => {
                // Modifier choice is important here. Our real modifier presses
                // can interrupt our virtual ones from working as expected
                Mouse.setPosition(clickAt.x, clickAt.y)
                Keyboard.keyDown(0x37)
                if (event.keyCode === 0x78) {
                    Mouse.doubleClick(0, { x: clickAt.x, y: clickAt.y })
                } else {
                    Mouse.click(0, { x: clickAt.x, y: clickAt.y, cmd: true })
                }
                Keyboard.keyUp(0x37)
            })
            valueEntryWindow.webContents.executeJavaScript(`window.updateTypedValue('')`);
            valueEntryWindow.moveTop()
        } else if (event.keyCode === 53 || event.keyCode === 36) {
            // escape or enter (without cmd)
            // close value entry
            valueEntryWindow.hide()
            // Mouse.setPosition(mousePosBefore.x, mousePosBefore.y)
            open = false
        } else if (open) {
            if (event.keyCode === 51) {
                // backspace
                typedSoFar = typedSoFar.substr(0, typedSoFar.length - 1)
            } else {
                typedSoFar += ({
                    0x12: '1',
                    0x13: '2', 
                    0x14: '3',
                    0x15: '4',
                    0x17: event.shift ? '%' : '5',
                    0x16: '6',
                    0x1A: '7',
                    0x1C: '8',
                    0x19: '9',
                    0x1D: '0',
                    0x2F: '.',
                    0x1B: '-',
                    0x18: '+'
                }[event.keyCode] || '')
            }
            valueEntryWindow.webContents.executeJavaScript(`window.updateTypedValue('${typedSoFar}')`);
        }
    })
}
