/**
 * @name Track Volume Hotkeys
 * @id track-volume-hotkeys
 * @description Provides shortcuts for quickly changing track volume
 * @category global
 */

const amounts = [
    [-1, ["-", "Meta"]],
    [-.5, ["-"]],
    [-.1, ["-", "Shift"]],
    [.1, ["+", "Shift"]],  
    [.5, ["+"]],  
    [1, ["+", "Meta"]],
]

for (const [amount, keys] of amounts) {
    Mod.registerAction({
        title: `Nudge track volume ${amount}db`,
        id: `nudge-track-volume-${amount}`,
        category: "global",
        description: `Nudges the currently selected track by ${amount}`,
        defaultSetting: {
            keys
        },
        action: () => {
            Bitwig.sendPacket({
                type: 'track/selected/volume/nudge',
                data: amount
            })
        }
    })
}