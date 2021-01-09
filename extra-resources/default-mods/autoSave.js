/**
 * @name Auto-save
 * @id auto-save
 * @description Auto-saves the current project every minute (while not playing/recording)
 * @category global
 */

let lastActivity = new Date(0)
Mouse.on('mouseup', e => {
    lastActivity = new Date()
}) 
Mod.setInterval(() => {
    if (new Date() - lastActivity < 1000 * 60 && Bitwig.isActiveApplication()) {
        Bitwig.sendPacket({type: 'auto-save/save'})
    }
}, 1000 * 60)