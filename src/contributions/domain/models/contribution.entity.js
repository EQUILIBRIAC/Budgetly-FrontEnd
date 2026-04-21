export class MemberContribution {
    constructor({
                    id = "",
                    billId = "",
                    contributionId = "",
                    memberId = "",
                    amount = 0,
                    status = 0, // 0 = pending, 1 = paid
                    payedAt = "",
                    createdAt = "",
                    updatedAt = "",
                } = {}) {
        this.id = id;
        this.billId = billId;
        this.contributionId = contributionId;
        this.memberId = memberId;
        this.amount = typeof amount === "string" ? Number(amount) : Number(amount || 0);
        this.status = Number(status) || 0;
        this.payedAt = payedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    validate() {
        const errors = {};
        if (!this.contributionId) errors.contributionId = "contributionId is required";
        if (!this.memberId) errors.memberId = "memberId is required";
        if (Number.isNaN(this.amount) || this.amount <= 0)
            errors.amount = "amount must be a positive number";
        if (![0, 1].includes(this.status))
            errors.status = "status must be 0 (pending) or 1 (paid)";
        const isISO = (s) => !s || !isNaN(Date.parse(s));
        if (!isISO(this.payedAt)) errors.payedAt = "payedAt must be a valid ISO date";
        if (this.createdAt && !isISO(this.createdAt)) errors.createdAt = "createdAt must be a valid ISO date";
        if (this.updatedAt && !isISO(this.updatedAt)) errors.updatedAt = "updatedAt must be a valid ISO date";
        return Object.keys(errors).length === 0 ? null : errors;
    }
}
