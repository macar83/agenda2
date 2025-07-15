const bcrypt = require('bcryptjs');
require('dotenv').config();

const { initDatabase, runQuery, getOne, getAll, closeDatabase, transaction } = require('../config/database');

// Dati di esempio
const SAMPLE_USERS = [
  {
    email: 'demo@agenda.com',
    name: 'Demo User',
    password: 'demo123',
    theme: 'light',
    sound_enabled: true,
    selected_rss_source: 'techcrunch'
  },
  {
    email: 'mario@test.com',
    name: 'Mario Rossi',
    password: 'password123',
    theme: 'dark',
    sound_enabled: false,
    selected_rss_source: 'ansa'
  }
];

const SAMPLE_LISTS = [
  {
    name: 'Lavoro',
    color: '#3B82F6',
    description: 'Task legati al lavoro e progetti'
  },
  {
    name: 'Personale',
    color: '#10B981',
    description: 'Attività personali e casa'
  },
  {
    name: 'Studio',
    color: '#F59E0B',
    description: 'Materiali di studio e corsi'
  },
  {
    name: 'Fitness',
    color: '#EF4444',
    description: 'Allenamenti e obiettivi fitness'
  }
];

const SAMPLE_TASKS = [
  // Tasks per lista Lavoro
  {
    listIndex: 0,
    title: 'Completare presentazione Q1',
    details: 'Preparare slide per meeting con il team di marketing',
    priority: 'high',
    completed: false,
    reminder: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Domani
  },
  {
    listIndex: 0,
    title: 'Review codice del nuovo feature',
    details: 'Controllare pull request #234 e dare feedback',
    priority: 'medium',
    completed: false
  },
  {
    listIndex: 0,
    title: 'Meeting con cliente ABC',
    details: 'Discussione requisiti nuovo progetto',
    priority: 'high',
    completed: true,
    reminder: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 ore fa
  },

  // Tasks per lista Personale
  {
    listIndex: 1,
    title: 'Fare spesa settimanale',
    details: 'Latte, pane, frutta, verdura, detersivi',
    priority: 'medium',
    completed: false,
    reminder: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // Tra 6 ore
  },
  {
    listIndex: 1,
    title: 'Chiamare dentista per appuntamento',
    details: 'Prenotare pulizia dei denti',
    priority: 'low',
    completed: false
  },
  {
    listIndex: 1,
    title: 'Pagare bolletta elettrica',
    details: 'Scadenza 15 del mese',
    priority: 'high',
    completed: true,
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Tra 5 giorni
  },

  // Tasks per lista Studio
  {
    listIndex: 2,
    title: 'Leggere capitolo 5 - React Hooks',
    details: 'Studiare useState, useEffect e custom hooks',
    priority: 'medium',
    completed: false
  },
  {
    listIndex: 2,
    title: 'Esercizi JavaScript avanzato',
    details: 'Completare esercizi su closures e prototypes',
    priority: 'medium',
    completed: false
  },
  {
    listIndex: 2,
    title: 'Quiz TypeScript',
    details: 'Test di autovalutazione sui generics',
    priority: 'low',
    completed: true
  },

  // Tasks per lista Fitness
  {
    listIndex: 3,
    title: 'Allenamento petto e tricipiti',
    details: 'Panca piana, spinte manubri, french press',
    priority: 'medium',
    completed: false,
    reminder: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // Domani mattina
  },
  {
    listIndex: 3,
    title: 'Corsa 5km',
    details: 'Mantenere ritmo 5:30 per km',
    priority: 'medium',
    completed: true
  },
  {
    listIndex: 3,
    title: 'Stretching post allenamento',
    details: '15 minuti di stretching completo',
    priority: 'low',
    completed: false
  }
];

async function seedDatabase() {
  console.log('🌱 Popola database con dati di esempio...');
  
  try {
    // Assicurati che il database sia inizializzato
    await initDatabase();
    
    // Controlla se ci sono già dati
    const existingUsers = await getAll('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count > 0) {
      console.log('⚠️  Database contiene già dati.');
      console.log('   Vuoi cancellare tutto e ricominciare? (Ctrl+C per annullare)');
      
      // Aspetta 3 secondi per dare tempo di annullare
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('🧹 Pulizia database esistente...');
      await runQuery('DELETE FROM activity_logs');
      await runQuery('DELETE FROM user_sessions');
      await runQuery('DELETE FROM user_settings');
      await runQuery('DELETE FROM tasks');
      await runQuery('DELETE FROM lists');
      await runQuery('DELETE FROM users');
      
      console.log('✅ Database pulito');
    }

    const createdUsers = [];
    const createdLists = [];

    // Crea utenti di esempio
    console.log('👥 Creazione utenti...');
    for (const userData of SAMPLE_USERS) {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      const userResult = await runQuery(`
        INSERT INTO users (email, name, password_hash, theme, sound_enabled, selected_rss_source)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        userData.email,
        userData.name,
        passwordHash,
        userData.theme,
        userData.sound_enabled,
        userData.selected_rss_source
      ]);

      createdUsers.push({
        id: userResult.id,
        ...userData
      });

      console.log(`  ✅ Utente creato: ${userData.email} (password: ${userData.password})`);
    }

    // Crea liste per ogni utente
    console.log('📋 Creazione liste...');
    for (const user of createdUsers) {
      for (let i = 0; i < SAMPLE_LISTS.length; i++) {
        const listData = SAMPLE_LISTS[i];
        
        const listResult = await runQuery(`
          INSERT INTO lists (user_id, name, color, description, position)
          VALUES (?, ?, ?, ?, ?)
        `, [user.id, listData.name, listData.color, listData.description, i]);

        createdLists.push({
          id: listResult.id,
          userId: user.id,
          userEmail: user.email,
          listIndex: i,
          ...listData
        });

        console.log(`  ✅ Lista creata: ${listData.name} per ${user.email}`);
      }
    }

    // Crea tasks per ogni lista
    console.log('📝 Creazione tasks...');
    let taskPosition = 0;
    
    for (const taskData of SAMPLE_TASKS) {
      // Trova la lista corrispondente per ogni utente
      const listsForThisIndex = createdLists.filter(list => list.listIndex === taskData.listIndex);
      
      for (const list of listsForThisIndex) {
        const taskResult = await runQuery(`
          INSERT INTO tasks (
            list_id, user_id, title, details, completed, priority, 
            reminder, due_date, position
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          list.id,
          list.userId,
          taskData.title,
          taskData.details || null,
          taskData.completed ? 1 : 0,
          taskData.priority,
          taskData.reminder || null,
          taskData.due_date || null,
          taskPosition++
        ]);

        console.log(`  ✅ Task creato: "${taskData.title}" in "${list.name}" per ${list.userEmail}`);
      }
    }

    // Crea alcune impostazioni personalizzate
    console.log('⚙️ Creazione impostazioni...');
    for (const user of createdUsers) {
      const settings = [
        { key: 'notifications_enabled', value: 'true' },
        { key: 'daily_goal', value: '5' },
        { key: 'week_start', value: 'monday' }
      ];

      for (const setting of settings) {
        await runQuery(`
          INSERT INTO user_settings (user_id, setting_key, setting_value)
          VALUES (?, ?, ?)
        `, [user.id, setting.key, setting.value]);
      }
    }

    // Mostra statistiche finali
    console.log('\n📊 Statistiche database popolato:');
    const stats = await getOne(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM lists) as lists,
        (SELECT COUNT(*) FROM tasks) as tasks,
        (SELECT COUNT(*) FROM tasks WHERE completed = 1) as completed_tasks,
        (SELECT COUNT(*) FROM user_settings) as settings
    `);

    console.log(`  👥 Utenti: ${stats.users}`);
    console.log(`  📋 Liste: ${stats.lists}`);
    console.log(`  📝 Tasks: ${stats.tasks}`);
    console.log(`  ✅ Tasks completati: ${stats.completed_tasks}`);
    console.log(`  ⚙️ Impostazioni: ${stats.settings}`);

    console.log('\n🎉 Database popolato con successo!');
    console.log('\n🔑 Credenziali di accesso:');
    for (const user of SAMPLE_USERS) {
      console.log(`  📧 ${user.email} | 🔐 ${user.password}`);
    }
    console.log('\n🚀 Avvia il server con: npm run dev');
    console.log('💻 Poi testa il login su: http://localhost:3000');

  } catch (error) {
    console.error('❌ Errore durante il seeding:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Funzione per reset completo database
async function resetDatabase() {
  console.log('🔄 Reset completo database...');
  
  try {
    await initDatabase();
    
    console.log('🧹 Eliminazione tutti i dati...');
    const tables = ['activity_logs', 'user_sessions', 'user_settings', 'tasks', 'lists', 'users'];
    
    for (const table of tables) {
      await runQuery(`DELETE FROM ${table}`);
      console.log(`  ✅ Tabella ${table} svuotata`);
    }
    
    console.log('✅ Database resetato completamente');
    
  } catch (error) {
    console.error('❌ Errore reset database:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Gestione argomenti command line
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'reset':
      resetDatabase();
      break;
    default:
      seedDatabase();
      break;
  }
}

module.exports = { seedDatabase, resetDatabase };