import React, { useEffect, useState } from 'react'
import { styled } from 'linaria/react'
import { send, sendPromise } from '../bitwig-api/Bitwig'

const Select = styled.select`

`
const Footer = styled.div`
    display: flex;
    padding: .3rem 1rem;
    justify-content: flex-end;
    background: #444;
    border-top: 1px solid black;
    -webkit-app-region: drag; 
    > * {
        -webkit-app-region: no-drag; 
        margin-left: 1rem;
    }
`
const LabelledSelect = ({label, options, ...rest}) => {
    return <div>
        <span style={{fontSize: '.8em', paddingRight: '.5em'}}>{label}</span>
        <Select {...rest}>
            {options}
        </Select>
    </div>
}

export const SettingsFooter = () => {

    const Settings = {
        'uiScale': '100%',
        'uiLayout': 'Single Display (Large)'
    }
    const state: any = {}
    for (const key in Settings) {
        const defaultVal = Settings[key]
        state[key] = useState(defaultVal)
    }
    
    useEffect(() => {
        (async () => {
            for (const key in state) {
                const { data: value } = await sendPromise({ type: 'api/settings/get', data: key })
                // console.log(value)
                state[key][1](value)
            }
        })()
    }, [1])

    const onSettingChange = setting => event => {
        const value = event.target.value
        sendPromise({ type: 'api/settings/set', data: {
            key: setting,
            value
        } })
        state[setting][1](value)
    }
    
    // console.log(state)
    return <Footer>
        <LabelledSelect label="UI Scale" value={state.uiScale[0]} onChange={onSettingChange('uiScale')} options={[
            '100%', 
            '125%', 
            '150%', 
            '175%'
        ].map(size => {
            return <option key={size} value={size}>
                {size}
            </option>
        })} />
        <LabelledSelect label="UI Layout" value={state.uiLayout[0]} onChange={onSettingChange('uiLayout')}options={[
            // 'Single Display (Small)', 
            'Single Display (Large)'
        ].map(size => {
            return <option key={size} value={size}>
                {size}
            </option>
        })} />
    </Footer>
}