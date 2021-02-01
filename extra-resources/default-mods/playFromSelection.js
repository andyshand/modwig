/**
 * @name Play from Selection
 * @id play-from-selection
 * @description Play from the currently selected item (anything that can be used with Bitwig's "Set Arranger Loop").
 * @category arranger
 */

Mod.registerAction({
    title: "Play from Selection",
    id: "play-from-selection",
    category: "arranger",
    description: `Play from the currently selected item (anything that can be used with Bitwig's "Set Arranger Loop")`,
    defaultSetting: {
        keys: ["Shift", "Space"]
    },
    action: () => Bitwig.sendPacket({type: 'play-from-selection'})
})

Mod.registerAction({
    title: "Jump to Playback Start Time",
    id: "jump-to-playback-start-time",
    category: "arranger",
    defaultSetting: {
        keys: ["Alt", "Space"]
    },
    action: () => Bitwig.sendPacket({type: 'jump-to-playback-start-time'})
})

Mod.registerAction({
    title: "Jump to Playback Start Time (Pre-roll)",
    id: "jump-to-playback-start-time-pre-roll",
    category: "arranger",
    defaultSetting: {
        keys: ["Control", "Shift", "Space"]
    },
    action: () => Bitwig.sendPacket({type: 'jump-to-playback-start-time-pre-roll'})
})
