const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { runQuery, getOne, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Applica autenticazione a tutte le routes
router.use(authenticateToken);

// GET /api/users/profile - Ottieni profilo utente
router.get('/profile', async (req, res) => {
  try {
    const user = await getOne(`
      SELECT 
        id, email, name, avatar_url, theme, sound_enabled, 
        selected_rss_source, created_at, updated_at
      FROM users 
      WHERE id = ?
    `, [req.user.userId]);

    if (!user) {
      return res.status(404).json({
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
        selectedRssSource: user.selected_rss_source,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Errore ottenimento profilo:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// PUT /api/users/profile - Aggiorna profilo utente
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('theme').optional().isIn(['light', 'dark']),
  body('soundEnabled').optional().isBoolean(),
  body('selectedRssSource').optional().trim().isLength({ min: 1, max: 50 }),
  body('avatarUrl').optional().isURL()
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
    const allowedFields = ['name', 'email', 'theme', 'soundEnabled', 'selectedRssSource', 'avatarUrl'];
    
    // Filtra solo i campi permessi
    const updateFields = [];
    const params = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        switch (key) {
          case 'name':
            updateFields.push('name = ?');
            params.push(value);
            break;
          case 'email':
            updateFields.push('email = ?');
            params.push(value);
            break;
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
          case 'avatarUrl':
            updateFields.push('avatar_url = ?');
            params.push(value);
            break;
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Nessun campo valido da aggiornare'
      });
    }

    // Se l'email viene cambiata, verifica che non esista già
    if (updates.email) {
      const existingUser = await getOne(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [updates.email, req.user.userId]
      );

      if (existingUser) {
        return res.status(409).json({
          error: 'Email già in uso da un altro utente'
        });
      }
    }

    // Aggiorna profilo
    params.push(req.user.userId);
    await runQuery(`
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, params);

    // Ottieni profilo aggiornato
    const updatedUser = await getOne(`
      SELECT 
        id, email, name, avatar_url, theme, sound_enabled, 
        selected_rss_source, created_at, updated_at
      FROM users 
      WHERE id = ?
    `, [req.user.userId]);

    console.log(`✅ Profilo aggiornato per utente: ${updatedUser.email}`);

    res.json({
      message: 'Profilo aggiornato con successo',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatar_url,
        theme: updatedUser.theme,
        soundEnabled: updatedUser.sound_enabled,
        selectedRssSource: updatedUser.selected_rss_source,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Errore aggiornamento profilo:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// PUT /api/users/password - Cambia password
router.put('/password', [
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Ottieni password hash attuale
    const user = await getOne(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user || !user.password_hash) {
      return res.status(400).json({
        error: 'Account collegato con Google - impossibile cambiare password'
      });
    }

    // Verifica password attuale
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Password attuale non corretta'
      });
    }

    // Hash nuova password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Aggiorna password
    await runQuery(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.user.userId]
    );

    // Invalida tutte le sessioni tranne quella corrente
    const currentSessionId = req.headers['x-session-id'];
    if (currentSessionId) {
      await runQuery(
        'DELETE FROM user_sessions WHERE user_id = ? AND id != ?',
        [req.user.userId, currentSessionId]
      );
    } else {
      await runQuery(
        'DELETE FROM user_sessions WHERE user_id = ?',
        [req.user.userId]
      );
    }

    console.log(`✅ Password cambiata per utente: ${req.user.email}`);

    res.json({
      message: 'Password aggiornata con successo'
    });

  } catch (error) {
    console.error('❌ Errore cambio password:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// GET /api/users/stats - Statistiche utente
router.get('/stats', async (req, res) => {
  try {
    const stats = await getOne(`
      SELECT 
        COUNT(DISTINCT l.id) as total_lists,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.completed = 1 THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.completed = 0 THEN t.id END) as pending_tasks,
        COUNT(DISTINCT CASE WHEN DATE(t.reminder) = DATE('now') AND t.completed = 0 THEN t.id END) as tasks_today,
        COUNT(DISTINCT CASE WHEN DATE(t.due_date) <= DATE('now', '+7 days') AND t.completed = 0 THEN t.id END) as tasks_this_week
      FROM users u
      LEFT JOIN lists l ON u.id = l.user_id
      LEFT JOIN tasks t ON l.id = t.list_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [req.user.userId]);

    // Statistiche attività recenti
    const recentActivity = await getAll(`
      SELECT 
        action,
        entity_type,
        created_at,
        metadata
      FROM activity_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [req.user.userId]);

    // Statistiche produttività settimanale
    const weeklyStats = await getAll(`
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as completed_count
      FROM tasks
      WHERE user_id = ? 
        AND completed = 1 
        AND completed_at >= DATE('now', '-7 days')
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
    `, [req.user.userId]);

    res.json({
      stats: {
        totalLists: stats.total_lists || 0,
        totalTasks: stats.total_tasks || 0,
        completedTasks: stats.completed_tasks || 0,
        pendingTasks: stats.pending_tasks || 0,
        tasksToday: stats.tasks_today || 0,
        tasksThisWeek: stats.tasks_this_week || 0,
        completionRate: stats.total_tasks > 0 
          ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) 
          : 0
      },
      recentActivity: recentActivity.map(activity => ({
        action: activity.action,
        entityType: activity.entity_type,
        createdAt: activity.created_at,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null
      })),
      weeklyProductivity: weeklyStats
    });

  } catch (error) {
    console.error('❌ Errore ottenimento statistiche:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// DELETE /api/users/account - Elimina account
router.delete('/account', [
  body('password').optional(),
  body('confirmDelete').equals('DELETE')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Conferma eliminazione richiesta (confirmDelete: "DELETE")',
        details: errors.array()
      });
    }

    const { password } = req.body;

    // Se l'utente ha una password, verificala
    const user = await getOne(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (user.password_hash && password) {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Password non corretta'
        });
      }
    } else if (user.password_hash && !password) {
      return res.status(400).json({
        error: 'Password richiesta per eliminare account'
      });
    }

    // Elimina utente (CASCADE eliminerà automaticamente liste, task, ecc.)
    await runQuery('DELETE FROM users WHERE id = ?', [req.user.userId]);

    console.log(`✅ Account eliminato per utente: ${req.user.email}`);

    res.json({
      message: 'Account eliminato con successo'
    });

  } catch (error) {
    console.error('❌ Errore eliminazione account:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// GET /api/users/export - Esporta dati utente
router.get('/export', async (req, res) => {
  try {
    // Ottieni tutti i dati dell'utente
    const user = await getOne(`
      SELECT id, email, name, theme, sound_enabled, selected_rss_source, created_at
      FROM users WHERE id = ?
    `, [req.user.userId]);

    const lists = await getAll(`
      SELECT id, name, color, description, position, created_at, updated_at
      FROM lists WHERE user_id = ?
      ORDER BY position ASC
    `, [req.user.userId]);

    const tasks = await getAll(`
      SELECT 
        t.*, l.name as list_name
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE t.user_id = ?
      ORDER BY l.position ASC, t.position ASC
    `, [req.user.userId]);

    const settings = await getAll(`
      SELECT setting_key, setting_value, created_at, updated_at
      FROM user_settings WHERE user_id = ?
    `, [req.user.userId]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name,
        theme: user.theme,
        soundEnabled: user.sound_enabled,
        selectedRssSource: user.selected_rss_source,
        createdAt: user.created_at
      },
      lists: lists.map(list => ({
        name: list.name,
        color: list.color,
        description: list.description,
        position: list.position,
        createdAt: list.created_at,
        updatedAt: list.updated_at
      })),
      tasks: tasks.map(task => ({
        title: task.title,
        details: task.details,
        completed: Boolean(task.completed),
        priority: task.priority,
        reminder: task.reminder,
        dueDate: task.due_date,
        listName: task.list_name,
        position: task.position,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        completedAt: task.completed_at
      })),
      settings: settings.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {}),
      statistics: {
        totalLists: lists.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.completed).length,
        pendingTasks: tasks.filter(t => !t.completed).length
      }
    };

    // Imposta headers per download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="agenda-export-${user.email}-${new Date().toISOString().split('T')[0]}.json"`);

    console.log(`✅ Dati esportati per utente: ${req.user.email}`);

    res.json(exportData);

  } catch (error) {
    console.error('❌ Errore esportazione dati:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

module.exports = router;
      