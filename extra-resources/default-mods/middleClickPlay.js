description = 'Return to previous scroll position when switching between tracks. Scroll position is currently tracked by listening for middle click drags on the device view portion of the screen. May not work for non-standard scaling/screen layouts.'
category = 'arranger'

let middleDown = false
let startPos = ''
const makePos = event => JSON.stringify({x: event.x, y: event.y})

Mouse.on('mousedown', event => {
    middleDown = Bitwig.isActiveApplication && !Bitwig.isBrowserOpen && event.x > 490 && event.button === 1
    startPos = makePos(event)
})

Mouse.on('mouseup', event => {
    if (middleDown && makePos(event) === startPos) {
        Mouse.returnAfter(() => {
            Keyboard.keyDown('1')
            Mouse.doubleClick(0, {x: event.x, y: 125})
            Keyboard.keyUp('1')
        })
    }
    middleDown = false
})