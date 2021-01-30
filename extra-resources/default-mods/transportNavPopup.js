/**
 * @name Transport Nav Popup
 * @id transport-nav-popup
 * @description Shows a popup preview when changing transport position via shortcuts
 * @category global
 */

const open = position => {
    Mod._openFloatingWindow('/transport-nav-popup', {
        data: {
            cueMarkers: Bitwig.cueMarkers,
            position
        },
        width: 1200,
        height: 70,
        y: MainDisplay.getDimensions().h * .4,
        timeout: 600
    })
}

let shouldShowNotification = false

Mod.on('actionTriggered', action => {
    const { id } = action
    if (id.indexOf('launchArrangerCueMarker') === 0 
        || id.indexOf(['jump-to-next-cue-marker']) >= 0
        || id.indexOf(['jump-to-previous-cue-marker']) >= 0
        || id.indexOf(['nudge-transport-position']) === 0) {
        shouldShowNotification = true
    }
})

Mod.interceptPacket('transport/play-start', undefined, ({ position }) => {
    if (shouldShowNotification) {
        // log('Received play start packet')
        open(position)
        shouldShowNotification = false
    }
})