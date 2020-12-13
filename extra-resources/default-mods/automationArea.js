/**
 * @name Automation Area Shortcuts
 * @id automation-area.modwig
 * @description Adds various shortcuts for showing/hiding automation in the arranger. If automation is being expanded for tracks you don't expect, ensure all your tracks have unique names. You can do this using the "Ensure Unique Names" mod (unfolding all group tracks first to ensure visbility).
 * @category arranger
 */

let exclusiveAutomation = false

Mod.registerAction({
    title: "Hide All Automation",
    id: "hide-all-automation.automation-area.modwig",
    category: "arranger",
    description: `Hides automation for all tracks in the arranger.`,
    defaultSetting: {
        keys: ["Meta", "Shift", "A"]
    },
    action: () => {
        Db.setExistingTracksData({
            automationShown: false
        })
        Bitwig.makeMainWindowActive()
        Bitwig.sendPacket({type: 'hide-all-automation.automation-area.modwig'})
    }
})

async function showAutomationImpl(all) {
    const track = Bitwig.currentTrack
    let { automationShown } = await Db.getTrackData(track)
    if (exclusiveAutomation && !automationShown) {
        Db.setExistingTracksData({
            automationShown: false
        }, [track])
    }
    await Bitwig.sendPacketPromise({
        type: 'show-automation.automation-area.modwig', 
        data: { all, automationShown, exclusiveAutomation }
    })    
    await Db.setTrackData(track, {
        automationShown: !automationShown
    })
}

Mod.registerAction({
    title: "Show Automation for Current Track (Default)",
    id: "show-current-automation-default.automation-area.modwig",
    category: "arranger",
    description: `Shows automation for the current track in the arranger (default Bitwig behaviour).`,
    defaultSetting: {
        keys: ["A"],
        fn: true
    },
    action: () => {
        Bitwig.makeMainWindowActive()
        Bitwig.runAction(`toggle_automation_shown_for_selected_tracks`)
    }
})

Mod.registerAction({
    title: "Toggle Automation for Current Track",
    id: "show-current-automation.automation-area.modwig",
    category: "arranger",
    description: `Toggle automation for current track.`,
    defaultSetting: {
        keys: ["A"]
    },
    action: showAutomationImpl.bind(null, false)
})

Mod.registerAction({
    title: "Toggle All Automation for Current Track",
    id: "show-all-current-automation.automation-area.modwig",
    category: "arranger",
    description: `Toggle all automation for current track.`,
    defaultSetting: {
        keys: ["Shift", "A"]
    },
    action: showAutomationImpl.bind(null, true)
})

// Quickly create adjacent automation points with mouse button 3
Mouse.on('mousedown', whenActiveListener(event => {
    if (event.button === 3 && event.Shift) {
        Mouse.returnAfter(() => {
            const { x, y } = Mouse.getPosition()
            if (event.Meta) {
                Mouse.doubleClick(0, {x, y, Shift: true})
                Mouse.doubleClick(0, {x: x + 8, y, Shift: true})
            } else {
                Mouse.click(0, {x, y, Shift: true})
                Mouse.click(0, {x: x + 8, y, Shift: true})
            }
        })
    }
}))

for (let i = 0; i < 100; i+= 10) {
    Mod.registerAction({
        title: `Set selected automation value to ${i}%`,
        id: `set-automation-${i}%`,
        description: `Requires inspector panel to be open`,
        category: 'arranger',
        defaultSetting: {
            keys: ["Shift", `Numpad${String(i)[0]}`]
        },
        action: ({setEnteringValue}) => {
            Mod.runAction('setAutomationValue')
            setTimeout(() => {
                // Select all (remove trailing "db")
                Keyboard.keyPress('a', {Meta: true})

                // Type in number
                Keyboard.type(i)

                // Percentage sign
                Keyboard.keyPress('5', {Shift: true})
        
                Keyboard.keyPress('NumpadEnter')
                setEnteringValue(false)
            }, 100)
        }
    })
}

for (const dir of ['left', 'right']) {
    const capitalized = dir[0].toUpperCase() + dir.slice(1)
    Mod.registerAction({
        title: `Copy automation value ${dir}`,
        id: `copy-automation-${dir}`,
        description: `Copies the value of the currently selected automation point to its ${dir}`,
        category: 'arranger',
        defaultSetting: {
            keys: ["Control", dir === 'left' ? 'Numpad4' : 'Numpad6']
        },
        action: async ({setEnteringValue}) => {
            // Incase modifiers are still pressed
            Keyboard.keyUp('Control')

            Mod.runAction('setAutomationValue')
            await wait(100)

            // Select all
            Keyboard.keyPress('a', {Meta: true})

            // Copy
            Keyboard.keyPress('c', {Meta: true})

            Keyboard.keyPress('NumpadEnter')
            
            // Focus arranger
            Keyboard.keyPress('o', {Alt: true})

            // Move to left/right automation point
            Keyboard.keyPress(`Arrow${capitalized}`)
            
            // Must reset enteringValue for setAutomationValue to trigger
            // (see implementation)
            setEnteringValue(false)
            Mod.runAction('setAutomationValue')

            await wait(100)
            // Select all
            Keyboard.keyPress('a', {Meta: true})

            // Paste
            Keyboard.keyPress('v', {Meta: true})

            // Confirm
            Keyboard.keyPress('NumpadEnter')
            setEnteringValue(false)

            // Focus arranger
            Keyboard.keyPress('o', {Alt: true})
        }
    })
}

Mod.registerAction({
    title: `Snap automation to nearest bar`,
    id: `snap-automation-nearest-bar`,
    description: `Rounds the position of the selected automation point to the nearest bar`,
    category: 'arranger',
    defaultSetting: {
        keys: ["Control", 'Numpad5']
    },
    action: async ({setEnteringValue}) => {
        // Incase modifiers are still pressed, they prevent
        // the value from being set for some reason
        Keyboard.keyUp('Control')

        Mod.runAction('setAutomationPosition')
        await wait(100)

        // Copy
        Keyboard.keyPress('c', {Meta: true})

        // Wait a little to ensure clipboard is populated
        await wait(100)

        const position = Mod.getClipboard()        
        let beats = parseInt(position.split('.')[0], 10)

        const rest = position.split('.').slice(1)
        if (rest[0] === '1' || rest[0] === '2') {
            // Round down
        } else {
            // Round up
            beats += 1
        }

        const toType = beats + '.1.1.00'
        
        Keyboard.type(toType)
        Keyboard.keyPress('NumpadEnter')
        
        setEnteringValue(false)
        log(`Set automation point to ${toType}`)
    }
})