import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ElectricalItemDialog({
  open,
  onOpenChange,
  item,
  onSaved,
  hideUnit = false,
  initialQuantity = 1,
  defaults = {}
}) {
  const [contractorCost, setContractorCost] = React.useState("");
  const [quantity, setQuantity] = React.useState(initialQuantity);

  // הסרנו: profitPercent

  React.useEffect(() => {
    if (open && item) {
      setContractorCost(String(item.contractorCostPerUnit || ""));
      setQuantity(item.quantity || initialQuantity);
    } else if (open && !item) {
      setContractorCost("");
      setQuantity(initialQuantity);
    }
  }, [open, item, initialQuantity]);

  const handleSave = () => {
    const cCost = Number(contractorCost) || 0;
    const qty = Math.max(1, Number(quantity) || 1);
    
    // שימוש באחוז הרווח מברירת המחדל
    const profitPercent = defaults?.desiredProfitPercent || 40;
    const clientPrice = Math.round(cCost * (1 + profitPercent / 100));

    const saved = {
      ...(item || {}),
      contractorCostPerUnit: cCost,
      clientPricePerUnit: clientPrice,
      desiredProfitPercent: profitPercent,
      quantity: qty,
    };

    onSaved && onSaved(saved);
  };

  const cCost = Number(contractorCost) || 0;
  const qty = Math.max(1, Number(quantity) || 1);
  const profitPercent = defaults?.desiredProfitPercent || 40;
  const clientPricePerUnit = Math.round(cCost * (1 + profitPercent / 100));
  const profitPerUnit = clientPricePerUnit - cCost;

  const fmt = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">{item?.name || "עריכת פריט חשמל"}</DialogTitle>
          <DialogDescription>
            {item?.description || "עדכן את פרטי הפריט"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              className="mt-1"
            />
          </div>

          {/* סיכום ליחידה */}
          <div className="space-y-2 pt-2">
            <div className="text-sm font-medium text-gray-700">תצוגה מקדימה (ליחידה)</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200">
                <div className="text-xs text-blue-700">מחיר ללקוח</div>
                <div className="text-sm font-bold text-blue-900">{fmt(clientPricePerUnit)}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
                <div className="text-xs text-red-700">עלות קבלן</div>
                <div className="text-sm font-bold text-red-900">{fmt(cCost)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                <div className="text-xs text-green-700">רווח</div>
                <div className="text-sm font-bold text-green-900">{fmt(profitPerUnit)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} className="bg-yellow-600 hover:bg-yellow-700">שמור</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}