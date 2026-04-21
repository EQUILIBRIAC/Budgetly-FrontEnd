import { Settings } from "@/settings/domain/models/settings.entity.js";

export function toEntity(dto = {}) {
    if (!dto || typeof dto !== "object") return new Settings({});
    return new Settings({
        id: dto.id ?? "",
        userId: typeof dto.userId === 'string' ? Number(dto.userId) : (dto.userId ?? 0),
        language: dto.language ?? "",
        darkMode: Boolean(dto.darkMode),
        notificationEnabled: Boolean(dto.notificationEnabled),
        createdAt: dto.createdAt ?? "",
        updatedAt: dto.updatedAt ?? "",
    });
}

export function toDTO(entity) {
    if (!entity) return {};
    return {
        id: entity.id,
        userId: entity.userId,               // number
        language: entity.language,           // string
        darkMode: Boolean(entity.darkMode),  // boolean
        notificationEnabled: Boolean(entity.notificationEnabled), // boolean
        createdAt: entity.createdAt,         // string/ISO
        updatedAt: entity.updatedAt,         // string/ISO
    };
}
