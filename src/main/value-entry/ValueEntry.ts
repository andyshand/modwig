import { BrowserWindow } from "electron";
import { url } from "../core/Url";
import { returnMouseAfter } from "../../connector/shared/EventUtils";
const { MainWindow, Keyboard, Mouse, Bitwig } = require('bindings')('bes')
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

    Keyboard.addEventListener('keyup', event => {
        const { lowerKey } = event
        if (!open && Bitwig.isActiveApplication() && (lowerKey === 'F1' || lowerKey === 'F2')) {
            // Start value entry
            open = true
            typedSoFar = ''
            const frame = MainWindow.getFrame()

            const clickAt = lowerKey === 'F1' ? {
                x: frame.x + 120,
                y: frame.y + 140
            } : {
                x: frame.x + 150, 
                y: frame.y + 269
            } // Modulator

            returnMouseAfter(() => {
                Mouse.setPosition(clickAt.x, clickAt.y)

                if (lowerKey === 'F1') {
                    // Ensure arranger panel is active
                    // TODO we'll need a more reliable way to do this if
                    // someone changes shortcuts. Or require you add this shortcut?
                    // First, move focus away from arranger
                    Keyboard.keyPress('ArrowDown', {Control: true, Shift: true})
                    Keyboard.keyPress('ArrowLeft', {Control: true, Shift: true})
                    // Then move it back (because there is only "Toggle/Focus" not "Focus")
                    // If arranger is already active, it ends up showing the mixer...
                    Keyboard.keyPress('o', {Alt: true})
                    Keyboard.keyDown('Meta')
                    Mouse.click(0, { x: clickAt.x, y: clickAt.y, Meta: true })
                    Keyboard.keyUp('Meta')
                } else {
                    Keyboard.keyDown('Meta')
                    Mouse.doubleClick(0, { x: clickAt.x, y: clickAt.y })
                    Keyboard.keyUp('Meta')
                }
            })
            valueEntryWindow.webContents.executeJavaScript(`window.updateTypedValue('')`);
            valueEntryWindow.moveTop()
        } else if (lowerKey === 'Enter' || lowerKey === 'Escape') {
            // Close value entry
            valueEntryWindow.hide()
            open = false
        } else if (open) {
            if (lowerKey === 'Backspace') {
                typedSoFar = typedSoFar.substr(0, typedSoFar.length - 1)
            } else {
                typedSoFar += lowerKey;
            }
            valueEntryWindow.webContents.executeJavaScript(`window.updateTypedValue('${typedSoFar}')`);
        }
    })
}
