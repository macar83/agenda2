import { useState, useEffect } from 'react';

// Configurazione Google Calendar API
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

// CHIAVI LOCALSTORAGE PER PERSISTENZA
const GOOGLE_TOKEN_KEY = 'google_calendar_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'google_calendar_token_expiry';
const CALENDAR_FILTERS_KEY = 'google_calendar_filters';

export const useGoogleCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gapi, setGapi] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);
  
  // 🆕 STATI PER CALENDARI MULTIPLI
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [selectedCalendars, setSelectedCalendars] = useState(['primary']);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Debug delle credenziali
  console.log('🔧 Google Calendar Config:', {
    hasApiKey: !!GOOGLE_API_KEY,
    hasClientId: !!GOOGLE_CLIENT_ID,
    apiKey: GOOGLE_API_KEY?.substring(0, 10) + '...',
    clientId: GOOGLE_CLIENT_ID?.substring(0, 15) + '...'
  });

  // 🆕 FUNZIONE PER SALVARE/CARICARE FILTRI CALENDARI
  const saveCalendarFilters = (calendarIds) => {
    try {
      localStorage.setItem(CALENDAR_FILTERS_KEY, JSON.stringify(calendarIds));
      console.log('💾 Filtri calendari salvati:', calendarIds);
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

  // 🆕 FUNZIONE PER SALVARE TOKEN
  const saveTokenToStorage = (token) => {
    try {
      console.log('💾 Salvando token Google Calendar...');
      localStorage.setItem(GOOGLE_TOKEN_KEY, JSON.stringify(token));
      
      const expiryTime = Date.now() + (token.expires_in ? token.expires_in * 1000 : 3600000);
      localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      console.log('✅ Token salvato, scadenza:', new Date(expiryTime).toLocaleString());
    } catch (error) {
      console.error('❌ Errore salvataggio token:', error);
    }
  };

  // 🆕 FUNZIONE PER CARICARE TOKEN DAL STORAGE
  const loadTokenFromStorage = () => {
    try {
      const savedToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
      const savedExpiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
      
      if (!savedToken || !savedExpiry) {
        console.log('📦 Nessun token salvato trovato');
        return null;
      }

      const expiryTime = parseInt(savedExpiry);
      const now = Date.now();
      
      if (now >= (expiryTime - 300000)) {
        console.log('⏰ Token Google Calendar scaduto, rimozione...');
        clearStoredToken();
        return null;
      }

      const token = JSON.parse(savedToken);
      console.log('✅ Token valido caricato dal storage, scadenza:', new Date(expiryTime).toLocaleString());
      return token;
      
    } catch (error) {
      console.error('❌ Errore caricamento token:', error);
      clearStoredToken();
      return null;
    }
  };

  // 🆕 FUNZIONE PER RIMUOVERE TOKEN DAL STORAGE
  const clearStoredToken = () => {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    console.log('🗑️ Token Google Calendar rimosso dal storage');
  };

  // 🆕 FUNZIONE PER RECUPERARE LISTA CALENDARI
  const fetchAvailableCalendars = async () => {
    if (!isAuthenticated || !gapi) {
      console.log('⚠️ Non autenticato o GAPI non pronto per lista calendari');
      return;
    }

    setLoadingCalendars(true);
    
    try {
      console.log('📋 Recuperando lista calendari...');
      
      const response = await gapi.client.calendar.calendarList.list({
        minAccessRole: 'reader'
      });

      const calendars = response.result.items || [];
      
      // Formatta i calendari con info utili
      const formattedCalendars = calendars.map(cal => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description || '',
        primary: cal.primary || false,
        backgroundColor: cal.backgroundColor || '#4285f4',
        foregroundColor: cal.foregroundColor || '#ffffff',
        accessRole: cal.accessRole,
        selected: cal.selected !== false, // Default true se non specificato
        timeZone: cal.timeZone
      }));

      // Ordina: primary per primo, poi alfabetico
      formattedCalendars.sort((a, b) => {
        if (a.primary) return -1;
        if (b.primary) return 1;
        return a.name.localeCompare(b.name);
      });

      setAvailableCalendars(formattedCalendars);
      
      console.log('✅ Calendari disponibili:', formattedCalendars.map(c => ({
        id: c.id,
        name: c.name,
        primary: c.primary
      })));

      // Carica filtri salvati o imposta default
      const savedFilters = loadCalendarFilters();
      setSelectedCalendars(savedFilters);

    } catch (err) {
      console.error('❌ Errore recupero calendari:', err);
      setError(`Errore nel caricamento calendari: ${err.message}`);
    } finally {
      setLoadingCalendars(false);
    }
  };

  // 🆕 FUNZIONE PER MODIFICARE SELEZIONE CALENDARI
  const toggleCalendar = (calendarId) => {
    const newSelection = selectedCalendars.includes(calendarId)
      ? selectedCalendars.filter(id => id !== calendarId)
      : [...selectedCalendars, calendarId];
    
    setSelectedCalendars(newSelection);
    saveCalendarFilters(newSelection);
    
    console.log('📅 Calendari selezionati aggiornati:', newSelection);
  };

  const selectAllCalendars = () => {
    const allIds = availableCalendars.map(cal => cal.id);
    setSelectedCalendars(allIds);
    saveCalendarFilters(allIds);
    console.log('📅 Tutti i calendari selezionati');
  };

  const selectNoneCalendars = () => {
    setSelectedCalendars([]);
    saveCalendarFilters([]);
    console.log('📅 Nessun calendario selezionato');
  };

  // Inizializza Google API con Google Identity Services (GIS)
  useEffect(() => {
    const initializeGoogleServices = async () => {
      if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
        const missingCreds = [];
        if (!GOOGLE_API_KEY) missingCreds.push('REACT_APP_GOOGLE_API_KEY');
        if (!GOOGLE_CLIENT_ID) missingCreds.push('REACT_APP_GOOGLE_CLIENT_ID');
        
        setError(`Credenziali mancanti: ${missingCreds.join(', ')}`);
        console.error('❌ Credenziali Google mancanti:', missingCreds);
        return;
      }

      try {
        await loadGapiScript();
        console.log('✅ GAPI script caricato');

        await loadGisScript();
        console.log('✅ GIS script caricato');

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

        console.log('✅ GAPI client inizializzato');
        setGapi(window.gapi);

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            console.log('🔐 Token ricevuto:', response);
            if (response.access_token) {
              window.gapi.client.setToken({
                access_token: response.access_token
              });
              
              saveTokenToStorage(response);
              setIsAuthenticated(true);
              console.log('✅ Autenticazione completata e salvata');
            }
          },
          error_callback: (error) => {
            console.error('❌ Errore OAuth:', error);
            setError(`Errore autenticazione: ${error.type}`);
            clearStoredToken();
          }
        });

        setTokenClient(client);
        console.log('✅ Token client inizializzato');

        // Controlla token salvato
        const savedToken = loadTokenFromStorage();
        if (savedToken && savedToken.access_token) {
          console.log('🔄 Ripristino sessione da token salvato...');
          window.gapi.client.setToken({
            access_token: savedToken.access_token
          });
          setIsAuthenticated(true);
          console.log('✅ Sessione ripristinata da storage');
        } else {
          const token = window.gapi.client.getToken();
          if (token && token.access_token) {
            setIsAuthenticated(true);
            console.log('✅ Token esistente trovato in gapi client');
          }
        }

        console.log('🎉 Google Calendar API completamente inizializzato (Multi-Calendar)');

      } catch (err) {
        console.error('❌ Errore inizializzazione:', err);
        setError(`Errore inizializzazione: ${err.message || err}`);
      }
    };

    initializeGoogleServices();
  }, []);

  // 🆕 CARICA CALENDARI QUANDO AUTENTICATO
  useEffect(() => {
    if (isAuthenticated && gapi) {
      fetchAvailableCalendars();
    }
  }, [isAuthenticated, gapi]);

  // Carica GAPI script
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

  // Carica Google Identity Services script
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

  // Funzione per il login
  const signIn = async () => {
    try {
      if (!tokenClient) {
        setError('Token client non inizializzato');
        return;
      }

      console.log('🔐 Avvio processo di login...');
      
      const savedToken = loadTokenFromStorage();
      if (savedToken && savedToken.access_token) {
        console.log('✅ Token valido già presente, utilizzando quello...');
        window.gapi.client.setToken({
          access_token: savedToken.access_token
        });
        setIsAuthenticated(true);
        return;
      }

      const token = window.gapi.client.getToken();
      if (token && token.access_token) {
        console.log('✅ Token già presente in gapi client, refresh...');
        setIsAuthenticated(true);
        return;
      }

      console.log('🔄 Richiedendo nuovo token...');
      tokenClient.requestAccessToken({
        prompt: 'consent'
      });
      
    } catch (err) {
      console.error('❌ Errore durante login:', err);
      setError(`Errore login: ${err.message}`);
    }
  };

  // Funzione per il logout
  const signOut = async () => {
    try {
      const token = window.gapi.client.getToken();
      if (token) {
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          console.log('✅ Token revocato');
        });
        
        window.gapi.client.setToken(null);
      }
      
      clearStoredToken();
      setIsAuthenticated(false);
      setEvents([]);
      setAvailableCalendars([]);
      setSelectedCalendars(['primary']);
      console.log('✅ Logout completato e dati puliti');
      
    } catch (err) {
      console.error('❌ Errore durante logout:', err);
    }
  };

  // 🆕 FUNZIONE AGGIORNATA PER FETCH MULTI-CALENDARIO
  const fetchWeekEvents = async () => {
    if (!isAuthenticated || !gapi) {
      console.log('⚠️ Non autenticato o GAPI non pronto');
      return;
    }

    if (selectedCalendars.length === 0) {
      console.log('⚠️ Nessun calendario selezionato');
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verifica che il token sia ancora valido
      const savedToken = loadTokenFromStorage();
      if (!savedToken) {
        console.log('⚠️ Token scaduto durante fetch, reautenticazione necessaria');
        setIsAuthenticated(false);
        setError('Sessione scaduta. Effettua nuovamente il login.');
        setLoading(false);
        return;
      }

      // Calcola inizio e fine settimana
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      console.log('📅 Caricamento eventi da', startOfWeek.toISOString(), 'a', endOfWeek.toISOString());
      console.log('📅 Calendari selezionati:', selectedCalendars);

      // 🆕 FETCH DA CALENDARI MULTIPLI
      const allEvents = [];
      
      for (const calendarId of selectedCalendars) {
        try {
          console.log(`📅 Caricando eventi da calendario: ${calendarId}`);
          
          const response = await gapi.client.calendar.events.list({
            calendarId: calendarId,
            timeMin: startOfWeek.toISOString(),
            timeMax: endOfWeek.toISOString(),
            showDeleted: false,
            singleEvents: true,
            maxResults: 50,
            orderBy: 'startTime'
          });

          const items = response.result.items || [];
          
          // Trova info calendario per aggiungere colore
          const calendarInfo = availableCalendars.find(cal => cal.id === calendarId);
          
          // Trasforma gli eventi aggiungendo info sul calendario
          const formattedEvents = items.map(event => ({
            id: event.id,
            title: event.summary || 'Evento senza titolo',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            allDay: !event.start.dateTime,
            description: event.description || '',
            location: event.location || '',
            attendees: event.attendees || [],
            creator: event.creator,
            htmlLink: event.htmlLink,
            status: event.status,
            // 🆕 INFO CALENDARIO
            calendarId: calendarId,
            calendarName: calendarInfo?.name || calendarId,
            calendarColor: calendarInfo?.backgroundColor || '#4285f4'
          }));

          allEvents.push(...formattedEvents);
          
          console.log(`✅ ${formattedEvents.length} eventi caricati da ${calendarInfo?.name || calendarId}`);
          
        } catch (calErr) {
          console.error(`❌ Errore caricamento calendario ${calendarId}:`, calErr);
          // Continua con gli altri calendari anche se uno fallisce
        }
      }

      // Ordina tutti gli eventi per data
      allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

      setEvents(allEvents);
      console.log('✅ Eventi totali caricati:', allEvents.length, 'da', selectedCalendars.length, 'calendari');
      
    } catch (err) {
      console.error('❌ Errore caricamento eventi:', err);
      
      if (err.status === 401) {
        console.log('🔄 Token scaduto, rimozione e riautenticazione necessaria...');
        clearStoredToken();
        setIsAuthenticated(false);
        setError('Sessione scaduta. Effettua nuovamente il login.');
      } else {
        setError(`Errore nel caricamento degli eventi: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh eventi quando cambiano i calendari selezionati
  useEffect(() => {
    if (isAuthenticated && selectedCalendars.length > 0) {
      fetchWeekEvents();
    }
  }, [isAuthenticated, selectedCalendars]);

  // Auto-refresh eventi ogni 10 minuti se autenticato
  useEffect(() => {
    if (isAuthenticated && selectedCalendars.length > 0) {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh eventi Google Calendar...');
        fetchWeekEvents();
      }, 10 * 60 * 1000); // 10 minuti

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, selectedCalendars]);

  // FUNZIONI UTILITY PER FILTRARE EVENTI
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
    
    // Funzioni eventi
    fetchWeekEvents,
    getTodayEvents,
    getUpcomingEvents,
    refreshEvents: fetchWeekEvents,
    
    // Utility
    checkTokenStatus: () => {
      const savedToken = loadTokenFromStorage();
      return {
        hasToken: !!savedToken,
        isExpired: !savedToken
      };
    }
  };
};