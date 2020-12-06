/**
 * @name Transport Hotkeys
 * @id transport-hotkeys
 * @description Provides shortcuts for controlling transport
 * @category global
 */

globalController.mapCueMarkers((marker, i) => {
    marker.position().markInterested()
    marker.getName().markInterested()
})

packetManager.listen('transport/nudge', (packet) => {
    transport.playStartPosition().set(Math.round(transport.playStartPosition().get() + packet.data))
})

function closestMarkerIndex(next) {
    let closestMarkerDistance = -1
    let closestMarkerIndex = -1
    const transportPos = transport.playStartPosition().get()

    globalController.mapCueMarkers((marker, i) => {
        const markerPosition = marker.position().get()
        const distance = Math.abs(markerPosition - transportPos)
        // log(`${i} ${marker.getName().get()} ${distance}`)
        if (closestMarkerDistance === -1 || distance < closestMarkerDistance) {
            // if is closer than other markers
            if (next && markerPosition > transportPos) {
                closestMarkerIndex = i
                closestMarkerDistance = distance
            } else if (!next && markerPosition < transportPos) {
                // Previous
                closestMarkerIndex = i
                closestMarkerDistance = distance
            }
        }
    })
    return closestMarkerIndex
}

function jump(next) {
    const index = closestMarkerIndex(next)
    if (index >= 0) {
        const marker = globalController.cueMarkerBank.getItemAt(index)
        transport.playStartPosition().set(marker.position().get())
        globalController.cueMarkerBank.scrollToMarker(index)
        host.showPopupNotification(`Jumping to ${marker.getName().get()} (${index + 1})`)
    } else {
        host.showPopupNotification(`No ${next ? 'next' : 'previous'} marker found`)
    }
}

packetManager.listen('transport/cue-markers/jump-next', () => {
    jump(true)    
})

packetManager.listen('transport/cue-markers/jump-previous', () => {
    jump(false)    
})