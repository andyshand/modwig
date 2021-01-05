
const { spawn } = require('child_process')

let proc

async function restart() {
    try {
        if (proc) {
            proc.kill()
        }
        proc = spawn(`npm`, [`run`, process.env.NEW_USER ? `start:new_user` : `start:quiet`], {
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
        proc.stdout.on('data', onOutput);
        proc.stderr.on('data', onOutput);
        proc.on('close', restart);
    } catch (e) {
        console.error(e)
    }
}

restart()