import { UI } from "./UI";
import { getActiveApplication } from "../../connector/shared/ActiveApplication";

class State {

}
class StateItem<T> {
    constructor(public readonly value: T, public readonly dependsOn: StateItem<any>[] = []) { }
    isStateItem = true
}



export class BitwigState extends State {
    panel = new StateItem<'arrange' | 'mix' | 'edit'>('arrange')
    layout = new StateItem(null)
    subpanel = new StateItem<'detail' | 'automation' | 'device' | 'mixer'>('detail')
    inspector = new StateItem<'arrange' | 'mix' | 'edit'>('arrange')
    sidePanel = new StateItem<'browser' | 'project' | 'studio' | 'mappings'>('browser')
    onScreenKeyboard = new StateItem<boolean>(false)
    scaling = new StateItem<1 | 1.25 | 1.5 | 1.75 | 2 | 2.25>(1)
    mix = {
        scrollX: new StateItem<number>(0),
        scrollY: new StateItem<number>(0)
    }
    arrange = {
        doubleTrackHeight: new StateItem<boolean>(false),
        trackWidth: new StateItem<number>(0),
        scrollX: new StateItem<number>(0),
        scrollY: new StateItem<number>(0)
    }
    // popupBrowserOpen - can use createPopupBrowser().exists from Bitwig API?
    toPlainObject(obj?: StateItem<any>) {
        const out: any = {}
        for (const key in Object.keys(obj ?? this)) {
            const val = (this as any)[key]
            if (val.isStateItem) {
                out[key] = val.value
            } else {
                out[key] = this.toPlainObject(val)
            }
        }
        return out
    }
}

export async function isFrontmostApplication() {
    return true
    // const active = (await getActiveApplication()).application
    // if (active.trim() === '') {
        // console.log('Applescript has broken... You probably need to restart')
        // return false
    // }
    // return active === "BitwigStudio"
}

export class BitwigUI extends UI {

    state = new BitwigState()

}