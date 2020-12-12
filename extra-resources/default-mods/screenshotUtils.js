/**
 * @name Screenshot Utils
 * @id screenshot-utils
 * @description Various hotkeys for getting the color of pixels onscreen
 * @category global
 */

 Mod.registerAction({
     title: 'Show pixel color at mouse position',
     id: 'show-pixel-color',
     description: 'Shows a popup message with the hex code of the pixel at the current cursor position',
     defaultSetting: {
        keys: ["F12"]
     },
     action: () => {
        const rect = {
            x: 0,
            y: 0,
            ...MainDisplay.getDimensions(),
        }
        log(rect)
        const shot = new Screenshot(rect)
        const mousePos = Mouse.getPosition()
        // Bitwig.showMessage('hi')
        // Bitwig.showMessage(`Screenshot ${shot}`)
        Bitwig.showMessage(`Color at ${mousePos.x}, ${mousePos.y}: ${shot.colorAt({x: 0, y: 0})}`)
     }
 })