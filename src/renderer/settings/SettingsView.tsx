import React from 'react'
import { getSettings } from './helpers/settingsApi'
import titleize from 'titleizejs'
import { Checkbox } from '../core/Checkbox'
import { styled } from 'linaria/react'
import { SettingShortcut } from './setting/SettingShortcut'
import { SettingBoolean } from './setting/SettingBoolean'
import { sendPromise } from '../bitwig-api/Bitwig'
import { settingShortDescription, settingTitle, shortcutToTextDescription } from './helpers/settingTitle'
import _ from 'underscore'
const xPad = `4rem`
const SettingsViewWrap = styled.div`
    background: #131313;
    display: flex;
    height: 100%;
    width:100%;
    position: absolute;
    flex-direction: column;
    >:nth-child(1) {
        background:#444;
        -webkit-app-region: drag; 
        padding-left: 84px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 2.4rem;
    }
    >:nth-child(2) {
        flex-grow: 1;
    }
`
const NavSplit = styled.div`
    position: relative;
    > * {
        overflow-y: auto;
        position: absolute;
        top: 0;
        bottom: 0;
    }
    >:nth-child(1) {
        left: 0;
        width: 18rem;
        background: #1d1d1d;
        color: #616161;
        padding: 0.8rem 1rem;
    }
    >:nth-child(2) {
        right: 0;
        width: calc(100% - 18rem);
    }
`
const Search = styled.input`
    background: #333;
    border: none;
    -webkit-appearance: none;
    height: 100%;
    padding: 0px 0.9em;
    color: white;
    &:focus {
        outline: none;
        background: #111;
    }

`
const NoMods = styled.div`
    text-align: center;
    border: 1px solid #444;
    border-left: none;
    border-right: none;
    padding: 2em 0;
    >:first-child {
        color: #AAA;
    }
    >:nth-child(2) {
        color: #666;
        font-size: .9em;
        margin-top: .5em;
    }

`
const Tabs = styled.div`
    display: flex;
    height: 100%;
    align-items: center;

`
const Tab = styled.div`
    color: ${(props: any) => props.active ? `white` : `#888`};
    padding: 0 .8em;
    white-space: nowrap;
    cursor: pointer;
    &:hover {
        transition: color .25s;
        color: ${(props: any) => props.active ? `white` : `#AAA`};;
    }
`
const SettingTitle = styled.div`
    color: #CCC;
`
const SettingDesc = styled.div`
    color: #666;
    margin-top: .6rem;
    font-size: 1em;
    max-width: 22em;
`
const SidebarSetting = styled.div`
    font-size: .9em;
    white-space: nowrap;
    margin-bottom: .2rem;
    &:hover {
        cursor: pointer;
        color: #CCC;
    }
    display: flex;
    >:nth-child(1) {
        width: 5rem;
        flex-shrink: 0;
        margin-right: .5rem;
    }
    >:nth-child(2) {
        text-overflow: ellipsis;
        overflow: hidden;    
    }

`
type Props = {

}
const SettingItemWrap = styled.div`
    display: flex;
    width: 100%;    
    padding: 1.2rem ${xPad};
    background: ${(props: any) => props.focused ? `#1e1e1e` : `transparent`};
    transition: background .5s;
    >:nth-child(1) {
        flex-grow: 0;
        flex-shrink: 0;
    }
    >:nth-child(2) {
        flex-grow: 1;
        padding-left: 2.4rem;
    }
    /* margin-bottom: 2rem; */


` as any
const ShortcutSection = styled.div`    
    border-bottom: 1px solid #333;
    >:nth-child(1) {
        margin-bottom: 1.5rem;
        padding: 2rem 4rem;
        font-size: 1.2em;
    }
    >:nth-child(2) {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
    }
`
const SidebarSection = styled.div`
    &:not(:last-child) {
        margin-bottom: 1.5rem;
    }
    >:nth-child(1) {
        margin-bottom: .5rem;
    }

`

const SettingItem = ({setting: sett, focused}) => {
    return <SettingItemWrap id={sett.key} focused={focused}>
        <div>
            <SettingShortcut setting={sett} />
        </div>
        <div>
            <div key={sett.key}>
                <SettingTitle>{settingTitle(sett)}</SettingTitle>
                <SettingDesc>{settingShortDescription(sett)}</SettingDesc>
            </div>  
        </div>
    </SettingItemWrap>
}

export class SettingsView extends React.Component<Props> {

    state = {
        category: null,
        settings: [],
        mods: [],
        loading: true,
        bitwigActions: [],
        focusedSettingKey: null
    }

    async fetchData() {
        this.setState({
            loading: true
        })
        let bitwigActions = this.state.bitwigActions
        if (!bitwigActions) {
            const { data } = await sendPromise({type: 'actions'})
            bitwigActions = data
        }
        const { data: settings } = await getSettings(this.state.category ? {category: this.state.category} : undefined)
        this.setState({
            settings,
            bitwigActions,
            loading: false
        })
    }

    async componentWillMount() {
        await this.fetchData()
    }

    renderShortcutList() {   
        const addedByMod = _.groupBy(this.state.settings, setting => setting.modName)
        return <div>
            {Object.keys(addedByMod).map(mod => {
                const settings = addedByMod[mod]
                return <ShortcutSection key={mod}>
                    <div style={{color: '#777'}}>{mod == null ? 'Default' : `Added by ${mod}`}</div>
                    <div>
                        {settings.map(sett => {
                            return <SettingItem focused={sett.key === this.state.focusedSettingKey} setting={sett} />
                        })}
                    </div>
                </ShortcutSection>
            })}
            
        </div>
    }

    setCategory(c) {
        this.setState({category: c}, () => {
            this.fetchData()
        })
    }

    render() {
        const tabs = [
            {children: 'All', category: undefined},
            {children: 'Global', category: 'global'},
            {children: 'Arranger', category: 'arranger'},
            {children: 'Browser', category: 'browser'},
            {children: 'Devices', category: 'devices'},
            {children: 'Built-in', category: 'bitwig'},
        ]
        const addedByMod = _.groupBy(this.state.settings, setting => setting.modName)
        return <SettingsViewWrap>
            <div>
                <Tabs>
                    {tabs.map(tab => {
                        return <Tab onClick={() => this.setCategory(tab.category)} active={this.state.category === tab.category}>{tab.children}</Tab>
                    })}
                </Tabs>
                <Search spellCheck={false} autoComplete={"off"} autoCorrect={"off"} autoCapitalize={"off"} placeholder="Search..." />
            </div>
            <NavSplit>
                <div>
                    {Object.keys(addedByMod).map(mod => {
                        const settings = addedByMod[mod]
                        return <SidebarSection key={mod}>
                            <div style={{color: '#777'}}>{mod == 'null' ? 'Default' : mod}</div>
                            <div>
                                {settings.map(setting => {
                                    const onClick = () => {
                                        this.setState({
                                            focusedSettingKey: setting.key
                                        })
                                        document.getElementById(setting.key).scrollIntoView({behavior: 'auto', block: 'center'})
                                    }
                                    return <SidebarSetting title={settingTitle(setting)} onClick={onClick} key={setting.key}>
                                        <span>{shortcutToTextDescription(setting)}</span>
                                        <span>{settingTitle(setting)}</span>
                                    </SidebarSetting>
                                })}
                            </div>
                        </SidebarSection>
                    })}
                    
                </div>
                <div>
                    {this.renderShortcutList()}
                </div>
            </NavSplit>
        </SettingsViewWrap>
    }
}