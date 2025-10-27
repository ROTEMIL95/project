
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PlumbingItemDialog({
  open,
  onOpenChange,
  item,
  onSaved,
  defaultsProfitPercent = 30,
  subCategoryPreset = "infrastructure",
  hideUnit = false,
  initialQuantity = 1,
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState(initialQuantity);
  const [contractorCost, setContractorCost] = React.useState("");

  // הסרנו: subCategory, profitPercent, unit

  React.useEffect(() => {
    if (open && item) {
      setName(item.name || "");
      setDescription(item.description || "");
      setQuantity(item.quantity || initialQuantity);
      setContractorCost(String(item.contractorCostPerUnit || ""));
    } else if (open && !item) {
      setName("");
      setDescription("");
      setQuantity(initialQuantity);
      setContractorCost("");
    }
  }, [open, item, initialQuantity]);

  const handleSave = () => {
    if (!name.trim()) {
      alert("נא למלא שם פריט");
      return;
    }

    const cCost = Number(contractorCost) || 0;
    const qty = Math.max(1, Number(quantity) || 1);
    
    // שימוש באחוז הרווח מברירת המחדל
    const profitPercent = defaultsProfitPercent || 30;
    const clientPrice = Math.round(cCost * (1 + profitPercent / 100));

    const saved = {
      id: item?.id || `plumb_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      subCategory: subCategoryPreset || "infrastructure", // קבוע
      unit: "יחידה", // קבוע
      contractorCostPerUnit: cCost,
      desiredProfitPercent: profitPercent,
      clientPricePerUnit: clientPrice,
      quantity: qty,
      isActive: true,
      ignoreQuantity: true,
    };

    onSaved && onSaved(saved);
  };

  const cCost = Number(contractorCost) || 0;
  const profitPercent = defaultsProfitPercent || 30;
  const clientPrice = Math.round(cCost * (1 + profitPercent / 100));
  const profit = clientPrice - cCost;

  const fmt = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]" dir="rtl" id="plumbing-item-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg">פריט אינסטלציה ידני</DialogTitle>
          <DialogDescription className="text-sm">
            מלא את נתוני הפריט. מחיר הלקוח יחושב אוטומטית לפי עלות קבלן + אחוז רווח.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* שם הפריט */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              שם הפריט <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: נקודת מים חדשה"
              className="mt-1"
            />
          </div>

          {/* כמות */}
          <div>
            <Label htmlFor="qty" className="text-sm font-medium">כמות</Label>
            <Input
              id="qty"
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
              rows={2}
              className="mt-1"
            />
          </div>

          {/* סיכום */}
          <div className="grid grid-cols-3 gap-2 pt-3">
            <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
              <div className="text-[10px] text-green-700 mb-1">רווח (ליחידה)</div>
              <div className="text-base font-bold text-green-900">{fmt(profit)}</div>
            </div>

            <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
              <div className="text-[10px] text-red-700 mb-1">עלות קבלן (ליחידה)</div>
              <div className="text-base font-bold text-red-900">{fmt(cCost)}</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200">
              <div className="text-[10px] text-blue-700 mb-1">מחיר ללקוח (ליחידה)</div>
              <div className="text-base font-bold text-blue-900">{fmt(clientPrice)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">הוסף</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
