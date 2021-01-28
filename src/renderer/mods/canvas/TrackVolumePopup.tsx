import React from 'react'
import { styled } from 'linaria/react'

const TooltipWrap = styled.div`
    position: absolute;
    right: 113%;
    top: 50%;
    font-size: .9em;
    background: #444;
    border: 1px solid #CCC;
    white-space: nowrap;
    padding: .4em .5em;
    transform: translateY(-50%);
`
const Tooltip = ({volume, ...rest}) => {
    return <TooltipWrap {...rest}>
        {volume}
    </TooltipWrap>
}
const VolumeLevel = styled.div`
    /* transition: top .1s; */
    top: ${(props: any) => Math.ceil((1 - props.volume) * 100) + '%'};
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
    border-radius: .2em;
    background: #222;
    width: 5em;
    height: 15em;
`
const Container = styled.div`
    display: flex;
    position: fixed;
    align-items: center;
    justify-content: flex-start;
    top: ${(props: any) => props.top}px;
    left: ${(props: any) => props.left}px;
    height: ${(props: any) => props.height}px;
    /* right: 0; */
`
const Color = styled.div`
    width: 1em;
    height: 1em;
    background: ${(props: any) => props.color};
    font-size: .6em;
    margin-right: .5rem;
    border-radius: 1000px;
    border: 1px solid rgba(0, 0, 0, 0.33);
`
const TrackInfo = styled.div`
    padding-left: 1em;
    font-size: 1.2em;
    display: flex;
    align-items: center;
`

export const TrackVolumePopup = ( props ) => {
    const { track, mouse } = props
    const containerProps = {
        top: track.visibleRect.y,
        height: track.visibleRect.h,
        left: mouse.x
    }
    return <Container {...containerProps}>
        <VolumeWrap >
            <Tooltip volume={track.volumeString ?? 0} />
            <VolumeLevel volume={track.volume} />
        </VolumeWrap>
        <TrackInfo>
            <Color color={track.color} />
            {track.name}
            {/* {mouse.x} */}
            {/* {JSON.stringify(props)} */}
        </TrackInfo>
    </Container>
}