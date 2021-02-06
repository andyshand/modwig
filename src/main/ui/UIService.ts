import { interceptPacket } from "../core/WebsocketToSocket"
import { BESService, EventRouter, getService, makeEvent } from "../core/Service"
import { SettingsService } from "../core/SettingsService"
import { ShortcutsService } from "../shortcuts/Shortcuts"
import _ from 'underscore'
import { BitwigService } from "../bitwig/BitwigService"
import { wait } from "../../connector/shared/engine/Debounce"
import { returnMouseAfter } from "../../connector/shared/EventUtils"

const { Keyboard, Bitwig, UI, Mouse: _Mouse, MainWindow } = require('bindings')('bes')

/**
 * UI Service is basically responsible for keeping an up to date (insofar as possbile) representation of the Bitwig UI.
 * e.g. currently active tool, whether they are entering a value. Some of this stuff still remains in the mod service but we will
 * gradually move things over to here when it makes sense.
 */
export class UIService extends BESService {

    // Other services
    settingsService = getService<SettingsService>('SettingsService')
    shortcutsService = getService<ShortcutsService>("ShortcutsService")
    bitwigService = getService<BitwigService>("BitwigService")

    // Internal state
    activeTool = 0
    previousTool = 0
    activeToolKeyDownAt = new Date()
    uiMainWindow = new UI.BitwigWindow({})
    uiScale = 1
    apiEventRouter = new EventRouter<any>()
    idsByEventType: {[type: string] : number} = {}
    modalWasOpen = false
    Mouse

    // Events
    events = {       
        toolChanged: makeEvent<number>()
    }


    addExtras() {
        const uiService = this
        this.Mouse = {
            click: async (...args) => {
                const button = args[0]
                const opts = args[args.length - 1] || {}
                const doIt = async () => {
                    const reallyDoIt = async () => {
                        let ret
                        if (typeof button !== 'number') {
                            ret = _Mouse.click(0, ...args)
                        } else {
                            ret = _Mouse.click(...args)
                        }
                        if (typeof opts.returnAfter === 'number') {
                            await wait(opts.returnAfter)
                        }
                        return ret
                    }
                    if (opts.returnAfter) {
                        return returnMouseAfter(reallyDoIt)
                    } else {
                        return reallyDoIt()
                    }
                }
                if (opts.avoidPluginWindows) {
                    return this.Mouse.avoidingPluginWindows(opts, doIt)
                } else {
                    return doIt()
                }
            },
            on: (event, cb) => {
                const id = this.apiEventRouter.on(event, cb)
                if (!this.idsByEventType[event]) {
                    const id = Keyboard.on(event, (...args) => {
                        this.apiEventRouter.emit(event, ...args)
                    })
                    // this.log(`Id for ${event} is ${id}`)
                    this.idsByEventType[event] = id
                }
                return () => {
                    this.Mouse.off(event, id)
                }
            },
            off: (event, id) => {
                this.apiEventRouter.off(event, id)
            },
            avoidingPluginWindows: async (pointOpts, cb) => {
                if (!this.eventIntersectsPluginWindows(pointOpts)) {
                    return Promise.resolve(cb())
                }
                const pluginPositions = Bitwig.getPluginWindowsPosition()
                const displayDimensions = MainWindow.getMainScreen()
                let tempPositions = {}
                for (const key in pluginPositions) {
                    tempPositions[key] = {
                        ...pluginPositions[key],
                        x: displayDimensions.w - 1,
                        y: displayDimensions.h - 1,
                    }
                }
                Bitwig.setPluginWindowsPosition(tempPositions)
                return new Promise<void>(res => {
                    setTimeout(async () => {
                        const result = cb()
                        if (result && result.then) {
                            await result
                        }
                        if (!pointOpts.noReposition) {
                            Bitwig.setPluginWindowsPosition(pluginPositions)
                        }
                        res()
                    }, 100)
                })
            }    
        }

        const proto = this.uiMainWindow
        const ArrangerTrack = {
            async selectWithMouse() {
                const opts = {
                    x: (this.rect.x + this.rect.w) - uiService.scale(7),
                    y: this.visibleRect.y + uiService.scale(7),
                    avoidPluginWindows: true,
                    returnAfter: true
                }
                uiService.log(opts)
                return uiService.Mouse.click(opts)
            },
            async toggleExpandedWithMouse() {
                const folderIconWidth = uiService.scale(18)
                // Click a few from the left hand side in increments of the folder icon width
                // so we only hit it once. Quicker than working out where it is
                const startPos = _Mouse.getPosition()
                const opts = {
                    y: this.visibleRect.y + uiService.scale(this.isLargeTrackHeight ? 32 : 14),
                    avoidPluginWindows: true
                }
                for (let i = 0; i < 5; i++) {
                    const x = this.visibleRect.x + uiService.scale(10) + i * folderIconWidth
                    uiService.Mouse.click({
                        ...opts,
                        x
                    })
                }
                _Mouse.setPosition(startPos.x, startPos.y)
            }
        }
        proto.getArrangerTracks = (...args) => {
            const results = proto._getArrangerTracks(...args)
            return results ? results.map(obj => Object.setPrototypeOf(obj, ArrangerTrack)) : null
        }
    }

    getApi({ makeEmitterEvents, onReloadMods }) {
        const that = this

        const MouseEvent = {
            intersectsPluginWindows() {
                return that.eventIntersectsPluginWindows(this)
            },
            noModifiers() {
                return !(this.Meta || this.Control || this.Alt || this.Shift)
            }
        }

        const api = {
            Mouse: {
                ..._Mouse,
                ...this.Mouse,
                _on: (event, cb) => {
                    const removeListener = this.Mouse.on(event, cb)
                    onReloadMods(() => {
                        this.log('Should be removing listener')
                        removeListener()
                    })
                    return removeListener
                },
                on: (eventName: string, cb: Function) => {
                    const wrappedCb = async (event, ...rest) => {
                        // this.eventLogger({msg: eventName, modId: mod.id})
                        Object.setPrototypeOf(event, MouseEvent)
                        cb(event, ...rest)
                    }
                    if (eventName === 'click') {
                        let downEvent, downTime
                        api.Mouse._on('mousedown', (event) => {
                            downTime = new Date()
                            downEvent = JSON.stringify(event)
                        })
                        api.Mouse._on('mouseup', (event, ...rest) => {
                            if (JSON.stringify(event) === downEvent && downTime && new Date().getTime() - downTime.getTime() < 250) {
                                wrappedCb(event, ...rest)
                            }
                        })
                    } else if (eventName === 'doubleClick') {
                        let lastClickTime = new Date(0)
                        api.Mouse._on('click', (event, ...rest) => {
                            if (new Date().getTime() - lastClickTime.getTime() < 250) {
                                wrappedCb(event, ...rest)
                                lastClickTime = new Date(0)
                            } else {
                                lastClickTime = new Date()
                            }
                        })
                    } else {
                        api.Mouse._on(eventName, wrappedCb)
                    }
                },
                lockX: Keyboard.lockX,
                lockY: Keyboard.lockY,
                returnAfter: returnMouseAfter   
            },
            UI: {
                ...UI,
                MainWindow: this.uiMainWindow,
                get activeTool() {
                    return that.activeTool
                },
                ...makeEmitterEvents({
                    activeToolChanged: this.events.toolChanged
                }),
                scaleXY: (args) => this.scaleXY(args),
                scale: (point) => this.scaleXY({x: point, y: 0}).x,
                unScaleXY: (args) => this.unScaleXY(args),
                unScale: (point) => this.unScaleXY({x: point, y: 0}).x,
                bwToScreen: (args) => this.bwToScreen(args),
                screenToBw: (args) => this.screenToBw(args),
                get doubleClickInterval() {
                    return 250
                }
            }
        }
        return api
    }

    checkIfModalOpen() {
        if (process.env.SCREENSHOTS !== 'true') {
            return
        }

        UI.invalidateLayout()
        const layout = this.uiMainWindow.getLayoutState()

        // FIXME because of lack of explicit ordering of event listeners between services,
        // the ShortcutsService will receive one round of inputs that correspond to an invalid UI
        // state if the modal is triggered by keyboard shortcuts.
        if (layout.modalOpen && !this.modalWasOpen) {
            this.log('Modal is open, pausing shortcuts')
            this.shortcutsService.pause()
            this.modalWasOpen = true
        } else if (!layout.modalOpen && this.modalWasOpen) {
            this.log('Modal closed, unpausing shortcuts')
            this.shortcutsService.unpause()
            this.modalWasOpen = false
        }
    }

    async activate() {
        // Track tool changes via number keys
        Keyboard.on('keydown', event => {
            const asNumber = parseInt(event.lowerKey, 10)
            if (asNumber !== this.activeTool && !(event.Meta || event.Shift || event.Control || event.Alt) && asNumber > 0 && asNumber < 6)  {
                this.previousTool = this.activeTool
                this.activeTool = asNumber
                this.activeToolKeyDownAt = new Date()
                this.events.toolChanged.emit(this.activeTool)
            }
        })
        
        Keyboard.on('keyup', event => {
            UI.invalidateLayout()

            const asNumber = parseInt(event.lowerKey, 10)
            if (asNumber === this.activeTool && new Date().getTime() - this.activeToolKeyDownAt.getTime() > 250)  {
                this.activeTool = this.previousTool
                this.activeToolKeyDownAt = new Date(0)
                this.events.toolChanged.emit(this.activeTool)
            }

            this.checkIfModalOpen()
        })

        this.settingsService.onSettingValueChange('uiScale', val => {
            this.uiScale = parseInt(val, 10) / 100
            UI.updateUILayoutInfo({scale: parseInt(val, 10) / 100})
            this.log(`Ui scale set to ${this.uiScale}`)
        })

        interceptPacket('ui', undefined, (packet) => {
            this.log('Updating UI from packet: ', packet)
            UI.updateUILayoutInfo(packet.data)
        })

        this.addExtras()
        this.Mouse.on('mousedown', event => {
            if (event.button === 0) {
                this.apiEventRouter.muteEvent('mousedown')
            }
        })
        this.Mouse.on('mouseup', event => {
            if (event.button === 0) {
                this.apiEventRouter.unmuteEvent('mousedown')
            }
            // Layout could have always changed on mouse up
            UI.invalidateLayout()

            // Attempt to track when user is entering a text field
            // FIXME for scaling
            if (Bitwig.isActiveApplication() 
            && event.y > 1000 
            && event.Meta 
            && !event.Shift 
            && !event.Alt 
            && !event.Control 
            && !this.eventIntersectsPluginWindows(event) 
            && !this.bitwigService.browserIsOpen) {
                // Assume they are clicking to enter a value by keyboard
                this.shortcutsService.setEnteringValue(true)
            }
            
            this.checkIfModalOpen()
        })
    }

    eventIntersectsPluginWindows(event) {
        if ('_intersectsPluginWindows' in event) {
            return event._intersectsPluginWindows
        }
        const pluginLocations = Bitwig.getPluginWindowsPosition()
        for (const key in pluginLocations) {
            const {x, y, w, h, ...rest} = pluginLocations[key]
            if (event.x >= x && event.x < x + w && event.y >= y && event.y < y + h) {
                let out = {
                    id: key,
                    x,
                    y,
                    w,
                    h,
                    ...rest
                }
                event._intersectsPluginWindows = out
                return out
            }
        }
        event._intersectsPluginWindows = false
        return false
    }

    bwToScreen({ x, y, ...rest }) {
        const frame = this.uiMainWindow.getFrame()
        const scaled = this.scaleXY({ x, y })
        return {
            x: scaled.x + frame.x,
            y: scaled.y + frame.y,
            ...rest
        }
    }

    screenToBw({ x, y, ...rest }) {
        const frame = this.uiMainWindow.getFrame()
        const bwRelative = {
            x: x - frame.x,
            y: y - frame.y,
            ...rest
        }
        return this.unScaleXY(bwRelative)
    }

    scaleXY({ x, y, ...rest }) {
        return {
            x: x * this.uiScale,
            y: y * this.uiScale,
            ...rest
        }
    }

    scale = point => this.scaleXY({x: point, y: 0}).x
    unscale = point => this.unScaleXY({x: point, y: 0}).x

    unScaleXY({ x, y, ...rest }) {
        return {
            x: x / this.uiScale,
            y: y / this.uiScale,
            ...rest
        }
    }
}
