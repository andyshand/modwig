/**
 * @name Open Plugin Windows
 * @id open-plugin-windows
 * @description Shortcuts for opening all plugin windows for a track
 * @category global
 */

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

async function restoreOpenedPluginsForTrack(track) {
    const { positions } = await Db.getTrackData(track, { 
        modId: 'move-plugin-windows'
    })
    const windowIds = Object.keys(positions || {})
    if (windowIds.length) {
        const presetNames = windowIds.map(id => id.split('/').slice(-1).join('').trim())
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
Bitwig.on('selectedTrackChanged', async (track, prev) => {
    if (track in openedPluginsForTracks) {
        log('Track already has plugins opened')
        return
    }
    log('Reopening plugins for track ' + track)
    openedPluginsForTracks[track] = true
    restoreOpenedPluginsForTrack(track)
})