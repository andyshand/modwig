/**
 * @name Color Tracks on Activity
 * @id color-tracks-on-activity
 * @description Gives more control over auto arm to disable while mods are doing their thing.
 * @category global
 * @noReload
 */

let paused = false
async function pause() {
    paused = true
    await Bitwig.sendPacketPromise({
        type: 'color-tracks-on-activity/pause' 
    })  
}
async function unpause() {
    paused = false
    // Pause coloring tracks while we undo past coloring points
    await Bitwig.sendPacketPromise({
        type: 'color-tracks-on-activity/unpause' 
    }) 
}

Keyboard.on('keydown', async e => {
    if (e.lowerKey === 'z' && e.Meta) {
        // Pause coloring tracks while we undo past coloring points
        pause()
    } else if (paused && !Bitwig.isBrowserOpen) {
        unpause()
    }
})

Bitwig.on('browserOpen', ({isOpen}) => {
    log('got browserOpen event')
    if (isOpen)  {
        pause()
    }
})

Mouse.on('mouseup', async e => {
    if (paused && e.button === 0 && !Bitwig.isBrowserOpen) {
        unpause()
    }
 })

 Mod.registerAction({
    title: "Raise Threshold",
    id: "raise-global-threshold",
    category: "arranger",
    description: `Ups the global amount to trigger track colours`,
    defaultSetting: {
        keys: ["Meta", "Shift", "="]
    },
    action: async () => {
        await Bitwig.sendPacketPromise({
            type: 'color-tracks-on-activity/threshold',
            data: 10
        })
        unpause()
    }
})

Mod.registerAction({
    title: "Lower Threshold",
    id: "lower-global-threshold",
    category: "arranger",
    description: `Lowers the global amount to trigger track colours`,
    defaultSetting: {
        keys: ["Meta", "Shift", "-"]
    },
    action: async () => {
        await Bitwig.sendPacketPromise({
            type: 'color-tracks-on-activity/threshold',
            data: -10
        })
        unpause()
    }
})