import React from 'react'
import { getSettings } from './helpers/settingsApi'
import titleize from 'titleizejs'
import { Checkbox } from '../core/Checkbox'
import { styled } from 'linaria/react'
import { SettingShortcut } from './setting/SettingShortcut'
import { SettingBoolean } from './setting/SettingBoolean'
import { sendPromise } from '../bitwig-api/Bitwig'
const SettingsViewWrap = styled.div`
    background: #222;
    >:not(:last-child) {
        margin-bottom: 3rem;
    }
`
const ShortcutsWrap = styled.div`
    &:not(:last-child) {
        margin-bottom: 3rem;
    }
`
const SectionHeader = styled.div`
    padding: 1.2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    >:first-child {
        font-size: 0.9em;
        text-transform: uppercase;
        font-weight: 600;
    }
    >:nth-child(2) {
        font-size: .8em;
        text-align: right;
        max-width: 18em;
    }
    color: #888;
    /* text-align: center; */
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
class Shortcuts extends React.Component<any> {
    render() {
        const { settings, title, helpText } = this.props
        let byMod = {}
        let noInMod = []
        settings.forEach(setting => {
            if (setting.modName) {
                byMod[setting.modName] = (byMod[setting.modName] || []).concat(setting)
            } else {
                noInMod.push(setting)
            }
        })

        return <div>
            <ShortcutsWrap>
                <SectionHeader>
                    <div>{title}</div>
                    <div>{helpText}</div>
                </SectionHeader>
                <div>
                    {noInMod.map(setting => {
                        return <SettingShortcut key={setting.key} setting={setting} />
                    })}
                    {Object.keys(byMod).map(modName => {
                        return <div key={modName}>
                            <SectionHeader>
                                <div>Provided by {modName}</div>
                                {/* <div>{helpText}</div> */}
                            </SectionHeader>
                            {byMod[modName].map(setting => {
                                return <SettingShortcut key={setting.key} setting={setting} />
                            })}
                        </div>
                    })}
                    {settings.length === 0 ? <NoMods>
                        <div>No mods found.</div>
                        <div>Adds mods under your Bitwig User Library folder &gt; Modwig &gt; Mods</div>
                    </NoMods> : null}
                </div>
            </ShortcutsWrap>
        </div>
    }
}
type Props = {
    category: string
}
export class SettingsView extends React.Component<Props> {

    state = {
        settings: [],
        mods: [],
        loading: true
    }
    async componentWillMount() {
        const { data: settings } = await getSettings({category: this.props.category})
        this.setState({
            settings,
            loading: false
        })
    }

    render() {
        return <SettingsViewWrap>
            {this.state.loading ? null : <>
                <Shortcuts settings={this.state.settings} title={`Built-in`} helpText={null} />
            </>}
        </SettingsViewWrap>
    }
}