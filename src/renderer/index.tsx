import * as React from 'react';
import * as ReactDOM from 'react-dom';
const { app } = require('electron').remote
import { Switch, Route, HashRouter } from 'react-router-dom'
import { createGlobalStyle } from 'styled-components'
import { Settings } from './settings/Settings';
import { TrackSearchView } from './search/TrackSearchView';
import { ValueEntryView } from './value-entry/ValueEntryView';
import { SearchPanel } from './search/SearchPanel';

function removeAllListeners() {
    app.removeAllListeners('browser-window-focus')
    app.removeAllListeners('browser-window-blur')
}
removeAllListeners()

// Disable undo/redo across entire browser. This is because we pass those events (among others) to Bitwig. However
// we may need to modify this for settings page etc...
document.body.onkeydown = function(e) {
    if (e.key === 'z' && e.metaKey) {
        e.preventDefault();
    }
}
document.body.onkeyup = function(e) {
    if (e.key === 'z' && e.metaKey) {
        e.preventDefault();
    }
}

const GlobalStyle = createGlobalStyle`
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;900&display=swap');
    * {
        margin: 0;
        box-sizing: border-box;
    }
    body {
        background: #424242;
        font-size: 16px;
        font-weight: 400;
        font-family: Lato, sans-serif;
        color: white;
    }
    input {
        font-family: Lato, sans-serif; 
        font-size: inherit;
    }
a {
    &:link, &:visited, &:hover, &:active {
        text-decoration: none;
        color: white;
    }
}
    .react-contextmenu {
        background-color: #222;
        background-clip: padding-box;
        border: 1px solid rgba(0,0,0,.15);
        border-radius: .25rem;
        color: white;
        font-size: .7rem;
        margin: 2px 0 0;
        min-width: 160px;
        outline: none;
        opacity: 0;
        padding: 5px 0;
        pointer-events: none;
        text-align: left;
        transition: opacity 250ms ease !important;
    }

    .react-contextmenu.react-contextmenu--visible {
        opacity: 1;
        pointer-events: auto;
        z-index: 9999;
    }

    .react-contextmenu-item {
        background: 0 0;
        border: 0;
        cursor: pointer;
        font-weight: 400;
        line-height: 1.5;
        padding: 3px 20px;
        text-align: inherit;
        white-space: nowrap;
    }

    .react-contextmenu-item.react-contextmenu-item--active,
    .react-contextmenu-item.react-contextmenu-item--selected {
        color: #fff;
        background-color: #20a0ff;
        border-color: #20a0ff;
        text-decoration: none;
    }

    .react-contextmenu-item.react-contextmenu-item--disabled,
    .react-contextmenu-item.react-contextmenu-item--disabled:hover {
        background-color: transparent;
        border-color: rgba(0,0,0,.15);
        color: #878a8c;
    }

    .react-contextmenu-item--divider {
        border-bottom: 1px solid rgba(255,255, 255,.15);
        cursor: inherit;
        margin-bottom: 3px;
        padding: 2px 0;
    }
    .react-contextmenu-item--divider:hover {
        /* background-color: transparent; */
        /* border-color: rgba(0,0,0,.15); */
    }

    .react-contextmenu-item.react-contextmenu-submenu {
        padding: 0;
    }

    .react-contextmenu-item.react-contextmenu-submenu > .react-contextmenu-item {
    }

    .react-contextmenu-item.react-contextmenu-submenu > .react-contextmenu-item:after {
        content: "▶";
        display: inline-block;
        position: absolute;
        right: 7px;
    }

    .example-multiple-targets::after {
        content: attr(data-count);
        display: block;
    }
`

ReactDOM.render(
    <HashRouter>
        <GlobalStyle />
        <Switch>
            <Route path="/settings" component={Settings} />
            <Route path="/search" component={SearchPanel} />
            <Route path="/value-entry" component={ValueEntryView} />
        </Switch>
    </HashRouter>,
document.getElementById('root'));

declare const module: any

if(module.hot) {
	module.hot.accept(() => {
        removeAllListeners()
    });
}