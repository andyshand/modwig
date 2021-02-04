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
import { bitwigActionMap } from "./mods/actionMap";

app.whenReady().then(async () => {

  try {
    app.whenReady().then(() => {
      protocol.registerFileProtocol('file', (request, callback) => {
        const pathname = request.url.replace('file:///', '');
        callback(pathname);
      });
    });

    const services = {
      socketMiddleMan: await registerService(SocketMiddlemanService),
      settingsService: await registerService<SettingsService>(SettingsService),
      popupService: await registerService(PopupService),
      shortcutsService: await registerService(ShortcutsService),
      bitwigService: await registerService(BitwigService),
      uiService: await registerService(UIService),
      modsService: await registerService(ModsService),
      trayService: await registerService(TrayService)
    }

    // Service creation order is manually controlled atm, but each
    // has dependencies
    // TODO automate this - is error prone
    services.settingsService.insertSettingIfNotExist({
      key: 'userLibraryPath',
      value: '',
      category: 'internal',
      type: 'string',
    })

    for (const key in services){
      services[key].postActivate()
    }
  } catch (e) {
    console.error(e)  
  }
})