/**
 * @name VST Undo
 * @id vst-undo
 * @description Supports undo/redo for specific VSTs when focused. At the moment, only supports Fabfilter
 * @category global
 */

function undoRedoFabfilter(redo, window) {
    // showMessage((redo ? `Redoing` : `Undoing`) + ' Fabfilter')
    const toolbarWidth = 850
    const spaceWithoutToolbar = window.w - toolbarWidth
    const toolbarStart = Math.max(0, spaceWithoutToolbar / 2)
    const windowBorderHeight = 15
    const pluginYInset = 18
    const y = window.y + windowBorderHeight + pluginYInset
    
    const position = redo 
    ? {x: window.x + toolbarStart + 345, y } 
    : {x: window.x + toolbarStart + 315, y }

    Mouse.click({
        ...position,
        returnAfter: true
    })
}

function undoOrRedo(redo) {
    const focused = Bitwig.getFocusedPluginWindow()
    if (Bitwig.isPluginWindowActive && focused) {
        undoRedoFabfilter(redo, focused)
    } else {
        // showMessage('Running bitwig action')
        Bitwig.runAction(redo ? 'Redo' : 'Undo')
    }
}

Mod.registerAction({
    title: `VST Undo`,
    id: `vst-undo`,
    description: `Undo`,
    contexts: ['-browser'],
    defaultSetting: {
        keys: ["Meta", "Z"]
    },
    action: async () => {
        undoOrRedo()
    }
})

Mod.registerAction({
    title: `VST Redo`,
    id: `vst-redo`,
    description: `Redo`,
    contexts: ['-browser'],
    defaultSetting: {
        keys: ["Meta", "Shift", "Z"]
    },
    action: async () => {
        undoOrRedo(true)
    }
})