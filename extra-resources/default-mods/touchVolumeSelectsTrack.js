/**
 * @name Track Selection When In Bounds
 * @id touch-volume-selects-track
 * @description Clicking anything inside the bounds of a deselected track will select the track, including track level meter, automation button, editing automation etc
 * @category arranger
 */

// We use the down event to check for location because it's possible to drag outside
// of the bounds of a track but still only affect the track the intial down event hit.
// e.g. Drawing automation with pencil. The mouseup may land outside of the track, but the
// action does not affect the surrounding tracks
let downEvent
Mouse.on('mousedown', e => {
    if (e.button === 0) {
        downEvent = e
    }
    // showNotification({
    //     content: `Color at ${downEvent.x}, ${downEvent.y} is: ${JSON.stringify(UI.MainWindow.pixelColorAt(downEvent))}`,
    //     timeout: 1000 * 20
    // })
})

let shouldAnnounceSelectedTrack = false
Bitwig.on('selectedTrackChanged', async (curr, prev) => {
    if (shouldAnnounceSelectedTrack) {
        showMessage(`Selected "${curr}"`)
        shouldAnnounceSelectedTrack = false
    }
})

Mouse.on('mouseup', upEvent => {
    if (!Bitwig.isActiveApplication()
        || Bitwig.isBrowserOpen
        || downEvent.intersectsPluginWindows()
        || upEvent.intersectsPluginWindows()
        || upEvent.button !== 0) {
        return
    }

    // Wait for bitwig UI to update first, may select the track by itself
    setTimeout(() => {
        try {
            const tracks = UI.MainWindow.getArrangerTracks()
            if (tracks === null || tracks.length === 0) {
                return log('No tracks found, spoopy...')
            }
            // log(tracks)
            const tracksStartX = tracks[0].rect.x
            if (downEvent.x < tracksStartX) {
                return log('Clicked outside arranger view X')
            }

            const selectedI = tracks.findIndex(t => t.selected)
            const insideI = tracks.findIndex(t => downEvent.y >= t.rect.y && downEvent.y < t.rect.y + t.rect.h)

            if (insideI >= 0 && selectedI !== insideI) {
                const insideT = tracks[insideI]
                // showMessage(JSON.stringify(insideT))
                Mouse.returnAfter(() => {
                    // We have no way of knowing which track we actually clicked (by name)
                    // via the UI analysis only, so we just announce when the selected track changes
                    shouldAnnounceSelectedTrack = true
                    const clickAt = {
                        x: (insideT.rect.x + insideT.rect.w) - Bitwig.scaleXY({ x: 5, y: 0 }).x,
                        y: insideT.rect.y + Bitwig.scaleXY({ x: 0, y: 15 }).y,
                    }
                    this.log('About to select track by clicking at: ', clickAt)
                    // log('Click at: ', clickAt)
                    Mouse.click(0, clickAt)
                })
            }
        } catch (e) {
            log(e)
        }
        // showMessage(`Selected: ${JSON.stringify(selected)}`)
        // showMessage(`Inside: ${JSON.stringify(inside)}`)
    }, 150)

    
})