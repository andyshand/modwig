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
let didDrag = false
let moveEventCount = 0
Mouse.on('mousedown', e => {
    if (e.button === mouseButton) {
        didDrag = false
        downEvent = e
        downAt = new Date()
        moveEventCount = 0
    }
    // showNotification({
    //     content: `Color at ${downEvent.x}, ${downEvent.y} is: ${JSON.stringify(UI.MainWindow.pixelColorAt(downEvent))}`,
    //     timeout: 1000 * 20
    // })
    // log('down')
})

Mouse.on('mousemove', () => {
    // log('move')
    // moveEventCount++
    // didDrag = didDrag || moveEventCount > 1 || (downEvent && (e.x !== downEvent.x || e.y !== downEvent.y))

    didDrag = true
})

let shouldAnnounceSelectedTrack = false
let wasLevelMeter = false
Bitwig.on('selectedTrackChanged', async (curr, prev) => {
    if (shouldAnnounceSelectedTrack) {
        showMessage(`Selected "${curr}"`)
        shouldAnnounceSelectedTrack = false

        if (wasLevelMeter) {
            // We likely always want to show the level meter automation when we click on it (not drag)
            Mod.runAction(`show-current-track-automation`)
            wasLevelMeter = false
        }
    }
})

Mouse.on('mouseup', upEvent => {
    // log('up')

    if (!downEvent 
        || Shortcuts.anyModalOpen()

        // Only select on drag for drawing tool. Otherwise dragging clips, selections gets v frustrating
        || UI.activeTool != 3 && didDrag 
        || !Bitwig.isActiveApplication()
        || Bitwig.isBrowserOpen
        || downEvent.intersectsPluginWindows()
        || upEvent.intersectsPluginWindows()
        || upEvent.button !== mouseButton

        // Use meta similar to how macOS prevents apps from taking focus if you cmd-click on them
        || upEvent.Meta && !didDrag
        ) {
            // log(!downEvent 
            //     , Shortcuts.anyModalOpen()
            //     , UI.activeTool != 3 && didDrag 
            //     , !Bitwig.isActiveApplication()
            //     , Bitwig.isBrowserOpen
            //     , downEvent.intersectsPluginWindows()
            //     , upEvent.intersectsPluginWindows()
            //     , upEvent.button !== mouseButton
            //     , upEvent.Meta && !didDrag)
            return
        }
        
    // Wait for bitwig UI to update first, may select the track by itself
    setTimeout(async () => {
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
            const isLargeTrackHeight = tracks[0].isLargeTrackHeight

            // log(selectedI, insideI)
            if (insideI >= 0) {
                const insideT = tracks[insideI]
                const rect = insideT.rect
                wasLevelMeter = isLargeTrackHeight 
                        ? (upEvent.x >= rect.x + rect.w * .33
                            && upEvent.x < rect.x + rect.w - UI.scale(43)
                            && upEvent.y >= rect.y + UI.scale(25)
                        )
                        : (upEvent.x >= rect.x + rect.w - 31 
                            && upEvent.x < rect.x + rect.w - 19
                        )
                if (selectedI !== insideI) {
                    // Track is not selected, select it first
                    const offscreenY = insideT.visibleRect.y - insideT.rect.y
                    const minTrackHeight = UI.getSizeInfo('minimumTrackHeight')
                    const clickOffsetY = UI.scaleXY({ x: 0, y: 5 }).y
                    if (offscreenY > minTrackHeight - clickOffsetY) {
                        showMessage('Track is too far offscreen')
                        return
                    }

                    const clickYOffsetInTrack = upEvent.y - insideT.rect.y
                    // log(clickYOffsetInTrack)
                    if (clickYOffsetInTrack < minTrackHeight && upEvent.x > insideT.rect.x + insideT.rect.w) {
                        // Clicked the main part of the track, Bitwig will handle selection
                        return // showMessage('Clicked normal part of track, Bitwig handling')
                    }

                    // showMessage(JSON.stringify(insideT))
                    // We have no way of knowing which track we actually clicked (by name)
                    // via the UI analysis only, so we just announce when the selected track changes
                    shouldAnnounceSelectedTrack = true
                    const clickAt = {
                        x: (insideT.rect.x + insideT.rect.w) - UI.scaleXY({ x: 5, y: 0 }).x,
                        y: insideT.visibleRect.y + clickOffsetY,
                        avoidPluginWindows: true,
                        returnAfter: true
                    }
                    log('About to select track:', insideT, 'by clicking at: ', clickAt)
                    await Mouse.click(0, clickAt)
                } else if (wasLevelMeter) {
                    // Track didn't change but we still want to show the level meter automation
                    Mod.runAction(`show-current-track-automation`)
                }
            }
        } catch (e) {
            log(e)
        }
        // showMessage(`Selected: ${JSON.stringify(selected)}`)
        // showMessage(`Inside: ${JSON.stringify(inside)}`)
    }, 150)

    
})