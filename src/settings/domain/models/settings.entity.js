export class Settings {
    constructor({
                    id = "",
                    userId = 0,
                    language = "",
                    darkMode = false,
                    notificationEnabled = false,
                    createdAt = "",
                    updatedAt = "",
                } = {}) {
        this.id = id;
        this.userId = userId;
        this.language = language;
        this.darkMode = Boolean(darkMode);
        this.notificationEnabled = Boolean(notificationEnabled);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    validate() {
        const errors = {};
        if (typeof this.userId !== 'number' || this.userId <= 0) errors.userId = 'userId must be a positive number';
        if (!this.language || typeof this.language !== 'string') errors.language = 'language is required';
        if (typeof this.darkMode !== 'boolean') errors.darkMode = 'darkMode must be boolean';
        if (typeof this.notificationEnabled !== 'boolean') errors.notificationEnabled = 'notificationEnabled must be boolean';
        // Optional: createdAt/updatedAt presence or ISO format checks if your API requires them.
        return Object.keys(errors).length === 0 ? null : errors;
    }
}
