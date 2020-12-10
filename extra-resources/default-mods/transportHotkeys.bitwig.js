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
    const newPosition = Math.round(transport.playStartPosition().get() + packet.data)
    const positionToString = pos => {
        return (Math.floor(pos / 4) + 1) + '.' + ((pos % 4) + 1)
    }
    const positionString = positionToString(newPosition)
    const previousMarkerIndex = closestMarkerIndex(false)
    const marker = globalController.cueMarkerBank.getItemAt(previousMarkerIndex)
    const markerIn = newPosition - marker.position().get()
    const message = marker.getName().get() ? `Transport: ${marker.getName().get()} + ${positionToString(markerIn)} (${positionString})` : `Transport: ${positionString}`
    showMessage(message)
    transport.playStartPosition().set(newPosition)
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
        showMessage(`Jumping to ${marker.getName().get()} (${index + 1})`)
    } else {
        showMessage(`No ${next ? 'next' : 'previous'} marker found`)
    }
}

packetManager.listen('transport/cue-markers/jump-next', () => {
    jump(true)    
})

packetManager.listen('transport/cue-markers/jump-previous', () => {
    jump(false)    
})