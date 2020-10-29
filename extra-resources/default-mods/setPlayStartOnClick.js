/**
 * @name Set Play Start On Click
 * @id set-play-start-on-click
 * @description Automatically set the playhead to the currently selected note.
 * @category arranger
 */


Mouse.on('mousedown', whenActiveListener(event => {
    if (event.button === 0) {
        Bitwig.sendPacket({type: 'play-from-selection', data: { mousedown: true }})
    }
}))

Mouse.on('mouseup', whenActiveListener(event => {
    if (event.button === 0) {
        Bitwig.sendPacket({type: 'play-from-selection', data: { mouseup: true }})
    }
}))