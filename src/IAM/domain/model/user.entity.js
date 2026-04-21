export class User {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.name = data.name || '';
        this.email = data.email || '';
        this.password = data.password || '';
        this.role = data.role || '';
        this.status = data.status || '';
        this.householdId = data.householdId || '';
    }

    validate(){
        const errors = {};
        if(!this.name) errors.name = 'Name is required';
        if(!this.email) errors.email = 'Email is required';
        if(!this.password) errors.password = 'Password is required';
        if(!this.role) errors.role = 'Role is required';
        if(!this.status) errors.status = 'Status is required';
        return Object.keys(errors).length === 0 ? null : errors;
    }
}