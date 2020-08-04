import { app, BrowserWindow } from "electron";
import { getActiveApplication } from "../../connector/shared/ActiveApplication";
import { url } from "../core/Url";
import { sendPacketToBitwig } from "../../connector/shared/WebsocketToSocket";
const { Keyboard } = require('bindings')('bes')
let windowOpen

export function setupNavigation() {
    windowOpen = new BrowserWindow({ 
        width: 500, 
        height: 600, 
        frame: false, 
        show: false,
        webPreferences: {
            nodeIntegration: true,
        },
        alwaysOnTop: process.env.NODE_ENV !== 'dev'
    })
    windowOpen.loadURL(url('/#/search'))

    const listenerId = Keyboard.addEventListener('keydown', async event => {
        const app = await getActiveApplication()    
        console.log(event)

        if (event.keycode === 27 ) {
            if (event.shiftKey) {
                sendPacketToBitwig({type: 'tracknavigation/forward'})
            } else if (event.ctrlKey) {
                sendPacketToBitwig({type: 'tracknavigation/back'})
            }
        }

        if (app.application === 'BitwigStudio' && event.keycode === 49 && event.ctrlKey) {
            // ctrl + space pressed
            windowOpen.show()
            windowOpen.focus()
            // windowOpen.webContents.openDevTools()
        } else if (windowOpen && event.keycode === 53) {
            // escape pressed
            // windowOpen.hide()
        }
    })
}
