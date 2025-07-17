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
    markAsRead,
    archiveEmail,
    labelColors
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

  // 📅 NUOVO: Calcola eventi di oggi dal calendario
  const todayEvents = getTodayEvents();
  const upcomingEvents = getUpcomingEvents();

  console.log('📅 Eventi oggi debug:', {
    todayEventsCount: todayEvents.length,
    isCalendarAuthenticated,
    events: events.length,
    todayEventsPreview: todayEvents.slice(0, 3).map(e => ({ title: e.title, start: e.start }))
  });

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
        {/* 🆕 SOSTITUITO: Eventi Oggi invece di Liste Totali */}
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Eventi Oggi</p>
              <p className="text-2xl font-bold text-gray-900">{todayEvents.length}</p>
              {isCalendarAuthenticated && todayEvents.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {todayEvents[0].start && formatDate(todayEvents[0].start).split(' ')[1]} primo evento
                </p>
              )}
              {!isCalendarAuthenticated && (
                <p className="text-xs text-orange-500 mt-1">
                  Connetti calendario
                </p>
              )}
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
            <div className="text-center py-6">
              <Calendar className="mx-auto text-gray-400 mb-3" size={32} />
              <p className="text-gray-500 text-sm mb-3">Nessuna lista ancora creata</p>
              <button
                onClick={handleGoToLists}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Crea la tua prima lista →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lists.slice(0, 4).map(list => (
                <button
                  key={list.id}
                  onClick={() => handleListClick(list)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: list.color }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{list.name}</p>
                      <p className="text-sm text-gray-500">
                        {list.incomplete_tasks || 0} di {list.total_tasks || 0} task
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="text-gray-400" size={16} />
                </button>
              ))}
              
              {lists.length > 4 && (
                <button
                  onClick={handleGoToLists}
                  className="w-full p-2 text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Vedi tutte le {lists.length} liste →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Google Calendar Widget */}
        <CalendarWidget
          events={events}
          todayEvents={todayEvents}
          upcomingEvents={upcomingEvents}
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

        {/* Gmail Widget */}
        <GmailWidget
          emails={emails}
          loading={gmailLoading}
          error={gmailError}
          isAuthenticated={isGmailAuthenticated}
          onSignIn={signInGmail}
          onRefresh={fetchRecentEmails}
          formatEmailDate={formatEmailDate}
          getUnreadCount={getUnreadCount}
          onMarkAsRead={markAsRead}
          onArchiveEmail={archiveEmail}
          labelColors={labelColors}
        />
      </div>

      {/* News RSS */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Rss size={20} className="text-orange-500" />
            <span>Ultime Notizie</span>
          </h3>
          
          <RSSSourceSelector
            sources={sources}
            selectedSource={data.selectedRssSource}
            onSourceChange={handleRssSourceChange}
          />
        </div>

        {newsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2 text-gray-600">Caricamento notizie...</span>
          </div>
        )}

        {newsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="text-red-500" size={16} />
              <p className="text-red-700 text-sm">{newsError}</p>
            </div>
          </div>
        )}

        {!newsLoading && !newsError && news.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.slice(0, 6).map((article, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{article.title}</h4>
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{article.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{formatDate(article.pubDate)}</span>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>Leggi</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!newsLoading && !newsError && news.length === 0 && (
          <div className="text-center py-8">
            <Rss className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-gray-500">Nessuna notizia disponibile al momento</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
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