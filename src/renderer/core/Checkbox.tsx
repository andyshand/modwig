import React from 'react'
import { styled } from 'linaria/react'

const Style = styled.input`
    background: transparent;
    border: 1px solid #AAA;
    border-radius: .2em;
    -webkit-appearance: none;
    &:checked {
        background: #EA6A10;
        border-color: #EA6A10;
    }
    width: .8em;
    height: .8em;
    &:focus {
        outline: none;
    }
    cursor: pointer;
`

export const Checkbox = (props) => {
    return <Style type="checkbox" {...props} />
}