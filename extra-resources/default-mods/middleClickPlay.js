/**
 * @name Middle-Click Play
 * @id middle-click-play
 * @description Middle click anywhere within the arranger timeline to play from that point. Click the dividing line between the arranger and note editor while holding 'Shift+E' to work in note editor too. Works by automating a double click with the pointer (1) tool in the timeline ruler. May not work for non-standard scaling/screen layouts.
 * @category arranger
 */

let middleDown = false
let startPos = ''
let startPosObj
const makePos = event => JSON.stringify({x: event.x, y: event.y})
let downTime = new Date(0)
let editorIsOpen = false
let editorBorderLineY = 9999
let draggingBorderLine = false
let eDown = false

Keyboard.on('keydown', event => {
    const { lowerKey, Shift } = event
    eDown = Shift && lowerKey === 'e'
})

Keyboard.on('keyup', event => {
    const { lowerKey } = event
    eDown = eDown && lowerKey !== 'e'
})

Mouse.on('mousedown', event => {
    middleDown = Bitwig.isActiveApplication && !Bitwig.isBrowserOpen && event.x > 390 && event.button === 1
    startPosObj = {
        x: event.x,
        y: event.y
    }
    startPos = makePos(event)
    downTime = new Date()

    draggingBorderLine = !middleDown && Bitwig.isActiveApplication && Math.abs(event.y - editorBorderLineY) < 10
})

Mouse.on('mouseup', event => {
    if (draggingBorderLine || eDown) {
        // Mouse up from dragging border line or manually setting it with 'e' key
        editorBorderLineY = event.y
        Bitwig.showMessage(`Set editor border Y to: ${event.y}px`)
    } else {
        let timeDifference = new Date().getTime() - downTime.getTime()
        if (middleDown && makePos(event) === startPos && timeDifference < 200) {
            Mouse.returnAfter(() => {
                Keyboard.keyDown('1')
                let timelineClickPosition
                if (event.y > editorBorderLineY) {
                    // We're in the note editor
                    timelineClickPosition = {x: event.x, y: editorBorderLineY + 7}
                } else {
                    // We're in the arranger
                    timelineClickPosition = {x: event.x, y: 125}
                }
                Mouse.doubleClick(0, timelineClickPosition)
                Keyboard.keyUp('1')
            })
        }
    }
    middleDown = false
})