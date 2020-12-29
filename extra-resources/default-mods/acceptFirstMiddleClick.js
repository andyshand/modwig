/**
 * @name Accept Middle-Click When Inactive
 * @id accept-middle-click
 * @description Only necessary on Mac. Allow middle-click dragging when Bitwig's main window is not currently active, e.g. when a plugin window has focus.
 * @category global
 */

Mouse.on('mousedown', event => {
    if(Bitwig.isPluginWindowActive && event.button === 1) {
        // Pretend middle mouse has gone up
        Mouse.up(1)

        Bitwig.makeMainWindowActive()     
        
        // Go back to our "real" state
        Mouse.down(1)
    }
})