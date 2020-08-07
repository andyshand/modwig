import React from 'react'
import styled from 'styled-components'

const Result = styled.div`
    user-select: none;
    background: ${props => props.selected ? `#888` : `#444`};
    padding: .7em 1em;
    font-size: 1em;
    border-bottom: 3px solid #111;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 1.8em;
    > * {
        flex-shrink: 0;
    }
    position: relative;
`
const FlexGrow = styled.div`
    flex-grow: 1;
`
const Color = styled.div`
    background: ${props => props.color};
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 1em;  
`
const Recent = styled.div`
    font-size: .8em;
`

const Input = styled.input`
    width: 100%;
    background: #222;
    outline: none !important;
    color: white;
    box-shadow: none;
    border: none;
    font-size: 1.2em;
    padding: 1em;
`
export interface SearchResult {
    title: string
    id: string

    isRecent?: boolean
    color: string

    description?: string
    icon?: React.ElementType

    selected: boolean
}

export interface SearchProps {
    onQueryChanged: (query: string) => void,
    onCancelled: () => void,
    results: SearchResult[],
    query: string,
    onShouldSelect: (result: SearchResult) => void,
    onConfirmed: (result: SearchResult) => void,
    placeholder: string
}

export class SearchView extends React.Component<SearchProps> {
    repeatInterval: any
    onInputChange = event => {
        this.props.onQueryChanged(event.target.value)
    }
    onKey = (keyCode: number) => {
        const selectedIndex = this.props.results.findIndex(r => r.selected)
        if (selectedIndex < 0) {
            return
        }
        if (keyCode === 38) {
            // up
            const newSelect = this.props.results[Math.max(0, selectedIndex - 1)]
            this.props.onShouldSelect(newSelect)
        } else if (keyCode === 40) {
            // down
            const newSelect = this.props.results[Math.min(this.props.results.length - 1, selectedIndex + 1)]
            this.props.onShouldSelect(newSelect)
        }
    }
    
    getSelected = () => {
        return this.props.results.find(r => r.selected)
    }
    onKeyDown = (event) => {
        clearInterval(this.repeatInterval)
        if (event.keyCode === 27) {
            // escape
            return this.props.onCancelled()
        } else if (event.keyCode === 13) {
            // enter
            const selected = this.getSelected()
            this.props.onConfirmed(selected)
        }
        const keyCode = event.keyCode
        this.repeatInterval = setInterval(() => {
            this.onKey(keyCode)
        }, 100)
        this.onKey(keyCode)
    }
    onKeyUp = () => {
        clearInterval(this.repeatInterval)
    }
    componentDidMount() {
        window.addEventListener('keydown', this.onKeyDown)
        window.addEventListener('keyup', this.onKeyUp)
    }
    componentWillUnmount() {
        window.removeEventListener('keydown', this.onKeyDown)
        window.removeEventListener('keyup', this.onKeyUp)
    }
    renderResult = (result: SearchResult) => {
        const props = {
            key: result.id,
            selected: result.selected
        }
        return <Result {...props} onDoubleClick={() => this.props.onConfirmed(result)} onMouseDown={() => this.props.onShouldSelect(result)}>
            <Color color={result.color} /> <span>{result.title}</span> <FlexGrow /> {result.isRecent ? <Recent>⭐</Recent> : null}
        </Result>
    }
    componentDidUpdate(prevProps) {
        document.getElementById('theinput').focus()
    }
    onSearchKeyDown = event => {
        // Don't allow up/down arrow keys to navigate input
        if (event.keyCode === 38 || event.keyCode === 40) {
            event.preventDefault()
        }
    }
    render() {
        return <div style={{fontSize: '.9rem'}}>
            <Input id="theinput" autoComplete={"off"} autoCorrect={"off"} autoCapitalize={"off"} spellCheck={false} autoFocus onKeyDown={this.onSearchKeyDown} placeholder={this.props.placeholder} 
            onChange={this.onInputChange} value={this.props.query} />
            {this.props.results.map(this.renderResult)}
        </div>
    }
}