export class MemberContribution {
    constructor(id= "", contributionId= "", memberId= "",
                amount= "", status= 1, payedAt= "",) {
        this.id = id;
        this.contributionId = contributionId;
        this.memberId = memberId;
        this.amount = amount;
        this.status = status;
        this.payedAt = payedAt;
    }
}