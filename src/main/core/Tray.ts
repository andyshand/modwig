import { BESService, getService } from "./Service";
import { Tray, Menu, app, BrowserWindow } from 'electron'
import { getResourcePath } from "../../connector/shared/ResourcePath";
import { url } from "./Url";
import { interceptPacket, SocketMiddlemanService } from "./WebsocketToSocket";
import { SettingsService } from "./SettingsService";
import { ModsService } from "../mods/ModsService";
import { ShortcutsService } from "../shortcuts/Shortcuts";
const { Bitwig } = require('bindings')('bes')

export class TrayService extends BESService {
    timer: any
    animationI = 0
    connected = false
    settingsWindow
    settingsService = getService<SettingsService>('SettingsService')
    socket = getService<SocketMiddlemanService>('SocketMiddlemanService')
    modsService = getService<ModsService>('ModsService')
    shortcutsService = getService<ShortcutsService>('ShortcutsService')

    async activate() {
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
                width: 900, 
                height: 650, 
                show: false,
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
        
        const updateMenu = async () => {
            const modItems: Electron.MenuItemConstructorOptions[] = (await this.modsService.getModsWithInfo({inMenu: true})).map(modSetting => {
                return {
                    label: modSetting.name,
                    checked: modSetting.value.enabled,
                    type: 'checkbox',
                    click: () => {
                        this.settingsService.setSettingValue(modSetting.key, {
                            ...modSetting.value,
                            enabled: !modSetting.value.enabled
                        })
                    }
                }
            })
            const contextMenu = Menu.buildFromTemplate([
              { label: `Modwig: ${this.connected ? 'Connected' : 'Connecting...'}`, enabled: false },
              { label: `Report an Issue...`, click: () => {
                require('electron').shell.openExternal(`https://github.com/andyshand/modwig/issues/new`);
              } },
              ...(Bitwig.isAccessibilityEnabled(false) ? [] : [
                { label: 'Enable Accessibility', click: () => {
                    Bitwig.isAccessibilityEnabled(true)
                } },
              ]),
              ...(modItems.length ? [
                  { type: 'separator' },
                  ...modItems
              ] : []) as any,
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
            // if (this.timer) {
            //     clearInterval(this.timer)
            // }
            // this.timer = setInterval(() => {
            //     tray.setImage(imageOrWarning(getResourcePath(`/images/tray-${this.animationI % 6}Template.png`)))    
            //     this.animationI++
            // }, 250)
        }
        this.socket.events.connected.listen(isConnected => {
            this.connected = isConnected
            if (isConnected && this.timer) {
                // clearInterval(this.timer)
                tray.setImage(imageOrWarning(getResourcePath(`/images/tray-0Template.png`)))
            } else {
                onNotConnected()
            }
            updateMenu()
        })
        onNotConnected()
        updateMenu()

        const setupComplete = await isSetupComplete()
        const isDev = process.env.NODE_ENV === 'dev'
        if (!setupComplete) {
            openWindow({type: 'setup'})
        } else {
            if (process.argv.indexOf('--preferences') >= 0 || (isDev && !process.env.QUIET_START)) {
                openWindow({type: 'settings'})
                if (isDev) {
                    this.settingsWindow.toggleDevTools()
                } 
            } else {
                app.dock.hide()
            }
        }        

        this.shortcutsService.registerAction({
            title: "Open Modwig Preferences",
            id: "openPreferences",
            category: 'global',
            action: () => {
                openWindow({type: 'settings'})
            },
            defaultSetting: {
                keys: ["Meta", "Shift", ","]
            }
        })

        interceptPacket('api/setup/finish', async () => {
            await this.settingsService.setSettingValue('setupComplete', true)
        })
        interceptPacket('api/setup/accessibility', async () => {
            Bitwig.isAccessibilityEnabled(true)
        })
        this.settingsService.events.settingsUpdated.listen(() => updateMenu())
        this.modsService.events.modsReloaded.listen(() => updateMenu())
    }
}