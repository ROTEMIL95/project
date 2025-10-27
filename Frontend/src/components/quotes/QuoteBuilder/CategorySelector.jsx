
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Building, Paintbrush, Lightbulb, Wrench, Hammer, Trash2, Lock, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// מפת אייקונים
const ICON_MAP = {
  'cat_paint_plaster': Paintbrush,
  'cat_tiling': Building,
  'cat_demolition': Trash2,
  'cat_electricity': Lightbulb,
  'cat_plumbing': Wrench,
  'cat_construction': Hammer,
};

// מפת צבעים לקטגוריות
const CATEGORY_COLORS = {
  'cat_paint_plaster': {
    name: 'כחול',
    border: 'border-blue-400',
    borderSelected: 'border-blue-500',
    bg: 'bg-blue-50/30',
    bgSelected: 'bg-blue-100/50',
    icon: 'bg-blue-500',
    iconSelected: 'bg-blue-600',
    text: 'text-blue-700',
    textSelected: 'text-blue-800',
    accent: 'from-blue-400 to-blue-600',
    numberBg: 'bg-blue-500'
  },
  'cat_tiling': {
    name: 'כתום',
    border: 'border-orange-400',
    borderSelected: 'border-orange-500',
    bg: 'bg-orange-50/30',
    bgSelected: 'bg-orange-100/50',
    icon: 'bg-orange-500',
    iconSelected: 'bg-orange-600',
    text: 'text-orange-700',
    textSelected: 'text-orange-800',
    accent: 'from-orange-400 to-orange-600',
    numberBg: 'bg-orange-500'
  },
  'cat_demolition': {
    name: 'אדום',
    border: 'border-red-400',
    borderSelected: 'border-red-500',
    bg: 'bg-red-50/30',
    bgSelected: 'bg-red-100/50',
    icon: 'bg-red-500',
    iconSelected: 'bg-red-600',
    text: 'text-red-700',
    textSelected: 'text-red-800',
    accent: 'from-red-400 to-red-600',
    numberBg: 'bg-red-500'
  },
  'cat_electricity': {
    name: 'צהוב',
    border: 'border-yellow-400',
    borderSelected: 'border-yellow-500',
    bg: 'bg-yellow-50/30',
    bgSelected: 'bg-yellow-100/50',
    icon: 'bg-yellow-500',
    iconSelected: 'bg-yellow-600',
    text: 'text-yellow-700',
    textSelected: 'text-yellow-800',
    accent: 'from-yellow-400 to-yellow-600',
    numberBg: 'bg-yellow-500'
  },
  'cat_plumbing': {
    name: 'ירוק',
    border: 'border-teal-400',
    borderSelected: 'border-teal-500',
    bg: 'bg-teal-50/30',
    bgSelected: 'bg-teal-100/50',
    icon: 'bg-teal-500',
    iconSelected: 'bg-teal-600',
    text: 'text-teal-700',
    textSelected: 'text-teal-800',
    accent: 'from-teal-400 to-teal-600',
    numberBg: 'bg-teal-500'
  },
  'cat_construction': {
    name: 'סגול',
    border: 'border-purple-400',
    borderSelected: 'border-purple-500',
    bg: 'bg-purple-50/30',
    bgSelected: 'bg-purple-100/50',
    icon: 'bg-purple-500',
    iconSelected: 'bg-purple-600',
    text: 'text-purple-700',
    textSelected: 'text-purple-800',
    accent: 'from-purple-400 to-purple-600',
    numberBg: 'bg-purple-500'
  }
};

// קטגוריות שחסומות כרגע
const BLOCKED_CATEGORIES = []; 

export default function CategorySelector({ categories, selectedCategories, onToggleCategory, onMoveUp, onMoveDown }) {
  // Don't sort - keep original order
  const sortedCategories = categories;

  return (
    <div className="space-y-4">
      {/* All categories grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 lg:gap-5 xl:gap-6">
        {sortedCategories.map((category, index) => {
          const isSelected = selectedCategories.includes(category.id);
          const isBlocked = BLOCKED_CATEGORIES.includes(category.id);
          const IconComponent = ICON_MAP[category.id];
          const colors = CATEGORY_COLORS[category.id] || CATEGORY_COLORS['cat_construction'];
          const orderNumber = isSelected ? selectedCategories.indexOf(category.id) + 1 : null;
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={!isBlocked ? { y: -3, scale: 1.01 } : {}}
              whileTap={!isBlocked ? { scale: 0.99 } : {}}
            >
              <div
                className={cn(
                  "relative group overflow-hidden rounded-2xl border-2 transition-all duration-300 backdrop-blur-sm",
                  isBlocked ? "cursor-not-allowed" : "hover:shadow-lg cursor-pointer",
                  isSelected && !isBlocked ? `${colors.borderSelected} ${colors.bgSelected}` : 
                  isBlocked ? `${colors.border} bg-gray-50/30` :
                  `${colors.border} ${colors.bg} hover:${colors.bgSelected}`
                )}
                onClick={() => !isBlocked && onToggleCategory(category.id)}
              >
                {/* Order Number Badge - bottom left */}
                {isSelected && !isBlocked && orderNumber && (
                  <div className="absolute bottom-3 left-3 z-20">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                      colors.numberBg
                    )}>
                      <span className="text-white font-bold text-lg">{orderNumber}</span>
                    </div>
                  </div>
                )}

                {/* Lock Icon for Blocked Categories */}
                {isBlocked && (
                  <div className="absolute top-3 left-3 z-20">
                    <div className="p-1.5 bg-gray-400/20 backdrop-blur-sm rounded-lg">
                      <Lock className="w-3 h-3 text-gray-500" />
                    </div>
                  </div>
                )}

                <div className="relative z-10 p-4 lg:p-5 xl:p-6">
                  {/* Header with Icon and Selection State */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Icon Container */}
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all duration-300 shadow-sm",
                        isSelected && !isBlocked ? colors.iconSelected : 
                        isBlocked ? `bg-gray-200` :
                        colors.icon
                      )}>
                        {IconComponent && (
                          <IconComponent className={cn(
                            "w-5 h-5",
                            isSelected && !isBlocked ? 'text-white' : 
                            isBlocked ? 'text-gray-400' :
                            'text-white'
                          )} />
                        )}
                      </div>
                      
                      {/* Category Title */}
                      <div>
                        <h3 className={cn(
                          "font-bold text-lg transition-colors duration-300",
                          isSelected && !isBlocked ? colors.textSelected :
                          isBlocked ? "text-gray-500" :
                          colors.text
                        )}>
                          {category.name}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Selection Indicator */}
                    {!isBlocked && (
                      <div className={cn(
                        "transition-all duration-300",
                        isSelected ? "scale-110" : "scale-100 group-hover:scale-105"
                      )}>
                        {isSelected ? (
                          <CheckCircle2 className={cn("h-6 w-6", colors.textSelected)} />
                        ) : (
                          <Circle className={cn("h-6 w-6 opacity-40 group-hover:opacity-70", colors.text)} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className={cn(
                    "text-sm mb-3 leading-relaxed transition-colors duration-300 min-h-[36px]",
                    isSelected && !isBlocked ? `${colors.textSelected} opacity-90` :
                    isBlocked ? "text-gray-400" :
                    `${colors.text} opacity-80`
                  )}>
                    {isBlocked ? "קטגוריה זו תהיה זמינה בקרוב" : (category.description || "בחר קטגוריה זו כדי להוסיף פריטים רלוונטיים.")}
                  </p>

                  {/* Sub-categories Tags */}
                  {category.subCategories && category.subCategories.length > 0 && !isBlocked && (
                    <div className="flex flex-wrap gap-2">
                      {category.subCategories.slice(0, 2).map(sub => (
                        <Badge 
                          key={sub.id}
                          className={cn(
                            "text-xs px-2.5 py-1 transition-all duration-300 border",
                            isSelected ? `${colors.bgSelected} ${colors.textSelected} border-transparent` :
                            `bg-white/60 ${colors.text} ${colors.border} border-opacity-50 hover:${colors.bgSelected}`
                          )}
                        >
                          {sub.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Coming Soon Tag for Blocked */}
                  {isBlocked && (
                    <div className="flex justify-start">
                      <Badge className="bg-gray-200 text-gray-500 text-xs px-3 py-1">
                        בקרוב
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Bottom Accent Line for Selected */}
                {isSelected && !isBlocked && (
                  <motion.div 
                    layoutId={`accent-line-${category.id}`}
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r",
                      colors.accent
                    )} 
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
