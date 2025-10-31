
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Paintbrush, Layers, Ruler, Trash2, FileText } from "lucide-react";
import useSafeUser from "@/components/utils/useSafeUser";

export default function ManualCalcDialog() {
  const [open, setOpen] = React.useState(false);
  // NEW: טופס משודרג - קירות/תקרה (ניתן לבחור גם וגם)
  const [form, setForm] = React.useState({
    workType: "paint",          // 'paint' | 'plaster'
    description: "",
    // Walls
    wallsEnabled: true,
    wallsType: "",
    wallsLayers: "0",
    wallsArea: "",
    // Ceiling
    ceilingEnabled: false,
    ceilingType: "",
    ceilingLayers: "0",
    ceilingArea: "",
    // Shared
    materialCost: "",
    workDays: "",
    workTimeMode: "days", // NEW: 'days' | 'hours'
    workHours: ""         // NEW
  });

  const ctxRef = React.useRef(null);

  const [defaults, setDefaults] = React.useState({
    workerDailyCost: 0,
    desiredProfitPercent: 30,
  });

  // 🆕 Use useSafeUser hook to get current user data
  const { user } = useSafeUser();

  // 🆕 Load defaults from user whenever user changes or dialog opens
  React.useEffect(() => {
    if (user && user.user_metadata) {
      const d = user.user_metadata.paintUserDefaults || {};
      setDefaults({
        workerDailyCost: Number(d.workerDailyCost ?? 0),
        desiredProfitPercent: Number(d.desiredProfitPercent ?? 30),
      });
      console.log('[ManualCalcDialog] Loaded defaults from useSafeUser:', {
        workerDailyCost: Number(d.workerDailyCost ?? 0),
        desiredProfitPercent: Number(d.desiredProfitPercent ?? 30)
      });
    }
  }, [user, open]);

  // פתיחה מבחוץ (תמיכה בפרה-פיל חדש: walls/ceiling)
  React.useEffect(() => {
    window.__b44OpenManualCalc = (type = "paint", prefill = null, context = null) => {
      ctxRef.current = context || null;
      const clean = {
        workType: type === "plaster" ? "plaster" : "paint",
        description: "",
        wallsEnabled: true,
        wallsType: "",
        wallsLayers: "0",
        wallsArea: "",
        ceilingEnabled: false,
        ceilingType: "",
        ceilingLayers: "0",
        ceilingArea: "",
        materialCost: "",
        workDays: "",
        workTimeMode: "days",
        workHours: ""
      };
      if (prefill && typeof prefill === "object") {
        setForm({
          ...clean,
          workType: prefill.workType || clean.workType, // Ensure workType is taken from prefill
          description: prefill.description ?? clean.description,
          wallsEnabled: prefill.wallsEnabled ?? clean.wallsEnabled,
          wallsType: prefill.wallsType ?? clean.wallsType,
          wallsLayers: prefill.wallsLayers ? String(prefill.wallsLayers) : clean.wallsLayers,
          wallsArea: prefill.wallsArea ? String(prefill.wallsArea) : clean.wallsArea,
          ceilingEnabled: prefill.ceilingEnabled ?? clean.ceilingEnabled,
          ceilingType: prefill.ceilingType ?? clean.ceilingType,
          ceilingLayers: prefill.ceilingLayers ? String(prefill.ceilingLayers) : clean.ceilingLayers,
          ceilingArea: prefill.ceilingArea ? String(prefill.ceilingArea) : clean.ceilingArea,
          materialCost: prefill.materialCost ? String(prefill.materialCost) : clean.materialCost,
          workDays: prefill.workDays ? String(prefill.workDays) : clean.workDays,
          workTimeMode: prefill.workTimeMode || clean.workTimeMode,
          workHours: prefill.workHours ? String(prefill.workHours) : clean.workHours,
        });
      } else {
        setForm(clean);
      }
      setOpen(true);
    };
    return () => {
      try { delete window.__b44OpenManualCalc; } catch {}
    };
  }, []);

  const resetAndClose = () => {
    setOpen(false);
    setForm((f) => ({
      workType: f.workType, // Keep the current workType when resetting and closing
      description: "",
      wallsEnabled: true,
      wallsType: "",
      wallsLayers: "0",
      wallsArea: "",
      ceilingEnabled: false,
      ceilingType: "",
      ceilingLayers: "0",
      ceilingArea: "",
      materialCost: "",
      workDays: "",
      workTimeMode: "days",
      workHours: ""
    }));
    ctxRef.current = null;
  };

  const qtyWalls = Number(form.wallsArea) || 0;
  const qtyCeiling = Number(form.ceilingArea) || 0;
  const qtyTotal = (form.wallsEnabled ? qtyWalls : 0) + (form.ceilingEnabled ? qtyCeiling : 0);

  const layersWalls = Number(form.wallsLayers) || 0;
  const layersCeiling = Number(form.ceilingLayers) || 0;

  const materials = Number(form.materialCost) || 0;
  const HOURS_PER_DAY = 8; // NEW
  const workDays = Number(form.workDays) || 0;
  const workHours = Number(form.workHours) || 0;
  const effectiveWorkDays = form.workTimeMode === "hours"
    ? (workHours > 0 ? workHours / HOURS_PER_DAY : 0)
    : workDays;

  const laborPerDay = Number(defaults.workerDailyCost) || 0;
  const laborCost = Math.max(0, effectiveWorkDays * laborPerDay);
  const contractorTotal = Math.max(0, laborCost + materials);
  const profitPercent = Number(defaults.desiredProfitPercent) || 0;
  const clientPriceRaw = contractorTotal * (1 + profitPercent / 100);
  const clientPrice = Math.round(clientPriceRaw);
  const contractorRounded = Math.round(contractorTotal);
  const profitAmount = Math.max(0, clientPrice - contractorRounded);
  const pricePerSqm = qtyTotal > 0 ? Math.round(clientPrice / qtyTotal) : 0;

  // פיצול יחסי לצורך תעוד בלבד (לפי שטחים)
  const shareWalls = qtyTotal > 0 ? ((form.wallsEnabled ? qtyWalls : 0) / qtyTotal) : 0;
  const shareCeiling = qtyTotal > 0 ? ((form.ceilingEnabled ? qtyCeiling : 0) / qtyTotal) : 0;

  const canSave =
    clientPrice > 0 &&
    ((form.wallsEnabled && qtyWalls > 0) || (form.ceilingEnabled && qtyCeiling > 0));

  // NEW: summaries and clear helpers
  const wallsSummary = form.wallsEnabled && qtyWalls > 0
    ? `${qtyWalls} מ״ר • ${layersWalls || 0} שכבות${form.wallsType ? ` • ${form.wallsType}` : ""}`
    : null;
  const ceilingSummary = form.ceilingEnabled && qtyCeiling > 0
    ? `${qtyCeiling} מ״ר • ${layersCeiling || 0} שכבות${form.ceilingType ? ` • ${form.ceilingType}` : ""}`
    : null;

  const clearWalls = () => setForm(f => ({ ...f, wallsType: "", wallsLayers: "0", wallsArea: "" }));
  const clearCeiling = () => setForm(f => ({ ...f, ceilingType: "", ceilingLayers: "0", ceilingArea: "" }));
  // The 'clearAll' function is no longer needed if the button is removed,
  // but it's kept for logical completeness in case other parts of the code
  // or future changes might rely on it. However, since the request is to
  // remove the button, we'll keep the function but remove its UI trigger.
  const clearAll = () => setForm(f => ({
    ...f,
    description: "",
    wallsEnabled: true,
    wallsType: "",
    wallsLayers: "0",
    wallsArea: "",
    ceilingEnabled: false,
    ceilingType: "",
    ceilingLayers: "0",
    ceilingArea: "",
    materialCost: "",
    workDays: "",
    workTimeMode: "days",
    workHours: ""
  }));

  const buildDescription = () => {
    const parts = [];
    const kindLabel = form.workType === "plaster" ? "שפכטל" : "צבע";
    if (form.wallsEnabled && qtyWalls > 0) {
      const t = form.wallsType ? ` (${form.wallsType})` : "";
      const l = layersWalls > 0 ? ` – ${layersWalls} שכבות` : "";
      parts.push(`קירות: ${kindLabel}${t}${l}`);
    }
    if (form.ceilingEnabled && qtyCeiling > 0) {
      const t = form.ceilingType ? ` (${form.ceilingType})` : "";
      const l = layersCeiling > 0 ? ` – ${layersCeiling} שכבות` : "";
      parts.push(`תקרה: ${kindLabel}${t}${l}`);
    }
    const extra = form.description?.trim() ? ` – ${form.description.trim()}` : "";
    return `עבודה ידנית - ${kindLabel}: ${parts.join(" | ")}${extra}`;
  };

  const handleSave = () => {
    if (!canSave) return;

    const nowId = `manual_${form.workType}_${Date.now()}`;
    const description = buildDescription();

    // Price split by areas (for table rows)
    const totalAreaForSplit = (form.wallsEnabled ? qtyWalls : 0) + (form.ceilingEnabled ? qtyCeiling : 0);
    const priceWalls = form.wallsEnabled
      ? (totalAreaForSplit > 0 ? Math.round(clientPrice * (qtyWalls / totalAreaForSplit)) : clientPrice)
      : 0;
    const priceCeiling = form.ceilingEnabled ? (clientPrice - priceWalls) : 0;

    // Build breakdown rows to be consumed by summary/preview tables
    const detailedBreakdown = [];
    if (form.wallsEnabled && qtyWalls > 0) {
      detailedBreakdown.push({
        name: "קירות",
        // areas
        wallsArea: qtyWalls,
        includeCeiling: false,
        withCeiling: false,
        ceilingArea: 0,
        // paint/plaster meta for walls
        paintWallsName: form.wallsType || "",
        wallLayers: layersWalls || 0,
        // pricing
        price: priceWalls,
        sellingPrice: priceWalls,
        metrics: { totalSellingPrice: priceWalls }
      });
    }
    if (form.ceilingEnabled && qtyCeiling > 0) {
      detailedBreakdown.push({
        name: "תקרה",
        // areas
        wallsArea: 0,
        includeCeiling: true,
        withCeiling: true,
        ceilingArea: qtyCeiling,
        // paint/plaster meta for ceiling
        ceilingPaintName: form.ceilingType || "",
        ceilingLayers: layersCeiling || 0,
        // pricing
        price: priceCeiling,
        sellingPrice: priceCeiling,
        metrics: { totalSellingPrice: priceCeiling }
      });
    }

    const item = {
      id: nowId,
      source: "manual_calc",
      categoryId: "cat_paint_plaster",
      categoryName: "צבע ושפכטל",
      description, // נשמר אך בעגלה מוצג רק אם המשתמש כתב תיאור מפורש
      // quantity בסיכום הכללי – סכום שטחי קירות+תקרה
      quantity: qtyTotal || 1,
      unit: "מ\"ר",
      materialCost: materials,
      laborCost: laborCost,
      totalCost: contractorRounded,
      totalPrice: clientPrice,
      unitPrice: qtyTotal > 0 ? Math.round(clientPrice / qtyTotal) : clientPrice,
      profit: profitAmount,
      profitPercent: profitPercent,
      desiredProfitPercent: profitPercent,
      workDuration: effectiveWorkDays || 0, // NEW: duration in days regardless of input mode
      // breakdown for summary/preview tables
      detailedBreakdown,
      // optional global hints some renderers use
      selectedWallPaintItem: form.wallsEnabled ? { itemName: form.wallsType || "קירות" } : undefined,
      selectedCeilingPaintItem: form.ceilingEnabled ? { itemName: form.ceilingType || "תקרה" } : undefined,

      // שמירה מפורטת למנוע ההצגה
      manualMeta: {
        type: form.workType,
        walls: {
          enabled: form.wallsEnabled,
          area: qtyWalls,
          layers: layersWalls,
          manualType: form.wallsType || "",
          materialShare: Math.round(materials * shareWalls),
        },
        ceiling: {
          enabled: form.ceilingEnabled,
          area: qtyCeiling,
          layers: layersCeiling,
          manualType: form.ceilingType || "",
          materialShare: Math.round(materials * shareCeiling),
        },
        defaultsUsed: {
          workerDailyCost: defaults.workerDailyCost,
          desiredProfitPercent: defaults.desiredProfitPercent,
        },
        timeInput: { mode: form.workTimeMode, workDays: workDays, workHours: workHours, effectiveWorkDays }, // NEW
      },
      manualFormSnapshot: {
        workType: form.workType,
        description: form.description,
        walls: {
          enabled: form.wallsEnabled,
          area: qtyWalls,
          layers: layersWalls, // Corrected from layersLayers
          manualType: form.wallsType || "",
        },
        ceiling: {
          enabled: form.ceilingEnabled,
          area: qtyCeiling,
          layers: layersCeiling,
          manualType: form.ceilingType || "",
        },
        materialCost: materials,
        workDays: workDays,
        workHours: workHours,
        workTimeMode: form.workTimeMode,
        effectiveWorkDays,
        quantity: qtyTotal,
      },
    };

    // אירוע אופציונלי לעדכון אזור
    if (ctxRef.current && ctxRef.current.areaId) {
      const ev = new CustomEvent("b44:manual-calc:save", {
        detail: {
          areaId: ctxRef.current.areaId,
          type: form.workType,
          snapshot: item.manualFormSnapshot,
          results: {
            laborCost,
            materials,
            totalCost: contractorRounded,
            clientPrice,
            profit: profitAmount,
            unitPrice: item.unitPrice,
            effectiveWorkDays, // NEW
          },
        },
      });
      window.dispatchEvent(ev);
    }

    if (typeof window.__b44AddItemToQuote === "function") {
      window.__b44AddItemToQuote(item);
    }

    resetAndClose();
  };

  // UI label depends on current work type (paint/plaster)
  const uiKindLabel = form.workType === "plaster" ? "שפכטל" : "צבע";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl m-6 md:m-8 p-6 md:p-8" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">חישוב ידני</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* בחירה בין צבע/שפכטל */}
          <div className="rounded-md border p-3 bg-gray-50 text-sm text-gray-700">
            הגדרות ידניות עבור {form.workType === "plaster" ? "שפכטל" : "צבע"}
          </div>

          {/* תיאור כללי - שדרוג ויזואלי עם איקון וכפתור ניקוי */}
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              תיאור העבודה (אופציונלי)
            </Label>
            <div className="relative">
              <Input
                placeholder="לדוגמה: סלון גדול, קירות איכות X, תקרה Y"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="pr-24"
              />
              {form.description && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, description: "" }))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
                  title="נקה תיאור"
                >
                  <Trash2 className="w-4 h-4" />
                  נקה
                </button>
              )}
            </div>
          </div>

          {/* בחירה מהירה: קירות/תקרה – עיצוב משופר */}
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center justify-between gap-2 p-3 border rounded-lg cursor-pointer transition
                ${form.wallsEnabled ? "border-emerald-300 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"}`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.wallsEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, wallsEnabled: e.target.checked }))}
                />
                <span className="font-medium">קירות</span>
              </div>
              {wallsSummary && <Badge variant="outline" className="text-emerald-800 border-emerald-200">{wallsSummary}</Badge>}
            </label>

            <label className={`flex items-center justify-between gap-2 p-3 border rounded-lg cursor-pointer transition
                ${form.ceilingEnabled ? "border-sky-300 bg-sky-50" : "border-gray-200 hover:bg-gray-50"}`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.ceilingEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, ceilingEnabled: e.target.checked }))}
                />
                <span className="font-medium">תקרה</span>
              </div>
              {ceilingSummary && <Badge variant="outline" className="text-sky-800 border-sky-200">{ceilingSummary}</Badge>}
            </label>
          </div>

          {/* טופס קירות – עם כותרת, איקונים וכפתור ניקוי */}
          {form.wallsEnabled && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50/30 p-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-semibold text-green-800">קירות</span>
                </div>
                {(form.wallsType || Number(form.wallsLayers) > 0 || form.wallsArea) && (
                  <button
                    type="button"
                    onClick={clearWalls}
                    className="text-emerald-800/80 hover:text-emerald-900 text-sm inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> נקה קירות
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-3">
                  <Label>סוג צבע או שפכטל (קירות)</Label>
                  <Input
                    placeholder={uiKindLabel === 'שפכטל' ? 'לדוגמה: שפכטל אמריקאי / גמר חלק' : 'לדוגמה: אקרילי / דקורטיבי'}
                    value={form.wallsType}
                    onChange={(e) => setForm((f) => ({ ...f, wallsType: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> מספר שכבות (קירות)</Label>
                  <Select
                    value={form.wallsLayers}
                    onValueChange={(v) => setForm((f) => ({ ...f, wallsLayers: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר שכבות" />
                    </SelectTrigger>
                    <SelectContent>
                      {["0","1","2","3","4","5","6"].map(n => (
                        <SelectItem key={`wl-${n}`} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> כמות קירות (מ״ר)</Label>
                  <Input
                    type="number"
                    placeholder="לדוגמה: 80"
                    value={form.wallsArea}
                    onChange={(e) => setForm((f) => ({ ...f, wallsArea: e.target.value }))}
                  />
                </div>
              </div>
              {wallsSummary && (
                <div className="text-xs text-gray-600">
                  סיכום: <span className="font-medium text-gray-800">{wallsSummary}</span>
                </div>
              )}
            </div>
          )}

          {/* טופס תקרה – עם כותרת, איקונים וכפתור ניקוי */}
          {form.ceilingEnabled && (
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50/30 p-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-semibold text-blue-800">תקרה</span>
                </div>
                {(form.ceilingType || Number(form.ceilingLayers) > 0 || form.ceilingArea) && (
                  <button
                    type="button"
                    onClick={clearCeiling}
                    className="text-sky-800/80 hover:text-sky-900 text-sm inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> נקה תקרה
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-3">
                  <Label>סוג צבע או שפכטל (תקרה)</Label>
                  <Input
                    placeholder={uiKindLabel === 'שפכטל' ? 'לדוגמה: שפכטל לתקרה / גמר חלק' : 'לדוגמה: פריימר / סיד'}
                    value={form.ceilingType}
                    onChange={(e) => setForm((f) => ({ ...f, ceilingType: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> מספר שכבות (תקרה)</Label>
                  <Select
                    value={form.ceilingLayers}
                    onValueChange={(v) => setForm((f) => ({ ...f, ceilingLayers: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר שכבות" />
                    </SelectTrigger>
                    <SelectContent>
                      {["0","1","2","3","4","5","6"].map(n => (
                        <SelectItem key={`cl-${n}`} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> כמות תקרה (מ״ר)</Label>
                  <Input
                    type="number"
                    placeholder="לדוגמה: 30"
                    value={form.ceilingArea}
                    onChange={(e) => setForm((f) => ({ ...f, ceilingArea: e.target.value }))}
                  />
                </div>
              </div>
              {ceilingSummary && (
                <div className="text-xs text-gray-600">
                  סיכום: <span className="font-medium text-gray-800">{ceilingSummary}</span>
                </div>
              )}
            </div>
          )}

          {/* משותף: עלות חומרים + ימי עבודה */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>עלות חומרים (₪) – משותף</Label>
              <Input
                type="number"
                placeholder="לדוגמה: 450"
                value={form.materialCost}
                onChange={(e) => setForm((f) => ({ ...f, materialCost: e.target.value }))}
              />
            </div>

            {/* NEW: work time mode + input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  זמן עבודה
                </Label>
                <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                  <button
                    type="button"
                    className={`px-2 py-1 text-xs rounded ${form.workTimeMode === 'days' ? 'bg-white shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                    onClick={() => setForm(f => ({ ...f, workTimeMode: 'days' }))}
                    title="ימים"
                  >
                    ימים
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 text-xs rounded ${form.workTimeMode === 'hours' ? 'bg-white shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                    onClick={() => setForm(f => ({ ...f, workTimeMode: 'hours' }))}
                    title="שעות"
                  >
                    שעות
                  </button>
                </div>
              </div>

              {form.workTimeMode === 'days' ? (
                <Input
                  type="number"
                  placeholder="לדוגמה: 3"
                  value={form.workDays}
                  onChange={(e) => setForm((f) => ({ ...f, workDays: e.target.value }))}
                />
              ) : (
                <div>
                  <Input
                    type="number"
                    placeholder="לדוגמה: 16"
                    value={form.workHours}
                    onChange={(e) => setForm((f) => ({ ...f, workHours: e.target.value }))}
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    מחושב כ-{(effectiveWorkDays || 0).toFixed(2)} ימים (בהנחת {HOURS_PER_DAY} שעות ליום)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* תוצאות */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-center">
              <div className="text-xs text-blue-700 mb-1">מחיר ללקוח</div>
              <div className="text-2xl font-bold text-blue-800">{clientPrice.toLocaleString('he-IL')} ₪</div>
              <div className="text-[11px] text-blue-700 mt-1">{qtyTotal > 0 ? `${pricePerSqm.toLocaleString('he-IL')} ₪ למ״ר` : ''}</div>
            </div>
            <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-center">
              <div className="text-xs text-red-700 mb-1">עלות קבלן</div>
              <div className="text-2xl font-bold text-red-800">{contractorRounded.toLocaleString('he-IL')} ₪</div>
            </div>
            <div className="p-3 rounded-lg border bg-green-50 border-green-200 text-center">
              <div className="text-xs text-green-700 mb-1">רווח</div>
              <div className="text-2xl font-bold text-green-800">{profitAmount.toLocaleString('he-IL')} ₪</div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            ימי העבודה ועלות החומרים משותפים לשני הסוגים; חלוקת עלות החומרים בין קירות/תקרה מתועדת באופן יחסי לפי שטח.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={resetAndClose}>סגור</Button>
            <Button onClick={handleSave} disabled={!canSave} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed">
              שמור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
