import { BESService, makeEvent } from "./Service"
import { getDb } from "../db"
import { Setting } from "../db/entities/Setting"
import { interceptPacket } from "./WebsocketToSocket"
import * as path from 'path'

interface SettingTemplate {
    key: string
    value: any
    type: "boolean" | "shortcut" | "string"
    category: string
}

export class SettingsService extends BESService {
    db
    Settings
    events = {
        settingsUpdated: makeEvent<void>(),
        settingUpdated: makeEvent<Partial<SettingTemplate>>()
    }

    async activate() {
        this.db = await getDb()
        this.Settings = this.db.getRepository(Setting)

        interceptPacket('api/settings/set', async ({ data: setting }) => {
            await this.setSettingValue(setting.key, setting.value)
        })
    }

    async getSettingsForCategory(category: string) {
        return this.Settings.find({where: {category}})
    }

    rectifySetting(setting) {
        if ('type' in setting && setting.type !== 'shortcut' && 'value' in setting) {
            setting.value = { value: setting.value }
        }
        return setting
    }

    async insertSettingIfNotExist(setting: SettingTemplate) {
        const existingSetting = await this.Settings.findOne({where: {key: setting.key}})
        if (!existingSetting) {
            const content = this.rectifySetting(setting)
            const newSetting = this.Settings.create(content)
            await this.Settings.save(newSetting);

            // this.events.settingsUpdated.emit()
            // this.events.settingUpdated.emit(content)
        }
    }

    async getSetting(key: string) {
        return await this.Settings.findOne({where: {key}})
    }

    async getSettingValue(key: string) {
        const setting = await this.Settings.findOne({where: {key}})
        if (!setting) {
            throw new Error(`Setting ${key} not found`)
        }
        if (setting.type !== 'shortcut') {
            return setting.value.value
        }
        return setting.value
    }

    async setSettingValue(key: string, value: any) {
        const setting = await this.getSetting(key)
        if (!setting) {
            throw new Error(`Setting ${key} not found`)
        }
        const update = this.rectifySetting({type: setting.type, value})
        await this.Settings.update(setting.id, update)

        this.events.settingsUpdated.emit()
        this.events.settingUpdated.emit({
            key,
            ...update
        })
    }

    async userLibraryPath() {
        return await this.getSettingValue('userLibraryPath')
    }

    async modwigLibraryLocation() {
        const userLib = await this.getSettingValue('userLibraryPath')
        return path.join(userLib, 'Modwig')
    }

    normalise(label) {
        return label.replace(/[\s]+/g, '-').toLowerCase()
    }
}

// export interface BitwigSettings {
//     colors: {
//         trackColor: string,
//         trackSelectedInactiveColor: string,
//         trackSelectedColor: string,
//         deviceBackgroundColor: string,
//         deviceHeaderColor: string,
//         deviceHeaderSelectedColor: string,
//         // deviceHandleSelectedInactiveColor: string,
//         automationButtonColor: string,
//         automationButtonDisabledColor: string
//     }
// }