import { BESService, getService } from "./Service";
import { Tray, Menu } from 'electron'
import { getResourcePath } from "../../connector/shared/ResourcePath";

export class TrayService extends BESService {
    timer: any
    animationI = 0
    activate() {
        const socket = getService('SocketMiddlemanService')
        const tray = new Tray(getResourcePath('/images/tray-0.png'))
        const contextMenu = Menu.buildFromTemplate([
          { label: 'Item1', type: 'radio' },
          { label: 'Item2', type: 'radio' },
          { label: 'Item3', type: 'radio', checked: true },
          { label: 'Item4', type: 'radio' }
        ])
        tray.setContextMenu(contextMenu)
        const onNotConnected = () => {
            if (this.timer) {
                clearInterval(this.timer)
            }
            this.timer = setInterval(() => {
                tray.setImage(getResourcePath(`/images/tray-${this.animationI % 6}.png`))    
                this.animationI++
            }, 250)
        }
        onNotConnected()
        socket.events.connected.listen(isConnected => {
            if (isConnected && this.timer) {
                clearInterval(this.timer)
                tray.setImage(getResourcePath(`/images/tray-0.png`))   
            } else {
                onNotConnected()
            }
        })
    }
}