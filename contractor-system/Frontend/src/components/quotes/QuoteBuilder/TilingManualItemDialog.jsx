import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar } from 'lucide-react';

export default function TilingManualItemDialog({
  open,
  onOpenChange,
  onAdd,
  editingItem = null,
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

  // Toggle between days/hours
  const [timeUnit, setTimeUnit] = useState('days'); // 'days' or 'hours'

  // יחידת מידה
  const [unit, setUnit] = useState('מ״ר');

  // ✅ Tile size fields - split into two parts
  const [sizeWidth, setSizeWidth] = useState('');
  const [sizeHeight, setSizeHeight] = useState('');

  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      if (editingItem) {
        // Load data from editing item
        // ✅ materialCost is already the total cost, don't divide by quantity
        const totalMaterialCost = editingItem.materialCost || 0;

        setFormData({
          name: editingItem.name || '',
          description: editingItem.description || '',
          quantity: editingItem.quantity || 0,
          materialCost: totalMaterialCost, // Total cost, not per unit
          workDuration: editingItem.workDuration || 0,
        });
        setTimeUnit('days');
        setUnit(editingItem.unit || 'מ״ר');

        // Parse existing selectedSize like "60X60" into width and height
        const existingSize = editingItem.selectedSize || '';
        const parts = existingSize.split('X');
        setSizeWidth(parts[0] || '');
        setSizeHeight(parts[1] || '');
      } else {
        // Reset form for new item
        setFormData({
          name: '',
          description: '',
          quantity: 0,
          materialCost: 0,
          workDuration: 0,
        });
        setTimeUnit('days');
        setUnit('מ״ר');
        setSizeWidth('');
        setSizeHeight('');
      }
    }
    prevOpenRef.current = open;
  }, [open, editingItem]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const profitPercent = Number(defaults.desiredProfitPercent) || 30;
  const laborCostPerDay = Number(defaults.laborCostPerDay) || 1000;

  // Calculate labor cost based on selected time unit
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

  // ✅ Total cost WITHOUT quantity multiplier - quantity is only for display
  const totalCost = useMemo(() => {
    const materialCostPerUnit = Number(formData.materialCost) || 0;
    // Don't multiply by quantity - materialCost is already the total cost
    return materialCostPerUnit + laborCost;
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

    const quantity = Number(formData.quantity) || 0;
    // ✅ materialCost is already the total cost, don't multiply by quantity
    const totalMaterialCost = Number(formData.materialCost) || 0;

    // Combine width and height with X
    const combinedSize = (sizeWidth && sizeHeight) ? `${sizeWidth}X${sizeHeight}` : (sizeWidth || sizeHeight || null);

    const itemToAdd = {
      id: `tiling_manual_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      quantity: quantity, // Quantity is only for display in quote
      unit: unit, // יחידת מידה שנבחרה
      materialCost: totalMaterialCost, // Total material cost (not affected by quantity)
      laborCost: laborCost,
      totalCost: totalCost,
      totalPrice: totalPrice,
      profit: profit,
      profitPercent: profitPercent,
      workDuration: workDurationInDays, // Always store as days
      workType: workTypes?.[0]?.id || 'ריצוף', // ✅ FIX: Changed default from 'floor_tiling' to Hebrew 'ריצוף'
      selectedSize: combinedSize, // ✅ Combine width X height
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
          <DialogTitle className="text-lg font-bold">
            {editingItem ? 'עריכת פריט ריצוף וחיפוי' : 'הוספת פריט ריצוף וחיפוי ידני'}
          </DialogTitle>
          <p className="text-xs text-gray-500">לדוגמה: קרמיקה באזור המטבח.</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="name" className="text-sm flex items-center gap-1">
              שם הפריט
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
              תיאור הפריט
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
                כמות
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
              <Label htmlFor="sizeWidth" className="text-sm">
                גודל אריח
              </Label>
              <div className="flex items-center gap-1 mt-1 max-w-[140px]">
                <Input
                  id="sizeWidth"
                  type="number"
                  value={sizeWidth}
                  onChange={(e) => setSizeWidth(e.target.value)}
                  placeholder="60"
                  className="h-9 text-center w-14"
                />
                <div className="flex-shrink-0 w-6 h-9 flex items-center justify-center bg-indigo-100 border border-indigo-300 rounded font-bold text-indigo-700">
                  X
                </div>
                <Input
                  id="sizeHeight"
                  type="number"
                  value={sizeHeight}
                  onChange={(e) => setSizeHeight(e.target.value)}
                  placeholder="60"
                  className="h-9 text-center w-14"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">


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
              {/* Toggle buttons for days/hours */}
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

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9">
            ביטול
          </Button>
          <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700 h-9">
            {editingItem ? 'עדכן פריט' : 'הוסף להצעה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
