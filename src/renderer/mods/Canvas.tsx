import React from 'react'
import { styled } from 'linaria/react'
import { ModwigComponent } from '../core/ModwigComponent'
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
    font-size: 1.2rem;
    padding: 1em;
    margin-top: 1em;
    border-radius: .3em;
    /* justify-content: center; */
    background: rgba(0, 0, 0, 0.5);
    color: white;

`
const notifTimeoutCheckFreqMS = 500
export class Canvas extends ModwigComponent<any> {
    canvasRef = React.createRef<HTMLCanvasElement>()
    state = {
        notifications: []
    }
    componentWillReceiveProps(nextProps) {
        const { notifications } = nextProps
        this.setState({
            notifications: this.state.notifications.concat(notifications)
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
    renderNotifications() {
        return <NotificatinosWrap>
            {this.state.notifications.map(notif => {
                return <Notification key={notif.id}>
                    {notif.content}
                </Notification>
            })}
        </NotificatinosWrap>
    }
    render() {
        return <Wrap>
            <canvas ref={this.canvasRef} />
            {this.renderNotifications()}
        </Wrap>
    }
}