/**
 * @name Play from Selection
 * @id play-from-selection
 * @description Play from the currently selected item (anything that can be used with Bitwig's "Set Arranger Loop").
 * @category arranger
 */

transport.getInPosition().markInterested()
transport.getOutPosition().markInterested()
transport.isPlaying().markInterested()

packetManager.listen('play-from-selection', () => {
    if (transport.isPlaying().get()) {
        runAction("jump_to_playback_start_time")
    } else {
        println("Playing from selection")
        const currLoopStart = transport.getInPosition().get()
        const currLoopEnd = transport.getOutPosition().get()

        runAction("Loop Selection")
        runAction("jump_to_beginning_of_arranger_loop")
        transport.play()

        transport.getInPosition().set(currLoopStart)
        transport.getOutPosition().set(currLoopEnd)
    }
})