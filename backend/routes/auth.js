const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const { runQuery, getOne, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configurazione JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Registrazione utente
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    // Validazione input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const { email, name, password } = req.body;

    // Controlla se l'utente esiste già
    const existingUser = await getOne(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(409).json({
        error: 'Email già registrata'
      });
    }

    // Hash della password
    const passwordHash = await bcrypt.hash(password, 12);

    // Crea nuovo utente
    const result = await runQuery(`
      INSERT INTO users (email, name, password_hash)
      VALUES (?, ?, ?)
    `, [email, name, passwordHash]);

    const userId = result.id;

    // Crea token JWT
    const token = jwt.sign(
      { userId, email, name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Crea sessione
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 giorni

    await runQuery(`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `, [sessionId, userId, expiresAt.toISOString()]);

    // Crea lista di esempio
    await runQuery(`
      INSERT INTO lists (user_id, name, color, description)
      VALUES (?, ?, ?, ?)
    `, [userId, 'I Miei Task', '#3B82F6', 'Lista creata automaticamente per iniziare']);

    console.log(`✅ Nuovo utente registrato: ${email}`);

    res.status(201).json({
      message: 'Registrazione completata',
      user: {
        id: userId,
        email,
        name,
        theme: 'light',
        soundEnabled: true,
        selectedRssSource: 'techcrunch'
      },
      token,
      sessionId
    });

  } catch (error) {
    console.error('❌ Errore registrazione:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// Login utente
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    // Validazione input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Trova utente
    const user = await getOne(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Credenziali non valide'
      });
    }

    // Verifica password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenziali non valide'
      });
    }

    // Crea token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Rimuovi sessioni scadute
    await runQuery(
      'DELETE FROM user_sessions WHERE expires_at < ?',
      [new Date().toISOString()]
    );

    // Crea nuova sessione
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await runQuery(`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `, [sessionId, user.id, expiresAt.toISOString()]);

    console.log(`✅ Login utente: ${email}`);

    res.json({
      message: 'Login effettuato',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        theme: user.theme,
        soundEnabled: user.sound_enabled,
        selectedRssSource: user.selected_rss_source
      },
      token,
      sessionId
    });

  } catch (error) {
    console.error('❌ Errore login:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// Login con Google
router.post('/google-login', [
  body('googleId').exists(),
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const { googleId, email, name, avatarUrl } = req.body;

    // Controlla se l'utente esiste già
    let user = await getOne(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [googleId, email]
    );

    if (user) {
      // Aggiorna info se necessario
      if (!user.google_id) {
        await runQuery(
          'UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?',
          [googleId, avatarUrl, user.id]
        );
        user.google_id = googleId;
        user.avatar_url = avatarUrl;
      }
    } else {
      // Crea nuovo utente
      const result = await runQuery(`
        INSERT INTO users (email, name, google_id, avatar_url)
        VALUES (?, ?, ?, ?)
      `, [email, name, googleId, avatarUrl]);

      user = {
        id: result.id,
        email,
        name,
        google_id: googleId,
        avatar_url: avatarUrl,
        theme: 'light',
        sound_enabled: true,
        selected_rss_source: 'techcrunch'
      };

      // Crea lista di esempio
      await runQuery(`
        INSERT INTO lists (user_id, name, color, description)
        VALUES (?, ?, ?, ?)
      `, [user.id, 'I Miei Task', '#3B82F6', 'Lista creata automaticamente per iniziare']);

      console.log(`✅ Nuovo utente Google: ${email}`);
    }

    // Crea token e sessione
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await runQuery(`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `, [sessionId, user.id, expiresAt.toISOString()]);

    console.log(`✅ Login Google: ${email}`);

    res.json({
      message: 'Login Google effettuato',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        theme: user.theme,
        soundEnabled: user.sound_enabled,
        selectedRssSource: user.selected_rss_source
      },
      token,
      sessionId
    });

  } catch (error) {
    console.error('❌ Errore login Google:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    
    if (sessionId) {
      await runQuery(
        'DELETE FROM user_sessions WHERE id = ?',
        [sessionId]
      );
    }

    console.log(`✅ Logout utente: ${req.user.email}`);

    res.json({
      message: 'Logout effettuato'
    });

  } catch (error) {
    console.error('❌ Errore logout:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// Verifica token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Ottieni dati utente aggiornati
    const user = await getOne(
      'SELECT * FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Utente non trovato'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        theme: user.theme,
        soundEnabled: user.sound_enabled,
        selectedRssSource: user.selected_rss_source
      }
    });

  } catch (error) {
    console.error('❌ Errore verifica token:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Crea nuovo token
    const newToken = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email, 
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token: newToken,
      message: 'Token aggiornato'
    });

  } catch (error) {
    console.error('❌ Errore refresh token:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// Ottieni sessioni attive
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await getAll(`
      SELECT 
        id,
        created_at,
        expires_at,
        CASE WHEN expires_at > datetime('now') THEN 'active' ELSE 'expired' END as status
      FROM user_sessions 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.userId]);

    res.json({
      sessions
    });

  } catch (error) {
    console.error('❌ Errore ottenimento sessioni:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// Revoca sessione specifica
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await runQuery(
      'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
      [sessionId, req.user.userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Sessione non trovata'
      });
    }

    res.json({
      message: 'Sessione revocata'
    });

  } catch (error) {
    console.error('❌ Errore revoca sessione:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// Revoca tutte le sessioni (tranne quella corrente)
router.post('/revoke-all-sessions', authenticateToken, async (req, res) => {
  try {
    const currentSessionId = req.headers['x-session-id'];
    
    let query = 'DELETE FROM user_sessions WHERE user_id = ?';
    let params = [req.user.userId];
    
    if (currentSessionId) {
      query += ' AND id != ?';
      params.push(currentSessionId);
    }

    const result = await runQuery(query, params);

    res.json({
      message: `${result.changes} sessioni revocate`,
      revokedCount: result.changes
    });

  } catch (error) {
    console.error('❌ Errore revoca tutte le sessioni:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

module.exports = router;