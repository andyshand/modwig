const package = require('../package.json')

const out = {
    version: package.version,
    message: process.argv[2],
    link: 'https://andyshand.com/files/producer-tools-app.zip',
    darwin: 'https://andyshand.com/files/producer-tools-app.zip',
    win32: 'https://andyshand.com/files/producer-tools-windows.zip'
}

process.stdout.write(JSON.stringify(out))