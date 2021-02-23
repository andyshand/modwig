import React from 'react'
import { styled } from 'linaria/react'
import { TransportNavPopup } from './TransportNavPopup'
import { PopupLabel } from './popups/PopupLabel'
import { send } from '../bitwig-api/Bitwig'
import { PluginWindowWrap } from './popups/PluginWindowWrap'
import { TrackOverlay } from './popups/TrackOverlay'
import { Timer } from './canvas/Timer'
import { ErrorBoundary } from './canvas/ErrorBoundary'

const Wrap = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
`
const Test = styled.div`
    background: white;
    padding: 2em;
    color: black;
    width: 100px;
    height: 100px;
`
const PopupWrap = styled.div`
    position: absolute;
`
const NotFound = styled.div`
    background: #AAA;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
`
const ComponentMap = {
    TransportNavPopup: TransportNavPopup,
    PopupLabel: PopupLabel,
    PluginWindowWrap: PluginWindowWrap,
    TrackOverlay: TrackOverlay,
    Timer: Timer
}

export const PopupRenderer = (props) => {
    const { popups, clickable } = props
    const onWrapClick = event => {
        if (clickable && document.getElementById("test") === event.target) {
            // We clicked the transparent background, forward the click to Bitwig
            send({type: 'api/popups/close-all'})
        }
    }
    return <Wrap clickable={clickable} id="test" onMouseDown={onWrapClick}>
        {popups.map(popup => {
            const Component = ComponentMap[popup.component] || (() => {
                return <NotFound>Component {popup.component} Not Found</NotFound>
            })
            const componentProps = {
                popup,
                ...popup.props,
                sendData: data => {
                    send({
                        type: 'api/popups/data',
                        data: {
                            popupId: popup.id,
                            ...data
                        }
                    })
                }
            }
            return <PopupWrap key={popup.id} style={{
                left: popup.rect.x + 'px',
                top: popup.rect.y + 'px',
                width: popup.rect.w + 'px',
                height: popup.rect.h + 'px'
            }}>
                <ErrorBoundary>
                    <Component {...componentProps} />
                </ErrorBoundary>
            </PopupWrap>
        })}
    </Wrap>
}
