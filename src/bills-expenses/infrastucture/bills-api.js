import http from "@/shared/services/http.instance.js";

const resourceEndpoint = import.meta.env.VITE_BILLS_PATH;

export const BillApi = {
  resourceEndpoint,

  async getAll() {
    const { data } = await http.get(resourceEndpoint);
    return data;
  },

  async getById(id) {
    const { data } = await http.get(`${resourceEndpoint}/${id}`);
    return data ?? null;
  },

  async listByHouseholdId(householdId) {
    const { data } = await http.get(`${resourceEndpoint}/byHousehold/${encodeURIComponent(householdId)}`);
    return Array.isArray(data) ? data : (data ?? []);
  },

  async listByCreator(createdBy) {
    const { data } = await http.get(`${resourceEndpoint}?createdBy=${encodeURIComponent(createdBy)}`);
    return Array.isArray(data) ? data : (data ?? []);
  },

  async create(resource) {
    const { data } = await http.post(resourceEndpoint, resource);
    return data;
  },

  async update(id, resource) {
    const { data } = await http.put(`${resourceEndpoint}/${id}`, resource);
    return data;
  },

  async remove(id) {
    await http.delete(`${resourceEndpoint}/${id}`);
  },
};
