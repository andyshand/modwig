import React from 'react'
import { styled } from 'linaria/react'
import { SettingsArranger } from './SettingsArranger'
import { SettingsBrowser } from './SettingsBrowser'
import { SettingsDevices } from './SettingsDevices'
import { SettingsView } from './SettingsView'
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
        overflow-y: auto;
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
        background: ${(props: any) => props.isActive ? `#222` : `#333`};
    }
    background: ${(props: any) => props.isActive ? `#222` : ``};
    padding: 1em;
    padding-right: 2em;
    cursor: pointer;
    user-select: none;
`

const Tab = ({tab, setTab, ...rest}) => {
    return <TabInner {...rest} onClick={() => setTab(tab)}>
        {tab.name}
    </TabInner>
}

const tabs = [
    {
        name: "Global",
        component: () => <SettingsView category={`global`} />
    },
    {
        name: "Arranger",
        component: () => <SettingsView category={`arranger`} />
    },
    {
        name: "Browser",
        component: () => <SettingsView category={`browser`} />
    },
    {
        name: "Devices",
        component: () => <SettingsView category={`devices`} />
    },
    // {
    //     name: "Macros",
    //     component: () => <SettingsView category={`macros`} />
    // }
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
                    return <Tab tab={tab} key={tab.name} isActive={tab === this.state.activeTab} setTab={this.setTab} />
                })}
            </Tabs>
            <Active />
        </SettingsWrap>
    }
}