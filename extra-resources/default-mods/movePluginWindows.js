/**
 * @name Move Plugin Windows
 * @id move-plugin-windows
 * @description Play from the currently selected item (anything that can be used with Bitwig's "Set Arranger Loop").
 * @category devices
 */

Mod.registerAction({
    title: "Move Plugin Windows Offscreen",
    id: "move-plugin-windows-offscreen",
    description: `Moves plugin windows offscreen, remembering their location for later restoration.`,
    defaultSetting: {
        keys: ["Escape"]
    },
    action: async () => {
        const {
            state,
            positions
        } = await Db.getCurrentTrackData()
        let newState = state === 'topright' ? 'bottomright' : 'topright'

        const pluginWindows = Bitwig.getPluginWindowsPosition()
        Db.setCurrentTrackData({
            // Only save current positions if we went from onscreen to offscreen
            positions: state === 'onscreen' ? pluginWindows : positions,
            state: newState
        })

        const mainWindowFrame = MainDisplay.getDimensions()
        const offscreenPositions = Object.values(pluginWindows).map(info => {
            return {
                id: info.id,
                x: mainWindowFrame.w - info.w,
                y: newState === 'bottomright' ? mainWindowFrame.h - info.h : 0
            }
        })

        Bitwig.setPluginWindowsPosition(_.indexBy(offscreenPositions, 'id'))
    }
})

Mod.registerAction({
    title: "Restore Plugin Windows Onscreen",
    id: "restore-plugin-windows-onscreen",
    description: `Restores the position of plugin windows previously moved offscreen.`,
    defaultSetting: {
        keys: ["F1"]
    },
    action: async () => {
        const { positions, state } = await Db.getCurrentTrackData()
        if (!positions) {
            return Bitwig.showMessage('No position data saved')
        } 
        Bitwig.setPluginWindowsPosition(positions)
        Db.setCurrentTrackData({
            positions,
            state: 'onscreen'
        })
    }
})

Mod.registerAction({
    title: "Tile Plugin Windows",
    id: "tile-plugin-windows",
    description: `Tile plugin windows in the center of the arranger.`,
    defaultSetting: {
        keys: ["F2"]
    },
    action: () => {        
        const pluginWindows = Object.values(Bitwig.getPluginWindowsPosition())
        if (pluginWindows.length === 0) {
            return
        }

        const display = MainDisplay.getDimensions()
        const startX = 500;
    
        let x = startX, y = 0;
        let nextRowY = y;
        let out = []

        for (const window of pluginWindows) {
            if (x + window.w > display.w) {
                // next row
                x = startX;
                y = nextRowY;
            }

            out.push({
                id: window.id,
                x,
                y,
                // needed for maxX/maxY
                w: window.w,
                h: window.h
            })
            
            x += window.w;
            nextRowY = Math.max(nextRowY, y + window.h);
        }

        const maxX = Math.max.apply(null, out.map(pos => pos.x + pos.w))
        const maxY = Math.max.apply(null, out.map(pos => pos.y + pos.h))
        const finalPositions = {}

        const offsetX = (display.w - maxX) / 2
        const offsetY = (display.h - maxY) / 2
        for (const pos of out) {
            finalPositions[pos.id] = {
                // x: pos.x + offsetX,
                // y: pos.y + offsetY
                x: pos.x,
                y: pos.y + offsetY
            }
        }

        Bitwig.setPluginWindowsPosition(finalPositions)
        Db.setCurrentTrackData({
            positions: finalPositions,
            state: 'onscreen'
        })
    }
})