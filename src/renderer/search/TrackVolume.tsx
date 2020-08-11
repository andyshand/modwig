import React from 'react'
import { styled } from 'linaria/react'
import { send, getTrackById } from '../bitwig-api/Bitwig'
import { clamp } from '../../connector/shared/Math'
const { app } = require('electron').remote

interface TrackVolumeProps extends React.ComponentProps<any> {
    track: any
}

const HoverStyle = `
    box-shadow: inset 0 3px 0 0 #EA6A10;
`
const TooltipWrap = styled.div`
    opacity: ${(props: any) => props.visible ? 1 : 0};
    position: absolute;
    right: 113%;
    top: 50%;
    font-size: .9em;
    background: #444;
    border: 1px solid #CCC;
    white-space: nowrap;
    padding: .4em .5em;
    transform: translateY(-50%);
    pointer-events: none;
    user-select: none;
`
const Tooltip = ({volume, ...rest}) => {
    return <TooltipWrap {...rest}>
        {volume}
    </TooltipWrap>
}
const VolumeLevel = styled.div`
    top: ${(props: any) => Math.ceil((1 - props.volume) * 100) - 5 + '%'};
    bottom: 0;
    left: 0;
    background: #502E13;
    box-shadow: inset 0 1px 0 0 #402814, inset 0 2px 0 0 #EA6A10, inset 0 3px 0 0 #402814;
    right: 0;
    position: absolute;
`
const VolumeWrap = styled.div`
    position: relative;
    border: 1px solid #222;
    height: 1.4rem;
    width: 1.3rem;
    cursor: ns-resize;
    border-radius: .2em;
    background: #222;
    -webkit-app-region: no-drag;
    &:hover {
        ${VolumeLevel as any} {
            ${HoverStyle}
        }
    }
`
    // ${(props: any) => props.mouseDown ? `
    //     ${VolumeLevel} {
    //         ${HoverStyle}
    //     }    
    // ` : ``}
const globalMouseMove = {
    target: null,
    setActiveTarget(target: {onGlobalMouseMove: Function, onGlobalMouseUp: Function}) {
        globalMouseMove.target = target
    }
}
window.addEventListener('mousemove', event => {
    if (globalMouseMove.target) {
        globalMouseMove.target.onGlobalMouseMove(event)
    }
})
window.addEventListener('mouseup', event => {
    if (globalMouseMove.target) {
        globalMouseMove.target.onGlobalMouseUp(event)
    }
})

app.on('browser-window-blur', () => {
    // Ensure we don't receive any mouse move events while BES is hidden
    delete globalMouseMove.target

    // Also just hide the whole app
    app.hide()
})

export class TrackVolume extends React.Component<TrackVolumeProps> {
    state = {
        localVolume: 0,
        mouseDown: false
    }
    currTrack = null 

    componentWillReceiveProps(nextProps) {
        if (!this.currTrack || nextProps.track.id !== this.currTrack.id) {
            this.setState({localVolume: nextProps.track.volume})
            this.currTrack = nextProps.track
        }
    }
    componentDidMount() {
        this.componentWillReceiveProps(this.props)
    }
    onMouseDown = event => {
        this.setState({mouseDown: true})
        globalMouseMove.setActiveTarget(this)
    }
    onGlobalMouseUp = event => {
        this.setState({mouseDown: false})
    }
    onGlobalMouseMove = event => {
        if (!this.state.mouseDown) {
            return
        }
        const { movementY, shiftKey } = event
        const { track } = this.props
        const newVol = clamp(this.state.localVolume + (-movementY * (shiftKey ? 0.0015 : 0.005)), 0, 1)
        this.setState({localVolume: newVol})
        send({
            type: 'track/update',
            data: {
                name: track.name,
                volume: newVol
            }
        })
    }
    onDoubleClick = event => {
        event.stopPropagation() // stop search view from confirming result
        const defaultVol = 0.7937005259840999 // TODO customisable, or read settings somehow
        const { track } = this.props
        this.setState({localVolume: defaultVol})
        send({
            type: 'track/update',
            data: {
                name: track.name,
                volume: defaultVol
            }
        })
    }
    render() {
        const latestTrack = getTrackById(this.props.track.id) // TODO check why this is null sometimes
        return <VolumeWrap mouseDown={this.state.mouseDown} onMouseDown={this.onMouseDown} onDoubleClick={this.onDoubleClick}>
            <Tooltip visible={this.state.mouseDown} volume={latestTrack?.volumeString ?? 0} />
            <VolumeLevel volume={this.state.localVolume} />
        </VolumeWrap>
    }
}