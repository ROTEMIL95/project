import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function CategoryFloatingAddButton({ 
  onClick, 
  categoryColor = 'indigo',
  icon: Icon = Plus,
  label = 'הוסף פריט'
}) {
  const colorMap = {
    blue: {
      base: 'bg-blue-100 text-blue-600 border-blue-200',
      hover: 'hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-xl hover:shadow-blue-500/30'
    },
    orange: {
      base: 'bg-orange-100 text-orange-600 border-orange-200',
      hover: 'hover:bg-orange-600 hover:text-white hover:border-orange-600 hover:shadow-xl hover:shadow-orange-500/30'
    },
    red: {
      base: 'bg-red-100 text-red-600 border-red-200',
      hover: 'hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-xl hover:shadow-red-500/30'
    },
    yellow: {
      base: 'bg-yellow-100 text-yellow-600 border-yellow-200',
      hover: 'hover:bg-yellow-600 hover:text-white hover:border-yellow-600 hover:shadow-xl hover:shadow-yellow-500/30'
    },
    teal: {
      base: 'bg-teal-100 text-teal-600 border-teal-200',
      hover: 'hover:bg-teal-600 hover:text-white hover:border-teal-600 hover:shadow-xl hover:shadow-teal-500/30'
    },
    purple: {
      base: 'bg-purple-100 text-purple-600 border-purple-200',
      hover: 'hover:bg-purple-600 hover:text-white hover:border-purple-600 hover:shadow-xl hover:shadow-purple-500/30'
    },
    indigo: {
      base: 'bg-indigo-100 text-indigo-600 border-indigo-200',
      hover: 'hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/30'
    },
  };

  const colors = colorMap[categoryColor] || colorMap.indigo;

  return (
    <motion.button
      onClick={onClick}
      className={`fixed bottom-32 right-6 z-40 ${colors.base} ${colors.hover} rounded-full p-3 border-2 shadow-md transition-all duration-300`}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </motion.button>
  );
}