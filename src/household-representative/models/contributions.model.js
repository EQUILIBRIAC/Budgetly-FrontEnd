export class Contributions {
    constructor(id= "", billId= "", householdId= "", description= "",
    deadlineForMembers= "", strategy= 1){
        this.id = id;
        this.billId = billId;
        this.householdId = householdId;
        this.description = description;
        this.deadlineForMembers = deadlineForMembers;
        this.strategy = strategy;
    }
}