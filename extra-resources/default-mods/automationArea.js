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
    contexts: ['-browser'],
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

async function showAutomationImpl(all, { onlyShow } = { onlyShow: false }) {
    const track = Bitwig.currentTrack
    let { automationShown } = await Db.getTrackData(track)
    if (onlyShow && automationShown) {
        return log('Automation already shown')
    }
    log('Showing automation')
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
    contexts: ['-browser'],
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
    title: "Show Automation for Current Track",
    id: "show-current-track-automation",
    category: "arranger",
    contexts: ['-browser'],
    description: `Shows automation for the current track in the arranger.`,
    action: showAutomationImpl.bind(null, false, { onlyShow: true })
})

Mod.registerAction({
    title: "Toggle Automation for Current Track",
    id: "show-current-automation.automation-area.modwig",
    category: "arranger",
    contexts: ['-browser'],
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
    contexts: ['-browser'],
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
        contexts: ['-browser'],
        defaultSetting: {
            keys: ["Shift", `Numpad${String(i)[0]}`]
        },
        action: () => {
            Mod.runAction('set-automation-value')
            setTimeout(() => {
                // Select all (remove trailing "db")
                Keyboard.keyPress('a', {Meta: true})

                // Type in number
                Keyboard.type(i)

                // Percentage sign
                Keyboard.keyPress('5', {Shift: true})
        
                Keyboard.keyPress('NumpadEnter')
                Mod.setEnteringValue(false)
            }, 100)
        }
    })
}

for (const dir of ['left', 'right']) {
    const capitalized = dir[0].toUpperCase() + dir.slice(1)
    Mod.registerAction({
        title: `Copy automation value ${dir}`,
        id: `copy-automation-${dir}`,
        contexts: ['-browser'],
        description: `Copies the value of the currently selected automation point to its ${dir}`,
        category: 'arranger',
        defaultSetting: {
            keys: ["Control", dir === 'left' ? 'Numpad4' : 'Numpad6']
        },
        action: async () => {
            // Incase modifiers are still pressed
            Keyboard.keyUp('Control')

            Mod.runAction('set-automation-value')
            await wait(100)

            // Select all
            Keyboard.keyPress('a', {Meta: true})

            // Copy
            Keyboard.keyPress('c', {Meta: true})

            Keyboard.keyPress('NumpadEnter')
            
            // Focus arranger
            Mod.runAction('focusArranger')

            // Move to left/right automation point
            Keyboard.keyPress(`Arrow${capitalized}`)
            
            // Must reset enteringValue for set-automation-value to trigger
            // (see implementation)
            Mod.setEnteringValue(false)
            Mod.runAction('set-automation-value')

            await wait(100)
            // Select all
            Keyboard.keyPress('a', {Meta: true})

            // Paste
            Keyboard.keyPress('v', {Meta: true})

            // Confirm
            Keyboard.keyPress('NumpadEnter')
            Mod.setEnteringValue(false)

            // Focus arranger
            Mod.runAction('focusArranger')
        }
    })
}

Mod.registerAction({
    title: `Snap automation to nearest bar`,
    id: `snap-automation-nearest-bar`,
    description: `Rounds the position of the selected automation point to the nearest bar`,
    category: 'arranger',
    contexts: ['-browser'],
    defaultSetting: {
        keys: ["Control", 'Numpad5']
    },
    action: async () => {
        // Incase modifiers are still pressed, they prevent
        // the value from being set for some reason
        Keyboard.keyUp('Control')

        Mod.runAction('set-automation-position')
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
        
        Mod.setEnteringValue(false)
        log(`Set automation point to ${toType}`)
    }
})

Mod.registerAction({
    title: `Copy automation value`,
    id: `copy-automation-value`,
    description: `Copies the value of the currently selected automation`,
    category: 'arranger',
    contexts: ['-browser'],
    defaultSetting: {
        keys: ["Meta", "Shift", "C"]
    },
    action: async () => {
        Mod.runAction('set-automation-value')
        Keyboard.keyPress('c', {Meta: true})
        Keyboard.keyPress('NumpadEnter')
        Mod.setEnteringValue(false)
        Mod.runAction('focusArranger')
    }
})

Mod.registerAction({
    title: `Paste automation value`,
    id: `paste-automation-value`,
    description: `Pastes the value of the currently selected automation`,
    category: 'arranger',
    contexts: ['-browser'],
    defaultSetting: {
        keys: ["Meta", "Shift", "V"]
    },
    action: async () => {
        Mod.runAction('set-automation-value')
        Keyboard.keyPress('v', {Meta: true})
        Keyboard.keyPress('NumpadEnter')
        Mod.setEnteringValue(false)
        Mod.runAction('focusArranger')
    }
})


Mod.registerAction({
    title: `Show track volume automation`,
    id: `show-track-volume-automation`,
    description: `Selects the track volume and opens automation if it isn't open already`,
    category: 'arranger',
    contexts: ['-browser'],
    defaultSetting: {
        keys: ["V"]
    },
    action: async () => {
        const tracks = UI.MainWindow.getArrangerTracks()
        if (tracks === null || tracks.length === 0) {
            return log('No tracks found, spoopy...')
        }

        const mousePos = Mouse.getPosition()
        const getTargetTrack = () => {
            if (true) {
                return tracks.find(t => t.selected)
            } else {
                return tracks.find(t => mousePos.y >= t.rect.y && mousePos.y < t.rect.y + t.rect.h)
            }
        }
        const targetT = getTargetTrack()
        if (!targetT) {
            return showMessage(`Couldn't find track`)
        }

        // log (selected)
        const clickAt = targetT.isLargeTrackHeight ? {
            // Level meter is halfway across near the bottom
            x: targetT.rect.x + (targetT.rect.w / 2), 
            y: targetT.rect.y + UI.scaleXY({ x: 0, y: 33 }).y,
        } : {
            // Level meter is on the right hand edge from top to bottom
            x: (targetT.rect.x + targetT.rect.w) - UI.scaleXY({ x: 25, y: 0 }).x,
            y: targetT.rect.y + UI.scaleXY({ x: 0, y: 15 }).y,
        }

        // if (!targetT.selected) {

        // }

        // log('Clicking at: ', clickAt)
        await Mouse.click(0, {
            ...clickAt,
            avoidPluginWindows: true,
            // For whatever reason the click here happens after returning the mouse,
            // so we need to wait a little. So many timeouts :(
            returnAfter: 100
        })
        if (!targetT.automationOpen) {
            showAutomationImpl(false)
            Db.setCurrentTrackData({
                automationShown: true
            })
        }
    }
})

Mod.registerAction({
    title: `Jump to track level meter`,
    id: `jump-track-level-meter`,
    description: `Moves the mouse cursor to the track level meter`,
    category: 'arranger',
    contexts: ['-browser'],
    defaultSetting: {
        keys: ["Shift", "V"]
    },
    action: async () => {
        const tracks = UI.MainWindow.getArrangerTracks()
        if (tracks === null || tracks.length === 0) {
            return log('No tracks found, spoopy...')
        }

        const selected = tracks.find(t => t.selected)
        if (!selected) {
            return showMessage(`Couldn't find selected track`)
        }

        const clickAt = selected.isLargeTrackHeight ? {
            // Level meter is halfway across near the bottom
            x: selected.rect.x + (selected.rect.w / 2), 
            y: selected.rect.y + UI.scaleXY({ x: 0, y: 33 }).y,
        } : {
            // Level meter is on the right hand edge from top to bottom
            x: (selected.rect.x + selected.rect.w) - UI.scaleXY({ x: 25, y: 0 }).x,
            y: selected.rect.y + UI.scaleXY({ x: 0, y: 15 }).y,
        }

        Mouse.setPosition(clickAt.x, clickAt.y)
    }
})

let down3 = false
Keyboard.on('keyup', e => {
    if (e.lowerKey === '3') {
        down3 = false
    }
})
Keyboard.on('keydown', e => {
    if (e.lowerKey === '3') {
        down3 = true
    }
})

// Always restore automation control when 3 is pressed and mousedown (drawing automation)
Mouse.on('mouseup', event => {
    if (event.button === 0 && down3)  {
        Bitwig.sendPacket({type: 'action', data: 'restore_automation_control'})
    }
})

Mod.registerAction({
    id: 'set-automation-value',
    defaultSetting: {
        keys: ['NumpadEnter']
    },
    contexts: ['-browser'],
    description: 'Focuses the automation value field in the inspector for quickly setting value of selected automation.',
    action: async () => {
        Mod.runAction('focusArranger')
        await Mouse.click(0, UI.bwToScreen({
            x: 140,
            y: 140,
            Meta: true,
            returnAfter: true
        }))
        Mod.setEnteringValue(true)
    }
})

Mod.registerAction({
    id: 'set-automation-position',
    defaultSetting: {
        keys: ['Control', 'NumpadEnter']
    },
    contexts: ['-browser'],
    description: 'Focuses the automation position field in the inspector for quickly setting position of selected automation.',
    action: async () => {
        Mod.runAction('focusArranger')
        await Mouse.click(0, UI.bwToScreen({
            x: 140,
            y: 120,
            Meta: true,
            returnAfter: true
        }))
        Mod.setEnteringValue(true)
    }
})