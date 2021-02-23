/**
 * @name Twitch Chat Overlay
 * @id twitch-chat-overlay
 * @description Adds twitch chat as an onscreen overlay
 * @category global
 */

const { ChatClient } = require("dank-twitch-irc");
const moment = require('moment')

let client = new ChatClient();
client.on("ready", () => {
  log("Successfully connected to chat")
  
});

client.on("close", (error) => {
  if (error != null) {
    log("Client closed due to error", error);
  }
});

const openTimerWithProps = props => {
  Popup.openPopup({
    id: 'timer',
    component: 'Timer',
    props,
    rect: {
        x: 0,
        y: 0,
        w: 200,
        h: 200
    },
    clickable: false
  })
}

const existingTimer = (await Db.getCurrentProjectData() || {}).timer
if (existingTimer) {
  openTimerWithProps(existingTimer)
}

client.on("PRIVMSG", (msg) => {
  const { messageText } = msg
  if (messageText.indexOf('!') === 0 && msg.senderUserID === '442061229') {
    if (messageText.indexOf('!timer') === 0) {
      const parts = messageText.split(' ')
      const targetTime = moment(parts[1],'h:mma').toDate()
      const title = parts.slice(2).join(' ')
      const props = {
        to: targetTime.getTime(),
        startedAt: new Date().getTime(),
        title,
      }
      openTimerWithProps(props)
      Db.setCurrentProjectData({
        timer: props
      })
    }
  } else {
    showNotification({
      type: 'twitch',
      data: {
        ..._.clone(msg)
      }
    })
  }
});

client.connect();
client.join("theandyshand");

Mod.onExit(() => {
  client.close()
  client.destroy()
  client = null
})