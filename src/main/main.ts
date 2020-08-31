import { app, BrowserWindow, Tray } from "electron";
import { setupNavigation } from './search/Search'
import { setupValueEntry } from './value-entry/ValueEntry'
import { ShortcutsService } from "./shortcuts/Shortcuts";
import { registerService } from "./core/Service";
import { SocketMiddlemanService } from "./core/WebsocketToSocket";
import { TrayService } from "./core/Tray";

app.whenReady().then(() => {
  // Service creation order is manually controlled atm, but each
  // has dependencies
  // TODO automate this - is error prone
  const socketMiddleMan = registerService(SocketMiddlemanService)
  const trayService = registerService(TrayService)
  const shortcutsService = registerService(ShortcutsService)
  setupNavigation()  
  setupValueEntry()
})