import React, { useState } from 'react'
import { getSettings } from './helpers/settingsApi'
import { styled } from 'linaria/react'
import { SettingShortcut } from './setting/SettingShortcut'
import { sendPromise } from '../bitwig-api/Bitwig'
import { humanise, settingShortDescription, settingTitle, shortcutToTextDescription } from './helpers/settingTitle'
import _ from 'underscore'
import { ModLogs } from './ModLogs'
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
const ModAndLogs = styled.div`
    display: flex;
    flex-direction: column;
    >:nth-child(1) {
        height: 66%;
        flex-shrink: 1;
        overflow-y: auto;
    }
    >:nth-child(2) {
        flex-grow: 1;
        overflow-y: auto;
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
        width: 4rem;
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
            @media (max-width: 1199px) {
                width: 100%;
            }
            @media (min-width: 1200px) {
                width: 48%;
            }

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
    const [ ourValue, setOurValue ] = useState(Boolean(value))
    const onClick = () => {
        onChange(!ourValue)
        setOurValue(!ourValue) 
    }
    return <ToggleStyle onClick={onClick} value={ourValue} />
}



export class SettingsView extends React.Component<Props> {

    state = {
        category: 'mod',
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
                loading: false,
                focusedSettingKey: mods[0]?.key
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
        const filteredMods = this.state.mods.filter(mod => this.state.searchQuery === '' || (mod.key + mod.description).toLowerCase().indexOf(this.state.searchQuery) >= 0)
        const modsByCategory = _.groupBy(filteredMods, 'category')
        const chosenMod = this.state.mods.find(mod => this.state.focusedSettingKey === mod.key)
        const onToggleChange = async (mod, enabled) => {
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
        console.log(chosenMod)
        return <NavSplit>
            <div>
                {Object.keys(modsByCategory).map(category => {
                    const mods = modsByCategory[category]
                    return <SidebarSection key={category}>
                        <div style={{color: '#777'}}>{humanise(category)}</div>
                        <div>
                            {mods.map(mod => {
                                const onClick = () => {
                                    this.setState({
                                        focusedSettingKey: mod.key
                                    })
                                }
                                return <SidebarSetting focused={mod.key === this.state.focusedSettingKey} title={mod.name || mod.key} onClick={onClick} key={mod.key}>
                                    <span>{mod.value.enabled ? 'On' : 'Off'}</span>
                                    <span>{mod.name || mod.key}</span>
                                </SidebarSetting>
                            })}
                        </div>
                    </SidebarSection>
                })}
            </div>
            {chosenMod ? <ModAndLogs>
                <ModRow key={chosenMod.id} id={chosenMod.key}>
                    <ModContent>
                        <div>
                            <SettingTitle style={{fontSize: '1.1em'}}>{chosenMod.name}</SettingTitle>
                            <SettingDesc style={{maxWidth: '40rem', fontSize: '1em', marginTop: `1.2rem`}}>{chosenMod.description}</SettingDesc>
                        </div>
                        <ToggleAndText>
                            <Toggle onChange={onToggleChange.bind(null, chosenMod)} value={chosenMod.value.enabled} />
                        </ToggleAndText>
                    </ModContent>
                    <div></div>
                    <div style={{padding: `2rem 4rem`, paddingTop: `0`}}>
                        <SettingItem focused={false} key={chosenMod.id} setting={{...chosenMod, description: `Toggle all actions and related functionality for ${chosenMod.name}.`, name: `Enabled/Disable ${chosenMod.name}`}} />
                        {chosenMod.actions.map(action => {
                            return <SettingItem focused={false} key={action.id} setting={action} />
                        })}
                    </div>
                </ModRow> 
                <ModLogs mod={chosenMod} />
            </ModAndLogs> : null}
        </NavSplit>
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
                        <div style={{color: '#777'}}>{mod == 'null' ? 'Modwig Core' : mod}</div>
                        <div>
                            {settings.map(setting => {
                                const onClick = () => {
                                    this.setState({
                                        focusedSettingKey: setting.key
                                    })
                                    document.getElementById(setting.key).scrollIntoView({behavior: 'auto', block: 'center'})
                                }
                                return <SidebarSetting focused={setting.key === this.state.focusedSettingKey} title={settingTitle(setting)} onClick={onClick} key={setting.key}>
                                    <span style={{
                                        whiteSpace: `normal`,
                                        wordBreak: `break-word`
                                    }}>{shortcutToTextDescription(setting)}</span>
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
            {children: 'Mods', category: 'mod'},
            {children: 'Built-in', category: 'bitwig'},
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