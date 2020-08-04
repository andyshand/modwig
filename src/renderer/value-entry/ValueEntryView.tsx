import React from 'react'
import { withRouter } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'

const ValueEntryDiv = styled.div`
    color: white;
    padding: .7em 1em;
    font-size: 2rem;
    position: fixed;
    margin: 0;
    top: 0;
    outline: none;
    border: none;
    bottom: 0;
    right: 0;
    left: 0;
    display: flex;
    background: transparent;
    align-items: center;
    justify-content: center;
`

const Flicker = keyframes`
    0% {
        border-color: transparent;
    }
    50% {
        border-color: white;
    }
    100% {
        border-color: transparent;
    }
`
const Separator = styled.span`
    width: 2px;
    height: 100%;
    margin-left: .4em;
    border-left: 3px solid white;
    animation-name: ${Flicker};
    animation-duration: 1.25s;
    animation-iteration-count: infinite;
`
export class ValueEntryView extends React.Component<any> {
    state = {
        typedValue: ''
    }
    render() {
        (window as any).updateTypedValue = typedValue => this.setState({
            typedValue
        })
        return <ValueEntryDiv>
            {this.state.typedValue || `Set value...`} <Separator />
        </ValueEntryDiv>
    }
}