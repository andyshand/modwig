#!/usr/bin/env node

const fs = require('fs')
const package = require('../package.json')
const nodeAbi = require('node-abi')

package.iohook.targets = [
    'node-' + nodeAbi.getAbi('12.14.1', 'node'),
    'electron-' + nodeAbi.getAbi(/[0-9\.]+/.exec(package.devDependencies.electron)[0], 'electron')
]

fs.writeFileSync('./package.json', JSON.stringify(package, null, 2))