import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Megabrain API
export const megabrainApi = {
  // Chat
  sendMessage: (workspaceId: string, message: string, conversationId?: string) =>
    api.post('/megabrain/chat', { workspace_id: workspaceId, message, conversation_id: conversationId }),

  // Workspaces
  getWorkspaces: () => api.get('/megabrain/workspaces'),
  createWorkspace: (name: string, description?: string, type?: string) =>
    api.post('/megabrain/workspaces', { name, description, type }),

  // Consciousness
  getConsciousnessState: () => api.get('/megabrain/consciousness/state'),
  introspect: (type: string, context: string) =>
    api.post('/megabrain/consciousness/introspect', { type, context }),
  getIntrospections: (limit?: number) =>
    api.get('/megabrain/consciousness/introspections', { params: { limit } }),
  getReflections: (limit?: number) =>
    api.get('/megabrain/consciousness/reflections', { params: { limit } }),

  // Research
  startResearch: (topic: string, type: string, depth?: string) =>
    api.post('/megabrain/research', { topic, type, depth }),
  getResearchProjects: () => api.get('/megabrain/research'),
  getResearchProject: (id: string) => api.get(`/megabrain/research/${id}`),

  // Providers
  getProviders: () => api.get('/megabrain/providers'),
};

// Empire API
export const empireApi = {
  // Portfolio
  getPortfolio: () => api.get('/empire/portfolio'),
  getStartup: (id: string) => api.get(`/empire/portfolio/${id}`),
  createStartup: (data: any) => api.post('/empire/portfolio', data),
  updateStartup: (id: string, data: any) => api.patch(`/empire/portfolio/${id}`, data),
  deleteStartup: (id: string) => api.delete(`/empire/portfolio/${id}`),

  // Summary
  getSummary: () => api.get('/empire/summary'),

  // Financials
  getFinancials: (startupId: string) => api.get(`/empire/financials/${startupId}`),
  logFinancials: (startupId: string, data: any) =>
    api.post(`/empire/financials/${startupId}`, data),

  // Treasury
  getTreasuryStatus: () => api.get('/empire/treasury/status'),
  updateTreasury: (data: any) => api.post('/empire/treasury/update', data),
  getCapitalHistory: (days?: number) =>
    api.get('/empire/treasury/history', { params: { days } }),
  getAllocations: (startupId?: string) =>
    api.get('/empire/treasury/allocations', { params: { startup_id: startupId } }),
  createAllocation: (data: any) => api.post('/empire/treasury/allocations', data),

  // Orders
  getCurrentOrders: () => api.get('/empire/orders/current'),
  getOrdersHistory: (limit?: number) =>
    api.get('/empire/orders/history', { params: { limit } }),
  generateOrders: () => api.post('/empire/orders/generate'),
  executeOrders: (id: string, notes?: string) =>
    api.post(`/empire/orders/${id}/execute`, { execution_notes: notes }),

  // Pipeline
  getPipeline: () => api.get('/empire/pipeline'),
  addIdea: (data: any) => api.post('/empire/pipeline', data),
  approveIdea: (id: string, startupId: string) =>
    api.post(`/empire/pipeline/${id}/approve`, { startup_id: startupId }),

  // Decisions
  getDecisions: (limit?: number) =>
    api.get('/empire/decisions', { params: { limit } }),
  logDecision: (data: any) => api.post('/empire/decisions', data),
};

// Health API
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
