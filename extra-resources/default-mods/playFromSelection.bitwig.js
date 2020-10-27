/**
 * @name Play from Selection
 * @id play-from-selection
 * @description Play from the currently selected item (anything that can be used with Bitwig's "Set Arranger Loop").
 * @category arranger
 */

transport.getInPosition().markInterested()
transport.getOutPosition().markInterested()
transport.isPlaying().markInterested()
transport.isArrangerLoopEnabled().markInterested()

packetManager.listen('play-from-selection', () => {
    let doIt = () => {
        const loopEnabled = transport.isArrangerLoopEnabled().get()
        const currLoopStart = transport.getInPosition().get()
        const currLoopEnd = transport.getOutPosition().get()
        
        runAction("Loop Selection")
        runAction("jump_to_beginning_of_arranger_loop")
        transport.play()
        
        // Restore previous loop state
        transport.getInPosition().set(currLoopStart)
        transport.getOutPosition().set(currLoopEnd)
        transport.isArrangerLoopEnabled().set(loopEnabled)
    }
    if (transport.isPlaying().get()) {
        transport.stop()
        host.scheduleTask(doIt, 100)
    } else {
        doIt()
    }
})