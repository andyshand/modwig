import React from 'react'
import { styled } from 'linaria/react'

const Wrap = styled.div`
    display: flex;
    position: absolute;
    left: 0;
    right: 0;
    padding: .5em;
    font-size: 1.3em;
`

export const PopupLabel = (props) => {
    const { content } = props
    return <Wrap>
        {content}
    </Wrap>
}