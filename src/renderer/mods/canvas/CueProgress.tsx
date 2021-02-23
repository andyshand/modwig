import React from 'react'
import { styled } from 'linaria/react'

const Wrap = styled.div`
    display: flex;
`
const Marker = styled.div`
    display: flex;
`

export const CueProgress = ({markers}) => {
    return <Wrap>
        {markers.map(marker => {
            return <Marker>
                {marker.name}
            </Marker>
        })}
    </Wrap>
}