import React from 'react'
import { SearchResult, SearchView, SearchProps } from './SearchView'
import { send, addPacketListener } from '../bitwig-api/Bitwig'
import FuzzySet from 'fuzzyset.js'
import { debounce } from '../engine/Debounce'
const { BrowserWindow, app} = require('electron').remote

export class TrackSearchView extends React.Component {

    state = {
        tracks: [],
        trackNames: [],
        query: ''
    }
    fuzzySet = FuzzySet([])
    stopListening: any

    componentDidMount() {
        this.stopListening = addPacketListener('tracks', packet => {
            const trackNames = packet.data.map(t => t.name)
            this.fuzzySet = FuzzySet(trackNames)
            this.setState({
                tracks: packet.data,
                trackNames
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
            this.setState({query: ''})
            send({
                type: 'tracksearch/start'
            })
        })
    }

    componentWillUnmount() {
        this.stopListening()
    }

    highlightTrack = debounce(name => {
        send({
            type: 'tracksearch/highlighted', 
            data: name
        })
    }, 500)

    cancel = () => {
        send({
            type: 'tracksearch/cancel'
        })
        BrowserWindow.getFocusedWindow().hide()
        app.hide()
    }

    mapTrackItem = (name: string) : SearchResult => {
        return {
            onConfirm: () => {
                send({
                    type: 'tracksearch/confirm', 
                    data: name
                })
                BrowserWindow.getFocusedWindow().hide()
                app.hide()
            },
            title: name,
            id: name,
            description: name,
            onSelected: (selected) => {
                if (selected) {
                    this.highlightTrack(name)
                }
            }
        }
    }

    render() {
        const results = (this.fuzzySet.get(this.state.query) || []).map(scoreAndItem => scoreAndItem[1])
        const searchProps: SearchProps = {
            onQueryChanged: query => {
                this.setState({query})
            },
            query: this.state.query,
            onCancelled: this.cancel,
            results: results.map(this.mapTrackItem),
            placeholder: 'Track Search'
        }
        return <SearchView {...searchProps} />
    }
}