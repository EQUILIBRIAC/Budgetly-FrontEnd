import http from '@/shared/services/http.instance.js';

const householdsPath = import.meta.env.VITE_HOUSEHOLDS_PATH || '/house_hold';

export function normalizeHouseholdList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return [data];
  return [];
}

export function normalizeHouseholdOne(data) {
  return normalizeHouseholdList(data)[0] ?? null;
}

const get = async (url) => normalizeHouseholdList((await http.get(url)).data);

const getOneSafe = async (url) => {
  try {
    const { data } = await http.get(url);
    return normalizeHouseholdOne(data);
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

export const HouseholdAPI = {
  users: () => get('/user'),
  membersByHousehold: (householdId) => get(`/household_member/household/${encodeURIComponent(householdId)}`),
  memberContributions: () => get('/member_contribution'),
  billsByHousehold: (householdId) => get(`/bills/byHousehold/${encodeURIComponent(householdId)}`),
  contributionsByHousehold: (householdId) => get(`/contribution/byhouseholdid/${encodeURIComponent(householdId)}`),
  householdById: (id) => get(`${householdsPath}/${encodeURIComponent(id)}`),
  householdByIdSafe: (id) => getOneSafe(`${householdsPath}/${encodeURIComponent(id)}`),
  householdsByRepresentative: (representativeId) => get(`${householdsPath}/representative/${encodeURIComponent(representativeId)}`),

  createMember: async (payload) => (await http.post('/household_member', payload)).data
};
