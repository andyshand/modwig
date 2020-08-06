import { app, BrowserWindow } from "electron";
import { url } from "../core/Url";
import { sendPacketToBitwig, interceptPacket } from "../../connector/shared/WebsocketToSocket";
import { isFrontmostApplication } from "../core/BitwigUI";
import { returnMouseAfter } from "../../connector/shared/MouseUtils";
const { Keyboard, Mouse, MainWindow } = require('bindings')('bes')
let windowOpen

let trackScrollPos: {[trackName: string] : number} = {}
let currTrack: string | null = null
let waitingToScroll: string | null = null

const scrollCurrent = (dX) => {
    if (currTrack) {
        trackScrollPos[currTrack] = Math.max(0, (trackScrollPos[currTrack] || 0) + dX)
        const plusOrMinus = dX >= 0 ? `+${dX}` : `-${dX}`
        console.log(`Scroll of ${currTrack} is now: ${trackScrollPos[currTrack]} (${plusOrMinus})`)
    }
}
const getScroll = name => {
    return trackScrollPos[name] || 0
}

export function setupNavigation() {
    windowOpen = new BrowserWindow({ 
        width: 500, 
        height: 600, 
        frame: false, 
        show: false,
        webPreferences: {
            nodeIntegration: true,
        },
        alwaysOnTop: process.env.NODE_ENV !== 'dev'
    })
    windowOpen.loadURL(url('/#/search'))

    let middleMouseDown = false
    let lastX = 0

    const ifFrontmostListener = cb => async event => {
        const isFrontmost = await isFrontmostApplication()
        if (!isFrontmost)  {
            return
        }
        cb(event)
    }
    Keyboard.addEventListener('keydown', ifFrontmostListener(event => {
        if (event.keycode === 27 ) {
            if (event.shiftKey) {
                sendPacketToBitwig({type: 'tracknavigation/forward'})
            } else if (event.ctrlKey) {
                sendPacketToBitwig({type: 'tracknavigation/back'})
            }
        }
        if (event.keycode === 49 && event.ctrlKey) {
            // ctrl + space pressed
            windowOpen.show()
            windowOpen.focus()
            // windowOpen.webContents.openDevTools()
        } else if (windowOpen && event.keycode === 53) {
            // escape pressed
            // but we quit from client atm
        }
    }))
    
    function doScroll(dX) {
        // console.log('doing the scroll: ', dX)
        returnMouseAfter(() => {
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

    interceptPacket('tracksearch/confirm', undefined, ({ type, data: trackName }) => {
        waitingToScroll = trackName
        console.log('waiting to scroll: ', trackName)
    })
    interceptPacket('trackselected', undefined, ({ type, data: { name, selected }}) => {
        if (selected) {
            if (waitingToScroll === name) {
                console.log('the wait is over! now scroll')
                const targetScroll = getScroll(name)
                if (targetScroll > 0) {
                    doScroll(targetScroll)
                }
            } 
            waitingToScroll = null
            currTrack = name
        }
    })

    // Scroll position tracking
    Keyboard.addEventListener('mousedown', ifFrontmostListener(event => {
        if (event.button === 1 && event.y >= 1159 && event.x > 170) {
            console.log('middle mouse down!', event.x, event.y, event.button)
            middleMouseDown = true
            lastX = event.x
        }
    }))
    Keyboard.addEventListener('mouseup', ifFrontmostListener(event => {
        // console.log('middle mouse up!', event.x, event.y, event.button)
        middleMouseDown = false
    }))
    Keyboard.addEventListener('mousemoved', ifFrontmostListener(event => {
        if (middleMouseDown) {
            // console.log('mouse moved!', event.x, event.y)
            const dX = event.x - lastX
            scrollCurrent(-dX)
            lastX = event.x
        }
    }))
}
