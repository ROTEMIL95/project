import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from 'lucide-react';
import { DIFFICULTY_LEVELS } from '../../hooks/useItemCalculation';

export const ItemList = ({
  items,
  onUpdateItem,
  onRemoveItem,
  categoryType,
  formatPrice = (price) => new Intl.NumberFormat('he-IL').format(price || 0)
}) => {
  const renderItemControls = (item) => {
    switch (categoryType) {
      case 'demolition':
        return (
          <>
            <Input
              type="number"
              value={item.quantity}
              onChange={(e) => onUpdateItem(item.id, 'quantity', e.target.value)}
              className="w-24"
            />
            <Select
              value={item.difficultyLevel}
              onValueChange={(value) => onUpdateItem(item.id, 'difficultyLevel', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    <span className={level.color}>{level.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        );
      case 'electrical':
        return (
          <>
            <Input
              type="number"
              value={item.quantity}
              onChange={(e) => onUpdateItem(item.id, 'quantity', e.target.value)}
              className="w-24"
            />
            <Input
              type="number"
              value={item.unitPrice}
              onChange={(e) => onUpdateItem(item.id, 'unitPrice', e.target.value)}
              className="w-32"
              placeholder="מחיר ליחידה"
            />
          </>
        );
      default:
        return (
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdateItem(item.id, 'quantity', e.target.value)}
            className="w-24"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
          <div className="flex-1">
            <h3 className="font-medium">{item.name}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {renderItemControls(item)}
            
            <div className="text-right min-w-[100px]">
              <div className="font-medium">{formatPrice(item.totalPrice || item.unitPrice * item.quantity)} ₪</div>
              <div className="text-sm text-gray-500">{formatPrice(item.unitPrice)} ₪ / {item.unit}</div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveItem(item.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
