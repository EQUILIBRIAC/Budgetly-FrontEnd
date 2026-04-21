import { Bill } from "@/bills-expenses/domain/model/bills.entity.js"

export function toEntity(dto = {}) {
    if (!dto || typeof dto !== "object") return new Bill({});
    return new Bill({
        id: dto.id ?? "",
        householdId: dto.houseHoldId ?? dto.householdId ?? "",
        description: dto.description ?? "",
        amount: typeof dto.amount === "string" ? Number(dto.amount) : (dto.amount ?? 0),
        createdBy: typeof dto.createdBy === "string" ? Number(dto.createdBy) : (dto.createdBy ?? 0),
        paymentDay: dto.paymentDate ?? dto.paymentDay ?? "",
        createdAt: dto.createdAt ?? dto.CreatedAt ?? "",
        updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? "",
    });
}

export function toDTO(entity) {
    if (!entity) return {};
    // API expects amount as string e.g."100.00"
    const toMoneyString = (n) => {
        const num = typeof n === "string" ? Number(n) : Number(n || 0);
        return num.toFixed(2);
    };
    return {
        houseHoldId: entity.householdId, // backend expects HouseHoldId
        description: entity.description,
        amount: toMoneyString(entity.amount),
        createdBy: Number(entity.createdBy) || 0,
        paymentDate: entity.paymentDay,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}
