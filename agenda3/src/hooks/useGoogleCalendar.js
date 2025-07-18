import { useState, useEffect, useRef, useCallback } from 'react';

// Configurazione Google Calendar API
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

// CHIAVI LOCALSTORAGE PER PERSISTENZA MIGLIORATA
const GOOGLE_TOKEN_KEY = 'google_calendar_token_v2';
const GOOGLE_REFRESH_TOKEN_KEY = 'google_calendar_refresh_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'google_calendar_token_expiry_v2';
const GOOGLE_AUTH_STATE_KEY = 'google_calendar_auth_state';
const CALENDAR_FILTERS_KEY = 'google_calendar_filters';
const CALENDAR_CUSTOM_NAMES_KEY = 'google_calendar_custom_names';

export const useGoogleCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gapi, setGapi] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);
  
  // STATI PER CALENDARI MULTIPLI
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [selectedCalendars, setSelectedCalendars] = useState(['primary']);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // 🆕 REF PER GESTIONE REFRESH TOKEN
  const refreshIntervalRef = useRef(null);
  const isRefreshingRef = useRef(false);

  // Debug delle credenziali
  console.log('🔧 Google Calendar Config Enhanced:', {
    hasApiKey: !!GOOGLE_API_KEY,
    hasClientId: !!GOOGLE_CLIENT_ID,
    isAuthenticated,
    hasTokenClient: !!tokenClient,
    hasGapi: !!gapi,
    hasStoredAuth: !!localStorage.getItem(GOOGLE_AUTH_STATE_KEY)
  });

  // 🆕 FUNZIONI PERSISTENZA MIGLIORATA
  const saveAuthState = (authData) => {
    try {
      const authState = {
        isAuthenticated: true,
        timestamp: Date.now(),
        tokenExpiry: authData.tokenExpiry,
        hasRefreshToken: !!authData.refresh_token
      };
      
      localStorage.setItem(GOOGLE_AUTH_STATE_KEY, JSON.stringify(authState));
      localStorage.setItem(GOOGLE_TOKEN_KEY, JSON.stringify(authData.token));
      localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, authData.tokenExpiry.toString());
      
      if (authData.refresh_token) {
        localStorage.setItem(GOOGLE_REFRESH_TOKEN_KEY, authData.refresh_token);
      }
      
      console.log('💾 Stato auth Google Calendar salvato:', {
        expiry: new Date(authData.tokenExpiry).toLocaleString(),
        hasRefresh: !!authData.refresh_token
      });
    } catch (error) {
      console.error('❌ Errore salvataggio stato auth:', error);
    }
  };

  const loadAuthState = () => {
    try {
      const authState = localStorage.getItem(GOOGLE_AUTH_STATE_KEY);
      const savedToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
      const savedExpiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
      const refreshToken = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);

      if (!authState || !savedToken || !savedExpiry) {
        console.log('📦 Nessun stato auth salvato');
        return null;
      }

      const parsedState = JSON.parse(authState);
      const expiryTime = parseInt(savedExpiry);
      const now = Date.now();

      // 🆕 MARGINE PIÙ GENEROSO: 30 minuti invece di 5
      const refreshMargin = 30 * 60 * 1000; // 30 minuti

      if (now >= (expiryTime - refreshMargin)) {
        console.log('⏰ Token in scadenza, tentativo refresh...');
        
        if (refreshToken) {
          // Prova a fare refresh del token
          return {
            needsRefresh: true,
            refreshToken: refreshToken,
            oldToken: JSON.parse(savedToken)
          };
        } else {
          console.log('❌ Nessun refresh token disponibile');
          clearAuthState();
          return null;
        }
      }

      console.log('✅ Stato auth valido caricato:', {
        expiry: new Date(expiryTime).toLocaleString(),
        timeLeft: Math.round((expiryTime - now) / (1000 * 60)) + ' minuti'
      });

      return {
        token: JSON.parse(savedToken),
        expiry: expiryTime,
        refreshToken: refreshToken
      };
    } catch (error) {
      console.error('❌ Errore caricamento stato auth:', error);
      clearAuthState();
      return null;
    }
  };

  const clearAuthState = () => {
    localStorage.removeItem(GOOGLE_AUTH_STATE_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    localStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
    console.log('🗑️ Stato auth Google Calendar pulito');
  };

  // 🆕 FUNZIONE PER REFRESH AUTOMATICO TOKEN
  const refreshAccessToken = useCallback(async (refreshToken) => {
    if (isRefreshingRef.current) {
      console.log('🔄 Refresh già in corso, skip...');
      return false;
    }

    isRefreshingRef.current = true;
    
    try {
      console.log('🔄 Tentativo refresh token...');

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();
      
      const newTokenData = {
        token: {
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in || 3600
        },
        tokenExpiry: Date.now() + (tokenData.expires_in * 1000),
        refresh_token: refreshToken // Mantieni quello esistente
      };

      // Salva il nuovo token
      saveAuthState(newTokenData);
      
      // Imposta il nuovo token in GAPI
      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken({
          access_token: tokenData.access_token
        });
      }

      console.log('✅ Token refreshato con successo');
      setError(null);
      return true;

    } catch (error) {
      console.error('❌ Errore refresh token:', error);
      clearAuthState();
      setIsAuthenticated(false);
      setError('Sessione scaduta. Effettua nuovamente il login.');
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // 🆕 SETUP REFRESH AUTOMATICO
  const setupTokenRefresh = useCallback((expiryTime) => {
    // Pulisci interval esistente
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    const now = Date.now();
    const timeUntilRefresh = Math.max(0, expiryTime - now - (20 * 60 * 1000)); // 20 minuti prima

    console.log('⏰ Setup refresh automatico:', {
      expiry: new Date(expiryTime).toLocaleString(),
      refreshIn: Math.round(timeUntilRefresh / (1000 * 60)) + ' minuti'
    });

    // Imposta timer per refresh automatico
    refreshIntervalRef.current = setTimeout(async () => {
      const refreshToken = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
      if (refreshToken && isAuthenticated) {
        console.log('🔄 Refresh automatico token...');
        const success = await refreshAccessToken(refreshToken);
        
        if (success) {
          // Riimposta il timer per il prossimo refresh
          const newExpiry = parseInt(localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY));
          if (newExpiry) {
            setupTokenRefresh(newExpiry);
          }
        }
      }
    }, timeUntilRefresh);
  }, [refreshAccessToken, isAuthenticated]);

  // FUNZIONI PER NOMI PERSONALIZZATI
  const saveCustomNames = (customNames) => {
    try {
      localStorage.setItem(CALENDAR_CUSTOM_NAMES_KEY, JSON.stringify(customNames));
    } catch (error) {
      console.error('❌ Errore salvataggio nomi personalizzati:', error);
    }
  };

  const loadCustomNames = () => {
    try {
      const saved = localStorage.getItem(CALENDAR_CUSTOM_NAMES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('❌ Errore caricamento nomi personalizzati:', error);
      return {};
    }
  };

  const setCustomCalendarName = (calendarId, customName) => {
    const currentCustomNames = loadCustomNames();
    const updatedNames = { ...currentCustomNames, [calendarId]: customName };
    saveCustomNames(updatedNames);
    
    setAvailableCalendars(prev => {
      const updated = prev.map(cal => 
        cal.id === calendarId 
          ? { ...cal, displayName: customName }
          : cal
      );
      return updated;
    });
  };

  // FUNZIONI PER FILTRI CALENDARI
  const saveCalendarFilters = (calendarIds) => {
    try {
      localStorage.setItem(CALENDAR_FILTERS_KEY, JSON.stringify(calendarIds));
    } catch (error) {
      console.error('❌ Errore salvataggio filtri:', error);
    }
  };

  const loadCalendarFilters = () => {
    try {
      const saved = localStorage.getItem(CALENDAR_FILTERS_KEY);
      return saved ? JSON.parse(saved) : ['primary'];
    } catch (error) {
      console.error('❌ Errore caricamento filtri:', error);
      return ['primary'];
    }
  };

  const toggleCalendar = (calendarId) => {
    const newSelection = selectedCalendars.includes(calendarId)
      ? selectedCalendars.filter(id => id !== calendarId)
      : [...selectedCalendars, calendarId];
    
    setSelectedCalendars(newSelection);
    saveCalendarFilters(newSelection);
  };

  const selectAllCalendars = () => {
    const allIds = availableCalendars.map(cal => cal.id);
    setSelectedCalendars(allIds);
    saveCalendarFilters(allIds);
  };

  const selectNoneCalendars = () => {
    setSelectedCalendars([]);
    saveCalendarFilters([]);
  };

  // FILTRO EVENTI FUTURI
  const filterFutureEvents = (eventsList) => {
    const now = new Date();
    
    return eventsList.filter(event => {
      const eventEnd = new Date(event.end);
      
      if (event.allDay) {
        const eventDate = new Date(event.start);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
      } else {
        return eventEnd > now;
      }
    });
  };

  // Carica script GAPI e GIS
  const loadGapiScript = () => {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Impossibile caricare GAPI script'));
      document.body.appendChild(script);
    });
  };

  const loadGisScript = () => {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Impossibile caricare GIS script'));
      document.body.appendChild(script);
    });
  };

  // 🆕 FUNZIONE LOGIN MIGLIORATA
  const signIn = async () => {
    try {
      console.log('🔐 Avvio processo di login migliorato...');
      
      if (!tokenClient) {
        setError('Token client non inizializzato. Ricarica la pagina.');
        return;
      }

      // Controlla stato salvato
      const authState = loadAuthState();
      if (authState && !authState.needsRefresh) {
        console.log('✅ Ripristino da auth salvato...');
        window.gapi.client.setToken({
          access_token: authState.token.access_token
        });
        setIsAuthenticated(true);
        setError(null);
        setupTokenRefresh(authState.expiry);
        return;
      }

      if (authState && authState.needsRefresh) {
        console.log('🔄 Token necessita refresh...');
        const success = await refreshAccessToken(authState.refreshToken);
        if (success) {
          setIsAuthenticated(true);
          const newExpiry = parseInt(localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY));
          setupTokenRefresh(newExpiry);
          return;
        }
      }

      console.log('🔄 Richiedendo nuovo token con refresh capability...');
      setError(null);
      
      // 🆕 RICHIESTA CON REFRESH TOKEN
      tokenClient.requestAccessToken({
        prompt: 'consent',
        include_granted_scopes: true
      });
      
    } catch (err) {
      console.error('❌ Errore durante login:', err);
      setError(`Errore login: ${err.message}`);
    }
  };

  // Funzione per il logout
  const signOut = async () => {
    try {
      console.log('🚪 Logout Google Calendar...');
      
      // Pulisci refresh timer
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      const token = window.gapi?.client?.getToken();
      if (token && token.access_token) {
        // Revoca il token
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          console.log('✅ Token revocato');
        });
        
        window.gapi.client.setToken(null);
      }
      
      clearAuthState();
      setIsAuthenticated(false);
      setEvents([]);
      setAvailableCalendars([]);
      setSelectedCalendars(['primary']);
      setError(null);
      
      console.log('✅ Logout completato');
      
    } catch (err) {
      console.error('❌ Errore durante logout:', err);
    }
  };

  // FETCH CALENDARI DISPONIBILI
  const fetchAvailableCalendars = async () => {
    if (!gapi || !isAuthenticated) return;

    setLoadingCalendars(true);
    
    try {
      const response = await gapi.client.calendar.calendarList.list({
        minAccessRole: 'reader'
      });

      const calendars = response.result.items || [];
      const customNames = loadCustomNames();

      const formattedCalendars = calendars.map(cal => ({
        id: cal.id,
        name: cal.summary,
        displayName: customNames[cal.id] || cal.summary,
        description: cal.description,
        primary: cal.primary === true,
        backgroundColor: cal.backgroundColor || '#1976d2',
        foregroundColor: cal.foregroundColor || '#ffffff',
        accessRole: cal.accessRole,
        selected: cal.selected !== false,
        timeZone: cal.timeZone
      }));

      formattedCalendars.sort((a, b) => {
        if (a.primary) return -1;
        if (b.primary) return 1;
        return a.name.localeCompare(b.name);
      });

      setAvailableCalendars(formattedCalendars);
      
      const savedFilters = loadCalendarFilters();
      setSelectedCalendars(savedFilters);

    } catch (err) {
      console.error('❌ Errore recupero calendari:', err);
      
      // 🆕 GESTIONE AUTOMATICA TOKEN SCADUTO
      if (err.status === 401) {
        const refreshToken = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
        if (refreshToken) {
          console.log('🔄 Token scaduto durante fetch, tentativo refresh...');
          const success = await refreshAccessToken(refreshToken);
          if (success) {
            // Riprova il fetch
            return fetchAvailableCalendars();
          }
        }
      }
      
      setError(`Errore nel caricamento calendari: ${err.message}`);
    } finally {
      setLoadingCalendars(false);
    }
  };

  // FETCH EVENTI CON GESTIONE AUTOMATICA REFRESH
  const fetchWeekEvents = async () => {
    if (!isAuthenticated || !gapi) {
      return;
    }

    if (selectedCalendars.length === 0) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 🆕 CHECK TOKEN AUTOMATICO
      const authState = loadAuthState();
      if (authState && authState.needsRefresh) {
        const success = await refreshAccessToken(authState.refreshToken);
        if (!success) {
          setLoading(false);
          return;
        }
      }

      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      const allEvents = [];
      
      for (const calendarId of selectedCalendars) {
        try {
          const response = await gapi.client.calendar.events.list({
            calendarId: calendarId,
            timeMin: now.toISOString(),
            timeMax: endOfWeek.toISOString(),
            showDeleted: false,
            singleEvents: true,
            maxResults: 50,
            orderBy: 'startTime'
          });

          const events = response.result.items || [];

          const calendarInfo = availableCalendars.find(cal => cal.id === calendarId) || { 
            name: calendarId === 'primary' ? 'Principale' : calendarId,
            backgroundColor: '#1976d2'
          };

          const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.summary || 'Senza titolo',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            allDay: !event.start?.dateTime,
            description: event.description || '',
            location: event.location || '',
            calendarId: calendarId,
            calendarName: calendarInfo.displayName || calendarInfo.name,
            calendarColor: calendarInfo.backgroundColor,
            htmlLink: event.htmlLink,
            status: event.status
          }));

          allEvents.push(...formattedEvents);

        } catch (calError) {
          console.error(`❌ Errore caricamento calendario ${calendarId}:`, calError);
        }
      }

      const futureEvents = filterFutureEvents(allEvents);
      futureEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

      setEvents(futureEvents);

    } catch (err) {
      console.error('❌ Errore caricamento eventi:', err);
      
      // 🆕 GESTIONE AUTOMATICA 401
      if (err.status === 401) {
        const refreshToken = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const success = await refreshAccessToken(refreshToken);
          if (success) {
            return fetchWeekEvents(); // Riprova
          }
        } else {
          setIsAuthenticated(false);
          setError('Sessione scaduta. Effettua nuovamente il login.');
        }
      } else {
        setError(`Errore nel caricamento degli eventi: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // INIZIALIZZAZIONE
  useEffect(() => {
    const initializeGoogleServices = async () => {
      if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
        const missingCreds = [];
        if (!GOOGLE_API_KEY) missingCreds.push('REACT_APP_GOOGLE_API_KEY');
        if (!GOOGLE_CLIENT_ID) missingCreds.push('REACT_APP_GOOGLE_CLIENT_ID');
        
        setError(`Credenziali mancanti: ${missingCreds.join(', ')}`);
        return;
      }

      try {
        await loadGapiScript();
        await loadGisScript();

        await new Promise((resolve, reject) => {
          window.gapi.load('client', {
            callback: resolve,
            onerror: reject
          });
        });

        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });

        setGapi(window.gapi);

        // 🆕 TOKEN CLIENT MIGLIORATO
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            console.log('🔐 Token ricevuto:', response);
            if (response.access_token) {
              window.gapi.client.setToken({
                access_token: response.access_token
              });
              
              // 🆕 SALVA CON PIÙ DATI
              const authData = {
                token: {
                  access_token: response.access_token,
                  expires_in: response.expires_in || 3600
                },
                tokenExpiry: Date.now() + ((response.expires_in || 3600) * 1000),
                refresh_token: response.refresh_token // Potrebbe non essere sempre presente
              };
              
              saveAuthState(authData);
              setIsAuthenticated(true);
              setError(null);
              
              // Setup refresh automatico
              setupTokenRefresh(authData.tokenExpiry);
              
              console.log('✅ Autenticazione completata con persistenza migliorata');
            }
          },
          error_callback: (error) => {
            console.error('❌ Errore OAuth:', error);
            setError(`Errore autenticazione: ${error.type || error.message}`);
            clearAuthState();
          }
        });

        setTokenClient(client);

        // 🆕 AUTO-RESTORE MIGLIORATO
        const authState = loadAuthState();
        if (authState) {
          if (authState.needsRefresh && authState.refreshToken) {
            console.log('🔄 Token salvato necessita refresh...');
            const success = await refreshAccessToken(authState.refreshToken);
            if (success) {
              setIsAuthenticated(true);
              const newExpiry = parseInt(localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY));
              setupTokenRefresh(newExpiry);
            }
          } else if (!authState.needsRefresh) {
            console.log('✅ Ripristino sessione da storage migliorato...');
            window.gapi.client.setToken({
              access_token: authState.token.access_token
            });
            setIsAuthenticated(true);
            setupTokenRefresh(authState.expiry);
          }
        }

        console.log('🎉 Google Calendar API inizializzato con persistenza migliorata');

      } catch (err) {
        console.error('❌ Errore inizializzazione:', err);
        setError(`Errore inizializzazione: ${err.message || err}`);
      }
    };

    initializeGoogleServices();

    // Cleanup al unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [setupTokenRefresh, refreshAccessToken]);

  // Altri useEffect...
  useEffect(() => {
    if (isAuthenticated && gapi) {
      fetchAvailableCalendars();
    }
  }, [isAuthenticated, gapi]);

  useEffect(() => {
    if (isAuthenticated && selectedCalendars.length > 0) {
      fetchWeekEvents();
    }
  }, [isAuthenticated, selectedCalendars]);

  useEffect(() => {
    if (isAuthenticated && selectedCalendars.length > 0) {
      const interval = setInterval(() => {
        fetchWeekEvents();
      }, 10 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, selectedCalendars]);

  // FUNZIONI UTILITY
  const getTodayEvents = () => {
    const today = new Date().toDateString();
    return events.filter(event => {
      const eventDate = new Date(event.start).toDateString();
      return eventDate === today;
    });
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= now && eventDate <= threeDaysLater;
    }).slice(0, 5);
  };

  const getFutureEvents = () => {
    const now = new Date();
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart >= now;
    });
  };

  return {
    // Eventi
    events,
    loading,
    error,
    
    // Autenticazione
    isAuthenticated,
    signIn,
    signOut,
    
    // Calendari multipli
    availableCalendars,
    selectedCalendars,
    loadingCalendars,
    toggleCalendar,
    selectAllCalendars,
    selectNoneCalendars,
    fetchAvailableCalendars,
    setCustomCalendarName,
    
    // Funzioni eventi
    fetchWeekEvents,
    getTodayEvents,
    getUpcomingEvents,
    getFutureEvents,
    refreshEvents: fetchWeekEvents,
    
    // Utility
    filterFutureEvents,
    checkTokenStatus: () => {
      const authState = localStorage.getItem(GOOGLE_AUTH_STATE_KEY);
      return {
        hasAuth: !!authState,
        needsRefresh: authState ? JSON.parse(authState).needsRefresh : false
      };
    }
  };
};