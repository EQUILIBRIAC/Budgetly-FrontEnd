/**
 * Assembler Pattern Implementation for Member Management
 * Composes complex operations from simple, reusable components
 */

import httpInstance from '@/shared/services/http.instance';

class MemberDataFetcher {
  async fetchHouseholdMembers(householdId) {
    return await httpInstance.get(`/household_member/household/${householdId}/detailed`);
  }
}

class MemberDataProcessor {
  mapMember(member) {
    return {
      id: member.householdMemberId || member.id || 0,
      userId: member.userId || 0,
      name: member.name || '',
      email: member.email || '',
      role: member.role || 'member',
      status: member.status || 'Inactive',
      totalContributed: member.totalContributed ?? 0,
      isRepresentative: member.isRepresentative ?? false,
      joinedAt: member.joinedAt || null
    };
  }
}

class MemberDataValidator {
  validateHouseholdData(userData) {
    if (!userData || !userData.householdId) {
      throw new Error('Household information not found');
    }
    return true;
  }
}

class MemberAssembler {
  constructor() {
    this.fetcher = new MemberDataFetcher();
    this.processor = new MemberDataProcessor();
    this.validator = new MemberDataValidator();
  }
  
  async assembleHouseholdMembers(householdId) {
    const userData = JSON.parse(localStorage.getItem('user'));
    // allow explicit householdId selection; fallback to userData.householdId
    const targetHousehold = householdId || userData?.householdId;
    this.validator.validateHouseholdData({ householdId: targetHousehold });

    const householdMembersResponse = await this.fetcher.fetchHouseholdMembers(targetHousehold);
    const householdMembers = householdMembersResponse.data || [];

    return householdMembers.map(member => this.processor.mapMember(member));
  }
}

class MemberFilterProcessor {
  applyFilters(members, filters) {
    return members.filter(member => {
      const matchesSearch = !filters.searchTerm || 
        member.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      const matchesStatus = !filters.statusFilter || 
        member.status === filters.statusFilter;
      
      const matchesRole = !filters.roleFilter || 
        member.role === filters.roleFilter;
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }
}

class MemberPipeline {
  constructor() {
    this.assembler = new MemberAssembler();
    this.filterProcessor = new MemberFilterProcessor();
  }
  
  async processMemberData(filters = null, householdId = null) {
    try {
      const members = await this.assembler.assembleHouseholdMembers(householdId);

      if (filters) {
        return this.filterProcessor.applyFilters(members, filters);
      }
      
      return members;
    } catch (error) {
      console.error('Pipeline processing error:', error);
      throw error;
    }
  }
}

export default new MemberPipeline();
