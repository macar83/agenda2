import { useState, useEffect } from 'react';

// Configurazione Google Calendar API
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const CALENDAR_ID = 'primary';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

export const useGoogleCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gapi, setGapi] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);

  // Debug delle credenziali
  console.log('🔧 Google Calendar Config:', {
    hasApiKey: !!GOOGLE_API_KEY,
    hasClientId: !!GOOGLE_CLIENT_ID,
    apiKey: GOOGLE_API_KEY?.substring(0, 10) + '...',
    clientId: GOOGLE_CLIENT_ID?.substring(0, 15) + '...'
  });

  // Inizializza Google API con Google Identity Services (GIS)
  useEffect(() => {
    const initializeGoogleServices = async () => {
      // Verifica credenziali
      if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
        const missingCreds = [];
        if (!GOOGLE_API_KEY) missingCreds.push('REACT_APP_GOOGLE_API_KEY');
        if (!GOOGLE_CLIENT_ID) missingCreds.push('REACT_APP_GOOGLE_CLIENT_ID');
        
        setError(`Credenziali mancanti: ${missingCreds.join(', ')}`);
        console.error('❌ Credenziali Google mancanti:', missingCreds);
        return;
      }

      try {
        // Carica Google API Script (per le API calls)
        await loadGapiScript();
        console.log('✅ GAPI script caricato');

        // Carica Google Identity Services (per l'autenticazione)
        await loadGisScript();
        console.log('✅ GIS script caricato');

        // Inizializza GAPI client per Calendar API
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

        // Inizializza Google Identity Services per OAuth
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            console.log('🔐 Token ricevuto:', response);
            if (response.access_token) {
              // Imposta il token per le chiamate API
              window.gapi.client.setToken({
                access_token: response.access_token
              });
              setIsAuthenticated(true);
              console.log('✅ Autenticazione completata');
            }
          },
          error_callback: (error) => {
            console.error('❌ Errore OAuth:', error);
            setError(`Errore autenticazione: ${error.type}`);
          }
        });

        setTokenClient(client);
        console.log('✅ Token client inizializzato');

        // Controlla se abbiamo già un token valido
        const token = window.gapi.client.getToken();
        if (token && token.access_token) {
          setIsAuthenticated(true);
          console.log('✅ Token esistente trovato');
        }

        console.log('🎉 Google Calendar API completamente inizializzato (GIS)');

      } catch (err) {
        console.error('❌ Errore inizializzazione:', err);
        setError(`Errore inizializzazione: ${err.message || err}`);
      }
    };

    initializeGoogleServices();
  }, []);

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
      
      // Controlla se abbiamo già un token
      const token = window.gapi.client.getToken();
      if (token && token.access_token) {
        console.log('✅ Token già presente, refresh...');
        setIsAuthenticated(true);
        return;
      }

      // Richiedi nuovo token
      tokenClient.requestAccessToken({
        prompt: 'consent' // Forza il consent screen
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
        // Revoca il token
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          console.log('✅ Token revocato');
        });
        
        // Rimuovi il token dal client
        window.gapi.client.setToken(null);
      }
      
      setIsAuthenticated(false);
      setEvents([]);
      console.log('✅ Logout completato');
      
    } catch (err) {
      console.error('❌ Errore durante logout:', err);
    }
  };

  // Funzione per ottenere gli eventi della settimana
  const fetchWeekEvents = async () => {
    if (!isAuthenticated || !gapi) {
      console.log('⚠️ Non autenticato o GAPI non pronto');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calcola inizio e fine settimana
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      console.log('📅 Caricamento eventi da', startOfWeek.toISOString(), 'a', endOfWeek.toISOString());

      const response = await gapi.client.calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: startOfWeek.toISOString(),
        timeMax: endOfWeek.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 20,
        orderBy: 'startTime'
      });

      const items = response.result.items || [];
      
      // Trasforma gli eventi
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
        status: event.status
      }));

      setEvents(formattedEvents);
      console.log('✅ Eventi caricati:', formattedEvents.length);
      
    } catch (err) {
      console.error('❌ Errore caricamento eventi:', err);
      
      // Se il token è scaduto, prova a riautenticare
      if (err.status === 401) {
        console.log('🔄 Token scaduto, riautenticazione necessaria...');
        setIsAuthenticated(false);
        setError('Sessione scaduta. Effettua nuovamente il login.');
      } else {
        setError('Errore nel caricamento degli eventi');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-carica eventi quando autenticato
  useEffect(() => {
    if (isAuthenticated && gapi) {
      fetchWeekEvents();
      
      // Aggiorna ogni 15 minuti
      const interval = setInterval(fetchWeekEvents, 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, gapi]);

  // Utility functions
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
    events,
    loading,
    error,
    isAuthenticated,
    signIn,
    signOut,
    fetchWeekEvents,
    getTodayEvents,
    getUpcomingEvents,
    refreshEvents: fetchWeekEvents
  };
};