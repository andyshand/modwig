/**
 * @name Touch Volume Selects Track
 * @id touch-volume-selects-track
 * @description Touching the volume on a track selects the track right after. Assumes the inspector is open and tracks are at minimum possible width.
 * @category arranger
 */

arranger.hasDoubleRowTrackHeight().markInterested()
packetManager.listen('touch-volume-selects-track/view-data', (packet) => {    
    const topLevel = !!globalController.findTrackByName("top level only")
    return {
        data: {
            doubleTrackHeight: arranger.hasDoubleRowTrackHeight().get(),
            topLevel
        }
    }
})