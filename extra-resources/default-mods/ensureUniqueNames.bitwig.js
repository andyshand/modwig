/**
 * @name Ensure Unique Names
 * @id ensure-unique-names.modwig
 * @description Ensures all tracks have unique names, working better with modwig.
 * @category global
 * @noReload
 */


let lastTrigger = new Date(0)
tracks.forEach((t, i) => {
    t.name().addValueObserver(name => {
        if (!Mod.enabled) { 
            return
        }
        if (new Date() - lastTrigger < 1000) {
            // If we changed a name less than a second ago
            // assume we triggered the observer ourselves somehow
            return
        }
        lastTrigger = new Date()
        let existingNames = {}
        tracks.forEach((thisTrack) => {
            let name = thisTrack.name().get()
            log(name)
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
            }
        }) 

    })
})
