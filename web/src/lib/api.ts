import axios from 'axios';

/**
 * Client HTTP vers l'API backend NestJS. L'URL de base se règle au build
 * via `VITE_API_BASE_URL` (voir `.env.example`) ; par défaut
 * `http://localhost:3000`, adapté au développement local.
 */
export const TOKEN_STORAGE_KEY = 'c3digital.accessToken';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Un jeton expiré/invalide déclenche un événement plutôt que d'appeler
 * directement `AuthContext` (évite une dépendance circulaire depuis ce
 * module non-React) — `AuthProvider` s'y abonne pour déconnecter
 * l'utilisateur et le renvoyer vers `/connexion`.
 */
export const AUTH_UNAUTHORIZED_EVENT = 'c3digital:unauthorized';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);
