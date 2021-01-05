import React from 'react'
import { getResourcePath } from '../../connector/shared/ResourcePath'
const { app, dialog} = require('electron').remote
const path = require('path')
import { promises as fs} from 'fs'
import { styled } from 'linaria/react'
import { send, sendPromise } from '../bitwig-api/Bitwig'
import { Button } from '../core/Button'
import { Spinner } from '../core/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCheckSquare } from '@fortawesome/free-solid-svg-icons'
import { Input } from '../core/Input'

const Video = styled.video`
    height: 380px;
    margin: 0 auto;
    margin-bottom: 1.6rem;
    display: block;
    border-radius: 0.4em;
`
const FileChooser = styled.div`
    position: relative;
    margin-top: 2em;
    input {
        padding-right: 5em;
    }
    button {
        position: absolute;
        font-size: .9em;
        top: 0;
        bottom: 0;
        right: 0;
        padding-right: 1em;
        padding-left: 1em;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }

`
const EndButton = styled(Button)`
    margin-top: 1.6rem;
`
const StepContent = styled.div`
    text-align: center;
    margin: 0 auto;
`
const CenterText = styled.div`
    max-width: 25em;
    margin: 0 auto;
`
const StepWrap = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    background: #222;
    top: 0;
    bottom: 0;
    position: fixed;
    padding-bottom:3rem;
`
const StepCircles = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
`
const StepCircle = styled.div`
    width: .6em;
    height: .6em;
    background: ${(props: any) => props.isActive ? `#CCC` : props.visited ? `#666` : `#222`};
    border-radius: 100%;
    cursor: pointer;
    &:hover {
        background: #999;
    }

    &:not(:last-child) {
        margin-right: .5em;
    }
`
const StatusMessage = styled.div`
    font-size: .8em;
    color: #CCC;
    margin-top: .4em;
`
let interval
export class Setup extends React.Component {
    state = {
        step: 0,
        visitedSteps: {0: true},
        status: {
            bitwigConnected: false,
            accessibilityEnabled: false
        },
        loading: true,

        userLibraryPath: '',
        checkingLocation: false,
        invalidLocation: false
    }
    refreshStatus = async () => {
        this.setState({loading: true})
        try {
            const { data: status } = await sendPromise({type: 'api/status'}) as any
            this.setState({status})
        } catch (e) {
            console.error(e)
        }
        this.setState({loading: false})
    }
    onFocus = () => {
        this.refreshStatus()
    }   
    componentWillMount() {
        clearInterval(interval)
        interval = setInterval(this.refreshStatus, 1000)
        app.on('browser-window-focus', this.onFocus)
        this.refreshStatus()

        // TODO Linux support
        const getDefaultLibraryLocation = () => {
            // Should work on mac/windows
            return path.join(app.getPath('home'), 'Documents', 'Bitwig Studio')
        }
        this.setState({
            userLibraryPath: getDefaultLibraryLocation()
        })
    }
    componentWillUnmount() {
        clearInterval(interval)
        app.removeListener('browser-window-focus', this.onFocus)
    }
    onChooseLocation = async () => {
        try {
            const { filePaths } = await dialog.showOpenDialog({
                properties: ['openDirectory', 'multiSelections']
            }, function (files) {
                if (files !== undefined) {
                    // handle files
                }
            });
            if (filePaths.length) {
                this.setState({userLibraryPath: filePaths[0]})
            }
            this.onCheckLocation()
        } catch (e) {
            console.error(e)
        }
    }
    onCheckLocation = async () => {
        this.setState({
            checkingLocation: true
        })
        const dir = this.state.userLibraryPath
        const subDirs = ['Auto Mappings', 'Controller Scripts', 'Extensions', 'Library', 'Projects']
        let oneExists = false
        for (const subDir of subDirs) {
            try {
                oneExists = oneExists || (await fs.stat(path.join(dir, subDir))).isDirectory()
            } catch (e) {
                console.error(e)
            }
        }
        this.setState({
            invalidLocation: !oneExists ? dir : false,
            checkingLocation: false
        })
    }
    step0() {
        return {
            description: <div>
                <CenterText>
                    Thanks for trying out Modwig! <br /><br />Please ensure the location of your Bitwig User Library folder below is correct.
                </CenterText>

                <FileChooser>
                    <Input style={{margin: '0 auto', width: '30em'}} type="text" spellCheck={false} autoComplete={'off'} value={this.state.userLibraryPath} onChange={e => {this.setState({userLibraryPath: e.target.value})}} />
                    <Button onClick={this.onChooseLocation}>Choose</Button>
                </FileChooser>

                <EndButton disabled={this.state.checkingLocation || this.state.userLibraryPath === String(this.state.invalidLocation)} onClick={() => !this.state.invalidLocation ? this.onNextStep({ saveLocation: true }) : null }>Looks good! Continue</EndButton>
                <StatusMessage>
                    {this.state.checkingLocation ? <><Spinner style={{marginRight: '.3em'}} />Checking Location...</> : null }
                    {this.state.invalidLocation ? <>That location doesn't seem right..</> : null }
                </StatusMessage>
            </div>,
            content: null
        }
    }
    step1() {
        const { bitwigConnected } = this.state.status
        return {
            description: <div>
                <CenterText>
                    Open Bitwig Settings and enable the "Modwig" controller.
                </CenterText>
                <EndButton onClick={this.onNextStep} disabled={!bitwigConnected}>Continue</EndButton>
                <StatusMessage>{bitwigConnected ? <><FontAwesomeIcon icon={faCheck} /> Connected to Bitwig!</> : <><Spinner style={{marginRight: '.3em'}} /> Waiting for connection...</>}</StatusMessage>
            </div>,
            content: <Video loop autoPlay>
                <source src={getResourcePath('/videos/setup-0.mp4')} type="video/mp4" />
            </Video>
        }
    }
    step2() {
        const { accessibilityEnabled } = this.state.status
        const onClick = () => {
            if (accessibilityEnabled) {
                this.onNextStep()
            } else {
                send({type: 'api/setup/accessibility'})
            }
        }
        return {
            description: <div>
                <CenterText>
                    Modwig needs accessibility access in order to monitor keyboard shortcuts globally.
                </CenterText>
                <EndButton onClick={onClick}>{accessibilityEnabled ? `Continue` : `Enable Accessibility Access`}</EndButton>
                <StatusMessage>{accessibilityEnabled ? <><FontAwesomeIcon icon={faCheck} /> Accessibility Enabled!</> : <><Spinner style={{marginRight: '.3em'}} /> Checking for access...</>}</StatusMessage>
            </div>,
            content: null
        }
    }
    step3() {
        const relaunch = () => {
            app.relaunch({ args: process.argv.slice(1).concat(['--preferences']) })
            app.exit(0)
        }
        return {
            description: <CenterText>
                All done! If you ever need to see these steps again, click the icon in the menu bar and choose "Setup..."<br /><br />

                Restart Modwig to ensure accessibility access has taken effect.

                <EndButton onClick={relaunch}>Restart</EndButton>
            </CenterText>,
            content: null
        }
    }
    getStepCount() {
        let i = 0
        while (this[`step${i}`]) {
            i++
        }
        return i
    }
    times(n) {
        let arr = []
        let i = 0
        while (i < n) {
            arr.push(i++)
        }
        return arr
    }
    onNextStep = async ({saveLocation} = {} as any) => {
        if (saveLocation) {
            send({
                type: 'api/settings/set',
                data: {
                    key: 'userLibraryPath',
                    value: this.state.userLibraryPath,
                    type: 'string' // TODO these should be unnecessary from calling code
                }
            })
        }
        const nextI = this.state.step + 1
        if (nextI < this.getStepCount()) {
            this.setState({
                step: nextI,
                visitedSteps: {
                    ...this.state.visitedSteps,
                    [nextI]: true
                }
            })
            if (nextI === this.getStepCount() - 1) {
                sendPromise({type: `api/setup/finish`})
            }
        }
    }
    setStep = (i) => {
        this.setState({step: i})
    }
    render() {
        const currStep = this['step' + this.state.step]()
        return <StepWrap>
            <div>
                {currStep.content}
                <StepCircles>
                    {this.times(this.getStepCount()).map(i => {
                        const onStepClick = () => {
                            if (this.state.visitedSteps[i]) {
                                this.setStep(i)
                            }
                        }
                        return <StepCircle key={i} visited={this.state.visitedSteps[i]} isActive={i === this.state.step} onClick={onStepClick} />
                    })}
                </StepCircles>
                <StepContent>
                    <div>{currStep.description}</div>
                </StepContent>
            </div>
        </StepWrap>
    }
}