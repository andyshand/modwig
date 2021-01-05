/**
 * @name Touch Volume Selects Track
 * @id touch-volume-selects-track
 * @description Touching the volume on a track selects the track right after. Assumes the inspector is open and tracks are at minimum possible width. You must have a track called "top level only" at the top level of your project (it can be deactivated) for this to work.
 * @category arranger
 */

 Mouse.on('mouseup', event => {
    if (!Bitwig.isActiveApplication() || event.intersectsPluginWindows()) {
        return
    }
    const selectedTrack = UI.MainWindow.getArrangerTracks()
    if (!selectedTrack || !(event.y >= selectedTrack.y && event.y < selectedTrack.y + selectedTrack.h)) {
        // Mouse.returnAfter(() => {
        //     Mouse.click(0, {
        //         x: (selectedTrack.x + selectedTrack.w) - Bitwig.scaleXY({x: 2, y: 0}).x,
        //         y: selectedTrack.y + Bitwig.scaleXY({x: 0, y: 10}).y,
        //     })
        // })
    }
    showNotification({
        content: `Color at ${event.x}, ${event.y} is: ${JSON.stringify(UI.MainWindow.pixelColorAt(event))}`,
        timeout: 1000 * 20
    })
 })

// UI.Arranger.TrackHeaderView.SelectedTrack.on('click', async event => {
//     const ui = event.currentTarget
//     const { x } = Bitwig.scaleXY({ x: 2, y: 0 }) // 2 pixels scaled
//     Mouse.returnAfter(() => {
//         Mouse.click(0, {x: event.x - x, y: ui.y + (ui.h / 2) })  
//     })
// })