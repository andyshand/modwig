/**
 * @name Browser Autocorrect
 * @id browser-autocorrect
 * @description Press tab to correct common spelling errors to account for Bitwig's nitpicky search
 * @category browser
 */

let textSoFar = ''
let cursor = 0
let selectAll = false

Bitwig.on('browserOpen', ({isOpen}, prev) => {
    if (!prev && isOpen)  {
        textSoFar = ''
        cursor = 0
        selectAll = true
    }
})

let common = [
    'polysynth',
    'replacer',
    'phase-4',
    'fm-4',
    'audio receiver',
    'note receiver',
    'audio sidechain',
    'adsr',
    'real-time',
    'steps',
    'ahdsr',
    '4-stage',
    'expressions',
    'note length',
    'note latch',
    'note pitch shifter',
    'note velocity',
    'bit-8'
]
let commonSet = new Set(common)

const getLetters = (device, trim) => {
    let out = new Set()
    for (const char of device.slice(0, trim)) {
        out.add(char)
    }
    return out
}

const checkSpelling = () => {
    if (commonSet.has(textSoFar)) {
        return
    }
    let lowestMatch = null
    let lowestScore = 999
    for (const device of common) {
        let count = 0
        const letters = getLetters(device, textSoFar.length)
        for (const char of letters) {
            count += textSoFar.indexOf(char) >= 0 ? 1 : 0
        }
        const score = Math.abs(letters.size - count) + (Math.abs(device.length - textSoFar.length) * .2)
        if (score < lowestScore) {
            lowestScore = score
            lowestMatch = device
        }
    }
    if (lowestMatch && Bitwig.isActiveApplication()) {
        Keyboard.keyPress('a', { Meta: true })
        for (const char of lowestMatch) {
            if (!Bitwig.isActiveApplication()) {
                return
            }
            Keyboard.keyPress(char.replace(' ', 'Space'))
        }
        return
    }
}

Keyboard.on('keydown', whenActiveListener(event => {
    let { Meta, Shift, Control, Alt, lowerKey } = event
    if (lowerKey === 'Space') {
        lowerKey = ' '
    }
    if (Bitwig.isBrowserOpen) {
        if (lowerKey === 'a' && event.Meta) {
            selectAll = true
        } else {
            if (lowerKey === 'ArrowLeft') {
                if (selectAll) {
                    cursor = 0
                } else {
                    cursor = Math.max(0,cursor - 1)
                }
            } else if (lowerKey === 'ArrowRight') {
                if (selectAll) {
                    cursor = textSoFar.length
                } else {
                    cursor = Math.min((cursor + 1), textSoFar.length)
                }
            } else if (lowerKey === 'Backspace') {
                if (selectAll) {
                    cursor = 0
                    textSoFar = ''
                } else {
                    cursor = Math.max(0,cursor - 1)
                    textSoFar = textSoFar.slice(0, cursor) + textSoFar.slice(cursor + 1)
                }
            } else if (lowerKey === 'Delete') {
                if (selectAll) {
                    cursor = 0
                    textSoFar = ''
                } else {
                    cursor = Math.max(0,cursor - 1)
                    textSoFar = textSoFar.slice(0, cursor + 1) + textSoFar.slice(cursor + 2)
                }
            } else if (lowerKey.length === 1 && !(Meta || Shift || Control || Alt)) {
                if (selectAll) {
                    cursor = 0
                    textSoFar = ''
                } 
                textSoFar = textSoFar.slice(0, cursor) + lowerKey + textSoFar.slice(cursor)
                cursor += 1
                log(textSoFar)
            } else if (lowerKey === 'Tab') {
                checkSpelling()
            } 
            selectAll = false
        }
    }
}))