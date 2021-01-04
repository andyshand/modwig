/**
 * @name Open Plugin Windows
 * @id open-plugin-windows
 * @description Shortcuts for opening all plugin windows for a track
 * @category global
 */

const deviceBank = deviceController.cursorTrack.createDeviceBank(1)
deviceController.cursorTrack.isGroup().markInterested()
const maybeLog = (msg) => {
    log(msg)
}

let iterating = false

const ourCursorDevice = deviceController.cursorTrack.createCursorDevice("open-plugin-windows", "Open Plugin Windows", 0, CursorDeviceFollowMode.FIRST_DEVICE)
ourCursorDevice.hasSlots().markInterested()
ourCursorDevice.hasLayers().markInterested()
ourCursorDevice.name().markInterested()
ourCursorDevice.hasNext().markInterested()
ourCursorDevice.presetName().markInterested()
ourCursorDevice.exists().markInterested()
ourCursorDevice.slotNames().markInterested()
ourCursorDevice.position().markInterested()
ourCursorDevice.isEnabled().markInterested()
const cursorSlot = ourCursorDevice.getCursorSlot()
cursorSlot.name().markInterested()
const cursorLayer = ourCursorDevice.createCursorLayer()
cursorLayer.hasPrevious().markInterested()
cursorLayer.hasNext().markInterested()
cursorLayer.name().markInterested()
deviceController.cursorTrack.name().markInterested()

const slotBank = cursorSlot.createDeviceBank(1)
const firstSlotDevice = slotBank.getDevice(0)
firstSlotDevice.exists().markInterested()

const layerBank = cursorLayer.createDeviceBank(1)
const firstLayerDevice = layerBank.getDevice(0)
firstLayerDevice.exists().markInterested()

function waitForContextUpdateThen(cb){
    setTimeout(() => {
        cb()
    }, 100, 'Wait for context update')
}

const getDeviceTitleName = device => {
    return device.presetName().get() === 'init' ? device.name().get() : device.presetName().get()
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
    //         setTimeout(check, checkInterval)
    //     }
    // }
    // setTimeout(check, checkInterval)
}

function callCb(cb, pathInfo, callbackDone) {
    const trackRelativePath =  pathInfo.parents.join(' / ')
    // maybeLog('Calling device cb: ' + trackRelativePath)
    return cb(ourCursorDevice, {
        trackRelativePath
    }, callbackDone)
}

function pop(type, pathInfo) {
    const popped = pathInfo.parents.pop()
    log((pathInfo.parents.join(' / ') + ' (- ' + type + ': ' + popped + ')').trim())
}

function push(item, type, pathInfo) {
    pathInfo.parents.push(item)
    log((pathInfo.parents.join(' / ') + ' (+ ' + type + ': ' + item + ')').trim())
}

/**
 * Assumes device has slots, iterates through all slots of selected device, depth first, then returns to parent and calls onComplete
 */
function iterateSelectedDeviceSlots(deviceCb, onComplete, pathInfo) {
    const slotNames = ourCursorDevice.slotNames().get()
    let wentDown = false

    // modLog('Slot names are: ' + JSON.stringify(slotNames))
    function iterateSlotName(i = 0) {
        const slot = slotNames[i]

        if (!slot) {
            // Something went wrong
            maybeLog(`Hmm, ${ourCursorDevice.name().get()} didn't actually have slots`)
            return onComplete()
        }
        
        cursorSlot.selectSlot(slot)
        push(slot, 'slot', pathInfo)
        // maybeLog('Selecting slot: ' + i + ' (' + slot + ')')

        function nextSlotOrComplete(finished = true) {
            pop('slot', pathInfo)
            if (!finished) {
                // Stop! We cancelled
                return // onComplete(finished) FIX ME
            }
            if (i < slotNames.length - 1) {
                iterateSlotName(i + 1)
            } else {
                // maybeLog(`End of slots`)
                if (wentDown) {
                    // maybeLog(`Navigating up`)
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
                doIterateDevices(deviceCb, nextSlotOrComplete, pathInfo)
            })
        })
    }
    iterateSlotName()
}

/**
 * Assumes device has layers, iterates through all layers, depth first, then returns to parent and calls onComplete
 */
function iterateSelectedDeviceLayers(deviceCb, onComplete, pathInfo) {
    let wentDown = false
    function iterateNextLayer() {

        // maybeLog('Processing layer: ' + cursorLayer.name().get())
        push(cursorLayer.name().get(), 'layer', pathInfo)

        function nextLayerOrComplete(finished = true) {
            pop('layer', pathInfo)
            if (!finished) {
                // Stop! We cancelled
                return // onComplete(finished) FIX ME
            }

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
            doIterateDevices(deviceCb, nextLayerOrComplete, pathInfo)
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
function doIterateDevices(deviceCb, onComplete = () => {}, pathInfo = {parents: [], trackRelativePath: ''}) {
    // modLog('Iterating devices')
    const deviceName = getDeviceTitleName(ourCursorDevice)
    push(deviceName, 'device', pathInfo)

    function callbackDone(result) {
        if (result === false) {
            return onComplete(false)
            // Stop searching! We can reuse the cursor device in the future
        }
    
        function iterateSlots(onComplete) {
            // modLog('Iterating slots')
            if (ourCursorDevice.hasSlots().get()) {
                // maybeLog('Has slots')
                iterateSelectedDeviceSlots(deviceCb, onComplete, pathInfo)
            } else {
                // maybeLog('No slots')
                onComplete()
            }
        }
        function iterateLayers(onComplete) {
            // modLog('Iterating layers')
            if (ourCursorDevice.hasLayers().get()) {
                // maybeLog('Has layers')
                iterateSelectedDeviceLayers(deviceCb, onComplete, pathInfo)
            } else {
                // maybeLog('No layers')
                onComplete()
            }
        }
    
        iterateSlots(() => {
            iterateLayers(() => {
                log('Finished iterating slots/layers for ' + deviceName)
                pop('device', pathInfo)
                if (ourCursorDevice.hasNext().get()) {
                    // maybeLog('Device has next')
                    ourCursorDevice.selectNext() 
                    waitForChange(() => ourCursorDevice.position().get(), () => {
                        doIterateDevices(deviceCb, onComplete, pathInfo)
                    })
                } else {
                    // maybeLog('Device does not have next')
                    onComplete()
                }            
            })
        })
    }

    callCb(deviceCb, pathInfo, callbackDone)    
}

function iterateDevices(deviceCb, onComplete = () => {}) {
    // if (iterating) { FIX ME
    //     showMessage(`Already iterating devices, waiting for 1 second`)
    //     return setTimeout(() => {
    //         // try again in a second
    //         iterateDevices(deviceCb, onComplete)
    //     }, 1000)
    // }
    
    iterating = true
    ourCursorDevice.selectFirstInChannel(deviceController.cursorTrack)
    waitForContextUpdateThen(() => {
        doIterateDevices(deviceCb, () => {
            onComplete()
            // iterating = false
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
    iterateDevices((d, _, done) => {
        maybeLog('Device: ' + d.name().get())
        maybeLog(`Found preset: ${d.presetName().get()}`)
        if (d.presetName().get() in presetNames || d.name().get() in presetNames) {
            maybeLog(`Opening`)
            d.isWindowOpen().set(true)
        }
        done()
    })
})

let lastBypassDevicePath = ''
deviceController.cursorTrack.name().addValueObserver(() => {
    // When track changes, remove our cached cursor device
    lastBypassDevicePath = ''
})

packetManager.listen('open-plugin-windows/toggle-bypass', (packet) => {
    const devicePath = packet.data.devicePath
    const withCursorDevice = d => {
        const newState = !d.isEnabled().get()
        showMessage(getDeviceTitleName(d) + (newState ? ' On' : ' Off'))
        d.isEnabled().set(newState)
        lastBypassDevicePath = devicePath
    }
    if (lastBypassDevicePath === devicePath) {
        // Reuse same cursor device from last search
        return withCursorDevice(ourCursorDevice)
    }
    const trackNameSkip = () => {
        let trackName = deviceController.cursorTrack.name().get()
        if (deviceController.cursorTrack.isGroup().get()) {
            // Group tracks devices are on an inner track (?) with "Master appended". Plugin windows will have this name
            return trackName + ' / ' + trackName + ' Master / '
        }
        return trackName + ' / '
    }
    let skipAfter = trackNameSkip()
    let index = devicePath.indexOf(skipAfter)
    if (index !== 0) {
        // Unless starts with track, (possible) we should search for a match that starts and ends with slashes,
        // to avoid partial matches of devices/tracks with the same name
        skipAfter = '/ ' + skipAfter
        index = devicePath.indexOf(skipAfter)
        // showMessage(skipAfter + ' ' + index)
    }
    const pathWithoutTrack = devicePath.substr(index + skipAfter.length)
    let found = false
    iterateDevices((d, {trackRelativePath}, done) => {
        if (!found && trackRelativePath === pathWithoutTrack) {
            // This is our guy!
            withCursorDevice(d)
            found = true
            return done(false)
        }
        done()
    }, () => {
        if (!found) {
            showMessage('Device with path "' + pathWithoutTrack + '" not found')
        }
    })
})

packetManager.listen('open-plugin-windows/toggle-devices-active', (packet) => {
    const deviceNames = packet.data.deviceNames
    const active = packet.data.active
   
    const toggled = []
    runAction([
        'focus_or_toggle_detail_editor',
        'focus_or_toggle_device_panel'
    ])
    iterateDevices((d, _, done) => {
        let deviceName = d.name().get()
        d.selectInEditor() // If we don't do this the GUI and API views seem to go out of sync? Is weird
        if (deviceNames.indexOf(deviceName) >= 0) {
            toggled.push(deviceName)
            if (active) {
                runAction(['Activate'])
            } else {
                runAction(['Deactivate'])
            }
            done()
        } else {
            done()
        }
    }, () => {
        // Notify client on completion, ready for next search
        packetManager.send({
            id: packet.id,
            data: {
                toggled
            }
        })
    })

    // Disable automatic response, ours is async
    return false
})