const { Mouse } = require('bindings')('bes')

export function returnMouseAfter(cb: Function)  {
    const { x, y } = Mouse.getPosition();
    cb()
    Mouse.setPosition(x, y)
}