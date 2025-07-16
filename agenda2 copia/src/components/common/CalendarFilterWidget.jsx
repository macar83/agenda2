import React, { useState } from 'react';
import { Calendar, ChevronDown, Check, Eye, EyeOff, Settings, Edit2 } from 'lucide-react';

export const CalendarFilterWidget = ({ 
  availableCalendars = [], 
  selectedCalendars = [], 
  onToggleCalendar,
  onSelectAll,
  onSelectNone,
  onSetCustomName,
  loading = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [editName, setEditName] = useState('');

  // Debug
  console.log('🔧 CalendarFilterWidget debug:', {
    hasOnToggleCalendar: !!onToggleCalendar,
    hasOnSetCustomName: !!onSetCustomName,
    calendarsCount: availableCalendars.length,
    selectedCount: selectedCalendars.length
  });

  // Funzioni per editing nomi
  const startEditingName = (calendar) => {
    console.log('✏️ Avvio editing per:', calendar.name);
    setEditingCalendar(calendar.id);
    setEditName(calendar.name);
  };

  const saveCustomName = (calendarId) => {
    console.log('💾 Salvataggio nome:', editName.trim());
    
    if (editName.trim() && onSetCustomName) {
      onSetCustomName(calendarId, editName.trim());
    }
    
    setEditingCalendar(null);
    setEditName('');
  };

  const cancelEditing = () => {
    setEditingCalendar(null);
    setEditName('');
  };

  const getCalendarIcon = (calendar) => {
    if (calendar.primary) {
      return <Calendar size={14} className="text-blue-600" />;
    }
    return (
      <div 
        className="w-3 h-3 rounded-full border border-gray-300"
        style={{ backgroundColor: calendar.backgroundColor }}
      />
    );
  };

  const getSelectedCount = () => selectedCalendars.length;
  const isAllSelected = () => availableCalendars.length > 0 && selectedCalendars.length === availableCalendars.length;
  const isNoneSelected = () => selectedCalendars.length === 0;

  if (availableCalendars.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        disabled={loading}
      >
        <Settings size={16} className="text-gray-500" />
        <span className="text-gray-700">
          Calendari ({getSelectedCount()}/{availableCalendars.length})
        </span>
        <ChevronDown 
          size={16} 
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Content */}
          <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar size={16} className="text-blue-500" />
                <span>Seleziona Calendari</span>
              </h4>
              
              {/* Azioni rapide */}
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={() => {
                    onSelectAll?.();
                    setIsOpen(false);
                  }}
                  disabled={isAllSelected()}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    isAllSelected()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Tutti
                </button>
                
                <button
                  onClick={() => {
                    onSelectNone?.();
                    setIsOpen(false);
                  }}
                  disabled={isNoneSelected()}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    isNoneSelected()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Nessuno
                </button>
              </div>
            </div>

            {/* Lista Calendari */}
            <div className="max-h-60 overflow-y-auto">
              {availableCalendars.map((calendar) => {
                const isSelected = selectedCalendars.includes(calendar.id);
                
                return (
                  <div
                    key={calendar.id}
                    className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      {/* Checkbox */}
                      <label className="relative cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            console.log('☑️ Toggle checkbox:', calendar.name, e.target.checked);
                            onToggleCalendar?.(calendar.id);
                          }}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-gray-300 hover:border-blue-400'
                        }`}>
                          {isSelected && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                      </label>

                      {/* Calendar Info */}
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {getCalendarIcon(calendar)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {/* Nome editabile */}
                              {editingCalendar === calendar.id ? (
                                <div className="flex items-center space-x-2 flex-1">
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveCustomName(calendar.id);
                                      if (e.key === 'Escape') cancelEditing();
                                    }}
                                    onBlur={() => saveCustomName(calendar.id)}
                                    className="text-sm font-medium text-gray-900 bg-white border border-blue-300 rounded px-2 py-1 flex-1 min-w-0"
                                    autoFocus
                                  />
                                  <span className="text-xs text-gray-500">↵</span>
                                </div>
                              ) : (
                                <>
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {calendar.name}
                                  </span>
                                  {calendar.primary && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                      Principale
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            
                            {/* Pulsante edit sempre visibile */}
                            {editingCalendar !== calendar.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingName(calendar);
                                }}
                                className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                title="Rinomina calendario"
                              >
                                <Edit2 size={12} className="text-gray-500" />
                              </button>
                            )}
                          </div>
                          
                          {calendar.description && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {calendar.description}
                            </p>
                          )}
                        </div>

                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <Eye size={16} className="text-green-500" />
                          ) : (
                            <EyeOff size={16} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500 text-center">
                {getSelectedCount() === 0 
                  ? 'Nessun calendario selezionato'
                  : `${getSelectedCount()} di ${availableCalendars.length} calendari selezionati`
                }
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};