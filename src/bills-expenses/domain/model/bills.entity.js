export class Bill {
    constructor({
                    id = "",
                    householdId = "",
                    description = "",
                    amount = 0,                  // internal: number
                    createdBy = 0,
                    paymentDay = "",
                    createdAt = "",
                    updatedAt = "",
                } = {}) {
        this.id = id;
        this.householdId = householdId;
        this.description = description;
        this.amount = typeof amount === "string" ? Number(amount) : Number(amount || 0);
        this.createdBy = Number(createdBy) || 0;
        this.paymentDay = paymentDay;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    validate() {
        const errors = {};

        if (this.id && !/^BG-\d+$/.test(String(this.id))) {
            errors.id = 'id must start with BG- followed by numbers';
        }

        if (!this.householdId || typeof this.householdId !== "string") {
            errors.householdId = "householdId is required";
        }
        if (!this.description || typeof this.description !== "string") {
            errors.description = "description is required";
        }
        if (Number.isNaN(this.amount) || this.amount <= 0) {
            errors.amount = "amount must be a positive number";
        }
        if (!this.createdBy || this.createdBy <= 0) {
            errors.createdBy = "createdBy must be a positive number";
        }
        const isISO = (s) => !s || !isNaN(Date.parse(s));
        if (!isISO(this.paymentDay)) errors.paymentDay = "paymentDay must be a valid ISO date";
        if (this.createdAt && !isISO(this.createdAt)) errors.createdAt = "createdAt must be a valid ISO date";
        if (this.updatedAt && !isISO(this.updatedAt)) errors.updatedAt = "updatedAt must be a valid ISO date";

        return Object.keys(errors).length === 0 ? null : errors;
    }
}

