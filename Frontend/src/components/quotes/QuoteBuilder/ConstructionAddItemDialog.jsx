import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ConstructionAddItemDialog({
  open,
  onOpenChange,
  preset = null,              // אפשר להעביר פריט מהמחירון כ־preset
  defaults = { laborCostPerDay: 1000, desiredProfitPercent: 30 },
  onSubmit                    // יחזיר (values) ל־ConstructionCategory שיבנה פריט להצעה
}) {
  const [values, setValues] = React.useState({
    name: "",
    unit: "יחידה",
    quantity: 1,
    hoursPerUnit: 0,           // שעות עבודה ליחידה
    materialCostPerUnit: 0,    // עלות חומר ליחידה
    clientUnitPriceOverride: "",// מחיר ללקוח ליחידה (דריסה, אופציונלי)
    description: ""
  });

  React.useEffect(() => {
    if (preset) {
      setValues((v) => ({
        ...v,
        name: preset.name || v.name,
        unit: preset.unit || v.unit,
        quantity: 1,
        hoursPerUnit: Number(preset.laborHoursPerUnit) || 0,
        materialCostPerUnit: Number(preset.materialCostPerUnit) || 0,
        clientUnitPriceOverride: preset.clientPricePerUnit != null ? Number(preset.clientPricePerUnit) : "",
        description: preset.description || ""
      }));
    } else {
      setValues((v) => ({
        ...v,
        name: "",
        unit: "יחידה",
        quantity: 1,
        hoursPerUnit: 0,
        materialCostPerUnit: 0,
        clientUnitPriceOverride: "",
        description: ""
      }));
    }
  }, [preset, open]);

  const laborHourRate = (Number(defaults.laborCostPerDay) || 0) / 8;
  const contractorCostPerUnit = (Number(values.materialCostPerUnit) || 0) + laborHourRate * (Number(values.hoursPerUnit) || 0);
  const profitPercent = Number(defaults.desiredProfitPercent) || 0;
  const suggestedPricePerUnit = contractorCostPerUnit * (1 + profitPercent / 100);
  const clientPricePerUnit = values.clientUnitPriceOverride !== "" ? Number(values.clientUnitPriceOverride) || 0 : suggestedPricePerUnit;

  const qty = Math.max(1, Number(values.quantity) || 1);
  const totalCost = Math.round(contractorCostPerUnit * qty);
  const totalPrice = Math.round(clientPricePerUnit * qty);
  const profit = totalPrice - totalCost;
  const workDays = (Number(values.hoursPerUnit) || 0) * qty / 8;

  const handleSubmit = () => {
    onSubmit({
      ...values,
      quantity: qty,
      contractorCostPerUnit,
      clientPricePerUnit,
      totalCost,
      totalPrice,
      workDays,
      laborHourRate,
      profitPercent
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{preset ? "הוספת פריט מהמחירון" : "הוספת פריט לבינוי"}</DialogTitle>
          <DialogDescription>מלא/י את פרטי הפריט ולאשר להוספה להצעה.</DialogDescription>
        </DialogHeader>

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
            <Select
              value={values.unit}
              onValueChange={(v) => setValues({ ...values, unit: v })}
            >
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
            <label className="text-xs text-gray-600">כמות</label>
            <Input
              type="number"
              min="1"
              value={values.quantity}
              onChange={(e) => setValues({ ...values, quantity: Number(e.target.value) })}
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">שעות עבודה ליחידה</label>
            <Input
              type="number"
              min="0"
              value={values.hoursPerUnit}
              onChange={(e) => setValues({ ...values, hoursPerUnit: Number(e.target.value) })}
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">עלות חומר ליחידה (₪)</label>
            <Input
              type="number"
              min="0"
              value={values.materialCostPerUnit}
              onChange={(e) => setValues({ ...values, materialCostPerUnit: Number(e.target.value) })}
              className="h-9 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">מחיר ללקוח ליחידה (דריסה, אופציונלי)</label>
            <Input
              type="number"
              value={values.clientUnitPriceOverride}
              onChange={(e) => setValues({ ...values, clientUnitPriceOverride: e.target.value })}
              placeholder={`הצעה: ${Math.round(suggestedPricePerUnit)} ₪`}
              className="h-9 text-sm"
            />
            <div className="text-[11px] text-gray-500 mt-1">
              הצעה אוטומטית לפי רווח {profitPercent}%: <span className="font-medium">{Math.round(suggestedPricePerUnit)} ₪</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">תיאור (אופציונלי)</label>
            <Textarea
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
              placeholder="פרטים והבהרות לביצוע..."
              className="min-h-[64px] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div className="bg-blue-50 border border-blue-100 rounded-md p-2 text-center">
            <div className="text-[10px] text-blue-800">מחיר ללקוח (סה״כ)</div>
            <div className="text-base font-semibold text-blue-700">{totalPrice.toLocaleString('he-IL')} ₪</div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-md p-2 text-center">
            <div className="text-[10px] text-red-800">עלות קבלן (סה״כ)</div>
            <div className="text-base font-semibold text-red-700">{totalCost.toLocaleString('he-IL')} ₪</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-md p-2 text-center">
            <div className="text-[10px] text-green-800">רווח קבלן</div>
            <div className="text-base font-semibold text-green-700">{(totalPrice - totalCost).toLocaleString('he-IL')} ₪</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-md p-2 text-center">
            <div className="text-[10px] text-amber-800">ימי עבודה</div>
            <div className="text-base font-semibold text-amber-700">{(workDays || 0).toFixed(1)}</div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">
            הוסף להצעה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}