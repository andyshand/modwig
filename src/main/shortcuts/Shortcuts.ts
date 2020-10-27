import { sendPacketToBitwig, interceptPacket, sendPacketToBrowser, addAPIMethod } from "../core/WebsocketToSocket"
import { BESService, getService } from "../core/Service"
import { returnMouseAfter } from "../../connector/shared/EventUtils"
import { getDb } from "../db"
import { Setting } from "../db/entities/Setting"
import { BrowserWindow } from "electron"
import { url } from "../core/Url"
import { SettingsService } from "../core/SettingsService"
import { ModsService } from "../mods/ModsService"
import { logWithTime } from "../core/Log"

const { Keyboard, Mouse, MainWindow, Bitwig } = require('bindings')('bes')

let lastKeyPressed = new Date()
let lastKey = ''
let renaming = false

const MODS_MESSAGE = `Modulators are currently inaccessible from the controller API. This shortcut is also limited to a single device at any time.`
const MODS_MESSAGE_2 = `Modulators are currently inaccessible from the controller API.`
const PROXY_MESSAGE = key => `Proxy key for the "${key}" key for convenient remapping.`
export class ShortcutsService extends BESService {
    browserIsOpen
    browserText = ''
    actions = this.getActions()
    shortcutCache = {}
    settingsService = getService<SettingsService>('SettingsService')
    modsService = getService<ModsService>('ModsService')
    searchWindow: BrowserWindow

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
        return value.keys.sort().join('') + (value.doubleTap || false)
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
                const runner = () => {
                    logWithTime('Running shortcut code: ' + code + ' with action: ' + key)
                    if (value.vstPassThrough || !Bitwig.isPluginWindowActive()) {
                        try {
                            this.actions[key].action()
                        } catch (e) {
                            console.error(e)
                        }
                    }
                }
                this.shortcutCache[code] = (this.shortcutCache[code] || []).concat({
                    runner,
                    keyRepeat: value.keyRepeat || false
                })
            }
        }

        const modShortcuts = await this.modsService.getMods()
        for (const mod of modShortcuts) {
            if (mod.value.keys.length > 0) {
                const code = this.makeShortcutValueCode(mod.value)
                this.shortcutCache[code] = (this.shortcutCache[code] || []).concat({
                    runner: async () => {
                        const value = (await this.settingsService.getSettingValue(mod.key))
                        await this.settingsService.setSettingValue(mod.key, {
                            ...value,
                            enabled: !value.enabled
                        })
                    },
                    keyRepeat: mod.value.keyRepeat || false
                })
            }
        }
        // logWithTime('Shortcut cache is')
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
            })),

            // DEVICES
            ...(this.actionsWithCategory('devices', {
                focusDevicePanel: {
                    description: "Just focus the device panel, rather than the toggle/focus behaviour built into Bitwig.",
                    defaultSetting: {
                        keys: ['D']
                    },
                    action: () => {
                        if (!this.browserIsOpen && !renaming) {
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
                        doubleTap: true,
                        vstPassThrough: true
                    },
                    action: () =>  Bitwig.closeFloatingWindows()
                },
                tilePluginWindows: {
                    defaultSetting: {
                        keys: ['T'],
                        doubleTap: true,
                        vstPassThrough: true
                    },
                    description: 'Tile all open plugin windows.',
                    action: () =>  Bitwig.tileFloatingWindows()
                },
                tilePluginWindowsByChain: {
                    defaultSetting: {
                        keys: ['Shift', 'T'],
                        doubleTap: true,
                        vstPassThrough: true
                    },
                    description: 'Tile plugin windows by chain, creating a new row for each device chain.',
                    action: () =>  Bitwig.tileFloatingWindows({group: 'chain'})
                },
                hidePluginWindows: {
                    defaultSetting: {
                        vstPassThrough: true
                    },
                    description: 'Move plugin windows offscreen (to the top-right corner). Show again with "Tile Plugin Windows".',
                    action: () =>  Bitwig.hideFloatingWindows()
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
                        sendPacketToBitwig({
                            type: 'browser/filters/clear'
                        })
                    }
                },
                confirmBrowser: {
                    defaultSetting: {
                        keys: ['Enter']
                    },
                    description: `Confirms the current choice in the popup browser. If there is a search query and no selected item, the first result will be confirmed.`,
                    action: () => {
                        sendPacketToBitwig({
                            type: this.browserText.length > 0 ? 'browser/select-and-confirm' : 'browser/confirm'
                        })
                    }
                },
                previousBrowserTab: {
                    defaultSetting: {
                        keys: ['Control', 'ArrowLeft']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'browser/tabs/previous'
                        })
                    }
                },
                nextBrowserTab: {
                    defaultSetting: {
                        keys: ['Control', 'ArrowRight']
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'browser/tabs/next'
                        })
                    }
                },
                ...this.repeatActionWithRange('selectBrowserTab', 1, 6, i => {
                    return {
                        defaultSetting: {
                            keys: ["Meta", String(i)]
                        },
                        action: () => sendPacketToBitwig({
                            type: 'browser/tabs/set',
                            data: i - 1
                        }),
                    }
                }),
            })),

            // ARRANGER
            ...(this.actionsWithCategory('arranger', {
                toggleLargeTrackHeight: {
                    description: `Toggles large track height, ensuring the arranger is focused first so the shortcut works when expected.`,
                    defaultSetting: {
                        keys: ['Shift', 'C'],
                        vstPassThrough: true
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
            const value = action.defaultSetting || {keys: []}
            if (process.env.NODE_ENV !== 'dev') {
                delete value.keys
            }
            await this.settingsService.insertSettingIfNotExist({
                key: actionKey,
                category: action.category,
                type: 'shortcut',
                value
            })
        }

        await this.updateShortcutCache()
    }

    setupPacketListeners() {
        interceptPacket('browser/state', undefined, ({ data: {isOpen} }) => {
            this.browserIsOpen = isOpen
            if (isOpen) {
                this.browserText = ''
            }
        })
        addAPIMethod('api/shortcuts/category', async ({ category }) => {
            const db = await getDb()
            const settings = db.getRepository(Setting) 
            const results = await settings.find({where: {type: 'shortcut', category}})
            const actions = this.actions
            return results.map(res => {
                res = this.settingsService.postload(res)
                if (res.key in actions) {
                    const action = actions[res.key]
                    res.description = action.description
                }
                return res
            })
        })
        this.settingsService.events.settingsUpdated.listen(() => this.updateShortcutCache())
    }

    maybeRunActionForState(state) {
        const code = this.makeShortcutValueCode(state)
        let ran = false
        if (code in this.shortcutCache) {
            for (const {runner} of this.shortcutCache[code]) {
                runner()
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
            const { lowerKey, nativeKeyCode, Meta, Shift, Control, Alt } = event
            // logWithTime(event)
            const noMods = !(Meta || Control || Alt)

            // Prevent shortcuts from triggering when renaming something
            if (Bitwig.isActiveApplication() && lowerKey === 'r' && Meta && !Shift && !Alt) {
                renaming = true
            } else if (lowerKey === 'Enter' || lowerKey === 'Escape') {
                renaming = false
            }

            if (Bitwig.isActiveApplication() && !renaming) {
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
                        doubleTap: true
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
                            doubleTap: false
                        })
                    // }, 100)
                }
            }
        })
    }
}
