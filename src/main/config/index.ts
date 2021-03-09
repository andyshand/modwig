const path = require('path')
import { promises as fs } from 'fs'
import { app } from 'electron'
import { createDirIfNotExist, rmRfDir } from '../core/Files'
const isRenderer = require('is-electron-renderer')
const newUser = !!process.env.NEW_USER

export const basePath = isRenderer ? '' : path.join(app.getPath('appData'), newUser ? `modwig-temp` : `modwig`) 
export const sqlitePath = isRenderer ? '' : path.join(basePath, 'db.sqlite')
export const sqliteBackupPath = isRenderer ? '' : path.join(basePath, 'backups')
export const storagePath = isRenderer ? '' : path.join(basePath, 'files')

const createFolders = async () => {
    if (newUser && process.env.NEW_USER_CLEAN) {
        await rmRfDir(basePath)
    }

    await createDirIfNotExist(app.getPath('appData'))
    await createDirIfNotExist(basePath)
    await createDirIfNotExist(storagePath)
    await createDirIfNotExist(sqliteBackupPath)
}

if (!isRenderer) {
    createFolders()
}