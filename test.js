var bes = require('bindings')('bes')

var obj = new bes.BESRect(6777, 1, 2, 3);
console.log(obj.x)
console.log(obj.y)
console.log(obj.w)
console.log(obj.h)