import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ConstructionManualItemDialog({
  open,
  onOpenChange,
  onAdd,
  defaults = {},
  title = "פריט בינוי ידני",
  submitLabel = "הוסף"
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [materialCostPerUnit, setMaterialCostPerUnit] = useState(0);
  
  // זמן עבודה
  const [workTimeUnit, setWorkTimeUnit] = useState('days');
  const [workTimeValue, setWorkTimeValue] = useState(0);
  
  // עלות עבודה
  const [laborDayCost, setLaborDayCost] = useState(1000);
  
  // רווח
  const desiredProfitPercent = defaults.desiredProfitPercent || 30;

  useEffect(() => {
    if (open) {
      const dayCost = defaults.laborCostPerDay || defaults.laborDayCost || 1000;
      console.log('Loading labor cost from defaults:', { defaults, dayCost });
      setLaborDayCost(dayCost);
    }
  }, [open, defaults]);

  const handleClose = () => {
    setName('');
    setDescription('');
    setQuantity(1);
    setMaterialCostPerUnit(0);
    setWorkTimeUnit('days');
    setWorkTimeValue(0);
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('נא למלא שם פריט');
      return;
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const materialPerUnit = Number(materialCostPerUnit) || 0;
    const workValue = Number(workTimeValue) || 0;
    const dayCost = Number(laborDayCost) || 0;

    let workDuration = 0;
    if (workTimeUnit === 'days') {
      workDuration = workValue;
    } else {
      workDuration = workValue / 8;
    }

    const totalMaterialCost = materialPerUnit;
    const totalLaborCost = workDuration * dayCost;
    const contractorCost = totalMaterialCost + totalLaborCost;
    
    const clientPrice = Math.round(contractorCost * (1 + desiredProfitPercent / 100));
    const profit = clientPrice - contractorCost;

    const item = {
      name: name.trim(),
      description: description.trim(),
      quantity: qty,
      unit: 'יחידה',
      contractorCostPerUnit: Math.round(contractorCost),
      desiredProfitPercent: desiredProfitPercent,
      clientPricePerUnit: Math.round(clientPrice),
      materialCost: Math.round(totalMaterialCost),
      laborCost: Math.round(totalLaborCost),
      workDuration: workDuration,
      ignoreQuantity: true,
      materialCostPerUnit: materialPerUnit,
      workTimeValue: workValue,
      workTimeUnit: workTimeUnit
    };

    onAdd(item);
    handleClose();
  };

  // חישובי סיכום
  const materialPerUnit = Number(materialCostPerUnit) || 0;
  const workValue = Number(workTimeValue) || 0;
  const dayCost = Number(laborDayCost) || 0;

  let workDuration = 0;
  if (workTimeUnit === 'days') {
    workDuration = workValue;
  } else {
    workDuration = workValue / 8;
  }

  const totalMaterialCost = materialPerUnit;
  const totalLaborCost = workDuration * dayCost;
  const contractorCost = totalMaterialCost + totalLaborCost;
  const clientPrice = Math.round(contractorCost * (1 + desiredProfitPercent / 100));
  const profit = clientPrice - contractorCost;

  const formatPrice = (n) => (Number(n) || 0).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-4 m-6 md:m-8" dir="rtl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-bold text-gray-900">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2.5">
          {/* שם הפריט */}
          <div>
            <Label htmlFor="name" className="text-xs font-semibold text-gray-700">
              שם הפריט <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: בניית קיר בלוקים"
              className="mt-0.5 h-8 text-sm"
            />
          </div>

          {/* תיאור */}
          <div>
            <Label htmlFor="description" className="text-xs font-semibold text-gray-700">
              תיאור (אופציונלי)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פרטים נוספים..."
              className="mt-0.5 h-14 text-xs resize-none"
            />
          </div>

          {/* כמות */}
          <div>
            <Label htmlFor="quantity" className="text-xs font-semibold text-gray-700">
              כמות
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-0.5 h-8 text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-0.5">* הכמות לא משפיעה על המחיר</p>
          </div>

          {/* עלות חומר */}
          <div>
            <Label htmlFor="materialCost" className="text-xs font-semibold text-gray-700">
              עלות חומר ליחידה (₪)
            </Label>
            <Input
              id="materialCost"
              type="number"
              min={0}
              value={materialCostPerUnit}
              onChange={(e) => setMaterialCostPerUnit(e.target.value)}
              className="mt-0.5 h-8 text-sm"
            />
          </div>

          {/* זמן עבודה - מאוד קומפקטי */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-0.5 block">
              זמן עבודה
            </Label>
            
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                step={workTimeUnit === 'hours' ? 0.5 : 0.1}
                value={workTimeValue}
                onChange={(e) => setWorkTimeValue(e.target.value)}
                placeholder="0"
                className="w-20 h-7 text-sm"
              />
              
              <Tabs value={workTimeUnit} onValueChange={setWorkTimeUnit} className="flex-shrink-0">
                <TabsList className="grid grid-cols-2 h-7 w-28 p-0.5">
                  <TabsTrigger value="days" className="text-xs py-0.5 px-1">ימים</TabsTrigger>
                  <TabsTrigger value="hours" className="text-xs py-0.5 px-1">שעות</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* סיכום */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              <h4 className="font-semibold text-gray-800 text-xs">סיכום</h4>
            </div>
            
            <div className="text-[10px] text-gray-600 mb-2 text-center bg-gray-50 py-1 rounded">
              עלות יום עבודה: {formatPrice(dayCost)} ₪ | סה"כ זמן: {workDuration.toFixed(2)} ימים | סה"כ עלות עבודה: {formatPrice(totalLaborCost)} ₪
            </div>
            
            <div className="grid grid-cols-3 gap-1.5">
              {/* עלות קבלן */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-1.5 text-center">
                <div className="text-[10px] text-red-700 mb-0.5">עלות קבלן</div>
                <div className="text-base font-bold text-red-800">{formatPrice(contractorCost)} ₪</div>
              </div>

              {/* רווח */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-1.5 text-center">
                <div className="text-[10px] text-green-700 mb-0.5">רווח</div>
                <div className="text-base font-bold text-green-800">{formatPrice(profit)} ₪</div>
              </div>

              {/* מחיר ללקוח */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-1.5 text-center">
                <div className="text-[10px] text-blue-700 mb-0.5">מחיר ללקוח</div>
                <div className="text-base font-bold text-blue-800">{formatPrice(clientPrice)} ₪</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 mt-2">
          <Button variant="outline" onClick={handleClose} className="h-8 text-sm">
            ביטול
          </Button>
          <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700 h-8 text-sm">
            <Plus className="ml-1.5 h-3.5 w-3.5" />
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
