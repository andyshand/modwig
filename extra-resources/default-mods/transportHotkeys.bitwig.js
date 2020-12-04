/**
 * @name Transport Hotkeys
 * @id transport-hotkeys
 * @description Provides shortcuts for controlling transport
 * @category global
 */

packetManager.listen('transport/nudge', (packet) => {
    transport.playStartPosition().set(Math.round(transport.playStartPosition().get() + packet.data))
})
