/**
 * @name Track Selection Hotkeys
 * @id track-selection-hotkeys
 * @description Provides 10 shortcuts for saving track hotkeys for quick navigation
 * @category global
 */

const NUM_HOTKEYS = 10

for (let i = 0; i < NUM_HOTKEYS; i++) {
    Mod.registerAction({
        title: `Save track for hotkey ${i + 1}`,
        id: `save-track-hotkey-${i + 1}`,
        category: "global",
        description: `Save track for recall using the set hotkey ${i + 1}.`,
        defaultSetting: {
            // 1, 2, 3...0
            keys: ["Alt", "Shift", String(i + 1).slice(-1)]
        },
        action: async () => {
            if (!Bitwig.currentTrack) {
                Bitwig.showMessage(`No track selected.`)
                return
            }
            const projectData = await Db.getCurrentProjectData()
            const newProjectData = {
                ...projectData,
                [i]: Bitwig.currentTrack
            }
            await Db.setCurrentProjectData(newProjectData)
            Bitwig.showMessage(`Saved track ${i + 1}: ${Bitwig.currentTrack}`)
        }
    })

    Mod.registerAction({
        title: `Load track for hotkey ${i + 1}`,
        id: `load-track-hotkey-${i + 1}`,
        category: "global",
        description: `Select track previous set for hotkey ${i + 1}.`,
        defaultSetting: {
            keys: ["Shift", String(i + 1).slice(-1)]
        },
        action: async () => {
            if (!Bitwig.currentTrack) {
                Bitwig.showMessage(`No track selected.`)
                return
            }
            const track = (await Db.getCurrentProjectData())[i]
            if (track) {
                Bitwig.showMessage(`Loaded track ${i + 1}: ${track}`)
                Bitwig.sendPacket({type: 'track/select', data: { name: track }})
            }
        }
    })
}