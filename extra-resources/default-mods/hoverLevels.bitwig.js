/**
 * @name Hover Levels
 * @id hover-levels
 * @description Allows mouse button 4 + shift to tweak the levels of the current track
 * @category arranger
 */

// Setup code just to get fraction -> db reference

// cursorTrack.volume().markInterested()
// cursorTrack.volume().displayedValue().markInterested()

// let out = []
// const steps = 500
// const wait = 100
// function setVol(i) {
//     log(`${i} = ${cursorTrack.volume().displayedValue().get()}`)
//     out.push(cursorTrack.volume().displayedValue().get())
//     cursorTrack.volume().set(i / steps)
//     setTimeout(() => {
//         if (i < steps) {
//             setVol(i + 1)
//         } else {
//             log(JSON.stringify(out))
//         }
//     }, wait)
// }

// setVol(0)