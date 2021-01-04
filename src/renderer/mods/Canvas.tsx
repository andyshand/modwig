import React from 'react'
import { styled } from 'linaria/react'
import { ModwigComponent } from '../core/ModwigComponent'
import { shortcutToTextDescription } from '../settings/helpers/settingTitle'
import { faBolt, faInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
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
    font-size: .9rem;
    font-family: 'Menlo', 'monospace';
    margin-top: .2em;
    /* border-radius: .3em; */
    /* justify-content: center; */
    background: rgba(0, 0, 0, 0.7);
    color: white;
`
const notifTimeoutCheckFreqMS = 500

const IconNotifWrap = styled.div`
    display: flex;
    align-items: center;
    > * {
    }
    >:nth-child(1) {
        padding: .4em .8em;
        font-size: .8em;
        border-right: 1px solid #777;
    }
    >:nth-child(2) {
        padding: .4em .8em;
    }
`
const IconNotification = ({notification: notif, children}) => {
    const iconMap = {
        actionTriggered: {
            icon: faBolt,
            color: '#d9c955'
        }
    }
    const notifInfo = iconMap[notif.type] || {
        icon: faInfo,
        color: 'white'
    }
    const icon = <FontAwesomeIcon icon={notifInfo.icon} /> || <div>□</div>
    return <IconNotifWrap>
        <div style={{color: notifInfo.color}}>{icon}</div>
        <div>{children}</div>
    </IconNotifWrap>
}

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
            return <IconNotification notification={notif}>{notif.content}</IconNotification>
        } else if (notif.type) {
            return {
                actionTriggered: (notif) => {
                    return <IconNotification notification={notif}>
                        {shortcutToTextDescription({value: notif.data.state})} {notif.data.title}
                    </IconNotification>
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