import React, { useState } from 'react';
import { ChevronDown, Check, Rss } from 'lucide-react';

export const RSSSourceSelector = ({ selectedSourceId, onSourceChange, sources }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedSource = sources.find(source => source.id === selectedSourceId) || sources[0];
  
  const colorClasses = {
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    black: 'bg-gray-800',
    green: 'bg-green-500',
    gray: 'bg-gray-500'
  };

  const handleSourceSelect = (sourceId) => {
    console.log('📰 RSS source changed to:', sourceId);
    onSourceChange(sourceId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
      >
        <div className={`w-3 h-3 rounded-full ${colorClasses[selectedSource.color] || 'bg-gray-500'}`}></div>
        <span className="text-gray-700">{selectedSource.name}</span>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            {sources.map(source => (
              <button
                key={source.id}
                onClick={() => handleSourceSelect(source.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                  source.id === selectedSourceId ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${colorClasses[source.color] || 'bg-gray-500'}`}></div>
                <span className="text-gray-700 text-sm flex-1">{source.name}</span>
                {source.id === selectedSourceId && (
                  <Check size={14} className="text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};