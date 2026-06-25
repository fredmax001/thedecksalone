import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('soundit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('soundit_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
