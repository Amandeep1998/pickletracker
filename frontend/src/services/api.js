import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${baseURL}/api`,
});

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — only redirect if user had an active session (token existed).
// If there's no token, the 401 is a legitimate auth failure (e.g. wrong password)
// and should be handled by the calling code, not redirected.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const signup = (data) => api.post('/auth/signup', data);
export const login = (data) => api.post('/auth/login', data);
export const loginWithGoogle = (data) => api.post('/auth/google', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password });
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);

// Tournaments
export const getTournaments = () => api.get('/tournaments');
export const createTournament = (data) => api.post('/tournaments', data);
export const updateTournament = (id, data) => api.put(`/tournaments/${id}`, data);
export const deleteTournament = (id) => api.delete(`/tournaments/${id}`);

// Expenses
export const getExpenses = () => api.get('/expenses');
export const createExpense = (data) => api.post('/expenses', data);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// Admin
export const getAdminUsers = () => api.get('/admin/users');
export const getAdminUserTournaments = (userId) => api.get(`/admin/users/${userId}/tournaments`);
export const deleteAdminUser = (userId) => api.delete(`/admin/users/${userId}`);

// WhatsApp
export const getWhatsAppStatus = () => api.get('/whatsapp/status');
export const connectWhatsApp = (data) => api.post('/whatsapp/connect', data);
export const disconnectWhatsApp = () => api.delete('/whatsapp/connect');
export const toggleWhatsAppAccess = (userId) => api.put(`/admin/users/${userId}/whatsapp-access`);

// Sessions (performance journal)
export const getSessions = () => api.get('/sessions');
export const createSession = (data) => api.post('/sessions', data);
export const updateSession = (id, data) => api.put(`/sessions/${id}`, data);
export const deleteSession = (id) => api.delete(`/sessions/${id}`);

// AI — voice
export const parseTournamentVoice = (transcript, currentForm) =>
  api.post('/ai/parse-voice', { transcript, currentForm });

// AI — document (URL or file)
export const parseFromFile = (file, currentForm) => {
  const formData = new FormData();
  formData.append('file', file);
  if (currentForm) formData.append('currentForm', JSON.stringify(currentForm));
  return api.post('/document/parse-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
