import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users')
};

export const projectAPI = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getMembers: (id) => api.get(`/projects/${id}/members`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`)
};

export const datasetAPI = {
  list: (projectId) => api.get(`/projects/${projectId}/datasets`),
  get: (id) => api.get(`/datasets/${id}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/datasets`, data),
  delete: (id) => api.delete(`/datasets/${id}`),
  listImages: (datasetId, params) => api.get(`/datasets/${datasetId}/images`, { params }),
  getImage: (id) => api.get(`/images/${id}`),
  deleteImage: (id) => api.delete(`/images/${id}`),
  uploadImages: (datasetId, files, onProgress) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return api.post(`/datasets/${datasetId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
  }
};

export const annotationAPI = {
  listClasses: (projectId) => api.get(`/projects/${projectId}/classes`),
  createClass: (projectId, data) => api.post(`/projects/${projectId}/classes`, data),
  updateClass: (id, data) => api.put(`/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/classes/${id}`),
  listAnnotations: (imageId) => api.get(`/images/${imageId}/annotations`),
  create: (imageId, data) => api.post(`/images/${imageId}/annotations`, data),
  update: (id, data) => api.put(`/annotations/${id}`, data),
  delete: (id) => api.delete(`/annotations/${id}`),
  batchCreate: (imageId, annotations) => api.post(`/images/${imageId}/annotations/batch`, { annotations }),
  export: (imageId) => api.post(`/images/${imageId}/export`)
};

export const aiAPI = {
  detect: (data) => api.post('/ai/detect', data),
  segment: (data) => api.post('/ai/segment', data),
  interactiveSegment: (data) => api.post('/ai/interactive-segment', data),
  classify: (data) => api.post('/ai/classify', data),
  keypoints: (data) => api.post('/ai/keypoints', data),
  ocr: (data) => api.post('/ai/ocr', data),
  listModels: () => api.get('/ai/models')
};

export const collaborationAPI = {
  listComments: (imageId) => api.get(`/images/${imageId}/comments`),
  createComment: (imageId, data) => api.post(`/images/${imageId}/comments`, data),
  deleteComment: (id) => api.delete(`/comments/${id}`),
  listTasks: (params) => api.get('/tasks', { params }),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  batchAssign: (data) => api.post('/tasks/batch-assign', data)
};
