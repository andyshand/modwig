import React from 'react'
import { styled } from 'linaria/react'
import { shortcutToTextDescription } from '../settings/helpers/settingTitle'

const Name = styled.div`
    /* align-self: flex-start; */
`
const Shortcut = styled.div`
    /* align-self: center; */
`
const Position = styled.div`
    align-self: center;
    color: #444;
    
`
const MarkerItem = styled.div`
    position: absolute;
    top: 0;
    display: flex;
    flex-wrap: nowrap;
    bottom: .2em;
    align-items: flex-start;
    justify-content: space-between;
    border-left: 5px solid ${props => props.disabled ? 'rgba(255,255,255,0.04)' : props.marker.color};
    padding: .4em .6em;
    cursor: pointer;
    &:hover {
        background: #222;
    }
    overflow: hidden;
    user-select: none;
    color: ${(props: any) => props.active ? 'white' : (props.disabled ? 'rgba(255, 255, 255, .04)' : '#888')};
    background: #222;
    >:nth-child(1) {
        display: flex;
        height: 100%;
        flex-direction: column;
        justify-content: space-between;
        align-items: flex-start;
    }
    >:nth-child(2) {
        display: flex;
        height: 100%;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-end;
    }
` as any

const TransportWrap = styled.div`
    position: absolute;
    height: 100%;
    width: 100%;
    left: 0;
    top: 0;
    font-size: 1.0rem;
    color: white;
    &:before, &:after {
        content: "";
        position: absolute;
        bottom: 0;
        height: .2em;
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

export const TransportNavPopup = ({ cueMarkers, position, sendData, popup }) => {
    const range = [0, (cueMarkers.slice(-1)[0]?.position ?? position) + (4 * 8)]
    const rangeAmount = range[1] - range[0]
    const isActiveMarker = (marker, i, arr) => {
        const next = arr[i + 1]
        return position >= marker.position && (!next || position < next.position)
    }
    const activeMarker = cueMarkers.find(isActiveMarker) || {position: 0, name: 'Start Placeholder', color: '#444'}
    const coverUpToX = activeMarker.position / rangeAmount

    // console.log(cueMarkers, position)
    let shortcutIndex = -1
    return <TransportWrap positionPercentX={position / rangeAmount} coverUpToX={coverUpToX}>
        {cueMarkers.map((marker, i, arr) => {
            let nextMarker = arr[i + 1]
            if (!marker.disabled) {
                shortcutIndex++
            }
            const props = {
                active: marker.position === activeMarker.position,
                key: i + marker.name,
                marker,
                percentX: marker.position / rangeAmount,
                style: {
                    left: `${((marker.position / rangeAmount) * 100).toFixed(2)}%`,
                    width: nextMarker ? `${(((nextMarker.position - marker.position) / rangeAmount) * 100).toFixed(2)}%` : '',
                    right: nextMarker ? '' : 0
                },
                disabled: marker.disabled,
                onDoubleClick: event => {
                    // Launch
                    sendData({
                        action: 'launch',
                        i
                    })
                },
                onClick: event => {
                    if (event.altKey) {
                        // Toggle disabled
                        sendData({
                            action: 'toggle',
                            i
                        })
                    }
                }
            }
            
            return <MarkerItem {...props}>
                <div>
                    <Name>{marker.name}</Name>
                    <Shortcut>{marker.disabled ? '' : `⌘${shortcutIndex + 1}`}</Shortcut>
                </div>
                <div>
                    <Position>{(marker.position / 4) + 1}</Position>
                </div>
            </MarkerItem>
        })}
    </TransportWrap>
}