// mod.description = 'Middle click anywhere within the arranger timeline to play from that point. Works by automating a double click with the pointer (1) tool in the timeline ruler. May not work for non-standard scaling/screen layouts.'
// mod.category = 'arranger'

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