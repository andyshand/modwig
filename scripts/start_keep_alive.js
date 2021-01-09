#!/usr/bin/env node
/**
 * Script to keep process alive even if it crashes
 */

const { execSync, fork } = require('child_process')

const env = process.env
env.NODE_ENV = 'dev'
env.QUIET_START = 'true'

const proc = fork(execSync('which nodemon').toString().trim(), [
    `--signal`, `SIGHUP`, 
    `--watch`, `./dist`, 
    `--exec`, `npm run electron`
], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
})

proc.on('message', function (event) {
    if (event.type === 'crash') {
        proc.send('restart')
    } else if (event.type === 'exit') {
        proc.send('restart')
    } else {
        // console.log(event)
    }
})