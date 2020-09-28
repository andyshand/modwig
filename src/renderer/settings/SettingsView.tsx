import React from 'react'
import { getSettings } from './helpers/settingsApi'
import titleize from 'titleizejs'
import { Checkbox } from '../core/Checkbox'
import { styled } from 'linaria/react'
import { SettingShortcut } from './setting/SettingShortcut'
import { SettingBoolean } from './setting/SettingBoolean'
const SettingsViewWrap = styled.div`
    background: #222;
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
class Shortcuts extends React.Component {
    render() {
        const { settings } = this.props
        return <div>
            <ShortcutsWrap>
                <SectionHeader>
                    <div>Settings</div>
                </SectionHeader>
                <div>
                    {settings.filter(s => s.type === 'boolean').map(setting => {
                        return <SettingBoolean key={setting.key} setting={setting} />
                    })}
                </div>
             </ShortcutsWrap>
            <ShortcutsWrap>
                <SectionHeader>
                    <div>Actions</div>
                    <div>Please ensure you have disabled any built-in shortcuts using the same keys.</div>
                </SectionHeader>
                <div>
                    {settings.filter(s => s.type === 'shortcut').map(setting => {
                        return <SettingShortcut key={setting.key} setting={setting} />
                    })}
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
        settings: []
    }
    async componentWillMount() {
        const { data: settings } = await getSettings({category: this.props.category})
        this.setState({
            settings
        })
    }

    render() {
        return <SettingsViewWrap>
            <Shortcuts settings={this.state.settings} />
        </SettingsViewWrap>
    }
}