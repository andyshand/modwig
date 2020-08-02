interface Event {
    type: string
}
interface KeyboardEvent extends Event {
    type: 'keydown' | 'keyup'
    keycode: string
    metaKey: boolean
    shiftKey: boolean
    optionKey: boolean
}
interface MouseEvent extends Event {
    type: 'mouseup' | 'mousedown',
    screenX: number,
    screenY: number
}
type EventHandler = (event: Event) => void
const listeners: {
    type: string,
    func: EventHandler
}[] = []

export function addGlobalEventListener(type: string, handler: EventHandler) {
    listeners.push({
        type,
        func: handler
    })
}

