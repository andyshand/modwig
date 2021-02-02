import { app, BrowserWindow, Tray } from "electron";
import { ShortcutsService } from "./shortcuts/Shortcuts";
import { registerService } from "./core/Service";
import { SocketMiddlemanService } from "./core/WebsocketToSocket";
import { TrayService } from "./core/Tray";
import { SettingsService } from "./core/SettingsService";
import { protocol } from "electron";
import { ModsService } from "./mods/ModsService";
import { BitwigService } from "./bitwig/BitwigService";
import { UIService } from "./ui/UIService";
import { PopupService } from "./popup/PopupService";

app.whenReady().then(async () => {

  try {
    app.whenReady().then(() => {
      protocol.registerFileProtocol('file', (request, callback) => {
        const pathname = request.url.replace('file:///', '');
        callback(pathname);
      });
    });

    // Service creation order is manually controlled atm, but each
    // has dependencies
    // TODO automate this - is error prone
    const socketMiddleMan = await registerService(SocketMiddlemanService)
    const settingsService = await registerService<SettingsService>(SettingsService)
    settingsService.insertSettingIfNotExist({
      key: 'userLibraryPath',
      value: '',
      category: 'internal',
      type: 'string',
    })

    const popupService = await registerService(PopupService)
    const shortcutsService = await registerService(ShortcutsService)
    const bitwigService = await registerService(BitwigService)
    const uiService = await registerService(UIService)
    const modsService = await registerService(ModsService)
    const trayService = await registerService(TrayService)
  } catch (e) {
    console.error(e)  
  }
})