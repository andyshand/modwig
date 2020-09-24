import React from 'react'
import { getResourcePath } from '../../connector/shared/ResourcePath'
import { styled } from 'linaria/react'
const Button = styled.div`
    background: #EA6A10;
    color: white;
    padding: .5em 2em;
    margin: 0 auto;
    display: inline-block;
`
const Video = styled.video`

    width: 80%;
    margin: 0 auto;
    display: block;
`
const StepText = styled.div`
    text-align: center;
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
`
const StepCircle = styled.div`
    width: 2em;
    height: 2em;
    background: #CCC;
    border-radius: 100%;

    &:not(:last-child) {
        margin-right: 1em;
    }
`
export class Setup extends React.Component {
    state = {
        step: 0
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
            description: 'Open Bitwig Settings and enable the "Bitwig Enhancement Suite" controller in Bitwig.',
            content: <Video autoPlay>
                <source src={getResourcePath('/videos/setup-0.mp4')} type="video/mp4" />
            </Video>
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
                <div>Step {this.state.step + 1}</div>
                {currStep.content}
                <StepText>
                    <StepCircles>
                        {this.times(this.getStepCount()).map(i => {
                            return <StepCircle onClick={() => this.setStep(i)} />
                        })}
                    </StepCircles>
                <div>{currStep.description}</div>
                {currStep.canContinue ? <Button onClick={this.onNextStep}>Continue</Button> : null}
                </StepText>
            </div>
        </StepWrap>
    }
}