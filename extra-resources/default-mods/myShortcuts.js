/**
 * @name My Shortcuts
 * @id andys-shortcuts
 */

Mod.registerShortcutMap({
    'Alt Shift Q': async () => {
        // Q to add eq to end
        if (!Bitwig.isBrowserOpen) {
            Mod.runActions('insertDeviceAtEnd', 'selectBrowserTab2')
            await wait(250)
            Keyboard.type('q', { modwigListeners: true })
            await wait(250)
            Keyboard.keyPress('Enter', { modwigListeners: true })
        }
    }
})