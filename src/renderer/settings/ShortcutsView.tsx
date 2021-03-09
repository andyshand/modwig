import React, { useState } from 'react'
import { styled } from 'linaria/react'
import { settingShortDescription, settingTitle, shortcutToTextDescription, shouldShortcutWarn } from './helpers/settingTitle'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamation } from '@fortawesome/free-solid-svg-icons'
import { SettingShortcut } from './setting/SettingShortcut'
const TableWrap = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 33.3%;
    overflow-y: auto;

    tbody tr {
        &:hover {
            background: #181818;
        }
    }
    th, td {
        padding: 0.2em 1.2rem;
        &:not(:last-child) {
            border-right: 1px solid #111;
        }
    }
    th {
        text-align: left;
        font-weight: 400;
        padding-top: .9em;
        padding-bottom: 1em;
        color: #5b5b5b;
    }
    td {
        font-size: .9em;
        /* color: #ccc; */
        color: #818181;
        &:not(:first-child) {
            color: #555;
        }
    }
    table {
        width: 100%;
    }
    table, th, td {
        /* border: 1px solid black; */
        border-collapse: collapse;
    }
    cursor: pointer;
`
const Wrap = styled.div`
`
const InfoPanelWrap = styled.div`
position: absolute;
top: 0;
left: 66.7%;
bottom: 0;
right: 0;
overflow-y: auto;
background: #121212;
border-left: 1px solid black;
> div {
    padding: 2.5rem;
    >h1 {
        font-size: 1.1em;
        font-weight: 400;
        color: #a7a7a7;
    }
    >p {
        margin-top: 2rem;
        color: #717171;
    }
    >div {
        margin-top: 5.5rem;
        max-width: 11.9rem;
        margin: 2.5rem auto;
    }
}
`
const InfoPanel = ({selectedSetting}) => {
    if (selectedSetting) {
        return <InfoPanelWrap>
            <div>
                <h1>{settingTitle(selectedSetting)}</h1>
                <p>{settingShortDescription(selectedSetting)}</p>
                <div><SettingShortcut setting={selectedSetting} /></div>
            </div>
        </InfoPanelWrap>
    } else {
        return <InfoPanelWrap>
            {/* <div>Select a setting to see more info.</div>         */}
        </InfoPanelWrap>
    }
}

const WarningIcon = styled.div`
    background: #ecec58;
    border-radius: 1000px;
    height: 1.6em;
    color: #606029;
    width: 1.6em;
    font-size: 0.7em;
    border: 1px solid #606029;
    display: inline-flex;
    align-items: center;
    justify-content: center;
`
const Warning = () => {
    return <WarningIcon title={`Please note it's currently not possible to prevent single character shortcuts from triggering in text fields`}>
        <FontAwesomeIcon icon={faExclamation} />
    </WarningIcon>
}

export const ShortcutsView = ({ settings }) => {
    const [selectedSetting, setSelectedSetting] = useState(null)

    return <Wrap>
        <TableWrap>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Mod</th>
                        <th>Shortcut</th>
                    </tr>
                </thead>
                <tbody>
                {settings.map(sett => {
                    return <tr key={sett.key} onClick={() => setSelectedSetting(sett)} style={sett.key === (selectedSetting?.key ?? null) ? {background: '#111'} : {}}>
                        <td>{settingTitle(sett)}</td>
                        <td>{sett.mod}</td>
                        <td>{shortcutToTextDescription(sett)} {shouldShortcutWarn(sett) ? <Warning /> : null}</td>
                        {/* <td></td> */}
                    </tr>
                })}
                </tbody>
            </table>
        </TableWrap>
        <InfoPanel selectedSetting={selectedSetting} />
    </Wrap>
}