import React from 'react'

export interface SearchResult {
    title: string

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
    onCancelled?: () => void,
    results: SearchResult[]
}

export class SearchView extends React.Component {

    onInputChange = event => {

    }

    render() {
        return <div>
            
            Searchsearchsearch!!!!!

            <input autoFocus onChange={this.onInputChange} />


        </div>
    }
}