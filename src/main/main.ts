import { app, BrowserWindow, Tray } from "electron";
import { ShortcutsService } from "./shortcuts/Shortcuts";
import { registerService } from "./core/Service";
import { SocketMiddlemanService } from "./core/WebsocketToSocket";
import { TrayService } from "./core/Tray";
import { SettingsService } from "./core/SettingsService";
import { protocol } from "electron";
import { ModsService } from "./mods/ModsService";

app.whenReady().then(async () => {

  app.whenReady().then(() => {
    protocol.registerFileProtocol('file', (request, callback) => {
      const pathname = request.url.replace('file:///', '');
      callback(pathname);
    });
  });

  // Service creation order is manually controlled atm, but each
  // has dependencies
  // TODO automate this - is error prone
  const settingsService = await registerService(SettingsService)
  const socketMiddleMan = await registerService(SocketMiddlemanService)
  const trayService = await registerService(TrayService)
  const shortcutsService = await registerService(ShortcutsService)
  const modsService = await registerService(ModsService)
})