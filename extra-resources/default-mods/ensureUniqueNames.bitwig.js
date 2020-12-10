/**
 * @name Ensure Unique Names
 * @id ensure-unique-names.modwig
 * @description Ensures all tracks have unique names, working better with modwig.
 * @category global
 * @noReload
 */

packetManager.listen('rename-all.ensure-unique-names.modwig', (packet) => {
    let existingNames = {}
    let renamedCount = 0
    tracks.forEach((thisTrack) => {
        let name = thisTrack.name().get()
        while (name in existingNames && name !== '') {
            log(`${name} was in existing names`)
            const searchRes = /[0-9]+/.exec(name)
            let nextI = parseInt(searchRes ? searchRes[0] : 0, 10) + 1
            name = name.split(/[0-9]+/)[0] + nextI
            log(`Changed to ${name}`)
        }
        existingNames[name] = true
        if (thisTrack.name().get() !== name) {
            thisTrack.name().set(name)
            renamedCount++
        }
    })
    showMessage(`Renamed ${renamedCount} tracks`)
})