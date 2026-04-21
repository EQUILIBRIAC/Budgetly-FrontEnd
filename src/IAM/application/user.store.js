// stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
// ⬇️ adjust the path to your actual service
import { UserService } from '@/services/UserService'

export const useUserStore = defineStore('user', () => {
    // state
    const users = ref([])
    const current = ref(null)
    const errors = ref([])
    const loading = ref(false)

    // getters (optional)
    const hasErrors = computed(() => errors.value.length > 0)

    // helpers
    const normalizeError = (err) =>
        err?.response?.data?.message ?? err?.message ?? String(err)

    // actions
    async function loadUserById(id) {
        errors.value = []
        loading.value = true
        try {
            current.value = await UserService.getUserById(id)
            return current.value
        } catch (err) {
            errors.value.push(normalizeError(err))
            current.value = null
            return null
        } finally {
            loading.value = false
        }
    }

    async function loadUserByEmail(email) {
        errors.value = []
        loading.value = true
        try {
            current.value = await UserService.getUserByEmail(email)
            return current.value
        } catch (err) {
            errors.value.push(normalizeError(err))
            current.value = null
            return null
        } finally {
            loading.value = false
        }
    }

    async function create(data) {
        errors.value = []
        loading.value = true
        try {
            const created = await UserService.createUser(data)
            if (Array.isArray(users.value)) users.value.push(created)
            return created
        } catch (err) {
            errors.value.push(normalizeError(err))
            throw err
        } finally {
            loading.value = false
        }
    }

    async function update(id, data) {
        errors.value = []
        loading.value = true
        try {
            const updated = await UserService.updateUser(id, data)

            const idx = users.value.findIndex((u) => u.id === id)
            if (idx !== -1) users.value[idx] = updated

            if (current.value?.id === id) current.value = updated

            return updated
        } catch (err) {
            errors.value.push(normalizeError(err))
            throw err
        } finally {
            loading.value = false
        }
    }

    async function remove(id) {
        errors.value = []
        loading.value = true
        try {
            await UserService.deleteUser(id)
            users.value = users.value.filter((u) => u.id !== id)
            if (current.value?.id === id) current.value = null
        } catch (err) {
            errors.value.push(normalizeError(err))
            throw err
        } finally {
            loading.value = false
        }
    }

    function clearErrors() {
        errors.value = []
    }

    function reset() {
        users.value = []
        current.value = null
        errors.value = []
        loading.value = false
    }

    return {
        // state
        users,
        current,
        errors,
        loading,
        // getters
        hasErrors,
        // actions
        loadUserById,
        loadUserByEmail,
        create,
        update,
        remove,
        clearErrors,
        reset,
    }
})
