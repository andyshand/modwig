export const logWithTime = (...args) => {
    if (process.env.NO_LOG) {
        return
    }
    const d = new Date()
    const pad0 = input => ('0' + input).substr(-2)
    console.log(`${d.getHours()}:${pad0(d.getMinutes())}:${pad0(d.getSeconds())}:`, ...args)
}