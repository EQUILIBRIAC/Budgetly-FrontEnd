import { Household } from '../domain/model/household.entity';

export function toEntity(dto = {}) {
  if (!dto || typeof dto !== 'object') return new Household();
  return new Household({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    memberCount: dto.memberCount,
    startDate: dto.startDate ? new Date(dto.startDate) : undefined,
    currency: dto.currency,
    representativeId: dto.representativeId,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined
  });
}

export function toDTO(entity) {
  if (!entity) return {};
  const start = entity.startDate instanceof Date
    ? entity.startDate.toISOString()
    : new Date(entity.startDate).toISOString();
  const created = entity.createdAt instanceof Date
    ? entity.createdAt.toISOString()
    : new Date(entity.createdAt).toISOString();
  return {
    id: entity.id,
    name: (entity.name || '').trim(),
    description: (entity.description || '').trim(),
    memberCount: Math.max(1, Number(entity.memberCount || 1)),
    startDate: start,
    currency: (entity.currency || '').toString().trim() || 'USD',
    representativeId: entity.representativeId,
    createdAt: created,
    updatedAt: new Date().toISOString()
  };
}

