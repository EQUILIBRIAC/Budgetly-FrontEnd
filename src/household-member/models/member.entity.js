export class Member {
    constructor({ id, name, contributed, assigned, deadline, status }) {
        this.id = id;
        this.name = name ?? 'Desconocido';
        this.contributed = Number(contributed || 0);
        this.assigned = Number(assigned || 0);
        this.deadline = deadline || '-';
        this.status = status || 'Pendiente';
    }

    get isCompliant() {
        return this.status === 'Cumplido';
    }
}