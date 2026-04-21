import { MemberContribution } from "@/contributions/domain/models/contribution.entity.js"

export function toEntity(dto = {}) {
    if (!dto || typeof dto !== "object") return new MemberContribution({});
    return new MemberContribution({
        id: dto.id ?? "",
        billId: dto.billId ?? "",
        contributionId: dto.contributionId ?? "",
        memberId: dto.memberId ?? "",
        amount: typeof dto.amount === "string" ? Number(dto.amount) : (dto.amount ?? 0),
        status: Number(dto.status) || 0,
        payedAt: dto.payedAt ?? "",
        createdAt: dto.createdAt ?? "",
        updatedAt: dto.updatedAt ?? "",
    });
}

export function toDTO(entity) {
    if (!entity) return {};
    const toMoneyString = (n) => Number(n || 0).toFixed(2);
    return {
        id: entity.id,
        billId: entity.billId,
        contributionId: entity.contributionId,
        memberId: entity.memberId,
        amount: toMoneyString(entity.amount),
        status: Number(entity.status) || 0,
        payedAt: entity.payedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}
