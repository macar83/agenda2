import { useState, useEffect } from 'react';
import { api, listsAPI, tasksAPI } from '../services/api';

export const useAppData = () => {
  const [data, setData] = useState({
    isAuthenticated: true,
    currentView: 'overview',
    lists: [
      {
        id: 1,
        name: 'Esempi',
        color: '#3B82F6',
        tasks: [
          {
            id: 1,
            title: 'Task di esempio',
            details: 'Questo è un task di esempio',
            completed: false,
            priority: 'medium',
            reminder: null
          }
        ],
        incomplete_tasks: 1,
        total_tasks: 1
      }
    ],
    selectedList: null,
    user: { name: 'Test User' },
    error: null,
    isLoading: false,
    theme: 'light',
    soundEnabled: true,
    showSettings: false,
    selectedRssSource: 'techcrunch',
    // Nuovi flag per gestire database
    isOnline: true,
    lastSync: null,
    pendingChanges: []
  });

  // Test connessione API all'avvio
  useEffect(() => {
    console.log('🚀 useAppData: Initializing...');
    checkApiConnection();
    setupAuthAndLoadData();
  }, []);

  // NUOVO: Setup autenticazione e caricamento dati
  const setupAuthAndLoadData = async () => {
    console.log('🔐 Setting up authentication and loading data...');
    
    // Controlla se abbiamo già un token
    const existingToken = localStorage.getItem('token');
    const existingUser = localStorage.getItem('user');
    
    console.log('🔍 Auth check:', {
      hasToken: !!existingToken,
      hasUser: !!existingUser,
      tokenPreview: existingToken ? existingToken.substring(0, 20) + '...' : 'none'
    });
    
    if (existingToken && existingUser) {
      console.log('✅ Existing auth found, loading data...');
      setData(prev => ({
        ...prev,
        user: JSON.parse(existingUser)
      }));
      loadDataFromDatabase();
    } else {
      console.log('❌ No auth found, setting up mock auth...');
      await setupMockAuth();
    }
  };

  // Setup autenticazione mock per debug
  const setupMockAuth = async () => {
    console.log('🔧 Setting up mock authentication...');
    
    try {
      // Prova a registrare un utente di test
      console.log('📝 Attempting to register test user...');
      
      const registerResponse = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@debug.com',
          name: 'Test Debug User',
          password: 'password123'
        })
      });

      console.log('📝 Register response status:', registerResponse.status);

      if (registerResponse.ok || registerResponse.status === 409) {
        console.log('✅ User exists or created, attempting login...');
        
        // Fai login
        const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@debug.com',
            password: 'password123'
          })
        });

        console.log('🔐 Login response status:', loginResponse.status);

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          const token = loginData.token;
          
          console.log('✅ Login successful:', {
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
            user: loginData.user
          });
          
          // Salva il token
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(loginData.user));
          
          setData(prev => ({
            ...prev,
            user: loginData.user,
            isOnline: true,
            error: null
          }));
          
          console.log('✅ Mock authentication successful, loading data...');
          
          // Ora carica i dati
          loadDataFromDatabase();
        } else {
          const loginError = await loginResponse.text();
          throw new Error('Login failed: ' + loginError);
        }
      } else {
        const registerError = await registerResponse.text();
        throw new Error('Registration failed: ' + registerError);
      }
    } catch (error) {
      console.error('❌ Mock auth failed:', error);
      setData(prev => ({
        ...prev,
        isOnline: false,
        error: 'Auth failed: ' + error.message + ' - Using local data only'
      }));
    }
  };

  const checkApiConnection = async () => {
    console.log('🔌 Verificando connessione API...');
    const result = await api.testConnection();
    
    console.log('🔌 API connection result:', result);
    
    setData(prev => ({
      ...prev,
      isOnline: result.success,
      error: result.success ? null : 'Backend non disponibile - Modalità offline'
    }));

    if (result.success) {
      console.log('✅ API connessa:', result.data);
    } else {
      console.log('❌ API non disponibile:', result.error);
    }
  };

  const loadDataFromDatabase = async () => {
    console.log('📥 Caricando dati dal database...');
    setData(prev => ({ ...prev, isLoading: true }));

    try {
      // Prova a caricare le liste dal database
      const result = await listsAPI.getAll();
      
      console.log('📥 Lists API result:', result);
      
      if (result.success && result.data?.lists) {
        console.log('✅ Dati caricati dal database:', result.data.lists.length, 'liste');
        
        setData(prev => ({
          ...prev,
          lists: result.data.lists.map(list => ({
            id: list.id,
            name: list.name,
            color: list.color,
            description: list.description,
            tasks: list.tasks || [],
            incomplete_tasks: list.incompleteTasks || 0,
            total_tasks: list.totalTasks || 0,
            createdAt: list.createdAt,
            updatedAt: list.updatedAt
          })),
          isLoading: false,
          lastSync: new Date().toISOString(),
          isOnline: true
        }));
      } else {
        throw new Error(result.error || 'Errore caricamento dati');
      }
    } catch (error) {
      console.log('⚠️ Impossibile caricare dal database, usando dati locali:', error.message);
      
      // Fallback ai dati locali esistenti
      setData(prev => ({
        ...prev,
        isLoading: false,
        isOnline: false,
        error: 'Usando dati locali - Database non disponibile: ' + error.message
      }));
    }
  };

  const updateData = (newData) => {
    console.log('📊 Updating data:', newData);
    setData(prev => ({ ...prev, ...newData }));
  };

  const createList = async (listData) => {
    console.log('📝 Creating list:', listData);
    
    // Crea ID temporaneo per uso immediato
    const tempId = Date.now();
    const newListLocal = {
      id: tempId,
      name: listData.name,
      color: listData.color,
      description: listData.description || '',
      tasks: [],
      incomplete_tasks: 0,
      total_tasks: 0,
      createdAt: new Date().toISOString()
    };

    // Aggiorna subito la UI
    setData(prev => ({
      ...prev,
      lists: [...prev.lists, newListLocal]
    }));

    console.log('✅ Lista aggiunta alla UI');

    // Prova a salvare nel database
    if (data.isOnline) {
      try {
        console.log('💾 Salvando nel database...');
        const result = await listsAPI.create(listData);
        
        if (result.success) {
          // Aggiorna con ID reale dal database
          setData(prev => ({
            ...prev,
            lists: prev.lists.map(list => 
              list.id === tempId 
                ? { ...list, id: result.data.list.id }
                : list
            ),
            lastSync: new Date().toISOString(),
            error: null
          }));
          
          console.log('✅ Lista salvata nel database con ID:', result.data.list.id);
          return { ...newListLocal, id: result.data.list.id };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('❌ Errore salvataggio database:', error);
        
        // Aggiunge a pending changes per sync futuro
        setData(prev => ({
          ...prev,
          pendingChanges: [...prev.pendingChanges, {
            type: 'createList',
            data: listData,
            tempId: tempId,
            timestamp: new Date().toISOString()
          }],
          error: 'Lista creata localmente - Sarà sincronizzata quando possibile'
        }));
      }
    } else {
      console.log('📱 Modalità offline - Lista salvata localmente');
      setData(prev => ({
        ...prev,
        pendingChanges: [...prev.pendingChanges, {
          type: 'createList',
          data: listData,
          tempId: tempId,
          timestamp: new Date().toISOString()
        }]
      }));
    }

    return newListLocal;
  };

  const updateList = async (listId, listData) => {
    console.log('✏️ Updating list:', listId, 'with data:', listData);
    
    // Aggiorna subito la UI
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list => 
        list.id === listId 
          ? { ...list, name: listData.name, color: listData.color, description: listData.description }
          : list
      ),
      selectedList: prev.selectedList?.id === listId 
        ? { ...prev.selectedList, name: listData.name, color: listData.color, description: listData.description }
        : prev.selectedList
    }));

    console.log('✅ Lista aggiornata nella UI');

    // Prova a salvare nel database
    if (data.isOnline) {
      try {
        console.log('💾 Aggiornando nel database...');
        const result = await listsAPI.update(listId, listData);
        
        if (result.success) {
          setData(prev => ({
            ...prev,
            lastSync: new Date().toISOString(),
            error: null
          }));
          
          console.log('✅ Lista aggiornata nel database');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('❌ Errore aggiornamento database:', error);
        
        setData(prev => ({
          ...prev,
          pendingChanges: [...prev.pendingChanges, {
            type: 'updateList',
            listId: listId,
            data: listData,
            timestamp: new Date().toISOString()
          }],
          error: 'Modifica salvata localmente - Sarà sincronizzata quando possibile'
        }));
      }
    } else {
      console.log('📱 Modalità offline - Modifica salvata localmente');
      setData(prev => ({
        ...prev,
        pendingChanges: [...prev.pendingChanges, {
          type: 'updateList',
          listId: listId,
          data: listData,
          timestamp: new Date().toISOString()
        }]
      }));
    }
  };

  const deleteList = async (listId) => {
    console.log('🗑️ Deleting list:', listId);
    
    // Aggiorna subito la UI
    setData(prev => ({
      ...prev,
      lists: prev.lists.filter(list => list.id !== listId),
      selectedList: prev.selectedList?.id === listId ? null : prev.selectedList
    }));

    console.log('✅ Lista rimossa dalla UI');

    // Prova a eliminare dal database
    if (data.isOnline) {
      try {
        console.log('💾 Eliminando dal database...');
        const result = await listsAPI.delete(listId);
        
        if (result.success) {
          setData(prev => ({
            ...prev,
            lastSync: new Date().toISOString(),
            error: null
          }));
          
          console.log('✅ Lista eliminata dal database');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('❌ Errore eliminazione database:', error);
        
        setData(prev => ({
          ...prev,
          pendingChanges: [...prev.pendingChanges, {
            type: 'deleteList',
            listId: listId,
            timestamp: new Date().toISOString()
          }],
          error: 'Eliminazione salvata localmente - Sarà sincronizzata quando possibile'
        }));
      }
    } else {
      console.log('📱 Modalità offline - Eliminazione salvata localmente');
      setData(prev => ({
        ...prev,
        pendingChanges: [...prev.pendingChanges, {
          type: 'deleteList',
          listId: listId,
          timestamp: new Date().toISOString()
        }]
      }));
    }
  };

  const loadTasksForList = async (listId) => {
    console.log('📋 Loading tasks for list:', listId);
    
    // Prima cerca nei dati locali
    const localList = data.lists.find(l => l.id === listId);
    if (localList) {
      setData(prev => ({
        ...prev,
        selectedList: { ...localList }
      }));
    }

    // Se online, carica anche dal database per avere dati aggiornati
    if (data.isOnline) {
      try {
        const result = await listsAPI.getById(listId);
        
        if (result.success && result.data?.list) {
          const dbList = result.data.list;
          
          setData(prev => ({
            ...prev,
            selectedList: {
              id: dbList.id,
              name: dbList.name,
              color: dbList.color,
              description: dbList.description,
              tasks: dbList.tasks || [],
              incomplete_tasks: dbList.incompleteTasks || 0,
              total_tasks: dbList.totalTasks || 0
            },
            // Aggiorna anche nella lista principale
            lists: prev.lists.map(list => 
              list.id === listId 
                ? {
                    ...list,
                    tasks: dbList.tasks || [],
                    incomplete_tasks: dbList.incompleteTasks || 0,
                    total_tasks: dbList.totalTasks || 0
                  }
                : list
            )
          }));
          
          console.log('✅ Task caricati dal database per lista:', listId);
        }
      } catch (error) {
        console.error('❌ Errore caricamento task dal database:', error);
        // Continua con i dati locali
      }
    }
  };

  // FUNZIONE CREATETASK CON DEBUG COMPLETO
  const createTask = async (listId, taskData) => {
    console.log('📋 ===== TASK CREATION DEBUG START =====');
    console.log('📋 Creating task:', taskData, 'in list:', listId);
    
    // DEBUG: Verifica autenticazione
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔐 DEBUG - Auth state:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      hasUser: !!user,
      userPreview: user ? JSON.parse(user).name : 'none',
      isOnline: data.isOnline,
      currentApiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5001/api'
    });
    
    // DEBUG: Verifica parametri
    console.log('📤 DEBUG - Input parameters:', {
      listId: listId,
      listIdType: typeof listId,
      taskData: taskData,
      taskDataKeys: Object.keys(taskData),
      title: taskData.title,
      details: taskData.details,
      priority: taskData.priority
    });
    
    const tempId = Date.now();
    const newTask = {
      id: tempId,
      title: taskData.title,
      details: taskData.details || '',
      completed: false,
      priority: taskData.priority || 'medium',
      reminder: taskData.reminder,
      createdAt: new Date().toISOString(),
      comment_count: 0
    };

    console.log('🆕 DEBUG - New task object:', newTask);

    // Aggiorna subito la UI
    setData(prev => {
      const updatedLists = prev.lists.map(list => {
        if (list.id === listId) {
          const updatedTasks = [...(list.tasks || []), newTask];
          return {
            ...list,
            tasks: updatedTasks,
            total_tasks: updatedTasks.length,
            incomplete_tasks: updatedTasks.filter(t => !t.completed).length
          };
        }
        return list;
      });

      const updatedSelectedList = prev.selectedList?.id === listId 
        ? {
            ...prev.selectedList,
            tasks: [...(prev.selectedList.tasks || []), newTask],
            total_tasks: (prev.selectedList.total_tasks || 0) + 1,
            incomplete_tasks: (prev.selectedList.incomplete_tasks || 0) + 1
          }
        : prev.selectedList;

      return {
        ...prev,
        lists: updatedLists,
        selectedList: updatedSelectedList
      };
    });

    console.log('✅ Task aggiunto alla UI');

    // Prova a salvare nel database
    if (data.isOnline && token) {
      try {
        console.log('💾 DEBUG - Starting database save...');
        console.log('📤 DEBUG - Calling tasksAPI.create with:', { listId, taskData });
        
        // IMPORTANTE: Registra l'inizio della chiamata API
        const startTime = Date.now();
        
        const result = await tasksAPI.create(listId, taskData);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('📥 DEBUG - tasksAPI.create response:', {
          success: result.success,
          duration: duration + 'ms',
          result: result,
          hasData: !!result.data,
          hasTask: !!(result.data && result.data.task),
          taskId: result.data && result.data.task ? result.data.task.id : 'none'
        });
        
        if (result.success) {
          console.log('✅ DEBUG - Task saved successfully');
          
          // Aggiorna con ID reale
          setData(prev => {
            const updateTaskId = (tasks) => 
              tasks.map(task => 
                task.id === tempId 
                  ? { ...task, id: result.data.task.id }
                  : task
              );

            return {
              ...prev,
              lists: prev.lists.map(list => 
                list.id === listId 
                  ? { ...list, tasks: updateTaskId(list.tasks || []) }
                  : list
              ),
              selectedList: prev.selectedList?.id === listId 
                ? { ...prev.selectedList, tasks: updateTaskId(prev.selectedList.tasks || []) }
                : prev.selectedList,
              lastSync: new Date().toISOString(),
              error: null
            };
          });
          
          console.log('✅ Task salvato nel database con ID:', result.data.task.id);
          console.log('📋 ===== TASK CREATION DEBUG END (SUCCESS) =====');
          return { ...newTask, id: result.data.task.id };
        } else {
          throw new Error(result.error || 'Unknown API error');
        }
      } catch (error) {
        console.error('❌ DEBUG - Task save error:', {
          errorMessage: error.message,
          errorName: error.name,
          errorStack: error.stack,
          fullError: error
        });
        
        setData(prev => ({
          ...prev,
          pendingChanges: [...prev.pendingChanges, {
            type: 'createTask',
            listId: listId,
            data: taskData,
            tempId: tempId,
            timestamp: new Date().toISOString()
          }],
          error: 'Task creato localmente - Errore DB: ' + error.message
        }));
        
        console.log('📋 ===== TASK CREATION DEBUG END (ERROR) =====');
      }
    } else {
      console.log('📱 DEBUG - Offline mode or no token:', {
        isOnline: data.isOnline,
        hasToken: !!token
      });
      
      setData(prev => ({
        ...prev,
        pendingChanges: [...prev.pendingChanges, {
          type: 'createTask',
          listId: listId,
          data: taskData,
          tempId: tempId,
          timestamp: new Date().toISOString()
        }]
      }));
      
      console.log('📋 ===== TASK CREATION DEBUG END (OFFLINE) =====');
    }

    return newTask;
  };

  const updateTask = async (listId, taskId, taskData) => {
    console.log('✏️ Updating task:', taskId, 'with data:', taskData);
    
    // Aggiorna subito la UI
    setData(prev => {
      const updateTaskInList = (tasks) => 
        tasks.map(task => 
          task.id === taskId 
            ? { ...task, ...taskData, updatedAt: new Date().toISOString() }
            : task
        );

      const updatedLists = prev.lists.map(list => {
        if (list.id === listId) {
          const updatedTasks = updateTaskInList(list.tasks || []);
          return {
            ...list,
            tasks: updatedTasks,
            incomplete_tasks: updatedTasks.filter(t => !t.completed).length
          };
        }
        return list;
      });

      const updatedSelectedList = prev.selectedList?.id === listId 
        ? {
            ...prev.selectedList,
            tasks: updateTaskInList(prev.selectedList.tasks || []),
            incomplete_tasks: updateTaskInList(prev.selectedList.tasks || []).filter(t => !t.completed).length
          }
        : prev.selectedList;

      return {
        ...prev,
        lists: updatedLists,
        selectedList: updatedSelectedList
      };
    });

    console.log('✅ Task aggiornato nella UI');

    // Prova a salvare nel database
    if (data.isOnline) {
      try {
        console.log('💾 Aggiornando task nel database...');
        const result = await tasksAPI.update(taskId, taskData);
        
        if (result.success) {
          setData(prev => ({
            ...prev,
            lastSync: new Date().toISOString(),
            error: null
          }));
          
          console.log('✅ Task aggiornato nel database');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('❌ Errore aggiornamento task:', error);
        
        setData(prev => ({
          ...prev,
          pendingChanges: [...prev.pendingChanges, {
            type: 'updateTask',
            taskId: taskId,
            data: taskData,
            timestamp: new Date().toISOString()
          }],
          error: 'Modifica task salvata localmente - Sarà sincronizzata quando possibile'
        }));
      }
    } else {
      console.log('📱 Modalità offline - Modifica task salvata localmente');
      setData(prev => ({
        ...prev,
        pendingChanges: [...prev.pendingChanges, {
          type: 'updateTask',
          taskId: taskId,
          data: taskData,
          timestamp: new Date().toISOString()
        }]
      }));
    }
  };

const toggleTask = async (listId, taskId) => {
  console.log('✅ Toggling task:', taskId);
  
  // Trova il task per vedere lo stato attuale
  let currentTask = null;
  data.lists.forEach(list => {
    if (list.id === listId) {
      currentTask = list.tasks?.find(t => t.id === taskId);
    }
  });

  if (!currentTask) {
    console.error('❌ Task non trovato:', taskId);
    return;
  }

  const newCompleted = !currentTask.completed;
  
  // Aggiorna nella UI
  setData(prev => {
    const updatedLists = prev.lists.map(list => {
      if (list.id === listId) {
        const updatedTasks = list.tasks.map(task => {
          if (task.id === taskId) {
            return { ...task, completed: newCompleted };
          }
          return task;
        });
        
        return {
          ...list,
          tasks: updatedTasks,
          incomplete_tasks: updatedTasks.filter(t => !t.completed).length
        };
      }
      return list;
    });

    const updatedSelectedList = prev.selectedList?.id === listId 
      ? {
          ...prev.selectedList,
          tasks: prev.selectedList.tasks.map(task => 
            task.id === taskId ? { ...task, completed: newCompleted } : task
          ),
          incomplete_tasks: prev.selectedList.tasks.filter(t => 
            t.id === taskId ? !newCompleted : !t.completed
          ).length
        }
      : prev.selectedList;

    return {
      ...prev,
      lists: updatedLists,
      selectedList: updatedSelectedList
    };
  });

  // Salva nel database con UPDATE specificando lo stato esatto
  if (data.isOnline) {
    try {
      console.log('💾 Updating task completion in database:', { taskId, completed: newCompleted });
      
      const updateData = {
        completed: newCompleted
      };
      
      // Aggiungi completedAt se viene completato
      if (newCompleted) {
        updateData.completedAt = new Date().toISOString();
      }
      
      const result = await tasksAPI.update(taskId, updateData);
      
      if (result.success) {
        console.log('✅ Task completion updated in database');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento completion nel database:', error);
    }
  }

  console.log('✅ Task toggled successfully');
};

  const deleteTask = async (listId, taskId) => {
    console.log('🗑️ Deleting task:', taskId);
    
    // Aggiorna subito la UI
    setData(prev => {
      const removeTaskFromList = (tasks) => tasks.filter(task => task.id !== taskId);

      const updatedLists = prev.lists.map(list => {
        if (list.id === listId) {
          const updatedTasks = removeTaskFromList(list.tasks || []);
          return {
            ...list,
            tasks: updatedTasks,
            total_tasks: updatedTasks.length,
            incomplete_tasks: updatedTasks.filter(t => !t.completed).length
          };
        }
        return list;
      });

      const updatedSelectedList = prev.selectedList?.id === listId 
        ? {
            ...prev.selectedList,
            tasks: removeTaskFromList(prev.selectedList.tasks || [])
          }
        : prev.selectedList;

      return {
        ...prev,
        lists: updatedLists,
        selectedList: updatedSelectedList
      };
    });

    console.log('✅ Task rimosso dalla UI');

    // Prova a eliminare dal database
    if (data.isOnline) {
      try {
        console.log('💾 Eliminando task dal database...');
        const result = await tasksAPI.delete(taskId);
        
        if (result.success) {
          setData(prev => ({
            ...prev,
            lastSync: new Date().toISOString(),
            error: null
          }));
          
          console.log('✅ Task eliminato dal database');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('❌ Errore eliminazione task:', error);
        
        setData(prev => ({
          ...prev,
          pendingChanges: [...prev.pendingChanges, {
            type: 'deleteTask',
            taskId: taskId,
            timestamp: new Date().toISOString()
          }],
          error: 'Eliminazione task salvata localmente - Sarà sincronizzata quando possibile'
        }));
      }
    } else {
      console.log('📱 Modalità offline - Eliminazione task salvata localmente');
      setData(prev => ({
        ...prev,
        pendingChanges: [...prev.pendingChanges, {
          type: 'deleteTask',
          taskId: taskId,
          timestamp: new Date().toISOString()
        }]
      }));
    }
  };

  // Funzione per sincronizzare modifiche pending
  const syncPendingChanges = async () => {
    if (!data.isOnline || data.pendingChanges.length === 0) {
      return;
    }

    console.log('🔄 Sincronizzando', data.pendingChanges.length, 'modifiche pending...');
    
    let successCount = 0;
    const failedChanges = [];

    for (const change of data.pendingChanges) {
      try {
        switch (change.type) {
          case 'createList':
            await listsAPI.create(change.data);
            successCount++;
            break;
          case 'updateList':
            await listsAPI.update(change.listId, change.data);
            successCount++;
            break;
          case 'deleteList':
            await listsAPI.delete(change.listId);
            successCount++;
            break;
          case 'createTask':
            await tasksAPI.create(change.listId, change.data);
            successCount++;
            break;
          case 'updateTask':
            await tasksAPI.update(change.taskId, change.data);
            successCount++;
            break;
          case 'deleteTask':
            await tasksAPI.delete(change.taskId);
            successCount++;
            break;
        }
      } catch (error) {
        console.error('❌ Errore sync change:', change.type, error);
        failedChanges.push(change);
      }
    }

    setData(prev => ({
      ...prev,
      pendingChanges: failedChanges,
      lastSync: new Date().toISOString(),
      error: successCount > 0 
        ? `${successCount} modifiche sincronizzate${failedChanges.length > 0 ? `, ${failedChanges.length} fallite` : ''}`
        : null
    }));

    console.log(`✅ Sync completato: ${successCount} successi, ${failedChanges.length} fallimenti`);
  };

  // Ritorna tutte le funzioni esistenti + nuove funzionalità
  return {
    data,
    updateData,
    // Funzioni Liste
    createList,
    updateList,
    deleteList,
    loadTasksForList,
    // Funzioni Task
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    // Nuove funzioni Database
    checkApiConnection,
    loadDataFromDatabase,
    syncPendingChanges
  };
};