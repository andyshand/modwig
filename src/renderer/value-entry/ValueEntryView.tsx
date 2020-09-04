import React from 'react'
const { app } = require('electron').remote
const { clipboard } = require('electron')
import { styled } from 'linaria/react'

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
` as any
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

function loadRecent10() {
    try {
        return JSON.parse(localStorage.getItem('recent10Values')) || []
    } catch (e) { return [] }
}

let recentCount = 10
let recent10 = loadRecent10()

function saveRecent10() {
    localStorage.setItem('recent10Values', JSON.stringify(recent10))
}

export class ValueEntryView extends React.Component<any> {
    inputRef = React.createRef()
    state = {
        typedValue: '',
        originalValue: 0,
        recentIndex: -1
    }
    startedTyping = false
    getEvaled() {
        try {
            w.valueEntryX = this.state.originalValue
            console.log(this.state)
            const toEval = this.state.typedValue.replace(/x/g, `window.valueEntryX`)
            console.log(toEval)
            const output = eval(toEval)
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
        loadRecent10()
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
                    let originalValue = parseFloat(originalText)
                    if (isNaN(originalValue)) { // TODO why does this happen?
                        originalValue = 0
                    }
                    this.setState({originalValue})
                }, 200)
            }
        })
    }
    onInputChange = e => {
        this.startedTyping = true
        this.setState({typedValue: e.target.value})
    }
    onKeyUp = e => {
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            let newRecent = Math.min(this.state.recentIndex + 1, recent10.length - 1)
            if (newRecent >= 0) {
                this.setState({
                    recentIndex: newRecent,
                    typedValue: recent10[newRecent]
                })
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            let newRecent = Math.max(-1, this.state.recentIndex - 1)
            if (newRecent >= 0) {
                this.setState({
                    recentIndex: newRecent,
                    typedValue: recent10[newRecent]
                })
            } else if (this.state.recentIndex >= 0) {
                this.setState({
                    recentIndex: -1,
                    typedValue: ``
                })
            }
        }
    }

    render() {
        (window as any).getTypedValue = () => {
            const result = this.getEvaled()
            recent10 = [this.state.typedValue].concat(recent10).slice(0, recentCount)
            setTimeout(saveRecent10, 100)
            console.log('returning typed value: ', result)
            return result
        }
        return <ValueEntryWrap>
            <ValueEntryInput onKeyUp={this.onKeyUp} placeholder={`Enter value...`} autoFocus={true} ref={this.inputRef} value={this.state.typedValue} onChange={this.onInputChange} />
            <Output>{this.getEvaled() || `Hint: 'x' refers to the current value (${this.state.originalValue})`}</Output>
        </ValueEntryWrap>
    }
}