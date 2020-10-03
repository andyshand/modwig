/**
 * @name Remember Device View Scroll
 * @id device-view-scroll
 * @description Return to previous scroll position when switching between tracks. Scroll position is currently tracked by listening for middle click drags on the device view portion of the screen. May not work for non-standard scaling/screen layouts.
 * @category devices
 */

let currTrackScroll = 0
let middleMouseDown = false
let lastX = 0

const doScroll = (dX) => {
    Mouse.returnAfter(() => {
        const frame = MainWindow.getFrame()
        const startX = frame.x + frame.w - 50
        const startY = frame.y + frame.h - 160
        Mouse.setPosition(startX, startY)
        Mouse.down(1)
        Mouse.setPosition(startX - dX, startY)
        Mouse.up(1)
        middleMouseDown = false
    })
}

Mouse.on('mousedown', whenActiveListener(event => {
    if (event.y >= 1159 && event.x > 170) {
        if (event.button === 1) {
            middleMouseDown = true
            lastX = event.x
        }
    }
}))

Mouse.on('mouseup', whenActiveListener(event => {
    middleMouseDown = false
}))

Mouse.on('mousemoved', whenActiveListener(event => {
    if (middleMouseDown) {
        const dX = event.x - lastX
        currTrackScroll = Math.max(0, currTrackScroll - dX)
        lastX = event.x
    }
}))

Bitwig.on('selectedTrackChanged', async ( curr, prev ) => {
    if (prev) {
        Db.setTrackData(prev, {scroll: currTrackScroll})
    }

    currTrackScroll = (await Db.getTrackData(curr)).scroll || 0
    if (currTrackScroll > 0) {
        doScroll(currTrackScroll)
    }
})