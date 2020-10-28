import React from 'react'
import { styled } from 'linaria/react'
import { SettingsView } from './SettingsView'
import { ModsView } from './ModsView'
import { Spinner } from '../core/Spinner'

const WholeWrap = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    >:nth-child(1) {
        flex-grow: 1;
        overflow-y: auto;
    }
    >:nth-child(2) {

    }
`
const SettingsWrap = styled.div`
    display: flex;
    height: 100%;
    width: 100%;
    >:nth-child(2) {
        flex-grow: 1;
        overflow-y: auto;
    }
    >:nth-child(1) {
        flex-shrink: 0;
    }
`
const Footer = styled.div``
const Tabs = styled.div`
    background: #444;
    padding-top: 6rem;
    width: 8.8rem;
    border-right: 1px solid #333;
    -webkit-app-region: drag; 
`
const TabInner = styled.div`
    &:hover {
        background: ${(props: any) => props.isActive ? `#222` : `#333`};
    }
    color: ${(props: any) => props.isActive ? `white` : `#CCC`};
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
        name: "Mods",
        component: () => <ModsView />
    },
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
        return <WholeWrap>
            <SettingsWrap>
                <Tabs>
                    {tabs.map(tab => {
                        return <Tab tab={tab} key={tab.name} isActive={tab === this.state.activeTab} setTab={this.setTab} />
                    })}
                </Tabs>
                <Active />
            </SettingsWrap>
            <Footer>
                <Spinner style={{marginRight: '.3em'}} /> 
                hello
            </Footer>
        </WholeWrap>
    }
}