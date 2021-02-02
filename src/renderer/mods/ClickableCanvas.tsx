import React from 'react'
import { styled } from 'linaria/react'
import { ModwigComponent } from '../core/ModwigComponent'
import { PopupRenderer } from './PopupRenderer'
import { send } from '../bitwig-api/Bitwig'

export class ClickableCanvas extends ModwigComponent<any> {
    state = {
        popups: []
    }
    UNSAFE_componentWillReceiveProps(nextProps) {
        this.setState({...nextProps})
    }
    render() {
        return <PopupRenderer clickable={true} popups={this.state.popups} />
    }
}