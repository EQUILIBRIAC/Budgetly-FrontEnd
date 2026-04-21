import http from "@/shared/services/http.instance.js";

const resourceEndpoint = "/member_contribution";

export const MemberContributionApi = {
  resourceEndpoint,

  async getAll() {
    const { data } = await http.get(resourceEndpoint);
    return data;
  },

  async getById(id) {
    const { data } = await http.get(`${resourceEndpoint}/${id}`);
    return data ?? null;
  },

  async listByMemberId(memberId) {
    const { data } = await http.get(`${resourceEndpoint}/byMemberId/${encodeURIComponent(memberId)}`);
    return Array.isArray(data) ? data : (data ?? []);
  },

  async listByContributionId(contributionId) {
    const { data } = await http.get(`${resourceEndpoint}/byContributionId/${encodeURIComponent(contributionId)}`);
    return Array.isArray(data) ? data : (data ?? []);
  },

  async create(resource) {
    const { data } = await http.post(resourceEndpoint, resource);
    return data;
  },

  async remove(id) {
    await http.delete(`${resourceEndpoint}/${id}`);
  },
};
