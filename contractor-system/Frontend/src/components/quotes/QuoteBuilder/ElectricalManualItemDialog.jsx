/**
 * ElectricalManualItemDialog - Manual Electrical Item Dialog
 *
 * Dedicated dialog for manual electrical items with yellow theme
 * Calculates client price based on contractor cost + profit percentage
 */

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ElectricalManualItemDialog({
  open,
  onOpenChange,
  item,
  onSaved,
  defaults = {},
  initialQuantity = 1
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState(initialQuantity);
  const [contractorCost, setContractorCost] = React.useState("");
  const [unit, setUnit] = React.useState("יחידה");

  React.useEffect(() => {
    if (open && item) {
      // Editing existing item
      setName(item.name || "");
      setDescription(item.description || "");
      setQuantity(item.quantity || initialQuantity);
      setContractorCost(String(item.contractorCostPerUnit || ""));
      setUnit(item.unit || "יחידה");
    } else if (open && !item) {
      // Adding new item
      setName("");
      setDescription("");
      setQuantity(initialQuantity);
      setContractorCost("");
      setUnit("יחידה");
    }
  }, [open, item, initialQuantity]);

  const handleAdd = () => {
    if (!name.trim()) {
      alert('נא למלא שם פריט');
      return;
    }

    const cCost = Number(contractorCost) || 0;
    const qty = Math.max(1, Number(quantity) || 1);

    // Use profit percentage from defaults
    const profitPercent = defaults?.desiredProfitPercent || defaults?.profitPercent || 40;
    const clientPricePerUnit = Math.round(cCost * (1 + profitPercent / 100));
    const totalCost = cCost * qty;
    const totalPrice = clientPricePerUnit * qty;

    const savedItem = {
      ...(item || {}),
      id: item?.id || `electrical_manual_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      quantity: qty,
      unit: unit, // יחידת מידה שנבחרה
      subCategory: "points",
      contractorCostPerUnit: cCost,
      clientPricePerUnit: clientPricePerUnit,
      profitPercent: profitPercent,
      totalCost: totalCost,
      totalPrice: totalPrice,
      isActive: true,
      // Don't set ignoreQuantity - we want quantity to be used in calculations
    };

    onSaved && onSaved(savedItem);
    onOpenChange(false);
  };

  const cCost = Number(contractorCost) || 0;
  const qty = Math.max(1, Number(quantity) || 1);
  const profitPercent = defaults?.desiredProfitPercent || defaults?.profitPercent || 40;
  const clientPricePerUnit = Math.round(cCost * (1 + profitPercent / 100));
  const profitPerUnit = clientPricePerUnit - cCost;

  // Total calculations
  const totalCost = cCost * qty;
  const totalPrice = clientPricePerUnit * qty;
  const totalProfit = totalPrice - totalCost;

  const fmt = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-6 md:p-8" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">פריט חשמל ידני</DialogTitle>
          <DialogDescription>
            מלא את נתוני הפריט. מחיר הלקוח יחושב לפי עלות קבלן + אחוז רווח.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 px-1">
          {/* שם הפריט */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium">שם הפריט</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: נקודת חשמל חדשה"
              className="mt-1"
            />
          </div>

          {/* כמות ויחידת מידה */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantity" className="text-sm font-medium">כמות</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="unit" className="text-sm font-medium">יחידת מידה</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="יחידה">יחידה</SelectItem>
                  <SelectItem value="מ״ר">מ"ר</SelectItem>
                  <SelectItem value="מטר רץ">מטר רץ</SelectItem>
                  <SelectItem value="נקודה">נקודה</SelectItem>
                  <SelectItem value="שקע">שקע</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* עלות קבלן ליחידה */}
          <div>
            <Label htmlFor="cost" className="text-sm font-medium">עלות קבלן ליחידה (₪)</Label>
            <Input
              id="cost"
              type="number"
              min={0}
              step={1}
              value={contractorCost}
              onChange={(e) => setContractorCost(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
          </div>

          {/* תיאור */}
          <div>
            <Label htmlFor="desc" className="text-sm font-medium">תיאור (אופציונלי)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פירוט נוסף..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* סיכום */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
              <div className="text-xs text-blue-700 mb-1">מחיר ללקוח</div>
              <div className="text-lg font-bold text-blue-900">{fmt(totalPrice)}</div>
              <div className="text-[10px] text-blue-600 mt-0.5">{qty} × {fmt(clientPricePerUnit)}</div>
            </div>

            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <div className="text-xs text-red-700 mb-1">עלות קבלן</div>
              <div className="text-lg font-bold text-red-900">{fmt(totalCost)}</div>
              <div className="text-[10px] text-red-600 mt-0.5">{qty} × {fmt(cCost)}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <div className="text-xs text-green-700 mb-1">רווח</div>
              <div className="text-lg font-bold text-green-900">{fmt(totalProfit)}</div>
              <div className="text-[10px] text-green-600 mt-0.5">{qty} × {fmt(profitPerUnit)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleAdd} className="bg-yellow-600 hover:bg-yellow-700">
            {item ? 'שמור' : 'הוסף'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
