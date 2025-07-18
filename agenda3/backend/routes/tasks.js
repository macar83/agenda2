const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getOne, getAll, transaction } = require('../config/database');
const { authenticateToken, checkResourceOwnership, logUserActivity } = require('../middleware/auth');

const router = express.Router();

// Applica autenticazione a tutte le routes
router.use(authenticateToken);

// GET /api/tasks - Ottieni tutti i task dell'utente con filtri
router.get('/', [
  query('listId').optional().isInt({ min: 1 }),
  query('completed').optional().isBoolean(),
  query('priority').optional().isIn(['low', 'medium', 'high']),
  query('dueDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Parametri non validi',
        details: errors.array()
      });
    }

    const { 
      listId, 
      completed, 
      priority, 
      dueDate, 
      limit = 50, 
      offset = 0 
    } = req.query;

    // Costruisci query dinamica
    let whereConditions = ['t.user_id = ?'];
    let params = [req.user.userId];

    if (listId) {
      whereConditions.push('t.list_id = ?');
      params.push(listId);
    }

    if (completed !== undefined) {
      whereConditions.push('t.completed = ?');
      params.push(completed === 'true' ? 1 : 0);
    }

    if (priority) {
      whereConditions.push('t.priority = ?');
      params.push(priority);
    }

    if (dueDate) {
      whereConditions.push('DATE(t.due_date) = DATE(?)');
      params.push(dueDate);
    }

    const whereClause = whereConditions.join(' AND ');

    const tasks = await getAll(`
      SELECT 
        t.*,
        l.name as list_name,
        l.color as list_color
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE ${whereClause}
      ORDER BY t.position ASC, t.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Conta totale per paginazione
    const totalCount = await getOne(`
      SELECT COUNT(*) as total
      FROM tasks t
      WHERE t.user_id = ? AND (${whereConditions.slice(1).join(' AND ') || '1=1'})
    `, whereConditions.length > 1 ? params.slice(0, -2) : [req.user.userId]);

    res.json({
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        details: task.details,
        completed: Boolean(task.completed),
        priority: task.priority,
        reminder: task.reminder,
        dueDate: task.due_date,
        position: task.position,
        listId: task.list_id,
        listName: task.list_name,
        listColor: task.list_color,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        completedAt: task.completed_at
      })),
      pagination: {
        total: totalCount.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount.total > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Errore ottenimento task:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// GET /api/tasks/:id - Ottieni task specifico
router.get('/:id', checkResourceOwnership('task'), async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await getOne(`
      SELECT 
        t.*,
        l.name as list_name,
        l.color as list_color
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE t.id = ? AND t.user_id = ?
    `, [taskId, req.user.userId]);

    if (!task) {
      return res.status(404).json({
        error: 'Task non trovato'
      });
    }

    res.json({
      task: {
        id: task.id,
        title: task.title,
        details: task.details,
        completed: Boolean(task.completed),
        priority: task.priority,
        reminder: task.reminder,
        dueDate: task.due_date,
        position: task.position,
        listId: task.list_id,
        listName: task.list_name,
        listColor: task.list_color,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        completedAt: task.completed_at
      }
    });

  } catch (error) {
    console.error('❌ Errore ottenimento task:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// POST /api/tasks - Crea nuovo task
router.post('/', [
  body('listId').isInt({ min: 1 }),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('details').optional().trim().isLength({ max: 1000 }),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('reminder').optional().isISO8601(),
  body('dueDate').optional().isISO8601()
], logUserActivity('task_created', 'task'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const { 
      listId, 
      title, 
      details, 
      priority = 'medium', 
      reminder, 
      dueDate 
    } = req.body;

    // Verifica che la lista appartenga all'utente
    const list = await getOne(
      'SELECT id FROM lists WHERE id = ? AND user_id = ?',
      [listId, req.user.userId]
    );

    if (!list) {
      return res.status(404).json({
        error: 'Lista non trovata'
      });
    }

    // Ottieni posizione successiva per il task
    const maxPosition = await getOne(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM tasks WHERE list_id = ?',
      [listId]
    );

    const position = maxPosition.max_pos + 1;

    // Crea il task
    const result = await runQuery(`
      INSERT INTO tasks (
        list_id, 
        user_id, 
        title, 
        details, 
        priority, 
        reminder, 
        due_date, 
        position
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      listId, 
      req.user.userId, 
      title, 
      details || null, 
      priority, 
      reminder || null, 
      dueDate || null, 
      position
    ]);

    // Ottieni task creato con info lista
    const newTask = await getOne(`
      SELECT 
        t.*,
        l.name as list_name,
        l.color as list_color
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE t.id = ?
    `, [result.id]);

    console.log(`✅ Nuovo task creato: ${title} per utente ${req.user.email}`);

    res.status(201).json({
      message: 'Task creato con successo',
      task: {
        id: newTask.id,
        title: newTask.title,
        details: newTask.details,
        completed: Boolean(newTask.completed),
        priority: newTask.priority,
        reminder: newTask.reminder,
        dueDate: newTask.due_date,
        position: newTask.position,
        listId: newTask.list_id,
        listName: newTask.list_name,
        listColor: newTask.list_color,
        createdAt: newTask.created_at,
        updatedAt: newTask.updated_at,
        completedAt: newTask.completed_at
      }
    });

  } catch (error) {
    console.error('❌ Errore creazione task:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// PUT /api/tasks/:id - Aggiorna task
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('details').optional().trim().isLength({ max: 1000 }),
  body('completed').optional().isBoolean(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('reminder').optional().isISO8601(),
  body('dueDate').optional().isISO8601(),
  body('listId').optional().isInt({ min: 1 })
], checkResourceOwnership('task'), logUserActivity('task_updated', 'task'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const taskId = req.params.id;
    const updates = req.body;

    // Se viene cambiata la lista, verifica che la nuova lista appartenga all'utente
    if (updates.listId) {
      const newList = await getOne(
        'SELECT id FROM lists WHERE id = ? AND user_id = ?',
        [updates.listId, req.user.userId]
      );

      if (!newList) {
        return res.status(404).json({
          error: 'Lista di destinazione non trovata'
        });
      }
    }

    // Costruisci query di aggiornamento dinamica
    const updateFields = [];
    const params = [];

    Object.entries(updates).forEach(([key, value]) => {
      switch (key) {
        case 'title':
          updateFields.push('title = ?');
          params.push(value);
          break;
        case 'details':
          updateFields.push('details = ?');
          params.push(value || null);
          break;
        case 'completed':
          updateFields.push('completed = ?');
          params.push(value ? 1 : 0);
          break;
        case 'priority':
          updateFields.push('priority = ?');
          params.push(value);
          break;
        case 'reminder':
          updateFields.push('reminder = ?');
          params.push(value || null);
          break;
        case 'dueDate':
          updateFields.push('due_date = ?');
          params.push(value || null);
          break;
        case 'listId':
          updateFields.push('list_id = ?');
          params.push(value);
          break;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Nessun campo da aggiornare'
      });
    }

    // Aggiorna il task
    params.push(taskId, req.user.userId);
    const result = await runQuery(`
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `, params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Task non trovato'
      });
    }

    // Ottieni task aggiornato
    const updatedTask = await getOne(`
      SELECT 
        t.*,
        l.name as list_name,
        l.color as list_color
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE t.id = ?
    `, [taskId]);

    console.log(`✅ Task aggiornato: ${updatedTask.title} per utente ${req.user.email}`);

    res.json({
      message: 'Task aggiornato con successo',
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        details: updatedTask.details,
        completed: Boolean(updatedTask.completed),
        priority: updatedTask.priority,
        reminder: updatedTask.reminder,
        dueDate: updatedTask.due_date,
        position: updatedTask.position,
        listId: updatedTask.list_id,
        listName: updatedTask.list_name,
        listColor: updatedTask.list_color,
        createdAt: updatedTask.created_at,
        updatedAt: updatedTask.updated_at,
        completedAt: updatedTask.completed_at
      }
    });

  } catch (error) {
    console.error('❌ Errore aggiornamento task:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// PUT /api/tasks/:id/complete - Toggle completamento task
router.put('/:id/complete', checkResourceOwnership('task'), logUserActivity('task_toggled', 'task'), async (req, res) => {
  try {
    const taskId = req.params.id;

    // Ottieni stato attuale
    const currentTask = await getOne(
      'SELECT completed FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.userId]
    );

    if (!currentTask) {
      return res.status(404).json({
        error: 'Task non trovato'
      });
    }

    const newCompletedState = !currentTask.completed;

    // Aggiorna completamento
    await runQuery(
      'UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?',
      [newCompletedState ? 1 : 0, taskId, req.user.userId]
    );

    // Ottieni task aggiornato
    const updatedTask = await getOne(`
      SELECT 
        t.*,
        l.name as list_name,
        l.color as list_color
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE t.id = ?
    `, [taskId]);

    console.log(`✅ Task ${newCompletedState ? 'completato' : 'riattivato'}: ${updatedTask.title}`);

    res.json({
      message: `Task ${newCompletedState ? 'completato' : 'riattivato'}`,
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        details: updatedTask.details,
        completed: Boolean(updatedTask.completed),
        priority: updatedTask.priority,
        reminder: updatedTask.reminder,
        dueDate: updatedTask.due_date,
        position: updatedTask.position,
        listId: updatedTask.list_id,
        listName: updatedTask.list_name,
        listColor: updatedTask.list_color,
        createdAt: updatedTask.created_at,
        updatedAt: updatedTask.updated_at,
        completedAt: updatedTask.completed_at
      }
    });

  } catch (error) {
    console.error('❌ Errore toggle completamento:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// DELETE /api/tasks/:id - Elimina task
router.delete('/:id', checkResourceOwnership('task'), logUserActivity('task_deleted', 'task'), async (req, res) => {
  try {
    const taskId = req.params.id;

    // Ottieni info task prima di eliminarlo
    const task = await getOne(
      'SELECT title FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.userId]
    );

    if (!task) {
      return res.status(404).json({
        error: 'Task non trovato'
      });
    }

    // Elimina task
    await runQuery(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, req.user.userId]
    );

    console.log(`✅ Task eliminato: ${task.title} per utente ${req.user.email}`);

    res.json({
      message: 'Task eliminato con successo'
    });

  } catch (error) {
    console.error('❌ Errore eliminazione task:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// POST /api/tasks/reorder - Riordina task
router.post('/reorder', [
  body('taskIds').isArray({ min: 1 }),
  body('taskIds.*').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: errors.array()
      });
    }

    const { taskIds } = req.body;

    // Verifica che tutti i task appartengano all'utente
    const userTasks = await getAll(
      'SELECT id FROM tasks WHERE user_id = ?',
      [req.user.userId]
    );

    const userTaskIds = userTasks.map(task => task.id);
    const invalidIds = taskIds.filter(id => !userTaskIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: 'Alcuni task non appartengono all\'utente'
      });
    }

    // Crea queries per aggiornare le posizioni
    const updateQueries = taskIds.map((taskId, index) => ({
      sql: 'UPDATE tasks SET position = ? WHERE id = ? AND user_id = ?',
      params: [index, taskId, req.user.userId]
    }));

    // Esegui tutte le query in una transazione
    await transaction(updateQueries);

    console.log(`✅ Task riordinati per utente ${req.user.email}`);

    res.json({
      message: 'Task riordinati con successo'
    });

  } catch (error) {
    console.error('❌ Errore riordinamento task:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// GET /api/tasks/upcoming - Task in scadenza
router.get('/upcoming', [
  query('days').optional().isInt({ min: 1, max: 30 })
], async (req, res) => {
  try {
    const days = req.query.days || 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const upcomingTasks = await getAll(`
      SELECT 
        t.*,
        l.name as list_name,
        l.color as list_color
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE t.user_id = ? 
        AND t.completed = 0
        AND (
          (t.due_date IS NOT NULL AND DATE(t.due_date) <= DATE(?))
          OR 
          (t.reminder IS NOT NULL AND DATE(t.reminder) <= DATE(?))
        )
      ORDER BY 
        COALESCE(t.due_date, t.reminder) ASC,
        t.created_at ASC
    `, [req.user.userId, futureDate.toISOString(), futureDate.toISOString()]);

    res.json({
      tasks: upcomingTasks.map(task => ({
        id: task.id,
        title: task.title,
        details: task.details,
        priority: task.priority,
        reminder: task.reminder,
        dueDate: task.due_date,
        listId: task.list_id,
        listName: task.list_name,
        listColor: task.list_color,
        createdAt: task.created_at
      }))
    });

  } catch (error) {
    console.error('❌ Errore task in scadenza:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

module.exports = router;