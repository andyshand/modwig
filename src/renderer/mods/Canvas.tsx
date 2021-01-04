import React from 'react'
import { styled } from 'linaria/react'
import { ModwigComponent } from '../core/ModwigComponent'
import { shortcutToTextDescription } from '../settings/helpers/settingTitle'
const Wrap = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
`
const NotificatinosWrap = styled.div`
    position: absolute;
    bottom: 27rem;
    right: 3rem;
    display: flex;
    flex-direction: column;
`
const Static = styled.div`
@keyframes fadeIn {
        from {
            opacity: 0;
        }

        to {
            transform: translateY(0%);
        }
    }
    animation: slideIn .3s linear 1;
    animation-fill-mode: forwards;
    position: absolute;
    color: #CCC;
    font-size: 1em;
    bottom: .95rem;
    right: 15rem;
    display: flex;
    align-items: center;
    > * {
        display: flex;
        align-items: center;
        margin-left: 1rem;
    }
`
const Notification = styled.div`
     @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(10%);
        }

        to {
            transform: translateY(0%);
            opacity: 1;
        }
    }
    animation: slideIn .3s linear 1;
    animation-fill-mode: forwards;
    position: relative;
    /* flex-wrap: wrap; */
    /* display: flex;
    align-items: center; */
    text-align: left;
    width: 20em;
    font-size: .8rem;
    font-family: 'Menlo', 'monospace';
    padding: .4em .8em;
    /* margin-top: 1em; */
    /* border-radius: .3em; */
    /* justify-content: center; */
    background: rgba(0, 0, 0, 0.7);
    color: white;

`
const notifTimeoutCheckFreqMS = 500
export class Canvas extends ModwigComponent<any> {
    canvasRef = React.createRef<HTMLCanvasElement>()
    state = {
        notifications: [],
        browserIsOpen: false,
        enteringValue: false
    }
    componentWillReceiveProps(nextProps) {
        const notifications = nextProps.notifications || []
        this.setState({
            ...nextProps,
            notifications: this.state.notifications.concat(notifications),
        })
        
        const timeoutUntilAllDone = () => {
            const now = new Date()
            const newNotifs = this.state.notifications.filter(notif => now < notif.timeout)
            this.setState({
                notifications: newNotifs
            })
            if (newNotifs.length > 0) {
                setTimeout(timeoutUntilAllDone, notifTimeoutCheckFreqMS)
            }
        }
        setTimeout(timeoutUntilAllDone, notifTimeoutCheckFreqMS)
    }
    componentDidMount() {
        
    }
    renderNotification(notif) {
        if (!notif.type) {
            return notif.content
        } else if (notif.type) {
            return {
                actionTriggered: (notif) => {
                    // return <div>{JSON.stringify(notif.data)}</div>
                    return <div>{shortcutToTextDescription({value: notif.data.state})} {notif.data.title}</div>
                }
            }[notif.type](notif)
        }
    }

    renderNotifications() {
        return <NotificatinosWrap>
            {this.state.notifications.map(notif => {
                return <Notification key={notif.id}>
                    {this.renderNotification(notif)}
                </Notification>
            })}
        </NotificatinosWrap>
    }
    render() {
        return <Wrap>
            <canvas ref={this.canvasRef} />
            {this.renderNotifications()}
            <Static>
                {this.state.browserIsOpen ? <div>Browser Open</div> : null}
                {this.state.enteringValue ? <div>Entering Value</div> : null}
                <div><div style={{
                    marginRight: '.4rem', marginTop: '.3rem', width: '.5rem', height: '.5rem', borderRadius: '1000px', background: 'rgb(230,89,13)'
                }}/> modwig active</div>
            </Static>
        </Wrap>
    }
}