import http from '@/shared/services/http.instance.js';

const get = async (url) => (await http.get(url)).data ?? [];

export const HouseholdAPI = {
  users: () => get('/user'),
  membersByHousehold: (householdId) => get(`/household_member/household/${encodeURIComponent(householdId)}`),
  memberContributions: () => get('/member_contribution'),
  billsByHousehold: (householdId) => get(`/bills/byHousehold/${encodeURIComponent(householdId)}`),
  contributionsByHousehold: (householdId) => get(`/contribution/byhouseholdid/${encodeURIComponent(householdId)}`),
  householdById: (id) => get(`/house_hold/${encodeURIComponent(id)}`),
  householdsByRepresentative: (representativeId) => get(`/house_hold/representative/${encodeURIComponent(representativeId)}`),

  createMember: async (payload) => (await http.post('/household_member', payload)).data
};
