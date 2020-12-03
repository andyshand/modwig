import React, { useEffect, useState } from 'react'
import { addPacketListener, send } from '../bitwig-api/Bitwig'
import moment from 'moment'
import { styled } from 'linaria/react'
import { parse } from 'ansicolor'


const Logs = styled.div`
    background: 0;  
    font-family: Monaco, monospace;
    font-size: .7em;
    padding: 1em;
    > * {
        @keyframes flashIn {
            from {
                background: #666;
            }

            to {
                transform: transparent;
            }
        }
        animation: flashIn 5s linear 1;
        animation-fill-mode: forwards;
        >:nth-child(1) {
            margin-right: 1em;
            color: #666;
        }
    }
`

let nextLogId = 0
let latestLogs = []
export const ModLogs = ({mod}) => {
    const [ logs, setLogs ] = useState([])
    latestLogs = logs
    useEffect(() => {
        setLogs([])
        send({
            type: `api/mods/log`,
            data: mod.id
        })
        return addPacketListener(`log`, packet => {
            setLogs([{msg: packet.data, id: nextLogId++, date: new Date()}].concat(latestLogs))
        })
    }, [mod.id])

    return <Logs>
        {logs.map(log => {
            return <div key={log.id}>
                <span>{moment(log.date).format(`h:mm:ss`)}</span> <>{parse(log.msg).spans.map((span, i) => {
                    return <span style={{color: span.color?.name ?? ''}} key={i}>
                        {span.text}
                    </span>
                })}</>
            </div>
        })}
    </Logs>
}