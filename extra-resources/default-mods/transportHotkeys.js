/**
 * @name Transport Hotkeys
 * @id transport-hotkeys
 * @description Provides shortcuts for controlling transport
 * @category global
 */

const amounts = [
    [-1, ["NumpadDivide", "Shift"]],
    [-4, ["NumpadDivide"]],
    [4, ["NumpadMultiply"]],  
    [1, ["NumpadMultiply", "Shift"]]
]

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