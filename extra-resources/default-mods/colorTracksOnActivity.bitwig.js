/**
 * @name Color Tracks on Activity
 * @id color-tracks-on-activity
 * @description Gives more control over auto arm to disable while mods are doing their thing.
 * @category global
 * @noReload
 */

let threshold = 40
let isRecording = false
transport.isArrangerRecordEnabled().addValueObserver(value => {
    isRecording = value
})

const colors = {
    ORANGE: [1, 0.5137255191802979, 0.24313725531101227],
    RED: [0.8509804010391235, 0.18039216101169586, 0.1411764770746231],
    YELLOW: [0.8941176533699036, 0.7176470756530762, 0.30588236451148987],
    BRIGHT_YELLOW: [1, 1, 0.47843137383461],
    LIGHT_BLUE: [0.2666666805744171, 0.7843137383460999, 1],
    BROWN: [0.6392157077789307, 0.4745098054409027, 0.26274511218070984],
    DARK_GREY: [0.3294117748737335, 0.3294117748737335, 0.3294117748737335],
    LIGHT_GREY: [0.47843137383461, 0.47843137383461, 0.47843137383461],
    BG_GREY: [0.47843137383461, 0.47843137383461, 0.47843137383461],
    WHITE: [1, 1, 1],
    BLACK: [0, 0, 0],
    // TRANSPARENT: Color.nullColor(),
    MAUVE: [0.8509804010391235, 0.21960784494876862, 0.4431372582912445],
    PURPLE: [0.5843137502670288, 0.2862745225429535, 0.7960784435272217]
}

const makeMatcher = (tests) => {
    return {
        test: input => {
            const lowerI = input.toLowerCase()
            for (const test of tests) {
                if (lowerI.indexOf(test) >= 0) {
                    return true
                }
            }
            return false
        }
    }
}

const sets = [
    [
        makeMatcher([
            'kick',
            'kik',
            'snare'
        ]), 
        colors.BRIGHT_YELLOW
    ],
    [
        makeMatcher([
            'hat',
            'kit',
            'addictive'
        ]), 
        colors.BROWN
    ],
    [
        makeMatcher([
            'drums',
            'tom',
            'clap',
            'rim',
            'conga',
            'bongo',
            'shaker',
            'click',
            'tamb',
            '505',
            '606',
            '707',
            '808',
            '909',
            'perc',
        ]), 
        colors.YELLOW
    ],
    [
        makeMatcher([
            'keys',
            'lead',
            'arp',
            'phone',
            'xylo',
            'glock',
            'vibra'
        ]),
        colors.PURPLE
    ],
    [
        makeMatcher([
            'pad',
            'chord',
            'choir',
            'string',
            'orchestra',
            'staccato',
            'kontakt',
            'legato'
        ]),
        colors.MAUVE
    ],
    [
        makeMatcher([
            'guit'
        ]),
        colors.ORANGE
    ],
    [
        makeMatcher([
            'bass',
            'sub',
            'reese'
        ]),
        colors.RED
    ],
    [
        makeMatcher([
            'vox',
            'vocals',
            'backing'
        ]),
        colors.LIGHT_BLUE
    ]
]

let cachedDefaultColorsByTrackName = {}
let lastKnownColorByTrackName = {}

function getTrackDefaultColor(t) {
    let name = t.name().get()
    if (name in cachedDefaultColorsByTrackName) {
        return cachedDefaultColorsByTrackName[name]
    }
    // log(name)
    for (const [regexp, color] of sets) {
        // log(regexp)
        // log(color)
        if (regexp.test(name)) {
            // log('matched!' + color)
            cachedDefaultColorsByTrackName[name] = color
            return color
        }
    }
    cachedDefaultColorsByTrackName[name] = colors.BLACK
    return colors.BLACK
}

function colorsSame(a, b) {
    same = a[0] === b[0]
        && a[1] === b[1]
        && a[2] === b[2]
}

function setColorIfNotAlready(t, color, trackName) {
    if (!(trackName in lastKnownColorByTrackName) || !colorsSame(color, lastKnownColorByTrackName[trackName])) {
        t.color().set(
            color[0],
            color[1],
            color[2]
        )
        lastKnownColorByTrackName[t.name().get()] = color
    }
}

let paused = false
let selectedTrackName = ''
cursorTrack.name().addValueObserver(name => {
    selectedTrackName = name
})

tracks.forEach((t, i) => {
    let trackName = t.name().get()
    t.name().addValueObserver(name => {
        trackName = name
    })

    t.addVuMeterObserver(128, -1, true, val => {
        if (!Mod.enabled || paused || isRecording) {
            return
        }
        
        if (trackName === selectedTrackName || val > threshold) {
            const defaultColor = getTrackDefaultColor(t)
            setColorIfNotAlready(t, defaultColor, trackName)
        } else {
            setColorIfNotAlready(t, colors.BG_GREY, trackName)
        }
    })
})

packetManager.listen('color-tracks-on-activity/pause', () => {
    paused = true
    // if (Mod.enabled) {
    //     showMessage('Pausing color changes while undoing/redoing')
    // }
})
packetManager.listen('color-tracks-on-activity/unpause', () => {
    // if (paused && Mod.enabled) {
    //     showMessage('Resuming color changes')
    // }
    paused = false
})
packetManager.listen('color-tracks-on-activity/threshold', packet => {
    threshold = Math.min(128, Math.max(0, threshold + packet.data))
    showMessage("Threshold set to " + Math.round((threshold / 128) * 100) + '%')
})

// cursorTrack.color().markInterested()
// cursorTrack.color().addValueObserver(() => {
//     log(cursorTrack.color().red())
//     log(cursorTrack.color().green())
//     log(cursorTrack.color().blue())
// })