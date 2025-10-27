import React from 'react';
import { Layers } from 'lucide-react';

export const DIFFICULTY_FACTORS = [
  { 
    id: 'normal', 
    name: 'ללא מורכבות', 
    description: '(אפס)', 
    factor: 1.0,
    multiplier: 1.0 
  },
  { 
    id: 'slightly_difficult', 
    name: 'מורכבות קלה', 
    description: '(הוספה +10%)', 
    factor: 1.1,
    multiplier: 1.1 
  },
  { 
    id: 'moderately_difficult', 
    name: 'מורכבות בינונית', 
    description: '(הוספה +20%)', 
    factor: 1.2,
    multiplier: 1.2 
  },
  { 
    id: 'highly_difficult', 
    name: 'מורכבות גבוהה', 
    description: '(הוספה +30%)', 
    factor: 1.3,
    multiplier: 1.3 
  },
  { 
    id: 'very_difficult', 
    name: 'מורכבות גבוהה מאוד', 
    description: '(הוספה +40%)', 
    factor: 1.4,
    multiplier: 1.4 
  },
  { 
    id: 'extremely_difficult', 
    name: 'מורכבות קיצונית', 
    description: '(הוספה +50%)', 
    factor: 1.5,
    multiplier: 1.5 
  }
];

export default function ComplexityOptions({ selectedDifficulty, onSelect, colorScheme = 'blue' }) {
  const colorClasses = {
    blue: {
      container: 'bg-blue-50 border-blue-200',
      selected: 'bg-blue-600 text-white border-blue-600',
      unselected: 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400',
      icon: 'text-blue-500'
    },
    orange: {
      container: 'bg-orange-50 border-orange-200',
      selected: 'bg-orange-600 text-white border-orange-600',
      unselected: 'bg-white border-gray-300 text-gray-700 hover:bg-orange-50 hover:border-orange-400',
      icon: 'text-orange-500'
    }
  };

  const colors = colorClasses[colorScheme] || colorClasses.blue;

  return (
    <div className={`p-4 rounded-lg border ${colors.container}`}>
      <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
        <Layers className={`h-5 w-5 ${colors.icon} mr-3`} />
        בחר רמת מורכבות
      </h4>
      <div className="space-y-2">
        {DIFFICULTY_FACTORS.map(factor => (
          <button
            key={factor.id}
            type="button"
            onClick={() => onSelect(factor)}
            className={`w-full text-right p-3 rounded-md border transition-all duration-200 ${
              selectedDifficulty?.id === factor.id 
                ? colors.selected
                : colors.unselected
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium opacity-80">{factor.description}</span>
              <span className="font-semibold">{factor.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}