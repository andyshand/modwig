import React from 'react'
import { SearchView, SearchProps } from './SearchView'

export class TrackSearchView extends React.Component {

    state = {

    }

    componentDidMount() {

    }

    // mapTrackItem(track: Bitwig.Track) : SearchResult {

    // }

    render() {
        const searchProps: SearchProps = {
            onQueryChanged: query => {
                // call bitwig for new tracks, or sort existing tracks probs faster
            },
            onCancelled: () => {

            },
            results: []
        }
        return <SearchView {...searchProps} />
    }
}