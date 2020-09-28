import React from 'react'
import { styled } from 'linaria/react'

const Style = styled.input`
    border: 1px solid #000;
    border-radius: .2em;
    -webkit-appearance: none;
    padding: .4em 1em;
    background: #222;
    color: #CCC;
    &:focus {
        /* background: #EA6A10; */
        border-color: #444;
    }
    /* width: .8em; */
    /* height: .8em; */
    display: block;
    &:focus {
        outline: none;
    }
`

export const Input = (props) => {
    return <Style {...props} />
}