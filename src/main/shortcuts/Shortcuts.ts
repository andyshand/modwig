import { sendPacketToBitwig, interceptPacket, sendPacketToBrowser } from "../core/WebsocketToSocket"
import { BESService } from "../core/Service"
import { returnMouseAfter } from "../../connector/shared/EventUtils"
import { getDb } from "../db"
import { Setting } from "../db/entities/Setting"

const { Keyboard, Mouse, MainWindow, Bitwig } = require('bindings')('bes')

let lastKeyPressed = new Date()
let lastKey = ''
let renaming = false

export class ShortcutsService extends BESService {
    browserIsOpen
    browserText = ''
    actions = this.getActions()
    shortcutCache = {}

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
        for (const shortcut of results) {
            if (shortcut.value.keys.length > 0) {
                const value = shortcut.value
                const key = shortcut.key
                const code = this.makeShortcutValueCode(value)
                // code is our ID, key is the action to run
                const runner = () => {
                    console.log('Running shortcut code: ' + code + ' with action: ' + key)
                    if (value.vstPassThrough || !Bitwig.isPluginWindowActive()) {
                        this.actions[key].action()
                    }
                }
                this.shortcutCache[code] = (this.shortcutCache[code] || []).concat(runner)
            }
        }

        console.log('Shortcut cache is')
        console.log(this.shortcutCache)
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
                       
                    }                
                },
                toggleRecord: {            
                    action: () => {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Toggle Record'
                        })
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
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowUp')
                    }                
                },
                arrowDown: {
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowDown')
                    }                
                },
                arrowLeft: {
                    defaultSetting: {
                        keys: []
                    },
                    action: () => {
                        Keyboard.keyPress('ArrowLeft')
                    }                
                },
                arrowRight: {
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
                    action: () => {
                        sendPacketToBitwig({
                            type: this.browserText.length > 0 ? 'browser/select-and-confirm' : 'browser/confirm'
                        })
                    }
                },
                previousBrowsertab: {
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
                    defaultSetting: {
                        keys: ['Shift', 'C'],
                        vstPassThrough: true
                    },
                    action: () => {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'toggle_double_or_single_row_track_height'
                        })
                    }
                },
            })),

            // MISC
            ...(this.actionsWithCategory('misc', {

                fixBuzzing: {
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

    getDefaultSettings() {
        return {
            "global": {
                "Exclusive Arm": true
            },
            "browser": {
                "Enter Confirms Empty Selection": true
            },
            "arranger": {
                "Middle Click to play from point": true
            },
            "devices": {
                "Remember Device View Scroll Position": true
            }
        }
    }

    async insertSettingIfNotExist(settings, setting) {
        const existingSetting = await settings.findOne({where: {key: setting.key}})
        if (!existingSetting) {
            const newSetting = settings.create(setting)
            await settings.save(newSetting);
        }
    }

    normalise(label) {
        return label.replace(/[\s]+/g, '-').toLowerCase()
    }

    async seedSettings() {
        const db = await getDb()
        const settings = db.getRepository(Setting)

        const defaultSets = this.getDefaultSettings()
        for (const category in defaultSets) {
            for (const key in defaultSets[category]) {
                const value = defaultSets[category][key]
                await this.insertSettingIfNotExist(settings, {
                    key: this.normalise(key),
                    value,
                    category,
                    type: 'boolean'
                })
            }
        }

        const actions = this.actions
        for (const actionKey in actions) {
            const action = actions[actionKey]
            await this.insertSettingIfNotExist(settings, {
                key: actionKey,
                category: action.category,
                type: 'shortcut',
                value: action.defaultSetting || {keys: []}
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
        interceptPacket('api/settings/category', async ({ data: {category}, id }) => {
            const db = await getDb()
            const settings = db.getRepository(Setting) 
            const results = await settings.find({where: {category}})
            sendPacketToBrowser({data: results, id})
        })
        interceptPacket('api/settings/set', async ({ data: setting }) => {
            const db = await getDb()
            const { key } = setting
            const settings = db.getRepository(Setting)
            const { id } = await settings.findOne({where: {key}})
            const copy = { ...setting }
            delete setting.id
            await settings.update(id, copy)
            await this.updateShortcutCache()
        })
    }

    maybeRunActionForState(state) {
        const code = this.makeShortcutValueCode(state)
        if (code in this.shortcutCache) {
            for (const runner of this.shortcutCache[code]) {
                runner()
            }
        }
    }

    activate() {
        this.seedSettings()
        this.setupPacketListeners()
        
        // Would use mousemove event here but it fires when mouse is clicked too for some reason
        let middleDown = false
        let startPos = ''
        const makePos = event => JSON.stringify({x: event.x, y: event.y})
        Keyboard.addEventListener('mousedown', event => {
            middleDown = Bitwig.isActiveApplication() && !this.browserIsOpen && event.x > 490 && event.button === 1
            startPos = makePos(event)
        })

        Keyboard.addEventListener('mouseup', event => {
            if (middleDown && makePos(event) === startPos) {
                returnMouseAfter(() => {
                    Keyboard.keyDown('1')
                    Mouse.doubleClick(0, {x: event.x, y: 125})
                    Keyboard.keyUp('1')
                })
            }
            middleDown = false
        })

        Keyboard.addEventListener('keydown', event => {
            const { lowerKey, nativeKeyCode, Meta, Shift, Control, Alt } = event
            // console.log(event)
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

                let keys = [lowerKey.length === 1 ? lowerKey.toUpperCase() : lowerKey]
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
                keys.reverse()
                const asJSON = JSON.stringify(keys)
                console.log(asJSON)

                if (asJSON === lastKey && new Date().getTime() - lastKeyPressed.getTime() < 250) {
                    // Double-tapped, check for shortcut
                    lastKey = ''
                    lastKeyPressed = new Date(0)
                    this.maybeRunActionForState({
                        keys,
                        doubleTap: true
                    })
                } else {
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
