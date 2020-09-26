import { faCross, faTimesCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, {useState} from 'react'
import { styled } from 'linaria/react'
import { sendPromise } from '../../bitwig-api/Bitwig'
import { settingTitle } from '../helpers/settingTitle'
import { Checkbox } from '../../core/Checkbox'

const xPad = "1.2rem";

const FlexRow = styled.div`
    display: flex;
    position: relative;
    align-items: center;
    font-size: .9em;
    >:first-child {
        padding: 0 ${xPad};
        width: 12em;
    }
    >:not(:first-child) {
        flex-grow: 1;
        color: #AAA;
    }
    
    &:hover {
        > * div {
            opacity: 1;
            transition: opacity .2s;
        }
    }
    > * {
        div {
            opacity: 0;
            position: absolute;
            top: 50%;
            right: ${xPad};
            transform: translateY(-50%);
        }
    }
`
const ShortcutWrap = styled.div`
    
    /* border-radius: .5em; */
    overflow: hidden;
    border: 1px solid #666;
    user-select: none;
    cursor: default;
    border-left: none;
    border-right: none;

    &:not(:last-child) {
        border-bottom: none;
    }
`

export const SettingBoolean = ({setting}) => {
    const [value, setValue] = useState(setting.value?.value || false)

    const updateValue = value => {
        sendPromise({
            type: 'api/settings/set',
            data: {
                ...setting,
                value
            }
        })
        setValue(value)
    }

    return <ShortcutWrap >
      
            <div>
                {settingTitle(setting)}
            </div>
            <div>
                {setting.description}
            </div>

    </ShortcutWrap>
}