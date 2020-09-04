import { BrowserWindow, clipboard, app } from "electron";
import { url } from "../core/Url";
import { returnMouseAfter } from "../../connector/shared/EventUtils";
const { MainWindow, Keyboard, Mouse, Bitwig } = require('bindings')('bes')
let valueEntryWindow
let open = false

/**
 * With value entry we don't actually pass any value to Bitwig, rather we click and focus
 * a Bitwig field for input, and then relay the typed keys to our own view in the center of the screen -
 * so as not to require glancing to the top left of the screen.
 */
export function setupValueEntry() {
    valueEntryWindow = new BrowserWindow({ 
        width: 275, 
        height: 80, 
        webPreferences: {
            nodeIntegration: true
        },
        frame: false, 
        show: false,
        alwaysOnTop: true
    })
    valueEntryWindow.loadURL(url('/#/value-entry'))

    Keyboard.addEventListener('keyup', async event => {
        const { lowerKey } = event
        function getAutomationValueLoc() {
            const frame = MainWindow.getFrame()
            return {
                x: frame.x + 120,
                y: frame.y + 140
            }
        }

        if (Bitwig.isActiveApplication() && lowerKey === 'F1' && !event.Meta) {
            // Start value entry
            open = true
            const clickAt = getAutomationValueLoc()
            returnMouseAfter(() => {
                Mouse.setPosition(clickAt.x, clickAt.y)

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
                
                // Copy value to clipboard
                Keyboard.keyPress('c', {Meta: true})
                
                valueEntryWindow.show()
                Keyboard.keyUp('Meta')
            })
        } else if (open && (lowerKey === 'Enter' || lowerKey === 'Escape')) {
            // Close value entry
            if (lowerKey === 'Enter') {
                try {
                    const typedValue = await valueEntryWindow.webContents.executeJavaScript(`window.getTypedValue()`);
                    // If result is null, it's the same as before, don't do anything

                    if (typedValue !== null) {
                        clipboard.writeText(typedValue)
                    }

                    app.hide()
                    valueEntryWindow.hide()

                    if (typedValue !== null) {
                        setTimeout(() => {
                            returnMouseAfter(async () => {
                                const clickAt = getAutomationValueLoc()
                            
                                Keyboard.keyDown('Meta')
                                Mouse.click(0, { x: clickAt.x, y: clickAt.y, Meta: true })
                                
                                // Paste value
                                Keyboard.keyPress('v', {Meta: true})    
                                Keyboard.keyUp('Meta')

                                Keyboard.keyPress('Enter')
                            })
                        }, 200)                   
                    }     
                } catch (e) {
                    console.error(e)
                }
            } else {
                app.hide()
                valueEntryWindow.hide()
            }
            open = false
        }
    })
}
