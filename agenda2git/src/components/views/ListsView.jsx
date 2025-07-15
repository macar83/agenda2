import React, { useState, useContext } from 'react';
import { Calendar, Plus, Eye, AlertCircle, Trash2, Edit3 } from 'lucide-react';
import AppContext from '../../contexts/AppContext';
import { CreateListModal } from '../lists/CreateListModal';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { EditTaskModal } from '../tasks/EditTaskModal';
import { EditListModal } from '../lists/EditListModal';

export const ListsView = () => {
  const { data, updateData, createList, updateList, deleteList, loadTasksForList, createTask, updateTask, toggleTask, deleteTask } = useContext(AppContext);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingList, setEditingList] = useState(null);

  // CONTROLLO DI SICUREZZA per evitare errori con data.lists
  const lists = Array.isArray(data.lists) ? data.lists : [];
  const tasks = data.selectedList?.tasks || [];

  const handleSelectList = async (list) => {
    console.log('📋 Selecting list:', list.name);
    updateData({ selectedList: list });
    if (loadTasksForList) {
      await loadTasksForList(list.id);
    }
  };

  const handleCreateList = async (listData) => {
    console.log('📝 Creating new list:', listData);
    if (createList) {
      await createList(listData);
    }
    setShowCreateList(false);
  };

  const handleEditList = (list) => {
    console.log('✏️ Opening edit modal for list:', list.id);
    setEditingList(list);
  };

  const handleUpdateList = async (listData) => {
    if (editingList && updateList) {
      console.log('💾 Updating list:', editingList.id);
      await updateList(editingList.id, listData);
      setEditingList(null);
    }
  };

  const handleDeleteList = async (listId) => {
    const list = lists.find(l => l.id === listId);
    if (window.confirm(`Vuoi eliminare la lista "${list?.name}" e tutti i suoi task?`)) {
      console.log('🗑️ Deleting list:', listId);
      if (deleteList) {
        await deleteList(listId);
      }
    }
  };

  const handleCreateTask = async (taskData) => {
    if (data.selectedList && createTask) {
      console.log('📋 Creating task in list:', data.selectedList.id);
      await createTask(data.selectedList.id, taskData);
      setShowCreateTask(false);
    }
  };

  const handleEditTask = (task) => {
    console.log('✏️ Opening edit modal for task:', task.id);
    setEditingTask(task);
  };

  const handleUpdateTask = async (taskData) => {
    if (data.selectedList && editingTask && updateTask) {
      console.log('💾 Updating task:', editingTask.id);
      await updateTask(data.selectedList.id, editingTask.id, taskData);
      setEditingTask(null);
    }
  };

  const handleToggleTask = async (taskId) => {
    if (data.selectedList && toggleTask) {
      console.log('✅ Toggling task:', taskId);
      await toggleTask(data.selectedList.id, taskId);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Vuoi eliminare questo task?')) {
      if (data.selectedList && deleteTask) {
        console.log('🗑️ Deleting task:', taskId);
        await deleteTask(data.selectedList.id, taskId);
      }
    }
  };

  // Componente Task per rendering singolo task
  const TaskItem = ({ task }) => (
    <div className="bg-white p-4 rounded-lg border hover:shadow-sm transition-all group">
      <div className="flex items-start space-x-3">
        <button
          onClick={() => handleToggleTask(task.id)}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-green-400'
          }`}
        >
          {task.completed && <span className="text-xs">✓</span>}
        </button>
        
        <div className="flex-1">
          <h4 className={`font-medium ${
            task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}>
            {task.title}
          </h4>
          {task.details && (
            <p className={`text-sm mt-1 ${
              task.completed ? 'text-gray-400 line-through' : 'text-gray-600'
            }`}>
              {task.details}
            </p>
          )}
          {task.reminder && (
            <p className={`text-xs mt-1 ${
              task.completed ? 'text-gray-400' : 'text-orange-600'
            }`}>
              📅 Scadenza: {new Date(task.reminder).toLocaleString('it-IT')}
            </p>
          )}
          {task.priority && (
            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
              task.priority === 'high' 
                ? 'bg-red-100 text-red-700'
                : task.priority === 'medium'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Bassa'}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleEditTask(task)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Modifica task"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Elimina task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Lista delle liste */}
      <div className="w-80 bg-white border-r p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Le Tue Liste</h2>
          <button
            onClick={() => setShowCreateList(true)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Crea nuova lista"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {lists.map(list => (
            <div
              key={list.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all group ${
                data.selectedList?.id === list.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => handleSelectList(list)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: list.color }}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{list.name}</h3>
                    <p className="text-sm text-gray-500">
                      {list.incomplete_tasks || 0} attivi / {list.total_tasks || 0} totali
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditList(list);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Modifica lista"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Elimina lista"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {lists.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 mb-2">Nessuna lista</p>
            <button
              onClick={() => setShowCreateList(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Crea la tua prima lista
            </button>
          </div>
        )}
      </div>

      {/* Area principale */}
      <div className="flex-1 p-6">
        {data.selectedList ? (
          <div>
            {/* Header lista selezionata */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: data.selectedList.color }}
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{data.selectedList.name}</h2>
                  <p className="text-gray-500">
                    {data.selectedList.incomplete_tasks || 0} task attivi • {data.selectedList.total_tasks || 0} totali
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                <span>Aggiungi Task</span>
              </button>
            </div>

            {/* Progress bar */}
            {(data.selectedList.total_tasks || 0) > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progresso</span>
                  <span>
                    {Math.round(((data.selectedList.total_tasks - data.selectedList.incomplete_tasks) / data.selectedList.total_tasks) * 100)}%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((data.selectedList.total_tasks - data.selectedList.incomplete_tasks) / data.selectedList.total_tasks) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Lista task */}
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500 mb-2">Nessun task in questa lista</p>
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Aggiungi il primo task
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Eye className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Seleziona una lista</h3>
              <p className="text-gray-500 mb-4">Scegli una lista dalla barra laterale per vedere i suoi task</p>
              {lists.length === 0 && (
                <button
                  onClick={() => setShowCreateList(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Oppure crea la tua prima lista
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modali */}
      {showCreateList && (
        <CreateListModal
          onClose={() => setShowCreateList(false)}
          onSubmit={handleCreateList}
        />
      )}

      {showCreateTask && data.selectedList && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleUpdateTask}
        />
      )}

      {editingList && (
        <EditListModal
          list={editingList}
          onClose={() => setEditingList(null)}
          onSubmit={handleUpdateList}
        />
      )}
    </div>
  );
};