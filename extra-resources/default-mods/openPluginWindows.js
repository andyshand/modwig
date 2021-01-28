/**
 * @name Open Plugin Windows
 * @id open-plugin-windows
 * @description Shortcuts for opening all plugin windows for a track
 * @category global
 */

const autoOpen = Mod.registerSetting({
    id: 'auto-open',
    name: 'Automatically reopen plugins from last session',
    description: `When selecting a track, plugin windows that were open last session (or last run of Modwig) are reopened. Try not to interact with the device view while plugins are being opened as this may prevent the search from working correctly.`
})

Mod.registerAction({
    title: "Restore Open Plugin Windows",
    id: "restore-open-plugin-windows",
    description: `Restore all open plugin windows for the current track from the previous session.`,
    defaultSetting: {
        keys: ["Meta", "Alt", "O"]
    },
    action: async () => {
        restoreOpenedPluginsForTrack(Bitwig.currentTrack)
    }
})

Mod.registerAction({
    title: "Open Specific Plugin Windows",
    id: "open-specific-plugin-windows",
    description: `Open specific plugin windows for the current track.`,
    action: async () => {
        restoreOpenedPluginsForTrack(Bitwig.currentTrack, [
            'q',
            'qe',
            'qw',
            '5m',
            'c2',
        ])
    }
})

const getFocusedPluginWindow = () => {
    const pluginWindows = Bitwig.getPluginWindowsPosition()
    return Object.values(pluginWindows).find(w => w.focused)
}
const toggleBypassFocusedPluginWindow = async () => {
    const focused = getFocusedPluginWindow()
    if (!focused) {
        return Bitwig.showMessage('No focused plugin window')
    }
    Bitwig.sendPacket({
        type: 'open-plugin-windows/toggle-bypass',
        data: {
            devicePath: focused.id
        }
    })
}

Mod.registerAction({
    title: "Toggle Bypass Focused Plugin Window",
    id: "toggle-bypass-focused-plugin-window",
    description: `Finds the focused plugin window in the device change and toggles its bypassed state.`,
    defaultSetting: {
        keys: ["0"]
    },
    action: toggleBypassFocusedPluginWindow
})

Mod.registerAction({
    title: 'Toggle low latency mode',
    id: 'toggle-low-latency-mode',
    description: 'Disables or enables all devices in the latency list',
    defaultSetting: {
        keys: ["F6"]
    },
    action: async () => {
        let { tracks, lowLatencyMode } = (await Db.getCurrentProjectData() || {})
        const initiallySelectedTrack = Bitwig.currentTrack
        lowLatencyMode = !lowLatencyMode
        Bitwig.showMessage(`Low latency mode: ${lowLatencyMode ? 'On' : 'Off'}`)

        for (const track in tracks) {
            log(`Processing track: ${track}`)
            await Bitwig.sendPacketPromise({
                type: 'track/select',
                data: {
                    name: track,
                    scroll: false,
                    allowExitGroup: false,
                    enter: false
                }
            })
            const { data: { toggled }} = await Bitwig.sendPacketPromise({
                type: 'open-plugin-windows/toggle-devices-active',
                data: {
                    active: !lowLatencyMode,
                    deviceNames: tracks[track]
                }
            })
            if (toggled.length) {
                Bitwig.showMessage(`${lowLatencyMode ? `Deactivated` : `Activated`} ${toggled.join(', ')}`)
            }
        }
        Db.setCurrentProjectData({ tracks, lowLatencyMode })
        await Bitwig.sendPacket({
            type: 'track/select',
            data: {
                name: initiallySelectedTrack,
                scroll: false,
                allowExitGroup: false,
                enter: false
            }
        })
    }
})

Mod.registerAction({
    title: "Toggle device in latency list",
    id: "toggle-device-in-latency-list",
    description: `Adds or removes the currently selected device from the latency list`,
    defaultSetting: {
        keys: ["F5"]
    },
    action: async () => {
        let { tracks: listsByTrackName, ...rest } = (await Db.getCurrentProjectData() || {})
        if (!listsByTrackName) {
            listsByTrackName = {}
        }
        const track = Bitwig.currentTrack
        const device = Bitwig.currentDevice
        if (!(track && device)) {
            return Bitwig.showMessage('No active device or track')
        }

        const deviceName = device.name
        const list = (listsByTrackName[track] || [])
        if (list.indexOf(deviceName) >= 0) {
            if (list.length === 1) {
                delete listsByTrackName[track]
                await Db.setCurrentProjectData({...rest, tracks: listsByTrackName})
            } else {
                await Db.setCurrentProjectData({
                    ...rest, 
                    tracks: {
                        ...listsByTrackName,
                        [track]: list.filter(name => name !== deviceName)
                    }
                })
            }
            Bitwig.showMessage(`${track}/${deviceName} removed from latency list`)
        } else {
            await Db.setCurrentProjectData({
                ...rest,
                tracks: {
                    ...listsByTrackName,
                    [track]: list.concat(deviceName)
                }
            })
            Bitwig.showMessage(`${track}/${deviceName} added to latency list`)
        }
        // const newList = (await (Db.getCurrentProjectData()) || {}).tracks[track] || []
        // Bitwig.showMessage(`Latency list for ${track}: ${JSON.stringify(newList)}`)
    }
})

Mouse.on('mouseup', async event => {
    if (event.button === 0) {
        const intersects = event.intersectsPluginWindows()
        if (intersects) {
            Db.setCurrentTrackData({
                focusedPlugin: intersects.id
            })
        }
    } else if (event.button === 3) { 
        const intersection = event.intersectsPluginWindows()
        if (intersection) {
            if (!intersection.focused) {
                const position = {
                    x: intersection.x + intersection.w - 10,
                    y: intersection.y + 5
                }
                Mouse.click(0, position)
                Mouse.setPosition(event.x, event.y)
                toggleBypassFocusedPluginWindow()
            } else {
                toggleBypassFocusedPluginWindow()
            }
        }
    }
})

async function restoreOpenedPluginsForTrack(track, presetNames) {
    if (presetNames) {
        return Bitwig.sendPacket({
            type: 'open-plugin-windows/open-with-preset-name',
            data: {
                presetNames: _.indexBy(presetNames)
            }
        })
    }
    
    const { positions } = await Db.getTrackData(track, { 
        modId: 'move-plugin-windows'
    })
    const windowIds = Object.keys(positions || {})
    if (windowIds.length) {
        presetNames = windowIds.map(id => id.split('/').slice(-1).join('').trim())
        log(`Reopening preset names: ${presetNames.join(', ')}`)
        Bitwig.sendPacket({
            type: 'open-plugin-windows/open-with-preset-name',
            data: {
                presetNames: _.indexBy(presetNames)
            }
        })
    }
}

// Ensure we only attempt to automatically restore plugin positions
// once per project session. This obj gets reset when a new project
// is detected
let openedPluginsForTracks = {}

Bitwig.on('activeEngineProjectChanged', async () => {
    openedPluginsForTracks = {}    
    log('Project Changed')
})


let prevPluginCount = 0
let sameCount = 0

async function restoreFocusedPluginWindowToTop(newTrack) {
    const data = await Db.getTrackData(newTrack)
    if (!data || !data.focusedPlugin) {
        return
    }
    const { focusedPlugin } = data

    const doIt = () => {
        if (newTrack !== Bitwig.currentTrack) {
            // Track has changed, abort!
            return
        }

        const pluginOpenCount = Bitwig.getPluginWindowsCount()
        // showMessage(pluginOpenCount)
        if (pluginOpenCount > 1 && pluginOpenCount > prevPluginCount) {
            // Every time we have more plugins, the last one could have opened over the the other
            sameCount = 0
            Bitwig.focusPluginWindow(focusedPlugin)
            // showMessage(`Restoring focus of ${focusedPlugin}`)
            prevPluginCount = pluginOpenCount
            // Check again shortly (probs maximum time it could take to reopen a floating window?)
            setTimeout(doIt, 250)
        } else if (sameCount < 3) {
            sameCount++
            setTimeout(doIt, 250)
        }
    }

    doIt()
}

Bitwig.on('selectedTrackChanged', debounce(async (track, prev) => {
    prevPluginCount = 0
    sameCount = 0
    restoreFocusedPluginWindowToTop(track)

    // log('Auto open is: ' + await autoOpen.getValue())
    if (await autoOpen.getValue()) {
        if (track in openedPluginsForTracks) {
            log('Track already has plugins opened')
            return
        }
        openedPluginsForTracks[track] = true
        restoreOpenedPluginsForTrack(track)
    }
}, 250))