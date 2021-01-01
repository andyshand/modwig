
const { spawn } = require('child_process')

let process

async function restart() {
    try {
        if (process) {
            process.kill()
        }
        process = spawn(`npm`, [`run`, `start:quiet`], {
            // stdio: ['inherit', 'inherit', 'inherit'] 
        })
        function onOutput(data) {
            // process.stdout.write(data.toString())
            const str = data.toString().trim()
            console.log(str)
            if (str.indexOf('clean exit - waiting for changes before restart') >= 0) {
                restart()
            }
        }
        process.stdout.on('data', onOutput);
        process.stderr.on('data', onOutput);
        process.on('close', restart);
    } catch (e) {
        console.error(e)
    }
}

restart()