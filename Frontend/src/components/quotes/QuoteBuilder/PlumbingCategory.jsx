
import React, { useEffect, useMemo, useState } from "react";
import { User } from "@/api/entities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, Wrench, Plus, Pencil, ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import CategoryStepper from "./CategoryStepper";
import { cn } from "@/lib/utils";
import PlumbingItemDialog from "./PlumbingItemDialog";
import { getCategoryTheme } from "./categoryTheme";
import CategoryFloatingAddButton from './CategoryFloatingAddButton';

const SUBCATS = [
  { key: "infrastructure", label: "תשתיות וצנרת" },
  { key: "sanitary", label: "כלים סניטריים" },
  { key: "connections", label: "חיבורים ומכשירים" },
  { key: "repairs", label: "תיקונים ותחזוקה" },
  { key: "waterproofing", label: "איטום/עבודות מיוחדות" },
];

const formatNis = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;
// NEW: number-only formatter (no currency)
const formatNum = (n) => (Number(n) || 0).toLocaleString("he-IL");

export default function PlumbingCategory({
  selectedItems = [],
  onAddItemToQuote,
  categoryId = "cat_plumbing",
  categoryTimings = {},
  onCategoryTimingChange,
  categoriesNav = [],
  currentCategoryId,
  onSelectCategory,
  onProceed, // NEW: optional next-step handler
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [defaults, setDefaults] = useState({ desiredProfitPercent: 30 }); // CHANGED: default profit percent from 40 to 30
  const [user, setUser] = useState(null); // Added user state
  const [subcatFilter, setSubcatFilter] = useState("all");
  const [qtyMap, setQtyMap] = useState({}); // per item id
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  // CHANGED: State for showing/hiding dates section - default to FALSE (closed)
  const [showDates, setShowDates] = useState(false);

  // Load user's plumbing price list
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const u = await User.me();
      setUser(u); // Store the user object
      setItems((u.plumbingSubcontractorItems || []).filter((x) => x.isActive !== false));
      setDefaults(u.plumbingDefaults || { desiredProfitPercent: 30 }); // CHANGED: default profit percent from 40 to 30
      setLoading(false);
    };
    run();
  }, []);

  // אוטוקומפליט לשם פריט בדיאלוג אינסטלציה – הצעות בתוך הדיאלוג (לא חלון דפדפן)
  // + חישוב אוטומטי של 'מחיר ללקוח' כשמשנים 'עלות קבלן'
  useEffect(() => {
    const isOpen = showAddDialog || showEditDialog;
    if (!isOpen) return;

    let cleanupFns = [];

    const t = setTimeout(() => {
      // It's assumed that PlumbingItemDialog's root element (likely DialogContent) has id="plumbing-item-dialog"
      const dialogRoot = document.getElementById('plumbing-item-dialog');
      if (!dialogRoot) return;

      // ודא שמיקום אבסולוטי יתייחס לדיאלוג ולא לחלון
      if (getComputedStyle(dialogRoot).position === 'static') {
        dialogRoot.style.position = 'relative';
      }

      // === אוטוקומפליט על שם פריט ===
      const nameInput =
        dialogRoot.querySelector('input[name="name"]') ||
        dialogRoot.querySelector('input[type="text"]') ||
        dialogRoot.querySelector('input'); // Fallback to any input if specific name/type not found
      if (nameInput) {
        // ודא שאין datalist כדי שלא ייפתח חלון גלובלי מחוץ לדיאלוג
        try { nameInput.removeAttribute('list'); } catch (e) { /* ignore error if list attribute doesn't exist */ }

        // צור/מצא קונטיינר להצעות בתוך הדיאלוג
        const listId = 'b44-plumbing-ac';
        let listBox = dialogRoot.querySelector('#' + listId);
        if (!listBox) {
          listBox = document.createElement('div');
          listBox.id = listId;
          dialogRoot.appendChild(listBox);
        }
        Object.assign(listBox.style, {
          position: 'absolute',
          left: '0px',
          top: '0px',
          width: '200px',
          maxHeight: '240px',
          overflowY: 'auto',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          zIndex: '9999',
          padding: '6px 0',
          display: 'none',
          direction: 'rtl',
          boxSizing: 'border-box'
        });

        const names = Array.from(
          new Set((items || []).map(it => (it?.name || '').trim()).filter(Boolean))
        );

        let activeIndex = -1;

        const reposition = () => {
          const inputRect = nameInput.getBoundingClientRect();
          const dialogRect = dialogRoot.getBoundingClientRect();
          // Calculate position relative to dialogRoot
          const left = inputRect.left - dialogRect.left;
          const top = inputRect.bottom - dialogRect.top + 6;
          listBox.style.left = `${left}px`;
          listBox.style.top = `${top}px`;
          listBox.style.width = `${inputRect.width}px`;
        };
        const hideList = () => {
          listBox.style.display = 'none';
          listBox.innerHTML = '';
          activeIndex = -1;
        };
        const setActive = (idx) => {
          const children = Array.from(listBox.children);
          children.forEach((el, i) => {
            el.style.background = i === idx ? '#f3f4f6' : 'transparent';
          });
          activeIndex = idx;
        };
        const renderList = (query) => {
          if (!query || query.trim().length < 1) { hideList(); return; }
          const q = query.trim().toLowerCase();
          // מציע רק שמות שמתחילים במה שהוזן, או בתחילת מילה
          const options = names.filter(n => {
            const s = n.toLowerCase();
            return s.startsWith(q) || s.split(/\s+/).some(w => w.startsWith(q));
          }).slice(0, 8);
          if (options.length === 0) { hideList(); return; }
          listBox.innerHTML = '';
          options.forEach((opt, idx) => {
            const item = document.createElement('div');
            item.textContent = opt;
            Object.assign(item.style, {
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#111827'
            });
            item.onmouseenter = () => setActive(idx);
            item.onmousedown = (e) => { // Use mousedown to capture event before input blur
              e.preventDefault(); // Prevent input blur from hiding list immediately
              nameInput.value = opt;
              hideList();
              // Dispatch events to ensure React state/form libraries are updated
              nameInput.dispatchEvent(new Event('input', { bubbles: true }));
              nameInput.dispatchEvent(new Event('change', { bubbles: true }));
            };
            listBox.appendChild(item);
          });
          reposition();
          listBox.style.display = 'block';
          activeIndex = -1; // Reset active index when list content changes
        };
        const onInput = (e) => {
          const v = e.target.value || '';
          if (v.length < 1) { hideList(); return; }
          renderList(v);
        };
        const onKeyDown = (e) => {
          const children = Array.from(listBox.children);
          if (listBox.style.display === 'none' || children.length === 0) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex < children.length - 1 ? activeIndex + 1 : 0); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex > 0 ? activeIndex - 1 : children.length - 1); }
          else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < children.length) {
              e.preventDefault();
              const val = children[activeIndex].textContent || '';
              nameInput.value = val;
              hideList();
              nameInput.dispatchEvent(new Event('input', { bubbles: true }));
              nameInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else if (e.key === 'Escape') {
            hideList();
          }
        };
        // Use a timeout for blur to allow click on suggestions to register first
        const onBlur = () => setTimeout(hideList, 120);
        const onScrollOrResize = () => { if (listBox.style.display !== 'none') reposition(); };

        nameInput.addEventListener('input', onInput);
        nameInput.addEventListener('keydown', onKeyDown);
        nameInput.addEventListener('blur', onBlur);
        // Listen for scroll events on the window or any scrollable parent of the input (true for capture phase)
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);

        cleanupFns.push(() => {
          nameInput.removeEventListener('input', onInput);
          nameInput.removeEventListener('keydown', onKeyDown);
          nameInput.removeEventListener('blur', onBlur);
          window.removeEventListener('scroll', onScrollOrResize, true);
          window.removeEventListener('resize', onScrollOrResize);
          if (listBox && listBox.parentElement) listBox.parentElement.removeChild(listBox);
        });
      }

      // === חישוב אוטומטי: מחיר ללקוח = עלות קבלן * (1 + p%) ===
      const getText = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

      const findInputByLabel = (keywords) => {
        const inputs = Array.from(dialogRoot.querySelectorAll('input'));
        for (const inp of inputs) {
          // Look for common parent elements that might contain the label text
          const wrap = inp.closest('div, label, .grid, .space-y-1, .form-control');
          const txt = getText(wrap);
          if (!txt) continue;
          if (keywords.some(k => txt.includes(k))) return inp;
        }
        return null;
      };

      const contractorInput =
        findInputByLabel(['עלות קבלן', "עלות קבלן ל'יח", 'עלות קבלן ליח']);
      const clientInput =
        findInputByLabel(['מחיר ללקוח', "מחיר ללקוח ל'יח", 'מחיר ללקוח ליח']);

      const profitPercent =
        (defaults && typeof defaults.desiredProfitPercent === 'number'
          ? Number(defaults.desiredProfitPercent)
          : 30); // CHANGED: default profit percent from 40 to 30

      const recalcClientPrice = () => {
        if (!contractorInput || !clientInput) return;
        const cost = Number(contractorInput.value || 0);
        const price = Math.round(cost * (1 + profitPercent / 100));
        // עדכון שדה מחיר ללקוח והטרגת אירועים ל-React
        clientInput.value = isFinite(price) ? String(price) : '';
        clientInput.dispatchEvent(new Event('input', { bubbles: true }));
        clientInput.dispatchEvent(new Event('change', { bubbles: true }));
      };

      if (contractorInput && clientInput) {
        // חישוב ראשוני בעת פתיחת הדיאלוג (במידה והמשתמש משנה מחיר קבלן).
        recalcClientPrice();
        const onCostInput = () => recalcClientPrice();
        contractorInput.addEventListener('input', onCostInput);
        contractorInput.addEventListener('change', onCostInput); // Also listen to change event
        cleanupFns.push(() => {
          contractorInput.removeEventListener('input', onCostInput);
          contractorInput.removeEventListener('change', onCostInput);
        });
      }
    }, 0); // Timeout to ensure dialog is mounted

    cleanupFns.push(() => clearTimeout(t));
    return () => cleanupFns.forEach(fn => fn && fn());
  }, [showAddDialog, showEditDialog, items, defaults]); // Re-run effect when dialog opens/closes or items/defaults change

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

  const visibleItems = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    if (subcatFilter === "all") return list;
    return list.filter((x) => x.subCategory === subcatFilter);
  }, [items, subcatFilter]);

  const getQty = (id) => Number(qtyMap[id] ?? 1) || 1;
  const setQty = (id, v) => setQtyMap((m) => ({ ...m, [id]: v }));

  const addItem = (it) => {
    const q = getQty(it.id);
    const unit = it.unit || "יחידה";
    const unitCost = Number(it.contractorCostPerUnit || 0);
    const unitPrice = Number(it.clientPricePerUnit || 0);

    // Calculate totals - if ignoreQuantity flag exists, use it, otherwise multiply by quantity
    const totalCost = it.ignoreQuantity ? unitCost : unitCost * q;
    const totalPrice = it.ignoreQuantity ? unitPrice : unitPrice * q;

    const itemToAdd = {
      id: `pl_${it.id || 'custom'}_${Date.now()}`,
      categoryId,
      categoryName: "אינסטלציה",
      source: it.source || "plumbing_catalog",
      description: (it.name || "") + (it.description ? ` — ${it.description}` : ""),
      quantity: q, // This now correctly reflects the actual quantity
      unit,
      unitPrice: unitPrice,
      totalPrice,
      totalCost,
      profit: totalPrice - totalCost,
      workDuration: 0,
      ...(it.ignoreQuantity !== undefined && { ignoreQuantity: it.ignoreQuantity }),
    };
    onAddItemToQuote && onAddItemToQuote(itemToAdd);
  };

  // When a new plumbing item is saved from the dialog, add it to the quote/cart
  const handlePlumbingItemSaved = (payload) => {
    const qty = Math.max(1, Number(payload.quantity || 1));
    const unitPrice = Number(payload.clientPricePerUnit || 0);
    const contractorUnit = Number(payload.contractorCostPerUnit || 0);

    // UPDATED: סכומים ללא תלות בכמות כשהדיאלוג שולח ignoreQuantity=true
    const totalPrice = payload.ignoreQuantity ? unitPrice : Math.round(unitPrice * qty);
    const totalCost = payload.ignoreQuantity ? contractorUnit : Math.round(contractorUnit * qty);
    const profit = totalPrice - totalCost;

    const newItem = {
      id: payload.id || `pl_${Date.now()}`,
      categoryId, // "cat_plumbing"
      categoryName: "אינסטלציה",
      description: payload.name || payload.description || "פריט אינסטלציה",
      details: payload.description || "",
      subCategory: payload.subCategory,
      unit: payload.unit || "יחידה",
      quantity: qty,
      unitPrice: unitPrice,
      totalPrice,
      totalCost,
      profit,
      profitPercent: Number(payload.desiredProfitPercent || 0),
      source: "plumbing_subcontractor",
      ignoreQuantity: true, // Items from dialog always ignore quantity for their total price
    };

    if (onAddItemToQuote) onAddItemToQuote(newItem);
    setShowAddDialog(false);
  };

  // Totals for this category (items already added to the quote)
  const categoryItems = useMemo(() => {
    return Array.isArray(selectedItems)
      ? selectedItems.filter((it) => it?.categoryId === categoryId)
      : [];
  }, [selectedItems, categoryId]);

  const totals = useMemo(() => {
    const totalCost = categoryItems.reduce((s, it) => s + (Number(it.totalCost) || 0), 0);
    const totalPrice = categoryItems.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
    const profit = Math.max(0, totalPrice - totalCost);
    return { totalCost, totalPrice, profit, count: categoryItems.length };
  }, [categoryItems]);

  const theme = getCategoryTheme(categoryId); // NEW: Get category theme

  return (
    <>
      <Card className={`shadow-lg border ${theme.border} ${theme.bg}`} dir="rtl">
        <CardHeader className="bg-gray-50/60 border-b space-y-4">
          {/* Header title and description only */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Wrench className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-800">אינסטלציה</CardTitle>
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

          {/* מסנן תתי־קטגוריות + כפתור הוספה למעלה */}
          <div className="flex items-center justify-between">
            <div className="flex justify-start">
              <Select value={subcatFilter} onValueChange={setSubcatFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="כל התת־קטגוריות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התת־קטגוריות</SelectItem>
                  {SUBCATS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף פריט
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-4">
          <Separator />
          {loading ? (
            <div className="py-16 text-center text-gray-500">טוען פריטי אינסטלציה...</div>
          ) : visibleItems.length === 0 ? (
            <div className="py-10 text-center text-gray-500">אין פריטים להצגה. עדכן את מחירון האינסטלציה שלך.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleItems.map((it) => {
                const qty = getQty(it.id);
                const unit = it.unit || "יחידה";
                const unitCost = Number(it.contractorCostPerUnit || 0);
                const unitPrice = Number(it.clientPricePerUnit || 0);

                // totals by quantity, unless ignoreQuantity is true
                const totalCost = it.ignoreQuantity ? unitCost : unitCost * qty;
                const totalPrice = it.ignoreQuantity ? unitPrice : unitPrice * qty;
                const totalProfit = Math.max(0, totalPrice - totalCost);

                return (
                  <Card key={it.id} className="border border-teal-300 hover:shadow-md transition-all">
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
                        {/* Keep for grid alignment if needed, otherwise can be removed */}
                        <div></div>
                      </div>

                      {/* UPDATED: add 'רווח' tile and expand to 3 columns */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-red-100/60 p-2 rounded-lg">
                          <div className="text-xs text-red-800">עלות קבלן</div>
                          <div className="font-bold text-red-900">{formatNis(totalCost)}</div>
                        </div>

                        {/* NEW: profit tile - number only, no ₪ */}
                        <div className="text-center bg-green-100/60 p-2 rounded-lg">
                          <div className="text-xs text-green-800">רווח</div>
                          <div className="font-bold text-green-900">{formatNum(totalProfit)}</div>
                        </div>

                        <div className="text-center bg-blue-100/60 p-2 rounded-lg">
                          <div className="text-xs text-blue-800">מחיר ללקוח</div>
                          <div className="font-bold text-blue-900">{formatNis(totalPrice)}</div>
                        </div>
                      </div>

                      {/* UPDATED: actions row - add Edit button */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingItem(it);
                            setShowEditDialog(true);
                          }}
                          className="flex-shrink-0"
                        >
                          <Pencil className="w-4 h-4 ml-2" />
                          ערוך
                        </Button>
                        <Button
                          onClick={() => addItem(it)}
                          className="w-full bg-teal-50/30 hover:bg-teal-100 text-teal-800 border border-teal-200"
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
          {/* The "Add Item" button is in the CardHeader */}

          {/* Category Summary */}
          <div className="mt-6 relative rounded-2xl border-2 border-indigo-200/70 bg-white/95 p-5 shadow-sm border-r-4 border-r-indigo-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
              <div className="text-center bg-red-50 border border-red-100 rounded-lg p-3">
                <div className="text-xs text-red-700">עלות קבלן (סה״כ)</div>
                <div className="text-lg md:text-xl font-bold text-red-800">{formatNis(totals.totalCost)}</div>
              </div>
              <div className="text-center bg-green-50 border border-green-100 rounded-lg p-3">
                <div className="text-xs text-green-700">רווח (סה״כ)</div>
                <div className="text-lg md:text-xl font-bold text-green-800">{formatNis(totals.profit)}</div>
              </div>
              <div className="text-center bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="text-xs text-blue-700">מחיר ללקוח (סה״כ)</div>
                <div className="text-lg md:text-xl font-bold text-blue-800">{formatNis(totals.totalPrice)}</div>
              </div>
              <div className="text-center bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-700">כמות פריטים</div>
                <div className="text-lg md:text-xl font-bold text-gray-900">{formatNum(totals.count)}</div>
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
              disabled={categoriesNav.length === 0 || categoriesNav.findIndex(c => c.id === currentCategoryId) <= 0}
              className="text-base px-6 py-2.5"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              הקודם
            </Button>
            <Button
              onClick={() => {
                if (categoriesNav.length === 0) {
                  onProceed && onProceed();
                  return;
                }
                const currentIndex = categoriesNav.findIndex(c => c.id === currentCategoryId);
                if (currentIndex === -1 || currentIndex >= categoriesNav.length - 1) {
                  // Current category not found OR it's the last category
                  onProceed && onProceed();
                } else {
                  onSelectCategory(categoriesNav[currentIndex + 1].id);
                }
              }}
              className="text-base px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700"
            >
              {(() => {
                if (categoriesNav.length === 0) {
                  return 'הבא: עלויות נוספות';
                }
                const currentIndex = categoriesNav.findIndex(c => c.id === currentCategoryId);
                if (currentIndex === -1 || currentIndex >= categoriesNav.length - 1) {
                  return 'הבא: עלויות נוספות';
                } else {
                  return `הבא: ${categoriesNav[currentIndex + 1]?.name || 'עלויות נוספות'}`;
                }
              })()}
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* כפתור צף להוספת פריט */}
      <CategoryFloatingAddButton
        onClick={() => setShowAddDialog(true)}
        categoryColor="teal"
        icon={Plus}
        label="הוסף פריט אינסטלציה"
      />

      {/* Dialogs */}
      {/* Add/Edit Item Dialog (Add mode) */}
      <PlumbingItemDialog
        id="plumbing-item-dialog"
        open={!!showAddDialog}
        onOpenChange={(v) => setShowAddDialog(!!v)}
        defaultsProfitPercent={user?.plumbingDefaults?.desiredProfitPercent ?? 30} // CHANGED: default profit percent from 40 to 30
        subCategoryPreset={subcatFilter === "all" ? "infrastructure" : subcatFilter}
        initialQuantity={1}
        item={null}
        onSaved={handlePlumbingItemSaved}
      />
      <PlumbingItemDialog
        id="plumbing-item-dialog"
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingItem(null);
        }}
        defaultsProfitPercent={defaults?.desiredProfitPercent ?? 30} // CHANGED: default profit percent from 40 to 30
        subCategoryPreset={editingItem?.subCategory || (subcatFilter === "all" ? "infrastructure" : subcatFilter)}
        item={editingItem}
        hideUnit
        initialQuantity={editingItem ? getQty(editingItem.id) : 1}
        onSaved={(updatedItem) => {
          const q = Number(updatedItem.quantity) || 1;
          setQty(updatedItem.id, q);
          const patched = { ...editingItem, ...updatedItem, ignoreQuantity: true }; // Force ignoreQuantity for edited items too
          addItem(patched);
          setShowEditDialog(false);
          setEditingItem(null);
        }}
      />
    </>
  );
}
