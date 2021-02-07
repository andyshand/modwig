/**
 * @name Track Selection Fixes
 * @id track-selection-fixes
 * @description "Group Master" tracks switch selection to simply "Group", mouse button 4 selects track while working on automation
 * @category global
 */

 globalController.cursorTrack.name().addValueObserver(name => {
     const masterIndex = name.search(/Master$/)
     if (masterIndex > 0) {
         const actualName = name.slice(0, masterIndex).trim()
         globalController.selectTrackWithName(actualName, false)
         log('Forwarding selection to: ' + actualName)
     }
 })