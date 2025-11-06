
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Layers, Calculator, Sidebar, Info, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TilingDefaultsSettings({ isOpen, onClose, onSave, initialDefaults }) {
  const [defaults, setDefaults] = useState({
    laborCostPerDay: '',
    laborCostPerSqM: '',
    additionalCost: '', // עלות חומר שחור
    desiredProfitPercent: '',
    laborCostMethod: 'perDay', // ברירת מחדל לשיטת חישוב עבודה
    wastagePercent: '', // אחוז בלאי
    panelLaborWorkCapacity: '', // חדש
    panelUtilizationPercent: '' // חדש
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && initialDefaults) {
      setDefaults(prev => ({
        ...prev,
        ...initialDefaults,
        laborCostPerDay: initialDefaults.laborCostPerDay ?? '',
        laborCostPerSqM: initialDefaults.laborCostPerSqM ?? '',
        additionalCost: initialDefaults.additionalCost ?? '',
        desiredProfitPercent: initialDefaults.desiredProfitPercent ?? '',
        laborCostMethod: initialDefaults.laborCostMethod ?? 'perDay',
        wastagePercent: initialDefaults.wastagePercent ?? '',
        panelLaborWorkCapacity: initialDefaults.panelLaborWorkCapacity ?? '', // חדש
        panelUtilizationPercent: initialDefaults.panelUtilizationPercent ?? '' // חדש
      }));
    }
  }, [isOpen, initialDefaults]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setDefaults(prev => ({
      ...prev,
      [name]: type === 'number' && value !== '' ? Number(value) : value
    }));
  };

  const handleSelectChange = (name, value) => {
    setDefaults(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Validate inputs if necessary
    try {
      await onSave(defaults);
    } catch (error) {
      console.error("Failed to save tiling defaults:", error);
      // Display error to user
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">ניהול ברירות מחדל - ריצוף</DialogTitle>
          <DialogDescription>
            כאן מנהלים ברירות מחדל לחומרים, בלאי ופאנל. עלות פועל ואחוז רווח מנוהלים בבלוק ההגדרות המהיר במסך הראשי.
          </DialogDescription>
        </DialogHeader>

        {/* איחוד עיצוב הבלוקים: שתי עמודות זהות */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* עלויות חומרים + בלאי */}
          <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200 h-full">
            <h4 className="text-md font-semibold text-gray-700 flex items-center">
              <Layers className="w-5 h-5 ml-2 text-green-500" /> עלויות חומרים
            </h4>
            <div className="space-y-2">
              <Label htmlFor="additionalCost">עלות חומר שחור (למ"ר)</Label>
              <Input type="number" name="additionalCost" value={defaults.additionalCost} onChange={handleInputChange} className="text-right" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="wastagePercent" className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-600" />
                  אחוז בלאי לריצוף (%)
                </Label>
              </div>
              <Input type="number" name="wastagePercent" value={defaults.wastagePercent} onChange={handleInputChange} className="text-right" placeholder="לדוגמה: 10" />
              <p className="text-xs text-gray-600 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-gray-500" />
                הבלאי חל רק על עלות הריצוף שמוגדרת בכל פריט (האריחים עצמם), ואינו חל על &quot;חומר שחור&quot;.
              </p>
            </div>
          </div>
          
          {/* הגדרות פאנל — זהה בגודל/מסגור לבלוק הקודם */}
          <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200 h-full">
            <h4 className="text-md font-semibold text-gray-700 flex items-center">
              <Sidebar className="w-5 h-5 ml-2 text-orange-500" /> הגדרות פאנל
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="panelLaborWorkCapacity">הספק עבודה לפאנל (מטר רץ ליום)</Label>
                <Input type="number" name="panelLaborWorkCapacity" value={defaults.panelLaborWorkCapacity} onChange={handleInputChange} className="text-right" placeholder="למשל: 50" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="panelUtilizationPercent">אחוז החומר המקורי המנוצל לפאנל (%)</Label>
                  <div className="relative group">
                    <div className="w-4 h-4 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center cursor-help">
                      ?
                    </div>
                    <div className="absolute bottom-6 left-0 hidden group-hover:block bg-gray-800 text-white text-sm rounded-lg p-3 w-64 z-50">
                      <p>מייצג את אחוז החומר הגולמי (האריח) שמנוצל בפועל לייצור הפאנל. לדוגמה: אם הערך הוא 30%, זה אומר שרק 30% מעלות האריח המקורי מתורגמת לפאנל השימושי, והיתרה (70%) נחשבת לפחת חומר.</p>
                    </div>
                  </div>
                </div>
                <Input type="number" name="panelUtilizationPercent" value={defaults.panelUtilizationPercent} onChange={handleInputChange} className="text-right" placeholder="למשל: 30" />
              </div>
            </div>
            <p className="text-xs text-orange-600">
              הגדרות אלו ישמשו לחישוב אוטומטי של עלויות פאנל בהצעות המחיר, על בסיס נתוני פריט הריצוף הנבחר.
            </p>
          </div>

        </div>

        <DialogFooter className="flex justify-between items-center px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="w-4 h-4 ml-2" />
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
            {saving ? (
              <>
                <Calculator className="w-4 h-4 ml-2 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                שמור הגדרות
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
