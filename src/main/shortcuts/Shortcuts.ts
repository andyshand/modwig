import { sendPacketToBitwig, interceptPacket, addAPIMethod, sendPacketToBitwigPromise } from "../core/WebsocketToSocket"
import { BESService, getService, makeEvent } from "../core/Service"
import { getDb } from "../db"
import { Setting } from "../db/entities/Setting"
import { BrowserWindow } from "electron"
import { url } from "../core/Url"
import { SettingsService } from "../core/SettingsService"
import { ModsService } from "../mods/ModsService"
import { returnMouseAfter, whenActiveListener } from "../../connector/shared/EventUtils"
const colors = require('colors')

const { Keyboard, Mouse, MainWindow, Bitwig } = require('bindings')('bes')

let lastKeyPressed = new Date()
let lastKey = ''

const MODS_MESSAGE = `Modulators are currently inaccessible from the controller API. This shortcut is also limited to a single device at any time.`
const MODS_MESSAGE_2 = `Modulators are currently inaccessible from the controller API.`
const PROXY_MESSAGE = key => `Proxy key for the "${key}" key for convenient remapping.`

export interface TempActionSpec {
    defaultSetting: {
        keys: String[],
        doubleTap?: boolean
    },
    isTemp: true
    id: string
    title?: string
    action: Function
}
export interface ActionSpec {
    title: string
    id: string
    category: string

    /**
     * Any extra info to attach to the action that may
     * be helpful to event listeners etc
     */
    meta?: any
    
    action: Function
    
    defaultSetting?: {
        keys?: String[],
        doubleTap?: boolean
    }
    mod?: string
}   
type AnyActionSpec = ActionSpec | TempActionSpec

export class ShortcutsService extends BESService {
    browserIsOpen
    enteringValue = false
    browserText = ''
    actions = this.getActions()
    tempActions: {[id: string]: TempActionSpec} = {}
    shortcutCache: {[key: string]: {runner: Function, action?: AnyActionSpec}[]} = {}
    settingsService = getService<SettingsService>('SettingsService')
    searchWindow: BrowserWindow
    extraShortcuts: any[]
    events = {
        actionTriggered: makeEvent<AnyActionSpec>(),
    }
    uiScale: number = 1 // Cached from setting

    repeatActionWithRange(name, startIncl, endIncl, genTakesI) {
        let out = {}
        for (let i = startIncl; i <= endIncl; i++) {
            out[name + i] = {
                ...genTakesI(i)
            }
        }
        return out
    }

    bwToScreen({ x, y, ...rest }) {
        const frame = MainWindow.getFrame()
        const scaled = this.scaleXY({ x, y })
        return {
            x: scaled.x + frame.x,
            y: scaled.y + frame.y,
            ...rest
        }
    }

    screenToBw({ x, y, ...rest }) {
        const frame = MainWindow.getFrame()
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

    unScaleXY({ x, y, ...rest }) {
        return {
            x: x / this.uiScale,
            y: y / this.uiScale,
            ...rest
        }
    }

    makeShortcutValueCode = (value) => {
        return value.keys.sort().join('') + String(value.doubleTap || false) + String(value.fn || false)
    }

    async updateShortcutCache() {
        this.log('Updating shortcut cache')
        const db = await getDb()
        const settings = db.getRepository(Setting) 
        const results = await settings.find({where: {type: 'shortcut'}})

        this.shortcutCache = {}
        for (let shortcut of results) {
            shortcut = this.settingsService.postload(shortcut)
            if (shortcut.value.keys.length > 0) {
                const value = shortcut.value
                const key = shortcut.key
                const code = this.makeShortcutValueCode(value)
                // code is our ID, key is the action to run
                const runner = (context) => {
                    this.log('Running shortcut code: ' + code + ' with action key: ' + colors.yellow(key))
                    try {
                        // console.log(`Action data is: `, this.actions[key])
                        this.actions[key].action(context)
                    } catch (e) {
                        this.log(colors.red(e))
                    }
                }
                this.shortcutCache[code] = (this.shortcutCache[code] || []).concat({
                    runner,
                    action: this.actions[key]
                })
            }
        }        

        for (const tempActionId in this.tempActions) {
            const action = this.tempActions[tempActionId]
            const code = this.makeShortcutValueCode(action.defaultSetting)
            const runner = (context) => {
                this.log('Running temp shortcut code: ' + code + ' with action id: ' + colors.yellow(tempActionId))
                try {
                    // console.log(`Action data is: `, this.actions[key])
                    action.action(context)
                } catch (e) {
                    this.log(colors.red(e))
                }
            }
            this.shortcutCache[code] = (this.shortcutCache[code] || []).concat({
                runner,
                action
            })
        }        
        // this.log(this.shortcutCache)
    }

    actionsWithCategory(cat, actions) {
        Object.values(actions).forEach((action: any) => {
            action['category'] = cat
        })
        return actions
    }

    getActions() {
        return {
            // GLOBAL 
            ...(this.actionsWithCategory('global', {
                openTrackSearch: {
                    action: () => {
                        this.searchWindow.show()
                    }                
                },
                restoreAutomationControl: {
                    action: () => {
                        sendPacketToBitwig({type: 'action', data: 'restore_automation_control'})
                    } 
                },
                toggleRecord: {            
                    description: `This "Toggle Record" shortcut can optionally pass through VSTs, whereas the built-in shortcut cannot.`,
                    action: () => {
                        if (!this.browserIsOpen) {
                            sendPacketToBitwig({
                                type: 'action',
                                data: 'Toggle Record'
                            })
                        }
                    }                
                },
                goBack: {
                    description: 'Go back to the previous track in the selection history.',
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        sendPacketToBitwig({type: 'tracknavigation/back'})
                    }
                },
                goForward: {
                    description: 'Go forward to the next track in the selection history.',
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        sendPacketToBitwig({type: 'tracknavigation/forward'})
                    }
                },
                selectPreviousTrack: {
                    defaultSetting: {
                        keys: ['W']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Select previous track'
                        })
                    }                
                },
                selectNextTrack: {
                    defaultSetting: {
                        keys: ['S']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Select next track'
                        })
                    }                
                },
                enter: {
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('Enter', { modwigListeners: true })
                    }                
                },
                arrowUp: {
                    description: PROXY_MESSAGE('ArrowUp'),
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowUp')
                    }                
                },
                arrowDown: {
                    description: PROXY_MESSAGE('ArrowDown'),
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowDown')
                    }                
                },
                arrowLeft: {
                    description: PROXY_MESSAGE('ArrowLeft'),
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowLeft')
                    }                
                },
                arrowRight: {
                    description: PROXY_MESSAGE('ArrowRight'),
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowRight')
                    }                
                },

                // TODO better way of proxying keys allowing modifiers
                arrowUpShift: {
                    description: PROXY_MESSAGE('ArrowUp'),
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowUp', { Shift: true })
                    }                
                },
                arrowDownShift: {
                    description: PROXY_MESSAGE('ArrowDown'),
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowDown', { Shift: true })
                    }                
                },
                arrowLeftShift: {
                    description: PROXY_MESSAGE('ArrowLeft'),
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowLeft', { Shift: true })
                    }                
                },
                arrowRightShift: {
                    description: PROXY_MESSAGE('ArrowRight'),
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowRight', { Shift: true })
                    }                
                },
                enterGroup: {
                    description: 'Enters the currently selected group track',
                    defaultSetting: {
                        keys: ['Meta', 'Control', 'S']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'action',
                            data: [
                                `focus_track_header_area`,
                                `Enter Group`,
                                `select_track1`
                            ]
                        })
                    }
                },
                exitGroup: {
                    description: 'Exits the currently entered group track',
                    defaultSetting: {
                        keys: ['Meta', 'Control', 'W']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'action',
                            data: [
                                `focus_track_header_area`,
                                `Exit Group`,
                                `select_track1`
                            ]
                        })
                    }
                },
                focusArranger: {
                    description: 'Focuses the arranger panel',
                    action: () => {
                        // TODO can we get away with using the controller API for this in time for
                        // the next keypresses? Seems safer to use raw input but relies on
                        // having specific shortcuts set

                        Keyboard.keyPress('ArrowDown', {Control: true, Shift: true})
                        Keyboard.keyPress('ArrowLeft', {Control: true, Shift: true})
                        // Then move it back (because there is only "Toggle/Focus" not "Focus")
                        // If arranger is already active, it ends up showing the mixer...
                        Keyboard.keyPress('o', {Alt: true})
                    }
                }
            })),

            // DEVICES
            ...(this.actionsWithCategory('devices', {
                focusDevicePanel: {
                    description: "Just focus the device panel, rather than the toggle/focus behaviour built into Bitwig.",
                    defaultSetting: {
                        keys: ['D']
                    },
                    action: () => {
                        if (!this.browserIsOpen && !this.enteringValue) {
                            sendPacketToBitwig({
                                type: 'action',
                                data: [
                                    `focus_or_toggle_detail_editor`,
                                    `focus_or_toggle_device_panel`
                                ]
                            })
                        }
                    }
                },
                selectFirstDevice: {
                    description: `Select the first device for the currently selected device chain.`,
                    defaultSetting: {
                        keys: ['Meta', '§']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'devices/selected/layer/select-first'
                        })
                    }
                },
                selectFirstTrackDevice: {
                    description: `Select the first device for the currently selected track.`,
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'tracks/selected/devices/select-first'
                        })
                    }
                },
                selectLastDevice: {
                    description: `Select the last device for the currently selected device chain.`,
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'devices/selected/layer/select-last'
                        })
                    }
                },
                insertDeviceAtStart: {
                    defaultSetting: {
                        keys: ['Control', 'Q']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'devices/selected/chain/insert-at-start'
                        })
                    }
                },
                insertDeviceAtEnd: {
                    defaultSetting: {
                        keys: ['Control', 'E']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'devices/selected/chain/insert-at-end'
                        })
                    }
                },
                collapseSelectedDevice: {
                    description: `Close the main panel and remote controls page of the currently selected device. ${MODS_MESSAGE}`,
                    defaultSetting: {
                        keys: ['Meta', '[']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: `devices/selected/collapse`
                        })
                    },
                },
                expandSelectedDevice: {
                    description: `Expand the main panel of the selected device. ${MODS_MESSAGE}`,
                    defaultSetting: {
                        keys: ['Meta', ']']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: `devices/selected/expand`
                        })
                    },
                },
                collapseAllDevicesInChain: {
                    description: `Close the main panel and remote controls page of all devices in the currently selected chain. ${MODS_MESSAGE_2}`,
                    defaultSetting: {
                        keys: ['Meta', 'Shift', '[']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: `devices/chain/collapse`
                        })
                    },
                },
                expandAllDevicesInChain: {
                    description: `Expand the main panel of all devices in the currently selected chain. ${MODS_MESSAGE_2}`,
                    defaultSetting: {
                        keys: ['Meta', 'Shift', ']']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: `devices/chain/expand`
                        })
                    },
                },
                closeAllPluginWindows: {
                    defaultSetting: {
                        keys: ['Escape'],
                        doubleTap: true
                    },
                    action: () =>  Bitwig.closeFloatingWindows()
                },
                navigateToParentDevice: {
                    description: `Selects the parent device of the currently selected device.`,
                    defaultSetting: {
                        keys: ['Meta', 'Shift', 'W']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'devices/selected/navigate-up'
                        })
                    }
                },
                ...this.repeatActionWithRange('selectDeviceSlot', 1, 8, i => {
                    return {
                        description: `Focuses slot ${i} of the currently selected device. Press a second time on an empty slot to insert a device.`,
                        defaultSetting: {
                            keys: ["Meta", String(i)]
                        },
                        action: () => sendPacketToBitwig({
                            type: 'devices/selected/slot/select',
                            data: i - 1
                        })
                    }
                }),
                ...this.repeatActionWithRange('selectDeviceLayer', 1, 8, i => {
                    return {
                        description: `Focuses layer ${i} of the currently selected device. Press a second time on an empty layer to insert a device. If the selected device does not have layers, selection will occur on the parent device instead (recursing up to a maximum of 5 device levels).`,
                        defaultSetting: {
                            keys: ["Meta", "Shift", String(i)]
                        },
                        action: () => sendPacketToBitwig({
                            type: 'devices/selected/layers/select',
                            data: i - 1
                        }),
                    }
                }),
            })),

            // BROWSER
            ...(this.actionsWithCategory('browser', {
                openDeviceBrowser: {
                    defaultSetting: {
                        keys: ['B']
                    },
                    description: `Ensures the device panel is focused so the browser is more likely to open when you want it to.`,
                    action: () => {
                        if (!this.browserIsOpen) {
                            sendPacketToBitwig({
                                type: 'action',
                                data: [
                                    `focus_or_toggle_detail_editor`,
                                    `focus_or_toggle_device_panel`,
                                    `show_insert_popup_browser`,
                                    `Select All`
                                ]
                            })
                        }
                    }
                },

                clearBrowserFilters: {
                    defaultSetting: {
                        keys: ['Alt', '§']
                    },
                    description: `Resets all the filters in the currently open popup browser.`,
                    action: () => {
                        if (this.browserIsOpen) {
                            sendPacketToBitwig({
                                type: 'browser/filters/clear'
                            })
                        }
                    }
                },
                confirmBrowser: {
                    defaultSetting: {
                        keys: ['Enter']
                    },
                    description: `Confirms the current choice in the popup browser. If there is a search query and no selected item, the first result will be confirmed.`,
                    action: () => {
                        if (this.browserIsOpen) {
                            this.log(`Browser text is: ${this.browserText}`)
                            sendPacketToBitwig({
                                type: this.browserText.length > 0 ? 'browser/select-and-confirm' : 'browser/confirm'
                            })
                        }
                    }
                },
                previousBrowserTab: {
                    defaultSetting: {
                        keys: ['Control', 'ArrowLeft']
                    },
                    action: () => {
                        if (this.browserIsOpen) {
                            sendPacketToBitwig({
                                type: 'browser/tabs/previous'
                            })
                        }
                    }
                },
                nextBrowserTab: {
                    defaultSetting: {
                        keys: ['Control', 'ArrowRight']
                    },
                    action: () => {
                        if (this.browserIsOpen) {
                            sendPacketToBitwig({
                                type: 'browser/tabs/next'
                            })
                        }
                    }
                },
                ...this.repeatActionWithRange('selectBrowserTab', 1, 6, i => {
                    return {
                        defaultSetting: {
                            keys: ["Meta", String(i)]
                        },
                        action: () => {
                            if (this.browserIsOpen) {
                                sendPacketToBitwig({
                                    type: 'browser/tabs/set',
                                    data: i - 1
                                })
                            }
                        },
                    }
                }),
            })),

            // ARRANGER
            ...(this.actionsWithCategory('arranger', {
                toggleLargeTrackHeight: {
                    description: `Toggles large track height, ensuring the arranger is focused first so the shortcut works when expected.`,
                    defaultSetting: {
                        keys: ['Shift', 'C']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'action',
                            data: [
                                'focus_track_header_area',
                                'toggle_double_or_single_row_track_height'
                            ]
                        })
                    }
                },
                ...this.repeatActionWithRange('launchArrangerCueMarker', 1, 9, i => {
                    return {
                        defaultSetting: {
                            keys: ["Meta", String(i)]
                        },
                        action: () => {
                            if (!this.browserIsOpen) {
                                sendPacketToBitwig({
                                    type: 'action',
                                    data: [
                                        `launch_arranger_cue_marker${i}`
                                    ]
                                })
                            }
                        }
                    }
                }),
                focusTrackHeaderArea: {
                    defaultSetting: {
                        keys: ['T']
                    },
                    action: () => {
                        sendPacketToBitwig({type: 'action', data: 'focus_track_header_area'})
                        Bitwig.makeMainWindowActive()
                    } 
                },
                scrollSelectedTrackInView: {
                    defaultSetting: {
                        keys: ['T'],
                        doubleTap: true
                    },
                    action: () => {
                        sendPacketToBitwig({type: 'track/selected/scroll'})
                    } 
                },
                setAutomationValue: {
                    defaultSetting: {
                        keys: ['NumpadEnter']
                    },
                    description: 'Focuses the automation value field in the inspector for quickly setting value of selected automation.',
                    action: () => {
                        if (!this.browserIsOpen && !this.enteringValue) {
                            this.runAction('focusArranger')
                            returnMouseAfter(() => {
                                Mouse.click(0, this.bwToScreen({
                                    x: 140,
                                    y: 140,
                                    Meta: true
                                }))
                            })
                            this.enteringValue = true
                        }
                    }
                },
                setAutomationPosition: {
                    defaultSetting: {
                        keys: ['Control', 'NumpadEnter']
                    },
                    description: 'Focuses the automation position field in the inspector for quickly setting position of selected automation.',
                    action: () => {
                        if (!this.browserIsOpen && !this.enteringValue) {
                            this.runAction('focusArranger')
                            returnMouseAfter(() => {
                                Mouse.click(0, this.bwToScreen({
                                    x: 140,
                                    y: 120,
                                    Meta: true
                                }))
                            })
                            this.enteringValue = true
                        }
                    }
                },
                locatePlayhead: {
                    defaultSetting: {
                        keys: ['F']
                    },
                    description: 'Scrolls the arranger to the currently playing position',
                    action: () => {
                        sendPacketToBitwig({
                            type: 'action',
                            data: [
                                'toggle_playhead_follow'
                            ]
                        })
                        setTimeout(() => {
                            sendPacketToBitwig({
                                type: 'action',
                                data: [
                                    'toggle_playhead_follow'
                                ]
                            })
                        }, 100)
                    }
                }
            })),

            // MISC
            ...(this.actionsWithCategory('misc', {
                fixBuzzing: {
                    description: `Solos each track one-by-one to try and eliminate any buzzing noises that have somehow accumulated.`,
                    defaultSetting: {
                        keys: ['F6']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'bugfix/buzzing'
                        })
                    }
                }
            })),
        }
    }

    normalise(label) {
        return label.replace(/[\s]+/g, '-').toLowerCase()
    }

    async seedSettings() {
        const actions = this.actions
        for (const actionKey in actions) {
            const action = actions[actionKey]
            this.registerAction({
                ...action,
                id: actionKey
            }, true)
        }

        await this.updateShortcutCache()
    }

    async runAction(id, ...args) {
        const action = this.actions[id]
        if (action) {
            this.log('Running action: ' + id)
            return action.action(...args)
        }
    }

    async registerAction(action: ActionSpec | TempActionSpec, skipUpdate = false) {
        if ('isTemp' in action) {
            this.log(`Registering temporary action: ${colors.magenta(action.id)}`)
            this.tempActions[action.id] = action
            if (!skipUpdate) {
                this.log('Not skipping')
                await this.updateShortcutCache()
            }
            return
        }

        const value = action.defaultSetting || {keys: []}
        if (process.env.NODE_ENV !== 'dev') {
            delete value.keys
        }
        await this.settingsService.insertSettingIfNotExist({
            key: action.id,
            mod: action.mod || undefined,
            category: action.category,
            type: 'shortcut',
            value
        })
        this.log(`Registering action: ${colors.yellow(action.id)}`)
        // this.log(action)
        this.actions[action.id] = action
        if (!skipUpdate) {
            this.log('Not skipping')
            await this.updateShortcutCache()
        }
    }

    /**
     * TODO these shortcuts get deregistered every time the shortcut cache is emptied, fix!
     */
    async registerShortcut(shortcut, action) {
        const code = this.makeShortcutValueCode(shortcut)
        this.shortcutCache[code] = (this.shortcutCache[code] || []).concat({
            runner: action
        })
    }

    setupPacketListeners() {
        interceptPacket('browser/state', undefined, ({ data: {isOpen} }) => {
            this.browserIsOpen = isOpen
            if (isOpen) {
                this.browserText = ''
                this.log('Resetting browser text')
            }
        })
        addAPIMethod('api/shortcuts/category', async ({ category } = {}) => {
            const modsService = getService<ModsService>('ModsService')
            const db = await getDb()
            const settings = db.getRepository(Setting) 
            const enabledMods = (await modsService.getModsWithInfo({category})).filter(mod => mod.value.enabled)
            const enabledModIds = new Set(enabledMods.map(mod => mod.key.substr(4)))
            const results = (await settings.find({where: {
                type: 'shortcut', 
                ...(category ? {category} : {})
            }})).filter(result => {
                return result.mod === null || enabledModIds.has(result.mod)
            })
            const actions = this.actions
            let returned = results.map(res => {
                res = this.settingsService.postload(res)
                if (res.key in actions) {
                    const action = actions[res.key]
                    res = {
                        ...action,
                        ...res
                    }
                }
                res.modName = res.mod ? modsService.latestModsMap['mod/' + res.mod]?.name ?? null : null
                return res
            })
            if (category === 'bitwig') {
                const { data: actions } = await sendPacketToBitwigPromise({type: 'actions'})
                let existingSettingIds = new Set(returned.map(r => r.key))
                let i = 0
                for (const action of actions) {
                    if (!existingSettingIds.has('bitwig/' + action.id)) {
                        returned.push({
                            id: -1 - i,
                            key: 'bitwig/' + action.id,
                            name: action.name,
                            description: action.description,
                            mod: action.category,
                            modName: action.category,
                            value: {}
                        })
                    }
                    i++
                }
            }
            return returned
        })
        this.settingsService.events.settingsUpdated.listen(() => this.updateShortcutCache())
    }

    maybeRunActionForState(state) {
        const code = this.makeShortcutValueCode(state)
        let ran = false
        this.log(`State code is ${code}`)
        if (code in this.shortcutCache) {
            for (const { runner, action } of this.shortcutCache[code]) {
                runner({
                    keyState: state,
                    setEnteringValue: (yesOrNo) => {
                        this.enteringValue = yesOrNo
                    }
                })
                
                // Need vocab clarification. Not all "actions" are really full fletched actions.
                // The shortcut to disable/enable a mod is one of these such pseudo actions
                // that doesn't fully fulfil the ActionSpec
                if (action) {
                    this.events.actionTriggered.emit(action)
                }
                ran = true
            }
        }
        return ran
    }

    activate() {
        this.searchWindow = new BrowserWindow({ 
            width: 370, 
            height: 480, 
            frame: false, 
            show: false,
            webPreferences: {
                nodeIntegration: true,
            }
        })
        this.searchWindow.loadURL(url('/#/search'))

        this.settingsService = getService('SettingsService')
        this.seedSettings()
        this.setupPacketListeners()
        this.settingsService.onSettingValueChange('uiScale', val => {
            this.uiScale = parseInt(val, 10) / 100
            this.log(`Ui scale set to ${this.uiScale}`)
        })

        const getEventKeysArray = event => {
            const { lowerKey, Meta, Shift, Control, Alt } = event
            const keys = [lowerKey.length === 1 ? lowerKey.toUpperCase() : lowerKey]
            if (Meta) {
                keys.push('Meta')
            }
            if (Shift) {
                keys.push('Shift')
            }
            if (Control) {
                keys.push('Control')
            }
            if (Alt) {
                keys.push('Alt')
            }
            return keys.reverse()
        }

        Keyboard.on('keydown', event => {
            let { lowerKey, nativeKeyCode, Meta, Shift, Control, Alt, Fn } = event
            if (/F[0-9]+/.test(lowerKey) || lowerKey === 'Clear' || lowerKey.indexOf('Arrow') === 0) {
                // FN defaults to true when using function keys (makes sense I guess?), but also Clear???
                Fn = false
            }
            // this.log(event, Bitwig.isActiveApplication())
            const noMods = !(Meta || Control || Alt)

            // Keep track of whether an action itself declares that we are entering a value (e.g entering automation)
            let enteringBefore = this.enteringValue

            if (this.enteringValue && (Meta || Control || Alt)) {
                // Assume a shortcut must have been pressed, must no longer be entering value?
                this.enteringValue = false
            }

            if (Bitwig.isActiveApplication() && !this.enteringValue) {
                if (this.browserIsOpen && /^[a-z0-9]{1}$/.test(lowerKey) && noMods) {
                    // Typing in browser
                    this.browserText += lowerKey
                }

                let keys = getEventKeysArray(event)
                const asJSON = JSON.stringify(keys)
                this.log(asJSON)

                let ranDouble = false
                if (asJSON === lastKey && new Date().getTime() - lastKeyPressed.getTime() < 250) {
                    // Double-tapped, check for shortcut
                    lastKey = ''
                    lastKeyPressed = new Date(0)
                    ranDouble = this.maybeRunActionForState({
                        keys,
                        doubleTap: true,
                        fn: Fn
                    })
                } 
                if (!ranDouble) {
                    // Single tap
                    lastKey = asJSON
                    lastKeyPressed = new Date()
                    // Uncomment to debug error messages that crash NAPI
                    // setTimeout(() => {
                        this.maybeRunActionForState({
                            keys,
                            doubleTap: false,
                            fn: Fn
                        })
                    // }, 100)
                }
            }

            // Prevent shortcuts from triggering when renaming something
            if (Bitwig.isActiveApplication() && lowerKey === 'r' && Meta && !Shift && !Alt) {
                this.enteringValue = true
            } else if ((enteringBefore === this.enteringValue) && (lowerKey === 'Enter' || lowerKey === 'Escape' || lowerKey === "NumpadEnter")) {
                this.enteringValue = false
            }
        })
    }
}
