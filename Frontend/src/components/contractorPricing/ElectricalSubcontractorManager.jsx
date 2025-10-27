
import React, { useEffect, useMemo, useState } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lightbulb, Save, Plus, Filter, Edit, Trash2 } from "lucide-react"; // Removed Percent

// הוספת תת־קטגוריה חדשה "התקנות"
const SUBCATS = [
  { key: "points", label: "נקודות" },
  { key: "lighting", label: "תאורה" },
  { key: "panels", label: "לוחות/ארונות" },
  { key: "communications", label: "תקשורת" },
  { key: "repairs", label: "תיקונים" },
  { key: "installations", label: "התקנות" }
];

const UNITS = ["נקודה", "יחידה", "מטר רץ", "שירות", "קומפלט"];

const formatNis = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;
const calcClientPrice = (cost, pp) => Math.max(0, Math.round((Number(cost) || 0) * (1 + (Number(pp) || 0) / 100)));

const DEFAULT_POINTS = [
  { id: "el_pt_1", name: "נקודת חשמל רגילה", description: "כולל קופסה ומפסק/שקע רגיל", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 120, isActive: true },
  { id: "el_pt_2", name: "נקודת שקע כוח", description: "שקע כוח 16A", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 180, isActive: true },
  // NEW sockets/points from user
  { id: "el_pt_3", name: "שקע יחיד", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 350, isActive: true },
  { id: "el_pt_4", name: "שקע כפול", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 450, isActive: true },
  { id: "el_pt_5", name: "שקע משולש", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 550, isActive: true },
  { id: "el_pt_6", name: "שקע יחיד כוח", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 550, isActive: true },
  { id: "el_pt_7", name: "שקע כפול כוח", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 650, isActive: true },
  { id: "el_pt_8", name: "שקע משולש כוח", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 750, isActive: true },
  { id: "el_pt_9", name: "שקע יחיד כוח למזגן 1×16A", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 550, isActive: true },
  { id: "el_pt_10", name: "תוספת מוגן מים", description: "תוספת לשקע/נקודה בסביבה רטובה", subCategory: "points", unit: "יחידה", contractorCostPerUnit: 120, isActive: true },
  { id: "el_pt_11", name: "שקע תלת פאזי 3×16A", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 1300, isActive: true },
  { id: "el_pt_12", name: "שקע יחיד ממותג", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 550, isActive: true },
  { id: "el_pt_13", name: "צינור 25 מ״מ + חוט משיכה", subCategory: "points", unit: "מטר רץ", contractorCostPerUnit: 350, isActive: true },
  { id: "el_pt_14", name: "נק למסך חשמלי (שקע יחיד)", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 550, isActive: true },
  { id: "el_pt_15", name: "נק לתנור אמבטיה", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 650, isActive: true },
  { id: "el_pt_16", name: "נק לונטה", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 450, isActive: true },
  { id: "el_pt_17", name: "נק לדוד חשמלי (עד 15 מ׳)", subCategory: "points", unit: "נקודה", contractorCostPerUnit: 750, isActive: true },
];

const DEFAULT_LIGHTING = [
  { id: "el_lgt_1", name: "התקנת גוף תאורה", description: "התקנה וחיבור", subCategory: "lighting", unit: "יחידה", contractorCostPerUnit: 150, isActive: true },
  { id: "el_lgt_2", name: "התקנת ספוט", description: "כולל חיבור", subCategory: "lighting", unit: "יחידה", contractorCostPerUnit: 90, isActive: true },
  // NEW lighting from user
  { id: "el_lgt_3", name: "נק מאור", subCategory: "lighting", unit: "נקודה", contractorCostPerUnit: 380, isActive: true },
  { id: "el_lgt_4", name: "נק מאור חרום", subCategory: "lighting", unit: "נקודה", contractorCostPerUnit: 350, isActive: true },
  { id: "el_lgt_5", name: "מפסק מחלף", subCategory: "lighting", unit: "יחידה", contractorCostPerUnit: 350, isActive: true },
  { id: "el_lgt_6", name: "מפסק צלב", subCategory: "lighting", unit: "יחידה", contractorCostPerUnit: 450, isActive: true },
  { id: "el_lgt_7", name: "התקנת גוף קיר", subCategory: "lighting", unit: "יחידה", contractorCostPerUnit: 120, isActive: true },
  { id: "el_lgt_8", name: "התקנת גוף תקרה", subCategory: "lighting", unit: "יחידה", contractorCostPerUnit: 120, isActive: true },
  { id: "el_lgt_9", name: "התקנת פס תאורה", description: "לפי מטר רץ", subCategory: "lighting", unit: "מטר רץ", contractorCostPerUnit: 130, isActive: true },
  { id: "el_lgt_10", name: "התקנת מאוורר תקרה", subCategory: "lighting", unit: "יחידה", contractorCostPerUnit: 400, isActive: true },
  { id: "el_lgt_11", name: "התקנת גוף תלוי", subCategory: "lighting", unit: "יחידה", contractorCostPerUnit: 150, isActive: true },
];

const DEFAULT_PANELS = [
  { id: "el_pnl_1", name: "שדרוג לוח חשמל", description: "החלפה/שדרוג לוח קיים", subCategory: "panels", unit: "קומפלט", contractorCostPerUnit: 1500, isActive: true },
  // NEW panels from user
  { id: "el_pnl_2", name: "לוח חשמל תלת פאזי עד 48 מקום", subCategory: "panels", unit: "קומפלט", contractorCostPerUnit: 6000, isActive: true },
  { id: "el_pnl_3", name: "הזנה ללוח חשמל עד 10 מ׳", subCategory: "panels", unit: "מטר רץ", contractorCostPerUnit: 1800, isActive: true },
];

const DEFAULT_COMMS = [
  { id: "el_com_1", name: "נקודת תקשורת RJ45", description: "כולל גמר ושקעים", subCategory: "communications", unit: "נקודה", contractorCostPerUnit: 130, isActive: true },
  // NEW communications from user
  { id: "el_com_2", name: "נק לגלאי אש (לא כולל הגלאי)", subCategory: "communications", unit: "נקודה", contractorCostPerUnit: 350, isActive: true },
  { id: "el_com_3", name: "נק תקשורת (3 מקום + צינור 25 מ״מ + חוט משיכה ללוח)", subCategory: "communications", unit: "נקודה", contractorCostPerUnit: 550, isActive: true },
  { id: "el_com_4", name: "נק לפעמון כניסה", subCategory: "communications", unit: "נקודה", contractorCostPerUnit: 450, isActive: true },
  { id: "el_com_5", name: "התקנת פעמון (לא כולל הפעמון)", subCategory: "communications", unit: "יחידה", contractorCostPerUnit: 100, isActive: true },
  { id: "el_com_6", name: "לוח לריכוז תקשורת 24 מקום", subCategory: "communications", unit: "קומפלט", contractorCostPerUnit: 1200, isActive: true },
];

const DEFAULT_REPAIRS = [
  { id: "el_rep_1", name: "איתור ותיקון קצר", description: "שעת עבודה לחשמלאי", subCategory: "repairs", unit: "שירות", contractorCostPerUnit: 220, isActive: true },

  // NEW: תיקונים נפוצים
  { id: "el_rep_2", name: "החלפת שקע קיים (כולל אביזר)", subCategory: "repairs", unit: "יחידה", contractorCostPerUnit: 140, isActive: true },
  { id: "el_rep_3", name: "החלפת מפסק קיים", subCategory: "repairs", unit: "יחידה", contractorCostPerUnit: 120, isActive: true },
  { id: "el_rep_4", name: "החלפת מא\"ז בלוח", subCategory: "repairs", unit: "יחידה", contractorCostPerUnit: 180, isActive: true },
  { id: "el_rep_5", name: "החלפת מפסק פחת (RCD)", subCategory: "repairs", unit: "יחידה", contractorCostPerUnit: 380, isActive: true },
  { id: "el_rep_6", name: "בדיקת הארקה ומדידה", subCategory: "repairs", unit: "שירות", contractorCostPerUnit: 280, isActive: true },
  { id: "el_rep_7", name: "הידוק וחידוש חיבורים בלוח", subCategory: "repairs", unit: "שירות", contractorCostPerUnit: 220, isActive: true },
  { id: "el_rep_8", name: "קריאת שירות (עד שעה)", subCategory: "repairs", unit: "שירות", contractorCostPerUnit: 250, isActive: true },
  { id: "el_rep_9", name: "קריאת חירום (אחרי שעות)", subCategory: "repairs", unit: "שירות", contractorCostPerUnit: 450, isActive: true },
  { id: "el_rep_10", name: "תיקון חיווט / החלפת קטע קו עד 5 מ׳", subCategory: "repairs", unit: "קומפלט", contractorCostPerUnit: 300, isActive: true },
];

// NEW: Default items for "Installations"
const DEFAULT_INSTALLATIONS = [
  { id: "el_inst_1", name: "התקנת פעמון לדלת כניסה (לא כולל הפעמון)", description: "התקנת פעמון מנגנון", subCategory: "installations", unit: "יחידה", contractorCostPerUnit: 180, isActive: true },
  { id: "el_inst_2", name: "התקנת גוף חימום לדוד (לא כולל גוף חימום)", description: "החלפת גוף חימום לדוד חשמל", subCategory: "installations", unit: "יחידה", contractorCostPerUnit: 250, isActive: true },
  { id: "el_inst_3", name: "התקנת קולט אדים (לא כולל קולט)", description: "התקנת קולט אדים מעל כיריים", subCategory: "installations", unit: "יחידה", contractorCostPerUnit: 300, isActive: true },
  { id: "el_inst_4", name: "התקנת כיריים חשמליות (אינדוקציה/קרמיות)", description: "התקנת כיריים בחיבור תלת פאזי", subCategory: "installations", unit: "יחידה", contractorCostPerUnit: 350, isActive: true },
  { id: "el_inst_5", name: "התקנת שעון שבת לדוד (כולל השעון)", description: "התקנת שעון לדוד חשמל", subCategory: "installations", unit: "יחידה", contractorCostPerUnit: 280, isActive: true },
  { id: "el_inst_6", name: "התקנת מאוורר תקרה", description: "התקנת מאוורר במקום נקודת מאור קיימת", subCategory: "installations", unit: "יחידה", contractorCostPerUnit: 400, isActive: true },
];

const DEFAULTS_BY_SUBCAT = {
  points: DEFAULT_POINTS,
  lighting: DEFAULT_LIGHTING,
  panels: DEFAULT_PANELS,
  communications: DEFAULT_COMMS,
  repairs: DEFAULT_REPAIRS,
  installations: DEFAULT_INSTALLATIONS, // Add new category
};

export default function ElectricalSubcontractorManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState({ desiredProfitPercent: 40 });
  const [items, setItems] = useState([]);
  const [filterSubcat, setFilterSubcat] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // NEW: unified numeric styles (same as tiling/paint)
  const numBase = "text-center font-mono text-[15px] md:text-base tracking-tight";
  const numNeutral = `${numBase} text-slate-700`;
  const numCost = `${numBase} text-red-600`;
  const numPrice = `${numBase} text-indigo-600 font-bold`;
  const numProfit = `${numBase} text-green-700 font-bold`;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const u = await User.me();
      const d = u.electricalDefaults || { desiredProfitPercent: 40 };
      let its = u.electricalSubcontractorItems || [];

      // אם אין פריטים – זורעים את כל ברירות המחדל
      if (!its || its.length === 0) {
        const profit = Number(d.desiredProfitPercent || 40);
        its = [
          ...DEFAULT_POINTS,
          ...DEFAULT_LIGHTING,
          ...DEFAULT_PANELS,
          ...DEFAULT_COMMS,
          ...DEFAULT_REPAIRS,
          ...DEFAULT_INSTALLATIONS, // Add new category defaults
        ].map((it) => ({ ...it, clientPricePerUnit: calcClientPrice(it.contractorCostPerUnit, profit) }));
        await User.updateMyUserData({ electricalSubcontractorItems: its, electricalDefaults: d });
      } else {
        // השלמת פריטים חסרים מכל תתי־הקטגוריות בלי כפילויות (גם אם כבר יש פריטים בתת־קטגוריה)
        const existingIds = new Set(its.map((x) => x.id));
        const profit = Number(d.desiredProfitPercent || 40);

        const allDefaults = [
          ...DEFAULT_POINTS,
          ...DEFAULT_LIGHTING,
          ...DEFAULT_PANELS,
          ...DEFAULT_COMMS,
          ...DEFAULT_REPAIRS,
          ...DEFAULT_INSTALLATIONS, // Add new category defaults
        ];

        const toAdd = allDefaults
          .filter((def) => !existingIds.has(def.id))
          .map((x) => ({ ...x, clientPricePerUnit: calcClientPrice(x.contractorCostPerUnit, profit) }));

        if (toAdd.length) {
          its = [...its, ...toAdd];
          await User.updateMyUserData({ electricalSubcontractorItems: its, electricalDefaults: d });
        }
      }

      setDefaults({ desiredProfitPercent: Number(d.desiredProfitPercent || 40) });
      setItems(its);
      setLoading(false);
    };
    load();
  }, []);

  const visibleItems = useMemo(() => {
    if (filterSubcat === "all") return items;
    return items.filter((i) => i.subCategory === filterSubcat);
  }, [items, filterSubcat]);

  const openAddDialog = (subCategory = "points") => {
    setEditingItem({
      id: `el_${Date.now()}`,
      name: "",
      description: "",
      subCategory,
      unit: "נקודה",
      contractorCostPerUnit: 0,
      clientPricePerUnit: 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (it) => {
    setEditingItem({ ...it });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const saveDialog = async () => {
    if (!editingItem?.name?.trim()) {
      alert("יש להזין שם פריט");
      return;
    }
    const pp = Number(defaults.desiredProfitPercent || 40);
    const newItem = {
      ...editingItem,
      contractorCostPerUnit: Number(editingItem.contractorCostPerUnit || 0),
      clientPricePerUnit: calcClientPrice(editingItem.contractorCostPerUnit, pp),
      isActive: editingItem.isActive !== false,
    };
    const exists = items.some((x) => x.id === newItem.id);
    const updated = exists ? items.map((x) => (x.id === newItem.id ? newItem : x)) : [...items, newItem];
    setItems(updated);
    await User.updateMyUserData({ electricalSubcontractorItems: updated, electricalDefaults: defaults });
    closeDialog();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("למחוק את הפריט הזה?")) return;
    const updated = items.filter((x) => x.id !== id);
    setItems(updated);
    await User.updateMyUserData({ electricalSubcontractorItems: updated, electricalDefaults: defaults });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    await User.updateMyUserData({ electricalSubcontractorItems: items, electricalDefaults: defaults });
    setSaving(false);
  };

  const subcatLabel = (key) => SUBCATS.find((s) => s.key === key)?.label || "-";

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader className="bg-gray-50/60 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 desirousProfitPercentext-yellow-700">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl">חשמל — מחירון קבלן (קבלן משנה)</CardTitle>
                <CardDescription>נהל פריטי חשמל לפי תת-קטגוריות, יחידות ומחירים.</CardDescription>
              </div>
            </div>
            {/* HIDE old controls (moved to toolbar) */}
            <div className="hidden">
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-sm text-gray-600">רווח ברירת מחדל</div>
                <div className="relative w-24">
                  <Input
                    type="number"
                    value={defaults.desiredProfitPercent}
                    onChange={(e) => setDefaults({ desiredProfitPercent: Number(e.target.value || 0) })}
                    className="pr-8"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                </div>
              </div>
              <Button onClick={handleSaveAll} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                {saving ? "שומר..." : "שמור הגדרות"}
                <Save className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* NEW toolbar */}
          <div className="relative overflow-hidden rounded-xl border bg-white p-3">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-amber-400 to-yellow-600" />
            <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <div className="text-xs text-gray-600 mb-1">אחוז רווח ברירת מחדל</div>
                  <div className="relative w-24">
                    <Input
                      type="number"
                      value={defaults.desiredProfitPercent}
                      onChange={(e) => setDefaults({ desiredProfitPercent: Number(e.target.value || 0) })}
                      className="pr-8 h-9"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">סינון תת־קטגוריה</div>
                  <Select value={filterSubcat} onValueChange={setFilterSubcat}>
                    <SelectTrigger className="w-56 h-9">
                      <SelectValue placeholder="בחר תת-קטגוריה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל התת-קטגוריות</SelectItem>
                      {SUBCATS.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <Button onClick={handleSaveAll} disabled={saving} className="h-9 bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100">
                  {saving ? "שומר..." : "שמור הגדרות"}
                  <Save className="w-4 h-4 mr-2" />
                </Button>
                <Button
                  onClick={() => openAddDialog(filterSubcat === "all" ? "points" : filterSubcat)}
                  className="h-9 bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף פריט
                </Button>
              </div>
            </div>
          </div>

          {/* HIDE old filter+add row */}
          <div className="hidden">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-gray-100 text-gray-700 border">
                  <Filter className="w-3 h-3 ml-1" />
                  סינון
                </Badge>
                <Select value={filterSubcat} onValueChange={setFilterSubcat}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="בחר תת-קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל התת-קטגוריות</SelectItem>
                    {SUBCATS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => openAddDialog(filterSubcat === "all" ? "points" : filterSubcat)} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                הוסף פריט
              </Button>
            </div>
          </div>
          <Separator />
          {filterSubcat === "all" ? (
            <div className="space-y-8">
              {SUBCATS.map((sc) => {
                const groupItems = items.filter((i) => i.subCategory === sc.key);
                return (
                  <div key={sc.key} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                      <div className="font-bold text-gray-800">{sc.label}</div>
                      <Button size="sm" variant="outline" onClick={() => openAddDialog(sc.key)}>
                        <Plus className="w-4 h-4 ml-1" />
                        הוסף פריט ל{sc.label}
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-right font-bold">שם הפריט</TableHead>
                          <TableHead className="text-center font-bold">יח"מ</TableHead>
                          <TableHead className="text-center font-bold">עלות קבלן (₪)</TableHead>
                          <TableHead className="text-center font-bold">מחיר ללקוח (₪)</TableHead>
                          <TableHead className="text-center font-bold">רווח (₪)</TableHead>
                          {/* הוסר: % רווח */}
                          <TableHead className="text-center font-bold">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500 py-6">אין פריטים בתת־קטגוריה זו.</TableCell>
                          </TableRow>
                        ) : (
                          groupItems.map((it) => {
                            const pp = (it.desiredProfitPercent === 0 || it.desiredProfitPercent) ? Number(it.desiredProfitPercent) : Number(defaults.desiredProfitPercent || 0);
                            const price = it.clientPricePerUnit || calcClientPrice(it.contractorCostPerUnit, pp);
                            const profitAmount = Number(price) - Number(it.contractorCostPerUnit || 0);
                            // const badgeClass = pp >= 40 ? "bg-green-100 text-green-800" : pp >= 30 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"; // No longer used
                            return (
                              <TableRow key={it.id} className="hover:bg-gray-50">
                                <TableCell className="text-right">
                                  <div className="font-semibold text-gray-800">{it.name}</div>
                                  {it.description && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{it.description}</div>}
                                </TableCell>
                                <TableCell className="text-center">{it.unit || "-"}</TableCell>
                                <TableCell className={numCost}>{formatNis(it.contractorCostPerUnit)}</TableCell>
                                <TableCell className={numPrice}>{formatNis(price)}</TableCell>
                                <TableCell className={numProfit}>{formatNis(profitAmount)}</TableCell>
                                {/* הוסר: תא אחוז רווח */}
                                {/* <TableCell className="text-center">
                                  <Badge className={badgeClass}>
                                    <Percent className="w-3 h-3 ml-1" />
                                    {pp}%
                                  </Badge>
                                </TableCell> */}
                                <TableCell className="text-center">
                                  <div className="flex justify-center gap-1">
                                    <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => openEditDialog(it)}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => handleDelete(it.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-right font-bold">שם הפריט</TableHead>
                    <TableHead className="text-center font-bold">תת-קטגוריה</TableHead>
                    <TableHead className="text-center font-bold">יח"מ</TableHead>
                    <TableHead className="text-center font-bold">עלות קבלן (₪)</TableHead>
                    <TableHead className="text-center font-bold">מחיר ללקוח (₪)</TableHead>
                    <TableHead className="text-center font-bold">רווח (₪)</TableHead>
                    {/* הוסר: % רווח */}
                    <TableHead className="text-center font-bold">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">אין פריטים להצגה.</TableCell>
                    </TableRow>
                  ) : (
                    visibleItems.map((it) => {
                      const pp = (it.desiredProfitPercent === 0 || it.desiredProfitPercent) ? Number(it.desiredProfitPercent) : Number(defaults.desiredProfitPercent || 0);
                      const price = it.clientPricePerUnit || calcClientPrice(it.contractorCostPerUnit, pp);
                      const profitAmount = Number(price) - Number(it.contractorCostPerUnit || 0);
                      // const badgeClass = pp >= 40 ? "bg-green-100 text-green-800" : pp >= 30 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"; // No longer used
                      return (
                        <TableRow key={it.id} className="hover:bg-gray-50">
                          <TableCell className="text-right">
                            <div className="font-semibold text-gray-800">{it.name}</div>
                            {it.description && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{it.description}</div>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">{subcatLabel(it.subCategory)}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{it.unit || "-"}</TableCell>
                          <TableCell className={numCost}>{formatNis(it.contractorCostPerUnit)}</TableCell>
                          <TableCell className={numPrice}>{formatNis(price)}</TableCell>
                          <TableCell className={numProfit}>{formatNis(profitAmount)}</TableCell>
                          {/* הוסר: תא אחוז רווח */}
                          {/* <TableCell className="text-center">
                            <Badge className={badgeClass}><Percent className="w-3 h-3 ml-1" />{pp}%</Badge>
                          </TableCell> */}
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => openEditDialog(it)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => handleDelete(it.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              {editingItem && items.some((x) => x.id === editingItem.id) ? "עריכת פריט חשמל" : "הוספת פריט חשמל חדש"}
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-medium mb-1">שם הפריט</div>
                  <Input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} placeholder="למשל: נקודת חשמל רגילה" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">תת-קטגוריה</div>
                  <Select value={editingItem.subCategory} onValueChange={(v) => setEditingItem({ ...editingItem, subCategory: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBCATS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">יחידת מידה</div>
                  <Select value={editingItem.unit} onValueChange={(v) => setEditingItem({ ...editingItem, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">עלות קבלן ליחידה (₪)</div>
                  <Input type="number" value={editingItem.contractorCostPerUnit} onChange={(e) => setEditingItem({ ...editingItem, contractorCostPerUnit: Number(e.target.value || 0) })} />
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">תיאור (אופציונלי)</div>
                <Textarea value={editingItem.description || ""} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} placeholder="מידע נוסף על הפריט, היקף וחריגים" className="min-h-[80px]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg border">
                <div className="text-center bg-red-100/60 p-2 rounded-lg">
                  <div className="text-xs text-red-800">עלות קבלן</div>
                  <div className="text-lg font-bold text-red-900">{formatNis(editingItem.contractorCostPerUnit)}</div>
                </div>
                <div className="text-center bg-blue-100/60 p-2 rounded-lg">
                  <div className="text-xs text-blue-800">מחיר ללקוח</div>
                  <div className="text-lg font-bold text-blue-900">{formatNis(calcClientPrice(editingItem.contractorCostPerUnit, defaults.desiredProfitPercent))}</div>
                </div>
                <div className="text-center bg-green-100/60 p-2 rounded-lg">
                  <div className="text-xs text-green-800">רווח ליחידה</div>
                  <div className="text-lg font-bold text-green-900">{formatNis(calcClientPrice(editingItem.contractorCostPerUnit, defaults.desiredProfitPercent) - (Number(editingItem.contractorCostPerUnit) || 0))}</div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-gray-500">מחושב לפי אחוז רווח ברירת מחדל ({defaults.desiredProfitPercent}%).</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeDialog}>ביטול</Button>
                  <Button onClick={saveDialog} className="bg-amber-600 hover:bg-amber-700">{items.some((x) => x.id === editingItem.id) ? "עדכן פריט" : "הוסף פריט"}</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* NEW FAB */}
      <Button
        onClick={() => openAddDialog(filterSubcat === "all" ? "points" : filterSubcat)}
        className="fixed bottom-8 left-8 z-40 h-16 w-16 rounded-full bg-white/80 border border-amber-300 text-amber-700 shadow-md hover:bg-amber-50 hover:shadow-lg transition-all flex items-center justify-center"
        aria-label="הוסף פריט חשמל"
      >
        <Plus className="h-8 w-8" />
      </Button>
    </div>
  );
}
