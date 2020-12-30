/**
 * @name Exclusive Arm
 * @id exclusive-arm
 * @description Ensures only one track can be armed at any one time
 * @category global
 * @noReload
 */

const trackarmer = debounce((t, i) => {
    if (browserController.popupBrowser.exists().get()) {
        // Hack to prevent from bug that clears auto-arm on creation of
        // new instrument tracks. Assume browser will be open
        return
    }
    tracks.forEach((t, i2) => {
        if (i !== i2) {
            t.arm().set(false);
        }
    })
 }, 200)

tracks.forEach((t, i) => {
    t.arm().addValueObserver(armed => {
        if (Mod.enabled && armed) {
            trackarmer(t, i)
        }
    })
})