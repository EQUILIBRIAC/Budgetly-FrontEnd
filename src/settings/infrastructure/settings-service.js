import { toDTO, toEntity } from "@/settings/infrastructure/settings.assembler.js";
import { Settings } from "@/settings/domain/models/settings.entity.js";
import { SettingsApi } from "@/settings/infrastructure/settings-api.js";

export class SettingsService {
    static async createSettings(settingsData) {
        const nowISO = new Date().toISOString();
        const normalizedData = {
            ...settingsData,
            // force numeric identifiers so json-server keeps them as numbers
            id: Number(settingsData?.id) || Date.now(),
            userId: Number(settingsData?.userId || 0),
            createdAt: settingsData?.createdAt || nowISO,
            updatedAt: settingsData?.updatedAt || nowISO,
        };

        const settings = new Settings(normalizedData);
        const errors = settings.validate();
        if (errors) throw errors;

        const created = await SettingsApi.create(toDTO(settings));
        return toEntity(created);
    }

    static async getSettingsById(id) {
        if (!id) throw new Error("ID is not valid");
        try {
            const dto = await SettingsApi.getById(id);
            if (!dto) throw new Error(`Wasn't able to find settings with id ${id}`);
            return toEntity(dto);
        } catch (error) {
            console.error("Error fetching Settings: ", error);
            throw new Error(error.message || "We are not able to obtain the settings");
        }
    }

    static async getSettingsByUserId(userId) {
        if (!userId) throw new Error("UserId is not valid");
        try {
            const dto = await SettingsApi.getByUserId(userId);
            if (!dto) throw new Error(`Wasn't able to find settings for userId ${userId}`);
            return toEntity(dto);
        } catch (error) {
            console.error("Error fetching Settings: ", error);
            throw new Error(error.message || "We are not able to obtain the settings");
        }
    }

    static async updateSettings(id, settingsData) {
        if (!id) throw new Error("ID is not valid");
        try {
            const current = await this.getSettingsById(id);
            if (!current) throw new Error(`Settings with id ${id} not found`);

            // Merge, re-validate, then send
            const merged = new Settings({ ...toDTO(current), ...settingsData, id: current.id });
            const errors = merged.validate();
            if (errors) throw errors;

            const updated = await SettingsApi.update(current.id, toDTO(merged));
            if (!updated) throw new Error("No response from server");
            return toEntity(updated);
        } catch (error) {
            console.error("Error updating Settings: ", error);
            throw new Error(error.message || "We are not able to update the settings");
        }
    }

    static async deleteSettings(id) {
        if (!id) throw new Error("ID is not valid");
        await SettingsApi.remove(id);
    }
}
