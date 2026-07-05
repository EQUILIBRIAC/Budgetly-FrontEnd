/**
 * Data model for a household member
 * Contains member information and utility methods
 */
export class Member {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.role = data.role || 'member';
    this.status = data.status || 'active';
    this.householdId = data.householdId || null;
    this.householdMemberId = data.householdMemberId || null;
    this.totalContributed = data.totalContributed || '0.00';
  }

  getDisplayName() {
    if (this.name && String(this.name).trim()) {
      return this.name;
    }

    if (this.email && String(this.email).trim()) {
      return this.email;
    }

    return this.status === 'invited' ? 'Pending invitation' : 'Unknown member';
  }

  getAvatarLabel() {
    const source = this.name || this.email || this.getDisplayName();
    const parts = String(source)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return 'M';
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  /**
   * Gets the status label
   * @returns {string} Status label
   */
  getStatusLabel() {
    const statusLabels = {
      'active': 'Active',
      'invited': 'Invited',
      'inactive': 'Inactive'
    };
    return statusLabels[this.status] || this.status;
  }

  /**
   * Gets the role label
   * @returns {string} Role label
   */
  getRoleLabel() {
    const roleLabels = {
      'representative': 'Representative',
      'member': 'Member'
    };
    return roleLabels[this.role] || this.role;
  }

  /**
   * Gets the status severity for PrimeVue Tag component
   * @returns {string} Status severity
   */
  getStatusSeverity() {
    const severityMap = {
      'active': 'success',
      'invited': 'warning',
      'inactive': 'danger'
    };
    return severityMap[this.status] || 'info';
  }

  /**
   * Checks if the member is a representative
   * @returns {boolean} True if representative
   */
  isRepresentative() {
    return this.role === 'representative';
  }

  /**
   * Checks if the member is active
   * @returns {boolean} True if active
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Gets the total contributed amount formatted
   * @returns {string} Total contributed with currency format
   */
  getFormattedTotalContributed() {
    return `S/ ${this.totalContributed}`;
  }
}

/**
 * Data model for a member contribution
 * Contains contribution information and utility methods
 */
export class MemberContribution {
  constructor(data = {}) {
    this.id = data.id || null;
    this.contributionId = data.contributionId || null;
    this.memberId = data.memberId || null;
    this.amount = data.amount || '0.00';
    this.status = data.status || 0;
    this.payedAt = data.payedAt || null;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  /**
   * Checks if the contribution is paid
   * @returns {boolean} True if paid
   */
  isPaid() {
    return this.status === 1;
  }

  /**
   * Gets the formatted amount
   * @returns {string} Amount with currency format
   */
  getFormattedAmount() {
    return `S/ ${this.amount}`;
  }
}

/**
 * Data model for member filters
 * Contains filter options and utility methods
 */
export class MemberFilters {
  constructor() {
    this.searchTerm = '';
    this.statusFilter = null;
    this.roleFilter = null;
  }

  /**
   * Clears all filters
   */
  clear() {
    this.searchTerm = '';
    this.statusFilter = null;
    this.roleFilter = null;
  }

  /**
   * Checks if there are active filters
   * @returns {boolean} True if filters are applied
   */
  hasActiveFilters() {
    return this.searchTerm || this.statusFilter || this.roleFilter;
  }
}

/**
 * Options for status filters
 * Used in dropdown components for filtering members by status
 */
export const STATUS_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Active', value: 'active' },
  { label: 'Invited', value: 'invited' },
  { label: 'Inactive', value: 'inactive' }
];

/**
 * Options for role filters
 * Used in dropdown components for filtering members by role
 */
export const ROLE_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Representative', value: 'representative' },
  { label: 'Member', value: 'member' }
];
