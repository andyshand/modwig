import React from 'react'
import { SearchResult, SearchView, SearchProps } from './SearchView'
import { send, addPacketListener, getTrackByName } from '../bitwig-api/Bitwig'
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

const FuzzySet = (options) => {

    const santizie = str => str.toLowerCase().trim()
    const similarity = (option: string, query: string) : number => { 
        option = santizie(option)
        const indexOfMatch = option.indexOf(query)
        if (indexOfMatch >= 0) {
            let recentI = recent10.indexOf(option)
            return 1 - (indexOfMatch / options.length) + (recentI >= 0 ? (recent10.length - recentI) * .5 : 0)
        }
        return 0
    }
    return {
        get(query: string) {
            const sanitizedQ = santizie(query)
            return options.slice().sort((a, b) => similarity(b, sanitizedQ) - similarity(a, sanitizedQ))
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
            this.fuzzySet = FuzzySet(this.trackNames)
            this.setState({
                tracks: packet.data,
                trackNames: this.trackNames
            })
        })
        window.addEventListener('keyup', event => {
            if (event.keyCode === 27) {
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
        recent10 = [name].concat(recent10.slice(0, recentCount).filter(n => n !== name))
        saveRecent10()
    }

    mapTrackItem = (name: string, i: number) : SearchResult => {
        const track = getTrackByName(name)
        const id = i + name
        return {
            title: name,
            color: track.color,
            id,
            track,
            isRecent: recent10.indexOf(name) >= 0,
            description: name,
            selected: this.state.selectedId ? (this.state.selectedId === id) : i === 0
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
        const results = (this.state.query.trim().length > 0 ? this.fuzzySet.get(q) : recent10).filter(name => {
            if (onlySends) {
                const t = getTrackByName(name)
                return t.type === 'Effect'
            }
            return getTrackByName(name) // track actually exists
        })
        const searchProps: SearchProps = {
            onQueryChanged: query => {
                this.setState({
                    query,
                    selectedId: null
                })
            },
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