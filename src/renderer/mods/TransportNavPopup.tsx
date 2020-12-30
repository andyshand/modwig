import React from 'react'
import { styled } from 'linaria/react'

const MarkerItem = styled.div`
    position: absolute;
    left: ${(props: any) => Math.round(props.percentX * 100)}%;
    top: 0;
    bottom: .1em;
    border-left: 3px solid ${props => props.marker.color};
    padding-left: .6em;
    padding-top: .4em;
    color: ${(props: any) => props.active ? 'white' : '#666'};
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
        top: 2em;
        background: ${props => props.marker.color};
    }
   
` as any

const TransportWrap = styled.div`
    position: fixed;
    height: 100%;
    width: 100%;
    font-size: 1.1rem;
    background: rgba(25, 25, 25, 0.8);
    color: white;
    &:before, &:after {
        content: "";
        position: absolute;
        bottom: 0;
        height: .1em;
        left: 0;
        transition: width .2s;
    }
    &:before {
        background: white;
        width: ${(props: any) => Math.round(props.positionPercentX * 100) + 1}%;
    }
    &:after {
        background: rgba(0, 0, 0, 0.7);
        width: ${(props: any) => Math.round(props.coverUpToX * 100)}%;
    }
`

export const TransportNavPopup = () => {
    const { cueMarkers, position } = window.data
    const range = [0, (cueMarkers.slice(-1)[0]?.position ?? position) + (4 * 8)]
    const rangeAmount = range[1] - range[0]
    const isActiveMarker = (marker, i, arr) => {
        const next = arr[i + 1]
        return position >= marker.position && (!next || position < next.position)
    }
    const activeMarker = cueMarkers.find(isActiveMarker) || {position: 0, name: 'Start Placeholder', color: '#444'}
    const coverUpToX = activeMarker.position / rangeAmount

    console.log(cueMarkers, position)
    return <TransportWrap positionPercentX={position / rangeAmount} coverUpToX={coverUpToX}>
        {cueMarkers.map((marker, i, arr) => {
            return <MarkerItem active={marker.position === activeMarker.position} key={i + marker.name} marker={marker} percentX={marker.position / rangeAmount}>
                <div>{marker.name} ({i + 1})</div>
                <div>{(marker.position / 4) + 1}</div>
            </MarkerItem>
        })}
    </TransportWrap>
}