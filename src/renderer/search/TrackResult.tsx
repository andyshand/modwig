import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { send, getCueMarkerAtPosition } from '../bitwig-api/Bitwig'
import { styled } from 'linaria/react'
import { faWaveSquare, faMusic, faShare, faFolder, faStar, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { TrackVolume } from './TrackVolume'
import { SearchResult, TrackSearchOptions } from './TrackSearchView'

const FlexGrow = styled.div`
    flex-grow: 1;
`
const Color = styled.div`
    background: ${props => props.color};
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 1em;  
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
const TrackTitle = styled.span`
    color: ${(props: any) => props.selected ? `white` : `inherit`};
`

const Result = styled.div`
    user-select: none;
    background: ${(props: any) => props.selected ? `#888` : (props.inCue ? `#333` : `#444`)};
    padding: .5em 1.3em;
    font-size: .9em;
    border-bottom: 2px solid #111;
    border-right: 2px solid #111;
    display: flex;
    color: #D3D3D3;
    align-items: center;
    justify-content: space-between;
    padding-left: 2.1em;
    > * {
        flex-shrink: 0;
    }
    position: relative;
`
const TrackIconWrap = styled.div`
    margin-right: .5em;
    width: 1.2em;
    flex-shrink: 0;
    color: ${(props: any) => props.selected ? `#444` : `#888`};
`

const Recent = styled.div`
    font-size: .8em;
    margin-right: 1em;
`

type TrackResultProps = {
    result: SearchResult, 
    onConfirmed: (result: SearchResult) => void, 
    onShouldSelect: (result: SearchResult) => void,
    selected: boolean,
    options: TrackSearchOptions,
    refreshSearch: Function
}
export const TrackResult = ({result, selected, onConfirmed, onShouldSelect, options, refreshSearch}: TrackResultProps) => {
    const { track, isInCue } = result

    const wrapRef = useRef(null);
    const [solo, setSolo] = useState(track.solo)
    const [mute, setMute] = useState(track.mute)
    const [mouseOverWithAlt, setMouseOverWithAlt] = useState(false)
    
    useEffect( () => {
        setSolo(track.solo)
        setMute(track.mute)

        
    }, [track.mute, track.solo])

    useLayoutEffect(() => {
        const mouseListener = (event: MouseEvent) => {
            setMouseOverWithAlt(event.altKey)
        }
        const mouseLeaveListener = event => {
            if (event.type === 'keyup') {
                if (event.key === 'Alt') {
                    setMouseOverWithAlt(false)
                }
            } else {
                setMouseOverWithAlt(false)
            }
        }
        wrapRef.current.addEventListener('mousemove', mouseListener)
        wrapRef.current.addEventListener('mouseleave', mouseLeaveListener)
        window.addEventListener('keyup', mouseLeaveListener)
        return () => {
            wrapRef.current.removeEventListener('mousemove', mouseListener)
            wrapRef.current.removeEventListener('mouseLeaveListener', mouseLeaveListener)
            window.removeEventListener('keyup', mouseLeaveListener)
        }
    }, ['never'])
    
    const toggleSolo = () => {
        send({
            type: 'track/update',
            data: {
                name: track.name,
                solo: !solo
            }
        })
        setSolo(!solo)
    }
    
    const toggleMute = () => {
        send({
            type: 'track/update',
            data: {
                name: track.name,
                mute: !mute
            }
        })
        setMute(!mute)
    }
    
    const onDoubleClick = event => {
        event.stopPropagation()
    }

    const onIconClick = event => {
        if (mouseOverWithAlt) {
            const cue = getCueMarkerAtPosition(options.transportPosition)
            const after = track.data?.afterCues ?? {}
            if (isInCue) {
                delete after[cue.name]
            } else {
                after[cue.name] = true
            }
            send({
                type: 'track/save',
                data: {
                    name: track.name,
                    data: {
                        ...track.data,
                        afterCues: after
                    }
                }
            })
        }
    }

    return <Result inCue={isInCue} ref={wrapRef} id={selected ? 'selectedtrack' : ''} key={track.id} selected={selected} onDoubleClick={() => onConfirmed(result)} onMouseDown={() => onShouldSelect(result)}>
        <Color color={track.color} />
        <TrackIcon selected={selected} track={track} onClick={onIconClick} allowAdding={mouseOverWithAlt && !isInCue} allowDeleting={mouseOverWithAlt && isInCue} /> 
        <TrackTitle selected={selected}>{track.name}</TrackTitle> 
        <FlexGrow /> 
        {result.isRecent ? <Recent><FontAwesomeIcon icon={faStar} /></Recent> : null}
        <MuteSolo onDoubleClick={onDoubleClick} activeColor={`#D0C609`} active={solo} onClick={toggleSolo}>S</MuteSolo>
        <MuteSolo onDoubleClick={onDoubleClick} activeColor={`#F97012`} active={mute} onClick={toggleMute}>M</MuteSolo>
        <TrackVolume track={track} />
    </Result>
}