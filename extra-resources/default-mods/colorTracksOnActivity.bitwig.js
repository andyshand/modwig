/**
 * @name Auto-color tracks
 * @id color-tracks-on-activity
 * @description Automatically colour tracks based on their names
 * @category global
 */

const colors = {
    ORANGE: [1, 0.5137255191802979, 0.24313725531101227],
    RED: [0.8509804010391235, 0.18039216101169586, 0.1411764770746231],
    YELLOW: [0.8941176533699036, 0.7176470756530762, 0.30588236451148987],
    BRIGHT_YELLOW: [1, 1, 0.47843137383461],
    LIGHT_BLUE: [0.2666666805744171, 0.7843137383460999, 1],
    BLUE: [0, 0.6000000238418579, 0.8509804010391235],
    BROWN: [0.6392157077789307, 0.4745098054409027, 0.26274511218070984],
    GREYISH: [
        0.5254902243614197,
        0.5372549295425415,
        0.6745098233222961
    ],
    GREEN: [
        0.24313725531101227,
        0.7333333492279053,
        0.3843137323856354
    ],
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
            'instr'
        ]), 
        colors.BLUE
    ],
    [
        makeMatcher([
            'drum'
        ]), 
        colors.GREEN
    ],
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
            'tom',
            'clap',
            'rim',
            'conga',
            'bongo',
            'shaker',
            'click',
            'ride',
            'crash',
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
            'piano',
            'keyscape',
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
    cachedDefaultColorsByTrackName[name] = colors.GREYISH
    return colors.GREYISH
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

tracks.forEach((t, i) => {
    t.name().addValueObserver(name => {
        if (Mod.enabled && name && name.length > 0) {
            const defaultColor = getTrackDefaultColor(t)
            setColorIfNotAlready(t, defaultColor, name)
        }
    })
})

// cursorTrack.color().markInterested()
// cursorTrack.color().addValueObserver(() => {
//     showNotification({
//         content: `
//             ${cursorTrack.color().red()},
//             ${cursorTrack.color().green()},
//             ${cursorTrack.color().blue()}
//         `,
//         copy: true
//     })
// })