import { app, BrowserWindow } from "electron";
import { getActiveApplication } from "../../connector/shared/ActiveApplication";
import { url } from "../core/Url";
const { Keyboard } = require('bindings')('bes')
let windowOpen

export function setupSearch() {
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
