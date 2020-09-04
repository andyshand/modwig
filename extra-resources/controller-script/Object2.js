Object2 = {}
Object2.values = function(obj) {
    var out = []
    for (var k in obj) {
        out.push(obj[k])
    }
    return out
}