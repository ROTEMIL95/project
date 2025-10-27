
import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

export default function DemolitionItemDialog({
  open,
  onOpenChange,
  item,
  onSaved,
  laborCostPerDay = 1000,
  hideUnit = false,
  initialQuantity = 1,
  defaults = {},
  subCategoryPreset = null
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(initialQuantity);
  const [hoursPerUnit, setHoursPerUnit] = useState('');

  // הסרנו: unit, profitPercent, subCategory

  useEffect(() => {
    if (open && item) {
      setName(item.name || '');
      setDescription(item.description || '');
      setQuantity(item.quantity || initialQuantity);
      setHoursPerUnit(item.hoursPerUnit ? String(item.hoursPerUnit) : '');
    } else if (open && !item) {
      setName('');
      setDescription('');
      setQuantity(initialQuantity);
      setHoursPerUnit('');
    }
  }, [open, item, initialQuantity]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('נא למלא שם פריט');
      return;
    }

    const hours = Number(hoursPerUnit) || 0;
    const qty = Number(quantity) || 1;

    // שימוש באחוז הרווח מברירת המחדל
    const profitPercent = defaults.profitPercent || 30;

    const savedItem = {
      id: item?.id || `demo_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      hoursPerUnit: hours,
      quantity: qty,
      unit: 'יחידה', // קבוע - לא ניתן לשינוי
      profitPercent: profitPercent, // מההגדרות
      subCategory: 'general', // ברירת מחדל קבועה
      isActive: true
    };

    onSaved && onSaved(savedItem);
  };

  if (!open) return null;

  // חישובי תצוגה - תיקון: הכמות לא משפיעה על המחיר
  const hours = Number(hoursPerUnit) || 0;
  const qty = Number(quantity) || 1;
  const profitPercent = defaults.profitPercent || 30;
  
  const hoursPerDay = 8;
  const days = hours / hoursPerDay;
  const contractorCost = days * laborCostPerDay; // הסרנו את הכפל בכמות
  const clientPrice = Math.round(contractorCost * (1 + profitPercent / 100));
  const profit = clientPrice - contractorCost;

  const formatNum = (n) => (Number(n) || 0).toLocaleString('he-IL');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" dir="rtl" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">
            {item ? 'עריכת פריט הריסה' : 'הוספת פריט הריסה חדש'}
          </h2>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          
          <p className="text-sm text-gray-600">מלא את נתוני הפריט. הכמות לא תשנה את המחיר הכולל.</p>

          {/* שם הפריט */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              שם הפריט <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: פירוק קיר בגבס"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          {/* תיאור */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              תיאור (אופציונלי)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פרטים נוספים..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
            />
          </div>

          {/* כמות ושעות עבודה */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                כמות (לתצוגה)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                שעות עבודה ליחידה
              </label>
              <input
                type="number"
                min="0"
                step="1" // Changed from "0.1" to "1"
                value={hoursPerUnit}
                onChange={(e) => setHoursPerUnit(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* סיכום */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
              <div className="text-xs font-medium text-blue-700 mb-1">מחיר ללקוח</div>
              <div className="text-xl font-bold text-blue-900">₪{formatNum(clientPrice)}</div>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
              <div className="text-xs font-medium text-green-700 mb-1">רווח</div>
              <div className="text-xl font-bold text-green-900">₪{formatNum(profit)}</div>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
              <div className="text-xs font-medium text-red-700 mb-1">עלות קבלן</div>
              <div className="text-xl font-bold text-red-900">₪{formatNum(contractorCost)}</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={() => onOpenChange(false)}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm"
          >
            הוסף
          </button>
        </div>

      </div>
    </div>
  );
}
