import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from 'lucide-react';

export default function PriceTierHelper({ tiers, onTiersChange }) {

  const handleTierChange = (index, field, value) => {
    const newTiers = [...(tiers || [])];
    newTiers[index][field] = value === '' ? '' : Number(value);
    onTiersChange(newTiers);
  };

  const addTier = () => {
    const newTier = { maxArea: '', price: '' };
    onTiersChange([...(tiers || []), newTier]);
  };

  const removeTier = (index) => {
    const newTiers = tiers.filter((_, i) => i !== index);
    onTiersChange(newTiers);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-slate-50" dir="rtl">
      <div className="space-y-3">
        {(tiers || []).map((tier, index) => {
          const minArea = index === 0 ? 1 : (Number(tiers[index - 1].maxArea) || 0) + 1;
          return (
            <div key={index} className="flex items-center gap-4 p-3 bg-white rounded-md border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">מ-</span>
                <Input
                  type="number"
                  value={minArea}
                  readOnly
                  className="w-24 text-center bg-gray-100"
                />
                <span className="text-sm font-medium text-gray-500">עד-</span>
                <Input
                  type="number"
                  placeholder="מ״ר"
                  value={tier.maxArea || ''}
                  onChange={(e) => handleTierChange(index, 'maxArea', e.target.value)}
                  min={minArea}
                  className="w-24"
                />
              </div>
              <div className="flex-1 flex items-center gap-2">
                 <label className="text-sm font-medium text-gray-500 whitespace-nowrap">מחיר למ"ר:</label>
                 <Input
                  type="number"
                  placeholder="מחיר"
                  value={tier.price || ''}
                  onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                />
                <span className="text-sm font-medium text-gray-500">₪</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTier(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={addTier}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 ml-2" />
        הוסף מדרגת מחיר
      </Button>
    </div>
  );
}