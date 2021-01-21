/**
 * @name Return Tracks
 * @id return-tracks
 * @description Various shortcuts for return tracks
 * @category arranger
 */

Mod.registerAction({
    title: "Add new return track (opening browser)",
    id: "add-new-return-track",
    category: "arranger",
    description: `Adds a new return track, opening browser straight away`,
    defaultSetting: {
        keys: ["Meta", "Alt", "T"]
    },
    action: () => {
        Bitwig.runAction([`Create Effect Track`])
        Mod.runAction('openDeviceBrowser')
    }
})

Mod.registerAction({
    title: "Add new track (opening browser)",
    id: "add-new-track",
    category: "arranger",
    description: `Adds a new track, opening browser straight away`,
    defaultSetting: {
        keys: ["Meta", "T"]
    },
    action: () => {
        Bitwig.runAction([`clear_arm`, `Create Instrument Track`])
        Mod.runAction('openDeviceBrowser')
        // Bitwig.runAction([`toggle_track_arm`])
    }
})