export class Profile {
  constructor({
    id = '',
    name = '',
    firstName = '',
    lastName = '',
    email = '',
    password = '',
    role = 'representative',
    status = 'active',
    plan = 'FREE',
    householdId = '',
    photo = '',
    profileLockedUntil = '',
    isNewUser = false,
    createdAt = '',
    updatedAt = ''
  } = {}) {
    this.id = id;
    this.name = name;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.password = password;
    this.role = role;
    this.status = status;
    this.plan = plan;
    this.householdId = householdId;
    this.photo = photo;
    this.profileLockedUntil = profileLockedUntil;
    this.isNewUser = isNewUser;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  validate() {
    const errors = {};
    if (!this.firstName || !this.firstName.trim()) errors.firstName = 'First name is required';
    if (!this.lastName || !this.lastName.trim()) errors.lastName = 'Last name is required';
    if (!this.name || !this.name.trim()) errors.name = 'Name is required';
    if (!this.email || !this.email.trim()) errors.email = 'Email is required';
    if (!this.password || !this.password.trim()) errors.password = 'Password is required';
    if (!this.role || !this.role.trim()) errors.role = 'Role is required';
    if (!this.status || !this.status.trim()) errors.status = 'Status is required';
    if (!this.plan || !this.plan.trim()) errors.plan = 'Plan is required';
    return Object.keys(errors).length ? errors : null;
  }
}
