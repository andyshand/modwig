const { Keyboard, Mouse, Bitwig } = require('bindings')('bes')

export function returnMouseAfter(cb: Function)  {
    const { x, y } = Mouse.getPosition();
    cb()
    Mouse.setPosition(x, y)
}

export function whenActiveListener(cb: Function)  {
    return (...args) => Bitwig.isActiveApplication() && cb(...args)
}