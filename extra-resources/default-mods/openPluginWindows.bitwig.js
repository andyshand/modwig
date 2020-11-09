/**
 * @name Open Plugin Windows
 * @id open-plugin-windows
 * @description Shortcuts for opening all plugin windows for a track
 * @category global
 */

const deviceBank = deviceController.cursorTrack.createDeviceBank(1)
const modLog = (msg) => {
    // log(msg)
}

const ourCursorDevice = deviceController.cursorTrack.createCursorDevice("open-plugin-windows", "Open Plugin Windows", 0, CursorDeviceFollowMode.FIRST_DEVICE)
ourCursorDevice.hasSlots().markInterested()
ourCursorDevice.hasLayers().markInterested()
ourCursorDevice.name().markInterested()
ourCursorDevice.hasNext().markInterested()
ourCursorDevice.presetName().markInterested()
ourCursorDevice.exists().markInterested()
ourCursorDevice.slotNames().markInterested()
ourCursorDevice.position().markInterested()
const cursorSlot = ourCursorDevice.getCursorSlot()
cursorSlot.name().markInterested()
const cursorLayer = ourCursorDevice.createCursorLayer()
cursorLayer.hasPrevious().markInterested()
cursorLayer.hasNext().markInterested()
cursorLayer.name().markInterested()

const slotBank = cursorSlot.createDeviceBank(1)
const firstSlotDevice = slotBank.getDevice(0)
firstSlotDevice.exists().markInterested()

const layerBank = cursorLayer.createDeviceBank(1)
const firstLayerDevice = layerBank.getDevice(0)
firstLayerDevice.exists().markInterested()

function waitForContextUpdateThen(cb){
    host.scheduleTask(() => {
        cb()
    }, 100)
}

/**
 * Could be quicker than blindly waiting for context update, more reliable too where
 * we can guarantee that getter variable will definitely change
 */
function waitForChange(getter, cb){
    waitForContextUpdateThen(cb)
    // const checkInterval = 100
    // const now = getter()
    // modLog('Should be waiting for change')
    // function check() {
    //     modLog('Checking for change')
    //     if (now !== getter()) {
    //         modLog(`${now} !== ${getter()}`)
    //         cb()
    //     } else {
    //         modLog(`${now} === ${getter()}`)
    //         host.scheduleTask(check, checkInterval)
    //     }
    // }
    // host.scheduleTask(check, checkInterval)
}

/**
 * Assumes device has slots, iterates through all slots of selected device, depth first, then returns to parent and calls onComplete
 */
function iterateSelectedDeviceSlots(deviceCb, onComplete) {
    const slotNames = ourCursorDevice.slotNames().get()
    let wentDown = false

    // modLog('Slot names are: ' + JSON.stringify(slotNames))
    function iterateSlotName(i = 0) {
        const slot = slotNames[i]

        if (!slot) {
            // Something went wrong
            modLog(`Hmm, ${ourCursorDevice.name().get()} didn't actually have slots`)
            return onComplete()
        }
        
        cursorSlot.selectSlot(slot)
        modLog('Selecting slot: ' + i + ' (' + slot + ')')

        function nextSlotOrComplete() {
            if (i < slotNames.length - 1) {
                iterateSlotName(i + 1)
            } else {
                modLog(`End of slots`)
                if (wentDown) {
                    modLog(`Navigating up`)
                    // Only go up if we actually went down
                    ourCursorDevice.selectParent()
                    waitForContextUpdateThen(() => {
                        // Go back up to parent device
                        onComplete()
                    })
                } else {
                    onComplete()
                }
            } 
        }

        // Wait for cursor slot to update
        waitForChange(() => cursorSlot.name().get(), () => {
            if (!firstSlotDevice.exists().get()) {
                return nextSlotOrComplete()
            }

            ourCursorDevice.selectDevice(firstSlotDevice)
            wentDown = true

            // Wait for cursor device to update
            waitForContextUpdateThen(() => {
                // Go through each device, on completion, going to next slot or returning to parent
                iterateDevices(deviceCb, nextSlotOrComplete)
            })
        })
    }
    iterateSlotName()
}

/**
 * Assumes device has layers, iterates through all layers, depth first, then returns to parent and calls onComplete
 */
function iterateSelectedDeviceLayers(deviceCb, onComplete) {
    let wentDown = false
    function iterateNextLayer() {

        modLog('Processing layer: ' + cursorLayer.name().get())
        function nextLayerOrComplete() {
            if (cursorLayer.hasNext().get()) {
                cursorLayer.selectNext()
                waitForContextUpdateThen(() => {
                    iterateNextLayer()
                })
            } else {
                if (wentDown) {
                    ourCursorDevice.selectParent()
                    waitForContextUpdateThen(() => {
                        // Go back up to parent device
                        onComplete()
                    })
                } else {
                    onComplete()
                }
            }     
        }
        if (!firstLayerDevice.exists().get()){
            return nextLayerOrComplete()
        }
        
        ourCursorDevice.selectDevice(firstLayerDevice)
        wentDown = true

        waitForContextUpdateThen(() => {
            iterateDevices(deviceCb, nextLayerOrComplete)
        })  
    }

    cursorLayer.selectFirst()

    // Wait until first layer is selected, then iterate
    waitForChange(() => cursorLayer.hasPrevious().get(), () => {
        iterateNextLayer()
    })
}

/**
 * Works on the currently selected device and will navigate all the way to the end
 */
function iterateDevices(deviceCb, onComplete = () => {}) {
    // modLog('Iterating devices')
    deviceCb(ourCursorDevice)

    function iterateSlots(onComplete) {
        // modLog('Iterating slots')
        if (ourCursorDevice.hasSlots().get()) {
            modLog('Has slots')
            iterateSelectedDeviceSlots(deviceCb, onComplete)
        } else {
            modLog('No slots')
            onComplete()
        }
    }
    function iterateLayers(onComplete) {
        // modLog('Iterating layers')
        if (ourCursorDevice.hasLayers().get()) {
            modLog('Has layers')
            iterateSelectedDeviceLayers(deviceCb, onComplete)
        } else {
            modLog('No layers')
            onComplete()
        }
    }
    iterateSlots(() => {
        iterateLayers(() => {
            if (ourCursorDevice.hasNext().get()) {
                modLog('Device has next')
                ourCursorDevice.selectNext() 
                waitForChange(() => ourCursorDevice.position().get(), () => {
                    iterateDevices(deviceCb, onComplete)
                })
            } else {
                modLog('Device does not have next')
                onComplete()
            }            
        })
    })
}

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

packetManager.listen('open-plugin-windows/open-with-preset-name', (packet) => {
    const presetNames = packet.data.presetNames
    ourCursorDevice.selectFirstInChannel(deviceController.cursorTrack)


    showMessage(`Reopening plugins: ${Object.keys(presetNames).join(', ')}`)
    waitForContextUpdateThen(() => {
        iterateDevices(d => {
            modLog('Device: ' + d.name().get())
            modLog(`Found preset: ${d.presetName().get()}`)
            if (d.presetName().get() in presetNames || d.name().get() in presetNames) {
                modLog(`Opening`)
                d.isWindowOpen().set(true)
            }
        })
    })
})