import { toDTO, toEntity } from "@/bills-expenses/infrastucture/bills.assembler.js";
import { Bill } from "@/bills-expenses/domain/model/bills.entity.js";
import { BillApi } from "@/bills-expenses/infrastucture/bills-api.js";

export class BillService {
    static async createBill(data) {
        const bill = new Bill({
            ...data,
            id: "", // backend generates Id
        });
        const errors = bill.validate();
        if (errors) throw errors;

        const created = await BillApi.create(toDTO(bill));
        return toEntity(created);
    }

    static async getBillById(id) {
        if (!id) throw new Error("ID is not valid");
        const dto = await BillApi.getById(id);
        if (!dto) throw new Error(`Wasn't able to find bill with id ${id}`);
        return toEntity(dto);
    }

    static async listByHouseholdId(householdId) {
        if (!householdId) throw new Error("householdId is not valid");
        const arr = await BillApi.listByHouseholdId(householdId);
        return (arr || []).map(toEntity);
    }

    static async listByCreator(createdBy) {
        if (!createdBy) throw new Error("createdBy is not valid");
        const arr = await BillApi.listByCreator(createdBy);
        return (arr || []).map(toEntity);
    }

    static async updateBill(id, data) {
        if (!id) throw new Error("ID is not valid");

        const current = await this.getBillById(id);
        if (!current) throw new Error(`Bill with id ${id} not found`);

        const merged = new Bill({
            ...toDTO(current), // flatten to DTO types then override
            ...data,
            id: current.id,
            updatedAt: new Date().toISOString(),
        });

        const errors = merged.validate();
        if (errors) throw errors;

        const updated = await BillApi.update(id, toDTO(merged));
        if (!updated) throw new Error("No response from server");
        return toEntity(updated);
    }

    static async deleteBill(id) {
        if (!id) throw new Error("ID is not valid");
        await BillApi.remove(id);
    }
}
