import React from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

const ValueEntryDiv = styled.div`
    color: white;
    padding: .7em 1em;
    font-size: 2.5rem;
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
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
            { this.state.typedValue }
        </ValueEntryDiv>
    }
}