import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication
export const register = async (username, email, password) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// Medications
export const getMedications = async () => {
  const response = await api.get('/medications');
  return response.data;
};

export const addMedication = async (medicationData) => {
  const response = await api.post('/medications', medicationData);
  return response.data;
};

export const updateMedication = async (id, medicationData) => {
  const response = await api.put(`/medications/${id}`, medicationData);
  return response.data;
};

export const deleteMedication = async (id) => {
  const response = await api.delete(`/medications/${id}`);
  return response.data;
};

// Drug Interactions
export const checkInteractions = async (medications) => {
  const response = await api.post('/interactions/check', { medications });
  return response.data;
};

// Adherence
export const logAdherence = async (logData) => {
  const response = await api.post('/adherence/log', logData);
  return response.data;
};

export const getAdherenceStats = async (days = 30) => {
  const response = await api.get(`/adherence/stats?days=${days}`);
  return response.data;
};

// Dashboard
export const getDashboard = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

export default api;
