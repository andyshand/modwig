import { logWithTime } from "../../main/core/Log";

const { Keyboard, Mouse, Bitwig } = require('bindings')('bes')

export async function returnMouseAfter(cb: Function)  {
    const { x, y } = Mouse.getPosition();
    const result = cb()
    if (result && result.then) {
        await result
    }
    // logWithTime(`Returning mouse to ${x}, ${y}`)
    Mouse.setPosition(x, y)
}

export function whenActiveListener(cb: Function)  {
    return (...args) => Bitwig.isActiveApplication() && cb(...args)
}