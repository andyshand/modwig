/**
 * @name Touch Volume Selects Track
 * @id touch-volume-selects-track
 * @description Touching the volume on a track selects the track right after. Assumes the inspector is open and tracks are at minimum possible width. You must have a track called "top level only" at the top level of your project (it can be deactivated) for this to work.
 * @category arranger
 */

UI.Arranger.TrackHeaderView.SelectedTrack.on('click', async event => {
    const ui = event.currentTarget
    const { x } = Bitwig.scaleXY({ x: 2, y: 0 }) // 2 pixels scaled
    Mouse.returnAfter(() => {
        Mouse.click(0, {x: event.x - x, y: ui.y + (ui.h / 2) })  
    })
})