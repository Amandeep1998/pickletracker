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
export const deleteAccount = () => api.delete('/auth/account');
export const pingPlatform = (platform, timeZone) => {
  const body = { platform };
  if (timeZone) body.timeZone = timeZone;
  return api.post('/auth/ping-platform', body);
};

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
export const broadcastEmail = (template, target, userIds) => api.post('/admin/broadcast-email', { template, target, userIds });
export const getAdminStories = () => api.get('/admin/stories');
export const createAdminStory = (data) => api.post('/admin/stories', data);
export const updateAdminStory = (id, data) => api.put(`/admin/stories/${id}`, data);
export const deleteAdminStory = (id) => api.delete(`/admin/stories/${id}`);

// Admin
export const toggleCompanionAccess = (userId) => api.put(`/admin/users/${userId}/companion-access`);

// Push notifications
export const subscribePush = (subscription) => api.post('/push/subscribe', subscription);
export const unsubscribePush = (endpoint) => api.post('/push/unsubscribe', { endpoint });

// Sessions (performance journal)
export const getSessions = () => api.get('/sessions');
export const createSession = (data) => api.post('/sessions', data);
export const updateSession = (id, data) => api.put(`/sessions/${id}`, data);
export const deleteSession = (id) => api.delete(`/sessions/${id}`);

// Community Feed
export const getFeed = (params = {}) => api.get('/feed', { params });
export const getFeedPost = (tournamentId) => api.get(`/feed/post/${tournamentId}`);
export const toggleFeedLike = (tournamentId) => api.post(`/feed/${tournamentId}/like`);
export const getFeedLikers = (tournamentId) => api.get(`/feed/${tournamentId}/likes`);
export const getFeedComments = (tournamentId) => api.get(`/feed/${tournamentId}/comments`);
export const addFeedComment = (tournamentId, text, parentId = null) =>
  api.post(`/feed/${tournamentId}/comments`, { text, parentId });
export const deleteFeedComment = (tournamentId, commentId) => api.delete(`/feed/${tournamentId}/comments/${commentId}`);

// Support tickets
export const submitSupport = (data) => api.post('/support', data);
export const getMySupportTickets = () => api.get('/support');
export const deleteSupportTicket = (id) => api.delete(`/support/${id}`);

// Feed notifications
export const getFeedNotifications = () => api.get('/feed/notifications');
export const markFeedNotificationsRead = () => api.put('/feed/notifications/read-all');
export const markFeedNotificationRead = (id) => api.put(`/feed/notifications/${id}/read`);

// Players / Community
export const getPlayer = (id) => api.get(`/players/${id}`);
export const sendFriendRequest = (recipientId) => api.post('/friends/requests', { recipientId });
export const getFriendRequests = () => api.get('/friends/requests');
export const acceptFriendRequest = (id) => api.post(`/friends/requests/${id}/accept`);
export const rejectFriendRequest = (id) => api.post(`/friends/requests/${id}/reject`);
export const getFriendSchedule = (friendId) => api.get(`/friends/${friendId}/schedule`);

// Companion (chat) — Phase 2 real wiring
export const companionParse = (transcript, currentForm) =>
  api.post('/companion/parse', { transcript, currentForm });
export const companionAssist = (message) => api.post('/companion/assist', { message });
export const companionParseGear = (transcript) =>
  api.post('/companion/parse-gear', { transcript });
export const getCategoryOptions = (facets) =>
  api.post('/companion/category-options', { facets });
export const getCategoryList = () => api.get('/companion/categories');
export const getCompanionCard = () => api.get('/companion/me/card');
// Update one medal row in place. `patch` names the source + target:
//  { source:'tournament', tournamentId, categoryIndex, medal?, categoryName?, date? }
//  { source:'manual', manualIndex, medal?, categoryName?, tournamentName?, date? }
export const updateCompanionMedal = (patch) => api.patch('/companion/me/medals', patch);
// Save the post-result shot review for one tournament: { wentWell:[], wentWrong:[] }.
export const saveTournamentFeedback = (id, feedback) =>
  api.patch(`/companion/me/tournaments/${id}/feedback`, feedback);
export const getCompanionTournaments = () => api.get('/companion/me/tournaments');
export const getCompanionUpcoming = () => api.get('/companion/me/upcoming');
// period = 'month'|'year'|'all' (relative). OR pass an explicit { year, month }
// selection: year + month(1-12) = that month; year only = whole year.
export const getCompanionSpend = (arg = 'month') => {
  const params = typeof arg === 'string' ? { period: arg } : arg;
  return api.get('/companion/me/spend', { params });
};

// Coaching Income
export const getCoachingIncomes = () => api.get('/coaching-income');
export const createCoachingIncome = (data) => api.post('/coaching-income', data);
export const updateCoachingIncome = (id, data) => api.put(`/coaching-income/${id}`, data);
export const deleteCoachingIncome = (id) => api.delete(`/coaching-income/${id}`);

// Coach Schedule Slots
export const getCoachScheduleSlots = (month) => api.get('/coach-schedule', { params: month ? { month } : {} });
export const createCoachScheduleSlot = (data) => api.post('/coach-schedule', data);
export const updateCoachScheduleSlot = (id, data) => api.put(`/coach-schedule/${id}`, data);
export const deleteCoachScheduleSlot = (id) => api.delete(`/coach-schedule/${id}`);

// Coach Students
export const getCoachStudents = () => api.get('/coach-students');
export const upsertCoachStudents = (names) => api.post('/coach-students/upsert', { names });
export const deleteCoachStudent = (id) => api.delete(`/coach-students/${id}`);

// Gamification
export const getGamificationProgress = () => api.get('/gamification/progress');
export const markAchievementShared = (id) => api.post(`/gamification/achievements/${id}/share`);
