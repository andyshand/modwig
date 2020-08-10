import React from 'react'
import { send, addPacketListener, getTrackById, BitwigTrack, getCueMarkerAtPosition, getTracks, getCueMarkersAtPosition } from '../bitwig-api/Bitwig'
import { styled } from 'linaria/react'
import { TrackResult } from './TrackResult'

export interface SearchResult {
    track: BitwigTrack
    isRecent: boolean
}

const { BrowserWindow, app} = require('electron').remote

function loadRecent10() {
    try {
        return JSON.parse(localStorage.getItem('recent10')) || []
    } catch (e) { return [] }
}

let recentCount = 50
let recentTracks = loadRecent10()

function saveRecent10() {
    localStorage.setItem('recent10', JSON.stringify(recentTracks))
}

export interface TrackSearchOptions {
    onlyNamed?: boolean,
    onlyInCueMarker?: boolean,

    /**
     * Hardcode the transport position at the time of opening the panel
     */
    transportPosition: number
}

const ignoreMap = {
    "Phase-4": true,
    "Polysynth": true,
    "Instrument Layer": true,
    "Chain": true
}
const TrackSearchImpl = (tracks: BitwigTrack[], options: TrackSearchOptions) => {
    const filtered = tracks.filter((track) => {
        const { name, data } = track
        let remove = false
        if (options.onlyNamed) {
            if (/^(Group|Audio|Inst) [0-9]+$/.test(name)) {
                remove = true
            } else if (/^S[0-9]+ Effect$/.test(name)) {
                remove = true
            } else if (name in ignoreMap) {
                remove = true
            }
        }
        if (options.onlyInCueMarker) {
            // Get the current cue marker
            const [cue, endCue] = getCueMarkersAtPosition(options.transportPosition)
            const trackCueData = data?.afterCues ?? {}
            if (cue && !trackCueData[cue.name]) {
                remove = true
            }
        }
        return !remove
    })
    const santizie = (str: string) => str.toLowerCase().trim()
    const similarity = (track: BitwigTrack, query: string) : number => { 
        const option = santizie(track.name)
        const indexOfMatch = option.indexOf(query)
        if (indexOfMatch >= 0) {
            let recentI = recentTracks.indexOf(option)
            return 1 - (indexOfMatch / filtered.length) + (recentI >= 0 ? (recentTracks.length - recentI) * .5 : 0)
        }
        return 0
    }
    return {
        get(query?: string) : BitwigTrack[] {
            if (!query || query.length === 0) {
                return filtered
            }
            const sanitizedQ = santizie(query)
            return filtered.sort((a, b) => similarity(b, sanitizedQ) - similarity(a, sanitizedQ))
        }
    }
}

const FlexContainer = styled.div`
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    > input {
        flex-grow: 0;
        flex-shrink: 0;
    }
`
const NoResultsStyle = styled.div`
    padding: 1em;
    color: #AAA;
    text-align: center;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
`
const Breakpoints = [
    [700, 2],
    [1000, 3]
]
const ResultsWrap = styled.div`
    overflow: auto;
    /* flex-grow: 1; */
    /* flex-shrink: 1; */
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: flex-start;

    > * {
        width: 100%;
    }
    @media (min-width: ${Breakpoints[0][0]}px) {
        > * {   
            width: calc(100% / ${Breakpoints[0][1]});
        }
        @media (min-width: ${Breakpoints[1][0]}px) {
            > * {   
                width: calc(100% / ${Breakpoints[1][1]});
            }
        }
    }
`

const RecentsHeader = styled.div`
    font-size: 0.9em;
    padding: 0.3rem 1.2rem;
    background: #222;
    color: #AAA;
    border-bottom: 1px solid #444;
`

interface SearchProps {
    options: TrackSearchOptions
}

export class TrackSearchView extends React.Component<SearchProps> {
    repeatInterval: any
    state = {
        query: '',
        selectedTrackId: null,
        results: [],
        loading: false
    }
    trackSearch
    recentSearch
    stopListening: any

    onKey = (key: string) => {
        const selectedIndex = this.state.results.findIndex(this.isSelected)
        if (selectedIndex < 0) {
            return
        }
        if (key === 'ArrowUp') {
            const newSelect = this.state.results[Math.max(0, selectedIndex - 1)]
            this.onShouldSelect(newSelect)
            this.waitingForScroll = true
        } else if (key === 'ArrowDown') {
            const newSelect = this.state.results[Math.min(this.state.results.length - 1, selectedIndex + 1)]
            this.onShouldSelect(newSelect)
            this.waitingForScroll = true
        }
    }
    onKeyDown = (event) => {
        if (event.key === ' ' && this.state.query === '') {
            event.preventDefault()
            send({
                type: 'transport/play'
            })
            return
        }

        clearInterval(this.repeatInterval)
        if (event.key === 'Enter') {
            // enter
            const selected = this.getSelected()
            return this.onConfirmed(selected)
        }
        const key = event.key
        this.repeatInterval = setInterval(() => {
            this.onKey(key)
        }, 100)
        this.onKey(key)
    }
    waitingForScroll = false
    getSelected = () => {
        return this.state.results.find(this.isSelected)
    }
    onKeyUp = () => {
        clearInterval(this.repeatInterval)
    }
    recreateSearcher(tracks?: BitwigTrack[], options = this.props.options) {
        this.trackSearch = TrackSearchImpl(tracks || getTracks(), options)
        this.recentSearch = TrackSearchImpl(recentTracks.map(id => getTrackById(id)).filter(t => !!t), options)
        this.calculateResults()
    }
    componentDidMount() {
        this.stopListening = addPacketListener('tracks', packet => {
            this.recreateSearcher(packet.data)
            if (this.state.query === '') {
                this.calculateResults('')
            }
        })       
        window.addEventListener('keydown', this.onKeyDown)
        window.addEventListener('keyup', this.onKeyUp)
    }

    componentWillUnmount() {
        this.stopListening()

        window.removeEventListener('keydown', this.onKeyDown)
        window.removeEventListener('keyup', this.onKeyUp)
    }
    componentDidUpdate(prevProps) {
        if (this.waitingForScroll) {
            document.getElementById('selectedtrack')?.scrollIntoView({
                block: 'end'
            })
            this.waitingForScroll = false
        }
        document.getElementById('theinput')?.focus()
        setTimeout(() => {
            document.getElementById('theinput')?.focus()
        }, 100)
    }
    isSelected = (result: SearchResult) => {
        return result.track.id === this.state.selectedTrackId
    }
    componentWillReceiveProps(nextProps) {
        if (JSON.stringify(nextProps.options) !== JSON.stringify(this.props.options)) {
            this.recreateSearcher(null, nextProps.options)
            this.calculateResults(this.state.query)
        }
    }

    cancel = () => {
        send({
            type: 'tracksearch/cancel'
        })
        BrowserWindow.getFocusedWindow().hide()
        app.hide()
    }

    onConfirmed = (res: SearchResult) => {
        const { track } = res
        send({
            type: 'tracksearch/confirm', 
            data: track.name
        })
        BrowserWindow.getFocusedWindow().hide()
        app.hide()
        recentTracks = [track.id].concat(recentTracks.slice(0, recentCount).filter(id => id !== track.id))
        saveRecent10()

        const currentCue = getCueMarkerAtPosition(this.props.options.transportPosition)
        if (currentCue) {
            // Save confirmed track as existing after curr cue
            send({
                type: 'track/save',
                data: {
                    name: track.name,
                    data: {
                        ...track.data,
                        afterCues: {
                            ...track.data?.afterCues ?? {},
                            [currentCue.name]: true
                        }
                    }
                }
            })
        }
    }

    trackItemToSearchResult = (track: BitwigTrack, i: number) : SearchResult => {
        return {
            track,
            isRecent: recentTracks.indexOf(track.id) >= 0
        }
    }

    onShouldSelect = (result: SearchResult) => {
        this.setState({selectedTrackId: result.track.id})
    }

    /**
     * Called by parent using ref
     */
    onQueryChanged = query => {
        this.setState({
            query: query.trim(),
            loading: true
        })
        this.calculateResults(query)
    }

    calculateResults = async (query: string = this.state.query) => {
        if (!this.trackSearch) {
            return
        }

        let results: BitwigTrack[]
        let q = query.trim()

        if (q.length > 0) {
            results = this.trackSearch.get(q)
        } else {
            results = this.recentSearch.get(q)
        }

        const mappedResults = results.map(this.trackItemToSearchResult)
        const selectedTrackId = mappedResults[0]?.track.id ?? null
       
        this.setState({
            loading: false, 
            results: mappedResults,
            selectedTrackId
        })
    }
    renderNoResults() {
        return <NoResultsStyle>No results found for "{this.state.query}".</NoResultsStyle>
    }
    render() {
        return this.state.results.length > 0 ? <FlexContainer style={{fontSize: '.9rem'}}>
            {this.state.query.length === 0 ? <RecentsHeader>Recent Tracks</RecentsHeader> : null}
            <ResultsWrap>
                {this.state.results.map(result => <TrackResult 
                    selected={this.isSelected(result)} 
                    key={result.track.id} 
                    result={result}
                    options={this.props.options}
                    onConfirmed={this.onConfirmed} 
                    refreshSearch={this.recreateSearcher}
                    onShouldSelect={this.onShouldSelect} />
                )}
            </ResultsWrap> 
        </FlexContainer> : this.renderNoResults()
    }
}