/**
 * @name Add Launch Marker Indexes
 * @id add-launch-marker-indexes
 * @description Adds indexes to launch markers so its easy to figure out which keyboard shortcut to hit
 * @category arranger
 */

// name is not settable :( feels bad

// globalController.mapCueMarkers((marker, i) => {
//     marker.getName().markInterested()
//     marker.position().markInterested()

//     function rename(name = marker.getName().get()) {
//         const withoutNumber = name.replace(/[0-9]+/g, '').trim()
//         marker.getName().set(marker.position.get() + withoutNumber)
//     }

//     marker.getName().addValueObserver(name => {
//         rename(name)
//     })

//     rename()
// })