import http from "@/shared/services/http.instance.js";

const resourceEndpoint = "/household_member";

export const HouseholdMemberApi = {
  resourceEndpoint,

  async getAll() {
    const { data } = await http.get(resourceEndpoint);
    return data;
  },

  async getById(id) {
    const { data } = await http.get(`${resourceEndpoint}/${encodeURIComponent(id)}`);
    return data ?? null;
  },

  async getByHouseholdId(householdId) {
    const { data } = await http.get(`${resourceEndpoint}/household/${encodeURIComponent(householdId)}`);
    return Array.isArray(data) ? data : (data ?? []);
  },

  async create(resource) {
    const { data } = await http.post(resourceEndpoint, resource);
    return data;
  },

  async update(id, resource) {
    const { data } = await http.put(`${resourceEndpoint}/${encodeURIComponent(id)}`, resource);
    return data;
  },

  async remove(id) {
    await http.delete(`${resourceEndpoint}/${encodeURIComponent(id)}`);
  },
};
