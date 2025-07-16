// src/services/api.js
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
      console.log('🔌 Testing API connection to:', API_BASE_URL.replace('/api', '') + '/health');
      
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('Server non raggiungibile');
      }
      
      console.log('✅ API connection successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ API connection failed:', error);
      return { success: false, error: error.message };
    }
  }
};

// Lists API
export const listsAPI = {
  // Ottieni tutte le liste
  getAll: async () => {
    try {
      console.log('📂 API: Getting all lists');
      
      const response = await fetch(`${API_BASE_URL}/lists`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento liste');
      }
      
      console.log('✅ API: Lists loaded successfully:', data);
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento liste');
    }
  },

  // Ottieni lista specifica con task
  getById: async (listId) => {
    try {
      console.log('📂 API: Getting list by ID:', listId);
      
      const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento lista');
      }
      
      console.log('✅ API: List loaded successfully:', data);
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento lista');
    }
  },

  // Crea nuova lista
  create: async (listData) => {
    try {
      console.log('📂 API: Creating list with data:', listData);
      
      const response = await fetch(`${API_BASE_URL}/lists`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(listData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore creazione lista');
      }
      
      console.log('✅ API: List created successfully:', data);
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'creazione lista');
    }
  },

  // Aggiorna lista
  update: async (listId, listData) => {
    try {
      console.log('📂 API: Updating list', listId, 'with data:', listData);
      
      const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
        method: 'PUT',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(listData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore aggiornamento lista');
      }
      
      console.log('✅ API: List updated successfully:', data);
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'aggiornamento lista');
    }
  },

  // Elimina lista
  delete: async (listId) => {
    try {
      console.log('📂 API: Deleting list:', listId);
      
      const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
        method: 'DELETE',
        headers: apiUtils.getAuthHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore eliminazione lista');
      }
      
      console.log('✅ API: List deleted successfully');
      return { success: true };
    } catch (error) {
      return apiUtils.handleApiError(error, 'eliminazione lista');
    }
  },

  // Riordina liste
  reorder: async (listIds) => {
    try {
      console.log('📂 API: Reordering lists:', listIds);
      
      const response = await fetch(`${API_BASE_URL}/lists/reorder`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify({ listIds })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore riordinamento liste');
      }
      
      console.log('✅ API: Lists reordered successfully:', data);
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'riordinamento liste');
    }
  }
};

// Tasks API
export const tasksAPI = {
  // Crea nuovo task - FIXED: include listId nel body
  create: async (listId, taskData) => {
    try {
      console.log('📋 API: Creating task in list', listId, 'with data:', taskData);
      
      // Combina listId con taskData per il backend
const requestBody = {
  listId: parseInt(listId),
  title: taskData.title,
  details: taskData.details || '',
  priority: taskData.priority || 'medium'
};

// Aggiungi reminder solo se presente e valido
if (taskData.reminder && taskData.reminder !== null && taskData.reminder !== '') {
  requestBody.reminder = taskData.reminder;
}

// Aggiungi dueDate solo se presente e valido  
if (taskData.dueDate && taskData.dueDate !== null && taskData.dueDate !== '') {
  requestBody.dueDate = taskData.dueDate;
}
      
      console.log('📤 API: Sending request body:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
    if (!response.ok) {
  console.error('❌ API Error Response:', data);
  
  // DEBUG: Mostra dettagli errori di validazione
  if (data.details && Array.isArray(data.details)) {
    console.error('🔍 VALIDATION ERRORS:');
    data.details.forEach((detail, index) => {
      console.error(`   ${index + 1}. Campo: ${detail.path || detail.param}`, {
        value: detail.value,
        message: detail.msg,
        location: detail.location,
        received: detail.value,
        expected: detail.msg
      });
    });
  }
  
  throw new Error(data.error || 'Errore creazione task');
}
      
      console.log('✅ API: Task created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ API: Task creation failed:', error);
      return apiUtils.handleApiError(error, 'creazione task');
    }
  },

  // Aggiorna task
// Aggiorna task
update: async (taskId, taskData) => {
  try {
    console.log('✏️ API: Updating task', taskId, 'with data:', taskData);
    
    // Prepara il body pulendo i campi null
    const requestBody = {};
    
    // Aggiungi solo i campi definiti e non-null
    if (taskData.title !== undefined && taskData.title !== null) {
      requestBody.title = taskData.title;
    }
    if (taskData.details !== undefined && taskData.details !== null) {
      requestBody.details = taskData.details;
    }
    if (taskData.completed !== undefined && taskData.completed !== null) {
      requestBody.completed = taskData.completed;
    }
    if (taskData.priority !== undefined && taskData.priority !== null) {
      requestBody.priority = taskData.priority;
    }
    if (taskData.listId !== undefined && taskData.listId !== null) {
      requestBody.listId = parseInt(taskData.listId);
    }
    
    // Aggiungi reminder solo se presente e valido
    if (taskData.reminder && taskData.reminder !== null && taskData.reminder !== '') {
      requestBody.reminder = taskData.reminder;
    }
    
    // Aggiungi dueDate solo se presente e valido
    if (taskData.dueDate && taskData.dueDate !== null && taskData.dueDate !== '') {
      requestBody.dueDate = taskData.dueDate;
    }
    
    console.log('📤 API: Sending update body:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: apiUtils.getAuthHeaders(),
      body: JSON.stringify(requestBody)
    });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore aggiornamento task');
      }
      
      console.log('✅ API: Task updated successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ API: Task update failed:', error);
      return apiUtils.handleApiError(error, 'aggiornamento task');
    }
  },

  // Toggle completa/incompleta task
  toggleComplete: async (taskId) => {
    try {
      console.log('🔄 API: Toggling task completion:', taskId);
      
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore toggle task');
      }
      
      console.log('✅ API: Task toggled successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ API: Task toggle failed:', error);
      return apiUtils.handleApiError(error, 'toggle task');
    }
  },

  // Elimina task
  delete: async (taskId) => {
    try {
      console.log('🗑️ API: Deleting task:', taskId);
      
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: apiUtils.getAuthHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore eliminazione task');
      }
      
      console.log('✅ API: Task deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ API: Task deletion failed:', error);
      return apiUtils.handleApiError(error, 'eliminazione task');
    }
  },

  // Ottieni task specifico
  getById: async (taskId) => {
    try {
      console.log('📖 API: Getting task:', taskId);
      
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento task');
      }
      
      console.log('✅ API: Task loaded successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ API: Task loading failed:', error);
      return apiUtils.handleApiError(error, 'caricamento task');
    }
  },

  // Ottieni tutti i task dell'utente
  getAll: async () => {
    try {
      console.log('📖 API: Getting all user tasks');
      
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento task');
      }
      
      console.log('✅ API: All tasks loaded successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ API: Tasks loading failed:', error);
      return apiUtils.handleApiError(error, 'caricamento task');
    }
  },

  // Riordina task
  reorder: async (taskIds) => {
    try {
      console.log('📋 API: Reordering tasks:', taskIds);
      
      const response = await fetch(`${API_BASE_URL}/tasks/reorder`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify({ taskIds })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore riordinamento task');
      }
      
      console.log('✅ API: Tasks reordered successfully:', data);
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'riordinamento task');
    }
  },

  // Task in scadenza
  getUpcoming: async (days = 7) => {
    try {
      console.log('📅 API: Getting upcoming tasks for', days, 'days');
      
      const response = await fetch(`${API_BASE_URL}/tasks/upcoming?days=${days}`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento task in scadenza');
      }
      
      console.log('✅ API: Upcoming tasks loaded successfully:', data);
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento task in scadenza');
    }
  },

  // Aggiungi commento al task
  addComment: async (taskId, commentData) => {
    try {
      console.log('💬 API: Adding comment to task:', taskId, commentData);
      
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(commentData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore aggiunta commento');
      }
      
      console.log('✅ API: Comment added successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ API: Comment addition failed:', error);
      return apiUtils.handleApiError(error, 'aggiunta commento');
    }
  },

  // Elimina commento
  deleteComment: async (taskId, commentId) => {
    try {
      console.log('🗑️ API: Deleting comment:', commentId, 'from task:', taskId);
      
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: apiUtils.getAuthHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore eliminazione commento');
      }
      
      console.log('✅ API: Comment deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ API: Comment deletion failed:', error);
      return apiUtils.handleApiError(error, 'eliminazione commento');
    }
  }
};

// User API
export const userAPI = {
  // Login
  login: async (credentials) => {
    try {
      console.log('🔐 API: Logging in user:', credentials.email);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore login');
      }
      
      // Salva token e dati utente
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('✅ API: User logged in successfully');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'login');
    }
  },

  // Registrazione
  register: async (userData) => {
    try {
      console.log('📝 API: Registering user:', userData.email);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore registrazione');
      }
      
      // Salva token e dati utente
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('✅ API: User registered successfully');
      }
      
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'registrazione');
    }
  },

  // Logout
  logout: async () => {
    try {
      console.log('🚪 API: Logging out user');
      
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: apiUtils.getAuthHeaders()
      });
      
      // Rimuovi token locale indipendentemente dalla risposta
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      console.log('✅ API: User logged out successfully');
      return { success: true };
    } catch (error) {
      console.error('⚠️ Logout error (removing local data anyway):', error);
      // Rimuovi comunque i dati locali
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { success: true };
    }
  },

  // Verifica token
  verifyToken: async () => {
    try {
      console.log('🔍 API: Verifying token');
      
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Token non valido');
      }
      
      console.log('✅ API: Token verified successfully');
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'verifica token');
    }
  },

  // Ottieni profilo utente
  getProfile: async () => {
    try {
      console.log('👤 API: Getting user profile');
      
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento profilo');
      }
      
      console.log('✅ API: Profile loaded successfully');
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento profilo');
    }
  },

  // Aggiorna profilo
  updateProfile: async (profileData) => {
    try {
      console.log('✏️ API: Updating user profile:', profileData);
      
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore aggiornamento profilo');
      }
      
      // Aggiorna dati utente locali
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      console.log('✅ API: Profile updated successfully');
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'aggiornamento profilo');
    }
  }
};

// Settings API
export const settingsAPI = {
  // Ottieni impostazioni utente
  get: async () => {
    try {
      console.log('⚙️ API: Getting user settings');
      
      const response = await fetch(`${API_BASE_URL}/settings`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento impostazioni');
      }
      
      console.log('✅ API: Settings loaded successfully');
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento impostazioni');
    }
  },

  // Aggiorna impostazioni
  update: async (settings) => {
    try {
      console.log('⚙️ API: Updating user settings:', settings);
      
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: apiUtils.getAuthHeaders(),
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore aggiornamento impostazioni');
      }
      
      console.log('✅ API: Settings updated successfully');
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'aggiornamento impostazioni');
    }
  }
};

// Statistics API
export const statsAPI = {
  // Dashboard statistics
  getDashboard: async () => {
    try {
      console.log('📊 API: Getting dashboard stats');
      
      const response = await fetch(`${API_BASE_URL}/stats/dashboard`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento statistiche');
      }
      
      console.log('✅ API: Dashboard stats loaded successfully');
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento statistiche');
    }
  },

  // Productivity statistics
  getProductivity: async (period = '7d') => {
    try {
      console.log('📈 API: Getting productivity stats for period:', period);
      
      const response = await fetch(`${API_BASE_URL}/stats/productivity?period=${period}`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento statistiche produttività');
      }
      
      console.log('✅ API: Productivity stats loaded successfully');
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento statistiche produttività');
    }
  },

  // Activity logs
  getActivity: async (limit = 50) => {
    try {
      console.log('📋 API: Getting activity logs with limit:', limit);
      
      const response = await fetch(`${API_BASE_URL}/stats/activity?limit=${limit}`, {
        headers: apiUtils.getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || 'Errore caricamento log attività');
      }
      
      console.log('✅ API: Activity logs loaded successfully');
      return { success: true, data };
    } catch (error) {
      return apiUtils.handleApiError(error, 'caricamento log attività');
    }
  }
};

// Export principale per compatibilità con codice esistente
export const api = {
  // Auth
  register: userAPI.register,
  login: userAPI.login,
  logout: userAPI.logout,
  verifyToken: userAPI.verifyToken,
  
  // Utils
  isAuthenticated: apiUtils.isAuthenticated,
  getCurrentUser: apiUtils.getCurrentUser,
  testConnection: apiUtils.testConnection,
  
  // Lists (mantieni compatibilità)
  getLists: listsAPI.getAll,
  getList: listsAPI.getById,
  createList: listsAPI.create,
  updateList: listsAPI.update,
  deleteList: listsAPI.delete,
  
  // Tasks (mantieni compatibilità)
  createTask: tasksAPI.create,
  updateTask: tasksAPI.update,
  toggleTask: tasksAPI.toggleComplete,
  deleteTask: tasksAPI.delete,
  addComment: tasksAPI.addComment,
  deleteComment: tasksAPI.deleteComment,
  
  // Profile
  getProfile: userAPI.getProfile,
  updateProfile: userAPI.updateProfile,
  
  // Settings
  getSettings: settingsAPI.get,
  updateSettings: settingsAPI.update,
  
  // Stats
  getDashboardStats: statsAPI.getDashboard,
  getProductivityStats: statsAPI.getProductivity,
  getActivityLogs: statsAPI.getActivity
};

// Export default per import semplice
export default api;