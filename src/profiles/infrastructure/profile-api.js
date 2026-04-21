import httpInstance from '@/shared/services/http.instance.js';

const resourceEndpoint = import.meta.env.VITE_USERS_ENDPOINT_PATH;

export const ProfileApi = {
  async getById(id) {
    const { data } = await httpInstance.get(`${resourceEndpoint}/${id}`);
    return data ?? null;
  },

  async update(id, payload) {
    const { data } = await httpInstance.put(`${resourceEndpoint}/${id}`, payload);
    return data ?? null;
  }
};
