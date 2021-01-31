/**
 * @name Hover Levels
 * @id hover-levels
 * @description Allows mouse button 4 + shift to tweak the levels of the current track
 * @category arranger
 */

let lastEvent = null
let lastTracks = null
let track = null
let downPos

function trackIndexForEvent(event) {
    if (!lastTracks) {
        lastTracks = UI.MainWindow.getArrangerTracks() || []
    }
    if (event.Meta) {
        return lastTracks.findIndex(t => t.selected)
    }
    return lastTracks.findIndex(t => event.y >= t.rect.y && event.y < t.rect.y + t.rect.h) 
}
let notifBase = null

function startWithTrack(t) {
    track = t
    log('Starting with track: ', track)
    downPos = Mouse.getPosition()
    notifBase = {
        type: 'volume',
        mouse: {
            x: downPos.x,
            y: downPos.y
        }
    }
    // Mouse.setPosition(downPos.x, MainDisplay.getDimensions().h / 2)
    showNotification({
        ...notifBase,
        track,
    })
}

const throttledShowNotification = throttle(notif => {
    if (track) {
        showNotification(notif)
    }
}, 20)

Mouse.on('mousedown', async event => {
    if (event.button === 3 && event.Shift) {
        const trackIndex = trackIndexForEvent(event)
        const t = lastTracks[trackIndex]
        log(t)
        if (t) {
            lastEvent = event
            if (!t.selected) {
                log('Not selected, waiting for selection')
                await t.selectWithMouse()
                Bitwig.once('selectedTrackChanged', async bwTrack => {
                    await wait(100)
                    log(bwTrack)
                    startWithTrack({...t, ...bwTrack})
                })
            } else {
                // Make sure we start with up to date volume
                const { data: track } = await Bitwig.sendPacketPromise({
                    type: 'track/get',
                    data: {
                        name: Bitwig.currentTrack.name
                    }
                })
                startWithTrack({...t, ...track})
            }
            Mouse.setCursorVisibility(false)
        }
    }    
})

Mouse.on('mousemove', async event => {
    if (track) {
        const dX = event.x - lastEvent.x
        lastEvent = event
        track.volume = clamp(track.volume + (dX * (true ? 0.0015 : 0.005)), 0, 1)
        throttledShowNotification({
            ...notifBase,
            track
        })

        let volumeNow = track.volume

        // Volume string will be 1 iteration out of date but its ok
        const { data } = await Bitwig.sendPacketPromise({
            type: 'track/update',
            data: {
                name: track.name,
                volume: track.volume
            }
        })
        // log(data)

        // We awaited, so track may not exist anymore (from mouseup)
        if (track && volumeNow === track.volume) {
            track.volumeString = data.volumeString
            throttledShowNotification({
                ...notifBase,
                track
            })
        }
    }
})
    
Mouse.on('mouseup', async event => {
    if (event.button === 3 && track) {
        showNotification({
            ...notifBase,
            track: null
        })
        lastTracks = null
        track = null
        Mouse.setCursorVisibility(true)
        Mouse.setPosition(downPos.x, downPos.y)
    }
})