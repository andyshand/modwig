import { getResourcePath } from "./ResourcePath";

const path = require('path')
const exec = require('child_process').exec;

export async function getActiveApplication() : Promise<any> {
    return new Promise((res) => {
        exec("osascript " + path.join(getResourcePath(), 'activeWindow.scpt'), (error, stdout) => {
            const parts = stdout.split(",");
            res({
                application: parts[0],
                // windowTitle: (parts[1] || '').replace(/\n$/, "").replace(/^\s/, "")
            })
        })
    })
}
