const jwt = require('jsonwebtoken');
const { getOne } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware per verificare il token JWT
const authenticateToken = async (req, res, next) => {
  try {
    // Ottieni token dall'header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Token di accesso richiesto'
      });
    }

    // Verifica il token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Controlla se l'utente esiste ancora
    const user = await getOne(
      'SELECT id, email, name FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Utente non valido'
      });
    }

    // Verifica sessione se presente
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      const session = await getOne(`
        SELECT id FROM user_sessions 
        WHERE id = ? AND user_id = ? AND expires_at > datetime('now')
      `, [sessionId, user.id]);

      if (!session) {
        return res.status(401).json({
          error: 'Sessione scaduta o non valida'
        });
      }
    }

    // Aggiungi user info al request
    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name
    };

    next();

  } catch (error) {
    console.error('❌ Errore autenticazione:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token non valido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token scaduto'
      });
    }

    return res.status(500).json({
      error: 'Errore interno del server'
    });
  }
};

// Middleware opzionale per autenticazione (non blocca se non autenticato)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await getOne(
        'SELECT id, email, name FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (user) {
        req.user = {
          userId: user.id,
          email: user.email,
          name: user.name
        };
      }
    }

    next();

  } catch (error) {
    // In caso di errore, continua senza autenticazione
    next();
  }
};

// Middleware per verificare che l'utente sia proprietario della risorsa
const checkResourceOwnership = (resourceType, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      const userId = req.user.userId;

      let query;
      let params;

      switch (resourceType) {
        case 'list':
          query = 'SELECT user_id FROM lists WHERE id = ?';
          params = [resourceId];
          break;
        case 'task':
          query = 'SELECT user_id FROM tasks WHERE id = ?';
          params = [resourceId];
          break;
        default:
          return res.status(400).json({
            error: 'Tipo di risorsa non supportato'
          });
      }

      const resource = await getOne(query, params);

      if (!resource) {
        return res.status(404).json({
          error: `${resourceType} non trovata`
        });
      }

      if (resource.user_id !== userId) {
        return res.status(403).json({
          error: 'Non hai i permessi per accedere a questa risorsa'
        });
      }

      next();

    } catch (error) {
      console.error('❌ Errore verifica ownership:', error);
      res.status(500).json({
        error: 'Errore interno del server'
      });
    }
  };
};

// Middleware per rate limiting personalizzato per utente
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.userId;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Ottieni o crea array delle richieste per questo utente
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);

    // Rimuovi richieste fuori dalla finestra temporale
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    userRequests.set(userId, validRequests);

    // Controlla se ha superato il limite
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Troppe richieste, riprova più tardi',
        resetTime: new Date(validRequests[0] + windowMs).toISOString()
      });
    }

    // Aggiungi questa richiesta
    validRequests.push(now);
    userRequests.set(userId, validRequests);

    next();
  };
};

// Middleware per logging delle attività utente
const logUserActivity = (action, entityType = null) => {
  return async (req, res, next) => {
    try {
      const originalSend = res.send;
      
      res.send = function(data) {
        // Log solo se la richiesta ha avuto successo
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          const { runQuery } = require('../config/database');
          
          const metadata = {
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            ...(req.params.id && { entityId: req.params.id })
          };

          runQuery(`
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
            VALUES (?, ?, ?, ?, ?)
          `, [
            req.user.userId,
            action,
            entityType,
            req.params.id || null,
            JSON.stringify(metadata)
          ]).catch(err => {
            console.error('❌ Errore logging attività:', err);
          });
        }

        originalSend.call(this, data);
      };

      next();

    } catch (error) {
      console.error('❌ Errore middleware logging:', error);
      next();
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  checkResourceOwnership,
  userRateLimit,
  logUserActivity
};