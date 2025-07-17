import React, { useState, useMemo } from 'react';
import { Mail, RefreshCw, LogIn, AlertCircle, ExternalLink, Clock, User, Paperclip, Archive, CheckCircle, Star, Filter } from 'lucide-react';

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
  
  // 🆕 STATO PER FILTRO CATEGORIE
  const [selectedCategories, setSelectedCategories] = useState([
    'primary', 'promotions', 'social', 'updates', 'forums'
  ]); // Default: tutte selezionate

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

  // 🆕 FILTRA EMAIL PER CATEGORIE SELEZIONATE
  const filteredEmails = useMemo(() => {
    if (selectedCategories.length === 0) {
      return []; // Nessuna categoria selezionata = nessuna email
    }
    
    return emails.filter(email => {
      const category = email.category || 'primary';
      return selectedCategories.includes(category);
    });
  }, [emails, selectedCategories]);

  // 🆕 CALCOLA CONTEGGI PER CATEGORIA
  const emailCounts = useMemo(() => {
    const counts = {
      primary: 0,
      promotions: 0,
      social: 0,
      updates: 0,
      forums: 0
    };

    emails.forEach(email => {
      const category = email.category || 'primary';
      if (counts.hasOwnProperty(category)) {
        counts[category]++;
      }
    });

    return counts;
  }, [emails]);

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
        return match[1].trim().replace(/"/g, '');
      }
      
      // Se è solo l'email, prendi la parte prima della @
      const emailMatch = fromString.match(/^([^@]+)@/);
      return emailMatch ? emailMatch[1] : fromString;
    } catch {
      return fromString;
    }
  };

  // AZIONI RAPIDE EMAIL
  const handleMarkAsRead = async (e, messageId) => {
    e.stopPropagation();
    if (!onMarkAsRead) return;
    
    setActingOnEmail(messageId);
    const success = await onMarkAsRead(messageId);
    
    if (success) {
      console.log('✅ Email segnata come letta');
    }
    
    setActingOnEmail(null);
  };

  const handleArchive = async (e, messageId) => {
    e.stopPropagation();
    if (!onArchiveEmail) return;
    
    setActingOnEmail(messageId);
    const success = await onArchiveEmail(messageId);
    
    if (success) {
      console.log('✅ Email archiviata');
    }
    
    setActingOnEmail(null);
  };

  // 🆕 HANDLER PER CAMBIO FILTRO CATEGORIE (SEMPLIFICATO)
  const toggleCategory = (categoryId) => {
    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    console.log('📧 Filtro categorie aggiornato:', newSelection);
    setSelectedCategories(newSelection);
  };

  // Non autenticato
  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Mail size={20} className="text-red-500" />
            <span>Email Gmail</span>
          </h3>
        </div>
        
        <div className="text-center py-8">
          <Mail className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 mb-4">Accedi a Gmail per vedere le tue email recenti</p>
          <button
            onClick={onSignIn}
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
      {/* Header con contatore */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Mail size={20} className="text-red-500" />
          <span>Email Gmail</span>
          {filteredEmails.filter(e => e.isUnread).length > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
              {filteredEmails.filter(e => e.isUnread).length} non lette
            </span>
          )}
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Indicatore filtro */}
          <div className="flex items-center space-x-1">
            <Filter size={14} className="text-gray-500" />
            <span className="text-xs text-gray-600">
              {filteredEmails.length}/{emails.length}
            </span>
          </div>
          
          {/* Pulsante refresh */}
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
      </div>

      {/* 🆕 FILTRO CATEGORIE INLINE */}
      {emails.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-2 font-medium">Filtra per categoria:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(emailCounts).map(([categoryId, count]) => {
              const categoryInfo = getCategoryInfo(categoryId);
              const isSelected = selectedCategories.includes(categoryId);
              
              if (count === 0) return null;
              
              return (
                <button
                  key={categoryId}
                  onClick={() => toggleCategory(categoryId)}
                  className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected 
                      ? 'border-2 shadow-sm transform scale-105' 
                      : 'opacity-60 hover:opacity-85 border border-transparent'
                  }`}
                  style={{
                    backgroundColor: categoryInfo.bgColor,
                    color: categoryInfo.color,
                    borderColor: isSelected ? categoryInfo.color : 'transparent'
                  }}
                >
                  <span>{categoryInfo.icon}</span>
                  <span>{categoryInfo.name}</span>
                  <span className="bg-white bg-opacity-70 px-1.5 py-0.5 rounded-full font-semibold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Quick actions */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {selectedCategories.length === 5 ? 'Tutte le categorie' : 
               selectedCategories.length === 0 ? 'Nessuna categoria selezionata' :
               `${selectedCategories.length} categorie selezionate`}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedCategories(['primary', 'promotions', 'social', 'updates', 'forums'])}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Tutte
              </button>
              <button
                onClick={() => setSelectedCategories([])}
                className="text-xs text-gray-600 hover:text-gray-700 font-medium"
              >
                Nessuna
              </button>
            </div>
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
      ) : selectedCategories.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 mb-2">Nessuna categoria selezionata</p>
          <p className="text-gray-400 text-sm">Clicca sui pulsanti categoria sopra per vedere le email</p>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 mb-2">Nessuna email nelle categorie selezionate</p>
          <p className="text-gray-400 text-sm">Prova a selezionare altre categorie</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredEmails.map((email) => (
            <div 
              key={email.id} 
              className={`border rounded-lg p-3 transition-all hover:shadow-sm cursor-pointer group ${
                email.isUnread 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-white border-gray-200'
              }`}
              onClick={() => window.open(`https://mail.google.com/mail/#inbox/${email.threadId}`, '_blank')}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {email.isImportant && (
                          <Star size={12} className="text-yellow-500 flex-shrink-0" fill="currentColor" />
                        )}
                        
                        <span className={`text-sm truncate ${
                          email.isUnread 
                            ? 'font-semibold text-gray-900' 
                            : 'font-medium text-gray-700'
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
            <span>
              {filteredEmails.length > 0 ? (
                `Mostrando ${filteredEmails.length} di ${emails.length} email`
              ) : (
                'Aggiornamento automatico ogni 5 minuti'
              )}
            </span>
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