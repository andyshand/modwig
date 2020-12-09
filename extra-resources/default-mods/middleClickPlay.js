/**
 * @name Middle-Click Play
 * @id middle-click-play
 * @description Middle click anywhere within the arranger timeline to play from that point. Click the dividing line between the arranger and note editor while holding 'Shift+E' to work in note editor too.
 * @category arranger
 */

let playButtonDown = false
let clickButton = 4
let startPos = ''
let startPosObj
const makePos = event => JSON.stringify({x: event.x, y: event.y})
let downTime = new Date(0)
let editorIsProbablyOpen = false
let editorBorderLineY = 9999
let draggingBorderLine = false
let shiftEDown = false

Keyboard.on('keydown', event => {
    const { lowerKey, Shift } = event
    shiftEDown = Shift && lowerKey === 'e'
})

Keyboard.on('keyup', event => {
    const { lowerKey } = event
    shiftEDown = false
    if (lowerKey === 'd') {
        editorIsProbablyOpen = false
    } else if (lowerKey === 'e') {
        editorIsProbablyOpen = true
    }
})

function playWithEvent(event) {
    const mousePosBefore = Mouse.getPosition()
    Mouse.returnAfter(() => {
        Keyboard.keyDown('1')
        let timelineClickPosition
        if (event.y > editorBorderLineY && editorIsProbablyOpen) {
            // We're in the note editor
            timelineClickPosition = {x: event.x, y: editorBorderLineY + 7}
        } else {
            // We're in the arranger
            const mainWindowFrame = MainWindow.getFrame()
            timelineClickPosition = {x: event.x, y: 91 + mainWindowFrame.y}
        }
        if (!Bitwig.intersectsPluginWindows(timelineClickPosition)) {
            log(`Double-clicking time ruler at ${timelineClickPosition.x}, ${timelineClickPosition.y}`)
            // Pass modifiers 
            Mouse.doubleClick(0, {...event, ...timelineClickPosition})
        } else {
            Mod.runAction(`move-plugin-windows-offscreen`, { forceState: 'bottomright' })
            setTimeout(() => {
                Mouse.doubleClick(0, {...event, ...timelineClickPosition})
                Mouse.setPosition(mousePosBefore.x, mousePosBefore.y)
            }, 100)
        }
        Keyboard.keyUp('1')
    })
}

Mouse.on('mousedown', event => {
    playButtonDown = Bitwig.isActiveApplication && !Bitwig.isBrowserOpen && event.button === clickButton
    if (playButtonDown && clickButton !== 1) {
        // If click button isn't middle click, we can trigger play straight away as these buttons have no extra function in Bitwig
        return playWithEvent(event)
    }
    startPosObj = {
        x: event.x,
        y: event.y
    }
    startPos = makePos(event)
    downTime = new Date()

    draggingBorderLine = !playButtonDown && Bitwig.isActiveApplication && Math.abs(event.y - editorBorderLineY) < 10
})

Mouse.on('mouseup', event => {
    if (draggingBorderLine || shiftEDown) {
        // Mouse up from dragging border line or manually setting it with 'e' key
        editorBorderLineY = event.y
        Bitwig.showMessage(`Set editor border Y to: ${event.y}px`)
        editorIsProbablyOpen = true
    } else {
        let timeDifference = new Date().getTime() - downTime.getTime()
        if (playButtonDown && makePos(event) === startPos && timeDifference < 200 && clickButton === 1) {
            playWithEvent(event)
        }
    }
    playButtonDown = false
})