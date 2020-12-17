import React from 'react'
import { styled } from 'linaria/react'

const MarkerItem = styled.div`
    position: absolute;
    left: ${(props: any) => Math.round(props.percentX * 100)}%;
    top: 0;
    bottom: 0;
    border-left: 3px solid ${props => props.marker.color};
    padding-left: .6em;
    padding-top: 1em;
    color: ${(props: any) => props.active ? 'white' : '#777'};
    >:nth-child(1) {
        font-size: .8em;
    }
    >:nth-child(2) {
        font-size: .8em;
        margin-top: .3em;
        padding-left: .6em;
    }
    &:before {
        content: "";
        display: table;
        position: absolute;
        border-radius: 1000px;
        width: .3em;
        height: .3em;
        top: 2.6em;
        background: ${props => props.marker.color};
    }
   
` as any

const TransportWrap = styled.div`
    position: fixed;
    height: 100%;
    width: 100%;
    font-size: 1.1rem;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    &:after {
        content: "";
        position: absolute;
        bottom: 0;
        height: .3em;
        left: 0;
        background: rgba(255, 255, 255, .3);
        transition: width .2s;
        width: ${(props: any) => Math.round(props.positionPercentX * 100)}%;
    }
`

export const TransportNavPopup = () => {
    const { cueMarkers, position } = window.data
    const range = [0, (cueMarkers.slice(-1)[0]?.position ?? position) + 20]
    const rangeAmount = range[1] - range[0]

    console.log(cueMarkers, position)
    return <TransportWrap positionPercentX={position / rangeAmount}>
        {cueMarkers.map((marker, i) => {
            return <MarkerItem active={marker.position === position} key={i + marker.name} marker={marker} percentX={marker.position / rangeAmount}>
                <div>{marker.name}</div>
                <div>{marker.position}</div>
            </MarkerItem>
        })}
    </TransportWrap>
}