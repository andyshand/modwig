/**
 * @name Transport Hotkeys
 * @id transport-hotkeys
 * @description Provides shortcuts for controlling transport
 * @category global
 */

const launchMarkerCount = 19
// Settings
const showPopup = await Mod.registerSetting({
    id: 'show-popup',
    name: 'Show Transport Popup When Launching',
    description: `When triggering launch markers, show a popup notification of the marker's position`
})
log(showPopup)

let launchMarkerDisabledSettings = []
for (let i = 0; i < launchMarkerCount; i++) {
    launchMarkerDisabledSettings.push(await Mod.registerSetting({
        id: `marker-${i}-disabled`,
        name: `Disable Marker ${i + 1}`,
        description: `Skips marker ${i + 1} when launching`
    }))
}

// State
let shouldShowNotification = false
let lastPosition = 0
const amounts = [
    [-1, ["NumpadDivide", "Shift"]],
    [-4, ["NumpadDivide"]],
    [4, ["NumpadMultiply"]],  
    [1, ["NumpadMultiply", "Shift"]]
]

// Helpers
const maybeOpenPopup = async position => {
    if (showPopup.value) {
        const dimensions = MainDisplay.getDimensions()
        const width = dimensions.w * .6
        log('Opening popup')
        Popup.openPopup({
            id: 'transport-nav-popup',
            component: 'TransportNavPopup',
            props: {
                cueMarkers: Bitwig.cueMarkers.map((marker, i) => {
                    return {
                        ...marker,
                        disabled: launchMarkerDisabledSettings[i]?.value ?? true
                    }
                }),
                position
            },
            rect: {
                x: dimensions.w / 2 - width / 2,
                y: dimensions.h * .4,
                w: width,
                h: width * .06,
            },
            clickable: true,
            timeout: 2000,
            onReceivedData: (data) => {
                const { i, action } = data
                log(data)
                if (action === 'toggle') {
                    // Toggle marker enabled
                    launchMarkerDisabledSettings[i].toggleValue()
                    maybeOpenPopup(lastPosition)
                } else {
                    // Launch marker
                    shouldShowNotification = true
                    Bitwig.runAction(`launch_arranger_cue_marker${i + 1}`)
                }
            }
        })
    }
}

// Listeners
Mod.on('actionTriggered', action => {
    const { id } = action
    if (id.indexOf('launch-arranger-cue-marker') === 0 
        || id.indexOf(['jump-to-next-cue-marker']) >= 0
        || id.indexOf(['jump-to-previous-cue-marker']) >= 0
        || id.indexOf(['nudge-transport-position']) === 0) {
        shouldShowNotification = true
    }
})

Mod.interceptPacket('transport/play-start', undefined, ({ position }) => {
    lastPosition = position
    if (shouldShowNotification) {
        // log('Received play start packet')
        maybeOpenPopup(position)
        shouldShowNotification = false
    }
})

// Actions
for (const [amount, keys] of amounts) {
    Mod.registerAction({
        title: `Nudge transport position ${amount} beats`,
        id: `nudge-transport-position-${amount}`,
        category: "global",
        description: `Nudges the transport position by ${amount}`,
        defaultSetting: {
            keys
        },
        action: () => {
            Bitwig.sendPacket({
                type: 'transport/nudge',
                data: amount
            })
        }
    })
}

Mod.registerAction({
    title: `Jump to Previous Cue Marker`,
    id: `jump-to-previous-cue-marker`,
    category: "global",
    description: `Proxy for built-in Bitwig action`,
    defaultSetting: {
        keys: ['Control', 'NumpadDivide']
    },
    action: () => {
        Bitwig.sendPacket({type: 'transport/cue-markers/jump-previous'})
    }
})

Mod.registerAction({
    title: `Jump to Next Cue Marker`,
    id: `jump-to-next-cue-marker`,
    category: "global",
    description: `Proxy for built-in Bitwig action`,
    defaultSetting: {
        keys: ['Control', 'NumpadMultiply']
    },
    action: () => {
        Bitwig.sendPacket({type: 'transport/cue-markers/jump-next'})
    }
})

Mod.registerActionsWithRange('launch-arranger-cue-marker', 1, launchMarkerCount + 1, i => {
    return {
        defaultSetting: {
            keys: ["Meta", String(i)]
        },
        description: `Start playback from launch marker ${i}`,
        contexts: ['-browser'],
        action: () => {
            let actualI = i - 1
            let enabledI = -1
            for (let j = 0; j < launchMarkerCount; j++) {
                log(launchMarkerDisabledSettings[j], actualI, enabledI)
                if (!launchMarkerDisabledSettings[j].value) {
                    enabledI++
                }
                if (actualI === enabledI) {
                    Bitwig.runAction(`launch_arranger_cue_marker${j + 1}`)
                    return
                }
            }
        }
    }
})