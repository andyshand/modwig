import { promises as fs } from 'fs'
const os = require('os')
const { sep } = require('path')
const tmpDir = os.tmpdir();

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

export async function rmRfDir(path: string) {
    if (!path || path.length === 0 || path === '/') {
        throw new Error('Bad path')
    }
    return (fs.rmdir as any)(path, { recursive: true })
}

export async function filesAreEqual(pathA: string, pathB: string) {
    return (await fs.readFile(pathA)).equals(await fs.readFile(pathB))
}

export function getTempDirectory() {
    // The parent directory for the new temporary directory
    return fs.mkdtemp(`${tmpDir}${sep}`)
}

export function writeStrFile(str: string, path: string) {
    return fs.writeFile(path, str);
}