import React from 'react';

export const StatsView = () => {
  const mockStats = {
    totalTasks: 15,
    completedTasks: 7,
    incompleteTasks: 8,
    completionRate: 47
  };

  const mockLists = [
    { id: 1, name: 'Lavoro', color: '#3B82F6', total: 5, completed: 2 },
    { id: 2, name: 'Personale', color: '#EF4444', total: 3, completed: 1 },
    { id: 3, name: 'Shopping', color: '#10B981', total: 7, completed: 4 }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistiche</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso Generale</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{mockStats.completionRate}%</div>
            <p className="text-sm text-gray-500">Task completati</p>
            <div className="mt-4 bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${mockStats.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuzione Task</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Completati</span>
              <span className="font-semibold text-green-600">{mockStats.completedTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">In corso</span>
              <span className="font-semibold text-orange-600">{mockStats.incompleteTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Totali</span>
              <span className="font-semibold text-gray-900">{mockStats.totalTasks}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Produttività</h3>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{mockLists.length}</div>
            <p className="text-sm text-gray-500 mb-3">Liste attive</p>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(mockStats.totalTasks / mockLists.length)}
            </div>
            <p className="text-xs text-gray-500">Task per lista</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dettaglio per Lista</h3>
        <div className="space-y-4">
          {mockLists.map(list => {
            const completionRate = Math.round((list.completed / list.total) * 100);
            return (
              <div key={list.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: list.color }} />
                    <h4 className="font-medium text-gray-900">{list.name}</h4>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">{completionRate}%</span>
                </div>
                
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>{list.completed} / {list.total} completati</span>
                  <span>{list.total - list.completed} rimanenti</span>
                </div>
                
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};