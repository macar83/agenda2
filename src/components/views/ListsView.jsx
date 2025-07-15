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
    const list = data.lists.find(l => l.id === listId);
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
      console.log('🗑️ Deleting task:', taskId);
      if (data.selectedList && deleteTask) {
        await deleteTask(data.selectedList.id, taskId);
      }
    }
  };

  const activeTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Bassa';
      default: return 'Media';
    }
  };

  const TaskItem = ({ task, isCompleted = false }) => (
    <div className={`p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow group ${
      isCompleted ? 'bg-gray-50' : 'bg-white'
    }`}>
      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => handleToggleTask(task.id)}
          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
        />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`font-medium ${
              task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}>
              {task.title}
            </span>
            {!task.completed && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {getPriorityLabel(task.priority)}
              </span>
            )}
          </div>
          {task.details && (
            <p className={`text-sm mb-2 ${
              task.completed ? 'text-gray-400 line-through' : 'text-gray-600'
            }`}>
              {task.details}
            </p>
          )}
          {task.reminder && (
            <p className={`text-xs ${
              task.completed ? 'text-gray-400' : 'text-orange-600'
            }`}>
              📅 Scadenza: {new Date(task.reminder).toLocaleString('it-IT')}
            </p>
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
          {data.lists.map(list => (
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

        {data.lists.length === 0 && (
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
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: data.selectedList?.color }}
                />
                <h2 className="text-2xl font-bold text-gray-900">{data.selectedList?.name}</h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {tasks.length} task
                </span>
              </div>
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                <span>Nuovo Task</span>
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500 mb-2">Nessun task in questa lista</p>
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Crea il tuo primo task
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {activeTasks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Da Completare ({activeTasks.length})
                    </h3>
                    <div className="space-y-3">
                      {activeTasks.map(task => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )}

                {completedTasks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Completati ({completedTasks.length})
                    </h3>
                    <div className="space-y-3">
                      {completedTasks.map(task => (
                        <TaskItem key={task.id} task={task} isCompleted={true} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Eye className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">Seleziona una lista per vedere i task</p>
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

      {showCreateTask && (
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