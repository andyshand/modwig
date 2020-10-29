import React from 'react'
import { styled } from 'linaria/react'
import { SettingsView } from './SettingsView'
import { ModsView } from './ModsView'
import { Spinner } from '../core/Spinner'

const WholeWrap = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    >:nth-child(1) {
        flex-grow: 1;
        overflow-y: auto;
    }
    >:nth-child(2) {

    }
`
const SettingsWrap = styled.div`
    display: flex;
    height: 100%;
    width: 100%;
    >:nth-child(2) {
        flex-grow: 1;
        overflow-y: auto;
    }
    >:nth-child(1) {
        flex-shrink: 0;
    }
`
const Footer = styled.div``
const Tabs = styled.div`
    background: #444;
    padding-top: 6rem;
    width: 8.8rem;
    border-right: 1px solid #333;
    -webkit-app-region: drag; 
`
const TabInner = styled.div`
    &:hover {
        background: ${(props: any) => props.isActive ? `#222` : `#333`};
    }
    color: ${(props: any) => props.isActive ? `white` : `#CCC`};
    background: ${(props: any) => props.isActive ? `#222` : ``};
    padding: 1em;
    padding-right: 2em;
    cursor: pointer;
    user-select: none;
`
export class Settings extends React.Component {
    state = {
    }
    setTab = tab => {

    }
    render() {       
        return <WholeWrap>
            <SettingsWrap>
                <SettingsView />
            </SettingsWrap>
            <Footer>
                {/* <Spinner style={{marginRight: '.3em'}} /> 
                hello */}
                Bitwig UI Scale
                <select>
                    <option>100%</option>
                    <option>125%</option>
                    <option>150%</option>
                    <option>175%</option>
                    <option>200%</option>
                    <option>225%</option>
                </select>
            </Footer>
        </WholeWrap>
    }
}