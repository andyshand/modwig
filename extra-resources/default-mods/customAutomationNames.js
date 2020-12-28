/**
 * @name Rename Automation Lanes
 * @id rename-automation-lanes
 * @description Allows renaming automation lanes
 * @category arranger
 */

// Select track when clicking automation
// Select track when opening automation (w/ mouse)
// Once we know track is selected, we can identify it visually, find automation borders
// We know which track is selected via API connection
// Compare images with saved images to find out which automation lane is which


// Double-click to trigger rename dialog
// Hide and resposition/reopen when scrolling
// Show in new fullscren web window, send over screen relative positions of arranger basically


let pointIntersects = ({x, y}, rect) => {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h
}

function hideOverlay() {

}

/**
 * Optionally provide selected track to prevent fetching data from
 * screenshot again. 
 */
async function repositionAndShowOverlay(selectedTrack = null) {
    if (!selectedTrack) {
        selectedTrack = UI.Arranger.getSelectedTrack()
    }
    if (!selectedTrack) {
        return hideOverlay()
    }

    const data 
    function draw() {

    }

    const automationLanes = selectedTrack.getAutomationLanes()
    const savedData = await Db.getCurrentTrackData()
    let lanesToDraw = []
    for (const lane of automationLanes) {
        drawData.push({
            rect: lane.rect,
            name: savedData[lane.id]
        })
    } 

    UI.Canvas.inject(draw, {

    })
}



// Allow renaming
Mouse.on('doubleClick', async event => {
    const { bitwigX: x, bitwigY: y } = event
    const selectedTrack = UI.Arranger.getSelectedTrack()

    if (selectedTrack && pointIntersects({x, y}, selectedTrack.rect)) {
        const automationLanes = selectedTrack.getAutomationLanes()
        const hit = automationLanes.find(automation => pointIntersects({x, y}, automation.rect))
        if (hit) {
            automation.id // Id would be calculated from screenshot
            const name = await Mod.prompt('Rename automation lane to:')
            if (!name) {
                Bitwig.showMessage('Cancelled')
                return
            }
            const existingData = await Db.getCurrentTrackData()
            Db.setCurrentTrackData({
                ...existingData,
                [automation.id]: name
            })
            Bitwig.showMessage(`Renamed ${automation.id} to ${name}`)
        }
    }
})

// From the WebKit documentation at: 
// http://www.opensource.apple.com/source/WebKit/WebKit-7533.16/chromium/src/mac/WebInputEventFactory.mm
    
    // Of Mice and Men
    // ---------------
    //
    // There are three types of scroll data available on a scroll wheel CGEvent.
    // Apple's documentation ([1]) is rather vague in their differences, and not
    // terribly helpful in deciding which to use. This is what's really going on.
    //
    // First, these events behave very differently depending on whether a standard
    // wheel mouse is used (one that scrolls in discrete units) or a
    // trackpad/Mighty Mouse is used (which both provide continuous scrolling).
    // You must check to see which was used for the event by testing the
    // kCGScrollWheelEventIsContinuous field.
    //
    // Second, these events refer to "axes". Axis 1 is the y-axis, and axis 2 is
    // the x-axis.
    //
    // Third, there is a concept of mouse acceleration. Scrolling the same amount
    // of physical distance will give you different results logically depending on
    // whether you scrolled a little at a time or in one continuous motion. Some
    // fields account for this while others do not.
    //
    // Fourth, for trackpads there is a concept of chunkiness. When scrolling
    // continuously, events can be delivered in chunks. That is to say, lots of
    // scroll events with delta 0 will be delivered, and every so often an event
    // with a non-zero delta will be delivered, containing the accumulated deltas
    // from all the intermediate moves. [2]
    //
    // For notchy wheel mice (kCGScrollWheelEventIsContinuous == 0)
    // ------------------------------------------------------------
    //
    // kCGScrollWheelEventDeltaAxis*
    //   This is the rawest of raw events. For each mouse notch you get a value of
    //   +1/-1. This does not take acceleration into account and thus is less
    //   useful for building UIs.
    //
    // kCGScrollWheelEventPointDeltaAxis*
    //   This is smarter. In general, for each mouse notch you get a value of
    //   +1/-1, but this _does_ take acceleration into account, so you will get
    //   larger values on longer scrolls. This field would be ideal for building
    //   UIs except for one nasty bug: when the shift key is pressed, this set of
    //   fields fails to move the value into the axis2 field (the other two types
    //   of data do). This wouldn't be so bad except for the fact that while the
    //   number of axes is used in the creation of a CGScrollWheelEvent, there is
    //   no way to get that information out of the event once created.
    //
    // kCGScrollWheelEventFixedPtDeltaAxis*
    //   This is a fixed value, and for each mouse notch you get a value of
    //   +0.1/-0.1 (but, like above, scaled appropriately for acceleration). This
    //   value takes acceleration into account, and in fact is identical to the
    //   results you get from -[NSEvent delta*]. (That is, if you linked on Tiger
    //   or greater; see [2] for details.)
    //
    // A note about continuous devices
    // -------------------------------
    //
    // There are two devices that provide continuous scrolling events (trackpads
    // and Mighty Mouses) and they behave rather differently. The Mighty Mouse
    // behaves a lot like a regular mouse. There is no chunking, and the
    // FixedPtDelta values are the PointDelta values multiplied by 0.1. With the
    // trackpad, though, there is chunking. While the FixedPtDelta values are
    // reasonable (they occur about every fifth event but have values five times
    // larger than usual) the Delta values are unreasonable. They don't appear to
    // accumulate properly.
    //
    // For continuous devices (kCGScrollWheelEventIsContinuous != 0)
    // -------------------------------------------------------------
    //
    // kCGScrollWheelEventDeltaAxis*
    //   This provides values with no acceleration. With a trackpad, these values
    //   are chunked but each non-zero value does not appear to be cumulative.
    //   This seems to be a bug.
    //
    // kCGScrollWheelEventPointDeltaAxis*
    //   This provides values with acceleration. With a trackpad, these values are
    //   not chunked and are highly accurate.
    //
    // kCGScrollWheelEventFixedPtDeltaAxis*
    //   This provides values with acceleration. With a trackpad, these values are
    //   chunked but unlike Delta events are properly cumulative.
    //
    // Summary
    // -------
    //
    // In general the best approach to take is: determine if the event is
    // continuous. If it is not, then use the FixedPtDelta events (or just stick
    // with Cocoa events). They provide both acceleration and proper horizontal
    // scrolling. If the event is continuous, then doing pixel scrolling with the
    // PointDelta is the way to go. In general, avoid the Delta events. They're
    // the oldest (dating back to 10.4, before CGEvents were public) but they lack
    // acceleration and precision, making them useful only in specific edge cases.
    //
    // References
    // ----------
    //
    // [1] <http://developer.apple.com/documentation/Carbon/Reference/QuartzEventServicesRef/Reference/reference.html>
    // [2] <http://developer.apple.com/releasenotes/Cocoa/AppKitOlderNotes.html>
    //     Scroll to the section headed "NSScrollWheel events".
    //
    // P.S. The "smooth scrolling" option in the system preferences is utterly
    // unrelated to any of this.