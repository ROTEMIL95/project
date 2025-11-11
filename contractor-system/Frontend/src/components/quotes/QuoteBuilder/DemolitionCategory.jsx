
import React, { useEffect, useMemo, useState, useRef } from "react";
import { User } from "@/lib/entities";
import { useUser } from "@/components/utils/UserContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, Trash2, Plus, Search, Calculator, Pencil, X, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DemolitionItemDialog from "./DemolitionItemDialog";
import { getCategoryTheme } from "./categoryTheme";
import CategoryFloatingAddButton from './CategoryFloatingAddButton';

const formatNis = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;
const formatNum = (n) => (Number(n) || 0).toLocaleString("he-IL");

// NEW: Complexity levels that affect work duration
const COMPLEXITY_LEVELS = [
  { id: 'normal', label: 'רגיל', multiplier: 1.0 },
  { id: 'medium', label: 'בינוני', multiplier: 1.25 },
  { id: 'complex', label: 'מורכב', multiplier: 1.5 },
];

export default function DemolitionCategory({
  selectedItems = [],
  onAddItemToQuote,
  categoryId = "cat_demolition",
  categoryTimings = {},
  onCategoryTimingChange,
  categoriesNav = [],
  currentCategoryId,
  onSelectCategory,
  onProceed, // NEW: Added onProceed prop
}) {
  const { user: currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [defaults, setDefaults] = useState({ laborCostPerDay: 1000, profitPercent: 30 });
  const [subcatFilter, setSubcatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [qtyMap, setQtyMap] = useState({});
  const [complexityMap, setComplexityMap] = useState({}); // NEW: track complexity per item
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditDialog, setShowEdit] = useState(false);

  // CHANGED: State for showing/hiding dates section - default to FALSE (closed)
  const [showDates, setShowDates] = useState(false);

  // טעינת פריטי הריסה מהמחירון
  useEffect(() => {
    const run = () => {
      setLoading(true);
      if (currentUser?.user_metadata) {
        const u = currentUser.user_metadata;
        setItems((u.demolitionItems || []).filter((x) => x.isActive !== false));
        setDefaults({
          laborCostPerDay: Number(u.demolitionDefaults?.laborCostPerDay) || 1000,
          profitPercent: Number(u.demolitionDefaults?.profitPercent) || 30,
        });
      }
      setLoading(false);
    };
    if (currentUser) {
      run();
    }
  }, [currentUser]);

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

  // סינון פריטים
  const normalizedItems = useMemo(() => {
    let base = Array.isArray(items) ? items : [];
    if (subcatFilter !== "all") {
      base = base.filter((i) => i.subCategory === subcatFilter);
    }
    if (!search.trim()) return base;
    const s = search.trim().toLowerCase();
    return base.filter(
      (i) =>
        (i.name || "").toLowerCase().includes(s) ||
        (i.description || "").toLowerCase().includes(s)
    );
  }, [items, subcatFilter, search]);

  // תת-קטגוריות ייחודיות מהפריטים
  const subCategories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.subCategory).filter(Boolean)));
    return cats;
  }, [items]);

  const getQty = (id) => Math.max(1, Number(qtyMap[id] ?? 1) || 1);
  const setQty = (id, v) => setQtyMap((m) => ({ ...m, [id]: v }));
  
  const getComplexity = (id) => complexityMap[id] || 'normal';
  const setComplexity = (id, v) => setComplexityMap((m) => ({ ...m, [id]: v }));

  const addItem = (it) => {
    // Use existing quantity or profitPercent if already calculated (for manual items)
    const isManualItem = it.source === "demolition_manual" || it.totalPrice || it.totalCost;

    const profitPercent = (it.profitPercent === 0 || it.profitPercent)
      ? Number(it.profitPercent)
      : Number(defaults.profitPercent || 30);

    const unit = it.unit || "יחידה";

    // For manual items, use the quantity from the item itself, not from qtyMap
    const qty = isManualItem ? (Number(it.quantity) || 1) : getQty(it.id);
    const complexity = isManualItem ? 'normal' : getComplexity(it.id);
    const complexityData = COMPLEXITY_LEVELS.find(c => c.id === complexity) || COMPLEXITY_LEVELS[0];

    // If item already has calculated costs (manual item), use them directly
    if (isManualItem && it.totalPrice && it.totalCost) {
      const itemToAdd = {
        id: `demo_${it.id || 'custom'}_${Date.now()}`,
        categoryId,
        categoryName: "הריסה ופינוי",
        source: it.source || "demolition_manual",
        name: it.name || "",
        description: it.description || "",
        quantity: qty,
        unit,
        unitPrice: Math.round(it.totalPrice / qty),
        totalPrice: it.totalPrice,
        totalCost: it.totalCost,
        profit: it.totalPrice - it.totalCost,
        profitPercent,
        workDuration: it.workDays || ((Number(it.hoursPerUnit) || 0) * qty / 8),
        hoursPerUnit: Number(it.hoursPerUnit) || 0,
        originalHoursPerUnit: Number(it.hoursPerUnit) || 0,
        complexityLevel: 'normal',
        complexityMultiplier: 1.0,
      };

      console.log('Adding manual demolition item:', itemToAdd);
      onAddItemToQuote && onAddItemToQuote(itemToAdd);
      return;
    }

    // Otherwise, calculate costs based on hours and labor cost per day (catalog items)
    const hoursPerUnit = Number(it.hoursPerUnit || 0);
    const laborCostPerDay = Number(defaults.laborCostPerDay || 1000);
    const hoursPerDay = 8; // Standard work day

    // Apply complexity multiplier to hours
    const effectiveHours = hoursPerUnit * complexityData.multiplier;
    const unitCost = (effectiveHours / hoursPerDay) * laborCostPerDay;

    // Calculate total cost and price
    const totalCost = unitCost * qty;
    const totalPrice = Math.round(totalCost * (1 + profitPercent / 100));
    const unitPrice = Math.round(totalPrice / qty);

    const itemToAdd = {
      id: `demo_${it.id || 'custom'}_${Date.now()}`,
      categoryId,
      categoryName: "הריסה ופינוי",
      source: it.source || "demolition_catalog",
      name: it.name || "",
      description: it.description || "",
      quantity: qty,
      unit,
      unitPrice,
      totalPrice,
      totalCost,
      profit: totalPrice - totalCost,
      profitPercent,
      workDuration: (effectiveHours * qty) / hoursPerDay,
      hoursPerUnit: effectiveHours,
      originalHoursPerUnit: Number(it.hoursPerUnit || 0),
      complexityLevel: complexity,
      complexityMultiplier: complexityData.multiplier,
    };

    console.log('Adding catalog demolition item:', itemToAdd);
    onAddItemToQuote && onAddItemToQuote(itemToAdd);
  };

  // סיכום קטגוריה
  const demolitionItems = (selectedItems || []).filter((it) => it.categoryId === categoryId);
  const summary = demolitionItems.reduce(
    (acc, it) => {
      const price = Number(it.totalPrice) || 0;
      const cost = Number(it.totalCost) || 0;
      const workDays = Number(it.workDuration) || 0;
      acc.price += price;
      acc.cost += cost;
      acc.profit += (price - cost);
      acc.workDays += workDays;
      return acc;
    },
    { price: 0, cost: 0, profit: 0, workDays: 0 }
  );
  
  const exactWorkDays = summary.workDays;
  const roundedWorkDays = Math.ceil(summary.workDays);
  const roundingDifference = roundedWorkDays - exactWorkDays;
  
  // בדיקה אם כבר בוצע עיגול (יש פריטים עם תוספת עיגול)
  const hasRoundingApplied = demolitionItems.some(it => (Number(it.demolitionRoundingShareWorkDays) || 0) > 0);
  
  // אם כבר בוצע עיגול, לא צריך להציע עיגול נוסף
  const needsRounding = !hasRoundingApplied && roundingDifference > 0.01 && exactWorkDays > 0;
  
  const itemsCount = demolitionItems.length;

  // פונקציה לעיגול ימי עבודה - מחלקת את ההפרש באופן יחסי
  const handleRoundWorkDays = () => {
    if (!needsRounding || demolitionItems.length === 0) return;

    const difference = roundingDifference;
    const roundingDays = difference;
    const roundingHours = roundingDays * 8;
    const laborCostPerDay = Number(defaults.laborCostPerDay || 1000);
    const profitPercent = Number(defaults.profitPercent || 30);
    const roundingCost = roundingDays * laborCostPerDay;
    const roundingPrice = Math.round(roundingCost * (1 + profitPercent / 100));

    const roundingItem = {
      id: `demo_rounding_${Date.now()}`,
      categoryId,
      categoryName: "הריסה ופינוי",
      source: "demolition_rounding",
      description: "עיגול ימי עבודה",
      quantity: 1,
      unit: "שירות",
      unitPrice: roundingPrice,
      totalPrice: roundingPrice,
      totalCost: roundingCost,
      profit: roundingPrice - roundingCost,
      profitPercent,
      workDuration: roundingDays,
      hoursPerUnit: roundingHours,
    };

    onAddItemToQuote && onAddItemToQuote(roundingItem);
  };

  // פונקציה לביטול עיגול ימי עבודה
  const handleCancelRounding = () => {
    // שליחת פריט עיגול "ריק" (0 ימים) שיגרום לניקוי החלוקות הקיימות
    const cancelRoundingItem = {
      id: `demo_rounding_cancel_${Date.now()}`,
      categoryId,
      categoryName: "הריסה ופינוי",
      source: "demolition_rounding", // Use the same source to identify it
      description: "ביטול עיגול ימי עבודה",
      quantity: 1,
      unit: "שירות",
      unitPrice: 0,
      totalPrice: 0,
      totalCost: 0,
      profit: 0,
      profitPercent: 0,
      workDuration: 0,
      hoursPerUnit: 0,
      // Add a flag to indicate this is a cancellation
      isRoundingCancellation: true, 
    };

    onAddItemToQuote && onAddItemToQuote(cancelRoundingItem);
  };

  const theme = getCategoryTheme(categoryId);

  const currentIndex = categoriesNav.findIndex(c => c.id === currentCategoryId);
  const isFirstCategory = currentIndex === 0;
  const isLastCategory = currentIndex === categoriesNav.length - 1;

  // NEW: Auto-round work days when items change
  const prevItemsCountRef = useRef(0);
  
  useEffect(() => {
    const currentCount = demolitionItems.length;
    const prevCount = prevItemsCountRef.current;
    
    // If items were added and rounding is needed and not applied yet
    if (currentCount > prevCount && needsRounding && !hasRoundingApplied) {
      // Auto-apply rounding after a short delay
      const timer = setTimeout(() => {
        handleRoundWorkDays();
      }, 300);
      
      prevItemsCountRef.current = currentCount;
      return () => clearTimeout(timer);
    }
    
    prevItemsCountRef.current = currentCount;
  }, [demolitionItems.length, needsRounding, hasRoundingApplied]);

  return (
    <> {/* Wrap in a Fragment to allow multiple top-level elements */}
      <Card className={`shadow-lg border ${theme.border} ${theme.bg}`} dir="rtl">
        <CardHeader className="bg-gray-50/60 border-b space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg">
              <Trash2 className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-800">הריסה ופינוי</CardTitle>
              <CardDescription className="text-gray-600">
                בחר תאריכים לקטגוריה, סנן לפי תת־קטגוריה, הוסף פריטים מנוהלים מהמחירון שלך.
              </CardDescription>
            </div>
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
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ArrowLeft className="w-4 h-4 text-gray-400" />
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

          {/* מסננים וחיפוש */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {subCategories.length > 0 && (
              <Select value={subcatFilter} onValueChange={setSubcatFilter} className="w-full sm:w-56">
                <SelectTrigger>
                  <SelectValue placeholder="בחר תת־קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התת־קטגוריות</SelectItem>
                  {subCategories.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              className="sm:w-auto w-full flex-shrink-0 bg-red-400 hover:bg-red-600 text-white border-red-500"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 ml-2" />
              פריט ידני
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-4">
          <Separator />
          {loading ? (
            <div className="py-16 text-center text-gray-500">טוען פריטי הריסה...</div>
          ) : normalizedItems.length === 0 ? (
            <div className="py-10 text-center text-gray-600">
              <div className="text-lg font-semibold mb-2">לא נמצאו פריטי הריסה</div>
              <div className="text-sm mb-4">תוכל להגדיר פריטים במחירון הקבלן ואז לחזור לכאן.</div>
              <Link to={createPageUrl('PricebookSettings')}>
                <Button variant="outline">פתח מחירון קבלן</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {normalizedItems.map((it) => {
                const profitPercent = (it.profitPercent === 0 || it.profitPercent) 
                  ? Number(it.profitPercent) 
                  : Number(defaults.profitPercent || 30);
                
                const unit = it.unit || "יחידה";
                const qty = getQty(it.id);
                const complexity = getComplexity(it.id);
                const complexityData = COMPLEXITY_LEVELS.find(c => c.id === complexity) || COMPLEXITY_LEVELS[0];

                // Calculate costs based on hours
                const hoursPerUnit = Number(it.hoursPerUnit || 0);
                const laborCostPerDay = Number(defaults.laborCostPerDay || 1000);
                const hoursPerDay = 8;
                
                const effectiveHours = hoursPerUnit * complexityData.multiplier;
                const unitCost = (effectiveHours / hoursPerDay) * laborCostPerDay;
                const totalCost = unitCost * qty;
                const totalPrice = Math.round(totalCost * (1 + profitPercent / 100));
                const totalProfit = Math.max(0, totalPrice - totalCost);
                
                // NEW: Calculate total work days
                const totalWorkDays = (effectiveHours * qty) / hoursPerDay;

                return (
                  <Card key={it.id} className="border border-rose-300 hover:shadow-md transition-all">
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
                        <div>
                          <span className="text-xs text-gray-600">מורכבות</span>
                          <Select value={complexity} onValueChange={(v) => setComplexity(it.id, v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPLEXITY_LEVELS.map(level => (
                                <SelectItem key={level.id} value={level.id}>
                                  {level.label} (x{level.multiplier})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-red-100/60 p-2 rounded-lg">
                          <div className="text-xs text-red-800">עלות קבלן</div>
                          <div className="font-bold text-red-900">{formatNis(totalCost)}</div>
                        </div>
                        <div className="text-center bg-green-100/60 p-2 rounded-lg">
                          <div className="text-xs text-green-800">רווח</div>
                          <div className="font-bold text-green-900">{formatNis(totalProfit)}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                          <div className="text-xs text-purple-700 font-medium">ימי עבודה</div>
                          <div className="text-lg font-bold text-purple-900">{totalWorkDays.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="text-center bg-blue-100/60 p-2 rounded-lg">
                        <div className="text-xs text-blue-800">מחיר ללקוח</div>
                        <div className="font-bold text-blue-900">{formatNis(totalPrice)}</div>
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
                          className="w-full bg-rose-50/30 hover:bg-rose-100 text-rose-800 border border-rose-200"
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

          {/* סיכום קטגוריה */}
          <div className="mt-6 relative rounded-2xl border-2 border-rose-200/70 bg-white/95 p-5 shadow-sm border-r-4 border-r-rose-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                  <Calculator className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-800">סיכום קטגוריית הריסה</span>
              </div>
              <span className="hidden md:inline text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                סיכום
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                <div className="text-[11px] text-red-800">עלות קבלן (סה״כ)</div>
                <div className="text-xl font-bold text-red-700">{formatNis(summary.cost)}</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                <div className="text-[11px] text-blue-800">מחיר ללקוח (סה״כ)</div>
                <div className="text-xl font-bold text-blue-700">{formatNis(summary.price)}</div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                <div className="text-[11px] text-green-800">רווח (סה״כ)</div>
                <div className="text-xl font-bold text-green-700">{formatNis(summary.profit)}</div>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                <div className="text-[11px] text-purple-800">ימי עבודה</div>
                <div className="text-xl font-bold text-purple-700">{exactWorkDays.toFixed(1)}</div>
                {!hasRoundingApplied && roundingDifference > 0.01 && exactWorkDays > 0 && (
                  <div className="text-[9px] text-purple-600 mt-0.5">
                    מעוגל: {roundedWorkDays} ימים
                  </div>
                )}
                {hasRoundingApplied && (
                  <div className="text-[9px] text-green-600 mt-0.5">
                    ✓ עיגול מופעל
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-[11px] text-gray-700">סה״כ פריטים</div>
                <div className="text-xl font-bold text-gray-800">{itemsCount}</div>
              </div>
            </div>

            {/* כפתורי עיגול/ביטול */}
            {demolitionItems.length > 0 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                {needsRounding ? (
                  <>
                    <Button
                      onClick={handleRoundWorkDays}
                      size="sm"
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs px-4 py-2"
                    >
                      <Calculator className="w-3 h-3 ml-1.5" />
                      עיגול ימי עבודה (+{roundingDifference.toFixed(2)} ימים)
                    </Button>
                    <span className="text-xs text-gray-500">חלוקה יחסית לפי מחיר</span>
                  </>
                ) : hasRoundingApplied ? (
                  <>
                    <Button
                      onClick={handleCancelRounding}
                      size="sm"
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 text-xs px-4 py-2"
                    >
                      <X className="w-3 h-3 ml-1.5" />
                      בטל עיגול
                    </Button>
                    <span className="text-xs text-green-600">✓ עיגול מופעל</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>

        {/* Footer with Navigation Buttons */}
        {categoriesNav && categoriesNav.length > 0 && (
          <div className="border-t p-4 bg-gray-50/50">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => {
                  if (currentIndex > 0) {
                    onSelectCategory(categoriesNav[currentIndex - 1].id);
                  }
                }}
                disabled={isFirstCategory}
                className="text-base px-6 py-2.5"
              >
                <ArrowRight className="ml-2 h-4 w-4" />
                הקודם
              </Button>
              <Button
                onClick={() => {
                  if (currentIndex < categoriesNav.length - 1) {
                    onSelectCategory(categoriesNav[currentIndex + 1].id);
                  } else {
                    // זו הקטגוריה האחרונה - מעבר לעלויות נוספות
                    if (onProceed) onProceed();
                  }
                }}
                className="text-base px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700"
              >
                {(() => {
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
        )}
      </Card>

      {/* כפתור צף להוספת פריט */}
      <CategoryFloatingAddButton
        onClick={() => setShowAddDialog(true)}
        categoryColor="red"
        icon={Plus}
        label="הוסף פריט הריסה"
      />

      {/* דיאלוגים */}
      {showAddDialog && (
        <DemolitionItemDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          laborCostPerDay={defaults.laborCostPerDay}
          defaultsProfitPercent={defaults.profitPercent}
          subCategoryPreset="general"
          onSaved={(item) => {
            const patched = { ...item, id: `manual_${Date.now()}`, source: "demolition_manual" };
            addItem(patched);
            setShowAddDialog(false);
          }}
          defaults={{ profitPercent: defaults.profitPercent }}
        />
      )}

      {showEditDialog && editingItem && (
        <DemolitionItemDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEdit(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          laborCostPerDay={defaults.laborCostPerDay}
          hideUnit
          initialQuantity={editingItem ? getQty(editingItem.id) : 1}
          onSaved={(updatedItem) => {
            const q = Number(updatedItem.quantity) || 1;
            setQty(updatedItem.id, q);
            const patched = { ...editingItem, ...updatedItem };
            addItem(patched);
            setShowEdit(false);
            setEditingItem(null);
          }}
          defaults={{ profitPercent: defaults.profitPercent }}
        />
      )}
    </> // End Fragment
  );
}
