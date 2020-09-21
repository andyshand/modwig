import { BESService, getService } from "./Service";
import { Tray, Menu, app, BrowserWindow } from 'electron'
import { getResourcePath } from "../../connector/shared/ResourcePath";
import { url } from "./Url";
import { sendPacketToBitwig } from "./WebsocketToSocket";

const SETTINGS_WINDOW_WIDTH = 800
const SETTINGS_WINDOW_HEIGHT = 500

let settings = {
    exclusiveArm: true
}

export class TrayService extends BESService {
    timer: any
    animationI = 0
    connected = false
    settingsWindow

    copyControllerScript() {
        try {
            const fs = require('fs')
            const path = require('path')
            const homedir = require('os').homedir();

            const controllerSrcFolder = getResourcePath('/controller-script')
            const controllerDestFolder = path.join(homedir, 'Documents', 'Bitwig Studio', 'Controller Scripts', 'Bitwig Enhancement Suite')

            if (!fs.existsSync(controllerDestFolder)) {
                fs.mkdirSync(controllerDestFolder)
            }

            for (const file of fs.readdirSync(controllerSrcFolder)) {
                fs.copyFileSync(path.join(controllerSrcFolder, file), path.join(controllerDestFolder, file))
            }
        } catch (e) {
            console.error(e)   
        }
    }

    activate() {
        if (process.env.NODE_ENV !== 'dev') {
            this.copyControllerScript()
            app.dock.hide()
        }

        const socket = getService('SocketMiddlemanService')
        const tray = new Tray(getResourcePath('/images/tray-0Template.png'))
        const updateMenu = () => {
            const contextMenu = Menu.buildFromTemplate([
              { label: `Bitwig Enhancement Suite: ${this.connected ? 'Connected' : 'Connecting...'}`, enabled: false },
              { label: `Reinstall Controller Script`, click: () => {
                this.copyControllerScript()
              } },
              { type: 'separator' },
              { label: 'Exclusive Arm', checked: settings.exclusiveArm, type: "checkbox", click: () => {
                settings.exclusiveArm = !settings.exclusiveArm
                sendPacketToBitwig({
                    type: 'settings/update',
                    data: settings
                })
            } },
              { label: 'Preferences...', click: () => {
                if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
                    this.settingsWindow.close()
                }
                this.settingsWindow = new BrowserWindow({ 
                    width: SETTINGS_WINDOW_WIDTH, 
                    height: SETTINGS_WINDOW_HEIGHT, 
                    show: false,
                    title: 'Bitwig Enhancement Suite - Settings',
                    webPreferences: {
                        nodeIntegration: true,
                    }
                })
                this.settingsWindow.loadURL(url('/#/settings'))
                this.settingsWindow.show()
            } },
            { type: 'separator' },
              { label: 'Quit', click: () => {
                app.quit();
              } }
            ])
            tray.setContextMenu(contextMenu)
        }
        const onNotConnected = () => {
            if (this.timer) {
                clearInterval(this.timer)
            }
            this.timer = setInterval(() => {
                tray.setImage(getResourcePath(`/images/tray-${this.animationI % 6}Template.png`))    
                this.animationI++
            }, 250)
        }
        socket.events.connected.listen(isConnected => {
            this.connected = isConnected
            if (isConnected && this.timer) {
                clearInterval(this.timer)
                tray.setImage(getResourcePath(`/images/tray-0Template.png`))   
            } else {
                onNotConnected()
            }
            updateMenu()
        })
        onNotConnected()
        updateMenu()
    }
}