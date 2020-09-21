import React from 'react'
import { styled } from 'linaria/react'
import { SettingsArranger } from './SettingsArranger'
import { SettingsBrowser } from './SettingsBrowser'
import { SettingsDevices } from './SettingsDevices'
import { SettingsGlobal } from './SettingsGlobal'
import { SettingsMacros } from './SettingsMacros'
import { SettingsNoteEditor } from './SettingsNoteEditor'

const SettingsWrap = styled.div`
    display: flex;
    height: 100%;
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    >:nth-child(2) {
        flex-grow: 1;
    }
    >:nth-child(1) {
        flex-shrink: 0;
    }
`
const Tabs = styled.div`
    background: #444;
    box-shadow: 0 0 1em rgba(0, 0, 0, 0.3);
`
const TabInner = styled.div`
    &:hover {
        background: #333;
    }
    background: ${(props: any) => props.isActive ? `#222` : ``};
    padding: 1em;
    cursor: pointer;
    user-select: none;
`

const Tab = props => {
    return <TabInner {...props} onClick={e => props.setTab(props)}>
        {props.name}
    </TabInner>
}
const tabs = [
    {
        name: "Global",
        component: SettingsGlobal
    },
    {
        name: "Arranger",
        component: SettingsArranger
    },
    {
        name: "Browser",
        component: SettingsBrowser
    },
    {
        name: "Devices",
        component: SettingsDevices
    },
    {
        name: "Note Editor",
        component: SettingsNoteEditor
    },
    {
        name: "Macros",
        component: SettingsMacros
    }
]

export class Settings extends React.Component {
    state = {
        activeTab: tabs[0]
    }
    setTab = tab => {
        this.setState({activeTab: tab})
    }
    render() {       
        const Active = this.state.activeTab.component
        return <SettingsWrap>
            <Tabs>
                {tabs.map(tab => {
                    return <Tab {...tab} key={tab.name} isActive={tab === this.state.activeTab} setTab={this.setTab} />
                })}
            </Tabs>
            <Active />
        </SettingsWrap>
    }
}