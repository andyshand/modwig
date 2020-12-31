/**
 * @name Browser Tweaks
 * @id browser-tweaks
 * @category browser
 * 
 */

let modulatorsOpen = false
let browserOpenAt = new Date(0)

Bitwig.on('browserOpen', ({isOpen, title}) => {
    if (title.indexOf('modulator') >= 0 && isOpen) {
        modulatorsOpen = true
        browserOpenAt = new Date()
    } else {
        modulatorsOpen = false
    }
})

Mouse.on('click', async event => {
    // Add a modulator
    if (modulatorsOpen && new Date() - browserOpenAt < 500) {
        // Focus search field after clicking off
        Mod.runAction('clearBrowserFilters')
        Bitwig.runAction('focus_browser_search_field')
        await wait(250)

        const getToType = () => {
            if (event.Meta) {
                return 'lfo'
            } else if (event.Alt && event.Shift) {
                return 'expressions'
            } else if (event.Shift) {
                return 'ahdsr'
            } else if (event.Alt) {
                return 'audio sidechain'
            } else {
                return 'macro'
            }
        }

        const type = getToType()
        Keyboard.type(type)
        await wait(300)
        Keyboard.keyPress('ArrowDown')

        if (type === 'macro') {
            // Macro-4 currently comes first...
            Keyboard.keyPress('ArrowDown')
        }

        Keyboard.keyPress('Enter')
        // Reset
        browserOpenAt = new Date(0)
        
        for (const mod of ['Meta', 'Alt', 'Control', 'Shift']) {
            // Stop modifiers from interfering with click
            // if (event[mod]) Keyboard.keyUp(mod)
        }

        if (type === 'macro') {
            // Click to start renaming macro
            await wait(100)
            Mouse.click(0, {Meta: true, x: event.x, y: event.y - Bitwig.scaleXY({x: 0, y: 25}).y})
            Mod.setEnteringValue(true)
        } else {
            // Not sure why but this doesn't work at all...
            await wait(100)
            if (type === 'lfo' || type === 'audio sidechain' || type === 'ahdsr') {
                Mouse.click(0, {x: event.x, y: event.y + 35})
            }
        }
    }
})