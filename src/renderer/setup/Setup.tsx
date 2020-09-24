import React from 'react'
import { getResourcePath } from '../../connector/shared/ResourcePath'
import { styled } from 'linaria/react'
const Button = styled.div`
    background: #EA6A10;
    color: white;
    padding: .5em 2em;
    margin: 0 auto;
    display: inline-block;
    cursor: pointer;   
    &:hover {
        filter: brightness(85%);
    }
    border-radius: .2em;
    margin-top: 1.6rem;
`
const Video = styled.video`
    width: 80%;
    margin: 0 auto;
    margin-bottom: 1.6rem;
    display: block;
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
    position: fixed;
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
    width: .7em;
    height: .7em;
    background: ${(props: any) => props.isActive ? `#CCC` : `#666`};
    border-radius: 100%;
    cursor: pointer;
    &:hover {
        background: #999;
    }

    &:not(:last-child) {
        margin-right: .5em;
    }
`
export class Setup extends React.Component {
    state = {
        step: 3
    }
    step0() {
        return {
            description: 'Thanks for trying out Bitwig Enhancement Suite. There are just a couple setup steps to get things working...',
            canContinue: true,
            content: null
        }
    }
    step1() {
        return {
            description: 'Open Bitwig Settings and enable the "Bitwig Enhancement Suite" controller.',
            content: <Video loop autoPlay>
                <source src={getResourcePath('/videos/setup-0.mp4')} type="video/mp4" />
            </Video>
        }
    }
    step2() {
        return {
            description: <div>
                Bitwig needs accessibility access in order to monitor keyboard shortcuts globally.
                <Button>Enable Accessibility Access</Button>
            </div>,
            content: null
        }
    }
    step3() {
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
            this.setState({step: nextI}) 
        } else {
            // we're done!
            window.location.href = '#/settings'
        }
    }
    setStep = (i) => {
        if (i < this.state.step) {
            this.setState({step: i})
        }
    }
    render() {
        const currStep = this['step' + this.state.step]()
        return <StepWrap>
            <div>
                {currStep.content}
                <StepCircles>
                    {this.times(this.getStepCount()).map(i => {
                        return <StepCircle isActive={i === this.state.step} onClick={() => this.setStep(i)} />
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