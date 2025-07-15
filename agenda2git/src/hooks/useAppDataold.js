import { useState, useEffect } from 'react';
import { listsAPI, tasksAPI, userAPI, apiUtils } from '../services/api';

export const useAppData = () => {
  const [data, setData] = useState({
    isAuthenticated: apiUtils.isAuthenticated(),
    currentView: 'overview',
    lists: [],
    selectedList: null,
    user: apiUtils.getCurrentUser() || { name: 'Guest User' },
    error: null,
    isLoading: false,
    theme: 'light',
    soundEnabled: true,
    showSettings: false,
    selectedRssSource: 'techcrunch'
  });

  // Carica dati iniziali se autenticato
  useEffect(() => {
    if (data.isAuthenticated) {
      loadInitialData();
    }
  }, [data.isAuthenticated]);

  // Carica tutti i dati dell'utente
  const loadInitialData = async () => {
    console.log('📊 Caricamento dati utente...');
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Carica liste con task
      const lists = await listsAPI.getAll();
      
      // Carica impostazioni utente
      let userSettings = {};
      try {
        userSettings = await userAPI.getSettings();
      } catch (settingsError) {
        console.warn('⚠️ Impossibile caricare impostazioni:', settingsError);
      }

      setData(prev => ({
        ...prev,
        lists: lists || [],
        theme: userSettings.theme || prev.theme,
        soundEnabled: userSettings.soundEnabled !== undefined ? userSettings.soundEnabled : prev.soundEnabled,
        selectedRssSource: userSettings.selectedRssSource || prev.selectedRssSource,
        isLoading: false
      }));

      console.log('✅ Dati caricati:', { 
        listsCount: lists?.length || 0,
        settings: userSettings 
      });

    } catch (error) {
      console.error('❌ Errore caricamento dati:', error);
      setData(prev => ({
        ...prev,
        error: apiUtils.formatError(error),
        isLoading: false
      }));
    }
  };

  // Aggiorna dati locali
  const updateData = async (newData) => {
    console.log('📊 Aggiornamento dati:', newData);
    
    // Aggiorna stato locale immediatamente
    setData(prev => ({ ...prev, ...newData }));

    // Se sono impostazioni persistenti, salva nel backend
    const persistentSettings = ['theme', 'soundEnabled', 'selectedRssSource'];
    const settingsToSave = {};
    let hasSettingsToSave = false;

    persistentSettings.forEach(key => {
      if (newData.hasOwnProperty(key)) {
        settingsToSave[key] = newData[key];
        hasSettingsToSave = true;
      }
    });

    if (hasSettingsToSave && data.isAuthenticated) {
      try {
        await userAPI.updateSettings(settingsToSave);
        console.log('✅ Impostazioni salvate nel backend');
      } catch (error) {
        console.error('❌ Errore salvataggio impostazioni:', error);
      }
    }
  };

  // Crea nuova lista
  const createList = async (listData) => {
    console.log('📝 Creazione lista:', listData);
    
    if (!data.isAuthenticated) {
      console.error('❌ Utente non autenticato');
      return null;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const newList = await listsAPI.create({
        name: listData.name,
        color: listData.color,
        description: listData.description || ''
      });

      // Aggiorna lista locale
      setData(prev => ({
        ...prev,
        lists: [...prev.lists, {
          ...newList,
          tasks: [],
          incomplete_tasks: 0,
          total_tasks: 0
        }],
        isLoading: false
      }));

      console.log('✅ Lista creata:', newList);
      return newList;

    } catch (error) {
      console.error('❌ Errore creazione lista:', error);
      setData(prev => ({
        ...prev,
        error: apiUtils.formatError(error),
        isLoading: false
      }));
      return null;
    }
  };

  // Aggiorna lista esistente
  const updateList = async (listId, listData) => {
    console.log('✏️ Aggiornamento lista:', listId, listData);
    
    if (!data.isAuthenticated) {
      console.error('❌ Utente non autenticato');
      return null;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const updatedList = await listsAPI.update(listId, {
        name: listData.name,
        color: listData.color,
        description: listData.description || ''
      });

      // Aggiorna stato locale
      setData(prev => ({
        ...prev,
        lists: prev.lists.map(list => 
          list.id === listId 
            ? { ...list, ...updatedList }
            : list
        ),
        selectedList: prev.selectedList?.id === listId 
          ? { ...prev.selectedList, ...updatedList }
          : prev.selectedList,
        isLoading: false
      }));

      console.log('✅ Lista aggiornata:', updatedList);
      return updatedList;

    } catch (error) {
      console.error('❌ Errore aggiornamento lista:', error);
      setData(prev => ({
        ...prev,
        error: apiUtils.formatError(error),
        isLoading: false
      }));
      return null;
    }
  };

  // Elimina lista
  const deleteList = async (listId) => {
    console.log('🗑️ Eliminazione lista:', listId);
    
    if (!data.isAuthenticated) {
      console.error('❌ Utente non autenticato');
      return false;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      await listsAPI.delete(listId);

      // Aggiorna stato locale
      setData(prev => ({
        ...prev,
        lists: prev.lists.filter(list => list.id !== listId),
        selectedList: prev.selectedList?.id === listId ? null : prev.selectedList,
        isLoading: false
      }));

      console.log('✅ Lista eliminata');
      return true;

    } catch (error) {
      console.error('❌ Errore eliminazione lista:', error);
      setData(prev => ({
        ...prev,
        error: apiUtils.formatError(error),
        isLoading: false
      }));
      return false;
    }
  };

  // Crea nuovo task
  const createTask = async (taskData) => {
    console.log('📝 Creazione task:', taskData);
    
    if (!data.isAuthenticated) {
      console.error('❌ Utente non autenticato');
      return null;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const newTask = await tasksAPI.create({
        listId: taskData.listId,
        title: taskData.title,
        details: taskData.details || '',
        priority: taskData.priority || 'medium',
        reminder: taskData.reminder || null,
        dueDate: taskData.dueDate || null
      });

      // Aggiorna liste locali
      setData(prev => ({
        ...prev,
        lists: prev.lists.map(list => {
          if (list.id === taskData.listId) {
            return {
              ...list,
              tasks: [...(list.tasks || []), newTask],
              total_tasks: (list.total_tasks || 0) + 1,
              incomplete_tasks: (list.incomplete_tasks || 0) + 1
            };
          }
          return list;
        }),
        selectedList: prev.selectedList?.id === taskData.listId
          ? {
              ...prev.selectedList,
              tasks: [...(prev.selectedList.tasks || []), newTask],
              total_tasks: (prev.selectedList.total_tasks || 0) + 1,
              incomplete_tasks: (prev.selectedList.incomplete_tasks || 0) + 1
            }
          : prev.selectedList,
        isLoading: false
      }));

      console.log('✅ Task creato:', newTask);
      return newTask;

    } catch (error) {
      console.error('❌ Errore creazione task:', error);
      setData(prev => ({
        ...prev,
        error: apiUtils.formatError(error),
        isLoading: false
      }));
      return null;
    }
  };

  // Aggiorna task
  const updateTask = async (taskId, taskData) => {
    console.log('✏️ Aggiornamento task:', taskId, taskData);
    
    if (!data.isAuthenticated) {
      console.error('❌ Utente non autenticato');
      return null;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const updatedTask = await tasksAPI.update(taskId, taskData);

      // Aggiorna stato locale
      setData(prev => {
        const updateTaskInList = (list) => ({
          ...list,
          tasks: list.tasks?.map(task => 
            task.id === taskId ? updatedTask : task
          ) || []
        });

        return {
          ...prev,
          lists: prev.lists.map(updateTaskInList),
          selectedList: prev.selectedList ? updateTaskInList(prev.selectedList) : null,
          isLoading: false
        };
      });

      console.log('✅ Task aggiornato:', updatedTask);
      return updatedTask;

    } catch (error) {
      console.error('❌ Errore aggiornamento task:', error);
      setData(prev => ({
        ...prev,
        error: apiUtils.formatError(error),
        isLoading: false
      }));
      return null;
    }
  };

  // Elimina task
  const deleteTask = async (taskId) => {
    console.log('🗑️ Eliminazione task:', taskId);
    
    if (!data.isAuthenticated) {
      console.error('❌ Utente non autenticato');
      return false;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      await tasksAPI.delete(taskId);

      // Trova il task per aggiornare i contatori
      let deletedTask = null;
      data.lists.forEach(list => {
        const task = list.tasks?.find(t => t.id === taskId);
        if (task) deletedTask = task;
      });

      // Aggiorna stato locale
      setData(prev => {
        const removeTaskFromList = (list) => {
          const hasTask = list.tasks?.some(task => task.id === taskId);
          if (!hasTask) return list;

          return {
            ...list,
            tasks: list.tasks.filter(task => task.id !== taskId),
            total_tasks: Math.max(0, (list.total_tasks || 0) - 1),
            incomplete_tasks: deletedTask && !deletedTask.completed 
              ? Math.max(0, (list.incomplete_tasks || 0) - 1)
              : list.incomplete_tasks
          };
        };

        return {
          ...prev,
          lists: prev.lists.map(removeTaskFromList),
          selectedList: prev.selectedList ? removeTaskFromList(prev.selectedList) : null,
          isLoading: false
        };
      });

      console.log('✅ Task eliminato');
      return true;

    } catch (error) {
      console.error('❌ Errore eliminazione task:', error);
      setData(prev => ({
        ...prev,
        error: apiUtils.formatError(error),
        isLoading: false
      }));
      return false;
    }
  };

  // Toggle completamento task
  const toggleTaskComplete = async (taskId) => {
    console.log('✅ Toggle completamento task:', taskId);
    
    if (!data.isAuthenticated) {
      console.error('❌ Utente non autenticato');
      return null;
    }

    try {
      const updatedTask = await tasksAPI.toggleComplete(taskId);

      // Aggiorna stato locale
      setData(prev => {
        const updateTaskInList = (list) => {
          const hasTask = list.tasks?.some(task => task.id === taskId);
          if (!hasTask) return list;

          const oldTask = list.tasks.find(task => task.id === taskId);
          const wasCompleted = oldTask?.completed;
          const isNowCompleted = updatedTask.completed;

          let incompleteTasks = list.incomplete_tasks || 0;
          
          if (wasCompleted && !isNowCompleted) {
            // Da completato a non completato
            incompleteTasks += 1;
          } else if (!wasCompleted && isNowCompleted) {
            // Da non completato a completato
            incompleteTasks = Math.max(0, incompleteTasks - 1);
          }

          return {
            ...list,
            tasks: list.tasks.map(task => 
              task.id === taskId ? updatedTask : task
            ),
            incomplete_tasks: incompleteTasks
          };
        };

        return {
          ...prev,
          lists: prev.lists.map(updateTaskInList),
          selectedList: prev.selectedList ? updateTaskInList(prev.selectedList) : null
        };
      });

      console.log('✅ Task completamento aggiornato:', updatedTask);
      return updatedTask;

    } catch (error) {
      console.error('❌ Errore toggle completamento:', error);
      setData(prev => ({
        ...prev,
        error: apiUtils.formatError(error)
      }));
      return null;
    }
  };

  // Carica lista dettagliata con task
  const loadListDetails = async (listId) => {
    console.log('📋 Caricamento dettagli lista:', listId);
    
    if (!data.isAuthenticated) {
      console.error('❌ Utente non autenticato');
      return null;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const listDetails = await listsAPI.getById(listId);

      setData(prev => ({
        ...prev,
        selectedList: listDetails,
        // Aggiorna anche la lista nell'array principale se presente
        lists: prev.lists.map(list => 
          list.id === listId 
            ? { ...list, ...listDetails, tasks: listDetails.tasks }
            : list
        ),
        isLoading: false
      }));

      console.log('✅ Dettagli lista caricati:', listDetails);
      return listDetails;

    } catch (error) {
      console.error('❌ Errore caricamento dettagli lista:', error);
      setData(prev => ({
        ...prev,
        error: apiUtils.formatError(error),
        isLoading: false
      }));
      return null;
    }
  };

  // Aggiorna stato di autenticazione
  const setAuthentication = (isAuth, user = null) => {
    setData(prev => ({
      ...prev,
      isAuthenticated: isAuth,
      user: user || prev.user,
      lists: isAuth ? prev.lists : [],
      selectedList: isAuth ? prev.selectedList : null
    }));

    if (!isAuth) {
      // Reset dati quando utente si disconnette
      localStorage.removeItem('authToken');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
    }
  };

  // Refresh completo dei dati
  const refreshData = async () => {
    console.log('🔄 Refresh completo dati');
    
    if (data.isAuthenticated) {
      await loadInitialData();
    }
  };

  // Gestione errori
  const clearError = () => {
    setData(prev => ({ ...prev, error: null }));
  };

  // Statistiche calcolate
  const getStats = () => {
    const totalTasks = data.lists.reduce((sum, list) => sum + (list.total_tasks || 0), 0);
    const incompleteTasks = data.lists.reduce((sum, list) => sum + (list.incomplete_tasks || 0), 0);
    const completedTasks = totalTasks - incompleteTasks;
    
    // Task in scadenza oggi
    const today = new Date().toDateString();
    const tasksToday = data.lists.reduce((count, list) => {
      if (!list.tasks) return count;
      return count + list.tasks.filter(task => 
        !task.completed && 
        task.reminder && 
        new Date(task.reminder).toDateString() === today
      ).length;
    }, 0);

    return {
      totalLists: data.lists.length,
      totalTasks,
      completedTasks,
      incompleteTasks,
      tasksToday,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  };

  return {
    // Dati
    data,
    stats: getStats(),
    
    // Azioni generali
    updateData,
    refreshData,
    clearError,
    setAuthentication,
    
    // Azioni liste
    createList,
    updateList,
    deleteList,
    loadListDetails,
    
    // Azioni task
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    
    // Utility
    isLoading: data.isLoading,
    error: data.error,
    isAuthenticated: data.isAuthenticated
  };
};