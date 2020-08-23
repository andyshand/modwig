class EventEmitter<T> {
    nextId = 0
    listenersById: {[id: number]: (data: T) => void} = {}
    listen(cb: (data: T) => void) {
        let nowId = this.nextId++
        this.listenersById[nowId] = cb
    }
    emit(value: T) {
        for (const listener of Object.values(this.listenersById)) {
            listener(value)
        }
    }
}

export function makeEvent<T>() : EventEmitter<T> {
    return new EventEmitter()
}

const servicesByName: {[name: string]: BESService} = {}

export abstract class BESService {
    constructor(public readonly name: string) {}

    abstract activate()
}

/**
 * Creates a shared instance of a service and runs
 * its "activate" function
 */
export function registerService(service: Function) {
    const instance = new (service as any)()
    servicesByName[service.name] = instance
    instance.activate()
    return instance;
}

export function getService(name: string) : any {
    return servicesByName[name]
}