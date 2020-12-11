import { sendPacketToBitwig, interceptPacket, addAPIMethod, sendPacketToBitwigPromise } from "../core/WebsocketToSocket"
import { BESService, getService } from "../core/Service"
import { getDb } from "../db"
import { Setting } from "../db/entities/Setting"
import { BrowserWindow } from "electron"
import { url } from "../core/Url"
import { SettingsService } from "../core/SettingsService"
import { logWithTime } from "../core/Log"
import { ModsService } from "../mods/ModsService"
import { returnMouseAfter } from "../../connector/shared/EventUtils"
const colors = require('colors')

const { Keyboard, Mouse, MainWindow, Bitwig } = require('bindings')('bes')

let lastKeyPressed = new Date()
let lastKey = ''
let enteringValue = false

const MODS_MESSAGE = `Modulators are currently inaccessible from the controller API. This shortcut is also limited to a single device at any time.`
const MODS_MESSAGE_2 = `Modulators are currently inaccessible from the controller API.`
const PROXY_MESSAGE = key => `Proxy key for the "${key}" key for convenient remapping.`

export class ShortcutsService extends BESService {
    browserIsOpen
    browserText = ''
    actions = this.getActions()
    shortcutCache = {}
    settingsService = getService<SettingsService>('SettingsService')
    searchWindow: BrowserWindow
    extraShortcuts: any[]

    repeatActionWithRange(name, startIncl, endIncl, genTakesI) {
        let out = {}
        for (let i = startIncl; i <= endIncl; i++) {
            out[name + i] = {
                ...genTakesI(i)
            }
        }
        return out
    }

    makeShortcutValueCode = (value) => {
        return value.keys.sort().join('') + String(value.doubleTap || false) + String(value.fn || false)
    }

    async updateShortcutCache() {
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
                    logWithTime('Running shortcut code: ' + code + ' with action key: ' + key)
                    try {
                        // console.log(`Action data is: `, this.actions[key])
                        this.actions[key].action(context)
                    } catch (e) {
                        console.error(e)
                    }
                }
                this.shortcutCache[code] = (this.shortcutCache[code] || []).concat({
                    runner
                })
            }
        }        
        // logWithTime(this.shortcutCache)
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
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Toggle Record'
                        })
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
                        Keyboard.keyPress('Enter')
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
                                `Enter Group`
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
                                `Exit Group`
                            ]
                        })
                    }
                },
            })),

            // DEVICES
            ...(this.actionsWithCategory('devices', {
                focusDevicePanel: {
                    description: "Just focus the device panel, rather than the toggle/focus behaviour built into Bitwig.",
                    defaultSetting: {
                        keys: ['D']
                    },
                    action: () => {
                        if (!this.browserIsOpen && !enteringValue) {
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
                        if (!this.browserIsOpen && !enteringValue) {
                            const frame = MainWindow.getFrame()

                            // Ensure arranger panel is active
                            // TODO we'll need a more reliable way to do this if
                            // someone changes shortcuts. Or require you add this shortcut?
                            // First, move focus away from arranger
                            Keyboard.keyPress('ArrowDown', {Control: true, Shift: true})
                            Keyboard.keyPress('ArrowLeft', {Control: true, Shift: true})
                            
                            // Then move it back (because there is only "Toggle/Focus" not "Focus")
                            // If arranger is already active, it ends up showing the mixer...
                            Keyboard.keyPress('o', {Alt: true})
                            
                            returnMouseAfter(() => {
                                Mouse.click(0, {
                                    x: frame.x + 140,
                                    y: frame.y + 140,
                                    Meta: true
                                })
                            })
                            enteringValue = true
                        }
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
            return action.action(...args)
        }
    }

    async registerAction(action, skipUpdate = false) {
        const value = action.defaultSetting || {keys: []}
        if (process.env.NODE_ENV !== 'dev') {
            delete value.keys
        }
        await this.settingsService.insertSettingIfNotExist({
            key: action.id,
            mod: action.mod || null,
            category: action.category,
            type: 'shortcut',
            value
        })
        logWithTime(`Registering action: ${colors.yellow(action.id)}`)
        this.actions[action.id] = action
        if (!skipUpdate) {
            await this.updateShortcutCache()
        }
    }

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
            }
        })
        addAPIMethod('api/shortcuts/category', async ({ category } = {}) => {
            const modsService = getService<ModsService>('ModsService')
            const db = await getDb()
            const settings = db.getRepository(Setting) 
            const enabledMods = (await modsService.getMods({category})).filter(mod => mod.value.enabled)
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
                    res.description = action.description
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
        logWithTime(`State code is ${code}`)
        if (code in this.shortcutCache) {
            for (const {runner} of this.shortcutCache[code]) {
                runner({
                    keyState: state
                })
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
            if (/F[0-9]+/.test(lowerKey) || lowerKey === 'Clear') {
                // FN defaults to true when using function keys (makes sense I guess?), but also Clear???
                Fn = false
            }
            // logWithTime(event, Bitwig.isActiveApplication())
            const noMods = !(Meta || Control || Alt)

            // Keep track of whether an action itself declares that we are entering a value (e.g entering automation)
            let enteringBefore = enteringValue

            if (Bitwig.isActiveApplication() && !enteringValue) {
                if (this.browserIsOpen && /[a-z]{1}/.test(lowerKey) && noMods) {
                    // Typing in browser
                    this.browserText += lowerKey
                }

                let keys = getEventKeysArray(event)
                const asJSON = JSON.stringify(keys)
                logWithTime(asJSON)

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
                enteringValue = true
            } else if ((enteringBefore === enteringValue) && (lowerKey === 'Enter' || lowerKey === 'Escape' || lowerKey === "NumpadEnter")) {
                enteringValue = false
            }
        })
    }
}
