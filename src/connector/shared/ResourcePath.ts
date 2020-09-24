const isRenderer = require('is-electron-renderer')

export function getResourcePath(resource = '') {
    let out = ''
    const isDev = (isRenderer ? require('electron').remote.process : process).env.NODE_ENV === 'dev'
    if (isDev) {
        out = (isRenderer ? `file://` : ``) + '/Users/andrewshand/Documents/Github/electron-quick-start-typescript/extra-resources' + resource
    } else {
        out = (isRenderer ? `file://` : ``) + `${process.resourcesPath}/app/extra-resources${resource}`
    }
    return out
}
