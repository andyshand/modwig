import React from 'react'
const { app } = require('electron').remote
const { clipboard } = require('electron')
import styled from 'styled-components'
const w = window as any
const ValueEntryInput = styled.input`
    color: white;
    padding: .7em 1em;
    font-size: 1em;
    outline: none;
    border: none;
    outline: none;
    background: transparent;
    flex-grow: 1;
    text-align: center;
`
const Output = styled.div`
    border-top: 1px solid black;
    background: #222;
    font-size: 0.8em;
    color: #aaa;
    text-align: center;
    padding: .4em 1em;
`
const ValueEntryWrap = styled.div`
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: absolute;
    top:0;
    bottom:0;
    left:0;
    right:0;
`

export class ValueEntryView extends React.Component<any> {
    inputRef = React.createRef()
    state = {
        typedValue: '',
        originalValue: 0
    }
    startedTyping = false
    getEvaled() {
        try {
            w.valueEntryX = this.state.originalValue
            console.log(this.state)
            const output = eval(this.state.typedValue.replace(/x/g, `window.valueEntryX`))
            if (output === this.state.originalValue) {
                return null
            } else {
                return (+output.toFixed(2)).toString()
            }
        } catch (e) {
            console.error(e)
            return 'Error'
        }
    }
    componentDidMount() {
        app.on('browser-window-focus', () => {
            if (this.inputRef.current) {
                this.startedTyping = false
                const curr = this.inputRef.current as HTMLInputElement
                this.setState({
                    typedValue: 'x'
                })
                curr.focus()
                curr.select()
                setTimeout(() => {
                    const originalText = clipboard.readText()
                    this.setState({originalValue: parseFloat(originalText)})
                }, 200)
            }
        })
    }
    onInputChange = e => {
        this.startedTyping = true
        this.setState({typedValue: e.target.value})
    }
    render() {
        (window as any).getTypedValue = () => {
            return this.getEvaled()
        }
        return <ValueEntryWrap>
            <ValueEntryInput placeholder={`Enter value...`} autoFocus={true} ref={this.inputRef} value={this.state.typedValue} onChange={this.onInputChange} />
            <Output>{this.getEvaled() || `Hint: 'x' refers to the current value (${this.state.originalValue})`}</Output>
        </ValueEntryWrap>
    }
}