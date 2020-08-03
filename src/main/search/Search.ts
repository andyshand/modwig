import { app, BrowserWindow } from "electron";
import { getActiveApplication } from "../../connector/shared/ActiveApplication";
import { url } from "../core/Url";
const { Keyboard } = require('bindings')('bes')

let windowOpen
const listenerId = Keyboard.addEventListener('keydown', event => {
    console.log('key was pressed', event)
    const app = getActiveApplication()
    if (app.application !== 'BitwigStudio' && event.keycode === 49 && event.ctrlKey && !windowOpen) {
        // ctrl + space pressed
        windowOpen = new BrowserWindow({ 
            width: 1280, 
            height: 800, 
            frame: false, 
            webPreferences: {
                nodeIntegration: true,
            },
            alwaysOnTop: process.env.NODE_ENV !== 'dev'
         })
        windowOpen.loadURL(url('/#/search'))
        windowOpen.show()
        windowOpen.focus()
        windowOpen.webContents.openDevTools()
    } else if (windowOpen && event.keycode === 53) {
        // escape pressed
        windowOpen.close()
        windowOpen = null
    }
})
