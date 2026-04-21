import axios from "axios";

export const AUTH_TOKEN_KEY = 'auth_token';

const httpInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
});

// Attach JWT to every request when available
httpInstance.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default httpInstance;
