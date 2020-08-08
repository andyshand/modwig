const path = require('path')
const fs = require('fs')
import { app } from 'electron'
const isRenderer = require('is-electron-renderer')

const createIfNotExist = dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
}

export const basePath = isRenderer ? '' : path.join(app.getPath('appData'), 'bitwig-enhancement-suite')
export const sqlitePath = isRenderer ? '' : path.join(basePath, 'db.sqlite')
export const sqliteBackupPath = isRenderer ? '' : path.join(basePath, 'backups')
export const storagePath = isRenderer ? '' : path.join(basePath, 'files')

if (!isRenderer) {
    createIfNotExist(app.getPath('appData'))
    createIfNotExist(basePath)
    createIfNotExist(storagePath)
    createIfNotExist(sqliteBackupPath)
}