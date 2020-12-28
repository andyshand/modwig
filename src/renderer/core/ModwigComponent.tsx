import React from 'react'
import { addPacketListener } from '../bitwig-api/Bitwig'

export class ModwigComponent<T> extends React.Component<T> { 
    onUnmount = []
    componentWillUnmount() {
        for (const func of this.onUnmount) {
            func()
        }
    }
    addAutoPacketListener(type: string, listener: (packet: any) => void) {
        this.onUnmount.push(addPacketListener(type, listener))
    }
}