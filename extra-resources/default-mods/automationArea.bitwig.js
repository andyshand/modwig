/**
 * @name Automation Area Shortcuts
 * @id automation-area.modwig
 * @description Adds various shortcuts for showing/hiding automation in the arranger.
 * @category arranger
 */

cursorTrack.isGroup().markInterested()
let cursorTrackBank = cursorTrack.createTrackBank(1, 0, 0, false)
cursorTrackBank.channelCount().markInterested()

packetManager.listen('hide-all-automation.automation-area.modwig', (packet) => {
    runAction(`toggle_automation_shown_for_all_tracks`)
    runAction(`toggle_automation_shown_for_all_tracks`)
})

packetManager.listen('show-automation.automation-area.modwig', (packet) => {
    let all = packet.data.all
    // First show automation for this track
    runAction(`toggle_${all ? 'existing_' : ''}automation_shown_for_selected_tracks`)

    // Then if a group, tell the client how many child tracks we need to de-expand
    // cause Bitwig likes to expand all children for some reason
    if (cursorTrack.isGroup().get()) {
        return {
            type: packet.type,
            data: {
                childCount: cursorTrackBank.channelCount().get()
            }
        }
    } else {
        return {
            type: packet.type,
            data: {
                childCount: 0
            }
        }
    }
})

// Alternative implementation below. Doesn't work as well but may be useful in future?
// packetManager.listen('show-automation.automation-area.modwig', (packet) => {
    // let all = packet.data.all
    // let validParents = {}
    // validParents[cursorTrack.name().get()] = true

    // Show automation for current track
    // const action = `toggle_${all ? 'existing_' : ''}automation_shown_for_selected_tracks`    
    // runAction(action)

    // If the track is a group track, Bitwig shows all its child automation too???
    // Didn't ask for it m8
    // if (cursorTrack.isGroup().get()) {
        // println('Cursor track is group, deselecting children')
        // cursorTrack.selectFirstChild()

        // afterUpdates(asyncIterator)
        // function asyncIterator(i = 0) {
        //     let thisName = cursorTrack.name().get()
        //     let parentTrackName = parentTrack.name().get()
        //     println(thisName, parentTrackName)
        //     if (parentTrackName in validParents) {
        //         validParents[thisName] = true
        //     }
            
        //     if (!cursorTrack.hasNext().get() || !(parentTrackName in validParents)) {
        //         // We've escaped our nested level
        //         cursorTrack.selectPrevious()
        //         afterUpdates(() => cursorTrack.selectParent())
        //     } else {
        //         runAction(`toggle_automation_shown_for_selected_tracks`)
        //         cursorTrack.selectNext()
        //         afterUpdates(() => asyncIterator(i + 1))
        //     }
        // }
    // }
// })