import { reactive } from 'vue';
import { Household } from '@/households/domain/model/household.entity';
import { HouseholdService } from '@/households/application/household.service';

export const householdStore = reactive({
  households: [],
  current: null,
  errors: [],
  loading: false,

  async loadHouseholds(representativeId) {
    this.errors = [];
    this.loading = true;
    try {
      this.households = await HouseholdService.getHouseholds(representativeId);
    } catch (err) {
      this.errors.push(err);
      this.households = [];
    } finally {
      this.loading = false;
    }
  },

  async loadById(id) {
    this.errors = [];
    this.loading = true;
    try {
      this.current = await HouseholdService.getHouseholdById(id);
      return this.current;
    } catch (err) {
      this.errors.push(err);
      this.current = null;
      return null;
    } finally {
      this.loading = false;
    }
  },

  async create(data) {
    this.errors = [];
    this.loading = true;
    try {
      const created = await HouseholdService.createHousehold(data);
      // keep list in sync if already loaded
      if (Array.isArray(this.households)) this.households.push(created);
      return created;
    } catch (err) {
      this.errors.push(err);
      throw err;
    } finally {
      this.loading = false;
    }
  },

  async update(id, data) {
    this.errors = [];
    this.loading = true;
    try {
      const updated = await HouseholdService.updateHousehold(id, data);
      const idx = this.households.findIndex(h => h.id === id);
      if (idx !== -1) this.households[idx] = updated;
      if (this.current?.id === id) this.current = updated;
      return updated;
    } catch (err) {
      this.errors.push(err);
      throw err;
    } finally {
      this.loading = false;
    }
  },

  async remove(id) {
    this.errors = [];
    this.loading = true;
    try {
      await HouseholdService.deleteHousehold(id);
      this.households = this.households.filter(h => h.id !== id);
      if (this.current?.id === id) this.current = null;
    } catch (err) {
      this.errors.push(err);
      throw err;
    } finally {
      this.loading = false;
    }
  }
});
