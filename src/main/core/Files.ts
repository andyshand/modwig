import { promises as fs } from 'fs'

export async function createDirIfNotExist(path: string) {
    try {
        await fs.stat(path)
    } catch (e) {
        await fs.mkdir(path)
    }
}

export async function exists(path: string) {
    try {
        await fs.access(path)
        return true
    } catch (e) {
        return false
    }
}