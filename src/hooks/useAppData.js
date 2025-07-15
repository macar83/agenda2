import { useState } from 'react';

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
    selectedRssSource: 'techcrunch'
  });

  const updateData = (newData) => {
    console.log('📊 Updating data:', newData);
    setData(prev => ({ ...prev, ...newData }));
  };

  const createList = async (listData) => {
    console.log('📝 Creating list:', listData);
    const newList = {
      id: Date.now(), // ID temporaneo basato su timestamp
      name: listData.name,
      color: listData.color,
      tasks: [],
      incomplete_tasks: 0,
      total_tasks: 0
    };

    setData(prev => ({
      ...prev,
      lists: [...prev.lists, newList]
    }));

    console.log('✅ List created successfully');
    return newList;
  };

  const updateList = async (listId, listData) => {
    console.log('✏️ Updating list:', listId, 'with data:', listData);
    
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list => 
        list.id === listId 
          ? { ...list, name: listData.name, color: listData.color }
          : list
      ),
      selectedList: prev.selectedList?.id === listId 
        ? { ...prev.selectedList, name: listData.name, color: listData.color }
        : prev.selectedList
    }));

    console.log('✅ List updated successfully');
  };

  const deleteList = async (listId) => {
    console.log('🗑️ Deleting list:', listId);
    
    setData(prev => ({
      ...prev,
      lists: prev.lists.filter(list => list.id !== listId),
      selectedList: prev.selectedList?.id === listId ? null : prev.selectedList
    }));

    console.log('✅ List deleted successfully');
  };

  const loadTasksForList = async (listId) => {
    console.log('📋 Loading tasks for list:', listId);
    const list = data.lists.find(l => l.id === listId);
    if (list) {
      setData(prev => ({
        ...prev,
        selectedList: { ...list }
      }));
    }
  };

  const createTask = async (listId, taskData) => {
    console.log('📋 Creating task:', taskData, 'in list:', listId);
    
    const newTask = {
      id: Date.now(), // ID temporaneo
      title: taskData.title,
      details: taskData.details || '',
      completed: false,
      priority: taskData.priority || 'medium',
      reminder: taskData.reminder,
      createdAt: new Date().toISOString(),
      comment_count: 0
    };

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

      // Aggiorna anche selectedList se è la stessa lista
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

    console.log('✅ Task created successfully');
    return newTask;
  };

  const updateTask = async (listId, taskId, taskData) => {
    console.log('✏️ Updating task:', taskId, 'with data:', taskData);
    
    setData(prev => {
      const updatedLists = prev.lists.map(list => {
        if (list.id === listId) {
          const updatedTasks = list.tasks.map(task => 
            task.id === taskId ? { ...task, ...taskData } : task
          );
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
              task.id === taskId ? { ...task, ...taskData } : task
            )
          }
        : prev.selectedList;

      return {
        ...prev,
        lists: updatedLists,
        selectedList: updatedSelectedList
      };
    });

    console.log('✅ Task updated successfully');
  };

  const toggleTask = async (listId, taskId) => {
    console.log('✅ Toggling task:', taskId);
    
    setData(prev => {
      const updatedLists = prev.lists.map(list => {
        if (list.id === listId) {
          const updatedTasks = list.tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, completed: !task.completed };
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
              task.id === taskId ? { ...task, completed: !task.completed } : task
            ),
            incomplete_tasks: prev.selectedList.tasks.filter(t => 
              t.id === taskId ? !t.completed : !t.completed
            ).length
          }
        : prev.selectedList;

      return {
        ...prev,
        lists: updatedLists,
        selectedList: updatedSelectedList
      };
    });

    console.log('✅ Task toggled successfully');
  };

  const deleteTask = async (listId, taskId) => {
    console.log('🗑️ Deleting task:', taskId);
    
    setData(prev => {
      const updatedLists = prev.lists.map(list => {
        if (list.id === listId) {
          const updatedTasks = list.tasks.filter(task => task.id !== taskId);
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
            tasks: prev.selectedList.tasks.filter(task => task.id !== taskId),
            total_tasks: prev.selectedList.tasks.filter(task => task.id !== taskId).length,
            incomplete_tasks: prev.selectedList.tasks.filter(task => task.id !== taskId && !task.completed).length
          }
        : prev.selectedList;

      return {
        ...prev,
        lists: updatedLists,
        selectedList: updatedSelectedList
      };
    });

    console.log('✅ Task deleted successfully');
  };

  const addComment = async (listId, taskId, commentText) => {
    console.log('💬 Adding comment to task:', taskId);
    
    const newComment = {
      id: Date.now(),
      text: commentText,
      author_name: data.user.name,
      created_at: new Date().toISOString()
    };

    setData(prev => {
      const updatedLists = prev.lists.map(list => {
        if (list.id === listId) {
          const updatedTasks = list.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                comments: [...(task.comments || []), newComment],
                comment_count: (task.comment_count || 0) + 1
              };
            }
            return task;
          });
          return { ...list, tasks: updatedTasks };
        }
        return list;
      });

      const updatedSelectedList = prev.selectedList?.id === listId 
        ? {
            ...prev.selectedList,
            tasks: prev.selectedList.tasks.map(task => 
              task.id === taskId 
                ? {
                    ...task,
                    comments: [...(task.comments || []), newComment],
                    comment_count: (task.comment_count || 0) + 1
                  }
                : task
            )
          }
        : prev.selectedList;

      return {
        ...prev,
        lists: updatedLists,
        selectedList: updatedSelectedList
      };
    });

    console.log('✅ Comment added successfully');
    return newComment;
  };

  const deleteComment = async (listId, taskId, commentId) => {
    console.log('🗑️ Deleting comment:', commentId);
    
    setData(prev => {
      const updatedLists = prev.lists.map(list => {
        if (list.id === listId) {
          const updatedTasks = list.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                comments: (task.comments || []).filter(comment => comment.id !== commentId),
                comment_count: Math.max(0, (task.comment_count || 0) - 1)
              };
            }
            return task;
          });
          return { ...list, tasks: updatedTasks };
        }
        return list;
      });

      const updatedSelectedList = prev.selectedList?.id === listId 
        ? {
            ...prev.selectedList,
            tasks: prev.selectedList.tasks.map(task => 
              task.id === taskId 
                ? {
                    ...task,
                    comments: (task.comments || []).filter(comment => comment.id !== commentId),
                    comment_count: Math.max(0, (task.comment_count || 0) - 1)
                  }
                : task
            )
          }
        : prev.selectedList;

      return {
        ...prev,
        lists: updatedLists,
        selectedList: updatedSelectedList
      };
    });

    console.log('✅ Comment deleted successfully');
  };

  const login = async (credentials) => {
    try {
      console.log('🚪 Logging in user:', credentials.email);
      setData(prev => ({
        ...prev,
        user: { name: credentials.email.split('@')[0] },
        isAuthenticated: true,
        currentView: 'overview'
      }));
      return { success: true };
    } catch (error) {
      console.error('❌ Login failed:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Registering user:', userData.name);
      setData(prev => ({
        ...prev,
        user: { name: userData.name },
        isAuthenticated: true,
        currentView: 'overview'
      }));
      return { success: true };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = () => {
    console.log('🚪 Logging out user');
    setData(prev => ({
      ...prev,
      user: null,
      isAuthenticated: false,
      lists: [],
      selectedList: null,
      currentView: 'overview'
    }));
  };

  return {
    data,
    updateData,
    createList,
    updateList,
    deleteList,
    loadTasksForList,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    addComment,
    deleteComment,
    login,
    register,
    logout
  };
};