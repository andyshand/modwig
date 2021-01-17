/**
 * @name Double Click Enters Group
 * @id double-click-enters-group
 * @description Double-clicking + Alt
 * @category arranger
 */

Mouse.on('doubleClick', whenActiveListener(async event => {
    if (event.button === 0 && event.Alt && !event.intersectsPluginWindows()) {
        const frame = UI.MainWindow.getFrame()
        const yWithinArranger = x => {
            return event.y >= frame.y + 130 && event.y < (frame.y + frame.h) - 313
        }
        if (!yWithinArranger()) {
            return
        }
        const withinXRange = (minX, maxX) => {
            return event.x >= minX && event.x < maxX
        }
        const arrangerX = x => {
            return frame.x + 175 + x
        }
        if (withinXRange(arrangerX(0), arrangerX(140))) {
            Bitwig.runAction([
                'focus_track_header_area',
                'Enter Group'
            ])
        }
    }
}))