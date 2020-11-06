/**
 * @name Touch Volume Selects Track
 * @id touch-volume-selects-track
 * @description Touching the volume on a track selects the track right after. Assumes the inspector is open and tracks are at minimum possible width. You must have a track called "top level only" at the top level of your project (it can be deactivated) for this to work.
 * @category arranger
 */

Mouse.on('mouseup', whenActiveListener(async event => {
    if (event.button === 0 && !event.Meta && !event.intersectsPluginWindows()) {
        const frame = MainWindow.getFrame()
        const yWithinArranger = x => {
            return event.y >= frame.y + 130 && event.y < (frame.y + frame.h) - 313
        }
        if (!yWithinArranger()) {
            return
        }
        const { data } = await Bitwig.sendPacketPromise({type: 'touch-volume-selects-track/view-data'})
        const { doubleTrackHeight, topLevel } = data
        const withinXRange = (minX, maxX) => {
            return event.x >= minX && event.x < maxX
        }
        const arrangerX = x => {
            return frame.x + 175 + (topLevel ? 0 : 22) + x
        }
        if (doubleTrackHeight && withinXRange(arrangerX(0), arrangerX(220))) {
            // Click the track faders to select
            Mouse.returnAfter(() => {
                Mouse.click(0, {x: arrangerX(202), y: event.y})  
            })
        } else if (!doubleTrackHeight && withinXRange(arrangerX(0), arrangerX(250))) {
            // Click the track faders to select
            Mouse.returnAfter(() => {
                const clickAt = {x: arrangerX(252), y: event.y}
                Mouse.click(0, clickAt)  
            })
        }
    }
}))