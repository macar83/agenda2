import { useState, useEffect } from 'react';

// Configurazione Gmail API
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.modify';

// Chiavi localStorage
const GMAIL_TOKEN_KEY = 'gmail_token';
const GMAIL_TOKEN_EXPIRY_KEY = 'gmail_token_expiry';
const GMAIL_REFRESH_TOKEN_KEY = 'gmail_refresh_token'; // 🆕

export const useGmail = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [labelColors, setLabelColors] = useState({});
  const [tokenClient, setTokenClient] = useState(null); // 🆕

  // Debug
  console.log('📧 Gmail Config:', {
    hasApiKey: !!GOOGLE_API_KEY,
    hasClientId: !!GOOGLE_CLIENT_ID,
    isAuthenticated,
    isReady,
    hasGapi: !!window.gapi,
    hasGoogle: !!window.google?.accounts?.oauth2,
    hasTokenClient: !!tokenClient
  });

  // 🆕 FUNZIONI AVANZATE PER GESTIONE TOKEN CON REFRESH
  const saveTokenToStorage = (tokenData) => {
    try {
      console.log('💾 Salvando token Gmail...');
      
      // Salva access token
      localStorage.setItem(GMAIL_TOKEN_KEY, JSON.stringify({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'Bearer'
      }));
      
      // Salva refresh token se presente
      if (tokenData.refresh_token) {
        localStorage.setItem(GMAIL_REFRESH_TOKEN_KEY, tokenData.refresh_token);
        console.log('💾 Gmail refresh token salvato');
      }
      
      // Calcola e salva scadenza
      const expiryTime = Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1000 : 3600000);
      localStorage.setItem(GMAIL_TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      console.log('✅ Token Gmail salvato, scadenza:', new Date(expiryTime).toLocaleString());
      logTokenStatus();
      
    } catch (error) {
      console.error('❌ Errore salvataggio token Gmail:', error);
    }
  };

  const loadTokenFromStorage = () => {
    try {
      const savedToken = localStorage.getItem(GMAIL_TOKEN_KEY);
      const savedExpiry = localStorage.getItem(GMAIL_TOKEN_EXPIRY_KEY);
      const savedRefreshToken = localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);
      
      if (!savedToken || !savedExpiry) {
        console.log('📦 Nessun token Gmail salvato trovato');
        return null;
      }

      const expiryTime = parseInt(savedExpiry);
      const now = Date.now();
      
      // Se token scaduto da più di 5 minuti, rimuovi tutto
      if (now >= (expiryTime + 300000)) {
        console.log('⏰ Token Gmail scaduto da troppo tempo, rimozione...');
        clearStoredToken();
        return null;
      }

      const token = JSON.parse(savedToken);
      
      return {
        ...token,
        refresh_token: savedRefreshToken,
        expires_at: expiryTime
      };
      
    } catch (error) {
      console.error('❌ Errore caricamento token Gmail:', error);
      clearStoredToken();
      return null;
    }
  };

  const clearStoredToken = () => {
    localStorage.removeItem(GMAIL_TOKEN_KEY);
    localStorage.removeItem(GMAIL_TOKEN_EXPIRY_KEY);
    localStorage.removeItem(GMAIL_REFRESH_TOKEN_KEY);
    console.log('🗑️ Tutti i token Gmail rimossi dal storage');
  };

  // 🆕 FUNZIONE PER REFRESH AUTOMATICO TOKEN
  const refreshAccessToken = async () => {
    try {
      const savedRefreshToken = localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);
      
      if (!savedRefreshToken) {
        console.log('⚠️ Nessun refresh token Gmail disponibile, richiesta nuova autenticazione');
        return false;
      }

      console.log('🔄 Refreshing Gmail access token...');

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          refresh_token: savedRefreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newTokenData = await response.json();
      
      if (newTokenData.access_token) {
        // Salva il nuovo access token mantenendo il refresh token
        saveTokenToStorage({
          access_token: newTokenData.access_token,
          refresh_token: savedRefreshToken, // Mantieni quello esistente
          expires_in: newTokenData.expires_in || 3600
        });
        
        // Aggiorna il token in GAPI
        if (window.gapi?.client) {
          window.gapi.client.setToken({ access_token: newTokenData.access_token });
        }
        
        console.log('✅ Token Gmail refreshato automaticamente');
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Errore refresh token Gmail:', error);
      return false;
    }
  };

  // 🆕 WRAPPER PER CHIAMATE API CON RETRY AUTOMATICO
  const makeAuthenticatedRequest = async (apiCall, maxRetries = 1) => {
    try {
      return await apiCall();
    } catch (error) {
      console.error('❌ Errore Gmail API call:', error);
      
      // Se l'errore è dovuto a token scaduto (401/403)
      if ((error.status === 401 || error.status === 403) && maxRetries > 0) {
        console.log('🔄 Token Gmail scaduto durante API call, tentativo refresh...');
        
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          console.log('✅ Token Gmail refreshato, ripetendo chiamata API...');
          // Riprova la chiamata con il nuovo token
          return await makeAuthenticatedRequest(apiCall, maxRetries - 1);
        } else {
          // Se il refresh fallisce, disconnetti l'utente
          console.log('❌ Refresh token Gmail fallito, disconnessione...');
          signOut();
          throw new Error('Sessione Gmail scaduta, riautenticazione necessaria');
        }
      }
      throw error;
    }
  };

  // 🆕 CONTROLLO AUTOMATICO VALIDITÀ TOKEN
  const checkTokenValidity = async () => {
    const savedToken = loadTokenFromStorage();
    if (!savedToken) return;

    const now = Date.now();
    const timeUntilExpiry = savedToken.expires_at - now;
    
    // Se mancano meno di 10 minuti alla scadenza, refresha
    if (timeUntilExpiry < 600000 && timeUntilExpiry > 0) {
      console.log('🔄 Token Gmail in scadenza tra', Math.floor(timeUntilExpiry / 60000), 'minuti, refresh automatico...');
      const refreshed = await refreshAccessToken();
      
      if (!refreshed) {
        console.log('❌ Refresh automatico Gmail fallito');
        signOut();
      }
    }
  };

  // 🆕 LOGGING STATUS TOKEN
  const logTokenStatus = () => {
    const savedToken = loadTokenFromStorage();
    const savedExpiry = localStorage.getItem(GMAIL_TOKEN_EXPIRY_KEY);
    const savedRefreshToken = localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);
    
    if (savedToken && savedExpiry) {
      const expiryTime = parseInt(savedExpiry);
      const timeUntilExpiry = expiryTime - Date.now();
      
      console.log('📊 Gmail Token Status:', {
        hasAccessToken: !!savedToken.access_token,
        hasRefreshToken: !!savedRefreshToken,
        minutesUntilExpiry: Math.floor(timeUntilExpiry / 60000),
        expiryDate: new Date(expiryTime).toLocaleString(),
        isExpired: timeUntilExpiry <= 0
      });
    } else {
      console.log('📊 Gmail Token Status: Nessun token presente');
    }
  };

  // 🆕 INIZIALIZZAZIONE MIGLIORATA
  useEffect(() => {
    const initializeGmailAPI = async () => {
      try {
        if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
          setError('Credenziali Google mancanti per Gmail');
          return;
        }

        if (!window.gapi) {
          console.log('⚠️ GAPI non disponibile per Gmail');
          return;
        }

        if (!window.google?.accounts?.oauth2) {
          console.log('⚠️ Google Identity Services non disponibile');
          return;
        }

        console.log('🔧 Inizializzazione Gmail API...');

        // Inizializza GAPI se non già fatto
        if (!window.gapi.client) {
          await new Promise((resolve, reject) => {
            window.gapi.load('client', { callback: resolve, onerror: reject });
          });

          await window.gapi.client.init({
            apiKey: GOOGLE_API_KEY,
          });
        }

        // Configura token client per Gmail
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GMAIL_SCOPES,
          callback: (response) => {
            console.log('🔑 Gmail token response ricevuto:', response);
            
            if (response.access_token) {
              saveTokenToStorage(response);
              window.gapi.client.setToken({ access_token: response.access_token });
              setIsAuthenticated(true);
              console.log('✅ Autenticazione Gmail completata');
            }
          },
          error_callback: (error) => {
            console.error('❌ Errore OAuth Gmail:', error);
            setError(`Errore OAuth Gmail: ${error.type}`);
          }
        });

        setTokenClient(client);
        setIsReady(true);
        console.log('✅ Gmail token client configurato');

        // Controlla se c'è un token valido salvato
        const savedToken = loadTokenFromStorage();
        if (savedToken?.access_token) {
          const timeUntilExpiry = savedToken.expires_at - Date.now();
          
          if (timeUntilExpiry > 0) {
            console.log('✅ Token Gmail valido trovato, impostazione...');
            window.gapi.client.setToken({ access_token: savedToken.access_token });
            setIsAuthenticated(true);
            
            // Se il token scade presto, prova a refresharlo
            if (timeUntilExpiry < 600000) {
              refreshAccessToken();
            }
          } else {
            console.log('⏰ Token Gmail scaduto, tentativo refresh...');
            refreshAccessToken();
          }
        }

      } catch (err) {
        console.error('❌ Errore inizializzazione Gmail API:', err);
        setError(`Errore inizializzazione Gmail: ${err.message}`);
      }
    };

    initializeGmailAPI();
  }, []);

  // 🆕 CONTROLLO PERIODICO TOKEN
  useEffect(() => {
    if (!isAuthenticated) return;

    // Log status all'avvio
    logTokenStatus();

    // Controlla ogni 5 minuti
    const interval = setInterval(() => {
      checkTokenValidity();
      logTokenStatus();
    }, 5 * 60 * 1000);
    
    // Controlla anche subito
    checkTokenValidity();
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // 🆕 FUNZIONE LOGIN MIGLIORATA
  const signIn = async () => {
    if (!tokenClient) {
      setError('Token client Gmail non inizializzato');
      return;
    }

    try {
      console.log('🔑 Iniziando processo di login Gmail...');
      
      // Controlla se esiste già un token valido
      const savedToken = loadTokenFromStorage();
      if (savedToken?.access_token) {
        const timeUntilExpiry = savedToken.expires_at - Date.now();
        if (timeUntilExpiry > 0) {
          console.log('✅ Token Gmail già presente e valido');
          window.gapi.client.setToken({ access_token: savedToken.access_token });
          setIsAuthenticated(true);
          return;
        }
      }

      const token = window.gapi?.client?.getToken();
      if (token?.access_token) {
        console.log('✅ Token Gmail già presente in gapi client');
        setIsAuthenticated(true);
        return;
      }

      console.log('🔄 Richiedendo nuovo token Gmail...');
      // ⭐ IMPORTANTE: usa sempre 'consent' per ottenere refresh_token
      tokenClient.requestAccessToken({
        prompt: 'consent'
      });
      
    } catch (err) {
      console.error('❌ Errore durante login Gmail:', err);
      setError(`Errore login Gmail: ${err.message}`);
    }
  };

  // 🆕 FUNZIONE LOGOUT MIGLIORATA
  const signOut = async () => {
    try {
      const savedToken = loadTokenFromStorage();
      if (savedToken?.access_token) {
        window.google?.accounts?.oauth2?.revoke(savedToken.access_token, () => {
          console.log('✅ Token Gmail revocato da Google');
        });
      }
      
      if (window.gapi?.client) {
        window.gapi.client.setToken(null);
      }
      
      clearStoredToken();
      setIsAuthenticated(false);
      setEmails([]);
      console.log('✅ Logout Gmail completato');
      
    } catch (err) {
      console.error('❌ Errore logout Gmail:', err);
    }
  };

  // Carica colori delle etichette
  const fetchLabelColors = async () => {
    if (!isAuthenticated || !window.gapi) {
      return;
    }

    try {
      console.log('🎨 Caricamento colori etichette Gmail...');

      // Carica Gmail API se non presente
      if (!window.gapi.client.gmail) {
        await window.gapi.client.load('gmail', 'v1');
      }

      const response = await makeAuthenticatedRequest(() =>
        window.gapi.client.gmail.users.labels.list({
          userId: 'me'
        })
      );

      const labels = response.result.labels || [];
      const colors = {};
      
      labels.forEach(label => {
        if (label.color) {
          colors[label.id] = {
            backgroundColor: label.color.backgroundColor,
            textColor: label.color.textColor
          };
        }
      });

      setLabelColors(colors);
      console.log('🎨 Colori etichette caricati:', Object.keys(colors).length);

    } catch (error) {
      console.error('❌ Errore caricamento colori etichette:', error);
    }
  };

  // Fetch delle email CON RETRY AUTOMATICO
  const fetchRecentEmails = async (maxResults = 5) => {
    if (!isAuthenticated || !window.gapi) {
      console.log('⚠️ Gmail non pronto per fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📧 Caricamento Gmail API...');

      // Carica Gmail API se non presente
      if (!window.gapi.client.gmail) {
        await window.gapi.client.load('gmail', 'v1');
        console.log('✅ Gmail API caricata');
      }

      console.log('📧 Recuperando lista email...');

      const response = await makeAuthenticatedRequest(() =>
        window.gapi.client.gmail.users.messages.list({
          userId: 'me',
          maxResults: maxResults,
          q: 'in:inbox'
        })
      );

      const messages = response.result.messages || [];
      
      if (messages.length === 0) {
        setEmails([]);
        setLoading(false);
        return;
      }

      console.log('📧 Caricando dettagli di', messages.length, 'email...');

      // Carica dettagli delle email in parallelo CON RETRY
      const emailPromises = messages.map(message =>
        makeAuthenticatedRequest(() =>
          window.gapi.client.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          })
        )
      );

      const emailResponses = await Promise.all(emailPromises);
      const detailedEmails = emailResponses.map(response => {
        const email = response.result;
        const headers = email.payload?.headers || [];
        
        // Estrai informazioni utili
        const subject = headers.find(h => h.name === 'Subject')?.value || 'Nessun oggetto';
        const from = headers.find(h => h.name === 'From')?.value || 'Mittente sconosciuto';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        const messageId = headers.find(h => h.name === 'Message-ID')?.value || '';
        
        // Estrai snippet e stato
        const snippet = email.snippet || '';
        const isUnread = email.labelIds?.includes('UNREAD') || false;
        const isImportant = email.labelIds?.includes('IMPORTANT') || false;
        
        return {
          id: email.id,
          threadId: email.threadId,
          subject,
          from,
          date,
          messageId,
          snippet,
          isUnread,
          isImportant,
          labelIds: email.labelIds || [],
          internalDate: email.internalDate
        };
      });

      console.log('✅ Email caricate:', detailedEmails.length);
      setEmails(detailedEmails);

    } catch (error) {
      console.error('❌ Errore caricamento email:', error);
      setError('Errore caricamento email');
    } finally {
      setLoading(false);
    }
  };

  // AZIONI RAPIDE EMAIL CON RETRY
  const markAsRead = async (messageId) => {
    console.log('📧 markAsRead chiamata per:', messageId);
    try {
      if (!window.gapi?.client?.gmail) {
        await window.gapi.client.load('gmail', 'v1');
      }

      console.log('📧 Modificando etichette email...');
      await makeAuthenticatedRequest(() =>
        window.gapi.client.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          removeLabelIds: ['UNREAD']
        })
      );

      // Aggiorna lo stato locale
      setEmails(prev => prev.map(email => 
        email.id === messageId 
          ? { ...email, isUnread: false, labelIds: email.labelIds.filter(id => id !== 'UNREAD') }
          : email
      ));

      console.log('✅ Email marcata come letta');
      return true;

    } catch (error) {
      console.error('❌ Errore markAsRead:', error);
      return false;
    }
  };

  const archiveEmail = async (messageId) => {
    console.log('📧 archiveEmail chiamata per:', messageId);
    try {
      if (!window.gapi?.client?.gmail) {
        await window.gapi.client.load('gmail', 'v1');
      }

      console.log('📧 Archiviando email...');
      await makeAuthenticatedRequest(() =>
        window.gapi.client.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          removeLabelIds: ['INBOX']
        })
      );

      // Rimuovi dall'elenco locale
      setEmails(prev => prev.filter(email => email.id !== messageId));

      console.log('✅ Email archiviata');
      return true;

    } catch (error) {
      console.error('❌ Errore archiveEmail:', error);
      return false;
    }
  };

  // Funzioni di utilità (mantenute uguali)
  const formatEmailDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return 'Oggi';
      } else if (diffDays === 2) {
        return 'Ieri';
      } else if (diffDays <= 7) {
        return `${diffDays - 1} giorni fa`;
      } else {
        return date.toLocaleDateString('it-IT');
      }
    } catch (error) {
      return dateString;
    }
  };

  const getUnreadCount = () => {
    return emails.filter(email => email.isUnread).length;
  };

  // Auto-fetch email quando autenticato
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentEmails();
      fetchLabelColors();
    }
  }, [isAuthenticated]);

  return {
    // Dati
    emails,
    loading,
    error,
    isAuthenticated,
    isReady,
    labelColors,

    // Azioni
    signIn,
    signOut,
    fetchRecentEmails,
    
    // Azioni email
    markAsRead,
    archiveEmail,
    
    // Utilità
    formatEmailDate,
    getUnreadCount,
    
    // 🆕 Debug e manutenzione
    logTokenStatus,
    refreshAccessToken
  };
};