/**
 * @name Open Plugin Windows
 * @id open-plugin-windows
 * @description Shortcuts for opening all plugin windows for a track
 * @category global
 */

Mod.registerAction({
    title: "Open All Plugin Windows",
    id: "open-all-plugin-windows",
    description: `Opens all the plugin windows for the current track.`,
    defaultSetting: {
        keys: ["Meta", "Alt", "O"]
    },
    action: async () => {
        Bitwig.sendPacket({
            type: 'open-plugin-windows/open-all'
        })
    }
})