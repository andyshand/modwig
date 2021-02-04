import React from 'react'
import { styled } from 'linaria/react'
import _ from 'underscore'

const Wrap = styled.div`
    display: flex;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    color: #AAA;
    border: 3px solid ${(props: any) => props.muted ? 'transparent' : '#C7BC06'};
    background: ${(props: any) => props.muted ? 'rgba(0, 0, 0, 0.6)' : 'transparent'};
    font-size: .9em;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    overflow: hidden;
`

export const TrackOverlay = (props) => {
    const { content } = props
    return <Wrap muted={content === 'Muted'}>
        {content}
    </Wrap>
}