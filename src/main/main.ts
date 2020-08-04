import { app, BrowserWindow } from "electron";
import { runWebsocketToSocket } from "../connector/shared/WebsocketToSocket";
import { setupNavigation } from './search/Search'

// Allow our web interface to communicate directly with Bitwig via websocket
runWebsocketToSocket()

function createWindow() {
  // Create the browser window.
  // const mainWindow = new BrowserWindow({
  //   height: 600,
  //   webPreferences: {
  //     // preload: path.join(__dirname, "preload.js"),
  //   },
  //   width: 800,
  // });

  // and load the index.html of the app.
  // TODO load production index.html
  // mainWindow.loadFile(path.join(__dirname, "../../index.html"));
  // mainWindow.loadURL("http://localhost:8080")
  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // createWindow();



  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    // if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  setupNavigation()  
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
