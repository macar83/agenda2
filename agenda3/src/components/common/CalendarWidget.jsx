import React from 'react';
import { Calendar, Clock, MapPin, Users, ExternalLink, RefreshCw, LogIn, AlertCircle } from 'lucide-react';
import { CalendarFilterWidget } from './CalendarFilterWidget';

export const CalendarWidget = ({ 
  events = [], 
  loading = false, 
  error = null, 
  isAuthenticated = false, 
  onSignIn, 
  onRefresh,
  // Props per calendari multipli
  availableCalendars = [],
  selectedCalendars = [],
  loadingCalendars = false,
  onToggleCalendar,
  onSelectAllCalendars,
  onSelectNoneCalendars,
  onSetCustomCalendarName
}) => {
  
  // Debug
  console.log('🔧 CalendarWidget debug:', {
    hasOnToggleCalendar: !!onToggleCalendar,
    hasOnSetCustomName: !!onSetCustomCalendarName,
    calendarsCount: availableCalendars.length,
    selectedCount: selectedCalendars.length,
    CalendarFilterWidget: typeof CalendarFilterWidget
  });
  
  const formatEventTime = (start, end, allDay) => {
    if (allDay) {
      return 'Tutto il giorno';
    }
    
    const startTime = new Date(start).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const endTime = new Date(end).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${startTime} - ${endTime}`;
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Oggi';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Domani';
    } else {
      return date.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });
    }
  };

  const getEventStatusColor = (event) => {
    const now = new Date();
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    if (now >= eventStart && now <= eventEnd) {
      return 'bg-green-100 border-green-300 text-green-800';
    } else if (eventStart > now) {
      return 'bg-blue-100 border-blue-300 text-blue-800';
    } else {
      return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const getCalendarIndicator = (event) => {
    if (!event.calendarColor) return null;
    
    return (
      <div 
        className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
        style={{ backgroundColor: event.calendarColor }}
        title={`Calendario: ${event.calendarName}`}
      />
    );
  };

  // Non autenticato
  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Calendar size={20} className="text-blue-500" />
            <span>Calendario Google</span>
          </h3>
        </div>
        
        <div className="text-center py-8">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 mb-4">Accedi a Google Calendar per vedere i tuoi impegni della settimana</p>
          <button
            onClick={() => {
              console.log('📅 Click su pulsante Connetti Google Calendar');
              console.log('📅 onSignIn function:', typeof onSignIn);
              onSignIn();
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <LogIn size={16} />
            <span>Connetti Google Calendar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Header con filtri */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Calendar size={20} className="text-blue-500" />
          <span>Calendario Settimana</span>
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Filtro calendari */}
          {availableCalendars.length > 0 && (
            <CalendarFilterWidget
              availableCalendars={availableCalendars}
              selectedCalendars={selectedCalendars}
              onToggleCalendar={onToggleCalendar}
              onSelectAll={onSelectAllCalendars}
              onSelectNone={onSelectNoneCalendars}
              onSetCustomName={onSetCustomCalendarName}
              loading={loadingCalendars}
            />
          )}
          
          {/* Pulsante refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`p-2 rounded-lg transition-colors ${
              loading 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Aggiorna eventi"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Statistiche calendari */}
      {isAuthenticated && availableCalendars.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-2">Calendari disponibili:</div>
          <div className="flex flex-wrap gap-2">
            {availableCalendars.map(calendar => {
              const isSelected = selectedCalendars.includes(calendar.id);
              const eventCount = events.filter(e => e.calendarId === calendar.id).length;
              
              return (
                <div
                  key={calendar.id}
                  className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                    isSelected 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: calendar.backgroundColor }}
                  />
                  <span className="font-medium">{calendar.name}</span>
                  {isSelected && eventCount > 0 && (
                    <span className="bg-blue-200 text-blue-800 px-1 rounded">
                      {eventCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Caricamento eventi...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={32} />
          <p className="text-red-600 text-sm mb-2 font-medium">Errore nel caricamento</p>
          <p className="text-gray-500 text-xs mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            Riprova
          </button>
        </div>
      ) : selectedCalendars.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 mb-2">Nessun calendario selezionato</p>
          <p className="text-gray-400 text-sm">Seleziona almeno un calendario per vedere gli eventi</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 mb-2">Nessun evento in programma</p>
          <p className="text-gray-400 text-sm">La tua settimana è libera!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {events.map((event) => (
            <div 
              key={`${event.calendarId}-${event.id}`}
              className={`border rounded-lg p-4 transition-all hover:shadow-sm ${getEventStatusColor(event)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-2 flex-1 min-w-0">
                  {getCalendarIndicator(event)}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight pr-2">
                      {event.title}
                    </h4>
                    
                    {event.calendarName && event.calendarName !== 'primary' && (
                      <p className="text-xs text-gray-500 mt-1">
                        📅 {event.calendarName}
                      </p>
                    )}
                  </div>
                </div>
                
                {event.htmlLink && (
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                    title="Apri in Google Calendar"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs">
                  <Calendar size={12} />
                  <span>{formatEventDate(event.start)}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-xs">
                  <Clock size={12} />
                  <span>{formatEventTime(event.start, event.end, event.allDay)}</span>
                </div>

                {event.location && (
                  <div className="flex items-center space-x-2 text-xs">
                    <MapPin size={12} />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                {event.attendees && event.attendees.length > 0 && (
                  <div className="flex items-center space-x-2 text-xs">
                    <Users size={12} />
                    <span>{event.attendees.length} partecipanti</span>
                  </div>
                )}
              </div>

              {event.description && (
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer con info sincronizzazione */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            📅 Sincronizzazione automatica ogni 10 minuti
          </div>
          {events.length > 0 && (
            <div>
              {events.length} eventi da {selectedCalendars.length} calendari
            </div>
          )}
        </div>
      </div>
    </div>
  );
};