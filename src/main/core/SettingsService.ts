import { BESService } from "./Service"
import { getDb } from "../db"
import { Setting } from "../db/entities/Setting"

interface SettingTemplate {
    key: string
    value: any
    type: "boolean" | "shortcut"
    category: string
}

export class SettingsService extends BESService {
    db
    Settings

    async activate() {
        this.db = await getDb()
        this.Settings = this.db.getRepository(Setting)
    }

    rectifySetting(setting) {
        if (setting.type === 'boolean' && typeof setting.value === 'boolean') {
            setting.value = { value: setting.value }
        }
        return setting
    }

    async insertSettingIfNotExist(setting: SettingTemplate) {
        const existingSetting = await this.Settings.findOne({where: {key: setting.key}})
        if (!existingSetting) {
            const newSetting = this.Settings.create(this.rectifySetting(setting))
            await this.Settings.save(newSetting);
        }
    }

    async getSetting(key: string) {
        return await this.Settings.findOne({where: {key}})
    }

    async getSettingValue(key: string) {
        const setting = await this.Settings.findOne({where: {key}})
        if (setting.type === 'boolean') {
            return setting.value.value
        }
        return setting.value
    }

    async setSettingValue(key: string, value: any) {
        const setting = await this.getSetting(key)
        if (!setting) {
            throw new Error(`Setting ${key} not found`)
        }
        await this.Settings.update(setting.id, this.rectifySetting({type: setting.type, value}))
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