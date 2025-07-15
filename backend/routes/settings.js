const express = require('express');
const { body, validationResult } = require('express-validator');
const { runQuery, getOne, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Applica autenticazione a tutte le routes
router.use(authenticateToken);

// GET /api/settings - Ottieni tutte le impostazioni utente
router.get('/', async (req, res) => {
  try {
    // Ottieni impostazioni dal profilo utente
    const userProfile = await getOne(`
      SELECT theme, sound_enabled, selected_rss_source
      FROM users WHERE id = ?
    `, [req.user.userId]);

    // Ottieni impostazioni personalizzate
    const customSettings = await getAll(`
      SELECT setting_key, setting_value
      FROM user_settings WHERE user_id = ?
    `, [req.user.userId]);

    // Combina impostazioni del profilo e personalizzate
    const settings = {
      // Impostazioni del profilo
      theme: userProfile.theme || 'light',
      soundEnabled: Boolean(userProfile.sound_enabled),
      selectedRssSource: userProfile.selected_rss_source || 'techcrunch',
      
      // Impostazioni personalizzate (convertite da array a oggetto)
      ...customSettings.reduce((acc, setting) => {
        // Prova a parsare come JSON, altrimenti mantieni come stringa
        try {
          acc[setting.setting_key] = JSON.parse(setting.setting_value);
        } catch {
          acc[setting.setting_key] = setting.setting_value;
        }
        return acc;
      }, {})
    };

    res.json({
      settings
    });

  } catch (error) {
    console.error('❌ Errore ottenimento impostazioni:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// PUT /api/settings - Aggiorna impostazioni utente
router.put('/', [
  body('theme').optional().isIn(['light', 'dark']),
  body('soundEnabled').optional().isBoolean(),
  body('selectedRssSource').optional().trim().isLength({ min: 1, max: 50 }),
  body('notificationsEnabled').optional().isBoolean(),
  body('dailyGoal').optional().isInt({ min: 1, max: 100 }),
  body('weekStart').optional().isIn(['sunday', 'monday']),
  body('timeFormat').optional().isIn(['12h', '24h']),
  body('dateFormat').optional().isIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  body('autoDeleteCompleted').optional().isBoolean(),
  body('autoDeleteDays').optional().isInt({ min: 1, max: 365 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const updates = req.body;
    
    // Impostazioni che vanno nella tabella users
    const profileSettings = ['theme', 'soundEnabled', 'selectedRssSource'];
    const profileUpdates = {};
    const customUpdates = {};

    // Separa impostazioni del profilo da quelle personalizzate
    Object.entries(updates).forEach(([key, value]) => {
      if (profileSettings.includes(key)) {
        profileUpdates[key] = value;
      } else {
        customUpdates[key] = value;
      }
    });

    // Aggiorna impostazioni del profilo se presenti
    if (Object.keys(profileUpdates).length > 0) {
      const updateFields = [];
      const params = [];

      Object.entries(profileUpdates).forEach(([key, value]) => {
        switch (key) {
          case 'theme':
            updateFields.push('theme = ?');
            params.push(value);
            break;
          case 'soundEnabled':
            updateFields.push('sound_enabled = ?');
            params.push(value ? 1 : 0);
            break;
          case 'selectedRssSource':
            updateFields.push('selected_rss_source = ?');
            params.push(value);
            break;
        }
      });

      if (updateFields.length > 0) {
        params.push(req.user.userId);
        await runQuery(`
          UPDATE users 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `, params);
      }
    }

    // Aggiorna impostazioni personalizzate
    for (const [key, value] of Object.entries(customUpdates)) {
      const settingValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);

      // Usa INSERT OR REPLACE per SQLite (equivalente a UPSERT)
      await runQuery(`
        INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value)
        VALUES (?, ?, ?)
      `, [req.user.userId, key, settingValue]);
    }

    // Ottieni impostazioni aggiornate
    const userProfile = await getOne(`
      SELECT theme, sound_enabled, selected_rss_source
      FROM users WHERE id = ?
    `, [req.user.userId]);

    const customSettings = await getAll(`
      SELECT setting_key, setting_value
      FROM user_settings WHERE user_id = ?
    `, [req.user.userId]);

    const updatedSettings = {
      theme: userProfile.theme,
      soundEnabled: Boolean(userProfile.sound_enabled),
      selectedRssSource: userProfile.selected_rss_source,
      ...customSettings.reduce((acc, setting) => {
        try {
          acc[setting.setting_key] = JSON.parse(setting.setting_value);
        } catch {
          acc[setting.setting_key] = setting.setting_value;
        }
        return acc;
      }, {})
    };

    console.log(`✅ Impostazioni aggiornate per utente: ${req.user.email}`);

    res.json({
      message: 'Impostazioni aggiornate con successo',
      settings: updatedSettings
    });

  } catch (error) {
    console.error('❌ Errore aggiornamento impostazioni:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// GET /api/settings/:key - Ottieni singola impostazione
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    // Controlla prima nelle impostazioni del profilo
    const profileSettings = ['theme', 'soundEnabled', 'selectedRssSource'];
    
    if (profileSettings.includes(key)) {
      const columnMap = {
        'theme': 'theme',
        'soundEnabled': 'sound_enabled', 
        'selectedRssSource': 'selected_rss_source'
      };
      
      const user = await getOne(`
        SELECT ${columnMap[key]} as value
        FROM users WHERE id = ?
      `, [req.user.userId]);

      if (user) {
        let value = user.value;
        if (key === 'soundEnabled') {
          value = Boolean(value);
        }
        
        return res.json({
          key,
          value
        });
      }
    }

    // Controlla nelle impostazioni personalizzate
    const setting = await getOne(`
      SELECT setting_value
      FROM user_settings 
      WHERE user_id = ? AND setting_key = ?
    `, [req.user.userId, key]);

    if (setting) {
      let value;
      try {
        value = JSON.parse(setting.setting_value);
      } catch {
        value = setting.setting_value;
      }

      res.json({
        key,
        value
      });
    } else {
      res.status(404).json({
        error: 'Impostazione non trovata'
      });
    }

  } catch (error) {
    console.error('❌ Errore ottenimento impostazione:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// PUT /api/settings/:key - Aggiorna singola impostazione
router.put('/:key', [
  body('value').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Valore richiesto',
        details: errors.array()
      });
    }

    const { key } = req.params;
    const { value } = req.body;

    // Validazione specifica per chiave
    const validations = {
      theme: (v) => ['light', 'dark'].includes(v),
      soundEnabled: (v) => typeof v === 'boolean',
      selectedRssSource: (v) => typeof v === 'string' && v.length > 0,
      notificationsEnabled: (v) => typeof v === 'boolean',
      dailyGoal: (v) => Number.isInteger(v) && v >= 1 && v <= 100,
      weekStart: (v) => ['sunday', 'monday'].includes(v),
      timeFormat: (v) => ['12h', '24h'].includes(v),
      dateFormat: (v) => ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(v),
      autoDeleteCompleted: (v) => typeof v === 'boolean',
      autoDeleteDays: (v) => Number.isInteger(v) && v >= 1 && v <= 365
    };

    if (validations[key] && !validations[key](value)) {
      return res.status(400).json({
        error: `Valore non valido per ${key}`
      });
    }

    // Aggiorna impostazione
    const profileSettings = ['theme', 'soundEnabled', 'selectedRssSource'];
    
    if (profileSettings.includes(key)) {
      // Aggiorna nel profilo utente
      const columnMap = {
        'theme': 'theme',
        'soundEnabled': 'sound_enabled',
        'selectedRssSource': 'selected_rss_source'
      };

      const column = columnMap[key];
      const dbValue = key === 'soundEnabled' ? (value ? 1 : 0) : value;

      await runQuery(`
        UPDATE users SET ${column} = ? WHERE id = ?
      `, [dbValue, req.user.userId]);
    } else {
      // Aggiorna nelle impostazioni personalizzate
      const settingValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);

      await runQuery(`
        INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value)
        VALUES (?, ?, ?)
      `, [req.user.userId, key, settingValue]);
    }

    console.log(`✅ Impostazione ${key} aggiornata per utente: ${req.user.email}`);

    res.json({
      message: 'Impostazione aggiornata con successo',
      key,
      value
    });

  } catch (error) {
    console.error('❌ Errore aggiornamento impostazione:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// DELETE /api/settings/:key - Elimina impostazione personalizzata
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    // Non permettere eliminazione di impostazioni del profilo
    const profileSettings = ['theme', 'soundEnabled', 'selectedRssSource'];
    if (profileSettings.includes(key)) {
      return res.status(400).json({
        error: 'Impossibile eliminare impostazioni del profilo'
      });
    }

    const result = await runQuery(`
      DELETE FROM user_settings 
      WHERE user_id = ? AND setting_key = ?
    `, [req.user.userId, key]);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Impostazione non trovata'
      });
    }

    console.log(`✅ Impostazione ${key} eliminata per utente: ${req.user.email}`);

    res.json({
      message: 'Impostazione eliminata con successo'
    });

  } catch (error) {
    console.error('❌ Errore eliminazione impostazione:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// POST /api/settings/reset - Reset impostazioni ai valori predefiniti
router.post('/reset', async (req, res) => {
  try {
    // Reset impostazioni del profilo
    await runQuery(`
      UPDATE users 
      SET theme = 'light', sound_enabled = 1, selected_rss_source = 'techcrunch'
      WHERE id = ?
    `, [req.user.userId]);

    // Elimina tutte le impostazioni personalizzate
    await runQuery(`
      DELETE FROM user_settings WHERE user_id = ?
    `, [req.user.userId]);

    const defaultSettings = {
      theme: 'light',
      soundEnabled: true,
      selectedRssSource: 'techcrunch'
    };

    console.log(`✅ Impostazioni reset per utente: ${req.user.email}`);

    res.json({
      message: 'Impostazioni resettate ai valori predefiniti',
      settings: defaultSettings
    });

  } catch (error) {
    console.error('❌ Errore reset impostazioni:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

module.exports = router;