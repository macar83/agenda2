const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

// Configurazione database
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'agenda.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database.sql');

let db = null;

// Funzione per parsare SQL in modo più robusto
const parseSQL = (schema) => {
  // Rimuovi commenti SQL (-- e /* */)
  let cleanSchema = schema
    .replace(/--.*$/gm, '') // Rimuovi commenti --
    .replace(/\/\*[\s\S]*?\*\//g, '') // Rimuovi commenti /* */
    .trim();

  const statements = [];
  let currentStatement = '';
  let inTrigger = false;
  let triggerDepth = 0;
  
  const lines = cleanSchema.split('\n');
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // Aggiungi la linea al statement corrente
    currentStatement += (currentStatement ? ' ' : '') + line;
    
    // Controlla se stiamo entrando in un trigger
    if (line.toUpperCase().includes('CREATE TRIGGER')) {
      inTrigger = true;
      triggerDepth = 0;
    }
    
    // Se siamo in un trigger, conta BEGIN ed END
    if (inTrigger) {
      if (line.toUpperCase().includes('BEGIN')) {
        triggerDepth++;
      }
      if (line.toUpperCase().includes('END')) {
        triggerDepth--;
        // Se triggerDepth torna a 0, il trigger è completo
        if (triggerDepth <= 0) {
          inTrigger = false;
          // Assicurati che termini con ;
          if (!currentStatement.endsWith(';')) {
            currentStatement += ';';
          }
          statements.push(currentStatement);
          currentStatement = '';
          continue;
        }
      }
    }
    
    // Se non siamo in un trigger e la linea finisce con ;, è un statement completo
    if (!inTrigger && line.endsWith(';')) {
      statements.push(currentStatement);
      currentStatement = '';
    }
  }
  
  // Aggiungi l'ultimo statement se esiste
  if (currentStatement.trim()) {
    if (!currentStatement.endsWith(';')) {
      currentStatement += ';';
    }
    statements.push(currentStatement);
  }
  
  return statements.filter(stmt => stmt.trim().length > 0);
};

// Inizializza il database
const initDatabase = async () => {
  try {
    // Crea la directory data se non esiste
    const dataDir = path.dirname(DB_PATH);
    await fs.mkdir(dataDir, { recursive: true });

    // Connessione al database
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Errore connessione database:', err.message);
        throw err;
      }
      console.log('✅ Connesso al database SQLite');
    });

    // Abilita foreign keys e WAL mode
    await runQuery('PRAGMA foreign_keys = ON');
    await runQuery('PRAGMA journal_mode = WAL');
    
    // Verifica se il file schema esiste
    try {
      await fs.access(SCHEMA_PATH);
      console.log('✅ File schema trovato:', SCHEMA_PATH);
    } catch (error) {
      throw new Error(`File schema non trovato: ${SCHEMA_PATH}`);
    }
    
    // Carica e esegui lo schema
    const schema = await fs.readFile(SCHEMA_PATH, 'utf8');
    console.log('📝 Schema caricato, lunghezza:', schema.length, 'caratteri');
    
    // Parse SQL con il nuovo parser
    const statements = parseSQL(schema);
    console.log(`📋 Trovati ${statements.length} statement SQL`);
    
    // Esegui ogni statement
    for (let i = 0; i < statements.length; i++) {
      try {
        await runQuery(statements[i]);
        console.log(`✅ Statement ${i + 1}/${statements.length} eseguito`);
      } catch (error) {
        console.error(`❌ Errore statement ${i + 1}:`, error.message);
        console.error('Statement completo:', statements[i]);
        throw error;
      }
    }
    
    console.log('🎉 Database inizializzato con successo!');
    return true;
    
  } catch (error) {
    console.error('❌ Errore inizializzazione database:', error);
    throw error;
  }
};

// Funzione helper per eseguire query come Promise
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database non inizializzato'));
      return;
    }
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ 
          id: this.lastID, 
          changes: this.changes 
        });
      }
    });
  });
};

// Funzione per query che ritornano una riga
const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database non inizializzato'));
      return;
    }
    
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Funzione per query che ritornano multiple righe
const getAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database non inizializzato'));
      return;
    }
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Funzione per transazioni
const transaction = async (callback) => {
  try {
    await runQuery('BEGIN TRANSACTION');
    const result = await callback();
    await runQuery('COMMIT');
    return result;
  } catch (error) {
    await runQuery('ROLLBACK');
    throw error;
  }
};

// Chiudi connessione database
const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Database disconnesso');
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

// Backup database
const createBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      path.dirname(DB_PATH),
      `backup_${timestamp}.db`
    );
    
    await fs.copyFile(DB_PATH, backupPath);
    console.log(`✅ Backup creato: ${backupPath}`);
    return backupPath;
    
  } catch (error) {
    console.error('❌ Errore creazione backup:', error);
    throw error;
  }
};

// Statistiche database (con controllo esistenza tabelle)
const getDbStats = async () => {
  try {
    // Prima verifica che le tabelle esistano
    const tables = await getAll(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    const tableNames = tables.map(t => t.name);
    console.log('📋 Tabelle disponibili:', tableNames);
    
    if (tableNames.length === 0) {
      return {
        users_count: 0,
        lists_count: 0,
        tasks_count: 0,
        completed_tasks_count: 0,
        activity_logs_count: 0
      };
    }
    
    // Costruisci query dinamicamente basata su tabelle esistenti
    let query = 'SELECT ';
    const selects = [];
    
    if (tableNames.includes('users')) {
      selects.push('(SELECT COUNT(*) FROM users) as users_count');
    } else {
      selects.push('0 as users_count');
    }
    
    if (tableNames.includes('lists')) {
      selects.push('(SELECT COUNT(*) FROM lists) as lists_count');
    } else {
      selects.push('0 as lists_count');
    }
    
    if (tableNames.includes('tasks')) {
      selects.push('(SELECT COUNT(*) FROM tasks) as tasks_count');
      selects.push('(SELECT COUNT(*) FROM tasks WHERE completed = 1) as completed_tasks_count');
    } else {
      selects.push('0 as tasks_count');
      selects.push('0 as completed_tasks_count');
    }
    
    if (tableNames.includes('activity_logs')) {
      selects.push('(SELECT COUNT(*) FROM activity_logs) as activity_logs_count');
    } else {
      selects.push('0 as activity_logs_count');
    }
    
    query += selects.join(', ');
    
    const stats = await getOne(query);
    return stats;
    
  } catch (error) {
    console.error('❌ Errore statistiche database:', error);
    // Ritorna stats vuote invece di fallire
    return {
      users_count: 0,
      lists_count: 0,
      tasks_count: 0,
      completed_tasks_count: 0,
      activity_logs_count: 0
    };
  }
};

module.exports = {
  initDatabase,
  runQuery,
  getOne,
  getAll,
  transaction,
  closeDatabase,
  createBackup,
  getDbStats,
  get database() { return db; }
};