import React, { useState } from 'react';
import { X, Edit3, Save } from 'lucide-react';

export const EditListModal = ({ list, onClose, onSubmit }) => {
  const [name, setName] = useState(list.name || '');
  const [color, setColor] = useState(list.color || '#3B82F6');
  
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#6B7280', '#F97316', '#E11D48', '#7C2D12'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      const updatedListData = {
        name: name.trim(),
        color,
        // Mantieni tutti gli altri dati della lista
        id: list.id,
        tasks: list.tasks,
        total_tasks: list.total_tasks,
        incomplete_tasks: list.incomplete_tasks
      };
      console.log('✏️ Updating list:', updatedListData);
      onSubmit(updatedListData);
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
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Edit3 size={20} className="text-blue-600" />
            <span>Modifica Lista</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Lista</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Inserisci nome lista..."
              autoFocus
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colore</label>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c ? 'border-gray-800 ring-2 ring-gray-300' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Seleziona colore ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Informazioni sulla lista */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              <strong>Task totali:</strong> {list.total_tasks || 0}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Task attivi:</strong> {list.incomplete_tasks || 0}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Task completati:</strong> {(list.total_tasks || 0) - (list.incomplete_tasks || 0)}
            </p>
          </div>

          {/* Preview del colore */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Anteprima:</p>
            <div className="flex items-center space-x-3 p-2 bg-white border rounded">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-gray-900">{name || 'Nome lista'}</span>
            </div>
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
              disabled={!name.trim()}
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