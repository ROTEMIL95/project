import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ConstructionInlineEditor({
  preset = null,
  defaults = { laborCostPerDay: 1000, desiredProfitPercent: 30 },
  templates = [],
  onCancel,
  onSubmit
}) {
  // סטייט בסיסי – כמות לתיעוד בלבד
  const [values, setValues] = React.useState({
    name: "",
    unit: "יחידה",
    quantity: 1,              // לתיעוד בלבד
    hoursPerUnit: 0,          // שעות עבודה לפריט (סה״כ)
    materialCostPerUnit: 0,   // עלות חומרים לפריט (סה״כ)
    description: ""
  });

  // טעינת preset לעריכה (עדיין במצב ידני)
  React.useEffect(() => {
    if (preset) {
      setValues((v) => ({
        ...v,
        name: preset.name || v.name,
        unit: preset.unit || v.unit,
        quantity: 1, // לתיעוד בלבד בדיאלוג
        hoursPerUnit: Number(preset.laborHoursPerUnit) || 0,
        materialCostPerUnit: Number(preset.materialCostPerUnit) || 0,
        description: preset.description || ""
      }));
    } else {
      setValues({
        name: "",
        unit: "יחידה",
        quantity: 1,
        hoursPerUnit: 0,
        materialCostPerUnit: 0,
        description: ""
      });
    }
  }, [preset]);

  // חישוב אוטומטי – ללא תלות בכמות
  const laborHourRate = (Number(defaults.laborCostPerDay) || 0) / 8;
  const profitPercent = Number(defaults.desiredProfitPercent) || 0;

  const laborCostTotal = Math.max(0, (Number(values.hoursPerUnit) || 0) * laborHourRate);
  const materialCostTotal = Math.max(0, Number(values.materialCostPerUnit) || 0);
  const contractorTotal = Math.round(laborCostTotal + materialCostTotal);

  // מחיר ללקוח תמיד מחושב לפי אחוז רווח מההגדרות
  const clientTotalPrice = Math.round(contractorTotal * (1 + profitPercent / 100));

  const qty = Math.max(1, Number(values.quantity) || 1); // לתצוגה בלבד
  const profitTotal = clientTotalPrice - contractorTotal;
  const isLoss = profitTotal < 0;

  const handleSubmit = () => {
    onSubmit({
      ...values,
      // totals ידניים (לא תלויי כמות)
      laborCostTotal,
      materialCostTotal,
      contractorTotal,
      clientTotalPrice
    });
  };

  const formatNis = (n) => `${Number(n || 0).toLocaleString("he-IL")} ₪`;

  return (
    <Card className="border-2 border-indigo-200/70" dir="rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{preset ? "עריכת פריט (מצב ידני)" : "הוספת פריט חדש (מצב ידני)"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">שם הפריט</label>
            <Input
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              placeholder="לדוגמה: בניית קיר בלוקים"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">יחידת מידה</label>
            <Select value={values.unit} onValueChange={(v) => setValues({ ...values, unit: v })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="בחר יחידה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="יחידה">יחידה</SelectItem>
                <SelectItem value="מ״ר">מ"ר</SelectItem>
                <SelectItem value="מ״ק">מ"ק</SelectItem>
                <SelectItem value="מטר רץ">מטר רץ</SelectItem>
                <SelectItem value="קומפלט">קומפלט</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-600">כמות (לתיעוד בלבד)</label>
            <Input
              type="number"
              min="1"
              value={values.quantity}
              onChange={(e) => setValues({ ...values, quantity: Number(e.target.value) })}
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">שעות עבודה (סה״כ לפריט)</label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={values.hoursPerUnit}
              onChange={(e) => setValues({ ...values, hoursPerUnit: Number(e.target.value) })}
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">עלות חומרים (סה״כ לפריט, ₪)</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={values.materialCostPerUnit}
              onChange={(e) => setValues({ ...values, materialCostPerUnit: Number(e.target.value) })}
              className="h-9 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">
              מחיר ללקוח (סה״כ) – מחושב אוטומטית לפי {profitPercent}% רווח
            </label>
            <Input value={formatNis(clientTotalPrice)} disabled className="h-9 text-sm font-medium" />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">תיאור (אופציונלי)</label>
            <Textarea
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
              placeholder="הערות/פירוט קצר לפריט."
              className="min-h-[70px] text-sm"
            />
          </div>
        </div>

        {/* סיכום חישוב – ללא תלות בכמות */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-lg border bg-red-50/70 text-center">
            <div className="text-xs text-red-700 mb-1">עלות קבלן (סה״כ)</div>
            <div className="text-xl font-bold text-red-800">{formatNis(contractorTotal)}</div>
          </div>

          <div className="p-3 rounded-lg border bg-blue-50/70 text-center">
            <div className="text-xs text-blue-700 mb-1">מחיר ללקוח (סה״כ)</div>
            <div className="text-xl font-bold text-blue-800">{formatNis(clientTotalPrice)}</div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${isLoss ? 'bg-red-50/70' : 'bg-green-50/70'}`}>
            <div className={`text-xs mb-1 ${isLoss ? 'text-red-700' : 'text-green-700'}`}>
              {isLoss ? 'הפסד (סה״כ)' : 'רווח (סה״כ)'}
            </div>
            <div className={`text-xl font-bold ${isLoss ? 'text-red-800' : 'text-green-800'}`}>
              {formatNis(profitTotal)}
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-amber-50/70 text-center">
            <div className="text-xs text-amber-700 mb-1">ימי עבודה (סה״כ)</div>
            <div className="text-xl font-bold text-amber-800">
              {((Number(values.hoursPerUnit) || 0) / 8).toFixed(2)}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-500">
          בדיאלוג זה הכמות אינה משפיעה על החישוב; היא נשמרת לתיעוד בלבד. החישוב מתבסס רק על שעות העבודה ועלות החומרים, עם רווח {profitPercent}% לפי הגדרות הבינוי.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>ביטול</Button>
          <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">שמור</Button>
        </div>
      </CardContent>
    </Card>
  );
}