import { useEffect } from 'react';
import { requestNotificationPermission, showNotification } from '../utils/notifications';

// Hook for reminder notifications
export const useReminderNotifications = (tasks) => {
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.reminder && !task.completed) {
          const reminderTime = new Date(task.reminder);
          const timeDiff = reminderTime.getTime() - now.getTime();
          
          // Notifica se mancano meno di 5 minuti
          if (timeDiff > 0 && timeDiff <= 5 * 60 * 1000) {
            showNotification(task);
          }
        }
      });
    };

    // Richiedi permesso notifiche
    requestNotificationPermission();

    // Controlla ogni minuto
    const interval = setInterval(checkReminders, 60000);
    
    // Controlla subito
    checkReminders();

    return () => clearInterval(interval);
  }, [tasks]);
};