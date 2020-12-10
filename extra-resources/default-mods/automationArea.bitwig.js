/**
 * @name Automation Area Shortcuts
 * @id automation-area.modwig
 * @description Adds various shortcuts for showing/hiding automation in the arranger.
 * @category arranger
 */

cursorTrack.isGroup().markInterested()
cursorTrack.name().markInterested()
let cursorTrackBank = cursorTrack.createTrackBank(1, 0, 0, false)
cursorTrackBank.channelCount().markInterested()
const firstChild = cursorTrackBank.getTrack(0)
firstChild.exists().markInterested()
firstChild.name().markInterested()
let trackName = ''
let firstChildName = ''
let lastHid = new Date(0)

packetManager.listen('hide-all-automation.automation-area.modwig', (packet) => {
    if (new Date().getTime() - lastHid.getTime() < 5000) {
        // If we press again after a short period of time, assume ALL tracks have automation
        // open, which means toggling twice won't help us
        runAction([
            `toggle_automation_shown_for_all_tracks`
        ])
    } else {
        runAction([
            `toggle_automation_shown_for_all_tracks`, 
            `toggle_automation_shown_for_all_tracks`
        ])
    }
    lastHid = new Date()
})

packetManager.listen('show-automation.automation-area.modwig', (packet) => {
    firstChildName = cursorTrack.isGroup().get() ? firstChild.name().get() : ''
    trackName = cursorTrack.name().get()

    // log(`First track exists: ${firstChild.exists().get()} and name is ${firstChild.name().get()}`)

    const all = packet.data.all
    const automationShown = packet.data.automationShown
    const exclusiveAutomation = packet.data.exclusiveAutomation
    const childCount = cursorTrack.isGroup().get() ? cursorTrackBank.channelCount().get() : 0
    const collapsed = cursorTrack.isGroup().get() ? !globalController.findTrackByName(firstChildName) : true

    // host.showPopupNotification(`shown: ${automationShown} collapsed: ${collapsed} childCount: ${childCount}`)
    if (exclusiveAutomation && !automationShown) {
        // Hide other automation first
        runAction([
            `toggle_automation_shown_for_all_tracks`, 
            `toggle_automation_shown_for_all_tracks`
        ])
    }

    // First show/hide automation for this track
    runAction(`toggle_${all ? 'existing_' : ''}automation_shown_for_selected_tracks`)

    if (childCount === 0 || collapsed) {
        // Non groups or groups with no children need no special children
        return
    }

    if (automationShown) {
        // Hide the automation. More straightforward than showing
        // Need to run twice for group tracks
        runAction([
            `toggle_${all ? 'existing_' : ''}automation_shown_for_selected_tracks`
        ])
    } else {
        // Disable auto-arm while we speed through tracks
        const prev = settings['custom-auto-arm']
        settings['custom-auto-arm'] = false

        runAction([
            `focus_track_header_area`,
            `Select next track`,
            `Extend selection range to last item`,
            `Toggle selection of item at cursor`,
            `toggle_${all ? 'existing_' : ''}automation_shown_for_selected_tracks`,
        ])
        globalController.selectTrackWithName(trackName, false)

        settings['custom-auto-arm'] = prev
    }
})