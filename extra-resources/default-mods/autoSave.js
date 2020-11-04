/**
 * @name Auto-save
 * @id auto-save
 * @description Auto-saves the current project every minute (while not playing/recording)
 * @category global
 */

Mod.setInterval(() => {
    if (Bitwig.isActiveApplication) {
        Bitwig.sendPacket({type: 'auto-save/save'})
    }
}, 1000 * 60)