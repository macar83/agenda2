const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function simpleInit() {
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'agenda.db');
  const SCHEMA_PATH = path.join(__dirname, '..', 'database.sql');

  console.log('🚀 Inizializzazione database semplificata...');

  try {
    // Elimina database esistente
    try {
      await fs.unlink(DB_PATH);
      console.log('🗑️ Database esistente eliminato');
    } catch (err) {
      console.log('📄 Creazione nuovo database');
    }

    // Crea directory se non esiste
    const dataDir = path.dirname(DB_PATH);
    await fs.mkdir(dataDir, { recursive: true });

    // Leggi schema
    const schema = await fs.readFile(SCHEMA_PATH, 'utf8');
    console.log('📝 Schema caricato, lunghezza:', schema.length, 'caratteri');

    // Crea database e esegui schema
    const db = new sqlite3.Database(DB_PATH);

    // Abilita foreign keys
    await new Promise((resolve, reject) => {
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Esegui tutte le CREATE TABLE una per una
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255),
        google_id VARCHAR(100) UNIQUE,
        avatar_url TEXT,
        theme VARCHAR(20) DEFAULT 'light',
        sound_enabled BOOLEAN DEFAULT true,
        selected_rss_source VARCHAR(50) DEFAULT 'techcrunch',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) NOT NULL,
        description TEXT,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        details TEXT,
        completed BOOLEAN DEFAULT false,
        priority VARCHAR(10) DEFAULT 'medium',
        reminder DATETIME,
        due_date DATETIME,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, setting_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(20),
        entity_id INTEGER,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    // Esegui ogni CREATE TABLE
    for (let i = 0; i < tables.length; i++) {
      await new Promise((resolve, reject) => {
        db.run(tables[i], (err) => {
          if (err) {
            console.error(`❌ Errore tabella ${i + 1}:`, err.message);
            reject(err);
          } else {
            console.log(`✅ Tabella ${i + 1}/6 creata`);
            resolve();
          }
        });
      });
    }

    // Crea indici
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)'
    ];

    for (const index of indices) {
      await new Promise((resolve, reject) => {
        db.run(index, (err) => {
          if (err) {
            console.error(`⚠️ Errore indice:`, err.message);
          }
          resolve();
        });
      });
    }

    console.log('📋 Indici creati');

    // Verifica tabelle create
    const tables_check = await new Promise((resolve, reject) => {
      db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📋 Tabelle create:', tables_check.map(t => t.name).join(', '));

    // Chiudi database
    db.close();

    console.log('🎉 Database inizializzato con successo!');
    console.log('📍 Percorso:', DB_PATH);
    console.log('🚀 Ora puoi avviare: npm run dev');

  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  simpleInit();
}

module.exports = { simpleInit };