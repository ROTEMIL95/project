
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, Trash2, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DemolitionInlineEditor({
  defaults = { laborCostPerDay: 1000, desiredProfitPercent: 30 },
  onSubmit,
  onCancel
}) {
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    unit: "יחידה",
    quantity: 1,
    hoursPerUnit: 0,
    extraContractorCost: 0, // תוספת עלות קבלן (שינוע/פינוי וכד')
    desiredProfitPercent: Number(defaults?.desiredProfitPercent) || 30
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const laborHourRate = (Number(defaults?.laborCostPerDay) || 0) / 8;

  // דרישה: הכמות לא משפיעה על המחיר -> מחשבים לפי שעות-ליחידה בלבד
  const hoursTotal = Number(form.hoursPerUnit) || 0;
  const laborCostTotal = Math.max(0, Math.round(hoursTotal * laborHourRate));
  const contractorTotal = Math.max(0, Math.round(laborCostTotal + (Number(form.extraContractorCost) || 0)));

  // אחוז רווח נשאר ברירת מחדל (השדה מבוטל לעריכה)
  const clientTotalPrice = Math.max(
    0,
    Math.round(contractorTotal * (1 + (Number(form.desiredProfitPercent) || 0) / 100))
  );

  // דרישה: יחידת מחיר לא מתחלקת בכמות (unitPrice = totalPrice)
  const unitPrice = clientTotalPrice;
  const profit = Math.max(0, clientTotalPrice - contractorTotal);
  const workDays = hoursTotal / 8;

  const formatN = (n) => (Number(n) || 0).toLocaleString("he-IL", { maximumFractionDigits: 0 });

  const handleSave = () => {
    if (!form.name.trim()) {
      alert("נא להזין שם פריט");
      return;
    }
    onSubmit &&
      onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        unit: form.unit || "יחידה",
        quantity: Math.max(1, Number(form.quantity) || 1), // נשמר אך לא משפיע על מחיר
        hoursPerUnit: Number(form.hoursPerUnit) || 0,
        extraContractorCost: Number(form.extraContractorCost) || 0,
        desiredProfitPercent: Number(form.desiredProfitPercent) || 0,
        clientUnitPriceOverride: null, // מבוטל
        totals: {
          laborHourRate,
          laborCostTotal,
          contractorTotal,
          clientTotalPrice,
          unitPrice,
          profit,
          workDays
        }
      });
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="font-semibold">הוספת פריט להריסה</div>
        </div>
        <Badge variant="outline">עלות יום עבודה: ₪ {formatN(defaults?.laborCostPerDay)}</Badge>
      </div>

      {/* פרטי בסיס */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>שם הפריט</Label>
          <Input
            placeholder="לדוגמה: פירוק דלת עץ"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>יחידה</Label>
          <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
            <SelectTrigger>
              <SelectValue placeholder="בחר יחידה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="יחידה">יחידה</SelectItem>
              <SelectItem value='מ"ר'>מ"ר</SelectItem>
              <SelectItem value="שעה">שעה</SelectItem>
              <SelectItem value="מטר רץ">מטר רץ</SelectItem>
              <SelectItem value="ק&quot;ג">ק"ג</SelectItem>
              <SelectItem value="קוב">קוב</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label>תיאור (אופציונלי)</Label>
          <Input
            placeholder="מידע נוסף על הפריט"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>

      {/* נתוני חישוב */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label>כמות</Label>
          <Input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => set("quantity", Number(e.target.value || 1))}
          />
          <div className="text-[11px] text-gray-500 mt-0.5">לא משפיע על המחיר</div>
        </div>

        <div className="space-y-1">
          <Label>שעות עבודה ליחידה</Label>
          <Input
            type="number"
            min={0}
            step="0.1"
            value={form.hoursPerUnit}
            onChange={(e) => set("hoursPerUnit", Number(e.target.value || 0))}
          />
        </div>

        <div className="space-y-1">
          <Label>תוספת עלות קבלן (₪)</Label>
          <Input
            type="number"
            min={0}
            step="1"
            value={form.extraContractorCost}
            onChange={(e) => set("extraContractorCost", Number(e.target.value || 0))}
          />
        </div>

        <div className="space-y-1">
          <Label>אחוז רווח (%)</Label>
          <Input
            type="number"
            min={0}
            step="1"
            value={form.desiredProfitPercent}
            onChange={() => {}}
            disabled
            className="bg-gray-100 cursor-not-allowed"
          />
          <div className="text-[11px] text-gray-500 mt-0.5">ברירת מחדל — לא ניתן לשינוי</div>
        </div>
      </div>

      {/* תקציר חישוב */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-blue-50/60 p-3 text-center">
          <div className="text-xs text-blue-900 flex items-center justify-center gap-1">
            <DollarSign className="w-3 h-3" /> מחיר ללקוח (סה״כ)
          </div>
          <div className="text-xl font-extrabold text-blue-900">₪ {formatN(clientTotalPrice)}</div>
        </div>
        <div className="rounded-lg border bg-green-50/60 p-3 text-center">
          <div className="text-xs text-green-900">רווח (סה״כ)</div>
          <div className="text-xl font-extrabold text-green-900">₪ {formatN(profit)}</div>
        </div>
        <div className="rounded-lg border bg-rose-50/60 p-3 text-center">
          <div className="text-xs text-rose-900">עלות קבלן</div>
          <div className="text-xl font-extrabold text-rose-900">₪ {formatN(contractorTotal)}</div>
        </div>
        <div className="rounded-lg border bg-gray-50 p-3 text-center">
          <div className="text-xs text-gray-700 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> שעות עבודה (סה״כ)
          </div>
          <div className="text-xl font-extrabold text-gray-900">{hoursTotal.toFixed(1)}</div>
        </div>
      </div>

      {/* כפתורים */}
      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel && onCancel();
          }}
        >
          ביטול
        </Button>
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSave();
          }}
          className="bg-rose-600 hover:bg-rose-700 text-white"
        >
          הוסף
        </Button>
      </div>
    </div>
  );
}
