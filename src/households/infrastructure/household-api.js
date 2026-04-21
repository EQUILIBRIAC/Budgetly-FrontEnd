import http from '@/shared/services/http.instance.js';

export const HouseholdApi = {

  async create(dto) {
    const res = await http.post('/house_hold', dto);
    return res.data;
  },

  async listByRepresentative(representativeId) {
    const res = await http.get(`/house_hold/representative/${representativeId}`);
    return res.data;
  },

  async getById(id) {
    const res = await http.get(`/house_hold/${id}`);
    return res.data;
  },

  async update(id, dto) {
    const res = await http.put(`/house_hold/${id}`, dto);
    return res.data;
  },

  async remove(id) {
    await http.delete(`/house_hold/${id}`);
  }
};
