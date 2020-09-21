import { sendPacketToBitwig, interceptPacket } from "../core/WebsocketToSocket"
import { BESService } from "../core/Service"
import { returnMouseAfter } from "../../connector/shared/EventUtils"
import { getDb } from "../db"
import { Setting } from "../db/entities/Setting"

const { Keyboard, Mouse, MainWindow, Bitwig } = require('bindings')('bes')

let lastEscape = new Date()
let renaming = false

export class ShortcutsService extends BESService {
    browserIsOpen
    browserText = ''

    getDefaultShortcutSettings() {
        return {
            "devices": {
                "Focus Device Panel": 'd',
                "Close All Plugin Windows": {"doubletap": 'Escape'},
                "Insert Device at End": ["ctrl", "e"],
                "Insert Device at Start": ["ctrl", "q"],
                "Collapse Selected Device": ["meta", "["],
                "Expand Selected Device": ["meta", "]"],
                "Collapse All Devices": ["meta", "shift", "["],
                "Expand All Devices": ["meta", "shift", "]"],
                "Select Device Slot 1": [],
                "Select Device Slot 2": [],
                "Select Device Slot 3": [],
                "Select Device Slot 4": [],
                "Select Device Slot 5": [],
                "Select Device Slot 6": [],
                "Select Device Slot 7": [],
                "Select Device Slot 8": [],
            },
            "global": {
                "Open Track Search": ["ctrl", "space"],
                "Select Previous Track": [],
                "Select Next Track": [],
                "Enter": [],
                "ArrowUp": [],
                "ArrowDown": [],
                "ArrowLeft": [],
                "ArrowRight": []           
            },
            "browser": {
                "Previous Browser Tab": [],
                "Next Browser Tab": [],
                "Select Browser Tab 1": [],
                "Select Browser Tab 2": [],
                "Select Browser Tab 3": [],
                "Select Browser Tab 4": [],
                "Select Browser Tab 5": [],
                "Select Browser Tab 6": [],
                "Open Device Browser": [],
                "Reset Browser Filters": [],
            },
            "arranger": {
                "Toggle Double Track Height": [],
                "Set Value for Current Automation": []
            },
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
                await this.insertSettingIfNotExist(settings, {
                    key: `${category}/${this.normalise(key)}`,
                    value: defaultSets[category][key],
                    category
                })
            }
        }

        const defaultShorts = this.getDefaultShortcutSettings()
        for (const category in defaultShorts) {
            for (const key in defaultShorts[category]) {
                await this.insertSettingIfNotExist(settings, {
                    key: `shortcut/${category}/${this.normalise(key)}`,
                    value: defaultShorts[category][key],
                    category
                })
            }
        }
    }

    activate() {
        this.seedSettings()
        interceptPacket('browser/state', undefined, ({ data: {isOpen} }) => {
            this.browserIsOpen = isOpen
            if (isOpen) {
                this.browserText = ''
            }
        })

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
                if (lowerKey === 'F6') {
                    sendPacketToBitwig({
                        type: 'bugfix/buzzing'
                    })
                } else if (lowerKey === '§' && Meta) {
                    sendPacketToBitwig({
                        type: 'devices/selected/layer/select-first'
                    })
                } else if (lowerKey === 'e' && Control) {
                    sendPacketToBitwig({
                        type: 'devices/selected/chain/insert-at-end'
                    })
                } else if (lowerKey === 'q' && Control) {
                    sendPacketToBitwig({
                        type: 'devices/selected/chain/insert-at-start'
                    })
                } else if (lowerKey === '[' && Meta) {
                    sendPacketToBitwig({
                        type: `devices/${Shift ? `chain` : `selected`}/collapse`
                    })
                } else if (lowerKey === ']' && Meta) {
                    sendPacketToBitwig({
                        type: `devices/${Shift ? `chain` : `selected`}/expand`
                    })
                } else if (lowerKey === '9' && Meta) {
                    sendPacketToBitwig({
                        type: 'tracksearch/confirm',
                        data: `Master`
                    })
                } else if (lowerKey === 'Escape' && !Meta && !Alt) {
                    if (new Date().getTime() - lastEscape.getTime() < 250) {
                        // Double-tapped escape
                        Bitwig.closeFloatingWindows()
                        lastEscape = new Date(0)
                    } else {
                        lastEscape = new Date()
                    }
                } else if (lowerKey === 'd' && !this.browserIsOpen && noMods) {
                    sendPacketToBitwig({
                        type: 'action',
                        data: [
                            `focus_or_toggle_detail_editor`,
                            `focus_or_toggle_device_panel`
                        ]
                    })
                } else if (lowerKey === 'b' && !this.browserIsOpen) {
                    if (Shift) {
                        // insert at end of selected layer
                        sendPacketToBitwig({
                            type: 'devices/selected/layer/insert-at-end'
                        })
                    } else {
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
                } else if (lowerKey === 'Enter' && noMods) {
                    sendPacketToBitwig({
                        type: this.browserText.length > 0 ? 'browser/select-and-confirm' : 'browser/confirm'
                    })
                } else if (lowerKey === 'Escape' && Alt) {
                    sendPacketToBitwig({
                        type: 'browser/filters/clear'
                    })
                } else if (lowerKey === 'Escape' && Meta) {
                    sendPacketToBitwig({
                        type: this.browserText.length > 0 ? 'browser/select-and-confirm' : 'browser/confirm'
                    })
                } else if (lowerKey === 'ArrowLeft' && Control) {
                    sendPacketToBitwig({
                        type: 'browser/tabs/previous'
                    })
                } else if (!isNaN(parseInt(lowerKey))) {
                    const i = parseInt(lowerKey) - 1
                
                    if (this.browserIsOpen) {
                        // navigate browser tabs
                        sendPacketToBitwig({
                            type: 'browser/tabs/set',
                            data: i
                        })
                    } else {
                       if (Shift) {
                            // navigate device layers
                            sendPacketToBitwig({
                                type: 'devices/selected/layers/select',
                                data: i
                            })
                        } else {
                            // navigate device slots
                            sendPacketToBitwig({
                                type: 'devices/selected/slot/select',
                                data: i
                            })
                        }
                    }
                } else if (lowerKey === 'ArrowUp' && Meta || (Control && Meta && lowerKey === 'w')) {
                    sendPacketToBitwig({
                        type: 'devices/selected/navigate-up'
                    })
                } else if (lowerKey === 'ArrowRight' && Control) {
                    sendPacketToBitwig({
                        type: 'browser/tabs/next'
                    })
                } else if (lowerKey === 'w' && Control) {
                    Keyboard.keyPress('ArrowUp')
                } else if (lowerKey === 'a' && Control) {
                    Keyboard.keyPress('ArrowLeft')
                } else if (lowerKey === 's' && Control) {
                    Keyboard.keyPress('ArrowDown')
                } else if (lowerKey === 'd' && Control) {
                    Keyboard.keyPress('ArrowRight')
                } else if (this.browserIsOpen && /[a-z]{1}/.test(lowerKey) && noMods) {
                    // Typing in browser
                    this.browserText += lowerKey
                }
                if (Bitwig.isPluginWindowActive()) {
                    if (lowerKey === 'r' && noMods) {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Toggle Record'
                        })
                    } else if (lowerKey === 'w') {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Select previous track'
                        })
                    } else if (lowerKey === 's') {
                        sendPacketToBitwig({
                            type: 'action',
                            data: 'Select next track'
                        })
                    }
                }
            } 
        })
    }
}
