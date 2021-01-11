/**
 * @name Track Selection When In Bounds
 * @id touch-volume-selects-track
 * @description Clicking anything inside the bounds of a deselected track will select the track, including track level meter, automation button, editing automation etc
 * @category arranger
 */


let mouseButton = 0

// UI.on('activeToolChanged', tool => {
//     showMessage(`Tool is ${tool}`)
// })

// We use the down event to check for location because it's possible to drag outside
// of the bounds of a track but still only affect the track the intial down event hit.
// e.g. Drawing automation with pencil. The mouseup may land outside of the track, but the
// action does not affect the surrounding tracks
let downEvent
let downAt = new Date()
Mouse.on('mousedown', e => {
    if (e.button === mouseButton) {
        downEvent = e
        downAt = new Date()
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
    if (!downEvent 
        || Shortcuts.anyModalOpen()
        // Only select on drag for drawing tool. Otherwise dragging clips, selections gets v frustrating
        || (UI.activeTool != 3 && (downEvent.x !== upEvent.x || downEvent.y !== downEvent.y)) 
        || !Bitwig.isActiveApplication()
        || Bitwig.isBrowserOpen
        || downEvent.intersectsPluginWindows()
        || upEvent.intersectsPluginWindows()
        || upEvent.button !== mouseButton
        ) {
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
                const offscreenY = insideT.visibleRect.y - insideT.rect.y
                const minTrackHeight = UI.getSizeInfo('minimumTrackHeight')
                const clickOffsetY = Bitwig.scaleXY({ x: 0, y: 5 }).y
                if (offscreenY > minTrackHeight - clickOffsetY) {
                    showMessage('Track is too far offscreen')
                    return
                }

                // showMessage(JSON.stringify(insideT))
                Mouse.returnAfter(() => {
                    // We have no way of knowing which track we actually clicked (by name)
                    // via the UI analysis only, so we just announce when the selected track changes
                    shouldAnnounceSelectedTrack = true
                    const clickAt = {
                        x: (insideT.rect.x + insideT.rect.w) - Bitwig.scaleXY({ x: 5, y: 0 }).x,
                        y: insideT.visibleRect.y + clickOffsetY,
                    }
                    this.log('About to select track:', insideT, 'by clicking at: ', clickAt)
                    return Mouse.avoidingPluginWindows({...clickAt, noReposition: true}, () => {
                        Mouse.click(0, clickAt)
                    })
                })
            }
        } catch (e) {
            log(e)
        }
        // showMessage(`Selected: ${JSON.stringify(selected)}`)
        // showMessage(`Inside: ${JSON.stringify(inside)}`)
    }, 150)

    
})