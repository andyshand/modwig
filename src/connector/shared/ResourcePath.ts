export function getResourcePath(resource = '') {
    if (process.env.NODE_ENV === 'dev') {
        return '/Users/andrewshand/Documents/Github/electron-quick-start-typescript/extraResources' + resource
    } else {
        return process.resourcesPath + resource
    }
}
