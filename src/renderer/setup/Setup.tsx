import React from 'react'
import { getResourcePath } from '../../connector/shared/ResourcePath'
const { app } = require('electron').remote
import { styled } from 'linaria/react'
import { sendPromise } from '../bitwig-api/Bitwig'
import { Button } from '../core/Button'
import { Spinner } from '../core/Spinner'

const Video = styled.video`
    width: 80%;
    margin: 0 auto;
    margin-bottom: 1.6rem;
    display: block;
    border-radius: 0.4em;
`
const StepText = styled.div`
    text-align: center;
    max-width: 25em;
    margin: 0 auto;
`
const StepWrap = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
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
        loading: true
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
    }
    componentWillUnmount() {
        clearInterval(interval)
        app.removeListener('browser-window-focus', this.onFocus)
    }
    // step0() {
    //     return {
    //         description: 'Thanks for trying out Bitwig Enhancement Suite. There are just a couple setup steps to get things working...',
    //         canContinue: true,
    //         content: null
    //     }
    // }
    step0() {
        const { bitwigConnected } = this.state.status
        return {
            description: <div>
                Open Bitwig Settings and enable the "Bitwig Enhancement Suite" controller.

                <Button onClick={this.onNextStep} disabled={!bitwigConnected}>Continue</Button>
                <StatusMessage>{bitwigConnected ? `Connected to Bitwig!` : <><Spinner style={{marginRight: '.3em'}} /> Waiting for connection...</>}</StatusMessage>
            </div>,
            content: <Video loop autoPlay>
                <source src={getResourcePath('/videos/setup-0.mp4')} type="video/mp4" />
            </Video>
        }
    }
    step1() {
        const { accessibilityEnabled } = this.state.status
        return {
            description: <div>
                Bitwig needs accessibility access in order to monitor keyboard shortcuts globally.<br /><br />
                Please note that you may need to restart Bitwig Enhancement Suite after enabling access.
                <Button onClick={this.onNextStep}>{accessibilityEnabled ? `Continue` : `Enable Accessibility Access`}</Button>
                <StatusMessage>{accessibilityEnabled ? `Accessibility Enabled!` : <><Spinner style={{marginRight: '.3em'}} /> Checking for access...</>}</StatusMessage>
            </div>,
            content: null
        }
    }
    step2() {
        return {
            description: <div>
                All done! If you ever need to see these steps again, click the icon in the menu bar and choose "Setup..."
            </div>,
            canContinue: true,
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
    onNextStep = () => {
        const nextI = this.state.step + 1
        if (nextI < this.getStepCount()) {
            this.setState({
                step: nextI,
                visitedSteps: {
                    ...this.state.visitedSteps,
                    [nextI]: true
                }
            })
        } else {
            // we're done!
            window.location.href = '#/settings'
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
                        return <StepCircle visited={this.state.visitedSteps[i]} isActive={i === this.state.step} onClick={onStepClick} />
                    })}
                </StepCircles>
                <StepText>
                <div>{currStep.description}</div>
                {currStep.canContinue ? <Button onClick={this.onNextStep}>{this.state.step === this.getStepCount() - 1 ? `Finish and Customise Settings` : `Continue`}</Button> : null}
                </StepText>
            </div>
        </StepWrap>
    }
}