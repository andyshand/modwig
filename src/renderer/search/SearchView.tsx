import React from 'react'
import styled from 'styled-components'

const Result = styled.div`
    background: ${props => props.selected ? `#888` : `transparent`};
    padding: .7em 1em;
    border-bottom: 3px solid #111;
`

const Input = styled.input`
    width: 100%;
    background: #222;
    outline: none !important;
    color: white;
    box-shadow: none;
    border: none;
`
export interface SearchResult {
    title: string
    id: string
   

    description?: string
    icon?: React.ElementType

    /**
     * Called when the user presses enter or clicks a search result (closing search)
     */
    onConfirm: () => void

    /**
     * Called when the result is highlighted. When the search is first opened, this will automatically
     * be called on the first element. Additionally, if the search is closed without confirming a result,
     * this will be called with false to allow calling code to cleanup any "preview" state.
     */
    onSelected?: (selected: boolean) => void
}

export interface SearchProps {
    onQueryChanged: (query: string) => void,
    onCancelled: () => void,
    results: SearchResult[],
    query: string,
    placeholder: string
}

export class SearchView extends React.Component<SearchProps> {
    state = {
        selectedId: null
    }
    repeatInterval: any
    onInputChange = event => {
        this.setState({selectedId: null})
        this.props.onQueryChanged(event.target.value)
    }
    onKey = (keyCode: number) => {
        const selectedIndex = this.props.results.findIndex(this.isSelected)
        if (selectedIndex < 0) {
            return
        }
        if (keyCode === 38) {
            // up
            const newSelect = this.props.results[Math.max(0, selectedIndex - 1)]
            this.setState({
                selectedId: newSelect.id
            })
            newSelect.onSelected(true)
        } else if (keyCode === 40) {
            // down
            const newSelect = this.props.results[Math.min(this.props.results.length - 1, selectedIndex + 1)]
            this.setState({
                selectedId: newSelect.id
            })
            newSelect.onSelected(true)
        }
    }
    static getDerivedStateFromProps(props, state) {
        if (!state.selectedId && props.results.length) {
            props.results[0].onSelected(true)
            return {
                ...state,
                selectedId: props.results[0].id
            }
        }
        return state;
    }
    isSelected = (result: SearchResult) => {
        return result.id === this.state.selectedId
    }
    getSelected = () => {
        return this.props.results.find(this.isSelected)
    }
    onKeyDown = (event) => {
        clearInterval(this.repeatInterval)
        if (event.keyCode === 27) {
            // escape
            return this.props.onCancelled()
        } else if (event.keyCode === 13) {
            // enter
            const selected = this.getSelected()
            if (selected) {
                return selected.onConfirm()
            }
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
            selected: this.isSelected(result),
            id: result.id
        }
        return <Result {...props}>
            {result.title}
        </Result>
    }
    onSearchKeyDown = event => {
        // Don't allow up/down arrow keys to navigate input
        if (event.keyCode === 38 || event.keyCode === 40) {
            event.preventDefault()
        }
    }
    render() {
        return <div>
            <Input autoFocus onKeyDown={this.onSearchKeyDown} placeholder={this.props.placeholder} 
            onChange={this.onInputChange} value={this.props.query} />
            {this.props.results.map(this.renderResult)}
        </div>
    }
}