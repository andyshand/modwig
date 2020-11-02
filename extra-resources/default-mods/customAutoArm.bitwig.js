/**
 * @name Custom Auto-Arm
 * @id custom-auto-arm
 * @description Gives more control over auto arm to disable while mods are doing their thing.
 * @category global
 * @noReload
 */

const autoArmFor = {
    Instrument: true,
    Hybrid: true
}
const debouncedTrackWorker = debounce((t) => {
    t.arm().set(true)
}, 150)

tracks.forEach((t, i) => {
    t.addIsSelectedObserver(selected => {
        if (!Mod.enabled) {
            return
        }
        if (selected && t.trackType().get() in autoArmFor) {
            debouncedTrackWorker(t)
        }
    })
})