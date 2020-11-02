export function url(path) {
    if (process.env.NODE_ENV === 'dev')     {
        return 'http://localhost:8081' + path
    } else {
        return `file://${process.resourcesPath}/app/dist/index.html${path.substr(1)}`
    }
}