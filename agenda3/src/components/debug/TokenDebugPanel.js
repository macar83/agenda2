import React, { useState, useEffect } from 'react';
import { RefreshCw, Eye, EyeOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export const TokenDebugPanel = ({ 
  calendarHook, 
  gmailHook, 
  isVisible = false 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [tokenStatus, setTokenStatus] = useState({
    calendar: null,
    gmail: null
  });

  // Aggiorna status token ogni 30 secondi
  useEffect(() => {
    const updateStatus = () => {
      // Status Calendar
      const calendarToken = localStorage.getItem('google_calendar_token');
      const calendarExpiry = localStorage.getItem('google_calendar_token_expiry');
      const calendarRefresh = localStorage.getItem('google_calendar_refresh_token');

      // Status Gmail
      const gmailToken = localStorage.getItem('gmail_token');
      const gmailExpiry = localStorage.getItem('gmail_token_expiry');
      const gmailRefresh = localStorage.getItem('gmail_refresh_token');

      const now = Date.now();

      setTokenStatus({
        calendar: calendarToken && calendarExpiry ? {
          hasToken: true,
          hasRefreshToken: !!calendarRefresh,
          expiryTime: parseInt(calendarExpiry),
          timeUntilExpiry: parseInt(calendarExpiry) - now,
          isExpired: parseInt(calendarExpiry) <= now,
          isExpiringSoon: (parseInt(calendarExpiry) - now) < 600000 // 10 minuti
        } : { hasToken: false },
        gmail: gmailToken && gmailExpiry ? {
          hasToken: true,
          hasRefreshToken: !!gmailRefresh,
          expiryTime: parseInt(gmailExpiry),
          timeUntilExpiry: parseInt(gmailExpiry) - now,
          isExpired: parseInt(gmailExpiry) <= now,
          isExpiringSoon: (parseInt(gmailExpiry) - now) < 600000 // 10 minuti
        } : { hasToken: false }
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeRemaining = (timeMs) => {
    if (timeMs <= 0) return 'Scaduto';
    
    const minutes = Math.floor(timeMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}g ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const getStatusIcon = (status) => {
    if (!status?.hasToken) return <AlertCircle className="w-4 h-4 text-gray-400" />;
    if (status.isExpired) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (status.isExpiringSoon) return <Clock className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusColor = (status) => {
    if (!status?.hasToken) return 'bg-gray-100 border-gray-300';
    if (status.isExpired) return 'bg-red-50 border-red-200';
    if (status.isExpiringSoon) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white border-2 border-gray-200 rounded-lg shadow-lg z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Token Status
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Calendar Status */}
        <div className={`p-3 rounded-lg border-2 mb-3 ${getStatusColor(tokenStatus.calendar)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(tokenStatus.calendar)}
              <span className="font-medium">Google Calendar</span>
            </div>
            <span className="text-sm">
              {tokenStatus.calendar?.hasToken 
                ? formatTimeRemaining(tokenStatus.calendar.timeUntilExpiry)
                : 'Non autenticato'
              }
            </span>
          </div>
          
          {showDetails && tokenStatus.calendar?.hasToken && (
            <div className="mt-2 text-xs space-y-1">
              <div>Scadenza: {new Date(tokenStatus.calendar.expiryTime).toLocaleString()}</div>
              <div>Refresh Token: {tokenStatus.calendar.hasRefreshToken ? '✅' : '❌'}</div>
              <div>Autenticato: {calendarHook?.isAuthenticated ? '✅' : '❌'}</div>
            </div>
          )}
        </div>

        {/* Gmail Status */}
        <div className={`p-3 rounded-lg border-2 mb-3 ${getStatusColor(tokenStatus.gmail)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(tokenStatus.gmail)}
              <span className="font-medium">Gmail</span>
            </div>
            <span className="text-sm">
              {tokenStatus.gmail?.hasToken 
                ? formatTimeRemaining(tokenStatus.gmail.timeUntilExpiry)
                : 'Non autenticato'
              }
            </span>
          </div>
          
          {showDetails && tokenStatus.gmail?.hasToken && (
            <div className="mt-2 text-xs space-y-1">
              <div>Scadenza: {new Date(tokenStatus.gmail.expiryTime).toLocaleString()}</div>
              <div>Refresh Token: {tokenStatus.gmail.hasRefreshToken ? '✅' : '❌'}</div>
              <div>Autenticato: {gmailHook?.isAuthenticated ? '✅' : '❌'}</div>
            </div>
          )}
        </div>

        {/* Azioni */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              calendarHook?.logTokenStatus?.();
              gmailHook?.logTokenStatus?.();
            }}
            className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
          >
            Log Console
          </button>
          <button
            onClick={async () => {
              if (calendarHook?.refreshAccessToken) {
                await calendarHook.refreshAccessToken();
              }
              if (gmailHook?.refreshAccessToken) {
                await gmailHook.refreshAccessToken();
              }
            }}
            className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
          >
            Force Refresh
          </button>
        </div>

        {/* Warning per token mancanti */}
        {(!tokenStatus.calendar?.hasRefreshToken || !tokenStatus.gmail?.hasRefreshToken) && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
            ⚠️ Alcuni refresh token mancano. Disconnetti e riconnetti per ottenerli.
          </div>
        )}
      </div>
    </div>
  );
};