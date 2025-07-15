import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import AppContext from './contexts/AppContext';
import { useAppData } from './hooks/useAppData';
import { AuthScreen } from './components/auth/AuthScreen';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Overview } from './components/views/Overview';
import { ListsView } from './components/views/ListsView';
import { StatsView } from './components/views/StatsView';

// Main App Component
const TaskManagerApp = () => {
  const appData = useAppData();
  
  if (!appData.data.isAuthenticated) {
    return (
      <AppContext.Provider value={appData}>
        <AuthScreen />
      </AppContext.Provider>
    );
  }

  const renderContent = () => {
    switch (appData.data.currentView) {
      case 'overview':
        return <Overview />;
      case 'lists':
        return <ListsView />;
      case 'stats':
        return <StatsView />;
      default:
        return <Overview />;
    }
  };

  return (
    <AppContext.Provider value={appData}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        {appData.data.error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{appData.data.error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => appData.updateData({ error: null })}
                    className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {appData.data.isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-40">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Caricamento...</p>
                </div>
              </div>
            )}
            {renderContent()}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default TaskManagerApp;