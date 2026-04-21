import {HouseholdMember} from "@/household-member/models/household-member.entity.js";
import {HouseholdMemberApi} from "@/household-member/infrastructure/household-member.api.js";
import {toDTO, toEntity} from "@/household-member/infrastructure/household-member.assembler.js";



export class HouseholdMemberService {
    static async createMember(data) {
        const nowIso = new Date().toISOString();
        const member = new HouseholdMember({
            ...data,
            createdAt: data?.createdAt || nowIso,
            updatedAt: data?.updatedAt || nowIso,
            joinedAt: data?.joinedAt || nowIso,
        });
        const errors = member.validate();
        if (errors) throw errors;

        const created = await HouseholdMemberApi.create(toDTO(member));
        return toEntity(created);
    }

    static async getMemberById(id) {
        if (!id) throw new Error("ID is not valid");
        const dto = await HouseholdMemberApi.getById(id);
        if (!dto) throw new Error(`Wasn't able to find householdMember with id ${id}`);
        return toEntity(dto);
    }

    static async listByRepresentativeId(representativeId) {
        if (!representativeId) throw new Error("userId is not valid");
        const arr = await HouseholdMemberApi.getByRepresentativeId(representativeId);
        return (arr || []).map(toEntity);
    }

    static async listByHouseholdId(householdId) {
        if (!householdId) throw new Error("householdId is not valid");
        const arr = await HouseholdMemberApi.getByHouseholdId(householdId);
        return (arr || []).map(toEntity);
    }

    static async updateMember(id, data) {
        if (!id) throw new Error("ID is not valid");

        const current = await this.getMemberById(id);
        if (!current) throw new Error(`Member with id ${id} not found`);

        const merged = new HouseholdMember({
            ...toDTO(current),
            ...data,
            id: current.id,
            updatedAt: new Date().toISOString(),
        });

        const errors = merged.validate();
        if (errors) throw errors;

        const updated = await HouseholdMemberApi.update(id, toDTO(merged));
        if (!updated) throw new Error("No response from server");
        return toEntity(updated);
    }

    static async deleteMember(id) {
        if (!id) throw new Error("ID is not valid");
        await HouseholdMemberApi.remove(id);
    }
}
