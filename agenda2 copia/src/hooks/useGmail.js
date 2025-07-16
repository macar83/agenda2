import { useState, useEffect } from 'react';

// Configurazione Gmail API
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.modify';

// Chiavi localStorage
const GMAIL_TOKEN_KEY = 'gmail_token';
const GMAIL_TOKEN_EXPIRY_KEY = 'gmail_token_expiry';

export const useGmail = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [labelColors, setLabelColors] = useState({});

  // Debug
  console.log('📧 Gmail Config:', {
    hasApiKey: !!GOOGLE_API_KEY,
    hasClientId: !!GOOGLE_CLIENT_ID,
    isAuthenticated,
    isReady,
    hasGapi: !!window.gapi,
    hasGoogle: !!window.google?.accounts?.oauth2
  });

  // Funzioni per persistenza token
  const saveTokenToStorage = (token) => {
    try {
      localStorage.setItem(GMAIL_TOKEN_KEY, JSON.stringify(token));
      const expiryTime = Date.now() + (token.expires_in ? token.expires_in * 1000 : 3600000);
      localStorage.setItem(GMAIL_TOKEN_EXPIRY_KEY, expiryTime.toString());
      console.log('💾 Token Gmail salvato');
    } catch (error) {
      console.error('❌ Errore salvataggio token Gmail:', error);
    }
  };

  const loadTokenFromStorage = () => {
    try {
      const savedToken = localStorage.getItem(GMAIL_TOKEN_KEY);
      const savedExpiry = localStorage.getItem(GMAIL_TOKEN_EXPIRY_KEY);
      
      if (!savedToken || !savedExpiry) {
        return null;
      }

      const expiryTime = parseInt(savedExpiry);
      const now = Date.now();
      
      if (now >= (expiryTime - 300000)) {
        clearStoredToken();
        return null;
      }

      return JSON.parse(savedToken);
    } catch (error) {
      console.error('❌ Errore caricamento token Gmail:', error);
      return null;
    }
  };

  const clearStoredToken = () => {
    localStorage.removeItem(GMAIL_TOKEN_KEY);
    localStorage.removeItem(GMAIL_TOKEN_EXPIRY_KEY);
    console.log('🗑️ Token Gmail rimosso');
  };

  // AZIONI RAPIDE EMAIL
  const markAsRead = async (messageId) => {
    console.log('📧 markAsRead chiamata per:', messageId);
    try {
      const savedToken = loadTokenFromStorage();
      if (!savedToken) {
        console.error('❌ Token non disponibile');
        return false;
      }

      const currentToken = window.gapi.client.getToken();
      window.gapi.client.setToken({ access_token: savedToken.access_token });

      console.log('📧 Modificando etichette email...');
      await window.gapi.client.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        removeLabelIds: ['UNREAD']
      });

      // Aggiorna lo stato locale
      setEmails(prev => prev.map(email => 
        email.id === messageId ? { ...email, isUnread: false } : email
      ));

      if (currentToken) window.gapi.client.setToken(currentToken);
      console.log('✅ Email marcata come letta');
      return true;
    } catch (err) {
      console.error('❌ Errore marca come letta:', err);
      return false;
    }
  };

  const archiveEmail = async (messageId) => {
    console.log('📧 archiveEmail chiamata per:', messageId);
    try {
      const savedToken = loadTokenFromStorage();
      if (!savedToken) {
        console.error('❌ Token non disponibile');
        return false;
      }

      const currentToken = window.gapi.client.getToken();
      window.gapi.client.setToken({ access_token: savedToken.access_token });

      console.log('📧 Archiviando email...');
      await window.gapi.client.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        removeLabelIds: ['INBOX']
      });

      // Rimuovi email dalla lista locale
      setEmails(prev => prev.filter(email => email.id !== messageId));

      if (currentToken) window.gapi.client.setToken(currentToken);
      console.log('✅ Email archiviata');
      return true;
    } catch (err) {
      console.error('❌ Errore archivia email:', err);
      return false;
    }
  };

  // FUNZIONE PER RECUPERARE ETICHETTE COLORATE
  const fetchLabelColors = async () => {
    try {
      const savedToken = loadTokenFromStorage();
      if (!savedToken) return;

      const currentToken = window.gapi.client.getToken();
      window.gapi.client.setToken({ access_token: savedToken.access_token });

      const response = await window.gapi.client.gmail.users.labels.list({
        userId: 'me'
      });

      const labels = response.result.labels || [];
      const colorMap = {};

      labels.forEach(label => {
        if (label.color) {
          colorMap[label.id] = {
            backgroundColor: label.color.backgroundColor || '#f3f4f6',
            textColor: label.color.textColor || '#374151',
            name: label.name
          };
        } else {
          // Colori di default per etichette personalizzate
          colorMap[label.id] = {
            backgroundColor: '#e5e7eb',
            textColor: '#374151',
            name: label.name
          };
        }
      });

      setLabelColors(colorMap);
      if (currentToken) window.gapi.client.setToken(currentToken);
      console.log('✅ Colori etichette caricati');
    } catch (err) {
      console.warn('⚠️ Errore caricamento colori etichette:', err);
    }
  };

  // Inizializzazione semplificata
  useEffect(() => {
    const initGmail = () => {
      console.log('📧 Controllo inizializzazione Gmail...');
      
      if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
        console.error('❌ Credenziali mancanti');
        setError('Credenziali Google mancanti');
        return;
      }

      if (!window.gapi || !window.google?.accounts?.oauth2) {
        console.log('📧 Librerie non ancora pronte, riprovo...');
        return;
      }

      console.log('✅ Librerie trovate, Gmail pronto');
      setIsReady(true);

      // Controlla token salvato
      const savedToken = loadTokenFromStorage();
      if (savedToken && savedToken.access_token) {
        console.log('🔄 Token Gmail salvato trovato');
        setIsAuthenticated(true);
      }
    };

    // Controlla ogni secondo fino a che le librerie non sono pronte
    const interval = setInterval(() => {
      if (isReady) {
        clearInterval(interval);
        return;
      }
      initGmail();
    }, 1000);

    // Cleanup dopo 30 secondi
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!isReady) {
        setError('Timeout inizializzazione Gmail - ricarica la pagina');
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isReady]);

  // Funzione di login semplificata
  const signIn = async () => {
    try {
      console.log('📧 INIZIO signIn Gmail');
      console.log('📧 Stato corrente:', {
        isReady,
        hasGapi: !!window.gapi,
        hasGoogle: !!window.google?.accounts?.oauth2
      });

      if (!isReady) {
        setError('Gmail non ancora inizializzato');
        return;
      }

      if (!window.gapi || !window.google?.accounts?.oauth2) {
        setError('Librerie Google non disponibili');
        return;
      }

      // Controlla token esistente
      const savedToken = loadTokenFromStorage();
      if (savedToken && savedToken.access_token) {
        console.log('📧 Token esistente trovato');
        setIsAuthenticated(true);
        return;
      }

      console.log('📧 Creando token client al volo...');

      // Crea token client direttamente qui
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GMAIL_SCOPES,
        callback: (response) => {
          console.log('📧 Callback ricevuto:', response);
          if (response.access_token) {
            saveTokenToStorage(response);
            setIsAuthenticated(true);
            setError(null);
            console.log('✅ Login Gmail completato');
          } else if (response.error) {
            console.error('❌ Errore nella risposta:', response);
            setError(`Errore Gmail: ${response.error}`);
          }
        },
        error_callback: (error) => {
          console.error('❌ Errore OAuth Gmail:', error);
          setError(`Errore autenticazione: ${error.type}`);
        }
      });

      console.log('📧 Richiedendo accesso...');
      tokenClient.requestAccessToken({
        prompt: 'consent'
      });

    } catch (err) {
      console.error('❌ Errore signIn Gmail:', err);
      setError(`Errore login: ${err.message}`);
    }
  };

  const signOut = async () => {
    try {
      const savedToken = loadTokenFromStorage();
      if (savedToken?.access_token) {
        window.google.accounts.oauth2.revoke(savedToken.access_token, () => {
          console.log('✅ Token Gmail revocato');
        });
      }
      
      clearStoredToken();
      setIsAuthenticated(false);
      setEmails([]);
      console.log('✅ Logout Gmail completato');
      
    } catch (err) {
      console.error('❌ Errore logout Gmail:', err);
    }
  };

  // Fetch delle email
  const fetchRecentEmails = async (maxResults = 5) => {
    if (!isAuthenticated || !window.gapi) {
      console.log('⚠️ Gmail non pronto per fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const savedToken = loadTokenFromStorage();
      if (!savedToken) {
        setIsAuthenticated(false);
        setError('Sessione scaduta');
        setLoading(false);
        return;
      }

      console.log('📧 Caricamento Gmail API...');

      // Carica Gmail API se non presente
      if (!window.gapi.client.gmail) {
        await window.gapi.client.load('gmail', 'v1');
        console.log('✅ Gmail API caricata');
      }

      // Salva token corrente e imposta quello Gmail
      const currentToken = window.gapi.client.getToken();
      window.gapi.client.setToken({ access_token: savedToken.access_token });

      console.log('📧 Recuperando lista email...');

      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: 'in:inbox'
      });

      const messages = response.result.messages || [];
      
      if (messages.length === 0) {
        setEmails([]);
        // Ripristina token
        if (currentToken) window.gapi.client.setToken(currentToken);
        setLoading(false);
        return;
      }

      console.log(`📧 Trovate ${messages.length} email, recuperando dettagli...`);

      // Ottieni dettagli email
      const emailDetails = await Promise.all(
        messages.map(async (message) => {
          try {
            const detail = await window.gapi.client.gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full'
            });

            const headers = detail.result.payload.headers;
            const from = headers.find(h => h.name === 'From')?.value || 'Mittente sconosciuto';
            const subject = headers.find(h => h.name === 'Subject')?.value || 'Nessun oggetto';
            const date = headers.find(h => h.name === 'Date')?.value || '';

            // Controlla allegati
            const hasAttachments = (payload) => {
              if (payload.parts) {
                return payload.parts.some(part => 
                  part.filename && part.filename.length > 0 && 
                  part.body && part.body.attachmentId
                );
              }
              return payload.filename && payload.filename.length > 0;
            };

            // 🆕 Estrai categorie Gmail e etichette
            const labelIds = detail.result.labelIds || [];
            
            // Identifica la categoria Gmail
            let category = 'primary'; // Default
            if (labelIds.includes('CATEGORY_PROMOTIONS')) category = 'promotions';
            else if (labelIds.includes('CATEGORY_SOCIAL')) category = 'social';
            else if (labelIds.includes('CATEGORY_UPDATES')) category = 'updates';
            else if (labelIds.includes('CATEGORY_FORUMS')) category = 'forums';
            
            // Etichette personalizzate (escludi categorie e etichette di sistema)
            const systemLabels = [
              'INBOX', 'UNREAD', 'IMPORTANT', 'STARRED', 'SENT', 'DRAFT', 'SPAM', 'TRASH',
              'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS', 'CATEGORY_PRIMARY'
            ];
            const customLabels = labelIds.filter(id => !systemLabels.includes(id));

            return {
              id: message.id,
              from: from,
              subject: subject,
              date: date,
              snippet: detail.result.snippet || '',
              threadId: detail.result.threadId,
              isUnread: labelIds.includes('UNREAD'),
              isImportant: labelIds.includes('IMPORTANT'),
              isStarred: labelIds.includes('STARRED'),
              hasAttachments: hasAttachments(detail.result.payload),
              labelIds: labelIds,
              customLabels: customLabels,
              category: category // 🆕 Categoria Gmail
            };
          } catch (err) {
            console.warn('⚠️ Errore dettaglio email:', err);
            return null;
          }
        })
      );

      // Ripristina token originale
      if (currentToken) window.gapi.client.setToken(currentToken);

      const validEmails = emailDetails.filter(email => email !== null);
      setEmails(validEmails);
      console.log('✅ Email caricate:', validEmails.length);
      
    } catch (err) {
      console.error('❌ Errore fetch email:', err);
      
      if (err.status === 401) {
        clearStoredToken();
        setIsAuthenticated(false);
        setError('Sessione scaduta. Riconnettiti a Gmail.');
      } else {
        setError(`Errore caricamento: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Utility per formattare data
  const formatEmailDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = now - date;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (diffDays === 1) {
        return 'Ieri';
      } else if (diffDays < 7) {
        return `${diffDays} giorni fa`;
      } else {
        return date.toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'short'
        });
      }
    } catch {
      return 'Data non valida';
    }
  };

  // Auto-fetch quando autenticato
  useEffect(() => {
    if (isAuthenticated && isReady) {
      fetchRecentEmails();
      fetchLabelColors();
      
      // Auto-refresh ogni 5 minuti
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh email Gmail...');
        fetchRecentEmails();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isReady]);

  // DEBUG: Log delle funzioni esportate
  console.log('📧 Gmail hook functions:', {
    markAsRead: typeof markAsRead,
    archiveEmail: typeof archiveEmail,
    labelColors: typeof labelColors
  });

  return {
    emails,
    loading,
    error,
    isAuthenticated,
    signIn,
    signOut,
    fetchRecentEmails,
    formatEmailDate,
    getUnreadCount: () => emails.filter(email => email.isUnread).length,
    // NUOVE FUNZIONI
    markAsRead,
    archiveEmail,
    labelColors
  };
};