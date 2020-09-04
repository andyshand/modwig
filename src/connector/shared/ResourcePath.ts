export function getResourcePath(resource = '') {
    let out = ''
    if (process.env.NODE_ENV === 'dev') {
        out = '/Users/andrewshand/Documents/Github/electron-quick-start-typescript/extra-resources' + resource
    } else {
        out = `${process.resourcesPath}/app/extra-resources${resource}`
    }
    console.log(out)
    return out
}
