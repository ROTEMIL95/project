
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
import { Wrench, Save, Plus, Filter, Edit, Trash2 } from "lucide-react";

// תתי-קטגוריות לאינסטלציה
const SUBCATS = [
  { key: "infrastructure", label: "תשתיות וצנרת" },
  { key: "sanitary", label: "כלים סניטריים" },
  { key: "connections", label: "חיבורים ומכשירים" },
  { key: "repairs", label: "תיקונים ותחזוקה" },
  { key: "waterproofing", label: "איטום/עבודות מיוחדות" },
];

// יחידות מידה נתמכות
const UNITS = ["יחידה", "מטר רץ", "שירות", "קומפלט"];

// עוזרים
const formatNis = (n) => {
  const num = Number(n) || 0;
  return `₪${num.toLocaleString("he-IL")}`;
};
const calcClientPrice = (contractorCost, profitPercent) => {
  const cc = Number(contractorCost) || 0;
  const pp = Number(profitPercent) || 0;
  return Math.max(0, Math.round(cc * (1 + pp / 100)));
};

// פריטי תשתיות לדוגמה לזריעה ראשונית (ניתנים לעריכה ע"י הקבלן)
const DEFAULT_INFRA_ITEMS = [
  {
    id: "pl_default_1",
    name: "נקודת מים למטבח",
    description: "הכנה וחיבור נקודת מים קרים/חמים",
    subCategory: "infrastructure",
    unit: "יחידה",
    contractorCostPerUnit: 90,
    isActive: true,
  },
  {
    id: "pl_default_2",
    name: "נקודת מים לאמבטיה",
    description: "הכנה וחיבור נקודת ממים קרים/חמים לחדר רחצה",
    subCategory: "infrastructure",
    unit: "יחידה",
    contractorCostPerUnit: 90,
    isActive: true,
  },
  {
    id: "pl_default_3",
    name: "נקודת ביוב 2״",
    description: "הכנת נקודת ביוב לציוד סניטרי (2 אינץ')",
    subCategory: "infrastructure",
    unit: "יחידה",
    contractorCostPerUnit: 110,
    isActive: true,
  },
  {
    id: "pl_default_4",
    name: "בניית קו מים PEX 16",
    description: "הנחת צנרת מים ראשית PEX בקוטר 16 מ\"מ",
    subCategory: "infrastructure",
    unit: "מטר רץ",
    contractorCostPerUnit: 35,
    isActive: true,
  },
  {
    id: "pl_default_5",
    name: "בניית קו ביוב 4״",
    description: "הנחת צנרת ביוב בקוטר 4 אינץ'",
    subCategory: "infrastructure",
    unit: "מטר רץ",
    contractorCostPerUnit: 60,
    isActive: true,
  },
  {
    id: "pl_default_6",
    name: "תשתית ניקוז למזגן",
    description: "הכנת צנרת ניקוז למזגן חלון/מיני מרכזי",
    subCategory: "infrastructure",
    unit: "יחידה",
    contractorCostPerUnit: 120,
    isActive: true,
  },
];

// NEW: ברירת מחדל – סניטריה
const DEFAULT_SANITARY_ITEMS = [
  { id: "pl_san_1", name: "התקנת אסלה תלויה", description: "כולל חיבור לאסלה ומיכל הדחה", subCategory: "sanitary", unit: "יחידה", contractorCostPerUnit: 350, isActive: true },
  { id: "pl_san_2", name: "התקנת כיור אמבטיה", description: "כולל חיבור סיפון וברז", subCategory: "sanitary", unit: "יחידה", contractorCostPerUnit: 280, isActive: true },
  { id: "pl_san_3", name: "התקנת אינטרפוץ", description: "כולל איזון וחיבורי מים", subCategory: "sanitary", unit: "יחידה", contractorCostPerUnit: 320, isActive: true },
];

// NEW: ברירת מחדל – חיבורים ומכשירים
const DEFAULT_CONNECTIONS_ITEMS = [
  { id: "pl_con_1", name: "חיבור מכונת כביסה", description: "כולל בדיקת איטום ונזילות", subCategory: "connections", unit: "יחידה", contractorCostPerUnit: 180, isActive: true },
  { id: "pl_con_2", name: "חיבור מדיח כלים", description: "כולל חיבור למים וניקוז", subCategory: "connections", unit: "יחידה", contractorCostPerUnit: 200, isActive: true },
  { id: "pl_con_3", name: "נקודת מים למקרר", description: "כולל ברז ניל וחיבור מהקו הקרוב", subCategory: "connections", unit: "יחידה", contractorCostPerUnit: 220, isActive: true },
];

// NEW: ברירת מחדל – תיקונים ותחזוקה
const DEFAULT_REPAIRS_ITEMS = [
  { id: "pl_rep_1", name: "איתור נזילה", description: "כולל בדיקה וזיהוי מקור הנזילה", subCategory: "repairs", unit: "שירות", contractorCostPerUnit: 250, isActive: true },
  { id: "pl_rep_2", name: "שחרור סתימה מקומית", description: "באמצעים ידניים/מכניים קלים", subCategory: "repairs", unit: "שירות", contractorCostPerUnit: 220, isActive: true },
  { id: "pl_rep_3", name: "החלפת סיפון", description: "כולל הסיפון והתקנה", subCategory: "repairs", unit: "יחידה", contractorCostPerUnit: 140, isActive: true },
];

// NEW: ברירת מחדל – איטום/עבודות מיוחדות
const DEFAULT_WATERPROOFING_ITEMS = [
  { id: "pl_wat_1", name: "איטום נקודתי בצנרת", description: "תיקון איטום מקומי במעבר צנרת", subCategory: "waterproofing", unit: "יחידה", contractorCostPerUnit: 260, isActive: true },
  { id: "pl_wat_2", name: "איטום רצפת חדר רחצה", description: "עד 4 מ\"ר, כולל חומרי איטום", subCategory: "waterproofing", unit: "קומפלט", contractorCostPerUnit: 850, isActive: true },
  { id: "pl_wat_3", name: "הכנת תשתית ניקוז מיוחד", description: "פתרונות מיוחדים לאזורים בעייתיים", subCategory: "waterproofing", unit: "שירות", contractorCostPerUnit: 400, isActive: true },
];

// NEW: מיפוי תת-קטגוריה -> רשימת ברירות מחדל
const DEFAULTS_BY_SUBCAT = {
  infrastructure: DEFAULT_INFRA_ITEMS,
  sanitary: DEFAULT_SANITARY_ITEMS,
  connections: DEFAULT_CONNECTIONS_ITEMS,
  repairs: DEFAULT_REPAIRS_ITEMS,
  waterproofing: DEFAULT_WATERPROOFING_ITEMS,
};

export default function PlumbingSubcontractorManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [defaults, setDefaults] = useState({ desiredProfitPercent: 40 });
  const [items, setItems] = useState([]);
  const [filterSubcat, setFilterSubcat] = useState("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null => מצב הוספה

  // NEW: unified numeric styles (same as tiling/paint)
  const numBase = "text-center font-mono text-[15px] md:text-base tracking-tight";
  const numNeutral = `${numBase} text-slate-700`;
  const numCost = `${numBase} text-red-600`;
  const numPrice = `${numBase} text-indigo-600 font-bold`;
  const numProfit = `${numBase} text-green-700 font-bold`;

  // טעינת נתונים מהמשתמש + זריעה ראשונית אם אין נתונים
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const u = await User.me();
      const d = u.plumbingDefaults || { desiredProfitPercent: 40 };
      const its = u.plumbingSubcontractorItems || [];

      setDefaults({ desiredProfitPercent: Number(d.desiredProfitPercent || 40) });

      const profit = Number(d.desiredProfitPercent || 40); // Define profit here to be accessible in both branches

      if (!its || its.length === 0) {
        // זריעה ראשונית של פריטי תשתיות + חישוב מחיר ללקוח לפי ברירת המחדל
        const seeded = [
          ...DEFAULT_INFRA_ITEMS,
          ...DEFAULT_SANITARY_ITEMS,
          ...DEFAULT_CONNECTIONS_ITEMS,
          ...DEFAULT_REPAIRS_ITEMS,
          ...DEFAULT_WATERPROOFING_ITEMS,
        ].map((item) => ({
          ...item,
          clientPricePerUnit: calcClientPrice(item.contractorCostPerUnit, profit),
          // לא שומרים desiredProfitPercent בפריט – משתמשים בברירת המחדל
        }));
        await User.updateMyUserData({ plumbingSubcontractorItems: seeded, plumbingDefaults: d });
        setItems(seeded);
      } else {
        // NEW: השלמה אוטומטית לתת־קטגוריות שחסרות אצל המשתמש
        const existingSubcatKeys = new Set(its.map(item => item.subCategory));
        const allSubcatKeys = SUBCATS.map(sc => sc.key);
        const missingSubcats = allSubcatKeys.filter(key => !existingSubcatKeys.has(key));

        let mergedItems = [...its];

        if (missingSubcats.length > 0) {
          missingSubcats.forEach((subcatKey) => {
            const defaultsList = DEFAULTS_BY_SUBCAT[subcatKey] || [];
            const toAdd = defaultsList
              .filter((def) => !mergedItems.some((ex) => ex.id === def.id)) // הגנה כפולה מדופליקטים
              .map((def) => ({
                ...def,
                clientPricePerUnit: calcClientPrice(def.contractorCostPerUnit, profit),
              }));
            mergedItems = [...mergedItems, ...toAdd];
          });

          if (mergedItems.length !== its.length) {
            await User.updateMyUserData({
              plumbingSubcontractorItems: mergedItems,
              plumbingDefaults: d,
            });
          }
        }
        setItems(mergedItems);
      }

      setLoading(false);
    };
    load();
  }, []);

  // שמירת הכל (ברירות מחדל + רשימת פריטים)
  const handleSaveAll = async () => {
    setSaving(true);
    await User.updateMyUserData({
      plumbingDefaults: defaults,
      plumbingSubcontractorItems: items,
    });
    setSaving(false);
  };

  // EDIT: פתיחת דיאלוג הוספה – תמיכה בתת־קטגוריה ברירת מחדל
  const openAddDialog = (subCategory = "infrastructure") => {
    setEditingItem({
      id: `pl_${Date.now()}`,
      name: "",
      description: "",
      subCategory,
      unit: "יחידה",
      contractorCostPerUnit: 0,
      desiredProfitPercent: null, // null => שימוש בברירת מחדל
      clientPricePerUnit: 0,
      isActive: true,
      priceNote: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (it) => {
    setEditingItem({
      id: it.id,
      name: it.name || "",
      description: it.description || "",
      subCategory: it.subCategory || "infrastructure",
      unit: it.unit || "יחידה",
      contractorCostPerUnit: Number(it.contractorCostPerUnit || 0),
      // In the new UI, items always derive profit from the global default.
      // So, when editing, we don't carry over a specific desiredProfitPercent.
      desiredProfitPercent: null,
      clientPricePerUnit: Number(it.clientPricePerUnit || 0),
      isActive: it.isActive !== false,
      priceNote: it.priceNote || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  // חישוב מחיר לקוח לתצוגה מקדימה בטופס
  const previewClientPrice = useMemo(() => {
    if (!editingItem) return 0;
    // With the updated UI, items always use the global default profit percentage
    const p = defaults.desiredProfitPercent;
    return calcClientPrice(editingItem.contractorCostPerUnit, p);
  }, [editingItem, defaults]);

  // חישוב רווח ליחידה (תצוגה מקדימה)
  const previewProfitAmount = useMemo(() => {
    if (!editingItem) return 0;
    const cc = Number(editingItem.contractorCostPerUnit || 0);
    return Math.max(0, Number(previewClientPrice || 0) - cc);
  }, [editingItem, previewClientPrice]);

  // שינויי שדות בטופס
  const setField = (key, val) => {
    setEditingItem((prev) => ({ ...prev, [key]: val }));
  };

  // שמירה מהדיאלוג (הוספה/עדכון)
  const handleDialogSave = async () => {
    if (!editingItem?.name?.trim()) {
      alert("יש להזין שם פריט");
      return;
    }
    // Items now always use the global default profit percentage
    const profitToUse = Number(defaults.desiredProfitPercent || 0);

    const newItem = {
      ...editingItem,
      contractorCostPerUnit: Number(editingItem.contractorCostPerUnit || 0),
      // Explicitly set desiredProfitPercent to undefined as items now default to global profit percent
      desiredProfitPercent: undefined,
      clientPricePerUnit: calcClientPrice(editingItem.contractorCostPerUnit, profitToUse),
      isActive: editingItem.isActive !== false,
    };

    const exists = items.some((x) => x.id === newItem.id);
    const updated = exists
      ? items.map((x) => (x.id === newItem.id ? newItem : x))
      : [...items, newItem];

    setItems(updated);
    // שמירה מיידית של הפריט החדש/המעודכן למסד המשתמש
    await User.updateMyUserData({ plumbingSubcontractorItems: updated });
    closeDialog();
  };

  // מחיקת פריט
  const handleDelete = async (id) => {
    if (!window.confirm("למחוק את הפריט הזה?")) return;
    const updated = items.filter((x) => x.id !== id);
    setItems(updated);
    await User.updateMyUserData({ plumbingSubcontractorItems: updated });
  };

  // נתונים לתצוגה (סינון)
  const visibleItems = useMemo(() => {
    if (filterSubcat === "all") return items;
    return items.filter((i) => i.subCategory === filterSubcat);
  }, [items, filterSubcat]);

  // helper: תווית תת־קטגוריה
  const subcatLabel = (key) => SUBCATS.find((s) => s.key === key)?.label || "-";

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <Card>
        <CardHeader className="bg-gray-50/60 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 text-teal-700">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl">אינסטלציה — מחירון קבלן (קבלן משנה)</CardTitle>
                <CardDescription>
                  נהל פריטי אינסטלציה לקבלן משנה לפי תת-קטגוריות, יחידות ומחירים.
                </CardDescription>
              </div>
            </div>

            {/* HIDE old controls (moved to pretty toolbar below) */}
            <div className="hidden">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="text-sm text-gray-600">רווח ברירת מחדל</div>
                  <div className="relative w-24">
                    <Input
                      type="number"
                      value={defaults.desiredProfitPercent}
                      onChange={(e) =>
                        setDefaults({ desiredProfitPercent: Number(e.target.value || 0) })
                      }
                      className="pr-8"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                  </div>
                </div>
                <Button onClick={handleSaveAll} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                  {saving ? "שומר..." : "שמור הגדרות"}
                  <Save className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* NEW: Pretty top toolbar */}
          <div className="relative overflow-hidden rounded-xl border bg-white p-3">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-teal-500 to-emerald-500" />
            <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <div className="text-xs text-gray-600 mb-1">אחוז רווח ברירת מחדל</div>
                  <div className="relative w-24">
                    <Input
                      type="number"
                      value={defaults.desiredProfitPercent}
                      onChange={(e) =>
                        setDefaults({ desiredProfitPercent: Number(e.target.value || 0) })
                      }
                      className="pr-8 h-9"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
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
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <Button onClick={handleSaveAll} disabled={saving} className="h-9 bg-teal-50 text-teal-700 border border-teal-300 hover:bg-teal-100">
                  {saving ? "שומר..." : "שמור הגדרות"}
                  <Save className="w-4 h-4 mr-2" />
                </Button>
                <Button
                  onClick={() => openAddDialog(filterSubcat === "all" ? "infrastructure" : filterSubcat)}
                  className="h-9 bg-teal-50 text-teal-700 border border-teal-300 hover:bg-teal-100"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף פריט
                </Button>
              </div>
            </div>
          </div>

          {/* HIDE old filter row */}
          <div className="hidden">
            {/* סרגל מסנן + הוספה */}
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
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* כפתור הוספה כללי */}
              <Button onClick={() => openAddDialog(filterSubcat === "all" ? "infrastructure" : filterSubcat)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                הוסף פריט
              </Button>
            </div>
          </div>

          <Separator />

          {/* תצוגת טבלאות */}
          {filterSubcat === "all" ? (
            // כשנבחר "כל התת־קטגוריות" – מציגים טבלה לכל תת־קטגוריה
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
                          {/* תת-קטגוריה אינה מוצגת כאן כי היא בכותרת הקבוצה */}
                          <TableHead className="text-center font-bold">יח"מ</TableHead>
                          <TableHead className="text-center font-bold">עלות קבלן (₪)</TableHead>
                          <TableHead className="text-center font-bold">מחיר ללקוח (₪)</TableHead>
                          <TableHead className="text-center font-bold">רווח (₪)</TableHead> {/* NEW */}
                          <TableHead className="text-center font-bold">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupItems.length === 0 ? (
                          <TableRow>
                            {/* עדכון colSpan מ-5 ל-6 לאחר הוספת 'רווח (₪)' */}
                            <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                              אין פריטים בתת־קטגוריה זו.
                            </TableCell>
                          </TableRow>
                        ) : (
                          groupItems.map((it) => {
                            const profitPercent =
                              (it.desiredProfitPercent === 0 || it.desiredProfitPercent
                                ? Number(it.desiredProfitPercent)
                                : Number(defaults.desiredProfitPercent || 0)) || 0;
                            const price =
                              it.clientPricePerUnit ||
                              calcClientPrice(it.contractorCostPerUnit, profitPercent);
                            const profitAmount = Math.max(0, Number(price) - Number(it.contractorCostPerUnit || 0)); // NEW

                            return (
                              <TableRow key={it.id} className="hover:bg-gray-50">
                                <TableCell className="text-right">
                                  <div className="font-semibold text-gray-800">{it.name}</div>
                                  {it.description && (
                                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">{it.description}</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">{it.unit || "-"}</TableCell>
                                <TableCell className={numCost}>
                                  {formatNis(it.contractorCostPerUnit)}
                                </TableCell>
                                <TableCell className={numPrice}>
                                  {formatNis(price)}
                                </TableCell>
                                <TableCell className={numProfit}>
                                  {formatNis(profitAmount)}
                                </TableCell> {/* NEW */}
                                <TableCell className="text-center">
                                  <div className="flex justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                      onClick={() => openEditDialog(it)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                      onClick={() => handleDelete(it.id)}
                                    >
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
            // כשנבחרה תת־קטגוריה ספציפית – טבלה יחידה (הקוד הקיים)
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-right font-bold">שם הפריט</TableHead>
                    <TableHead className="text-center font-bold">תת-קטגוריה</TableHead>
                    <TableHead className="text-center font-bold">יח"מ</TableHead>
                    <TableHead className="text-center font-bold">עלות קבלן (₪)</TableHead>
                    <TableHead className="text-center font-bold">מחיר ללקוח (₪)</TableHead>
                    <TableHead className="text-center font-bold">רווח (₪)</TableHead> {/* NEW */}
                    <TableHead className="text-center font-bold">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.length === 0 ? (
                    <TableRow>
                      {/* עדכון colSpan מ-6 ל-7 לאחר הוספת 'רווח (₪)' */}
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        אין פריטים להצגה. הוסף פריט חדש בעזרת הכפתור למעלה.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleItems.map((it) => {
                      const profitPercent =
                        (it.desiredProfitPercent === 0 || it.desiredProfitPercent
                          ? Number(it.desiredProfitPercent)
                          : Number(defaults.desiredProfitPercent || 0)) || 0;
                      const price =
                        it.clientPricePerUnit ||
                        calcClientPrice(it.contractorCostPerUnit, profitPercent);
                      const profitAmount = Math.max(0, Number(price) - Number(it.contractorCostPerUnit || 0)); // NEW

                      return (
                        <TableRow key={it.id} className="hover:bg-gray-50">
                          <TableCell className="text-right">
                            <div className="font-semibold text-gray-800">{it.name}</div>
                            {it.description && (
                              <div className="text-xs text-gray-500 mt-1 line-clamp-1">{it.description}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-teal-50 text-teal-700 border border-teal-200">{subcatLabel(it.subCategory)}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{it.unit || "-"}</TableCell>
                          <TableCell className={numCost}>
                            {formatNis(it.contractorCostPerUnit)}
                          </TableCell>
                          <TableCell className={numPrice}>
                            {formatNis(price)}
                          </TableCell>
                          <TableCell className={numProfit}>
                            {formatNis(profitAmount)}
                          </TableCell> {/* NEW */}
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                onClick={() => openEditDialog(it)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                onClick={() => handleDelete(it.id)}
                              >
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

      {/* דיאלוג הוספה/עריכה */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-teal-600" />
              {editingItem && items.some((x) => x.id === editingItem.id)
                ? "עריכת פריט אינסטלציה"
                : "הוספת פריט אינסטלציה חדש"}
            </DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-medium mb-1">שם הפריט</div>
                  <Input
                    value={editingItem.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="למשל: נקודת מים למטבח"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">תת-קטגוריה</div>
                  <Select
                    value={editingItem.subCategory}
                    onValueChange={(v) => setField("subCategory", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBCATS.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">יחידת מידה</div>
                  <Select value={editingItem.unit} onValueChange={(v) => setField("unit", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">עלות קבלן ליחידה (₪)</div>
                  <Input
                    type="number"
                    value={editingItem.contractorCostPerUnit}
                    onChange={(e) =>
                      setField("contractorCostPerUnit", Number(e.target.value || 0))
                    }
                  />
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">תיאור (אופציונלי)</div>
                <Textarea
                  value={editingItem.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="מידע נוסף על הפריט, היקף וחריגים"
                  className="min-h-[80px]"
                />
              </div>

              {/* REPLACED: במקום שדה אחוז רווח – תצוגת 3 אריחים: עלות קבלן, מחיר ללקוח, רווח ליחידה */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg border">
                <div className="text-center bg-red-100/60 p-2 rounded-lg">
                  <div className="text-xs text-red-800">עלות קבלן</div>
                  <div className="text-lg font-bold text-red-900">
                    {formatNis(editingItem.contractorCostPerUnit)}
                  </div>
                </div>
                <div className="text-center bg-blue-100/60 p-2 rounded-lg">
                  <div className="text-xs text-blue-800">מחיר ללקוח</div>
                  <div className="text-lg font-bold text-blue-900">
                    {formatNis(previewClientPrice)}
                  </div>
                </div>
                <div className="text-center bg-green-100/60 p-2 rounded-lg">
                  <div className="text-xs text-green-800">רווח ליחידה</div>
                  <div className="text-lg font-bold text-green-900">
                    {formatNis(previewProfitAmount)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-gray-500">
                  מחושב לפי אחוז רווח ברירת מחדל ({defaults.desiredProfitPercent}%) — ניתן לשינוי בכותרת.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeDialog}>
                    ביטול
                  </Button>
                  <Button onClick={handleDialogSave} className="bg-teal-600 hover:bg-teal-700">
                    {items.some((x) => x.id === editingItem.id) ? "עדכן פריט" : "הוסף פריט"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* NEW: Floating Add Button (FAB) */}
      <Button
        onClick={() => openAddDialog(filterSubcat === "all" ? "infrastructure" : filterSubcat)}
        className="fixed bottom-8 left-8 z-40 h-16 w-16 rounded-full bg-white/80 border border-teal-300 text-teal-700 shadow-md hover:bg-teal-50 hover:shadow-lg transition-all flex items-center justify-center"
        aria-label="הוסף פריט אינסטלציה"
      >
        <Plus className="h-8 w-8" />
      </Button>
    </div>
  );
}
