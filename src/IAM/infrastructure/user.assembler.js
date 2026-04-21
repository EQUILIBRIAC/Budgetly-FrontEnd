import {User} from "@/IAM/domain/model/user.entity.js";

export function toEntity(entity) {
    if(!dto || typeof dto !== 'object')  return new User();
    return new User({
        id: entity.id,
        name: entity.name,
        email: entity.email,
        password: entity.password,
        role: entity.role,
        status: entity.status,
        householdId: entity.householdId
    });
}


export function toDTO(entity) {
    if(!entity) return {};
    return {
        id: entity.id,
        name: (entity.name || '').trim(),
        email: (entity.email || '').trim(),
        password: (entity.password || '').trim(),
        role: (entity.role || '').trim(),
        status: (entity.status|| '').trim(),
        householdId: entity.householdId,
    }
}