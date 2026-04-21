import httpInstance from "@/shared/services/http.instance.js";

const resourceEndpoint = import.meta.env.VITE_SETTINGS_ENDPOINT_PATH;

export const SettingsApi = {
    resourceEndpoint, // expose for consistency if needed elsewhere

    async getAll() {
        const { data } = await httpInstance.get(resourceEndpoint);
        return data;
    },

    async getById(id) {
        const { data } = await httpInstance.get(`${resourceEndpoint}/${id}`);
        return data; // expect a single object
    },

    async getByUserId(userId) {
        const { data } = await httpInstance.get(`${resourceEndpoint}?userId=${encodeURIComponent(userId)}`);
        // If your backend returns an array for queries, pick first; otherwise return object.
        return Array.isArray(data) ? data[0] ?? null : data ?? null;
    },

    async create(resource) {
        const { data } = await httpInstance.post(resourceEndpoint, resource);
        return data;
    },

    async update(id, resource) {
        const { data } = await httpInstance.put(`${resourceEndpoint}/${id}`, resource);
        return data;
    },

    async remove(id) {
        await httpInstance.delete(`${resourceEndpoint}/${id}`);
    },
};
