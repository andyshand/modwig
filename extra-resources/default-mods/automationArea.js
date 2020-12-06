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