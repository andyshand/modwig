const path = require('path')
import { promises as fs } from 'fs'
import { app } from 'electron'
import { createDirIfNotExist } from '../core/Files'
const isRenderer = require('is-electron-renderer')

export const basePath = isRenderer ? '' : path.join(app.getPath('appData'), 'modwig')
export const sqlitePath = isRenderer ? '' : path.join(basePath, 'db.sqlite')
export const sqliteBackupPath = isRenderer ? '' : path.join(basePath, 'backups')
export const storagePath = isRenderer ? '' : path.join(basePath, 'files')

const createFolders = async () => {
    await createDirIfNotExist(app.getPath('appData'))
    await createDirIfNotExist(basePath)
    await createDirIfNotExist(storagePath)
    await createDirIfNotExist(sqliteBackupPath)
}

if (!isRenderer) {
    createFolders()
}