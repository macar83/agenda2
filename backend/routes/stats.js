const express = require('express');
const { query, validationResult } = require('express-validator');
const { getOne, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Applica autenticazione a tutte le routes
router.use(authenticateToken);

// GET /api/stats/dashboard - Statistiche dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Statistiche generali
    const generalStats = await getOne(`
      SELECT 
        COUNT(DISTINCT l.id) as total_lists,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.completed = 1 THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.completed = 0 THEN t.id END) as pending_tasks,
        COUNT(DISTINCT CASE WHEN DATE(t.reminder) = DATE('now') AND t.completed = 0 THEN t.id END) as tasks_today,
        COUNT(DISTINCT CASE WHEN DATE(t.due_date) <= DATE('now', '+7 days') AND t.completed = 0 THEN t.id END) as tasks_this_week,
        COUNT(DISTINCT CASE WHEN DATE(t.due_date) < DATE('now') AND t.completed = 0 THEN t.id END) as overdue_tasks
      FROM users u
      LEFT JOIN lists l ON u.id = l.user_id
      LEFT JOIN tasks t ON l.id = t.list_id
      WHERE u.id = ?
    `, [req.user.userId]);

    // Statistiche per priorità
    const priorityStats = await getAll(`
      SELECT 
        t.priority,
        COUNT(*) as count,
        COUNT(CASE WHEN t.completed = 1 THEN 1 END) as completed
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE l.user_id = ?
      GROUP BY t.priority
    `, [req.user.userId]);

    // Statistiche per lista
    const listStats = await getAll(`
      SELECT 
        l.id,
        l.name,
        l.color,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.completed = 1 THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.completed = 0 THEN 1 END) as pending_tasks
      FROM lists l
      LEFT JOIN tasks t ON l.id = t.list_id
      WHERE l.user_id = ?
      GROUP BY l.id, l.name, l.color
      ORDER BY l.position ASC
    `, [req.user.userId]);

    // Calcola tasso di completamento
    const completionRate = generalStats.total_tasks > 0 
      ? Math.round((generalStats.completed_tasks / generalStats.total_tasks) * 100)
      : 0;

    res.json({
      stats: {
        general: {
          totalLists: generalStats.total_lists || 0,
          totalTasks: generalStats.total_tasks || 0,
          completedTasks: generalStats.completed_tasks || 0,
          pendingTasks: generalStats.pending_tasks || 0,
          tasksToday: generalStats.tasks_today || 0,
          tasksThisWeek: generalStats.tasks_this_week || 0,
          overdueTasks: generalStats.overdue_tasks || 0,
          completionRate
        },
        byPriority: priorityStats.map(stat => ({
          priority: stat.priority,
          total: stat.count,
          completed: stat.completed,
          pending: stat.count - stat.completed,
          completionRate: stat.count > 0 ? Math.round((stat.completed / stat.count) * 100) : 0
        })),
        byList: listStats.map(stat => ({
          id: stat.id,
          name: stat.name,
          color: stat.color,
          totalTasks: stat.total_tasks,
          completedTasks: stat.completed_tasks,
          pendingTasks: stat.pending_tasks,
          completionRate: stat.total_tasks > 0 
            ? Math.round((stat.completed_tasks / stat.total_tasks) * 100) 
            : 0
        }))
      }
    });

  } catch (error) {
    console.error('❌ Errore statistiche dashboard:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// GET /api/stats/productivity - Statistiche produttività
router.get('/productivity', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  query('groupBy').optional().isIn(['day', 'week', 'month'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Parametri non validi',
        details: errors.array()
      });
    }

    const period = req.query.period || '30d';
    const groupBy = req.query.groupBy || 'day';

    // Converti periodo in giorni
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const days = periodDays[period];

    // Query per raggrupramento
    let dateFormat, groupByClause;
    switch (groupBy) {
      case 'day':
        dateFormat = "DATE(completed_at)";
        groupByClause = "DATE(completed_at)";
        break;
      case 'week':
        dateFormat = "strftime('%Y-W%W', completed_at)";
        groupByClause = "strftime('%Y-%W', completed_at)";
        break;
      case 'month':
        dateFormat = "strftime('%Y-%m', completed_at)";
        groupByClause = "strftime('%Y-%m', completed_at)";
        break;
      default:
        dateFormat = "DATE(completed_at)";
        groupByClause = "DATE(completed_at)";
    }

    // Statistiche di completamento nel tempo
    const completionTrend = await getAll(`
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as completed_count,
        COUNT(DISTINCT list_id) as active_lists
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE l.user_id = ? 
        AND t.completed = 1 
        AND t.completed_at >= DATE('now', '-${days} days')
      GROUP BY ${groupByClause}
      ORDER BY period ASC
    `, [req.user.userId]);

    // Statistiche di creazione task nel tempo
    const creationTrend = await getAll(`
      SELECT 
        ${dateFormat.replace('completed_at', 'created_at')} as period,
        COUNT(*) as created_count
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE l.user_id = ? 
        AND t.created_at >= DATE('now', '-${days} days')
      GROUP BY ${groupByClause.replace('completed_at', 'created_at')}
      ORDER BY period ASC
    `, [req.user.userId]);

    // Media giornaliera di task completati
    const avgDaily = await getOne(`
      SELECT 
        AVG(daily_completed) as avg_completed_per_day,
        MAX(daily_completed) as max_completed_per_day
      FROM (
        SELECT 
          DATE(completed_at) as day,
          COUNT(*) as daily_completed
        FROM tasks t
        JOIN lists l ON t.list_id = l.id
        WHERE l.user_id = ? 
          AND t.completed = 1 
          AND t.completed_at >= DATE('now', '-${days} days')
        GROUP BY DATE(completed_at)
      )
    `, [req.user.userId]);

    // Streak di giorni consecutivi con task completati
    const streak = await calculateStreak(req.user.userId);

    // Distribuzione oraria (solo per periodi <= 30 giorni)
    let hourlyDistribution = [];
    if (days <= 30) {
      hourlyDistribution = await getAll(`
        SELECT 
          strftime('%H', completed_at) as hour,
          COUNT(*) as count
        FROM tasks t
        JOIN lists l ON t.list_id = l.id
        WHERE l.user_id = ? 
          AND t.completed = 1 
          AND t.completed_at >= DATE('now', '-${days} days')
        GROUP BY strftime('%H', completed_at)
        ORDER BY hour ASC
      `, [req.user.userId]);
    }

    res.json({
      stats: {
        period,
        groupBy,
        trends: {
          completion: completionTrend.map(item => ({
            period: item.period,
            completedTasks: item.completed_count,
            activeLists: item.active_lists
          })),
          creation: creationTrend.map(item => ({
            period: item.period,
            createdTasks: item.created_count
          }))
        },
        averages: {
          completedPerDay: Math.round((avgDaily.avg_completed_per_day || 0) * 10) / 10,
          maxInOneDay: avgDaily.max_completed_per_day || 0
        },
        streak: {
          current: streak.current,
          longest: streak.longest
        },
        hourlyDistribution: hourlyDistribution.map(item => ({
          hour: parseInt(item.hour),
          count: item.count
        }))
      }
    });

  } catch (error) {
    console.error('❌ Errore statistiche produttività:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// GET /api/stats/activity - Log attività recenti
router.get('/activity', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('action').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Parametri non validi',
        details: errors.array()
      });
    }

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const actionFilter = req.query.action;

    let whereClause = 'WHERE user_id = ?';
    let params = [req.user.userId];

    if (actionFilter) {
      whereClause += ' AND action = ?';
      params.push(actionFilter);
    }

    // Ottieni log attività
    const activities = await getAll(`
      SELECT 
        action,
        entity_type,
        entity_id,
        metadata,
        created_at
      FROM activity_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Conta totale per paginazione
    const totalCount = await getOne(`
      SELECT COUNT(*) as total
      FROM activity_logs
      ${whereClause}
    `, params);

    // Statistiche attività per tipo
    const activityTypes = await getAll(`
      SELECT 
        action,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM activity_logs
      WHERE user_id = ?
      GROUP BY action
      ORDER BY count DESC
    `, [req.user.userId]);

    res.json({
      activities: activities.map(activity => ({
        action: activity.action,
        entityType: activity.entity_type,
        entityId: activity.entity_id,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
        createdAt: activity.created_at
      })),
      activityTypes: activityTypes.map(type => ({
        action: type.action,
        count: type.count,
        lastOccurrence: type.last_occurrence
      })),
      pagination: {
        total: totalCount.total,
        limit,
        offset,
        hasMore: totalCount.total > (offset + limit)
      }
    });

  } catch (error) {
    console.error('❌ Errore log attività:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// GET /api/stats/comparison - Confronto periodico
router.get('/comparison', [
  query('period').optional().isIn(['week', 'month', 'quarter']),
  query('compare').optional().isIn(['previous', 'same_last_year'])
], async (req, res) => {
  try {
    const period = req.query.period || 'week';
    const compare = req.query.compare || 'previous';

    let currentPeriodStart, currentPeriodEnd, comparePeriodStart, comparePeriodEnd;

    // Definisci periodi di confronto
    const now = new Date();
    switch (period) {
      case 'week':
        currentPeriodStart = new Date(now.setDate(now.getDate() - now.getDay()));
        currentPeriodEnd = new Date(currentPeriodStart);
        currentPeriodEnd.setDate(currentPeriodStart.getDate() + 6);
        
        if (compare === 'previous') {
          comparePeriodStart = new Date(currentPeriodStart);
          comparePeriodStart.setDate(currentPeriodStart.getDate() - 7);
          comparePeriodEnd = new Date(currentPeriodStart);
          comparePeriodEnd.setDate(currentPeriodStart.getDate() - 1);
        } else {
          comparePeriodStart = new Date(currentPeriodStart);
          comparePeriodStart.setFullYear(currentPeriodStart.getFullYear() - 1);
          comparePeriodEnd = new Date(currentPeriodEnd);
          comparePeriodEnd.setFullYear(currentPeriodEnd.getFullYear() - 1);
        }
        break;

      case 'month':
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        if (compare === 'previous') {
          comparePeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          comparePeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        } else {
          comparePeriodStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          comparePeriodEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
        }
        break;

      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        currentPeriodStart = new Date(now.getFullYear(), quarter * 3, 1);
        currentPeriodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        
        if (compare === 'previous') {
          if (quarter === 0) {
            comparePeriodStart = new Date(now.getFullYear() - 1, 9, 1);
            comparePeriodEnd = new Date(now.getFullYear() - 1, 12, 0);
          } else {
            comparePeriodStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
            comparePeriodEnd = new Date(now.getFullYear(), quarter * 3, 0);
          }
        } else {
          comparePeriodStart = new Date(now.getFullYear() - 1, quarter * 3, 1);
          comparePeriodEnd = new Date(now.getFullYear() - 1, (quarter + 1) * 3, 0);
        }
        break;
    }

    // Query per periodo corrente
    const currentStats = await getOne(`
      SELECT 
        COUNT(DISTINCT CASE WHEN t.completed = 1 THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.completed = 0 THEN t.id END) as pending_tasks,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT l.id) as active_lists
      FROM lists l
      LEFT JOIN tasks t ON l.id = t.list_id
      WHERE l.user_id = ? 
        AND t.created_at BETWEEN ? AND ?
    `, [req.user.userId, currentPeriodStart.toISOString(), currentPeriodEnd.toISOString()]);

    // Query per periodo di confronto
    const compareStats = await getOne(`
      SELECT 
        COUNT(DISTINCT CASE WHEN t.completed = 1 THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.completed = 0 THEN t.id END) as pending_tasks,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT l.id) as active_lists
      FROM lists l
      LEFT JOIN tasks t ON l.id = t.list_id
      WHERE l.user_id = ? 
        AND t.created_at BETWEEN ? AND ?
    `, [req.user.userId, comparePeriodStart.toISOString(), comparePeriodEnd.toISOString()]);

    // Calcola differenze percentuali
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
      comparison: {
        period,
        compareWith: compare,
        current: {
          period: `${currentPeriodStart.toISOString().split('T')[0]} - ${currentPeriodEnd.toISOString().split('T')[0]}`,
          completedTasks: currentStats.completed_tasks || 0,
          pendingTasks: currentStats.pending_tasks || 0,
          totalTasks: currentStats.total_tasks || 0,
          activeLists: currentStats.active_lists || 0
        },
        previous: {
          period: `${comparePeriodStart.toISOString().split('T')[0]} - ${comparePeriodEnd.toISOString().split('T')[0]}`,
          completedTasks: compareStats.completed_tasks || 0,
          pendingTasks: compareStats.pending_tasks || 0,
          totalTasks: compareStats.total_tasks || 0,
          activeLists: compareStats.active_lists || 0
        },
        changes: {
          completedTasks: calculateChange(currentStats.completed_tasks || 0, compareStats.completed_tasks || 0),
          totalTasks: calculateChange(currentStats.total_tasks || 0, compareStats.total_tasks || 0),
          activeLists: calculateChange(currentStats.active_lists || 0, compareStats.active_lists || 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ Errore confronto statistiche:', error);
    res.status(500).json({
      error: 'Errore interno del server'
    });
  }
});

// Funzione helper per calcolare streak
async function calculateStreak(userId) {
  try {
    // Ottieni giorni con task completati negli ultimi 365 giorni
    const completionDays = await getAll(`
      SELECT DISTINCT DATE(completed_at) as day
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE l.user_id = ? 
        AND t.completed = 1 
        AND t.completed_at >= DATE('now', '-365 days')
      ORDER BY day DESC
    `, [userId]);

    if (completionDays.length === 0) {
      return { current: 0, longest: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Controlla streak corrente
    const hasToday = completionDays.some(d => d.day === today);
    const hasYesterday = completionDays.some(d => d.day === yesterday);

    if (hasToday || hasYesterday) {
      let checkDate = hasToday ? today : yesterday;
      
      for (const dayData of completionDays) {
        if (dayData.day === checkDate) {
          currentStreak++;
          // Vai al giorno precedente
          const date = new Date(checkDate);
          date.setDate(date.getDate() - 1);
          checkDate = date.toISOString().split('T')[0];
        } else {
          break;
        }
      }
    }

    // Calcola streak più lungo
    let previousDate = null;
    for (const dayData of completionDays) {
      if (previousDate) {
        const current = new Date(dayData.day);
        const previous = new Date(previousDate);
        const diffDays = (previous - current) / (1000 * 60 * 60 * 24);
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      previousDate = dayData.day;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      current: currentStreak,
      longest: longestStreak
    };

  } catch (error) {
    console.error('❌ Errore calcolo streak:', error);
    return { current: 0, longest: 0 };
  }
}

module.exports = router;