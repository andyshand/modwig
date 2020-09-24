import React from 'react'
import { getSettings } from './helpers/settingsApi'
import titleize from 'titleizejs'
import { Checkbox } from '../core/Checkbox'
import { styled } from 'linaria/react'
import { SettingShortcut } from './setting/SettingShortcut'

const ShortcutsWrap = styled.div`
    background: #222;
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
                    <div>Shortcuts</div>
                    <div>Please ensure you have disabled any built-in shortcuts using the same keys.</div>
                </SectionHeader>
                <div>
                    {settings.filter(s => s.type === 'shortcut').map(setting => {
                        return <SettingShortcut key={setting.key} setting={setting} />
                    })}
                </div>
            </ShortcutsWrap>
            {/* {settings.map(setting => {
                return <div key={setting.key}>
                    {title(setting.key)}
                    {<Checkbox />}
                </div>
            })} */}
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
        return <div>
            <Shortcuts settings={this.state.settings} />
        </div>
    }
}