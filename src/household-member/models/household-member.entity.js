export class HouseholdMember {
    constructor({
                    id = "",
                    userId = 0,
                    householdId = "",
                    income = 0,
                    joinedAt = "",
                    createdAt = "",
                    updatedAt = "",
                } = {}) {
        this.id = id;
        this.userId = Number(userId) || 0;
        this.householdId = householdId;
        this.income = typeof income === "string" ? Number(income) : Number(income || 0);
        this.joinedAt = joinedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    validate() {
        const errors = {};
        if (!this.id && (!this.userId || this.userId <= 0)) {
            // For create, userId must be positive. For update, id will exist.
            errors.userId = "userId must be a positive number";
        }
        if (!this.householdId || typeof this.householdId !== "string") {
            errors.householdId = "householdId is required";
        }
        // Basic ISO check (optional)
        const isISO = (s) => !s || !isNaN(Date.parse(s));
        if (!isISO(this.joinedAt)) errors.joinedAt = "joinedAt must be a valid ISO date";
        if (this.createdAt && !isISO(this.createdAt)) errors.createdAt = "createdAt must be a valid ISO date";
        if (this.updatedAt && !isISO(this.updatedAt)) errors.updatedAt = "updatedAt must be a valid ISO date";

        return Object.keys(errors).length === 0 ? null : errors;
    }
}
