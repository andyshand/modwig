/**
 * @name Event Test
 * @id event-test
 * @description Outputs messages to logs when specific events are detected
 * @category global
 */

Mouse.on('mouseup', event => {
    Bitwig.showMessage("mouseup: ", JSON.stringify(event))
})
Mouse.on('mousedown', event => {
    Bitwig.showMessage("mousedown: ", JSON.stringify(event))
})