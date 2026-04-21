import {MemberContributionApi} from "@/contributions/infrastructure/contributions-api.js";
import {toDTO, toEntity} from "@/contributions/infrastructure/contributions.assembler.js";
import {MemberContribution} from "@/contributions/domain/models/contribution.entity.js";

export class MemberContributionService {
    static async createContribution(data) {
        const now = new Date().toISOString();
        const mc = new MemberContribution({
            ...data,
            createdAt: data?.createdAt || now,
            updatedAt: data?.updatedAt || now,
        });
        const errors = mc.validate();
        if (errors) throw errors;

        const created = await MemberContributionApi.create(toDTO(mc));
        return toEntity(created);
    }

    static async getContributionById(id) {
        if (!id) throw new Error("ID is not valid");
        const dto = await MemberContributionApi.getById(id);
        if (!dto) throw new Error(`Wasn't able to find memberContribution with id ${id}`);
        return toEntity(dto);
    }

    static async listByMemberId(memberId) {
        if (!memberId) throw new Error("memberId is not valid");
        const arr = await MemberContributionApi.listByMemberId(memberId);
        return (arr || []).map(toEntity);
    }

    static async listByContributionId(contributionId) {
        if (!contributionId) throw new Error("contributionId is not valid");
        const arr = await MemberContributionApi.listByContributionId(contributionId);
        return (arr || []).map(toEntity);
    }

    static async deleteContribution(id) {
        if (!id) throw new Error("ID is not valid");
        await MemberContributionApi.remove(id);
    }
}
