import React, { useState } from 'react';
import { X, Clock, Flag, Save } from 'lucide-react';

export const EditTaskModal = ({ task, onClose, onSubmit }) => {
  const [title, setTitle] = useState(task.title || '');
  const [details, setDetails] = useState(task.details || '');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [reminder, setReminder] = useState(
    task.reminder ? new Date(task.reminder).toISOString().slice(0, 16) : ''
  );

  const priorities = [
    { value: 'low', label: 'Bassa', color: 'text-green-600', icon: '🟢' },
    { value: 'medium', label: 'Media', color: 'text-yellow-600', icon: '🟡' },
    { value: 'high', label: 'Alta', color: 'text-red-600', icon: '🔴' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      const updatedTaskData = {
        title: title.trim(),
        details: details.trim(),
        priority,
        reminder: reminder || null,
        completed: task.completed // Mantieni lo stato di completamento
      };
      console.log('✏️ Updating task:', updatedTaskData);
      onSubmit(updatedTaskData);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Save size={20} className="text-blue-600" />
            <span>Modifica Task</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titolo Task *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Cosa devi fare?"
              autoFocus
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dettagli (opzionale)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
              placeholder="Aggiungi dettagli..."
              rows="3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Flag size={16} className="inline mr-1" />
              Priorità
            </label>
            <div className="grid grid-cols-3 gap-2">
              {priorities.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex items-center justify-center p-2 border rounded-lg transition-all ${
                    priority === p.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="mr-1">{p.icon}</span>
                  <span className="text-sm">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock size={16} className="inline mr-1" />
              Scadenza (opzionale)
            </label>
            <input
              type="datetime-local"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              min={new Date().toISOString().slice(0, 16)}
            />
            {reminder && (
              <button
                type="button"
                onClick={() => setReminder('')}
                className="mt-1 text-xs text-red-600 hover:text-red-800"
              >
                Rimuovi scadenza
              </button>
            )}
          </div>

          {/* Mostra stato del task */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Stato:</strong> {task.completed ? '✅ Completato' : '⏳ Da completare'}
            </p>
            {task.createdAt && (
              <p className="text-xs text-gray-500 mt-1">
                Creato: {new Date(task.createdAt).toLocaleString('it-IT')}
              </p>
            )}
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Save size={16} />
              <span>Salva Modifiche</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};