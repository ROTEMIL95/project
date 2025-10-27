
import React from "react";
import Dialog, { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Calculator, DollarSign, Save, X, Hammer, Percent, Loader2 } from "lucide-react";

const formatPrice = (n) => (Number(n) || 0).toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * ConstructionItemDialog
 * Props:
 * - open, onOpenChange
 * - defaults: { workerCostPerUnit (₪ ליום), desiredProfitPercent }
 * - subCategory: current subcat string (default for new)
 * - subCats: [{key, label}]
 * - units: string[] of allowed units
 * - item (optional): existing item to edit
 * - onSave(updatedItem)
 */
export default function ConstructionItemDialog({
  open,
  onOpenChange,
  defaults = { workerCostPerUnit: 0, desiredProfitPercent: 30 },
  subCategory,
  subCats = [],
  units = ["יחידה", "מ\"ר", "מ\"ק", "מטר רץ", "קומפלט"],
  item = null,
  onSave
}) {
  const initial = React.useMemo(() => {
    return {
      name: item?.name || "",
      description: item?.description || "",
      subCategory: item?.subCategory || subCategory || (subCats[0]?.key ?? "walls"),
      unit: item?.unit || "יחידה",
      materialCostPerUnit: item?.materialCostPerUnit ?? 0,
      laborHoursPerUnit: item?.laborHoursPerUnit ?? 0,
      isActive: item?.isActive !== undefined ? item.isActive : true,
      contractorCostPerUnit: item?.contractorCostPerUnit ?? 0,
      clientPricePerUnit: item?.clientPricePerUnit ?? 0,
    };
  }, [item, subCategory, subCats]);

  const [form, setForm] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => setForm(initial), [initial]);

  const laborHourRate = Number(defaults?.workerCostPerUnit || 0) / 8;
  const profitPercent = Number(defaults?.desiredProfitPercent || 0);

  // Derived calculations
  const computedContractorCost = Math.max(
    0,
    Number(form.materialCostPerUnit || 0) + Number(form.laborHoursPerUnit || 0) * laborHourRate
  );

  const computedClientPrice = Math.round(computedContractorCost * (1 + profitPercent / 100));

  const profitAmount = Math.max(0, computedClientPrice - computedContractorCost);
  const profitPctDisplay = computedContractorCost > 0 ? (profitAmount / computedContractorCost) * 100 : 0;

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (!form.unit) return;

    setSaving(true);

    const updated = {
      ...(item || {}),
      id: item?.id || `cn_${Date.now()}`,
      name: form.name.trim(),
      description: form.description?.trim() || "",
      subCategory: form.subCategory,
      unit: form.unit,
      materialCostPerUnit: Number(form.materialCostPerUnit || 0),
      laborHoursPerUnit: Number(form.laborHoursPerUnit || 0),
      contractorCostPerUnit: Math.round(computedContractorCost),
      clientPricePerUnit: Math.round(computedClientPrice),
      isActive: item?.isActive !== undefined ? item.isActive : true,
    };

    if (onSave) {
      await Promise.resolve(onSave(updated));
    }
    
    setSaving(false);
    onOpenChange && onOpenChange(false);
  };

  const onCancel = () => {
    onOpenChange && onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-2 border-purple-200 z-[200]" dir="rtl">
        <DialogHeader className="pb-2 border-b border-purple-100">
          <DialogTitle className="flex items-center gap-2 text-purple-800">
            <Hammer className="w-5 h-5 text-purple-600" />
            עריכת פריט בינוי
          </DialogTitle>
          <DialogDescription className="text-purple-600">
            עדכן פרטי פריט, חומרים ושעות עבודה. המחיר והרווח יחושבו אוטומטית.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-0">
          {/* שם ותיאור */}
          <div className="md:col-span-2 space-y-2">
            <Label>שם הפריט</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder='לדוגמה: "קיר בלוקים 10 ס"מ (מחיצה פנימית)"'
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>תיאור (אופציונלי)</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="פרטים משלימים, היתרי עבודה, הבהרות וכד'."
            />
          </div>

          {/* תת-קטגוריה + יחידה */}
          <div className="space-y-2">
            <Label>תת־קטגוריה</Label>
            <Select
              value={form.subCategory}
              onValueChange={(v) => setForm((f) => ({ ...f, subCategory: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר תת־קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                {subCats.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>יחידת מידה</Label>
            <Select
              value={form.unit}
              onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר יחידה" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* עלויות: חומרים + שעות */}
          <div className="space-y-2">
            <Label>עלות חומרים ליחידה (₪)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.materialCostPerUnit}
              onChange={(e) => setForm((f) => ({ ...f, materialCostPerUnit: e.target.value }))}
              placeholder="לדוגמה: 40"
            />
          </div>
          <div className="space-y-2">
            <Label>זמן עבודה ליחידה (שעות)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.laborHoursPerUnit}
              onChange={(e) => setForm((f) => ({ ...f, laborHoursPerUnit: e.target.value }))}
              placeholder="לדוגמה: 0.5"
            />
          </div>

          {/* סיכום וחישובים — מחיר לקוח, עלות קבלן, רווח - נקי ופשוט */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {/* עלות קבלן */}
            <div className="p-4 rounded-lg border bg-red-50 border-red-100">
              <div className="text-xs text-red-700 mb-2 font-medium">עלות קבלן</div>
              <div className="text-2xl font-bold text-red-700">{formatPrice(computedContractorCost)} ₪</div>
            </div>

            {/* מחיר ללקוח */}
            <div className="p-4 rounded-lg border bg-blue-50 border-blue-100">
              <div className="text-xs text-blue-700 mb-2 font-medium">מחיר ללקוח</div>
              <div className="text-2xl font-bold text-blue-700">{formatPrice(computedClientPrice)} ₪</div>
            </div>

            {/* רווח ליחידה */}
            <div className="p-4 rounded-lg border bg-green-50 border-green-100">
              <div className="text-xs text-green-700 mb-2 font-medium">רווח ליחידה</div>
              <div className="text-2xl font-bold text-green-700">{formatPrice(profitAmount)} ₪</div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="border-purple-200 text-purple-700 hover:bg-purple-50">
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
            {saving ? "שומר..." : "שמור פריט"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
