
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Hammer, Settings, Calculator, Plus, Trash2, PlusCircle, Clock, ArrowUpRight, ArrowRight, ArrowLeft, Search, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CategoryStepper from "./CategoryStepper";
import { User } from "@/lib/entities";
import { useUser } from "@/components/utils/UserContext";
import ConstructionAddItemDialog from "./ConstructionAddItemDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConstructionInlineEditor from "./ConstructionInlineEditor";
import ConstructionManualItemDialog from "./ConstructionManualItemDialog";
import { getCategoryTheme } from "./categoryTheme";
import CategoryFloatingAddButton from './CategoryFloatingAddButton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";


const formatPrice = (n) =>
  (Number(n) || 0).toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// תבניות עבודה אופציונליות לבינוי (Still used by ConstructionAddItemDialog)
const CONSTRUCTION_TEMPLATES = [
  {
    id: "concrete_pour_slab",
    label: "יציקת בטון – משטח/רצפה",
    defaults: { unit: "מ״ק", hoursPerUnit: 1.5, materialCostPerUnit: 0, description: "יציקה, יישור ורטט בסיסי" }
  },
  {
    id: "block_wall_20",
    label: "בנייה – קיר בלוקים 20",
    defaults: { unit: "מ״ר", hoursPerUnit: 0.8, materialCostPerUnit: 0, description: "כולל בנייה והכנה לטיח" }
  },
  {
    id: "gypsum_wall_20",
    label: "בנייה – קיר בלוקים 20 ס״מ",
    defaults: { unit: "מ״ר", hoursPerUnit: 0.8, materialCostPerUnit: 0, description: "כולל בנייה והכנה לטיח" }
  },
  {
    id: "gypsum_wall_drywall_wet",
    label: "בנייה – קיר גבס לחדר רטוב",
    defaults: { unit: "מ״ר", hoursPerUnit: 1.2, materialCostPerUnit: 0, description: "קונסטרוקציה, לוחות ירוקים, מוכנות לאיטום" }
  },
  {
    id: "gypsum_wall_drywall_double_insulation",
    label: "בנייה – קיר גבס בידוד כפול",
    defaults: { unit: "מ״ר", hoursPerUnit: 1.4, materialCostPerUnit: 0, description: "דו-צדדי + שכבת בידוד משופרת" }
  },
  {
    id: "gypsum_wall_drywall_standard",
    label: "בנייה – קיר גבס סטנדרטי דו-צדדי",
    defaults: { unit: "מ״ר", hoursPerUnit: 1.0, materialCostPerUnit: 0, description: "קונסטרוקציה, לוחות גמר דו-צדדי" }
  }
];

// NEW: רמות מורכבות שישפיעו על זמן העבודה בלבד
const COMPLEXITY_LEVELS = [
  { id: 'normal', label: 'רגיל', multiplier: 1.0 },
  { id: 'medium', label: 'בינוני', multiplier: 1.25 },
  { id: 'complex', label: 'מורכב', multiplier: 1.5 },
];

export default function ConstructionCategory({
  onAddItemToQuote,
  categoriesNav = [],
  currentCategoryId = "cat_construction",
  onSelectCategory,
  categoryTimings = {},
  onCategoryTimingChange,
  selectedItems = [],
  setSelectedItems,
  onProceed,
}) {
  const { user: currentUser } = useUser();
  const [pricingDefaults, setPricingDefaults] = React.useState({
    laborCostPerDay: 1000,
    desiredProfitPercent: 30
  });
  const [catalogItems, setCatalogItems] = React.useState([]);
  const [qtyMap, setQtyMap] = React.useState({});
  const [complexityMap, setComplexityMap] = React.useState({}); // NEW: מעקב אחר מורכבות לכל פריט

  // NEW: Search state
  const [search, setSearch] = React.useState("");

  // EDITOR STATE
  const [showInlineEditor, setShowInlineEditor] = React.useState(false);
  const [editorPreset, setEditorPreset] = React.useState(null);

  // NEW: labels and order for construction sub-categories (מחירון קבלן)
  const SUBCAT_LABELS = {
    masonry: "בנייה",
    concrete: "בטון",
    gypsum: "גבס",
    plaster: "טיח",
    waterproofing: "איטום",
    finishing: "גמר",
    walls: "קירות",
    ceilings: "תקרות",
    floor_leveling: "יישור רצפה",
    chasing_electric: "חציבות לחשמל",
    chasing_plumbing: "חציבות לאינסטלציה",
    systems_devices: "מערכות ומכשירים",
    misc: "שונות"
  };
  
  const ORDERED_SUBCATS = React.useMemo(
    () => ["masonry","concrete","gypsum","plaster","waterproofing","finishing","walls","ceilings","floor_leveling","chasing_electric","chasing_plumbing","systems_devices","misc"],
    [],
  );

  // NEW: subcategory filter state
  const [subcatFilter, setSubcatFilter] = React.useState("all");

  // CHANGED: State for showing/hiding dates section - default to FALSE (closed)
  const [showDates, setShowDates] = React.useState(false);
  
  // NEW: State to track which items are expanded (show cost breakdown)
  const [expandedItems, setExpandedItems] = React.useState({});

  // NEW: State to control if work days are displayed as rounded or exact
  // Default is TRUE = show rounded days
  const [showRoundedDays, setShowRoundedDays] = React.useState(true);

  // NEW: Toggle function for expanding/collapsing item details
  const toggleItemExpanded = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  React.useEffect(() => {
    if (!currentUser?.user_metadata) {
      console.warn('[ConstructionCategory] No user_metadata available');
      return;
    }

    try {
      const me = currentUser.user_metadata;
      const d = me?.constructionDefaults || {};

      console.log('[ConstructionCategory] Loading construction data:', {
        userId: currentUser.id,
        email: currentUser.email,
        hasMetadata: !!me,
        hasDefaults: !!d,
        hasItems: !!me?.constructionSubcontractorItems,
        rawItemsCount: me?.constructionSubcontractorItems?.length || 0,
      });

      let day = 1000;
      const dayCandidate = Number(d.laborCostPerDay);
      const workerCost = Number(d.workerCostPerUnit);
      if (!isNaN(dayCandidate) && dayCandidate > 0) {
        day = dayCandidate;
      } else if (!isNaN(workerCost) && workerCost > 0) {
        day = workerCost <= 500 ? workerCost * 8 : workerCost;
      }

      console.log('[ConstructionCategory] Pricing defaults:', {
        laborCostPerDay: d.laborCostPerDay,
        workerCostPerUnit: d.workerCostPerUnit,
        calculated: day,
        desiredProfitPercent: d.desiredProfitPercent
      });

      setPricingDefaults({
        laborCostPerDay: day > 0 ? day : 1000,
        desiredProfitPercent: Number(d.desiredProfitPercent) || 30
      });

      const rawItems = me?.constructionSubcontractorItems;
      const items = Array.isArray(rawItems)
        ? rawItems.filter(it => it.isActive !== false)
        : [];

      console.log('[ConstructionCategory] Catalog items loaded:', {
        totalItems: rawItems?.length || 0,
        activeItems: items.length,
        filteredOut: (rawItems?.length || 0) - items.length,
        sampleItem: items[0] ? {
          id: items[0].id,
          name: items[0].name,
          subCategory: items[0].subCategory,
          isActive: items[0].isActive,
          contractorCostPerUnit: items[0].contractorCostPerUnit,
          clientPricePerUnit: items[0].clientPricePerUnit
        } : null
      });

      setCatalogItems(items);
    } catch (e) {
      console.error("[ConstructionCategory] Failed to load construction defaults or catalog items:", e);
    }
  }, [currentUser]);

  // NEW: compute available subcats from catalog
  const presentSubcats = React.useMemo(() => {
    const all = (catalogItems || []).map((it) => it.subCategory || "misc");
    return Array.from(new Set(all));
  }, [catalogItems]);
  
  const presentSubcatsOrdered = React.useMemo(
    () => ORDERED_SUBCATS.filter((k) => presentSubcats.includes(k)),
    [presentSubcats, ORDERED_SUBCATS]
  );

  const categoryId = "cat_construction";
  const theme = getCategoryTheme(categoryId);

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

  const calcWorkingDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const w = d.getDay();
      if (w >= 0 && w <= 4) count++;
    }
    return count;
  };
  const workingDays = calcWorkingDays(timing.startDate, timing.endDate);

  const laborHourRate = (Number(pricingDefaults.laborCostPerDay) || 0) / 8;

  // NEW: Filter items by search
  const filteredCatalogItems = React.useMemo(() => {
    let items = catalogItems || [];
    
    // Filter by subcategory
    if (subcatFilter !== "all") {
      items = items.filter(it => (it.subCategory || "misc") === subcatFilter);
    }
    
    // Filter by search text
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      items = items.filter(it => 
        (it.name || "").toLowerCase().includes(s) ||
        (it.description || "").toLowerCase().includes(s)
      );
    }
    
    return items;
  }, [catalogItems, subcatFilter, search]);

  // NEW: add item from catalog directly
  const addCatalogItem = (it) => {
    const qty = Number(qtyMap[it.id] ?? 1) || 1;
    const complexity = getComplexity(it.id);
    const complexityData = COMPLEXITY_LEVELS.find(c => c.id === complexity) || COMPLEXITY_LEVELS[0];

    // Use saved prices from contractor pricebook
    const unitCost = Number(it.contractorCostPerUnit) || 0;
    const unitPrice = Number(it.clientPricePerUnit) || 0;

    // Calculate material and labor costs for display
    const materialCostPerUnit = Number(it.materialCostPerUnit) || 0;
    const laborHoursPerUnit = Number(it.laborHoursPerUnit) || 0;
    const laborCostPerDay = Number(pricingDefaults.laborCostPerDay) || 1000;
    const laborHourRate = laborCostPerDay / 8;
    const laborCostPerUnit = laborHoursPerUnit * laborHourRate;

    const totalMaterialCost = materialCostPerUnit * qty;
    const totalLaborCost = laborCostPerUnit * qty;
    const totalCost = unitCost * qty;
    const totalPrice = unitPrice * qty;

    // Complexity only affects work duration, not price
    const effectiveLaborHours = laborHoursPerUnit * complexityData.multiplier;
    const workDays = (effectiveLaborHours * qty) / 8;

    const itemToAdd = {
      id: `construction_${it.id}_${Date.now()}`,
      categoryId: "cat_construction",
      categoryName: "בינוי (כללי)",
      source: "construction_catalog",
      description: it.name + (it.description ? ` — ${it.description}` : ""),
      quantity: qty,
      unit: it.unit || "יחידה",
      unitPrice: unitPrice,
      totalPrice: Math.round(totalPrice),
      totalCost: Math.round(totalCost),
      materialCost: Math.round(totalMaterialCost),
      laborCost: Math.round(totalLaborCost),
      profit: Math.round(totalPrice - totalCost),
      workDuration: workDays,
      meta: {
        subcontractorItemId: it.id,
        laborHoursPerUnit: effectiveLaborHours,
        originalLaborHoursPerUnit: laborHoursPerUnit,
        materialCostPerUnit: materialCostPerUnit,
        workerHourCost: laborHourRate,
        laborDayCost: laborCostPerDay,
        desiredProfitPercent: Number(it.desiredProfitPercent ?? pricingDefaults.desiredProfitPercent) || 0,
        complexityLevel: complexity,
        complexityMultiplier: complexityData.multiplier,
        type: "catalog"
      }
    };
    if (typeof onAddItemToQuote === "function") onAddItemToQuote(itemToAdd);
    else if (typeof window !== "undefined" && typeof window.__b44AddItemToQuote === "function") window.__b44AddItemToQuote(itemToAdd);
  };

  const getQty = (id) => Number(qtyMap[id] ?? 1) || 1;
  const setQty = (id, v) => setQtyMap((m) => ({ ...m, [id]: Math.max(1, Number(v) || 1) }));
  
  const getComplexity = (id) => complexityMap[id] || 'normal';
  const setComplexity = (id, v) => setComplexityMap((m) => ({ ...m, [id]: v }));

  // הוספה ידנית בסגנון 'פריט ידני'
  const handleManualAdd = (vals) => {
    const {
      name,
      description,
      unit,
      quantity,
      contractorCostPerUnit,
      desiredProfitPercent,
      clientPricePerUnit,
      subCategory,
      ignoreQuantity,
      materialCost,
      laborCost,
      workDuration,
      materialCostPerUnit,
      workTimeValue,
      workTimeUnit
    } = vals;

    const qty = Math.max(1, Number(quantity) || 1);
    const unitCost = Number(contractorCostPerUnit) || 0;
    const unitPrice = Number(clientPricePerUnit) || 0;

    const totalCost = ignoreQuantity ? unitCost : unitCost * qty;
    const totalPrice = ignoreQuantity ? unitPrice : unitPrice * qty;

    const item = {
      id: `construction_manual_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      source: "construction_manual",
      categoryId: "cat_construction",
      categoryName: "בינוי (כללי)",
      description: description?.trim() ? `${name} — ${description}` : name,
      quantity: qty,
      unit: unit || "יחידה",
      unitPrice: unitPrice,
      totalPrice: Math.round(totalPrice),
      totalCost: Math.round(totalCost),
      profit: Math.round(totalPrice - totalCost),
      materialCost: Math.round(materialCost || 0),
      laborCost: Math.round(laborCost || 0),
      workDuration: workDuration || 0,
      meta: {
        desiredProfitPercent: Number(desiredProfitPercent) || 0,
        subCategory: subCategory || "misc",
        ignoreQuantity: !!ignoreQuantity,
        materialCostPerUnit: materialCostPerUnit || 0,
        workTimeValue: workTimeValue || 0,
        workTimeUnit: workTimeUnit || 'days'
      }
    };

    if (typeof onAddItemToQuote === "function") onAddItemToQuote(item);
    else if (typeof window !== "undefined" && typeof window.__b44AddItemToQuote === "function")
      window.__b44AddItemToQuote(item);

    setShowInlineEditor(false);
    setEditorPreset(null);
  };


  const constructionItems = selectedItems.filter((it) => it.categoryId === "cat_construction");
  const summary = constructionItems.reduce(
    (acc, it) => {
      acc.material += Number(it.materialCost) || 0;
      acc.labor += Number(it.laborCost) || 0;
      acc.cost += Number(it.totalCost) || 0;
      acc.price += Number(it.totalPrice) || 0;
      acc.profit += Number(it.profit) || 0;
      acc.days += Number(it.workDuration) || 0;
      return acc;
    },
    { material: 0, labor: 0, cost: 0, price: 0, profit: 0, days: 0 }
  );

  const currentDays = Number(summary.days) || 0;
  const roundedDays = Math.ceil(currentDays);

  const dateBtnBase = "justify-start h-10 w-full";
  const startBtnClasses = startDate
    ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-50"
    : "border-red-300 bg-red-50 text-red-700 hover:bg-red-50";
  const endBtnClasses = endDate
    ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-50"
    : "border-red-300 bg-red-50 text-red-700 hover:bg-red-50";

  const formatNumber = (n) =>
    (Number(n) || 0).toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatHours = (h) => {
    const x = Number(h) || 0;
    return x.toFixed(1);
  };

  const editInitialItem = React.useMemo(() => {
    if (!editorPreset) return null;

    const laborHourRateLocal = (Number(pricingDefaults.laborCostPerDay) || 0) / 8;

    // Get current quantity and complexity from the UI state
    const currentQty = getQty(editorPreset.id);
    const currentComplexity = getComplexity(editorPreset.id);
    const complexityData = COMPLEXITY_LEVELS.find(c => c.id === currentComplexity) || COMPLEXITY_LEVELS[0];

    // Calculate costs with complexity multiplier applied
    const materialCostPerUnit = Number(editorPreset.materialCostPerUnit) || 0;
    const laborHoursPerUnit = Number(editorPreset.laborHoursPerUnit) || 0;
    const effectiveLaborHours = laborHoursPerUnit * complexityData.multiplier;
    const laborCostPerUnit = effectiveLaborHours * laborHourRateLocal;

    const calculatedContractorCostPerUnit = materialCostPerUnit + laborCostPerUnit;

    const profitPercent = Number(editorPreset.desiredProfitPercent ?? pricingDefaults.desiredProfitPercent) || 0;

    const calculatedClientPricePerUnit = Number(
      editorPreset.clientPricePerUnit ?? Math.round(calculatedContractorCostPerUnit * (1 + profitPercent / 100))
    ) || 0;

    return {
      name: editorPreset.name || "",
      description: editorPreset.description || "",
      subCategory: editorPreset.subCategory || "misc",
      unit: editorPreset.unit || "יחידה",
      quantity: currentQty, // Use the quantity from UI state
      contractorCostPerUnit: calculatedContractorCostPerUnit,
      desiredProfitPercent: profitPercent,
      clientPricePerUnit: calculatedClientPricePerUnit,
      ignoreQuantity: false,
      materialCost: Math.round(materialCostPerUnit * currentQty),
      laborCost: Math.round(laborCostPerUnit * currentQty),
      workDuration: (effectiveLaborHours * currentQty) / 8,
      materialCostPerUnit: materialCostPerUnit,
      workTimeValue: (effectiveLaborHours * currentQty) / 8,
      workTimeUnit: 'days'
    };
  }, [editorPreset, pricingDefaults, qtyMap, complexityMap]);

  return (
    <>
      <Card className={`shadow-lg border ${theme.border} ${theme.bg}`} dir="rtl">
          <CardHeader className="bg-gray-50/60 border-b space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500 text-white">
                  <Hammer className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-800">בינוי</CardTitle>
                  <CardDescription className="text-gray-600">
                    הוסף פריטים וקבע לוח זמנים לקטגוריה.
                  </CardDescription>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white">
              <button
                onClick={() => setShowDates(!showDates)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  זמן עבודה לקטגוריה
                </span>
                {showDates ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

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
                          <Button variant="outline" className={cn(dateBtnBase, startBtnClasses)}>
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
                          <Button variant="outline" className={cn(dateBtnBase, endBtnClasses)}>
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

            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex justify-start">
                <Select value={subcatFilter} onValueChange={setSubcatFilter}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="כל התת־קטגוריות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל התת־קטגוריות</SelectItem>
                    {presentSubcatsOrdered.map((key) => (
                      <SelectItem key={key} value={key}>
                        {SUBCAT_LABELS[key] || key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש פריט לפי שם/תיאור..."
                  className="pl-9"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => { setEditorPreset(null); setShowInlineEditor(true); }}
                >
                  <PlusCircle className="ml-1 h-3.5 w-3.5" />
                  הוסף פריט חדש
                </Button>
              </div>
            </div>

            {showInlineEditor && (
              <ConstructionManualItemDialog
                open={showInlineEditor}
                onOpenChange={(isOpen) => {
                  setShowInlineEditor(isOpen);
                  if (!isOpen) setEditorPreset(null);
                }}
                onAdd={handleManualAdd}
                defaults={{ 
                  desiredProfitPercent: pricingDefaults.desiredProfitPercent || 30,
                  laborCostPerDay: pricingDefaults.laborCostPerDay || 1000
                }}
                subCategories={ORDERED_SUBCATS.map(key => ({
                  value: key,
                  label: SUBCAT_LABELS[key] || key
                }))}
                defaultSubcat={editorPreset?.subCategory || "misc"}
                initialItem={editInitialItem}
                title={editorPreset ? "עריכת פריט בינוי" : "פריט בינוי ידני"}
                submitLabel={editorPreset ? "עדכן" : "הוסף"}
              />
            )}
          </CardHeader>

          <CardContent className="p-4 md:p-6 space-y-4">
            <Separator />
            {catalogItems.length === 0 ? (
              <div className="py-10 px-6 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="p-4 rounded-full bg-purple-100 w-16 h-16 mx-auto flex items-center justify-center">
                    <Settings className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">אין פריטי בינוי במחירון</h3>
                  <p className="text-sm text-gray-600">
                    כדי להוסיף פריטים להצעת המחיר, עליך תחילה להגדיר את מחירון הבינוי שלך
                  </p>
                  <Button
                    onClick={() => window.location.href = '/ContractorPricing'}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Settings className="ml-2 w-4 h-4" />
                    עבור להגדרות מחירון בינוי
                  </Button>
                  <p className="text-xs text-gray-500">
                    מספר פריטים כולל: {catalogItems.length} | פריטים פעילים: {catalogItems.filter(it => it.isActive !== false).length}
                  </p>
                </div>
              </div>
            ) : filteredCatalogItems.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                {search.trim() ? "לא נמצאו פריטים התואמים את החיפוש" : "אין פריטים להצגה בפילטר הנבחר"}
              </div>
            ) : subcatFilter === "all" ? (
              <>
                {presentSubcatsOrdered.map((scKey) => {
                  const group = filteredCatalogItems.filter((it) => (it.subCategory || "misc") === scKey);
                  if (group.length === 0) return null;
                  return (
                    <div key={scKey} className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700">
                          {SUBCAT_LABELS[scKey] || scKey}
                        </h3>
                        <span className="text-xs text-gray-500">{group.length} פריטים</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {group.map((it) => {
                          const qty = getQty(it.id);
                          const complexity = getComplexity(it.id);
                          const complexityData = COMPLEXITY_LEVELS.find(c => c.id === complexity) || COMPLEXITY_LEVELS[0];
                          const unit = it.unit || "יחידה";

                          // Use saved prices from contractor pricebook
                          const unitCost = Number(it.contractorCostPerUnit) || 0;
                          const unitPrice = Number(it.clientPricePerUnit) || 0;

                          // Calculate material and labor costs for display only
                          const materialCostPerUnit = Number(it.materialCostPerUnit) || 0;
                          const laborHoursPerUnit = Number(it.laborHoursPerUnit) || 0;
                          const laborCostPerDay = Number(pricingDefaults.laborCostPerDay) || 1000;
                          const laborHourRate = laborCostPerDay / 8;
                          const laborCostPerUnit = laborHoursPerUnit * laborHourRate;

                          const totalMaterialCost = materialCostPerUnit * qty;
                          const totalLaborCost = laborCostPerUnit * qty;
                          const totalCost = unitCost * qty;
                          const totalPrice = unitPrice * qty;
                          const totalProfit = totalPrice - totalCost;

                          // Complexity only affects work duration, not price
                          const effectiveLaborHours = laborHoursPerUnit * complexityData.multiplier;
                          const workDays = (effectiveLaborHours * qty) / 8;

                          return (
                            <Card 
                              key={it.id} 
                              className={cn(
                                "border-2 hover:shadow-md transition-all border-purple-200"
                              )}
                            >
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <CardTitle className="text-base font-semibold text-gray-800">{it.name}</CardTitle>
                                    {it.description && (
                                      <p className="text-xs text-gray-600 mt-0.5">{it.description}</p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-gray-700">{unit}</Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-xs text-gray-600">כמות</span>
                                    <Input type="number" min={1} value={qty} onChange={(e) => setQty(it.id, Number(e.target.value))} className="h-9" />
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

                                {/* NEW: Collapsible cost breakdown section */}
                                <Collapsible open={expandedItems[it.id]} onOpenChange={() => toggleItemExpanded(it.id)}>
                                  <CollapsibleTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="w-full justify-between h-8 px-2 text-xs hover:bg-purple-50"
                                    >
                                      <span className="text-gray-600">פירוט עלויות</span>
                                      {expandedItems[it.id] ? (
                                        <ChevronUp className="h-3 w-3 text-gray-500" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3 text-gray-500" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      <div className="text-center bg-orange-100/60 p-2 rounded-lg">
                                        <div className="text-xs text-orange-800">עלות חומרים</div>
                                        <div className="font-bold text-orange-900 text-sm">{formatNumber(totalMaterialCost)} ₪</div>
                                      </div>
                                      <div className="text-center bg-amber-100/60 p-2 rounded-lg">
                                        <div className="text-xs text-amber-800">עלות עבודה</div>
                                        <div className="font-bold text-amber-900 text-sm">{formatNumber(totalLaborCost)} ₪</div>
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>

                                <div className="grid grid-cols-3 gap-2">
                                  <div className="text-center bg-red-100/60 p-2 rounded-lg">
                                    <div className="text-xs text-red-800">עלות קבלן</div>
                                    <div className="font-bold text-red-900 text-sm">{formatNumber(totalCost)} ₪</div>
                                  </div>
                                  <div className="text-center bg-green-100/60 p-2 rounded-lg">
                                    <div className="text-xs text-green-800">רווח</div>
                                    <div className="font-bold text-green-900 text-sm">{formatNumber(totalProfit)} ₪</div>
                                  </div>
                                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                                    <div className="text-xs text-purple-700 font-medium">ימי עבודה</div>
                                    <div className="text-sm font-bold text-purple-900">{workDays.toFixed(2)}</div>
                                  </div>
                                </div>

                                <div className="text-center bg-blue-100/60 p-2 rounded-lg">
                                  <div className="text-xs text-blue-800">מחיר ללקוח</div>
                                  <div className="font-bold text-blue-900">{formatNumber(totalPrice)} ₪</div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    onClick={() => addCatalogItem(it)}
                                    className="w-full bg-gray-50/60 hover:bg-gray-200 text-gray-800 border border-gray-200"
                                  >
                                    <PlusCircle className="ml-1 h-3.5 w-3.5" /> הוסף להצעה
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="flex-shrink-0"
                                    onClick={() => { setEditorPreset(it); setShowInlineEditor(true); }}
                                  >
                                    <Hammer className="ml-1 h-3.5 w-3.5" /> ערוך
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCatalogItems
                  .filter((it) => (it.subCategory || "misc") === subcatFilter)
                  .map((it) => {
                    const qty = getQty(it.id);
                    const complexity = getComplexity(it.id);
                    const complexityData = COMPLEXITY_LEVELS.find(c => c.id === complexity) || COMPLEXITY_LEVELS[0];
                    const unit = it.unit || "יחידה";

                    // Use saved prices from contractor pricebook
                    const unitCost = Number(it.contractorCostPerUnit) || 0;
                    const unitPrice = Number(it.clientPricePerUnit) || 0;

                    // Calculate material and labor costs for display only
                    const materialCostPerUnit = Number(it.materialCostPerUnit) || 0;
                    const laborHoursPerUnit = Number(it.laborHoursPerUnit) || 0;
                    const laborCostPerDay = Number(pricingDefaults.laborCostPerDay) || 1000;
                    const laborHourRate = laborCostPerDay / 8;
                    const laborCostPerUnit = laborHoursPerUnit * laborHourRate;

                    const totalMaterialCost = materialCostPerUnit * qty;
                    const totalLaborCost = laborCostPerUnit * qty;
                    const totalCost = unitCost * qty;
                    const totalPrice = unitPrice * qty;
                    const totalProfit = totalPrice - totalCost;

                    // Complexity only affects work duration, not price
                    const effectiveLaborHours = laborHoursPerUnit * complexityData.multiplier;
                    const workDays = (effectiveLaborHours * qty) / 8;

                    return (
                      <Card 
                        key={it.id} 
                        className={cn(
                          "border-2 hover:shadow-md transition-all border-purple-200"
                        )}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-base font-semibold text-gray-800">{it.name}</CardTitle>
                              {it.description && (
                                <p className="text-xs text-gray-600 mt-0.5">{it.description}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-gray-700">{unit}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-xs text-gray-600">כמות</span>
                              <Input type="number" min={1} value={qty} onChange={(e) => setQty(it.id, Number(e.target.value))} className="h-9" />
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

                          {/* NEW: Collapsible cost breakdown section */}
                          <Collapsible open={expandedItems[it.id]} onOpenChange={() => toggleItemExpanded(it.id)}>
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full justify-between h-8 px-2 text-xs hover:bg-purple-50"
                              >
                                <span className="text-gray-600">פירוט עלויות</span>
                                {expandedItems[it.id] ? (
                                  <ChevronUp className="h-3 w-3 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 text-gray-500" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="text-center bg-orange-100/60 p-2 rounded-lg">
                                  <div className="text-xs text-orange-800">עלות חומרים</div>
                                  <div className="font-bold text-orange-900 text-sm">{formatNumber(totalMaterialCost)} ₪</div>
                                </div>
                                <div className="text-center bg-amber-100/60 p-2 rounded-lg">
                                  <div className="text-xs text-amber-800">עלות עבודה</div>
                                  <div className="font-bold text-amber-900 text-sm">{formatNumber(totalLaborCost)} ₪</div>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center bg-red-100/60 p-2 rounded-lg">
                              <div className="text-xs text-red-800">עלות קבלן</div>
                              <div className="font-bold text-red-900 text-sm">{formatNumber(totalCost)} ₪</div>
                            </div>
                            <div className="text-center bg-green-100/60 p-2 rounded-lg">
                              <div className="text-xs text-green-800">רווח</div>
                              <div className="font-bold text-green-900 text-sm">{formatNumber(totalProfit)} ₪</div>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                              <div className="text-xs text-purple-700 font-medium">ימי עבודה</div>
                              <div className="text-sm font-bold text-purple-900">{workDays.toFixed(2)}</div>
                            </div>
                          </div>

                          <div className="text-center bg-blue-100/60 p-2 rounded-lg">
                            <div className="text-xs text-blue-800">מחיר ללקוח</div>
                            <div className="font-bold text-blue-900">{formatNumber(totalPrice)} ₪</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => addCatalogItem(it)}
                              className="w-full bg-gray-50/60 hover:bg-gray-200 text-gray-800 border border-gray-200"
                            >
                              <PlusCircle className="ml-1 h-3.5 w-3.5" /> הוסף להצעה
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-shrink-0"
                              onClick={() => { setEditorPreset(it); setShowInlineEditor(true); }}
                            >
                              <Hammer className="ml-1 h-3.5 w-3.5" /> ערוך
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
            
            <div
              className="relative rounded-2xl border-2 border-indigo-200/70 bg-white/95 p-5 shadow-sm border-r-4 border-r-indigo-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">סיכום קטגוריית בינוי</span>
                </div>
                <span className="hidden md:inline text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  סיכום
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                  <div className="text-[11px] text-orange-800">עלות חומרים</div>
                  <div className="text-xl font-bold text-orange-700">{formatPrice(summary.material)} ₪</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
                  <div className="text-[11px] text-amber-800">עלות עבודה</div>
                  <div className="text-xl font-bold text-amber-700">{formatPrice(summary.labor)} ₪</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                  <div className="text-[11px] text-red-800">עלות קבלן (סה״כ)</div>
                  <div className="text-xl font-bold text-red-700">{formatPrice(summary.cost)} ₪</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-center">
                  <div className="text-[11px] text-indigo-800">מחיר ללקוח (סה״כ)</div>
                  <div className="text-xl font-bold text-indigo-700">{formatPrice(summary.price)} ₪</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                  <div className="text-[11px] text-green-800">רווח קבלן (סה״כ)</div>
                  <div className="text-xl font-bold text-green-900 text-lg">{formatPrice(summary.profit)} ₪</div>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                  <div className="text-[11px] text-purple-800">ימי עבודה (סה״כ)</div>
                  <div className="text-xl font-bold text-purple-700">
                    {showRoundedDays ? roundedDays.toFixed(1) : currentDays.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-start items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRoundedDays(!showRoundedDays)}
                  className="text-sm"
                >
                  <Clock className="w-4 h-4 ml-2" />
                  {showRoundedDays ? "הצג ימים מדויקים" : "הצג ימים מעוגלים"}
                </Button>
              </div>
            </div>
          </CardContent>

        <CardFooter className="flex justify-between border-t p-4 bg-gray-50/30">
          <div className="flex items-center gap-3">
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
            <Badge variant="outline" className="bg-white">
              {selectedItems.filter(it => it.categoryId === categoryId).length} פריטים בעגלה
            </Badge>
          </div>

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
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
        </CardFooter>
        </Card>

        <CategoryFloatingAddButton
          onClick={() => { 
            setEditorPreset(null);
            setShowInlineEditor(true);
          }}
          categoryColor="purple"
          icon={Plus}
          label="הוסף פריט בינוי"
        />
    </>
  );
}
