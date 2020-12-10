/**
 * @name Track Selection Hotkeys
 * @id track-selection-hotkeys
 * @description Provides 10 shortcuts for saving track hotkeys for quick navigation
 * @category global
 */

const NUM_HOTKEYS = 10
let lastTracksByName = {}
let lastLoadI = -1
let lastLoaded = new Date(0)

async function highlightNumber(key, context, projectData) {
    if (Bitwig.tracks.length === 0) {
        await Bitwig.sendPacketPromise({type: 'track-selection-hotkeys/send-tracks'})
    } else {
        Bitwig.sendPacketPromise({type: 'track-selection-hotkeys/send-tracks'})
    }
    const tracksByName = {...lastTracksByName, ..._.indexBy(Bitwig.tracks, 'name')}
    lastTracksByName = tracksByName

    let keys = []
    for (let i = 1; i <= 9; i++) {
        keys.push({
            key: `Numpad${i}`,
            track: tracksByName[projectData[i - 1]]
        })
    }
    Mod._openFloatingWindow(`/numpad`, {
        data: {
            keys,
            key: context.keyState.keys.find(key => key.indexOf('Numpad') == 0)
        },
        width: 528,
        height: 720,
        timeout: 1000
    })
}


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
        action: async (context) => {
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
            highlightNumber(i + 1, context, newProjectData)
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
        action: async (context) => {
            const projectData = await Db.getCurrentProjectData()
            highlightNumber(i + 1, context, projectData)
            const track = projectData[i]
            if (track) {
                if (lastLoadI === i && new Date().getTime() - lastLoaded.getTime() < 250) {
                    // Enter group on double tap
                    Bitwig.sendPacket({type: 'track/select', data: { name: track, allowExitGroup: true, enter: true }})
                } else {
                    Bitwig.sendPacket({type: 'track/select', data: { name: track, allowExitGroup: true }})
                }
            }
            lastLoadI = i
            lastLoaded = new Date()
        }
    })
}