import React from 'react'

export class Canvas {

    canvasRef = React.createRef<HTMLCanvasElement>()

    render() {
        return <canvas ref={this.canvasRef}>canvas</canvas>
    }
}