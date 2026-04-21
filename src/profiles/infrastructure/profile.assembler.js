import { Profile } from '@/profiles/domain/model/profile.entity.js';

export function toEntity(dto = {}) {
  if (!dto || typeof dto !== 'object') return new Profile();
  return new Profile({
    id: dto.id ?? '',
    firstName: dto.firstName ?? '',
    lastName: dto.lastName ?? '',
    name: dto.name ?? '',
    email: dto.email ?? '',
    password: dto.password ?? '',
    role: dto.role ?? 'representative',
    status: dto.status ?? 'active',
    plan: dto.plan ?? 'FREE',
    householdId: dto.householdId ?? '',
    photo: dto.photo ?? '',
    profileLockedUntil: dto.profileLockedUntil ?? '',
    isNewUser: dto.isNewUser ?? false,
    createdAt: dto.createdAt ?? '',
    updatedAt: dto.updatedAt ?? ''
  });
}

export function toDTO(entity) {
  if (!entity) return {};
  return {
    id: entity.id,
    name: entity.name?.trim(),
    email: entity.email?.trim().toLowerCase(),
    password: entity.password,
    role: entity.role,
    status: entity.status,
    plan: entity.plan,
    householdId: entity.householdId,
    photo: entity.photo,
    profileLockedUntil: entity.profileLockedUntil,
    isNewUser: entity.isNewUser ?? false,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
}
