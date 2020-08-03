export function getResourcePath() {
    if (process.env.NODE_ENV === 'dev') {
        return '/Users/andrewshand/Documents/Github/electron-quick-start-typescript/extraResources'
    } else {
        return process.resourcesPath
    }
}
