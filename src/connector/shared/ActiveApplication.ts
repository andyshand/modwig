import { getResourcePath } from "./ResourcePath";

const path = require('path')
const execSync = require('child_process').execSync;

export function getActiveApplication() {
    const result = execSync("osascript " + path.join(getResourcePath(), 'activeWindow.scpt')).toString();
    const parts = result.split(",");
    return {
        application: parts[0],
        windowTitle: parts[1].replace(/\n$/, "").replace(/^\s/, "")
    }
}
