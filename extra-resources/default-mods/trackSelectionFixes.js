/**
 * @name Track Selection Fixes
 * @id track-selection-fixes
 * @description "Group Master" tracks switch selection to simply "Group", mouse button 3 selects track while working on automation
 * @category global
 */

// Mouse.on('click', whenActiveListener(event => {
//     if (event.button === 3 && !event.Shift && !event.Meta) {
//         Mouse.returnAfter(() => {
//             Mouse.click(0, { 
//                 x: UI.MainWindow.getFrame().x + 186, 
//                 y: event.y 
//             })
//         })
//     }
// }))