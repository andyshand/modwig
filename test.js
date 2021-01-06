const { UI } = require('bindings')('bes')

UI.updateUILayout({
    scale: 1.25
})

const window = new UI.BitwigWindow({})
setInterval(() => {
    console.log(window.getArrangerTracks())
}, 1000)