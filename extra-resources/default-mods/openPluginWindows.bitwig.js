/**
 * @name Open Plugin Windows
 * @id open-plugin-windows
 * @description Shortcuts for opening all plugin windows for a track
 * @category global
 */

for (let i = 0; i < 16; i++) {
    const device = deviceController.deviceBank.getDevice(i)
    device.isPlugin().markInterested()
    device.isWindowOpen().markInterested()
}

packetManager.listen('open-plugin-windows/open-all', (packet) => {
    for (let i = 0; i < 16; i++) {
        const device = deviceController.deviceBank.getDevice(i)
        if (device.isPlugin().get() && !device.isWindowOpen().get()) {
            device.isWindowOpen().set(true)
        }
    }
})