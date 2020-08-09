import React from 'react'
import { SearchResult, SearchView, SearchProps } from './SearchView'
import { send, addPacketListener, getTrackById, Bitwig } from '../bitwig-api/Bitwig'
const { BrowserWindow, app} = require('electron').remote

function loadRecent10() {
    try {
        return JSON.parse(localStorage.getItem('recent10')) || []
    } catch (e) { return [] }
}

let recentCount = 10
let recent10 = loadRecent10()

function saveRecent10() {
    localStorage.setItem('recent10', JSON.stringify(recent10))
}

const FuzzySet = (tracks: Bitwig.Track[]) => {
    const santizie = (str: string) => str.toLowerCase().trim()
    const similarity = (track: Bitwig.Track, query: string) : number => { 
        const option = santizie(track.name)
        const indexOfMatch = option.indexOf(query)
        if (indexOfMatch >= 0) {
            let recentI = recent10.indexOf(option)
            return 1 - (indexOfMatch / tracks.length) + (recentI >= 0 ? (recent10.length - recentI) * .5 : 0)
        }
        return 0
    }
    return {
        get(query: string) : Bitwig.Track[] {
            const sanitizedQ = santizie(query)
            return tracks.sort((a, b) => similarity(b, sanitizedQ) - similarity(a, sanitizedQ))
        }
    }
}

export class TrackSearchView extends React.Component {

    state = {
        tracks: [],
        trackNames: [],
        query: '',
        selectedId: null
    }
    trackNames: string[] = []
    fuzzySet = FuzzySet([])
    stopListening: any

    componentDidMount() {
        this.stopListening = addPacketListener('tracks', packet => {
            this.trackNames = packet.data.map(t => t.name)
            this.fuzzySet = FuzzySet(packet.data)
            this.setState({
                tracks: packet.data,
                trackNames: this.trackNames
            })
        })
        window.addEventListener('keyup', event => {
            if (event.key === 'Escape') {
                // escape
                send({
                    type: 'tracksearch/cancel'
                })
            }
        })
        
        // The component is kept around so we need a way
        // to detect when to clear the search field
        app.on('browser-window-focus', () => {
            this.setState({query: '', selectedId: null})
            send({
                type: 'tracksearch/start'
            })
        })
    }

    componentWillUnmount() {
        this.stopListening()
    }

    isSelected = (result: SearchResult) => {
        return result.id === this.state.selectedId
    }

    cancel = () => {
        send({
            type: 'tracksearch/cancel'
        })
        BrowserWindow.getFocusedWindow().hide()
        app.hide()
    }

    onConfirmed = (result: SearchResult) => {
        const { title: name } = result
        send({
            type: 'tracksearch/confirm', 
            data: name
        })
        BrowserWindow.getFocusedWindow().hide()
        app.hide()
        recent10 = [result.id].concat(recent10.slice(0, recentCount).filter(id => id !== result.id))
        saveRecent10()
    }

    mapTrackItem = (track: Bitwig.Track, i: number) : SearchResult => {
        return {
            title: track.name,
            color: track.color,
            id: track.id,
            track,
            isRecent: recent10.indexOf(track.id) >= 0,
            selected: this.state.selectedId ? (this.state.selectedId === track.id) : i === 0
        }
    }

    onShouldSelect = (result: SearchResult) => {
        this.setState({selectedId: result.id})
    }

    render() {
        let q = this.state.query.trim()
        let onlySends = false
        if (q.indexOf(':send') === 0) {
            q = q.substr(5).trim()
            onlySends = true
        }
        let results: Bitwig.Track[]
        if (q.length > 0) {
            results = this.fuzzySet.get(q)
        } else {
            results = recent10.map(id => getTrackById(id)).filter(t => !!t)
        }
        if (onlySends)
        results = results.filter(t => t.type === 'Effect')
        const searchProps: SearchProps = {
            onQueryChanged: query => {
                this.setState({
                    query,
                    selectedId: null
                })
            },
            isRecents: q.length === 0,
            onConfirmed: this.onConfirmed,
            onShouldSelect: this.onShouldSelect,
            query: this.state.query,
            onCancelled: this.cancel,
            results: results.map(this.mapTrackItem),
            placeholder: 'Track Search'
        }
        return <SearchView {...searchProps} />
    }
}