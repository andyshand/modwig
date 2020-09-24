const fs = require('fs')
const path = require('path')
const homedir = require('os').homedir();

const controllerSrcFolder = path.join(__dirname, 'controller-script')
const controllerDestFolder = path.join(homedir, 'Documents', 'Bitwig Studio', 'Controller Scripts', 'Bitwig Enhancement Suite')

if (!fs.existsSync(controllerDestFolder)) {
    fs.mkdirSync(controllerDestFolder)
}

for (const file of fs.readdirSync(controllerSrcFolder)) {
    fs.copyFileSync(path.join(controllerSrcFolder, file), path.join(controllerDestFolder, file))
}