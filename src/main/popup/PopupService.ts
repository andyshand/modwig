import { addAPIMethod } from "../core/WebsocketToSocket"
import { BESService, getService } from "../core/Service"
import { SettingsService } from "../core/SettingsService"
import { ShortcutsService } from "../shortcuts/Shortcuts"
import _ from 'underscore'
import { containsPoint } from '../../connector/shared/Rect'
import { BitwigService } from "../bitwig/BitwigService"
import { BrowserWindow } from "electron"
import { logWithTime } from "../core/Log"
import { url } from "../core/Url"
import { UIService } from "../ui/UIService"
const colors = require('colors');
const { Keyboard, Bitwig, UI, Mouse, MainWindow } = require('bindings')('bes')
let nextId = 0

interface PopupSpec {

    /**
     * Unique id for this popup. When opening a popup with the same id as one already existing, 
     * it will be replaced. Otherwise, a new popup will be created
     */
    id: string,
    component: String,
    props: any
    rect: {x: number, y: number, w: number, h: number}
    onReceivedData?: Function

    /**
     * Defaults to false, whether the popup should stay onscreen 
     * even when "closeAll" methods are called
     */
    persistent?: boolean

    /**
     * Defaults to false, whether the popup should be clickable
     */
    clickable?: boolean

    /**
     * Defaults to 3000, only releveant for non-clickable popups
     */
    timeout?: number
}

interface OpenPopup {
    popup: PopupSpec,
    openedAt: Date,
    closeTimeout?: any
    clickedAt?: Date
}

// Popup opened for a specific period of time
// While open, we can hover over to keep it open
// Clicking opens a static, interactable version on the ClickableCanvas rather than standard canvas
export class PopupService extends BESService {

    // Other services
    settingsService = getService<SettingsService>('SettingsService')

    // Internal state
    currentPopups: {[id: string] : OpenPopup} = {

    }
    mouseListenerRemoveCbs: Function[] = []
    canvas = this.openWindow({focusable: false, path: '/canvas'})
    clickableCanvas = this.openWindow({focusable: true, path: '/clickable-canvas'})

    // Events
    events = {       
        
    }
    
    openWindow({focusable, path}) {
        const window = new BrowserWindow({ 
            width:  MainWindow.getMainScreen().w, 
            height: MainWindow.getMainScreen().h, 
            frame: false,
            hasShadow: false,
            show: !focusable,
            alwaysOnTop: true,
            focusable: focusable,
            closable: false,
            x: 0,
            y: 0,
            transparent: true,
            fullscreenable: false,
            webPreferences: {
                enableRemoteModule: true,
                webSecurity: false,
                nodeIntegration: true
            }
        })
        if (!focusable) {
            window.setIgnoreMouseEvents(true);
        }
        window.loadURL(url(`/#/loading`))
        // ;(floatingWindowInfo!.window as any).toggleDevTools()    
        
        return {
            sendProps: props => {
                this.log(`Sending props to ${focusable ? 'clickable canvas' : 'canvas'}:`, props)
                window.webContents.executeJavaScript(`
                    window.tryLoadURL = (tries = 0) => {
                        const path = \`${path}\`
                        window.data = ${JSON.stringify(props)}
                        if (window.didUpdateState && window.didUpdateState(path)) {
                            return 'updatedState'
                        } else if (window.loadURL) {
                            window.loadURL(path)
                            return 'loadedUrl'
                        } else if (tries < 10) {
                            setTimeout(() => tryLoadURL(tries + 1), 100)
                            return 'trying again'
                        } else {
                            console.error(\`Couldn't find loadURL on window, something went wrong\`)
                            return 'no loadURL'
                        }
                    }
                    tryLoadURL()
                `).then((propExecuteResult) => {
                    this.log(propExecuteResult)
                }).catch(e => {
                    logWithTime(colors.red(e))
                })
            },
            window
        }
    }

    refreshPopups() {
        const mapPopupToRenderer = p => {
            return p.popup
        }

        // Inert popups
        const inert = Object.values(this.currentPopups).filter(p => {
            return !p.clickedAt
        }).map(mapPopupToRenderer)
        this.canvas.sendProps({
            popups: inert
        })
        // We always want to show the inert canvas because its used for other stuff than just popups e.g. notifications
        this.canvas.window.showInactive()
        
        // Clickable popups
        const clickable = Object.values(this.currentPopups).filter(p => {
            return p.clickedAt
        }).map(mapPopupToRenderer)
        this.clickableCanvas.sendProps({
            popups: clickable
        })
        if (clickable.length === 0) {
            this.clickableCanvas.window.hide()
        } else {
            this.clickableCanvas.window.show()
        }
    }

    showMessage = (msg, { timeout } = { timeout: 5000 }) => {
        this.canvas.sendProps({
            notifications: [
                {
                    content: msg,
                    id: nextId++,
                    timeout,
                    date: new Date().getTime()
                }   
            ]
        })
    }

    showNotification = (notification) => {
        this.canvas.sendProps({
            notifications: [
                {
                    id: nextId++,
                    timeout: notification.timeout ?? 3000,
                    date: new Date().getTime(),
                    ...notification,
                }   
                
            
            ]
        })
    }
    
    updateCanvas = (state) => {
        this.canvas.sendProps(state)
    }

    /**
     * Since tracking mouse moves can be quite expensive, we remove our listeners whenever
     * any popups aren't open
     */
    addMouseListeners() {
        this.log('Adding mouse listeners')
        const checkIntersection = event => {
            const { window } = this.clickableCanvas
            if (!window.isFocused()) {
                // Check if we intersect any open popups
                for (const id in this.currentPopups) {
                    const { clickedAt, popup } = this.currentPopups[id]
                    if (!clickedAt && popup.clickable) {
                        this.log(popup.rect, event)
                        if (containsPoint(popup.rect, event)) {
                            this.log('Switching popup over to clicked:', popup)
                            this.currentPopups[id].clickedAt = new Date()
                            clearTimeout(this.currentPopups[id].closeTimeout)
                            window.show()
                            this.refreshPopups()
                            return
                        } else {
                            this.log('Popup did not contain point')
                        }
                    }
                }
            }
        }
        const intersectsAnything = (event) => {
            for (const id in this.currentPopups) {
                const { popup } = this.currentPopups[id]
                if (!popup.clickable && containsPoint(popup.rect, event)) {
                   return true
                }
            }
            return false
        }
        const uiSevice = getService<UIService>("UIService")
        // this.mouseListenerRemoveCbs.push(uiSevice.Mouse.on('mousemove', (_ as any).throttle(event => {
        //     // Mouse move
        //     if (intersectsAnything(event)) {
        //         this.canvas.window.setOpacity(.5)
        //     } else {
        //         this.canvas.window.setOpacity(1)
        //     }
        // }, 100)))
        this.mouseListenerRemoveCbs.push(uiSevice.Mouse.on('mouseup', event => {
            // Mouse up
            if (event.button === 0) {
                checkIntersection(event)
            }
        }))
    }

    removeMouseListeners() {
        // this.log('Removing mouse listeners')
        // for (const cb of this.mouseListenerRemoveCbs) {
        //     cb()
        // }
        // this.mouseListenerRemoveCbs = []
    }

    openPopup = (popup: PopupSpec) => {
        const wasIn = popup.id in this.currentPopups
        const prevData = this.currentPopups[popup.id]
        const data: OpenPopup = prevData || {
            popup,
            openedAt: new Date()
        }
        data.popup = popup
        this.currentPopups[popup.id] = data
        this.refreshPopups()
        if (!wasIn && this.mouseListenerRemoveCbs.length === 0) {
            this.addMouseListeners()
        }
        if (typeof popup.timeout === 'number' && !data.clickedAt) {
            if (data.closeTimeout) {
                this.log('Clearing timeout')
                clearTimeout(data.closeTimeout)
            }
            this.log('Setting timeout')
            data.closeTimeout = setTimeout(() => {
                this.closePopup(popup.id)
            }, popup.timeout)
        }
    }

    closePopup = (id: string, noRefresh = false) => {
        if (!(id in this.currentPopups)) {
            // this.log(`Tried to close popup that didn't exist (id: ${id})`)
            return
        }
        const data = this.currentPopups[id]
        if (data.closeTimeout) {
            clearTimeout(data.closeTimeout)
        }
        delete this.currentPopups[id]
        if (!noRefresh) {
            this.refreshPopups()
            if (Object.keys(this.currentPopups).length === 0 && this.mouseListenerRemoveCbs.length > 0) {
                this.removeMouseListeners()
            }
        }
    }

    closeAllPopups = () => {
        for (const id in this.currentPopups) {
            const popupInfo = this.currentPopups[id]
            if (!popupInfo.popup.persistent) {
                this.closePopup(id, true)
            }
        }
        this.refreshPopups()
        Bitwig.makeMainWindowActive();
    }

    getApi({ makeEmitterEvents, onReloadMods }) {
        const maybeStillOpenForMod: any[] = []
        const api = {
            Popup: {
                openPopup: (popup: PopupSpec) => {
                    const id = popup.id
                    maybeStillOpenForMod.push(id)
                    this.openPopup(popup)
                    onReloadMods(() => {
                        if (id in this.currentPopups) {
                            this.closePopup(id)
                        }
                    })
                }, 
                closePopup: this.closePopup,
                closeAll: () => {
                    for (const id of maybeStillOpenForMod) {
                        this.closePopup(id)
                    }
                }
            }
        }
        return api
    }

    ensureCanvasShown() {

    }

    async activate() {
        addAPIMethod('api/popups/data', async data => {
            this.log('Got popup data:', data)
            if (data.popupId in this.currentPopups) {
                const popup = this.currentPopups[data.popupId]
                if (typeof popup.popup.onReceivedData === 'function') {
                    popup.popup.onReceivedData(data)
                }
            }
        })
        addAPIMethod('api/popups/close-all', async data => {
            this.closeAllPopups()
        })
    }

    async postActivate() {
        const uiService = getService<UIService>("UIService")
        uiService.Mouse.on('keyup', event => {
            if (Bitwig.isActiveApplication() || Bitwig.isActiveApplication("Electron") || Bitwig.isActiveApplication("Modwig")) {
                if (event.lowerKey === 'Escape') {
                    this.closeAllPopups()
                }
                this.canvas.window.showInactive()
            }
        })
        uiService.Mouse.on('mouseup', event => {
            if (Bitwig.isActiveApplication()) {
                this.canvas.window.showInactive()
            }
        })
    }
}
