import {User} from "@/IAM/domain/model/user.entity.js";
import {UserApi} from "@/IAM/infrastructure/user-api.js";
import {toDTO, toEntity} from "@/IAM/infrastructure/user.assembler.js";
import {HouseholdApi} from "@/households/infrastructure/household-api.js";

export class UserService {
    static async createUser(userData) {
        const user = new User(userData);
        const errors = userData.validate;
        if(!errors) throw errors;

        const created = await UserApi.create(toDTO(userData));
        return toEntity(created);
    }

    static async getUserById(id) {
        if(!id) {
            console.error('ID is not valid');
            throw new Error(`ID doesn't exist`);
        }
        try {
            const dto = await UserApi.getById(id);
            if(!dto) throw new Error(`Wasnt able to find a user with id ${id}`);
            return toEntity(dto);
        }catch (error){
            console.error('Error fetching User: ',error);
            throw new Error(error.message || 'We are not able to obtain the user');
        }
    }

    static async getUserByEmail(email) {
        if(!email){
            console.error('Email is not valid');
            throw new Error(`Email is not valid`);
        }
        try {
            const dto = await UserApi.getByEmail(email);
            if(!dto) throw new Error(`Wasnt able to find a user with email ${email}`);
            return toEntity(dto);
        }catch (error){
            console.error('Error fetching User: ',error);
            throw new Error(error.message || 'We are not able to obtain the user');
        }
    }

    static async updateUser(id, userData) {
        try {
            const user = new User(userData);
            const errors = user.validate();
            if(errors) throw errors;

            const currentUser = await this.getUserById(id);
            if(!currentUser) throw new Error(`User with id ${id} not found`);

            const dataToSend = {
                ...currentUser,
                name: userData.name.trim(),
                email: userData.email?.trim() || '',
                password: userData.password,
                role: user.role?.trim() || '',
                status: user.status?.trim() || '',
                householdId: user.householdId?.trim() || '',
            }

            const userToUpdate = await this.getUserById(id);
            if (!userToUpdate) throw new Error('No se encontró el usuario para actualizar');

            const updated = await UserApi.update(userToUpdate.id, toDTO(dataToSend));
            if (!updated) throw new Error('No se recibió respuesta del servidor');
            return toEntity(updated);
        }catch (error){
            console.error('Error fetching User: ',error);
            throw new Error(error.message || 'We are not able to obtain the user');
        }

    }

    static async deleteUser(id) {
        await UserApi.remove(id);
    }
}