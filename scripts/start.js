#!/usr/bin/env node
var nodemon = require('nodemon');
const execSync = require('child_process').execSync
execSync('npm run buildc:dev', {
    stdio: 'inherit'    
})

nodemon({
    exec: 'npm run electron',
    watch: `./dist`,
    env: {
        ...process.env,
        NODE_ENV: 'dev'
    }
})

nodemon.on('start', function () {
    console.log('App has started');
}).on('quit', function () {
    console.log('App has quit');
    process.exit();
}).on('restart', function (files) {
    console.log('App restarted due to: ', files);
})