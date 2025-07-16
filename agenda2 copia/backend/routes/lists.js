const express = require('express');
const { body, validationResult } = require('express-validator');
const { runQuery, getOne, getAll, transaction } = require('../config/database');
const { authenticateToken, checkResourceOwnership, logUserActivity } = require('../middleware/auth');

const router = express.Router();

// Applica autenticazione a tutte le routes
router.use(authenticateToken);

// GET /api/lists - Ottieni tutte le liste dell'utente
router.get('/', async (req, res) => {
  try {
    const lists = await getAll(`
      SELECT 
        l.*,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.completed = false THEN 1 END) as incomplete_tasks
      FROM lists l
      LEFT JOIN tasks t ON l.id = t.list_id
      WHERE l.user_id = ?
      GROUP BY l.id
      ORDER BY l.position ASC, l.created_at ASC
    `, [req.user.userId]);

    res.json({
      lists: lists.map(list => ({
        id: list.id,
        name: list.name,
        color: list.color,
        description: list.description,
        position: list.position,
        totalTasks: list.total_tasks,
        incompleteTasks: list.incomplete_tasks,
        createdAt: list.created_at,
        updatedAt: list.updated_at
      }))
    });

  } catch (error) {
    console.error('❌ Errore ottenimento liste:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// GET /api/lists/:id - Ottieni una lista specifica con i suoi task
router.get('/:id', checkResourceOwnership('list'), async (req, res) => {
  try {
    const listId = req.params.id;

    // Ottieni lista
    const list = await getOne(`
      SELECT 
        l.*,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.completed = false THEN 1 END) as incomplete_tasks
      FROM lists l
      LEFT JOIN tasks t ON l.id = t.list_id
      WHERE l.id = ? AND l.user_id = ?
      GROUP BY l.id
    `, [listId, req.user.userId]);

    if (!list) {
      return res.status(404).json({
        error: 'Lista non trovata'
      });
    }

    // Ottieni task della lista
    const tasks = await getAll(`
      SELECT 
        id,
        title,
        details,
        completed,
        priority,
        reminder,
        due_date,
        position,
        created_at,
        updated_at,
        completed_at
      FROM tasks
      WHERE list_id = ?
      ORDER BY position ASC, created_at ASC
    `, [listId]);

    res.json({
      list: {
        id: list.id,
        name: list.name,
        color: list.color,
        description: list.description,
        position: list.position,
        totalTasks: list.total_tasks,
        incompleteTasks: list.incomplete_tasks,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          details: task.details,
          completed: Boolean(task.completed),
          priority: task.priority,
          reminder: task.reminder,
          dueDate: task.due_date,
          position: task.position,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          completedAt: task.completed_at
        }))
      }
    });

  } catch (error) {
    console.error('❌ Errore ottenimento lista:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// POST /api/lists - Crea una nuova lista
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('color').matches(/^#[0-9A-F]{6}$/i),
  body('description').optional().trim().isLength({ max: 500 })
], logUserActivity('list_created', 'list'), async (req, res) => {
  try {
    // Validazione input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const { name, color, description } = req.body;

    // Ottieni la posizione successiva
    const maxPosition = await getOne(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM lists WHERE user_id = ?',
      [req.user.userId]
    );

    const position = maxPosition.max_pos + 1;

    // Crea la lista
    const result = await runQuery(`
      INSERT INTO lists (user_id, name, color, description, position)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.userId, name, color, description || null, position]);

    const newList = await getOne(`
      SELECT 
        l.*,
        0 as total_tasks,
        0 as incomplete_tasks
      FROM lists l
      WHERE l.id = ?
    `, [result.id]);

    console.log(`✅ Nuova lista creata: ${name} per utente ${req.user.email}`);

    res.status(201).json({
      message: 'Lista creata con successo',
      list: {
        id: newList.id,
        name: newList.name,
        color: newList.color,
        description: newList.description,
        position: newList.position,
        totalTasks: 0,
        incompleteTasks: 0,
        createdAt: newList.created_at,
        updatedAt: newList.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Errore creazione lista:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// PUT /api/lists/:id - Aggiorna una lista
router.put('/:id', [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('color').matches(/^#[0-9A-F]{6}$/i),
  body('description').optional().trim().isLength({ max: 500 })
], checkResourceOwnership('list'), logUserActivity('list_updated', 'list'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const listId = req.params.id;
    const { name, color, description } = req.body;

    // Aggiorna la lista
    const result = await runQuery(`
      UPDATE lists 
      SET name = ?, color = ?, description = ?
      WHERE id = ? AND user_id = ?
    `, [name, color, description || null, listId, req.user.userId]);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Lista non trovata'
      });
    }

    // Ottieni lista aggiornata
    const updatedList = await getOne(`
      SELECT 
        l.*,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.completed = false THEN 1 END) as incomplete_tasks
      FROM lists l
      LEFT JOIN tasks t ON l.id = t.list_id
      WHERE l.id = ?
      GROUP BY l.id
    `, [listId]);

    console.log(`✅ Lista aggiornata: ${name} per utente ${req.user.email}`);

    res.json({
      message: 'Lista aggiornata con successo',
      list: {
        id: updatedList.id,
        name: updatedList.name,
        color: updatedList.color,
        description: updatedList.description,
        position: updatedList.position,
        totalTasks: updatedList.total_tasks,
        incompleteTasks: updatedList.incomplete_tasks,
        createdAt: updatedList.created_at,
        updatedAt: updatedList.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Errore aggiornamento lista:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// PUT /api/lists/:id/position - Aggiorna posizione lista
router.put('/:id/position', [
  body('position').isInt({ min: 0 })
], checkResourceOwnership('list'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Posizione non valida'
      });
    }

    const listId = req.params.id;
    const { position } = req.body;

    // Aggiorna posizione
    const result = await runQuery(`
      UPDATE lists 
      SET position = ?
      WHERE id = ? AND user_id = ?
    `, [position, listId, req.user.userId]);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Lista non trovata'
      });
    }

    res.json({
      message: 'Posizione aggiornata'
    });

  } catch (error) {
    console.error('❌ Errore aggiornamento posizione:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// DELETE /api/lists/:id - Elimina una lista
router.delete('/:id', checkResourceOwnership('list'), logUserActivity('list_deleted', 'list'), async (req, res) => {
  try {
    const listId = req.params.id;

    // Ottieni info lista prima di eliminarla
    const list = await getOne(
      'SELECT name FROM lists WHERE id = ? AND user_id = ?',
      [listId, req.user.userId]
    );

    if (!list) {
      return res.status(404).json({
        error: 'Lista non trovata'
      });
    }

    // Elimina lista (i task vengono eliminati automaticamente per CASCADE)
    await runQuery(
      'DELETE FROM lists WHERE id = ? AND user_id = ?',
      [listId, req.user.userId]
    );

    console.log(`✅ Lista eliminata: ${list.name} per utente ${req.user.email}`);

    res.json({
      message: 'Lista eliminata con successo'
    });

  } catch (error) {
    console.error('❌ Errore eliminazione lista:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// POST /api/lists/reorder - Riordina tutte le liste
router.post('/reorder', [
  body('listIds').isArray({ min: 1 }),
  body('listIds.*').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const { listIds } = req.body;

    // Verifica che tutte le liste appartengano all'utente
    const userLists = await getAll(
      'SELECT id FROM lists WHERE user_id = ?',
      [req.user.userId]
    );

    const userListIds = userLists.map(list => list.id);
    const invalidIds = listIds.filter(id => !userListIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: 'Alcune liste non appartengono all\'utente'
      });
    }

    // Crea queries per aggiornare le posizioni
    const updateQueries = listIds.map((listId, index) => ({
      sql: 'UPDATE lists SET position = ? WHERE id = ? AND user_id = ?',
      params: [index, listId, req.user.userId]
    }));

    // Esegui tutte le query in una transazione
    await transaction(updateQueries);

    console.log(`✅ Liste riordinate per utente ${req.user.email}`);

    res.json({
      message: 'Liste riordinate con successo'
    });

  } catch (error) {
    console.error('❌ Errore riordinamento liste:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

module.exports = router;