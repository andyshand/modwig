/**
 * @name Close Apps While Active
 * @id close-apps-while-active
 * @description Close specific apps while active in Bitwig Studio, reopening after a period of inactivity
 * @category global
 */

const util = require('util');
const exec = util.promisify(require('child_process').exec)

const inactivityThresholdMS = 1000 * 60 * 60
let inactiveTimeout
let isOpen = true // Might be false but no harm in quitting an already quit app to start with

const runTerminal = async cmd => {
    log(`Running "${cmd}"`)
    const { stdout, stderr } = await exec(cmd)
    if (stdout) log(stdout)
    if (stderr) error(stderr)
}

const apps = [
    'Backup and Sync',
    'Rectangle',
    'Wacom Tablet Driver'
]

Mod.interceptPacket('transport/play-start', undefined, async () => {
    if (isOpen) {
        for (const app of apps) {
            runTerminal(`osascript -e 'quit app "${app}"'`)
        }
    }
    isOpen = false
    clearTimeout(inactiveTimeout)
    inactiveTimeout = setTimeout(() => {
        if (Mod.isActive) {
            // Possible this mod was restarted but timeout was still scheduled
            for (const app of apps) {
                runTerminal(`osascript -e 'open app "${app}"'`)
            }
            isOpen = true
        }
    }, inactivityThresholdMS)
})

Mod.onExit(() => {
    clearTimeout(inactiveTimeout)
})