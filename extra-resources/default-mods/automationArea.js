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
    let { automationShown, collapsed } = await Db.getTrackData(track)
    const { data: { childCount } } = await Bitwig.sendPacketPromise({
        type: 'show-automation.automation-area.modwig', 
        data: { all }
    })
    console.log(`Automation already shown for track (${track}): ${automationShown}`)
    console.log(`Child count is ${childCount}`)

    if (automationShown) {
        // No fancy stuff necessary
        if (childCount > 0 && !collapsed) {
            // Need to run twice for group tracks
            Bitwig.runAction([
                `toggle_${all ? 'existing_' : ''}automation_shown_for_selected_tracks`
            ])
        }
        await Db.setTrackData(track, {
            automationShown: false
        })
    } else {
        let collapsedNow = true
        if (childCount > 0) {        
            // Ensure if shift was down, we pretend it's up for our keys to work as expected
            Keyboard.keyUp('Shift')
            const { data } = await Bitwig.sendPacketPromise({
                type: 'show-automation-1.automation-area.modwig',
                data: { all }
            })

            // Only need to worry about child tracks if the group is expanded
            if (!data.collapsed) {
                let actions = []
                for (let i = 0; i < childCount; i++) {
                    actions.push(`Extend selection range to next item`)
                }
                Bitwig.runAction([
                    ...actions,
                    `Extend selection range to previous item`,
                    `toggle_${all ? 'existing_' : ''}automation_shown_for_selected_tracks`,
                    'Select\ first\ item',
                    `Select previous track`
                ])
            }
            collapsedNow = data.collapsed
        }
        await Db.setTrackData(track, {
            automationShown: true,
            collapsed: collapsedNow
        })
    }
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