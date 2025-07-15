// Utility functions for date handling
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTimeInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
};

export const isOverdue = (dateString) => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

export const isToday = (dateString) => {
  if (!dateString) return false;
  const today = new Date();
  const taskDate = new Date(dateString);
  return taskDate.toDateString() === today.toDateString();
};

export const isTomorrow = (dateString) => {
  if (!dateString) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const taskDate = new Date(dateString);
  return taskDate.toDateString() === tomorrow.toDateString();
};