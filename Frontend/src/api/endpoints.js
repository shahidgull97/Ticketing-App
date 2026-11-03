import { http } from './http';

const data = (p) => p.then((r) => r.data);

export const authApi = {
  login: (username, password) => data(http.post('/auth/token/', { username, password })),
  me: () => data(http.get('/auth/me/')),
  demoAccounts: () => data(http.get('/auth/demo-accounts/')),
};

export const ticketsApi = {
  list: (params) => data(http.get('/tickets/', { params })),
  get: (id) => data(http.get(`/tickets/${id}/`)),
  create: (payload) => data(http.post('/tickets/', payload)),
  comment: (id, text) => data(http.post(`/tickets/${id}/comments/`, { text })),
  assignWorker: (id, worker) => data(http.post(`/tickets/${id}/assign-worker/`, { worker })),
  changeDepartment: (id, payload) => data(http.post(`/tickets/${id}/change-department/`, payload)),
  submitAssessment: (id, payload) => data(http.post(`/tickets/${id}/submit-assessment/`, payload)),
  resolve: (id) => data(http.post(`/tickets/${id}/resolve/`)),
};

export const lookupApi = {
  filterOptions: () => data(http.get('/ticket-filters/')),
  clients: () => data(http.get('/clients/')),
  issues: () => data(http.get('/issues/')),
  quickIssues: (clientId) => data(http.get(`/clients/${clientId}/quick-issues/`)),
  departments: () => data(http.get('/departments/')),
  workers: () => data(http.get('/workers/')),
};

export const notificationsApi = {
  list: () => data(http.get('/notifications/')),
  markRead: (id) => data(http.post('/notifications/mark-read/', id ? { id } : {})),
};


