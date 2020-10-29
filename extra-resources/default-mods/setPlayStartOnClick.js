/**
 * @name Set Play Start On Click
 * @id set-play-start-on-click
 * @description Play from the currently selected item (anything that can be used with Bitwig's "Set Arranger Loop").
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