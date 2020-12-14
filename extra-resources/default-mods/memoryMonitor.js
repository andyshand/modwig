/**
 * @name Memory Monitor
 * @id memory-monitor
 * @description Warns on excessive RAM usage (OS X/Linux only)
 * @category global
 */

const util = require('util');
const exec = util.promisify(require('child_process').exec)

Mod.setInterval(async () => {
    const { stdout, stderr } = await exec(`top -l 1 | grep 'Bitwig'`)
    const lines = stdout.split('\n').map(line => line.trim().split(/\s+/)).filter(l => l.length > 0)
    for (const line of lines) {
        const process = line[1]
        if (process) {
            const ram = parseInt(line[7], 10)
            const GB = `${ram / 1000}GB`
            log(`${process} using ${GB}`)
            if (!isNaN(ram) && ram > 16000) {
                Bitwig.showMessage(`Warning: Currently using ${GB} RAM`)
            }
        }
    }
}, 1000 * 60)