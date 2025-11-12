
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TilingQuickDefaults({ defaults, onSave }) {
  const [data, setData] = React.useState({
    laborCostMethod: defaults?.laborCostMethod || "perDay",
    laborCostPerDay: defaults?.laborCostPerDay ?? "",
    laborCostPerSqM: defaults?.laborCostPerSqM ?? "",
    desiredProfitPercent: defaults?.desiredProfitPercent ?? ""
  });
  const [saving, setSaving] = React.useState(false);
  // REMOVED: applyToExisting toggle (now always true by default)

  React.useEffect(() => {
    console.log('[TilingQuickDefaults] 🔄 useEffect triggered - updating data from defaults:', defaults);

    // Support both camelCase and snake_case from database
    const laborCostMethod = defaults?.laborCostMethod || defaults?.labor_cost_method || "perDay";
    const laborCostPerDay = defaults?.laborCostPerDay ?? defaults?.labor_cost_per_day ?? "";
    const laborCostPerSqM = defaults?.laborCostPerSqM ?? defaults?.labor_cost_per_sqm ?? defaults?.labor_cost_per_sq_m ?? "";
    const desiredProfitPercent = defaults?.desiredProfitPercent ?? defaults?.desired_profit_percent ?? "";

    console.log('[TilingQuickDefaults] 📊 Parsed values:', {
      laborCostMethod,
      laborCostPerDay,
      laborCostPerSqM,
      desiredProfitPercent
    });

    setData({
      laborCostMethod,
      laborCostPerDay,
      laborCostPerSqM,
      desiredProfitPercent
    });
    // setApplyToExisting(false); // REMOVED
  }, [defaults]);

  const handleMethod = (method) => {
    setData((d) => ({ ...d, laborCostMethod: method }));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setData((d) => ({
      ...d,
      [name]: type === "number" && value !== "" ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    // Helper function to safely parse numbers, ignoring whitespace
    const parseNumber = (val) => {
      const trimmed = String(val || "").trim();
      return trimmed === "" ? undefined : (Number(trimmed) || undefined);
    };

    const dataToSave = {
      laborCostMethod: data.laborCostMethod,
      laborCostPerDay: parseNumber(data.laborCostPerDay),
      laborCostPerSqM: parseNumber(data.laborCostPerSqM),
      desiredProfitPercent: parseNumber(data.desiredProfitPercent),
    };

    console.log('[TilingQuickDefaults] 💾 Saving data:', dataToSave);

    await onSave(dataToSave, { applyToExisting: true }); // ALWAYS apply to all items

    console.log('[TilingQuickDefaults] ✅ Save completed');
    setSaving(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border bg-white p-3 mb-3" dir="rtl">
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-orange-400 to-orange-600" />
      <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pt-1">
        <div className="flex-1">
          <Label className="text-xs text-gray-600 mb-1 block">שיטת חישוב עלות עבודה</Label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => handleMethod("perDay")}
              className={cn(
                "px-3 py-1.5 rounded-md border text-xs font-semibold",
                data.laborCostMethod === "perDay"
                  ? "border-orange-500 bg-orange-50 text-orange-800"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange-300"
              )}
            >
              עלות ליום
            </button>
            <button
              type="button"
              onClick={() => handleMethod("perSqM")}
              className={cn(
                "px-3 py-1.5 rounded-md border text-xs font-semibold",
                data.laborCostMethod === "perSqM"
                  ? "border-orange-500 bg-orange-50 text-orange-800"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange-300"
              )}
            >
              עלות למ״ר
            </button>
          </div>
        </div>

        {data.laborCostMethod === "perDay" ? (
          <div className="w-full md:w-64">
            <Label htmlFor="laborCostPerDay" className="text-xs text-gray-600">עלות פועל (ליום)</Label>
            <Input
              id="laborCostPerDay"
              name="laborCostPerDay"
              type="number"
              value={data.laborCostPerDay}
              onChange={handleChange}
              className="text-right h-10"
              placeholder="לדוגמה: 1500"
            />
          </div>
        ) : (
          <div className="w-full md:w-64">
            <Label htmlFor="laborCostPerSqM" className="text-xs text-gray-600">עלות פועל (למ״ר)</Label>
            <Input
              id="laborCostPerSqM"
              name="laborCostPerSqM"
              type="number"
              value={data.laborCostPerSqM}
              onChange={handleChange}
              className="text-right h-10"
              placeholder="לדוגמה: 120"
            />
          </div>
        )}

        <div className="w-full md:w-64">
          <Label htmlFor="desiredProfitPercent" className="text-xs text-gray-600">אחוז רווח רצוי (%)</Label>
          <Input
            id="desiredProfitPercent"
            name="desiredProfitPercent"
            type="number"
            value={data.desiredProfitPercent}
            onChange={handleChange}
            className="text-right h-10"
            placeholder="לדוגמה: 40"
          />
        </div>

        <div className="flex items-end justify-end">
          <Button onClick={handleSave} disabled={saving} className="h-10 px-4 bg-orange-600 hover:bg-orange-700">
            {saving ? "שומר..." : "שמור הגדרות"}
          </Button>
        </div>
      </div>
    </div>
  );
}
