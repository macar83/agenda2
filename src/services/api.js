// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// API Utils - Utility functions
export const apiUtils = {
  // Helper per headers autenticazione
  getAuthHeaders: () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  },

  // Gestione errori API
  handleApiError: (error, operation = 'operazione') => {
    console.error(`❌ Errore ${operation}:`, error);
    return {
      success: false,
      error: error.message || `Errore durante ${operation}`
    };
  },

  // Verifica se utente è autenticato
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Ottieni dati utente dal localStorage
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Test API connection
  testConnection: async () => {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('Server non raggiungibile');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Test connection error:', error);
      return { success: false, error: error.message };
    }
  }
};

// Lists API
export const listsAPI = {
  // Ottieni tutte le liste
  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/lists`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore caricamento liste');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento liste');
    }
  },

  // Ottieni lista specifica con task
  getById: async (listId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore caricamento lista');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento lista');
    }
  },

  // Crea nuova lista
  create: async (listData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lists`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(listData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore creazione lista');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'creazione lista');
    }
  },

  // Aggiorna lista
  update: async (listId, listData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
        method: 'PUT',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(listData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore aggiornamento lista');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'aggiornamento lista');
    }
  },

  // Elimina lista
  delete: async (listId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
        method: 'DELETE',
        headers: apiUtils.getAuthHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore eliminazione lista');
      }
      
      return { success: true };
    } catch (error) {
      return apiUtils.handleApiError(error, 'eliminazione lista');
    }
  }
};

// Tasks API
export const tasksAPI = {
  // Crea nuovo task
  create: async (taskData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(taskData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore creazione task');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'creazione task');
    }
  },

  // Aggiorna task
  update: async (taskId, taskData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(taskData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore aggiornamento task');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'aggiornamento task');
    }
  },

  // Toggle completamento task
  toggleComplete: async (taskId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore toggle task');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'toggle task');
    }
  },

  // Elimina task
  delete: async (taskId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: apiUtils.getAuthHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore eliminazione task');
      }
      
      return { success: true };
    } catch (error) {
      return apiUtils.handleApiError(error, 'eliminazione task');
    }
  },

  // Commenti task
  addComment: async (taskId, commentText) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify({ text: commentText })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore aggiunta commento');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'aggiunta commento');
    }
  },

  deleteComment: async (commentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: apiUtils.getAuthHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore eliminazione commento');
      }
      
      return { success: true };
    } catch (error) {
      return apiUtils.handleApiError(error, 'eliminazione commento');
    }
  }
};

// User API
export const userAPI = {
  // Login
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore login');
      }
      
      // Salva token e dati utente
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'login');
    }
  },

  // Registrazione
  register: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore registrazione');
      }
      
      // Salva token e dati utente
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'registrazione');
    }
  },

  // Logout
  logout: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders()
      });
      
      // Rimuovi token locale indipendentemente dalla risposta
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Rimuovi comunque i dati locali
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { success: true };
    }
  },

  // Ottieni profilo utente
  getProfile: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore caricamento profilo');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento profilo');
    }
  },

  // Aggiorna profilo
  updateProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore aggiornamento profilo');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'aggiornamento profilo');
    }
  }
};

// Export principale per compatibilità
export const api = {
  // Auth
  register: userAPI.register,
  login: userAPI.login,
  logout: userAPI.logout,
  
  // Utils
  isAuthenticated: apiUtils.isAuthenticated,
  getCurrentUser: apiUtils.getCurrentUser,
  testConnection: apiUtils.testConnection,
  
  // Lists
  getLists: listsAPI.getAll,
  getList: listsAPI.getById,
  createList: listsAPI.create,
  updateList: listsAPI.update,
  deleteList: listsAPI.delete,
  
  // Tasks
  createTask: tasksAPI.create,
  updateTask: tasksAPI.update,
  toggleTask: tasksAPI.toggleComplete,
  deleteTask: tasksAPI.delete,
  addComment: tasksAPI.addComment,
  deleteComment: tasksAPI.deleteComment,
  
  // Profile
  getProfile: userAPI.getProfile,
  updateProfile: userAPI.updateProfile
};

export default api;