/**
 * TilingManualItemDialog - Manual Tiling Item Dialog for Quote Builder Step 3
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Clock, Calendar } from 'lucide-react';

export default function TilingManualItemDialog({
  open,
  onOpenChange,
  onAdd,
  defaults = {},
  workTypes = [],
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 0,
    materialCost: 0,
    workDuration: 0,
  });

  // NEW: Toggle between days/hours
  const [timeUnit, setTimeUnit] = useState('days'); // 'days' or 'hours'

  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFormData({
        name: '',
        description: '',
        quantity: 0,
        materialCost: 0,
        workDuration: 0,
      });
      setTimeUnit('days');
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const profitPercent = Number(defaults.desiredProfitPercent) || 30;
  const laborCostPerDay = Number(defaults.laborCostPerDay) || 1000;

  // FIXED: Calculate labor cost based on selected time unit
  const laborCost = useMemo(() => {
    const duration = Number(formData.workDuration) || 0;
    if (timeUnit === 'hours') {
      // Convert hours to days (8 hours = 1 day)
      const days = duration / 8;
      return Math.round(days * laborCostPerDay);
    } else {
      // Days
      return Math.round(duration * laborCostPerDay);
    }
  }, [formData.workDuration, laborCostPerDay, timeUnit]);

  const totalCost = useMemo(() => {
    const material = Number(formData.materialCost) || 0;
    return material + laborCost;
  }, [formData.materialCost, laborCost]);

  const totalPrice = useMemo(() => {
    return Math.round(totalCost * (1 + profitPercent / 100));
  }, [totalCost, profitPercent]);

  const profit = useMemo(() => {
    return totalPrice - totalCost;
  }, [totalPrice, totalCost]);

  // Convert work duration to days for storage (always store as days)
  const workDurationInDays = useMemo(() => {
    const duration = Number(formData.workDuration) || 0;
    if (timeUnit === 'hours') {
      return duration / 8;
    }
    return duration;
  }, [formData.workDuration, timeUnit]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('אנא הזן שם לפריט');
      return;
    }

    const itemToAdd = {
      name: formData.name,
      description: formData.description,
      quantity: Number(formData.quantity) || 0,
      unit: 'מ״ר',
      materialCost: Number(formData.materialCost) || 0,
      laborCost: laborCost,
      totalCost: totalCost,
      totalPrice: totalPrice,
      profit: profit,
      profitPercent: profitPercent,
      workDuration: workDurationInDays, // Always store as days
      workType: workTypes?.[0]?.id || 'floor_tiling',
    };

    if (onAdd) {
      onAdd(itemToAdd);
    }
    onOpenChange(false);
  };

  const formatPrice = (price) => {
    return `₪${(Number(price) || 0).toLocaleString('he-IL')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6" dir="rtl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-bold">הוספת פריט ריצוף וחיפוי ידני</DialogTitle>
          <p className="text-xs text-gray-500">לדוגמה: קרמיקה באזור המטבח.</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="name" className="text-sm flex items-center gap-1">
              שם הפריט <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder=""
              className="mt-1 h-9"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm">
              תיאור הפריט <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="לדוגמה: ריצוף רצפה"
              rows={2}
              className="mt-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantity" className="text-sm">
                כמות (מ"ר) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="0"
                className="mt-1 h-9"
              />
            </div>

            <div>
              <Label htmlFor="materialCost" className="text-sm">
                עלות חומרים (ש"ח)
              </Label>
              <Input
                id="materialCost"
                type="number"
                min="0"
                value={formData.materialCost}
                onChange={(e) => handleChange('materialCost', e.target.value)}
                placeholder="0"
                className="mt-1 h-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="workDuration" className="text-sm">
              זמן עבודה
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="workDuration"
                type="number"
                min="0"
                step="0.1"
                value={formData.workDuration}
                onChange={(e) => handleChange('workDuration', e.target.value)}
                placeholder="0"
                className="flex-1 h-9"
              />
              {/* NEW: Toggle buttons for days/hours */}
              <div className="flex bg-gray-100 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setTimeUnit('days')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    timeUnit === 'days'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-3 h-3 inline ml-1" />
                  ימים
                </button>
                <button
                  type="button"
                  onClick={() => setTimeUnit('hours')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    timeUnit === 'hours'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Clock className="w-3 h-3 inline ml-1" />
                  שעות
                </button>
              </div>
            </div>
            {formData.workDuration > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                עלות עבודה: {formatPrice(laborCost)}
                {timeUnit === 'hours' && ` (${(Number(formData.workDuration) / 8).toFixed(1)} ימים)`}
              </p>
            )}
          </div>

          <Separator className="my-2" />

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 p-2 rounded-lg text-center">
              <div className="text-xs text-blue-600 mb-1">מחיר ללקוח</div>
              <div className="font-bold text-blue-700 text-sm">{formatPrice(totalPrice)}</div>
            </div>

            <div className="bg-green-50 p-2 rounded-lg text-center">
              <div className="text-xs text-green-600 mb-1">רווח צפוי</div>
              <div className="font-bold text-green-700 text-sm">{formatPrice(profit)}</div>
            </div>

            <div className="bg-red-50 p-2 rounded-lg text-center">
              <div className="text-xs text-red-600 mb-1">עלות קבלן</div>
              <div className="font-bold text-red-700 text-sm">{formatPrice(totalCost)}</div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9">
            ביטול
          </Button>
          <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700 h-9">
            הוסיף להצעה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
