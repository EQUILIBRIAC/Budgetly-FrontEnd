import { Profile } from '@/profiles/domain/model/profile.entity.js';
import { ProfileApi } from '@/profiles/infrastructure/profile-api.js';
import { toDTO, toEntity } from '@/profiles/infrastructure/profile.assembler.js';

export class ProfileService {
  static async getProfileById(id) {
    if (!id) throw new Error('Profile id is required');
    const dto = await ProfileApi.getById(id);
    if (!dto) throw new Error(`Profile with id ${id} not found`);
    return toEntity(dto);
  }

  static async updateProfile(id, data) {
    if (!id) throw new Error('Profile id is required');
    const profile = new Profile({
      ...data,
      id,
      updatedAt: data?.updatedAt || new Date().toISOString()
    });
    const errors = profile.validate();
    if (errors) throw errors;

    const updated = await ProfileApi.update(id, toDTO(profile));
    if (!updated) throw new Error('No response from server');
    return toEntity(updated);
  }
}
