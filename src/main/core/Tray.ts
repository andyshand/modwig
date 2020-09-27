import { BESService, getService } from "./Service";
import { Tray, Menu, app, BrowserWindow } from 'electron'
import { getResourcePath } from "../../connector/shared/ResourcePath";
import { url } from "./Url";
import { interceptPacket, sendPacketToBitwig } from "./WebsocketToSocket";
import { promises as fs } from 'fs'
const { Bitwig } = require('bindings')('bes')

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
    settingsService = getService('SettingsService')

    async copyControllerScript() {
        try {
            const path = require('path')
            const homedir = require('os').homedir();

            const controllerSrcFolder = getResourcePath('/controller-script')
            const controllerDestFolder = path.join(homedir, 'Documents', 'Bitwig Studio', 'Controller Scripts', 'Bitwig Enhancement Suite')

            const stats = await fs.stat(controllerDestFolder)
            if (!stats.isDirectory()) {
                await fs.mkdir(controllerDestFolder)
            }
            for (const file of await fs.readdir(controllerSrcFolder)) {
                await fs.copyFile(path.join(controllerSrcFolder, file), path.join(controllerDestFolder, file))
            }
        } catch (e) {
            console.error(e)   
        }
    }

    async activate() {
        const socket = getService('SocketMiddlemanService')
        const tray = new Tray(getResourcePath('/images/tray-0Template.png'))
        
        await this.settingsService.insertSettingIfNotExist({
            key: 'setupComplete',
            value: false,
            category: 'internal',
            type: 'boolean'
        })
        const isSetupComplete = async () => await this.settingsService.getSettingValue('setupComplete')

        const openWindow = async ({type}) => {
            const loadUrl = url(`/#/${type}`)
            if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
                this.settingsWindow.close()
            }
            this.settingsWindow = new BrowserWindow({ 
                width: type === 'setup' ? 900 : SETTINGS_WINDOW_WIDTH, 
                height: type === 'setup' ? 650 : SETTINGS_WINDOW_HEIGHT, 
                show: false,
                resizable: type === settings,
                titleBarStyle: 'hiddenInset',
                webPreferences: {
                    webSecurity: false,
                    nodeIntegration: true,
                }
            })
            this.settingsWindow.loadURL(loadUrl)
            this.settingsWindow.show()
            app.dock.show()
            this.settingsWindow.once('close', () => {
                app.dock.hide()
            })
        }
        if (process.env.NODE_ENV !== 'dev') {
            this.copyControllerScript()
            app.dock.hide()
        } else {
            // openWindow({type: 'settings'})
            // this.settingsWindow.toggleDevTools()
        }

        const updateMenu = async () => {
            const contextMenu = Menu.buildFromTemplate([
              { label: `Bitwig Enhancement Suite: ${this.connected ? 'Connected' : 'Connecting...'}`, enabled: false },
              ...(Bitwig.isAccessibilityEnabled(false) ? [] : [
                { label: 'Enable Accessibility', click: () => {
                    Bitwig.isAccessibilityEnabled(true)
                } },
              ]),
              { type: 'separator' },
              { label: 'Exclusive Arm', checked: settings.exclusiveArm, type: "checkbox", click: () => {
                settings.exclusiveArm = !settings.exclusiveArm
                sendPacketToBitwig({
                    type: 'settings/update',
                    data: settings
                })
            } },
            { type: 'separator' },
              { label: 'Preferences...', click: () => openWindow({type: 'settings'}) },
              { label: 'Setup...', click: () => openWindow({type: 'setup'}) },
            { type: 'separator' },
              { label: 'Quit', click: () => {
                app.quit();
              } }
            ])
            tray.setContextMenu(contextMenu)
        }
        const imageOrWarning = str => {
            if (!Bitwig.isAccessibilityEnabled(false)) {
                return getResourcePath(`/images/tray-warningTemplate.png`)
            }
            return str
        }
        const onNotConnected = () => {
            if (this.timer) {
                clearInterval(this.timer)
            }
            this.timer = setInterval(() => {
                tray.setImage(imageOrWarning(getResourcePath(`/images/tray-${this.animationI % 6}Template.png`)))    
                this.animationI++
            }, 250)
        }
        socket.events.connected.listen(isConnected => {
            this.connected = isConnected
            if (isConnected && this.timer) {
                clearInterval(this.timer)
                tray.setImage(imageOrWarning(getResourcePath(`/images/tray-0Template.png`)))
            } else {
                onNotConnected()
            }
            updateMenu()
        })
        onNotConnected()
        updateMenu()

        const setupComplete = await isSetupComplete()
        if (!setupComplete) {
            openWindow({type: 'setup'})
        }

        interceptPacket('api/setup/finish', async () => {
            await this.settingsService.setSettingValue('setupComplete', true)
        })
        interceptPacket('api/setup/accessibility', async () => {
            Bitwig.isAccessibilityEnabled(true)
        })
    }
}