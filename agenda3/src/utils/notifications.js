// Notification system
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return Notification.permission === 'granted';
};

export const showNotification = (task) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`⏰ Scadenza Task: ${task.title}`, {
      body: task.details || 'Il task sta per scadere!',
      icon: '/favicon.ico',
      tag: `task-${task.id}`,
      requireInteraction: true
    });
  }
};