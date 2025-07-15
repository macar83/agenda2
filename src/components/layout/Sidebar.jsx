import React, { useContext } from 'react';
import { Eye, Calendar, BarChart3 } from 'lucide-react';
import AppContext from '../../contexts/AppContext';

export const Sidebar = () => {
  const { data, updateData } = useContext(AppContext);

  const menuItems = [
    { id: 'overview', icon: Eye, label: 'Panoramica' },
    { id: 'lists', icon: Calendar, label: 'Liste' },
    { id: 'stats', icon: BarChart3, label: 'Statistiche' }
  ];

  const handleMenuClick = (viewId) => {
    console.log('🔘 Menu clicked:', viewId);
    updateData({ currentView: viewId, selectedList: null });
  };

  return (
    <aside className="w-64 bg-white shadow-sm border-r">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  data.currentView === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};