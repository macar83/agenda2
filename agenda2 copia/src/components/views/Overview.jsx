import React, { useContext } from 'react';
import { Calendar, BarChart3, Clock, AlertCircle, ArrowRight, ExternalLink, Rss, Mail } from 'lucide-react';
import AppContext from '../../contexts/AppContext';
import { useNewsRSS } from '../../hooks/useNewsRSS';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';
import { useGmail } from '../../hooks/useGmail';
import { RSSSourceSelector } from '../common/RSSSourceSelector';
import { CalendarWidget } from '../common/CalendarWidget';
import { GmailWidget } from '../common/GmailWidget';

export const Overview = () => {
  const { data, updateData } = useContext(AppContext);
  const { news, loading: newsLoading, error: newsError, sources } = useNewsRSS(data.selectedRssSource);
  
  // Hook Google Calendar con calendari multipli
  const { 
    events, 
    loading: calendarLoading, 
    error: calendarError, 
    isAuthenticated: isCalendarAuthenticated,
    signIn: signInCalendar,
    refreshEvents,
    getTodayEvents,
    getUpcomingEvents,
    availableCalendars,
    selectedCalendars,
    loadingCalendars,
    toggleCalendar,
    selectAllCalendars,
    selectNoneCalendars,
    setCustomCalendarName
  } = useGoogleCalendar();

  // Hook Gmail
  const {
    emails,
    loading: gmailLoading,
    error: gmailError,
    isAuthenticated: isGmailAuthenticated,
    signIn: signInGmail,
    fetchRecentEmails,
    formatEmailDate,
    getUnreadCount,
    markAsRead,      // 🆕
    archiveEmail,    // 🆕
    labelColors      // 🆕
  } = useGmail();

  // 🔧 DEBUG: Verifica che le funzioni siano disponibili
  console.log('📧 Gmail functions debug:', {
    hasMarkAsRead: !!markAsRead,
    hasArchiveEmail: !!archiveEmail,
    hasLabelColors: !!labelColors,
    labelColorsKeys: Object.keys(labelColors || {}).length
  });

  // Controllo di sicurezza robusto per evitare errori con data.lists
  console.log('🔍 Overview Debug - data object:', data);
  console.log('🔍 Overview Debug - data.lists:', data.lists, 'type:', typeof data.lists);
  
  const lists = Array.isArray(data.lists) ? data.lists : [];
  
  console.log('🔍 Overview Debug - lists after check:', lists, 'isArray:', Array.isArray(lists));

  const totalTasks = lists.reduce((sum, list) => sum + (list.total_tasks || 0), 0);
  const incompleteTasks = lists.reduce((sum, list) => sum + (list.incomplete_tasks || 0), 0);
  const completedTasks = totalTasks - incompleteTasks;

  // Calcola task in scadenza oggi
  const tasksToday = lists.reduce((count, list) => {
    if (list.tasks) {
      return count + list.tasks.filter(task => 
        !task.completed && task.reminder && new Date(task.reminder).toDateString() === new Date().toDateString()
      ).length;
    }
    return count;
  }, 0);

  // Calcola eventi di oggi dal calendario (con supporto multi-calendario)
  const todayEvents = getTodayEvents();
  const upcomingEvents = getUpcomingEvents();

  const handleGoToLists = () => {
    console.log('📋 Going to Lists view');
    updateData({ currentView: 'lists' });
  };

  const handleGoToStats = () => {
    console.log('📊 Going to Stats view');
    updateData({ currentView: 'stats' });
  };

  const handleRssSourceChange = (sourceId) => {
    console.log('📰 Changing RSS source to:', sourceId);
    updateData({ selectedRssSource: sourceId });
  };

  // Gestione click su liste  
  const handleListClick = (list) => {
    console.log('📋 Clicking on list:', list.name);
    updateData({ 
      currentView: 'lists',
      selectedList: list 
    });
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Data non valida';
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Panoramica</h2>
      
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Liste Totali</p>
              <p className="text-2xl font-bold text-gray-900">{lists.length}</p>
            </div>
            <Calendar className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Task Totali</p>
              <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
            </div>
            <BarChart3 className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completati</p>
              <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
            </div>
            <BarChart3 className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Email Non Lette</p>
              <p className="text-2xl font-bold text-gray-900">{getUnreadCount()}</p>
              {isGmailAuthenticated && (
                <p className="text-xs text-gray-400 mt-1">
                  su {emails.length} recenti
                </p>
              )}
            </div>
            <Mail className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {/* Contenuto principale con layout a griglia - 3 colonne */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Quick Lists */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Calendar size={20} className="text-blue-500" />
            <span>Le Tue Liste</span>
          </h3>
          
          {lists.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 mb-2">Nessuna lista creata ancora.</p>
              <button
                onClick={handleGoToLists}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Crea la tua prima lista!
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {lists.slice(0, 3).map(list => (
                <button
                  key={list.id}
                  onClick={() => handleListClick(list)}
                  className="w-full text-left border rounded-lg p-4 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: list.color }}
                    />
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {list.name}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-500">
                    {list.incomplete_tasks || 0} attivi / {list.total_tasks || 0} totali
                  </p>
                  {(list.total_tasks || 0) > 0 && (
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(((list.total_tasks || 0) - (list.incomplete_tasks || 0)) / (list.total_tasks || 1)) * 100}%` 
                        }}
                      />
                    </div>
                  )}
                </button>
              ))}
              {lists.length > 3 && (
                <button
                  onClick={handleGoToLists}
                  className="w-full text-center py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Mostra altre {lists.length - 3} liste
                </button>
              )}
            </div>
          )}
        </div>

        {/* Google Calendar Widget con supporto multi-calendario */}
        <CalendarWidget
          events={upcomingEvents}
          loading={calendarLoading}
          error={calendarError}
          isAuthenticated={isCalendarAuthenticated}
          onSignIn={signInCalendar}
          onRefresh={refreshEvents}
          availableCalendars={availableCalendars}
          selectedCalendars={selectedCalendars}
          loadingCalendars={loadingCalendars}
          onToggleCalendar={toggleCalendar}
          onSelectAllCalendars={selectAllCalendars}
          onSelectNoneCalendars={selectNoneCalendars}
          onSetCustomCalendarName={setCustomCalendarName}
        />

        {/* Colonna combinata Gmail + News */}
        <div className="space-y-6">
          {/* Gmail Widget */}
          <GmailWidget
            emails={emails}
            loading={gmailLoading}
            error={gmailError}
            isAuthenticated={isGmailAuthenticated}
            unreadCount={getUnreadCount()}
            onSignIn={signInGmail}
            onRefresh={() => fetchRecentEmails()}
            formatEmailDate={formatEmailDate}
            onMarkAsRead={markAsRead}
            onArchiveEmail={archiveEmail}
            labelColors={labelColors}
          />

          {/* News Tech RSS */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Rss size={20} className="text-orange-500" />
                <span>News Tech</span>
              </h3>
              <RSSSourceSelector 
                selectedSourceId={data.selectedRssSource}
                onSourceChange={handleRssSourceChange}
                sources={sources}
              />
            </div>
            
            {newsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500 text-sm">Caricamento notizie...</p>
              </div>
            ) : newsError ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto text-red-400 mb-4" size={32} />
                <p className="text-red-600 text-sm mb-2 font-medium">Errore nel caricamento</p>
                <p className="text-gray-500 text-xs mb-4">{newsError}</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors">
                  Riprova
                </button>
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-8">
                <Rss className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">Nessuna notizia disponibile</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {news.slice(0, 6).map((article, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <h4 className="font-medium text-sm text-gray-900 mb-1 leading-tight">
                      {article.title}
                    </h4>
                    {article.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatDate(article.pubDate)}
                      </span>
                      {article.link && (
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Leggi articolo completo"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions Quick */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleGoToLists}
          className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Calendar className="text-blue-600" size={20} />
            <div className="text-left">
              <p className="font-medium text-blue-900">Gestisci Liste</p>
              <p className="text-sm text-blue-700">Crea e modifica le tue liste di task</p>
            </div>
          </div>
          <ArrowRight className="text-blue-600" size={16} />
        </button>

        <button
          onClick={handleGoToStats}
          className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <BarChart3 className="text-green-600" size={20} />
            <div className="text-left">
              <p className="font-medium text-green-900">Vedi Statistiche</p>
              <p className="text-sm text-green-700">Analizza la tua produttività</p>
            </div>
          </div>
          <ArrowRight className="text-green-600" size={16} />
        </button>
      </div>
    </div>
  );
};