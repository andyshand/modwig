import React from 'react'
import { styled } from 'linaria/react'
import { TrackSearchView } from './TrackSearchView'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFont, faMapPin, faInfo, faLock } from '@fortawesome/free-solid-svg-icons'
import { send, getTrackById, getTransportPosition, getCueMarkerAtPosition, getCueMarkersAtPosition } from '../bitwig-api/Bitwig'
const { app, BrowserWindow } = require('electron').remote
const w = window as any
w.runAction = function(action) {
    send({type: 'action', data: action})
}

const SearchPanelWrap = styled.div`
    position: fixed;
    top: 0;
    left:0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    >:nth-child(2) {
        flex-grow: 1;
    }
    -webkit-app-region: drag;
`
const SidebarWrap = styled.div`

    flex-grow: 0;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 1em .8em;
    background: #222;
    font-size: .8em;
    border-right: 1px solid #444;

`
const FlexGrow = styled.div`
    flex-grow: 1;
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
    border-bottom: 1px solid #444;
    -webkit-app-region: ${(props: any) => props.hasQuery ? `no-drag` : `drag`}; 
`
const CueIndicator = styled.div`
    position: fixed;
    top: 1.4rem;
    right: 1rem;
    color: #666;
`
const Flex = styled.div`
    display: flex;
    >:nth-child(2) {
        flex-grow: 1;
    }
`

const SidebarButtonWrap = styled.div`
    width: 2.5em;
    height: 2.5em;
    margin: .5em 0;
    display: flex;
    align-items: center;
    border: 1px solid black;
    justify-content: center;
    background: ${(props: any) => props.active ? `#F76F11` : '#666'};
    color: ${(props: any) => props.active ? 'black' : 'white'};
    border-radius: 0.3em;
    cursor: pointer;
`

const SidebarButton = ({icon, ...rest}) => {
    return <SidebarButtonWrap {...rest}>
        <FontAwesomeIcon icon={icon} />
    </SidebarButtonWrap>

}

export class SearchPanel extends React.Component {
    state = {
        query: '',
        options: {
            onlyNamed: false
        }
    }
    searchViewRef = React.createRef<TrackSearchView>()
    reset() {
        if (!(this.state.options as any).lockQuery) {
            this.setState({
                query: ''
            })
        }
    }
    componentDidMount() {
        window.addEventListener('keyup', event => {
            if (event.key === 'Escape') {
                // escape
                send({
                    type: 'tracksearch/cancel'
                })
                this.onConfirmedOrCancelled()
            }
        })
        
        // The component is kept around so we need a way
        // to detect when to clear the search field
        app.on('browser-window-focus', () => {
            const input = document.getElementById('theinput') as HTMLInputElement
            if (input) {
                input.focus()
            }
        })
    }
    onConfirmedOrCancelled = () => {
        this.reset()
        BrowserWindow.getFocusedWindow().hide()
        app.hide()
    }
    onInputChange = event => {
        this.setState({query: event.target.value})
    }
    onSearchKeyDown = event => {
        // Don't allow up/down arrow keys to navigate input
        if (event.keyCode === 38 || event.keyCode === 40) {
            event.preventDefault()
        }
    }
    optionProps = option => ({
        onClick: this.toggleOption.bind(this, option),
        active: this.state.options[option] || false
    })
    stateProps = field => ({
        onClick: () => this.setState({ [field]: !this.state[field] }) ,
        active: this.state[field]
    })
    toggleOption = option => {
        const options = this.state.options
        options[option] = !options[option]
        this.setState({ options })
    }
    render() {
        const searchProps = {
            options: {
                ...this.state.options,
                transportPosition: getTransportPosition()
            }
        }
        const [cueStart, cueEnd] = getCueMarkersAtPosition(searchProps.options.transportPosition)
        return <SearchPanelWrap>
            <Input hasQuery={this.state.query.length > 0} id="theinput" autoComplete={"off"} autoCorrect={"off"} autoCapitalize={"off"} spellCheck={false} autoFocus onKeyDown={this.onSearchKeyDown} placeholder={"Search Tracks..."} 
            onChange={this.onInputChange} value={this.state.query} />
            <Flex>
                <SidebarWrap>
                    {/* <CueIndicator>{cueStart.name}</CueIndicator> */}
                    <SidebarButton {...this.optionProps("onlyNamed")} title="Only show tracks with non-default names" icon={faFont} />
                    <FlexGrow />
                    <SidebarButton {...this.optionProps('lockQuery')} title="Lock search query" icon={faLock} />
                </SidebarWrap>
                <div style={{position: "relative"}}>
                    <TrackSearchView onConfirmed={this.onConfirmedOrCancelled} query={this.state.query} ref={this.searchViewRef} {...searchProps} /> 
                </div>
            </Flex>
        </SearchPanelWrap>
    }
}