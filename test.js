var bes = require('bindings')('bes')

var Keyboard = bes.Keyboard;
var id = Keyboard.addEventListener('keydown', event => {
    console.log(event)
})

setInterval(function() {
    // making sure we keep running
}, 1000 * 5);