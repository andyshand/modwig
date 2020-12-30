import React from 'react'
import { styled } from 'linaria/react'

const MsgWrap = styled.div`
    position: fixed;
    top: 0;
    flex-wrap: wrap;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    text-align: center;
    font-size: 1.4rem;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    color: white;
`

export const Message = ({ msg }) => {
    return <MsgWrap>{ msg }</MsgWrap>
}