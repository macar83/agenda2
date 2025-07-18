import { useState, useEffect } from 'react';

// RSS Sources configuration
export const RSS_SOURCES = [
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    color: 'orange'
  },
  {
    id: 'wired',
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    color: 'black'
  },
   {
    id: 'theverge',
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    color: 'purple'
  },
 {
  id: 'sole24ore-italia',
  name: 'Il Sole 24 Ore - Italia',
  url: 'https://www.ilsole24ore.com/rss/italia.xml',
  color: 'purple'
},
{
  id: 'sole24ore-economia',
  name: 'Il Sole 24 Ore - Economia',
  url: 'https://www.ilsole24ore.com/rss/economia.xml',
  color: 'red'
}
];

export const DEFAULT_RSS_SOURCE = 'techcrunch';

export const useNewsRSS = (selectedSourceId = DEFAULT_RSS_SOURCE) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedSource = RSS_SOURCES.find(source => source.id === selectedSourceId) || RSS_SOURCES[0];

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📰 Fetching RSS news from:', selectedSource.name);
        
        // Prova diversi servizi RSS-to-JSON in ordine di priorità
        const rssServices = [
          // Servizio 1: RSS feed diretti con proxy CORS pubblico
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(selectedSource.url)}`,
          
          // Servizio 2: thingproxy.freeboard.io
          `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(selectedSource.url)}`,
          
          // Servizio 3: crossorigin.me (backup)
          `https://crossorigin.me/${selectedSource.url}`,
          
          // Servizio 4: rss2json come ultimo tentativo
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(selectedSource.url)}&count=8&api_key=`,
        ];

        let lastError = null;
        
        for (const serviceUrl of rssServices) {
          try {
            console.log('🔄 Trying RSS service:', serviceUrl);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(serviceUrl, {
              signal: controller.signal,
              method: 'GET',
              headers: {
                'Accept': '*/*',
                'Origin': window.location.origin,
                'Referer': window.location.href
              },
              mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            console.log('📄 Response content type:', contentType);
            
            const text = await response.text();
            
            // Prova prima a parsare come JSON
            try {
              const jsonData = JSON.parse(text);
              if (jsonData.status === 'ok' && jsonData.items) {
                // Formato rss2json
                const cleanedNews = jsonData.items.map(item => ({
                  title: item.title?.trim() || 'Titolo non disponibile',
                  link: item.link || '#',
                  publishedAt: item.pubDate || new Date().toISOString(),
                  description: item.description
                    ?.replace(/<[^>]*>/g, '')
                    ?.replace(/&[^;]+;/g, '')
                    ?.substring(0, 150)
                    ?.trim() + '...' || 'Descrizione non disponibile',
                  author: item.author || selectedSource.name
                }));
                
                setNews(cleanedNews);
                console.log('✅ RSS news loaded from JSON:', cleanedNews.length, 'articles');
                return;
              }
            } catch (jsonError) {
              // Non è JSON, prova XML
            }
            
            // Parse come XML
            if (text.includes('<rss') || text.includes('<feed') || text.includes('<item')) {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(text, 'text/xml');
              
              // Controlla errori di parsing
              const parseError = xmlDoc.querySelector('parsererror');
              if (parseError) {
                throw new Error('Invalid XML format');
              }
              
              const items = xmlDoc.querySelectorAll('item, entry');
              if (items.length === 0) {
                throw new Error('No RSS items found');
              }
              
              const cleanedNews = Array.from(items).slice(0, 8).map(item => {
                const title = item.querySelector('title')?.textContent?.trim();
                const link = item.querySelector('link')?.textContent?.trim() || 
                            item.querySelector('link')?.getAttribute('href');
                const description = item.querySelector('description, summary')?.textContent
                  ?.replace(/<[^>]*>/g, '')
                  ?.replace(/&[^;]+;/g, '')
                  ?.substring(0, 150)
                  ?.trim();
                const pubDate = item.querySelector('pubDate, published, updated')?.textContent?.trim();
                
                return {
                  title: title || 'Titolo non disponibile',
                  link: link || '#',
                  publishedAt: pubDate || new Date().toISOString(),
                  description: (description || 'Descrizione non disponibile') + '...',
                  author: selectedSource.name
                };
              });
              
              setNews(cleanedNews);
              console.log('✅ RSS news loaded from XML:', cleanedNews.length, 'articles');
              return;
            }
            
            throw new Error('Response is neither valid JSON nor XML');
            
          } catch (serviceError) {
            console.warn('⚠️ RSS service failed:', serviceError.message);
            lastError = serviceError;
            continue; // Prova il prossimo servizio
          }
        }
        
        // Se arriviamo qui, tutti i servizi sono falliti
        throw lastError || new Error('All RSS services failed');
        
      } catch (err) {
        console.error('❌ RSS fetch error:', err);
        setError(`Errore nel caricamento delle notizie: ${err.message}`);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    
    // Aggiorna ogni 20 minuti
    const interval = setInterval(fetchNews, 20 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [selectedSource.url, selectedSource.name]);

  return { 
    news, 
    loading, 
    error, 
    selectedSource,
    sources: RSS_SOURCES
  };
};