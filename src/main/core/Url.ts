export function url(path) {
    if (process.env.NODE_ENV === 'dev')     {
        return 'http://localhost:8080' + path
    } else {
        return `${process.resourcesPath}/app/dist/${path}`
    }
}