import React from 'react'
import { SearchResult, SearchView, SearchProps } from './SearchView'
import { send, addPacketListener, getTrackByName } from '../bitwig-api/Bitwig'

let recentCount = 10
let recent10 = []

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
import { debounce } from '../engine/Debounce'
const { BrowserWindow, app} = require('electron').remote

export class TrackSearchView extends React.Component {

    state = {
        tracks: [],
        trackNames: [],
        query: ''
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
        // send({
        //     type: 'tracksearch/highlighted', 
        //     data: name
        // })
    }, 500)

    cancel = () => {
        send({
            type: 'tracksearch/cancel'
        })
        BrowserWindow.getFocusedWindow().hide()
        app.hide()
    }

    mapTrackItem = (name: string, i: number) : SearchResult => {
        const track = getTrackByName(name)
        return {
            onConfirm: () => {
                send({
                    type: 'tracksearch/confirm', 
                    data: name
                })
                BrowserWindow.getFocusedWindow().hide()
                app.hide()
                recent10 = [name].concat(recent10.slice(0, recentCount).filter(n => n !== name))
            },
            title: name,
            color: track.color,
            id: i + name,
            isRecent: recent10.indexOf(name) >= 0,
            description: name,
            onSelected: (selected) => {
                if (selected) {
                    this.highlightTrack(name)
                }
            }
        }
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
            return true
        })
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