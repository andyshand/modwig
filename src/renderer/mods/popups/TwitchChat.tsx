import React from 'react'
import { styled } from 'linaria/react'
import moment from 'moment'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComments } from '@fortawesome/free-solid-svg-icons'

export const Wrap = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba( 0, 0, 0, .7);
    font-size: 1.6em;
    display: flex;
    overflow: hidden;
    flex-direction: column;
`
export const UserName = styled.span`
    color: #777;
`
export const Date = styled.span`
    color: #777;
`
export const PanelTitle = styled.div`
    text-align: center;
    padding: 1.2em 0;
`
const Messages = styled.div`
    display: flex;
    padding: 1em 1.3em;
    flex-grow: 1;
    background: rgba(255, 255, 255, 0.05);
    flex-direction: column-reverse;
`
const Message = styled.div`
    margin-bottom: .5em;

    @keyframes flashIn {
        from {
            background: #666;
        }
        to {
            background: transparent;
        }
    }
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(20%);
        }
        to {
            opacity: 1;
            transform: translateX(0%);
        }
    }
    animation: flashIn 4s linear 1, slideIn .3s linear 1;
    animation-fill-mode: forwards;
`

const MessageText = ({ message }) => {
    let { messageText, emotes } = message

    emotes = emotes.slice() || []

    let remainingMessageText = messageText
    // let i = 0
    let elementI = 0
    let parts = []
    while (emotes.length) {
        const thisEmote = emotes.shift()
        const i = messageText.length - remainingMessageText.length
        if (thisEmote.startIndex > i) {
            // If emote start is after current string index, add the portion before as its own span
            parts.push(<span key={elementI++}>{messageText.slice(i, thisEmote.startIndex)}</span>)
            remainingMessageText = messageText.slice(thisEmote.startIndex)
        }
        // then add the emote
        parts.push(<img style={{width: 'auto', height: '35px'}} key={elementI++} src={`https://static-cdn.jtvnw.net/emoticons/v1/${thisEmote.id}/2.0`} />)
        remainingMessageText = messageText.slice(thisEmote.endIndex)
    }
    if (remainingMessageText){
        parts.push(<span key={elementI++}>{remainingMessageText}</span>)
    }

    return <span>
        {parts}
    </span>
}

export const TwitchChat = ( { messages }) => {
    return <Wrap>
        <PanelTitle><FontAwesomeIcon icon={faComments} style={{marginRight: '.5em'}} /> twitch chat</PanelTitle>
        <Messages>
        { messages.slice(-50).map(message => {
            const date = moment(message.serverTimestamp)
            return <Message key={message.messageId}><Date>[{date.format('HH:mm')}]</Date> <UserName style={{color: message.colorRaw ? message.colorRaw : '#777' }}>{message.displayName}</UserName>: <MessageText message={message} /></Message>
        })}
        </Messages>
    </Wrap>
}