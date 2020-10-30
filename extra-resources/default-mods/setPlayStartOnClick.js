/**
 * @name Set Play Start On Click
 * @id set-play-start-on-click
 * @description Automatically set the playhead to the currently selected note.
 * @category arranger
 */

let timeDown = new Date(0)
let mouseDownPos = {x: 0, y: 0}
Mouse.on('mousedown', whenActiveListener(event => {
    if (event.button === 0) {
        Bitwig.sendPacket({type: 'play-from-selection', data: { mousedown: true }})
        mouseDownPos = {x: event.x, y: event.y}
        timeDown = new Date()
    }
}))

const diffLocation = event => event.x !== mouseDownPos.x && event.y !== mouseDownPos.y

Mouse.on('mouseup', whenActiveListener(event => {
    if (event.button === 0 && (diffLocation(event) || new Date().getTime() - timeDown.getTime() < 200)) {
        // Ensure that if we did dragging (in the same location), we don't do anything
        // The user was probably changing a parameter.
        Bitwig.sendPacket({type: 'play-from-selection', data: { mouseup: true }})
    }
}))