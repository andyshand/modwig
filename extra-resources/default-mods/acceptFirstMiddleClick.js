/**
 * @name Accept Inactive Events 
 * @id accept-middle-click
 * @description Only necessary on Mac. Allow middle-click dragging when Bitwig's main window is not currently active, e.g. when a plugin window has focus. Also lets number keys trigger focus, allowing tools work when VST windows are focused.
 * @category global
 */

Mouse.on('mousedown', event => {
    if(Bitwig.isPluginWindowActive && event.button === 1 && !event.intersectsPluginWindows()) {
        // Pretend middle mouse has gone up
        Mouse.up(1)

        Bitwig.makeMainWindowActive()     
        
        // Go back to our "real" state
        Mouse.down(1)
    }
})

const testSet = new Set(['1', '2', '3', '4', '5'])
Keyboard.on('keydown', event => {
    if(testSet.has(event.lowerKey) && Bitwig.isPluginWindowActive) {
        // Pretend key has gone up
        Bitwig.makeMainWindowActive()     
        Keyboard.keyUp(event.lowerKey)

        // Bitwig needs some time to start receiving key events it seems. May need to tweak amount
        setTimeout(() => {
            // Go back to our "real" state
            Keyboard.keyDown(event.lowerKey)
        }, 150) 
    }
})