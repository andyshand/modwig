


const { spawn } = require('child_process')

const proc = spawn(`npm`, [`run`, process.env.NEW_USER ? `start:new_user` : `start:quiet`], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
})
proc.on('message', function (event) {
    if (event.type === 'crash') {
        proc.send('restart')
    } else if (event.type === 'exit') {
        proc.send('restart')
    } else {
        console.log(event)
    }
})