export function url(path) {
    if (process.env.NODE_ENV === 'dev')     {
        return 'http://localhost:8080' + path
    } else {
        return `file://${process.resourcesPath}/app/dist/index.html${path.substr(1)}`
    }
}