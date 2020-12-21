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
        const timelineClickPosition = {x: event.bitwigX, y: 91}
        
        // Modifiers move start position back further to left to allow run-up
        // to start position. Left-er modifiers = left-er position :D
        let backFurther = 0
        if (event.Meta) {
            backFurther = 100
        } else if (event.Alt) {
            backFurther = 200
        } else if (event.Control) {
            backFurther = 400
        }

        // Make sure the position doesn't cross over into track header 
        timelineClickPosition.x = Math.max(480, timelineClickPosition.x - backFurther);

        if (!Bitwig.intersectsPluginWindows(timelineClickPosition)) {
            log(`Double-clicking time ruler at ${timelineClickPosition.x}, ${timelineClickPosition.y}`)
            // Pass modifiers 
            Bitwig.doubleClick(0, {...event, ...timelineClickPosition})
        } else {
            Mod.runAction(`move-plugin-windows-offscreen`, { forceState: 'bottomright' })
            setTimeout(() => {
                Bitwig.doubleClick(0, {...event, ...timelineClickPosition})
                Mouse.setPosition(mousePosBefore.x, mousePosBefore.y)
            }, 100)
        }
        Keyboard.keyUp('1')
    })
}

Mouse.on('mousedown', event => {
    playButtonDown = Bitwig.isActiveApplication() && !Bitwig.isBrowserOpen && event.button === clickButton
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

    draggingBorderLine = !playButtonDown && Bitwig.isActiveApplication() && Math.abs(event.y - editorBorderLineY) < 10
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