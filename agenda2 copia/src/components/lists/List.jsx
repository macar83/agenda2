import React from 'react';
import { Trash2 } from 'lucide-react';

// List Component
export const List = ({ list, onSelect, onDelete, isSelected }) => {
  return (
    <div 
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={() => onSelect(list)}
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
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(list.id);
          }}
          className="p-1 text-gray-400 hover:text-red-600"
          title="Elimina lista"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};