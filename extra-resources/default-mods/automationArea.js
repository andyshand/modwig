/**
 * @name Automation Area Shortcuts
 * @id automation-area.modwig
 * @description Adds various shortcuts for showing/hiding automation in the arranger.
 * @category arranger
 */

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
    Bitwig.makeMainWindowActive()
    // Focus track header to arrow keys work as expected
    Bitwig.runAction(`focus_track_header_area`)
    const track = Bitwig.currentTrack
    let { automationShown } = await Db.getTrackData(track)
    const { data: { childCount } } = await Bitwig.sendPacketPromise({
        type: 'show-automation.automation-area.modwig', 
        data: { all }
    })
    console.log(`Automation already shown for track (${track}): ${automationShown}`)
    if (automationShown) {
        // No fancy stuff necessary
        if (childCount > 0) {
            // Need to run twice for group tracks
            Bitwig.runAction([
                `toggle_${all ? 'existing_' : ''}automation_shown_for_selected_tracks`
            ])
        }
        await Db.setTrackData(track, {
            automationShown: false
        })
    } else {
        if (childCount > 0) {        
            // Ensure if shift was down, we pretend it's up for our keys to work as expected
            Keyboard.keyUp('Shift')

            // Navigate down to first child
            Keyboard.keyPress('ArrowDown')

            // Select all child tracks
            Keyboard.keyDown('Shift')
            for (let i = 0; i < childCount; i++) {
                Keyboard.keyPress('ArrowDown', { Shift: true })
            }
            Keyboard.keyUp('Shift')
            
            // await wait(1000)
            // Hide automation for newly selected tracks
            await Bitwig.runAction([
                `toggle_${all ? 'existing_' : ''}automation_shown_for_selected_tracks`,
                'Select\ first\ item',
                `Select previous track`
            ])
        }
        await Db.setTrackData(track, {
            automationShown: true
        })
    }
}

Mod.registerAction({
    title: "Show Automation for Current Track",
    id: "show-current-automation.automation-area.modwig",
    category: "arranger",
    description: `Hides automation for all tracks in the arranger.`,
    defaultSetting: {
        keys: ["A"]
    },
    action: showAutomationImpl.bind(null, false)
})

Mod.registerAction({
    title: "Show All Automation for Current Track",
    id: "show-all-current-automation.automation-area.modwig",
    category: "arranger",
    description: `Hides automation for all tracks in the arranger.`,
    defaultSetting: {
        keys: ["Shift", "A"]
    },
    action: showAutomationImpl.bind(null, true)
})