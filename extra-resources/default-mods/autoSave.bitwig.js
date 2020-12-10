/**
 * @name Auto-save
 * @id auto-save
 * @description Auto-saves the current project every minute (while not playing)
 * @category global
 */

transport.isPlaying().markInterested()

packetManager.listen('auto-save/save', () => {
    if (!transport.isPlaying().get()) {
        showMessage('Autosaving...')
        runAction('Save')
    }
})