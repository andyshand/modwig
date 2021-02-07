/**
 * @name Track Volume Hotkeys
 * @id track-volume-hotkeys
 * @description Provides shortcuts for quickly changing track volume
 * @category global
 */

cursorTrack.volume().modulatedValue().markInterested()
cursorTrack.volume().value().markInterested()
cursorTrack.volume().displayedValue().markInterested()
cursorTrack.name().markInterested()

packetManager.listen('track/selected/volume/nudge', (packet) => {
    // Not sure how to convert db to 0-1 right now 
    cursorTrack.volume().inc(packet.data / 20)
    setTimeout(() => {
        showMessage(`${cursorTrack.name().get()} volume: ${cursorTrack.volume().displayedValue().get()}`)
    }, 100)
})
