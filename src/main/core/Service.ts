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

    /**
     * Try not to run any long-running tasks in activate as this will slow down app startup and
     * make it unresponsive
     */
    abstract async activate()
}

/**
 * Creates a shared instance of a service and runs
 * its "activate" function
 */
export async function registerService<T>(service: Function) : Promise<T> {
    const instance = new (service as any)()
    servicesByName[service.name] = instance
    const res = instance.activate()
    if (res?.then) {
        await res
    }
    return instance;
}

export function getService<T>(name: string) : T {
    return servicesByName[name] as any
}