
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock } from "lucide-react";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "קל (x1)", multiplier: 1 },
  { value: "medium", label: "בינוני (x1.5)", multiplier: 1.5 },
  { value: "hard", label: "קשה (x2)", multiplier: 2 },
];

const formatPrice = (n) => {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("he-IL");
};

export default function DemolitionCustomItemCard({
  defaults = { laborCostPerDay: 0, profitPercent: 30 },
  onAdd,
  pricingPerUnitOnly = false, // NEW: when true, pricing shown is per-unit only (quantity ignored for price display)
  disableDifficulty = false, // NEW: when true, difficulty selection is hidden and multiplier is always 1
}) {
  const [name, setName] = React.useState("");
  const [unit, setUnit] = React.useState("יח");
  const [quantity, setQuantity] = React.useState(1);
  const [difficulty, setDifficulty] = React.useState("easy");
  const [hoursPerUnit, setHoursPerUnit] = React.useState(1);

  const rootRef = React.useRef(null);

  // Existing effect: to hide difficulty UI if disableDifficulty is true
  React.useEffect(() => {
    if (!disableDifficulty || !rootRef.current) return;

    // Find the specific 'רמת קושי' label and its parent div
    const labelElement = rootRef.current.querySelector('label');
    if (labelElement && (labelElement.textContent || '').trim().includes('רמת קושי')) {
      const parentDiv = labelElement.closest('div'); // This should be the div wrapping label and select
      if (parentDiv) {
        parentDiv.style.display = 'none';
      }
    }
  }, [disableDifficulty]);

  // text-only cleanse inside the custom card (keeps layout intact)
  React.useEffect(() => {
    if (!rootRef.current) return;

    const CURRENCY_REGEX = /[\u200E\u200F\u202A-\u202E]*₪/g;
    const UNIT_LINE_REGEX = /(^|\s)ליח(׳|")?ידה?[:\s]?/i;

    const cleanse = () => {
      const container = rootRef.current;
      const nodes = container.querySelectorAll("div,span,small,p");

      nodes.forEach((el) => {
        const raw = el.textContent;
        if (!raw) return;
        let txt = raw;

        if (CURRENCY_REGEX.test(txt)) {
          txt = txt.replace(CURRENCY_REGEX, "").trim();
        }
        if (UNIT_LINE_REGEX.test(txt)) {
          txt = txt.replace(UNIT_LINE_REGEX, "").trim();
          if (!txt) { // If after removing unit line, text is empty, clear the element.
            el.textContent = "";
            return;
          }
        }
        if (/זמן\s*עבודה/.test(txt)) {
          txt = "שעות עבודה";
        }
        if (/^\(?ש[\'״"]\)?$/.test(txt)) {
          el.textContent = "";
          return;
        }
        if (txt !== raw) el.textContent = txt;
      });
    };

    cleanse();
    const observer = new MutationObserver(() => cleanse());
    observer.observe(rootRef.current, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const selectedDifficulty = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty) || DIFFICULTY_OPTIONS[0];

  // UPDATED: central compute – ignores difficulty and decouples qty from display when requested
  const computePricing = React.useCallback(() => {
    const hourRate = (Number(defaults.laborCostPerDay || 0) / 8);
    const laborHrs = Number(hoursPerUnit || 0);
    const profitPct = Number(defaults.profitPercent || 30);
    const materialCost = 0; // As per original code, material cost is zero for demolition items

    const qty = Math.max(1, Number(quantity) || 1); // Use actual quantity for internal calculations
    const effectiveQtyForDisplay = pricingPerUnitOnly ? 1 : qty;

    // Difficulty multiplier is 1 if disabled
    const calculationMultiplier = disableDifficulty ? 1 : selectedDifficulty.multiplier;

    // Calculations per unit (always based on calculationMultiplier)
    const perUnitContractorCost = Math.max(0, materialCost + (laborHrs * hourRate * calculationMultiplier));
    const perUnitClientPrice = Math.round(perUnitContractorCost * (1 + (profitPct / 100)));
    const perUnitProfit = perUnitClientPrice - perUnitContractorCost;

    // Calculations for display (affected by effectiveQtyForDisplay)
    const displayTotalContractor = Math.round(perUnitContractorCost * effectiveQtyForDisplay);
    const displayTotalClient = Math.round(perUnitClientPrice * effectiveQtyForDisplay);
    const displayTotalProfit = Math.round(perUnitProfit * effectiveQtyForDisplay);

    // Work days for display (affected by pricingPerUnitOnly)
    const totalWorkHoursCalculatedPerUnit = laborHrs * calculationMultiplier;
    const workDaysPerUnitCalculated = totalWorkHoursCalculatedPerUnit / 8;
    const displayWorkDays = pricingPerUnitOnly ? workDaysPerUnitCalculated : (workDaysPerUnitCalculated * qty);

    // NEW: Total work hours for summary tile display
    const totalDisplayWorkHours = pricingPerUnitOnly ? totalWorkHoursCalculatedPerUnit : (totalWorkHoursCalculatedPerUnit * qty);

    // Profit percentage for display (based on per unit cost)
    const displayProfitPercent = perUnitContractorCost > 0 ? (perUnitProfit / perUnitContractorCost) * 100 : 0;

    return {
      perUnitContractorCost,
      perUnitClientPrice,
      perUnitProfit,
      displayTotalContractor,
      displayTotalClient,
      displayTotalProfit,
      displayWorkDays, // Days (for `handleAdd` and internal calculations)
      totalDisplayWorkHours, // Hours (for summary tile display)
      displayProfitPercent,
      actualWorkHoursPerUnit: totalWorkHoursCalculatedPerUnit, // For displaying "X שעות ליחידה"
      actualTotalWorkDays: workDaysPerUnitCalculated * qty, // Total for the actual quantity, used for item creation
    };
  }, [
    quantity,
    hoursPerUnit,
    defaults.laborCostPerDay,
    defaults.profitPercent,
    pricingPerUnitOnly,
    disableDifficulty,
    selectedDifficulty
  ]);

  const {
    perUnitContractorCost,
    perUnitClientPrice,
    perUnitProfit,
    displayTotalContractor,
    displayTotalClient,
    displayTotalProfit,
    displayWorkDays,
    totalDisplayWorkHours, // NEW: Destructure totalDisplayWorkHours
    displayProfitPercent,
    actualWorkHoursPerUnit,
    actualTotalWorkDays,
  } = computePricing();

  // Condition to enable add button
  const canAdd = name.trim().length > 0 && Number(hoursPerUnit) > 0 && Math.max(1, Number(quantity) || 1) > 0;

  const handleAdd = () => {
    if (!canAdd) return;

    // EDIT: when adding the item to the quote, always multiply by the REAL quantity (not effective 1)
    const qty = Math.max(1, Number(quantity) || 1); // Always use actual quantity for item creation

    const item = {
      id: `demo_custom_${Date.now()}`,
      source: "demolition_custom",
      categoryId: "cat_demolition",
      categoryName: "הריסה ופינוי",
      description: name.trim(),
      quantity: qty,
      unit,
      // build item WITHOUT difficultyData if disableDifficulty is true
      ...(disableDifficulty ? {} : { difficultyData: { label: selectedDifficulty.label, multiplier: selectedDifficulty.multiplier } }),
      hoursPerUnit: Number(hoursPerUnit), // Original input hours per unit
      unitPrice: Math.round(perUnitClientPrice), // per-unit client price (including profit and actual multiplier)
      totalPrice: Math.round(perUnitClientPrice * qty), // total price for actualQty
      totalCost: Math.round(perUnitContractorCost * qty), // total cost for actualQty
      laborCost: Math.round(perUnitContractorCost * qty), // Assuming laborCost = totalCost here as materialCost is 0
      materialCost: 0,
      workDuration: Number(actualTotalWorkDays.toFixed(3)), // totalDays already uses actualQty and calculationMultiplier
    };
    if (typeof onAdd === "function") onAdd(item);
  };

  // NEW: numeric formatters without currency symbol
  const formatInt = (n) => {
    const x = Number(n || 0);
    return x.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };
  const formatOneDecimal = (n) => {
    const x = Number(n || 0);
    return isFinite(x) ? x.toFixed(1) : '0.0';
  };

  return (
    <Card className="border-2" ref={rootRef}> {/* rootRef moved to the Card component */}
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="col-span-1 md:col-span-2">
            <Label className="text-xs text-gray-600">שם הפריט</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: פירוק סורגים" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">יחידת מידה</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue placeholder="בחר יחידה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="יח">יחידה</SelectItem>
                <SelectItem value="מטר">מטר</SelectItem>
                <SelectItem value='מ"ר'>מ"ר</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">כמות</Label>
            <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-600">רמת קושי</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="בחר קושי" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">שעות ליחידה</Label>
            <Input type="number" min="0" step="0.1" value={hoursPerUnit} onChange={(e) => setHoursPerUnit(Number(e.target.value))} />
            <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {disableDifficulty ?
                `≈ ${Number(hoursPerUnit || 0).toFixed(1)} שעות ליחידה` :
                `≈ ${(actualWorkHoursPerUnit).toFixed(1)} שעות ליחידה (x${selectedDifficulty.multiplier})`
              }
            </div>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleAdd} disabled={!canAdd}>
              <Plus className="ml-2 h-4 w-4" />
              הוסף להצעה
            </Button>
          </div>
        </div>

        {/* Updated summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {/* Work hours tile - number + small caption 'שעות עבודה' */}
          <div className="rounded-lg border bg-gray-50 p-3 text-center">
            <div className="text-2xl font-bold text-gray-800">{formatOneDecimal(totalDisplayWorkHours)}</div>
            <div className="text-[11px] text-gray-500 mt-1">שעות עבודה</div>
          </div>

          {/* Contractor cost - number only, no ₪ and no bottom text */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{formatInt(displayTotalContractor)}</div>
          </div>

          {/* Profit amount - number only; keep small % badge if קיים */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-green-600">{formatInt(displayTotalProfit)}</span>
              {displayProfitPercent > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-600 text-white">{Math.round(displayProfitPercent)}%</span>
              )}
            </div>
          </div>

          {/* Client price - number only */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-center">
            <div className="text-2xl font-bold text-indigo-600">{formatInt(displayTotalClient)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
