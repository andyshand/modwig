/**
 * @name Transport Nav Popup
 * @id transport-nav-popup
 * @description Shows a popup preview when changing transport position
 * @category global
 */

const open = position => {
    Mod._openFloatingWindow('/transport-nav-popup', {
        data: {
            cueMarkers: Bitwig.cueMarkers,
            position
        },
        width: 700,
        height: 50,
        timeout: 500
    })
}

Mod.on('actionTriggered', action => {
    if (action.id.indexOf('launchArrangerCueMarker') === 0) {
        const markerI = parseInt(action.id.slice(-1), 10)
        if (!isNaN(markerI)) {
            const currMarker = Bitwig.cueMarkers[markerI - 1]
            log(currMarker)
            open(currMarker?.position ?? 0)
        }
    }
})

Mod.interceptPacket('transport/play-start', undefined, ({ position }) => {
    log('Received play start packet')
    open(position)
})