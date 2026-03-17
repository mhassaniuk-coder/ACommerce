import axios from 'axios';
import { auth, firebaseInitialized } from './firebase';
import { USE_FIREBASE } from './config';

// Use relative path when running in development (via Vite proxy)
// Fall back to explicit localhost:5000 for production builds
const getBaseURL = () => {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
        return '/api'; // Uses Vite proxy
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
});

api.interceptors.request.use(async (config) => {
    try {
        // Only try Firebase token if Firebase is properly configured and enabled
        if (USE_FIREBASE && firebaseInitialized && auth) {
            const user = auth.currentUser;
            if (user) {
                try {
                    const token = await user.getIdToken();
                    config.headers.Authorization = `Bearer ${token}`;
                    return config;
                } catch (tokenError) {
                    console.warn('API Interceptor: Failed to get Firebase token, falling back to local token:', tokenError);
                }
            }
        }
        // Fall back to local JWT token from localStorage
        const localToken = localStorage.getItem('token');
        if (localToken) {
            config.headers.Authorization = `Bearer ${localToken}`;
        }
    } catch (error) {
        console.error('API Interceptor: Error getting token', error);
        // Still try to use local token as fallback
        const localToken = localStorage.getItem('token');
        if (localToken) {
            config.headers.Authorization = `Bearer ${localToken}`;
        }
    }
    return config;
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token might be invalid, clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

export default api;
