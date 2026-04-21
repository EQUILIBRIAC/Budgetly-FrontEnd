export class Household {
  constructor(data = {}) {
    // Leave id empty by default; backend will assign HH{ticks} when creating
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.memberCount = data.memberCount || 1;

    this.startDate = data.startDate instanceof Date
      ? data.startDate
      : this.parseDate(data.startDate) || new Date();

    this.currency = data.currency || 'USD';
    this.representativeId = data.representativeId || '';
    this.createdAt = this.parseDate(data.createdAt) || new Date();
  }

  parseDate(date) {
    if (!date) return null;
    try {
      if (date instanceof Date) return date;
      const parsed = new Date(date);
      return !isNaN(parsed) ? parsed : null;
    } catch (e) {
      console.error('Error parsing date:', e);
      return null;
    }
  }

  static generateHouseholdId() {
    return `HH${Date.now()}`;
  }

  validate() {
    const errors = {};
    if (!this.name) errors.name = 'El nombre del hogar es requerido';
    if (!this.memberCount || this.memberCount < 1)
      errors.memberCount = 'El número de miembros debe ser mayor a 0';
    if (!this.currency) errors.currency = 'La moneda es requerida';
    return Object.keys(errors).length === 0 ? null : errors;
  }
}

