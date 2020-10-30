import React, { useState } from 'react'
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
        border-bottom: 1px solid black;
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
        border-right: 1px solid black;
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
    user-select: none;
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

`
const SidebarSetting = styled.div`
    font-size: .9em;
    white-space: nowrap;
    margin-bottom: .2rem;
    user-select: none;
    &:hover {
        cursor: pointer;
        color: ${(props: any) => props.focused ? '#CCC' : '#AAA'};
    }
    color: ${(props: any) => props.focused ? '#CCC' : ''};
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

` as any
type Props = {

}
const SettingItemWrap = styled.div`
    display: flex;
    width: 100%;    
    
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
    ${SettingItemWrap} {
        padding: 1.2rem ${xPad};
    }
`
const toggleHeight = 1.1
const ToggleStyle = styled.div`
    width: ${toggleHeight * 2.4}em;
    height: ${toggleHeight}em;
    border-radius: 1000px;
    position: relative;
    transition: all .5s;
    background: ${(props: any) => !props.value ? `#333` : '#EA6A10'};
    cursor: pointer;

    &:after {
        content: "";
        position: absolute;
        width: ${toggleHeight * 1.1}em;
        height: ${toggleHeight * 1.1}em;
        background: white;
        border-radius: 1000px;
        transition: all .5s;
        right: ${(props: any) => props.value ? '0' : '60%'};
    }

` as any

const SidebarSection = styled.div`
    &:not(:last-child) {
        margin-bottom: 1.5rem;
    }
    >:nth-child(1) {
        margin-bottom: .5rem;
    }

`
const ToggleAndText = styled.div`
    display: flex;
    flex-direction: column;
    font-size: 1.1em;
`
const ModRow = styled.div`
    padding: 1rem 0;
    border-bottom: 1px solid #262626;
    >:nth-child(2) {
        text-align: center;
    }
    >:nth-child(3) {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        > * {
            width: 48%;

        }
    }
    ${SettingItemWrap} {
        margin-top: 2rem;
    }
`
const ModContent = styled.div`
    display: flex;
    >:nth-child(1) {
        flex-grow: 1;
        padding: 2rem 4rem;
    }
    >:nth-child(2) {
        width: 13rem;
        flex-shrink: 0;
        align-items: center;
        display: flex;
        justify-content: center;

    }
`

const ModsWrap = styled.div`
    display: flex;
    width: 100%;
    height: 100%;
    overflow-y: auto;
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

const Toggle = ({value, onChange}) => {
    const [ ourValue, setOurValue ] = useState(value)
    const onClick = () => {
        onChange(!ourValue)
        setOurValue(!ourValue) 
    }
    return <ToggleStyle onClick={onClick} value={ourValue} />
}

export class SettingsView extends React.Component<Props> {

    state = {
        category: undefined,
        settings: [],
        loading: true,
        searchQuery: '',
        focusedSettingKey: null,
        mods: []
    }

    async fetchData() {
        this.setState({
            loading: true
        })
        if (this.state.category === 'mod') {
            const { data: mods } = await sendPromise({type: 'api/mods'})
            this.setState({
                mods,
                loading: false
            })
        } else {
            const { data: settings } = await getSettings(this.state.category ? {category: this.state.category} : undefined)
            this.setState({
                settings,
                loading: false
            })
        }
    }

    async componentWillMount() {
        await this.fetchData()
    }

    renderShortcutList(addedByMod) {   
        return <div>
            {Object.keys(addedByMod).map(mod => {
                const settings = addedByMod[mod]
                return <ShortcutSection key={mod}>
                    <div style={{color: '#777', textAlign: 'center'}}>{mod == 'null' ? 'Default' : mod}</div>
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

    renderMods() {
        return <ModsWrap>
            <div style={{width: '100%'}}>
            {this.state.mods.filter(mod => mod.name).map(mod => {
                const onToggleChange = async enabled => {
                    await sendPromise({
                        type: 'api/settings/set',
                        data: {
                            ...mod,
                            value: {
                                ...mod.value,
                                enabled: enabled
                            }
                        }
                    })
                    this.fetchData()
                }
                return <ModRow key={mod.id}>
                    <ModContent>
                        <div style={{fontSize: '1.1em'}}>
                            <SettingTitle style={{fontSize: '1.1em'}}>{mod.name}</SettingTitle>
                            <SettingDesc style={{maxWidth: '40rem', fontSize: '1em', marginTop: `1.2rem`}}>{mod.description}</SettingDesc>
                        </div>
                        <ToggleAndText>
                            <Toggle onChange={onToggleChange} value={mod.value.enabled} />
                        </ToggleAndText>
                    </ModContent>
                    <div></div>
                    <div style={{padding: `2rem 4rem`, paddingTop: `0`}}>
                        <SettingItem focused={false} key={mod.id} setting={{...mod, description: `Toggle all actions and related functionality for ${mod.name}.`, name: `Enabled/Disable ${mod.name}`}} />
                        {mod.actions.map(action => {
                            return <SettingItem focused={false} key={action.id} setting={action} />
                        })}
                    </div>
                </ModRow>
            })}
            </div>
        </ModsWrap>
    }

    renderSettings() {
        const filteredSettings = this.state.settings.filter(s => {
            return this.state.searchQuery === '' || (s.key + s.description).toLowerCase().indexOf(this.state.searchQuery) >= 0
        })
        const addedByMod = _.groupBy(filteredSettings, setting => setting.modName)
        return <NavSplit>
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
                                return <SidebarSetting focused={setting.key === this.state.focusedSettingKey} title={settingTitle(setting)} onClick={onClick} key={setting.key}>
                                    <span>{shortcutToTextDescription(setting)}</span>
                                    <span>{settingTitle(setting)}</span>
                                </SidebarSetting>
                            })}
                        </div>
                    </SidebarSection>
                })}
                
            </div>
            <div>
                {this.renderShortcutList(addedByMod)}
            </div>
        </NavSplit>
    }

    render() {
        const tabs = [
            {children: 'All', category: undefined},
            {children: 'Global', category: 'global'},
            {children: 'Arranger', category: 'arranger'},
            {children: 'Browser', category: 'browser'},
            {children: 'Devices', category: 'devices'},
            {children: 'Mods', category: 'mod'}
            // {children: 'Built-in', category: 'bitwig'},
        ]
        return <SettingsViewWrap>
            <div>
                <Tabs>
                    {tabs.map(tab => {
                        return <Tab onClick={() => this.setCategory(tab.category)} active={this.state.category === tab.category}>{tab.children}</Tab>
                    })}
                </Tabs>
                <Search type={'search'} spellCheck={false} autoComplete={"off"} autoCorrect={"off"} onChange={e => this.setState({searchQuery: e.target.value.toLowerCase().trim()})} autoCapitalize={"off"} placeholder="Search..." />
            </div>
            {this.state.category === 'mod' ? this.renderMods() : this.renderSettings()}
        </SettingsViewWrap>
    }
}