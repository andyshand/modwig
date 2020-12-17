/**
 * @name Transport Nav Popup
 * @id transport-nav-popup
 * @description Shows a popup preview when changing transport position
 * @category global
 */

Mod.on('actionTriggered', action => {
    if (action.id.indexOf('launchArrangerCueMarker') === 0) {
        const markerI = parseInt(action.id.slice(-1), 10)
        if (!isNaN(markerI)) {
            const currMarker = Bitwig.cueMarkers[markerI - 1]
            log(currMarker)
            Mod._openFloatingWindow('/transport-nav-popup', {
                data: {
                    cueMarkers: Bitwig.cueMarkers,
                    position: currMarker?.position ?? 0,
                },
                width: 700,
                height: 70,
                timeout: 500
            })
        }
    }
})