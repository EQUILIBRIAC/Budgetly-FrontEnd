import { Household } from '../domain/model/household.entity';
import { HouseholdApi } from './household-api';
import { toDTO, toEntity } from './household.assembler';

export class HouseholdService {
  static async createHousehold(householdData) {
    const household = new Household(householdData);
    const errors = household.validate();
    if (errors) throw errors;

    // Client-side guard for Free plan limits
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const plan = String(user.plan || 'FREE').toUpperCase();
    if (plan === 'FREE') {
      if (household.memberCount > 3)
        throw new Error('Con el plan Free solo puedes registrar hasta 3 miembros en el hogar.');
      const existing = await HouseholdApi.listByRepresentative(user.id);
      if (Array.isArray(existing) && existing.length >= 1)
        throw new Error('Con el plan Free solo puedes tener 1 hogar. Elimina el existente para crear uno nuevo.');
    }

    const created = await HouseholdApi.create(toDTO(household));
    return toEntity(created);
  }

  static async getHouseholds(representativeId) {
    const list = await HouseholdApi.listByRepresentative(representativeId);
    return (list || []).map(toEntity);
  }
 
  static async getHouseholdById(id) {
    if (!id || typeof id !== 'string') {
      console.error('getHouseholdById recibió un ID inválido:', id);
      throw new Error('Parámetro ID inválido');
    }
    try {
      const dto = await HouseholdApi.getById(id);
      if (!dto) throw new Error(`No se encontró un hogar con el ID ${id}`);
      return toEntity(dto);
    } catch (error) {
      console.error('Error fetching household:', error);
      throw new Error(error.message || 'No se pudo obtener la información del hogar');
    }
  }

  static async updateHousehold(id, householdData) {
    try {
      const household = new Household(householdData);
      const errors = household.validate();
      if (errors) throw errors;

       // Client-side guard for Free plan limits on edit
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const plan = String(user.plan || 'FREE').toUpperCase();
      if (plan === 'FREE' && household.memberCount > 3)
        throw new Error('Con el plan Free solo puedes registrar hasta 3 miembros en el hogar.');

      const currentHousehold = await this.getHouseholdById(id);
      if (!currentHousehold) throw new Error('No se encontró el hogar para actualizar');

      const dataToSend = {
        ...currentHousehold,
        name: household.name.trim(),
        description: household.description?.trim() || '',
        memberCount: Math.max(1, household.memberCount),
        startDate: household.startDate,
        currency: household.currency,
        updatedAt: new Date().toISOString()
      };

      const householdToUpdate = await this.getHouseholdById(id);
      if (!householdToUpdate) throw new Error('No se encontró el hogar para actualizar');

      const updated = await HouseholdApi.update(householdToUpdate.id, toDTO(dataToSend));
      if (!updated) throw new Error('No se recibió respuesta del servidor');
      return toEntity(updated);
    } catch (error) {
      console.error('Error updating household:', error);
      throw new Error(error.message || 'No se pudo actualizar el hogar');
    }
  }

  static async deleteHousehold(id) {
    await HouseholdApi.remove(id);
  }
}

