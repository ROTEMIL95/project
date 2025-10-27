
import React, { useEffect, useMemo, useState } from "react";
import { User } from "@/api/entities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, Lightbulb, Plus, Search, Calculator, Pencil, ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ElectricalManualItemDialog from "./ElectricalManualItemDialog";
import ElectricalItemDialog from "./ElectricalItemDialog";
import CategoryFloatingAddButton from './CategoryFloatingAddButton';

const SUBCATS = [
  { key: "points", label: "נקודות חשמל" },
  { key: "lighting", label: "תאורה" },
  { key: "panels", label: "לוחות/ארונות" },
  { key: "communications", label: "תקשורת" },
  { key: "repairs", label: "תיקונים" },
  { key: "installations", label: "התקנות" }
];

const formatNis = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;

const calcClientPrice = (cost, pp) => {
  const c = Number(cost) || 0;
  const p = Number(pp) || 0;
  return Math.max(0, Math.round(c * (1 + p / 100)));
};

export default function ElectricalCategory({
  selectedItems = [],
  onAddItemToQuote,
  categoryId = "cat_electricity",
  categoryTimings = {},
  onCategoryTimingChange,
  categoriesNav = [],
  currentCategoryId,
  onSelectCategory,
  onProceed,
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [defaults, setDefaults] = useState({ desiredProfitPercent: 40 });
  const [subcatFilter, setSubcatFilter] = useState("points");
  const [search, setSearch] = useState("");
  const [qtyMap, setQtyMap] = useState({});
  const [showAddDialog, setShowAddDialog] = useState(false); // Renamed from showManual
  const [editingItem, setEditingItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  // CHANGED: State for showing/hiding dates section - default to FALSE (closed)
  const [showDates, setShowDates] = useState(false);

  // Load user's electrical price list
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const u = await User.me();
      setItems((u.electricalSubcontractorItems || []).filter((x) => x.isActive !== false));
      setDefaults(u.electricalDefaults || { desiredProfitPercent: 40 });
      setLoading(false);
    };
    run();
  }, []);

  const timing = categoryTimings?.[categoryId] || { startDate: "", endDate: "" };
  const startDate = timing.startDate ? new Date(timing.startDate) : undefined;
  const endDate = timing.endDate ? new Date(timing.endDate) : undefined;

  const handleStartSelect = (d) => {
    if (!d) return;
    onCategoryTimingChange && onCategoryTimingChange(categoryId, "startDate", format(d, "yyyy-MM-dd"));
  };
  const handleEndSelect = (d) => {
    if (!d) return;
    onCategoryTimingChange && onCategoryTimingChange(categoryId, "endDate", format(d, "yyyy-MM-dd"));
  };

  const normalizedItems = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    const filteredBySubcat = base.filter((i) => i.subCategory === subcatFilter);
    if (!search.trim()) return filteredBySubcat;
    const s = search.trim().toLowerCase();
    return filteredBySubcat.filter(
      (i) =>
        (i.name || "").toLowerCase().includes(s) ||
        (i.description || "").toLowerCase().includes(s)
    );
  }, [items, subcatFilter, search]);

  const getQty = (id) => Math.max(1, Number(qtyMap[id] ?? 1) || 1);
  const setQty = (id, v) => setQtyMap((m) => ({ ...m, [id]: v }));

  // UPDATED: addItem respects quantity correctly
  const addItem = (it) => {
    const pp =
      it.desiredProfitPercent === 0 || it.desiredProfitPercent
        ? Number(it.desiredProfitPercent)
        : Number(defaults.desiredProfitPercent || 40);
    const unit = it.unit || "יחידה";
    const unitCost = Number(it.contractorCostPerUnit || 0);
    const unitPrice = Number(it.clientPricePerUnit || calcClientPrice(unitCost, pp));
    const qty = getQty(it.id);

    // Calculate totals - if ignoreQuantity flag exists, use it, otherwise multiply by quantity
    const totalCost = it.ignoreQuantity ? unitCost : unitCost * qty;
    const totalPrice = it.ignoreQuantity ? unitPrice : unitPrice * qty;

    const itemToAdd = {
      id: `el_${it.id || 'custom'}_${Date.now()}`,
      categoryId,
      categoryName: "חשמל",
      source: it.source || "electrical_catalog",
      description: (it.name || "") + (it.description ? ` — ${it.description}` : ""),
      quantity: qty, // This now correctly reflects the actual quantity
      unit,
      unitPrice,
      totalPrice,
      totalCost,
      profit: totalPrice - totalCost,
      // Pass the ignoreQuantity flag along if it was set on the item
      ...(it.ignoreQuantity !== undefined && { ignoreQuantity: it.ignoreQuantity }),
    };
    onAddItemToQuote && onAddItemToQuote(itemToAdd);
  };

  // UPDATED: manual item uses addItem and ignoreQuantity
  const handleManualItemAdd = (item) => {
    const patched = {
      ...item,
      id: `manual_${Date.now()}`, // Generate a unique ID for the manual item
      source: "electrical_manual",
      ignoreQuantity: true
    };
    addItem(patched);
    setShowAddDialog(false); // Changed from setShowManual
  };

  // Summary for this category from selectedItems
  const electricalItems = (selectedItems || []).filter((it) => it.categoryId === categoryId);
  const summary = electricalItems.reduce(
    (acc, it) => {
      const price = Number(it.totalPrice) || 0;
      const cost = Number(it.totalCost) || 0;
      acc.price += price;
      acc.cost += cost;
      acc.profit += (price - cost);
      return acc;
    },
    { price: 0, cost: 0, profit: 0 }
  );
  const itemsCount = electricalItems.length;

  return (
    <>
      <Card className="shadow-lg border border-yellow-200" dir="rtl">
        <CardHeader className="bg-gray-50/60 border-b space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Lightbulb className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-800">חשמל</CardTitle>
              <CardDescription className="text-gray-600">
                בחר תאריכים לקטגוריה, סנן לפי תת־קטגוריה, הוסף פריטים מנוהלים מהמחירון שלך.
              </CardDescription>
            </div>
          </div>

          {/* Filters row: subcat + search + manual item button */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <Select value={subcatFilter} onValueChange={setSubcatFilter} className="w-full sm:w-56">
              <SelectTrigger>
                <SelectValue placeholder="בחר תת־קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                {SUBCATS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש פריט לפי שם/תיאור..."
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              className="sm:w-auto w-full flex-shrink-0"
              onClick={() => setShowAddDialog(true)} // Changed from setShowManual
            >
              <Plus className="w-4 h-4 ml-2" />
              פריט ידני
            </Button>
          </div>

          {/* תאריכים עם כפתור פתיחה/סגירה */}
          <div className="rounded-xl border bg-white">
            {/* כותרת עם כפתור toggle */}
            <button
              onClick={() => setShowDates(!showDates)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                זמן עבודה לקטגוריה
              </span>
              {showDates ? (
                <ChevronDown className="w-4 h-4 text-gray-400 rotate-180" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {/* תאריכים - מוצג רק אם showDates = true */}
            {showDates && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                  <div>
                    <span className="text-xs text-gray-600 flex items-center gap-1 mb-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                      תאריך התחלה
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start h-10 w-full", startDate ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700")}>
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd.MM.yyyy") : "בחר תאריך"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" side="bottom">
                        <Calendar mode="single" selected={startDate} onSelect={handleStartSelect} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 flex items-center gap-1 mb-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                      תאריך סיום
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start h-10 w-full", endDate ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700")}>
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {endDate ? format(endDate, "dd.MM.yyyy") : "בחר תאריך"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" side="bottom">
                        <Calendar mode="single" selected={endDate} onSelect={handleEndSelect} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-4">
          <Separator />
          {loading ? (
            <div className="py-16 text-center text-gray-500">טוען פריטי חשמל...</div>
          ) : normalizedItems.length === 0 ? (
            <div className="py-10 text-center text-gray-600">
              <div className="text-lg font-semibold mb-2">לא נמצאו פריטי חשמל</div>
              <div className="text-sm mb-4">תוכל להגדיר פריטים במחירון הקבלן ואז לחזור לכאן.</div>
              <Link to={createPageUrl('ContractorPricing')}>
                <Button variant="outline">פתח מחירון קבלן</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {normalizedItems.map((it) => {
                const pp = (it.desiredProfitPercent === 0 || it.desiredProfitPercent) ? Number(it.desiredProfitPercent) : Number(defaults.desiredProfitPercent || 40);
                const unit = it.unit || "יחידה";
                const unitCost = Number(it.contractorCostPerUnit || 0);
                const unitPrice = Number(it.clientPricePerUnit || calcClientPrice(unitCost, pp));
                const qty = getQty(it.id);
                const totalCost = unitCost * qty;
                const totalPrice = unitPrice * qty;
                const totalProfit = Math.max(0, totalPrice - totalCost);

                return (
                  <Card key={it.id} className="border border-yellow-300 hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-800">{it.name}</CardTitle>
                          {it.description && (
                            <CardDescription className="text-xs text-gray-600 mt-0.5">{it.description}</CardDescription>
                          )}
                        </div>
                        <Badge variant="outline" className="text-gray-700">{unit}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-gray-600">כמות</span>
                          <Input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={(e) => setQty(it.id, Number(e.target.value))}
                            className="h-9"
                          />
                        </div>
                        {/* intentionally blank to align grid */}
                        <div></div>
                      </div>

                      {/* one set of tiles only: no 'per unit' sub-lines, no profit-percent chip */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-red-100/60 p-2 rounded-lg">
                          <div className="text-xs text-red-800">עלות קבלן</div>
                          <div className="font-bold text-red-900">{formatNis(totalCost)}</div>
                        </div>
                        <div className="text-center bg-green-100/60 p-2 rounded-lg">
                          <div className="text-xs text-green-800">רווח (סה״כ)</div>
                          <div className="font-bold text-green-900">{formatNis(totalProfit)}</div>
                        </div>
                        <div className="text-center bg-blue-100/60 p-2 rounded-lg">
                          <div className="text-xs text-blue-800">מחיר ללקוח</div>
                          <div className="font-bold text-blue-900">{formatNis(totalPrice)}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingItem(it);
                            setShowEdit(true);
                          }}
                          className="flex-shrink-0"
                        >
                          <Pencil className="w-4 h-4 ml-2" />
                          ערוך
                        </Button>
                        <Button
                          onClick={() => addItem(it)}
                          className="w-full bg-yellow-50/30 hover:bg-yellow-100 text-yellow-800 border border-yellow-200"
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          הוסף להצעה
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Category Summary */}
          <div className="mt-6 relative rounded-2xl border-2 border-indigo-200/70 bg-white/95 p-5 shadow-sm border-r-4 border-r-indigo-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <Calculator className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-800">סיכום קטגוריית חשמל</span>
              </div>
              <span className="hidden md:inline text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                סיכום
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                <div className="text-[11px] text-red-800">עלות קבלן (סה״כ)</div>
                <div className="text-xl font-bold text-red-900">{formatNis(summary.cost)}</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-center">
                <div className="text-[11px] text-indigo-800">מחיר ללקוח (סה״כ)</div>
                <div className="text-xl font-bold text-indigo-700">{formatNis(summary.price)}</div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                <div className="text-[11px] text-green-800">רווח (סה״כ)</div>
                <div className="text-xl font-bold text-green-700">{formatNis(summary.profit)}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-[11px] text-gray-700">סה״כ פריטים בקטגוריה</div>
                <div className="text-xl font-bold text-gray-800">{itemsCount}</div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Footer with Navigation Buttons */}
        <div className="border-t p-4 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => {
                const currentIndex = categoriesNav.findIndex(c => c.id === currentCategoryId);
                if (currentIndex > 0) {
                  onSelectCategory(categoriesNav[currentIndex - 1].id);
                }
              }}
              disabled={categoriesNav.findIndex(c => c.id === currentCategoryId) === 0}
              className="text-base px-6 py-2.5"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              הקודם
            </Button>
            <Button
              onClick={() => {
                const currentIndex = categoriesNav.findIndex(c => c.id === currentCategoryId);
                if (currentIndex < categoriesNav.length - 1) {
                  onSelectCategory(categoriesNav[currentIndex + 1].id);
                } else {
                  // זו הקטגוריה האחרונה - מעבר לעלויות נוספות
                  if (onProceed) onProceed();
                }
              }}
              className="text-base px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {(() => {
                const currentIndex = categoriesNav.findIndex(c => c.id === currentCategoryId);
                if (currentIndex < categoriesNav.length - 1) {
                  return `הבא: ${categoriesNav[currentIndex + 1].name}`;
                } else {
                  return 'הבא: עלויות נוספות';
                }
              })()}
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* כפתור צף להוספת פריט */}
      <CategoryFloatingAddButton
        onClick={() => setShowAddDialog(true)} // Changed from setShowManual
        categoryColor="yellow"
        icon={Plus} // Changed from Lightbulb
        label="הוסף פריט חשמל"
      />

      {/* Dialogs */}
      <ElectricalManualItemDialog
        open={showAddDialog} // Changed from showManual
        onOpenChange={setShowAddDialog} // Changed from setShowManual
        onAdd={handleManualItemAdd}
        defaults={{ desiredProfitPercent: defaults.desiredProfitPercent || 40 }}
        defaultSubcat={subcatFilter}
      />

      <ElectricalItemDialog
        open={showEdit}
        onOpenChange={(open) => {
          setShowEdit(open);
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
        hideUnit
        initialQuantity={editingItem ? getQty(editingItem.id) : 1}
        onSaved={(updatedItem) => {
          // Note: `updatedItem` here will contain the edited fields from the dialog,
          // including any manually set quantity.
          // `editingItem.id` is the original ID from the catalog.
          const q = Number(updatedItem.quantity) || 1;
          setQty(updatedItem.id, q); // Update qtyMap for the original item id

          // The patched item for adding to quote: combines original item with updated fields,
          // and explicitly sets ignoreQuantity to true as per requirements.
          // This ensures that even an item originating from the catalog,
          // once edited and added via this dialog, becomes quantity-independent for its total price calculation in the quote.
          const patched = { ...editingItem, ...updatedItem, ignoreQuantity: true }; // NEW
          addItem(patched);
          setShowEdit(false);
          setEditingItem(null);
        }}
        defaults={{ desiredProfitPercent: defaults.desiredProfitPercent || 40 }}
      />
    </>
  );
}
