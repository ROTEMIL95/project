
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // Keep cn import, even if not directly used in this specific update, as it might be used elsewhere or in future iterations.

export default function PaintQuickDefaults({ defaults, onSave }) {
  const [data, setData] = React.useState({
    workerDailyCost: defaults?.workerDailyCost ?? "",
    desiredProfitPercent: defaults?.desiredProfitPercent ?? ""
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setData({
      workerDailyCost: defaults?.workerDailyCost ?? "",
      desiredProfitPercent: defaults?.desiredProfitPercent ?? ""
    });
  }, [defaults]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((d) => ({
      ...d,
      [name]: value === "" ? "" : Number(value)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(
      {
        workerDailyCost: data.workerDailyCost === "" ? undefined : Number(data.workerDailyCost),
        desiredProfitPercent: data.desiredProfitPercent === "" ? undefined : Number(data.desiredProfitPercent)
      },
      { applyToExisting: true }
    );
    setSaving(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border bg-white p-3 mb-3" dir="rtl">
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-blue-500 to-blue-600" />
      <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pt-1">
        <div className="w-full md:w-64">
          <Label htmlFor="workerDailyCost" className="text-xs text-gray-600">עלות פועל (ליום)</Label>
          <Input
            id="workerDailyCost"
            name="workerDailyCost"
            type="number"
            value={data.workerDailyCost}
            onChange={handleChange}
            className="text-right h-10"
            placeholder="לדוגמה: 1200"
          />
        </div>
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
          <Button onClick={handleSave} disabled={saving} className="h-10 px-4 bg-blue-600 hover:bg-blue-700">
            {saving ? "שומר..." : "שמור הגדרות"}
          </Button>
        </div>
      </div>
    </div>
  );
}
