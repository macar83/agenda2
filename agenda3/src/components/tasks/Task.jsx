import React, { useState, useContext } from 'react';
import { MessageCircle, Edit3, Check, X, Trash2, Clock } from 'lucide-react';
import AppContext from '../../contexts/AppContext';
import { formatDateTime, formatDateTimeInput, isOverdue, isToday, isTomorrow } from '../../utils/dateUtils';

// Task Component
export const Task = ({ task, onToggle, onDelete, onEdit, listId }) => {
  const { addComment, deleteComment } = useContext(AppContext);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDetails, setEditDetails] = useState(task.details || '');
  const [editPriority, setEditPriority] = useState(task.priority || 'medium');
  const [editReminder, setEditReminder] = useState(formatDateTimeInput(task.reminder));

  const handleEdit = () => {
    if (isEditing) {
      onEdit(task.id, {
        title: editTitle,
        details: editDetails,
        priority: editPriority,
        reminder: editReminder || null,
        completed: task.completed
      });
    }
    setIsEditing(!isEditing);
  };

  const handleAddComment = async () => {
    if (commentText.trim()) {
      await addComment(listId, task.id, commentText);
      setCommentText('');
    }
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const getReminderStatus = () => {
    if (!task.reminder) return null;
    
    if (isOverdue(task.reminder)) {
      return { text: 'Scaduto', color: 'text-red-600', bg: 'bg-red-50' };
    } else if (isToday(task.reminder)) {
      return { text: 'Oggi', color: 'text-orange-600', bg: 'bg-orange-50' };
    } else if (isTomorrow(task.reminder)) {
      return { text: 'Domani', color: 'text-blue-600', bg: 'bg-blue-50' };
    } else {
      return { text: formatDateTime(task.reminder), color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  const reminderStatus = getReminderStatus();

  return (
    <div className={`p-4 rounded-lg border ${task.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          
          {isEditing ? (
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={editDetails}
                onChange={(e) => setEditDetails(e.target.value)}
                placeholder="Dettagli..."
                className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-sm"
                rows="2"
              />
              <div className="flex space-x-2">
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
                <input
                  type="datetime-local"
                  value={editReminder}
                  onChange={(e) => setEditReminder(e.target.value)}
                  className="px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Scadenza"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {task.title}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                  {task.priority === 'low' ? 'Bassa' : task.priority === 'medium' ? 'Media' : 'Alta'}
                </span>
              </div>
              
              {task.details && (
                <p className={`text-sm mb-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                  {task.details}
                </p>
              )}
              
              {reminderStatus && (
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${reminderStatus.bg} ${reminderStatus.color}`}>
                  <Clock size={12} />
                  <span>{reminderStatus.text}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {task.comment_count > 0 && (
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <MessageCircle size={16} />
              <span>{task.comment_count}</span>
            </button>
          )}
          
          <button
            onClick={handleEdit}
            className="p-1 text-gray-400 hover:text-blue-600"
            title={isEditing ? "Salva" : "Modifica"}
          >
            {isEditing ? <Check size={16} /> : <Edit3 size={16} />}
          </button>
          
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Annulla"
            >
              <X size={16} />
            </button>
          )}
          
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Elimina"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {showComments && (
        <div className="mt-4 border-t pt-4">
          <div className="space-y-3">
            {task.comments && task.comments.map(comment => (
              <div key={comment.id} className="flex justify-between items-start bg-gray-50 p-2 rounded">
                <div>
                  <p className="text-sm text-gray-700">{comment.text}</p>
                  <p className="text-xs text-gray-500">{comment.author_name}</p>
                </div>
                <button
                  onClick={() => deleteComment(listId, task.id, comment.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Aggiungi un commento..."
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};