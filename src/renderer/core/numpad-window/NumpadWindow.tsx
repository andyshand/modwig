import React from 'react'
import { styled } from 'linaria/react'
import { withRouter, useParams, useLocation } from 'react-router-dom'
import { TrackVolume } from '../../search/TrackVolume'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faPlus, faWaveSquare, faMusic, faShare, faFolder } from '@fortawesome/free-solid-svg-icons'

const Number = styled.div`
    width: 31%;
    height: 24%;
    display: flex;
    align-items: center;
    border-left: .7rem solid #CCC;
    padding-left: 1rem;
    border-radius: .3rem;
    border-left-color: ${props => props.track?.color ?? 'transparent'};
    background: ${props => props.active ? '#111' : `#333`};
    flex-direction: column;
    >:nth-child(1) {
        text-align: center;
        flex-grow: 1;
        display: flex;
        align-items: center;
        font-size: 2rem;
        font-weight: 600;
        color: #545454;
    }
`

const Numbers = styled.div`
    position: fixed;
    top: 0;
    flex-wrap: wrap;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
`
const TrackData = styled.div`
    >:nth-child(1) {
        max-width: 95%;
        display: flex;
        align-items: center;
        
        /* white-space: nowrap; */
        span {
            /* overflow: hidden; */
            /* text-overflow: ellipsis; */
        }
    }
    >:nth-child(2) {
        display: flex;
        font-size: .8em;
        align-items: center;
        justify-content: center;
        margin-top: .5em;
    }
    padding-bottom: .5rem;
`

const MuteSolo = styled.div`
    width: 1.8em;
    height: 1.5em;
    display: flex;
    align-items: center;
    border: 1px solid black;
    justify-content: center;
    background: ${(props: any) => props.active ? props.activeColor : '#666'};
    color: ${(props: any) => props.active ? 'black' : 'white'};
    margin-right: .6em;
    border-radius: 0.3em;
    cursor: pointer;
    font-weight: 900;
    text-shadow: ${(props: any) => props.active ? `` : `0 -2px #222`};

`
const TrackIconWrap = styled.div`
    margin-right: .5em;
    width: 1.2em;
    flex-shrink: 0;
    color: ${(props: any) => props.selected ? `#444` : `#888`};
`
const TrackIcon = ({track, selected, allowDeleting, allowAdding, onClick}) => {
    const type = track.type
    function getIcon() {
        if (allowDeleting) {
            return faTrash
        } else if (allowAdding) {
            return faPlus
        } else if (type === 'Audio' || type === 'Hybrid') {
            return faWaveSquare
        } else if (type === 'Instrument') {
            return faMusic
        } else if (type === 'Effect') {
            return faShare
        } else if (type === 'Group' || type === 'Master') {
            return faFolder
        }
    }
    return <TrackIconWrap selected={selected} onClick={onClick}>
        <FontAwesomeIcon icon={getIcon()} />
    </TrackIconWrap>
}

const Num = ({keyData, pressedKey}) => {
    const { track, key: actualKey } = keyData
    return <Number track={keyData.track} active={pressedKey === actualKey}>
        <div>{actualKey.substr(6)}</div>
        {track ? <div>
            <TrackData>
                <div>
                    <TrackIcon track={track} /> <span>{track.name}</span>
                </div>
                <div>
                    <MuteSolo activeColor={`#D0C609`} active={track.solo}>S</MuteSolo>
                    <MuteSolo activeColor={`#F97012`} active={track.mute}>M</MuteSolo>
                    <TrackVolume track={track} />
                </div>
            </TrackData>
        </div> : <div></div>}
    </Number>
}

export const NumpadWindow = ( props ) => {
    const { keys, key } = window.data
    const order = [6, 7, 8, 3, 4, 5, 0, 1, 2]
    return <Numbers>
        {order.map(i => {
            return <Num key={i} pressedKey={key} keyData={keys[i]} />
        })}
    </Numbers>
}