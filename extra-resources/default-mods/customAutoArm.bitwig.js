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
const trackWorker = (t) => {
    if (t) {
        t.arm().set(true)
    } else {
        tracks.forEach((t) => {
            t.arm().set(false);
        })
    }
}

tracks.forEach((t, i) => {
    t.addIsSelectedObserver(selected => {
        if (!Mod.enabled) {
            return
        }
        if (selected) {
            if(t.trackType().get() in autoArmFor) {
                trackWorker(t)
            } else {
                trackWorker(null)
            }
        }
    })
})