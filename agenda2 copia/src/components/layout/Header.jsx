import React from 'react';
import { Settings, LogOut } from 'lucide-react';

export const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">Task Manager Pro</h1>
            <span className="text-sm text-gray-500">Benvenuto, Test User</span>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 hover:text-gray-700" title="Impostazioni">
              <Settings size={20} />
            </button>
            <button className="p-2 text-gray-500 hover:text-red-600" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};