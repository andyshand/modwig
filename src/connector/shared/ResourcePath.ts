const isRenderer = require('is-electron-renderer')
const path = require("path")

export function getResourcePath(resource = '') {
    let out = ''
    const isDev = (isRenderer ? require('electron').remote.process : process).env.NODE_ENV === 'dev'
    if (isDev) {
        out = (isRenderer ? `file://` : ``) + path.join(process.cwd(), 'extra-resources', resource)
    } else {
        out = (isRenderer ? `file://` : ``) + `${process.resourcesPath}/app/extra-resources${resource}`
    }
    return out
}
