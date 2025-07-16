import React, { useState } from 'react';
import { Mail, RefreshCw, LogIn, AlertCircle, ExternalLink, Clock, User, Paperclip, Archive, CheckCircle, Star } from 'lucide-react';

export const GmailWidget = ({ 
  emails = [], 
  loading = false, 
  error = null, 
  isAuthenticated = false, 
  unreadCount = 0,
  onSignIn, 
  onRefresh,
  formatEmailDate,
  // Nuove props
  onMarkAsRead,
  onArchiveEmail,
  labelColors = {}
}) => {
  
  const [actingOnEmail, setActingOnEmail] = useState(null); // Per loading delle azioni

  // CONFIGURAZIONE CATEGORIE GMAIL
  const getCategoryInfo = (category) => {
    const categories = {
      primary: {
        name: 'Principale',
        color: '#1f2937',
        bgColor: '#f3f4f6',
        icon: '📧'
      },
      promotions: {
        name: 'Promozioni',
        color: '#dc2626',
        bgColor: '#fef2f2',
        icon: '🏷️'
      },
      social: {
        name: 'Social',
        color: '#2563eb',
        bgColor: '#eff6ff',
        icon: '👥'
      },
      updates: {
        name: 'Aggiornamenti',
        color: '#059669',
        bgColor: '#f0fdf4',
        icon: '🔄'
      },
      forums: {
        name: 'Forum',
        color: '#7c3aed',
        bgColor: '#faf5ff',
        icon: '💬'
      }
    };
    
    return categories[category] || categories.primary;
  };

  // COMPONENTE CATEGORIA
  const renderCategory = (email) => {
    if (email.category === 'primary') return null; // Non mostrare categoria principale
    
    const categoryInfo = getCategoryInfo(email.category);
    
    return (
      <span
        className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium"
        style={{
          backgroundColor: categoryInfo.bgColor,
          color: categoryInfo.color
        }}
      >
        <span>{categoryInfo.icon}</span>
        <span>{categoryInfo.name}</span>
      </span>
    );
  };

  // COMPONENTE ETICHETTE PERSONALIZZATE
  const renderCustomLabels = (email) => {
    if (!email.customLabels || email.customLabels.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1">
        {email.customLabels.slice(0, 2).map(labelId => {
          const labelInfo = labelColors[labelId];
          if (!labelInfo) return null;

          return (
            <span
              key={labelId}
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: labelInfo.backgroundColor,
                color: labelInfo.textColor
              }}
            >
              {labelInfo.name}
            </span>
          );
        })}
        {email.customLabels.length > 2 && (
          <span className="text-xs text-gray-400">
            +{email.customLabels.length - 2}
          </span>
        )}
      </div>
    );
  };

  // Funzione per estrarre nome mittente
  const extractSenderName = (fromString) => {
    try {
      // Formato: "Nome Cognome <email@domain.com>" o solo "email@domain.com"
      const match = fromString.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        return match[1].replace(/"/g, '').trim();
      }
      
      // Solo email, prendi la parte prima della @
      const emailMatch = fromString.match(/^([^@]+)@/);
      if (emailMatch) {
        return emailMatch[1].replace(/\./g, ' ');
      }
      
      return fromString;
    } catch {
      return 'Mittente sconosciuto';
    }
  };

  // GESTIONE AZIONI RAPIDE
  const handleMarkAsRead = async (e, emailId) => {
    e.stopPropagation();
    setActingOnEmail(emailId);
    const success = await onMarkAsRead(emailId);
    if (!success) {
      console.error('Errore nel marcare come letta');
    }
    setActingOnEmail(null);
  };

  const handleArchive = async (e, emailId) => {
    e.stopPropagation();
    setActingOnEmail(emailId);
    const success = await onArchiveEmail(emailId);
    if (!success) {
      console.error('Errore nell\'archiviare');
    }
    setActingOnEmail(null);
  };

  // Funzione per aprire email in Gmail
  const openInGmail = (email) => {
    const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${email.threadId}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  // Non autenticato
  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Mail size={20} className="text-red-500" />
            <span>Gmail</span>
          </h3>
        </div>
        
        <div className="text-center py-8">
          <Mail className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 mb-4">Accedi a Gmail per vedere le tue email recenti</p>
          <button
            onClick={() => {
              console.log('📧 Click su pulsante Connetti Gmail');
              onSignIn();
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogIn size={16} />
            <span>Connetti Gmail</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Mail size={20} className="text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Gmail</h3>
          {unreadCount > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
              {unreadCount} non lette
            </span>
          )}
        </div>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`p-2 rounded-lg transition-colors ${
            loading 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
          }`}
          title="Aggiorna email"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Legenda categorie */}
      {isAuthenticated && emails.length > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
          <div className="text-gray-600 mb-1">Categorie:</div>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center space-x-1">
              <span>🏷️</span>
              <span className="text-red-600">Promozioni</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>👥</span>
              <span className="text-blue-600">Social</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>🔄</span>
              <span className="text-green-600">Aggiornamenti</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>💬</span>
              <span className="text-purple-600">Forum</span>
            </span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Caricamento email...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={32} />
          <p className="text-red-600 text-sm mb-2 font-medium">Errore nel caricamento</p>
          <p className="text-gray-500 text-xs mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
          >
            Riprova
          </button>
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 mb-2">Nessuna email recente</p>
          <p className="text-gray-400 text-sm">La tua inbox è vuota!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {emails.map((email) => (
            <div 
              key={email.id} 
              className={`border rounded-lg p-3 transition-all hover:shadow-sm cursor-pointer group ${
                email.isUnread 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() => openInGmail(email)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 mt-1 flex items-center space-x-1">
                    {/* Indicatore non letta */}
                    {email.isUnread ? (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    ) : (
                      <div className="w-2 h-2"></div>
                    )}
                    
                    {/* Indicatori aggiuntivi */}
                    {email.isImportant && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Importante"></div>
                    )}
                    {email.isStarred && (
                      <Star size={10} className="text-yellow-500 fill-current" title="Speciale" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <User size={12} className="text-gray-400 flex-shrink-0" />
                        <span className={`text-sm truncate ${
                          email.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                        }`}>
                          {extractSenderName(email.from)}
                        </span>
                        
                        {/* Icona allegati */}
                        {email.hasAttachments && (
                          <Paperclip size={12} className="text-gray-500 flex-shrink-0" title="Ha allegati" />
                        )}
                      </div>

                      {/* Azioni rapide */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {email.isUnread && (
                          <button
                            onClick={(e) => handleMarkAsRead(e, email.id)}
                            disabled={actingOnEmail === email.id}
                            className="p-1 hover:bg-blue-100 rounded transition-colors"
                            title="Segna come letta"
                          >
                            {actingOnEmail === email.id ? (
                              <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <CheckCircle size={14} className="text-blue-600" />
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => handleArchive(e, email.id)}
                          disabled={actingOnEmail === email.id}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Archivia"
                        >
                          {actingOnEmail === email.id ? (
                            <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Archive size={14} className="text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <h4 className={`text-sm leading-tight mb-1 ${
                      email.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
                    }`}>
                      {email.subject}
                    </h4>
                    
                    {email.snippet && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {email.snippet}
                      </p>
                    )}

                    {/* Categoria Gmail + Etichette personalizzate */}
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {renderCategory(email)}
                      {renderCustomLabels(email)}
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock size={10} />
                        <span>{formatEmailDate(email.date)}</span>
                      </div>
                      
                      <ExternalLink size={12} className="text-gray-400 hover:text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Mail size={12} />
            <span>Aggiornamento automatico ogni 5 minuti</span>
          </div>
          {emails.length > 0 && (
            <button
              onClick={() => window.open('https://mail.google.com', '_blank')}
              className="hover:text-red-600 transition-colors"
            >
              Apri Gmail →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};