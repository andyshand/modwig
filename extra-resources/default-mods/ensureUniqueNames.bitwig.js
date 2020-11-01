/**
 * @name Ensure Unique Names
 * @id ensure-unique-names.modwig
 * @description Ensures all tracks have unique names, working better with modwig.
 * @category global
 * @noReload
 */


tracks.forEach((t, i) => {
    t.name().addValueObserver(name => {
        if (!Mod.enabled) { 
            return
        }
        let existingNames = {}
        tracks.forEach((t, thisI) => {
            if (thisI !== i) {
                existingNames[t.name().get()] = true
            }
        })
        if (name in existingNames) {
            let newName = name
            while (newName in existingNames) {
                existingNames[newName] = true
                const searchRes = /[0-9]+/.exec(newName)
                let nextI = parseInt(searchRes ? searchRes[0] : 0, 0) + 1
                newName = newName.split(/[0-9]+/)[0] + nextI
            }
            t.name().set(newName)
        } else {
            existingNames[name] = true
        }  
    })
})