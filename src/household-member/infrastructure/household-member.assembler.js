import {HouseholdMember} from "@/household-member/models/household-member.entity.js";

export function toEntity(dto = {}) {
    if (!dto || typeof dto !== "object") return new HouseholdMember({});
    return new HouseholdMember({
        id: dto.id ?? "",
        userId: typeof dto.userId === "string" ? Number(dto.userId) : (dto.userId ?? 0),
        householdId: dto.householdId ?? "",
        income: typeof dto.income === "string" ? Number(dto.income) : (dto.income ?? 0),
        joinedAt: dto.joinedAt ?? "",
        createdAt: dto.createdAt ?? "",
        updatedAt: dto.updatedAt ?? "",
    });
}

export function toDTO(entity) {
    if (!entity) return {};
    return {
        id: entity.id,
        userId: Number(entity.userId) || 0,
        householdId: entity.householdId,
        income: Number(entity.income || 0).toFixed(2),
        joinedAt: entity.joinedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}
