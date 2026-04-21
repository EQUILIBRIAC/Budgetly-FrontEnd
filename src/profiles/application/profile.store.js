import { reactive } from 'vue';
import { ProfileService } from '@/profiles/infrastructure/profile.service.js';

export const profileStore = reactive({
  current: null,
  loading: false,
  errors: [],

  async loadProfile(id) {
    this.loading = true;
    this.errors = [];
    try {
      const profile = await ProfileService.getProfileById(id);
      this.current = profile;
      return profile;
    } catch (error) {
      this.errors.push(error);
      this.current = null;
      throw error;
    } finally {
      this.loading = false;
    }
  },

  async updateProfile(id, data) {
    this.loading = true;
    this.errors = [];
    try {
      const updated = await ProfileService.updateProfile(id, data);
      this.current = updated;
      return updated;
    } catch (error) {
      this.errors.push(error);
      throw error;
    } finally {
      this.loading = false;
    }
  }
});
