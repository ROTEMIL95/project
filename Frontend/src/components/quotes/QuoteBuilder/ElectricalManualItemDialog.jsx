import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ElectricalManualItemDialog({ open, onOpenChange, onAdd, defaults, defaultSubcat }) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [contractorCost, setContractorCost] = React.useState("");

  // הסרנו: unit, profitPercent, subCategory

  React.useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setQuantity(1);
      setContractorCost("");
    }
  }, [open]);

  const handleAdd = () => {
    const cCost = Number(contractorCost) || 0;
    const qty = Math.max(1, Number(quantity) || 1);
    
    // שימוש באחוז הרווח מברירת המחדל
    const profitPercent = defaults?.desiredProfitPercent || 40;
    const clientPrice = Math.round(cCost * (1 + profitPercent / 100));

    const item = {
      id: `manual_elec_${Date.now()}`,
      name: name.trim() || "פריט ידני",
      description: description.trim(),
      quantity: qty,
      unit: "יחידה", // קבוע
      subCategory: "points", // ברירת מחדל קבועה
      contractorCostPerUnit: cCost,
      clientPricePerUnit: clientPrice,
      desiredProfitPercent: profitPercent,
      isActive: true,
      ignoreQuantity: true, // כמו בהריסה - הכמות לא משפיעה
    };

    onAdd && onAdd(item);
  };

  const cCost = Number(contractorCost) || 0;
  const profitPercent = defaults?.desiredProfitPercent || 40;
  const clientPrice = Math.round(cCost * (1 + profitPercent / 100));
  const profit = clientPrice - cCost;

  const fmt = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">פריט חשמל ידני</DialogTitle>
          <DialogDescription>
            מלא את נתוני הפריט. מחיר הלקוח יחושב לפי עלות קבלן + אחוז רווח.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {/* כמות */}
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
              <div className="text-xs text-blue-700 mb-1">מחיר ללקוח (ליחידה)</div>
              <div className="text-lg font-bold text-blue-900">{fmt(clientPrice)}</div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <div className="text-xs text-red-700 mb-1">עלות קבלן (ליחידה)</div>
              <div className="text-lg font-bold text-red-900">{fmt(cCost)}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <div className="text-xs text-green-700 mb-1">רווח (ליחידה)</div>
              <div className="text-lg font-bold text-green-900">{fmt(profit)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleAdd} className="bg-yellow-600 hover:bg-yellow-700">הוסף</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}