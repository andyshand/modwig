const path = require('path')
import { promises as fs } from 'fs'
import { app } from 'electron'
const isRenderer = require('is-electron-renderer')

export const basePath = isRenderer ? '' : path.join(app.getPath('appData'), 'modwig')
export const sqlitePath = isRenderer ? '' : path.join(basePath, 'db.sqlite')
export const sqliteBackupPath = isRenderer ? '' : path.join(basePath, 'backups')
export const storagePath = isRenderer ? '' : path.join(basePath, 'files')

const createIfNotExist = async dir => {
    if (!(await fs.stat(dir)).isDirectory()) {
        await fs.mkdir(dir)
    }
}

const createFolders = async () => {
    await createIfNotExist(app.getPath('appData'))
    await createIfNotExist(basePath)
    await createIfNotExist(storagePath)
    await createIfNotExist(sqliteBackupPath)
}

if (!isRenderer) {
    createFolders()
}