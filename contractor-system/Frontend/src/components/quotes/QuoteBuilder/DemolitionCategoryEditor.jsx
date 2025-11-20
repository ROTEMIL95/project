
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { User } from "@/lib/entities";
import { useUser } from "@/components/utils/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Trash2, Search, Calculator, Hammer, Check, ArrowLeft, ArrowRight, Calendar, DollarSign, Wallet, BadgePercent, Clock, Plus } from "lucide-react";
import DemolitionCustomItemCard from "@/components/quotes/QuoteBuilder/DemolitionCustomItemCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "קל (x1)", multiplier: 1 },
  { value: "medium", label: "בינוני (x1.2)", multiplier: 1.2 },
  { value: "hard", label: "קשה (x1.5)", multiplier: 1.5 },
];

const formatPrice = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// מחשב תמחור גם ליחידה וגם סה״כ לפי כמות ורמת קושי + שעות עבודה
const computePricing = (it, difficultyValue, qty, defaults) => {
  const diff =
    DIFFICULTY_OPTIONS.find((d) => d.value === difficultyValue)?.multiplier || 1;

  const labor = Number(it.laborCostPerDay ?? defaults.laborCostPerDay ?? 0);
  const hoursBase = Number(it.hoursPerUnit ?? 1); // שעות ליחידה בבסיס
  const unitContractorBase =
    Number(it.contractorCost || 0) > 0
      ? Number(it.contractorCost)
      : labor > 0 && hoursBase > 0
      ? (labor / 8) * hoursBase
      : 0;

  const pp = Number(it.profitPercent ?? defaults.profitPercent ?? 30);
  const unitClientBase =
    Number(it.clientPrice || 0) > 0
      ? Number(it.clientPrice)
      : unitContractorBase * (1 + pp / 100);

  // פר-יחידה לאחר מקדם קושי
  const unitContractor = unitContractorBase * diff;
  const unitClient = unitClientBase * diff;
  const unitProfit = unitClient - unitContractor;
  const profitPercent = unitContractor > 0 ? (unitProfit / unitContractor) * 100 : 0;

  const quantity = Math.max(1, Number(qty) || 1);

  // שעות עבודה
  const unitHours = (hoursBase || 0) * diff;
  const totalHours = unitHours * quantity;

  // סה״כ לפי כמות
  const totalContractor = unitContractor * quantity;
  const totalClient = unitClient * quantity;
  const totalProfit = unitProfit * quantity;

  return {
    unit: {
      contractor: unitContractor,
      client: unitClient,
      profit: unitProfit,
      hours: unitHours,
      profitPercent,
    },
    total: {
      contractor: totalContractor,
      client: totalClient,
      profit: totalProfit,
      hours: totalHours,
      profitPercent, // זהה גם בסה״כ
    },
  };
};

// helper להצגת אחוז בפורמט קצר
const formatPct = (n) => `${Math.round(Number(n) || 0)}%`;

// הוספת תמיכה בפרופס hideHeader להסתרת הכותרת העליונה בתוך העורך (במיוחד בהריסה)
// ההסתרה נעשית בצורה הגנתית לפי טקסט/כותרות נפוצות כדי לא לשבור מבנה פנימי.
// מוסיף לוגיקת UI לא חודרנית: הסתרת אייקוני מטבע, הסתרת 'עלות לקבלן', וצבע כפתור הוספה אדום-בהיר
export default function DemolitionCategoryEditor(props) {
  const {
    selectedItems = [],
    onAddItemToQuote,
    categoryId = "cat_demolition",
    categoryTimings = {},
    onCategoryTimingChange,
    onProceed,
    showTimingControls = true,
    showSearch = true,
    hideCustomAddButton,
    hideHeader,
    hideContractorCost,
    hideCurrencyIcons,
    toneAddButtonLightRed,
    hideSelectedItemsList,
  } = props;

  const { user: currentUser } = useUser();
  const [userItems, setUserItems] = useState([]);
  const [query, setQuery] = useState("");
  const [localRows, setLocalRows] = useState({}); // keyed by itemId: {quantity, difficulty}
  const [defaults, setDefaults] = useState({ laborCostPerDay: 0, profitPercent: 30 });

  // תוספות (מכולה/שרוול/הורדה) והרווח עליהן
  const [extras, setExtras] = React.useState({
    container: 0, // עלות לקבלן ₪
    chute: 0,       // עלות לקבלן ₪
    unloadingHours: 0, // שעות הורדה (קבלן)
    profitPercent: 30, // אחוז רווח על התוספות
  });

  // הצגת סכום לאחר הוספה
  const [extrasAddedTotals, setExtrasAddedTotals] = React.useState(null);

  // state for popup
  const [openCustomDialog, setOpenCustomDialog] = React.useState(false);

  const rootRef = useRef(null);

  // Consolidate useEffect for hiding elements based on props
  useEffect(() => {
    // Using an ID for robustness, falling back to document if ref isn't available immediately
    const root = rootRef.current || document.getElementById('demolition-editor-root') || document;
    if (!root) return;

    // 1) הסתרת כפתור "הוסף פריט" אם ביקשו (מוגדר כבר – שומרים גם כאן כהקשחה)
    if (hideCustomAddButton) {
      root.querySelectorAll('button, a').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt === 'הוסף פריט מותאם אישית' || txt === 'הוסף פריט') {
          el.style.display = 'none';
        }
      });
    }

    // 2) הסתרת כותרות פנימיות (הקשחה)
    if (hideHeader) {
      // Target the specific CardHeader element by its class names from the original JSX.
      // Need to escape `/` for CSS selector, e.g., `bg-gray-50/60` becomes `bg-gray-50\/60`.
      const specificCardHeader = root.querySelector('.bg-gray-50\\/60.border-b.flex.items-center.justify-between');
      if (specificCardHeader) {
        specificCardHeader.style.display = 'none';
      }

      // Additional hardening for headers based on text
      root.querySelectorAll('h1,h2,h3,[role="heading"]').forEach((h) => {
        const t = (h.textContent || '').trim();
        if (t.includes('הריסה') || t.includes('פינוי') || t.includes('בנוי')) {
          const wrap = h.closest('div') || h; // Find a wrapping div to hide, or the element itself
          if (wrap) wrap.style.display = 'none';
        }
      });
    }

    // 3) הסתרת אריח/שורה של "עלות לקבלן"
    if (hideContractorCost) {
      // Find elements that contain the specific text "עלות לקבלן"
      root.querySelectorAll('*').forEach((el) => {
        const t = (el.textContent || '').trim();
        if (t === 'עלות לקבלן' || t.includes('עלות לקבלן')) {
          // Attempt to hide the closest "tile" like container
          const tile = el.closest('.rounded, .rounded-md, .rounded-lg, .border, .p-2, .p-3, .p-4');
          if (tile) tile.style.display = 'none';
          else if (el.parentElement) el.parentElement.style.display = 'none'; // Fallback to parent
          else el.style.display = 'none';
        }
      });
    }

    // 4) הסתרת אייקוני מטבע (שקל/דולר) הנמצאים ליד המחירים
    if (hideCurrencyIcons) {
      // Hide svg elements that are siblings to or within text nodes containing '₪'
      root.querySelectorAll('*').forEach((el) => {
        const txt = (el.textContent || '');
        if (txt.includes('₪')) {
          // Hide SVG elements within the same element
          el.querySelectorAll('svg').forEach((svg) => {
            svg.style.display = 'none';
          });
          // Also hide SVG elements that are immediate siblings
          if (el.parentElement) {
            Array.from(el.parentElement.children).forEach((sibling) => {
              if (sibling !== el && sibling.tagName === 'svg') {
                sibling.style.display = 'none';
              }
            });
          }
        }
      });
      // Hide svg elements based on common aria-label/title for currency icons
      root.querySelectorAll('svg[aria-label], svg[title]').forEach((svg) => {
        const a = (svg.getAttribute('aria-label') || '').toLowerCase();
        const tt = (svg.getAttribute('title') || '').toLowerCase();
        if (a.includes('shekel') || a.includes('dollar') || tt.includes('shekel') || tt.includes('dollar')) {
          svg.style.display = 'none';
        }
      });
    }

    // 5) שינוי עיצוב כפתור "הוסף להצעה" לאדום בהיר + הכהיה בהובר
    if (toneAddButtonLightRed) {
      root.querySelectorAll('button').forEach((btn) => {
        const txt = (btn.textContent || '').trim();
        if (txt === 'הוסף להצעה') {
          // Remove prominent previous color classes (to avoid conflicts)
          btn.classList.remove('bg-indigo-600','bg-indigo-700','bg-primary','text-white');
          // Apply light-red styling
          btn.classList.add(
            'bg-rose-50','text-rose-700','border','border-rose-200'
          );
          // Add hover effect
          btn.classList.add('hover:bg-rose-200','hover:text-rose-800');
        }
      });
    }

    // 6) הסתרת בלוק "פריטים שנבחרו..." והרשימה שמתחתיו
    if (hideSelectedItemsList) {
      // חפש כותרות עם טקסט מתאים והסתר את הקונטיינר הרלוונטי
      const headingCandidates = root.querySelectorAll('h1,h2,h3,h4,h5,[role="heading"], .text-lg, .text-xl, .font-semibold');
      headingCandidates.forEach((h) => {
        const t = (h.textContent || '').trim();
        if (t.includes('פריטים שנבחרו')) {
          // Try to hide the closest logical container that holds the heading and the list
          const container =
            h.closest('div.space-y-4') || // The parent div wrapping the separator and the whole section
            h.closest('section') ||
            h.closest('.card') ||
            h.closest('.border') ||
            h.closest('.rounded') ||
            h.closest('.p-4') ||
            h.parentElement; // Fallback to parent
          if (container) container.style.display = 'none';

          // Also try to hide the separator just before this section if found
          let prevSibling = h.previousElementSibling;
          while (prevSibling && prevSibling.tagName !== 'HR' && prevSibling.tagName !== 'DIV') {
            prevSibling = prevSibling.previousElementSibling;
          }
          if (prevSibling && prevSibling.tagName === 'HR' && prevSibling.classList.contains('my-6')) {
            prevSibling.style.display = 'none';
          }
        }
      });
    }

  }, [hideCustomAddButton, hideHeader, hideContractorCost, hideCurrencyIcons, toneAddButtonLightRed, hideSelectedItemsList]);


  // listen to global event from header button
  React.useEffect(() => {
    const handler = () => setOpenCustomDialog(true);
    window.addEventListener("b44:demolition:open-custom-item", handler);
    return () => window.removeEventListener("b44:demolition:open-custom-item", handler);
  }, []);

  // יעד עיגול ימי עבודה (למשל 1 יום). כאשר פעיל - נשמור מינימום ימים עד שנגיע ליעד.
  const [roundingTargetDays, setRoundingTargetDays] = React.useState(null);
  const roundingActive = !!(roundingTargetDays && roundingTargetDays > 0);

  useEffect(() => {
    const load = () => {
      if (currentUser?.user_metadata) {
        const me = currentUser.user_metadata;
        const items = Array.isArray(me?.demolitionItems) ? me.demolitionItems : [];
        setUserItems(items);
        setDefaults({
          laborCostPerDay: Number(me?.demolitionDefaults?.laborCostPerDay || 0),
          profitPercent: Number(me?.demolitionDefaults?.profitPercent || 30),
        });
      }
    };
    if (currentUser) {
      load();
    }
  }, [currentUser]);

  React.useEffect(() => {
    // ברירת מחדל לאחוז רווח של התוספות = רווח ברירת מחדל מהמשתמש
    setExtras((e) => ({ ...e, profitPercent: Number(e.profitPercent || defaults.profitPercent || 30) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults.profitPercent]);

  // This useEffect block is being replaced by the consolidated hiding logic above.
  // React.useEffect(() => {
  //   const label = 'פריטים שנבחרו לקטגוריה זו';
  //   const labelDiv = Array.from(document.querySelectorAll('div'))
  //     .find(el => el && el.textContent && el.textContent.trim() === label);

  //   if (labelDiv) {
  //     const separator = labelDiv.previousElementSibling;
  //     const itemsListDiv = labelDiv.nextElementSibling;

  //     if (separator) {
  //       separator.style.display = 'none';
  //     }
  //     labelDiv.style.display = 'none';
  //     if (itemsListDiv) {
  //       itemsListDiv.style.display = 'none';
  //     }
  //   }
  // }, []);

  const priceWithProfit = (cost, pct) => {
    const c = Number(cost || 0);
    const p = Number(pct || 0);
    return c > 0 ? c * (1 + p / 100) : 0;
  };

  // חישוב עלות הורדה לפי שעות ומחירון יום עבודה של קבלן
  const calcUnloadingContractorCost = (hours) => {
    const h = Math.max(0, Number(hours) || 0);
    const perDay = Number(defaults.laborCostPerDay || 0);
    return perDay > 0 ? (perDay / 8) * h : 0;
  };

  const addExtrasToQuote = () => {
    const itemsToAdd = [];
    const pct = Number(extras.profitPercent || 0);

    const pushIf = (contractor, label, extra = {}) => {
      const c = Math.round(Number(contractor || 0));
      if (c > 0) {
        const client = Math.round(priceWithProfit(c, pct));
        itemsToAdd.push({
          id: `demo_extra_${label}_${Date.now()}`,
          source: "demolition_extra",
          categoryId,
          categoryName: "הריסה ופינוי",
          description: label,
          quantity: 1,
          unit: "יח",
          unitPrice: client,
          totalPrice: client,
          totalCost: c,
          laborCost: 0,
          materialCost: c,
          workDuration: Number(extra.workDuration || 0), // ימים אם קיים
        });
      }
    };

    // מכולה
    pushIf(extras.container, "עלות מכולה");

    // שרוול
    pushIf(extras.chute, "עלות שרוול");

    // הורדה – לפי שעות => ממיר לעלות + זמן עבודה
    const unloadingHours = Math.max(0, Number(extras.unloadingHours) || 0);
    const unloadingCost = calcUnloadingContractorCost(unloadingHours);
    const unloadingDays = unloadingHours / 8; // Calculate workDuration in days
    if (unloadingCost > 0) {
      pushIf(unloadingCost, "עלות הורדה (שעות)", { workDuration: unloadingDays });
    }

    if (itemsToAdd.length && typeof onAddItemToQuote === "function") {
      const clientSum = itemsToAdd.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
      const contractorSum = itemsToAdd.reduce((s, it) => s + (Number(it.totalCost) || 0), 0);
      const profitSum = clientSum - contractorSum;
      setExtrasAddedTotals({ clientSum, contractorSum, profitSum }); // Update state
      onAddItemToQuote(itemsToAdd);
    }
  };

  // helper: מחשב ימי עבודה לפריט (בימים), כולל מקדם קושי אם יש
  const calcItemDays = React.useCallback((i) => {
    const wd = Number(i.workDuration);
    if (!isNaN(wd) && wd > 0) return wd;
    const baseHours = Number(i.hoursPerUnit ?? 0);
    const qty = Math.max(1, Number(i.quantity) || 1);
    const mult = Number(i?.difficultyData?.multiplier ?? 1);
    if (baseHours > 0) return (baseHours * qty * mult) / 8;
    return 0;
  }, []);

  // helper: ימי עבודה גולמיים (ללא פריט העיגול)
  const getRawDaysWithoutRounding = React.useCallback(() => {
    const items = selectedItems.filter(i => i.categoryId === categoryId && i.source !== 'demolition_rounding');
    return items.reduce((s, it) => s + calcItemDays(it), 0);
  }, [selectedItems, categoryId, calcItemDays]);

  // helper: בונה פריט עיגול עם עלות+מחיר לפי אחוז רווח (שמירה על אחוז הרווח)
  const buildRoundingItem = React.useCallback((daysDiff) => {
    const d = Number(Math.max(0, daysDiff).toFixed(3)); // Ensure positive and limited precision
    const laborPerDay = Number((defaults?.laborCostPerDay ?? 0));
    const profitPercent = Number((defaults?.profitPercent ?? 30));
    const contractor = Math.round(d * laborPerDay);
    const client = Math.round(contractor * (1 + profitPercent / 100));
    const unitPrice = d > 0 ? Math.round(client / d) : 0; // Unit price per day

    return {
      id: 'demolition_rounding',           // מזהה קבוע כדי שנוכל לעדכן/להחליף
      source: 'demolition_rounding',
      categoryId,
      categoryName: 'הריסה ופינוי',
      description: 'עיגול ימי עבודה',
      quantity: d,                         // מציגים את כמות הימים המעוגלת
      unit: 'יום',
      unitPrice,
      totalPrice: client,
      totalCost: contractor,
      laborCost: contractor, // Treat as labor cost for summaries
      materialCost: 0,
      workDuration: d,                     // ימים בפועל (כבר בביטוי של ימים)
    };
  }, [categoryId, defaults]);

  // פעולה דינמית - מפעיל/מבטל מצב עיגול
  const handleToggleRoundingMode = React.useCallback(() => {
    if (roundingActive) {
      // ביטול מצב עיגול -> מעבר ל"ימים מדויקים"
      setRoundingTargetDays(null);
      // נטרול השפעת פריט העיגול הקיים ע"י החלפתו בפריט 0 ימים (ומחיר 0)
      if (typeof onAddItemToQuote === 'function') {
        onAddItemToQuote(buildRoundingItem(0));
      }
      return;
    }

    // הפעלה: "עיגול ימי עבודה"
    const rawDays = getRawDaysWithoutRounding();
    const target = Math.max(1, Math.ceil(rawDays)); // לפחות 1 יום
    const diff = target - rawDays;

    setRoundingTargetDays(target);
    if (diff > 0 && typeof onAddItemToQuote === 'function') {
      onAddItemToQuote(buildRoundingItem(diff));
    } else if (typeof onAddItemToQuote === 'function') {
      // אם כבר מדויק על היעד, ודא שאין פריט עיגול פעיל
      onAddItemToQuote(buildRoundingItem(0));
    }
  }, [roundingActive, getRawDaysWithoutRounding, buildRoundingItem, onAddItemToQuote]);


  // עדכון אוטומטי של פריט העיגול רק כשהמצב פעיל
  React.useEffect(() => {
    if (!roundingActive || typeof onAddItemToQuote !== 'function') return;

    const rawDays = getRawDaysWithoutRounding();
    const desiredDiff = Math.max(roundingTargetDays - rawDays, 0); // Calculate required difference to reach target
    const currentRounding = selectedItems.find(
      it => it.categoryId === categoryId && it.source === 'demolition_rounding'
    );
    const currentDiff = Number(currentRounding?.workDuration || 0);

    // If the difference required has changed, or if a rounding item doesn't exist but should, update it.
    // Use a small epsilon for float comparison.
    if (Math.abs(desiredDiff - currentDiff) > 0.001) {
      const updated = buildRoundingItem(desiredDiff);
      onAddItemToQuote(updated); // Replace existing with updated or add new
    }
  }, [roundingActive, roundingTargetDays, selectedItems, categoryId, getRawDaysWithoutRounding, buildRoundingItem, onAddItemToQuote]);

  const filtered = useMemo(() => {
    if (!query) return userItems;
    const q = query.toLowerCase();
    return userItems.filter(
      (it) =>
        (it.name || "").toLowerCase().includes(q) ||
        (it.description || "").toLowerCase().includes(q)
    );
  }, [userItems, query]);

  const getLocal = (id) => localRows[id] || { quantity: 1, difficulty: "easy" };

  const setLocal = (id, patch) => {
    setLocalRows((prev) => ({ ...prev, [id]: { ...getLocal(id), ...patch } }));
  };

  const addItem = (srcItem) => {
    const { quantity, difficulty } = getLocal(srcItem.id);
    const qty = Math.max(1, Number(quantity) || 1);
    const diffDef = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty) || DIFFICULTY_OPTIONS[0];
    const mult = Number(diffDef.multiplier) || 1;

    const pricing = computePricing(srcItem, difficulty, qty, defaults);

    // workHours and workDuration are now computed within pricing
    const workHours = pricing.total.hours;
    const workDuration = workHours > 0 ? workHours / 8 : 0;

    const itemToAdd = {
      id: `demo_${srcItem.id}_${Date.now()}`,
      source: "demolition_calculator",
      categoryId,
      categoryName: "הריסה ופינוי",
      description: srcItem.description || srcItem.name,
      quantity: qty,
      unit: srcItem.unit || "יח",
      unitPrice: Math.round(pricing.unit.client),
      totalPrice: Math.round(pricing.total.client),
      totalCost: Math.round(pricing.total.contractor),
      laborCost: Math.round(pricing.total.contractor), // treat contractor cost as labor for summaries
      materialCost: 0,
      workDuration: Number(workDuration.toFixed(2)),
      difficultyData: { label: diffDef.label, multiplier: mult },
      // Store base hours per unit for robust calculations in summary
      hoursPerUnit: Number(srcItem.hoursPerUnit ?? 0)
    };

    if (typeof onAddItemToQuote === "function") {
      onAddItemToQuote(itemToAdd);
    }
  };

  const selectedForThisCategory = selectedItems.filter((i) => i.categoryId === categoryId);

  const timing = categoryTimings?.[categoryId] || { startDate: "", endDate: "" };

  return (
    <div ref={rootRef} id="demolition-editor-root" className="space-y-6" dir="rtl">
      <Card className="shadow-sm">
        <CardHeader className="bg-gray-50/60 border-b flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Hammer className="w-5 h-5 text-red-600" />
            הריסה ופינוי – בנוי מחדש
          </CardTitle>
          {/* כפתור הוספת פריט מותאם אישית – now opens the dialog */}
          <button
            type="button"
            onClick={() => setOpenCustomDialog(true)} // Updated: opens dialog
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף פריט מותאם אישית
          </button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-12 gap-3 items-end">
            {showSearch && (
              <div className={showTimingControls ? "md:col-span-6" : "md:col-span-12"}>
                <div className="text-sm text-gray-600 mb-1">חיפוש פריט</div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
                  <Input
                    placeholder="חפש לפי שם או תיאור..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>
            )}

            {showTimingControls && (
              <>
                <div className={showSearch ? "md:col-span-3" : "md:col-span-6"}>
                  <div className="text-sm text-gray-600 mb-1">תאריך התחלה</div>
                  <Input
                    type="date"
                    value={timing.startDate || ""}
                    onChange={(e) => onCategoryTimingChange && onCategoryTimingChange(categoryId, "startDate", e.target.value)}
                  />
                </div>
                <div className={showSearch ? "md:col-span-3" : "md:col-span-6"}>
                  <div className="text-sm text-gray-600 mb-1">תאריך סיום</div>
                  <Input
                    type="date"
                    value={timing.endDate || ""}
                    onChange={(e) => onCategoryTimingChange && onCategoryTimingChange(categoryId, "endDate", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <Separator className="my-4" />

          {/* Available items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((it) => {
              const local = getLocal(it.id);
              return (
                <Card key={it.id} className="border rounded-xl">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-800">{it.name || "פריט הריסה"}</div>
                      <Badge variant="outline" className="text-xs">{it.unit || "יח"}</Badge>
                    </div>
                    {it.description && (
                      <div className="text-xs text-gray-500">{it.description}</div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">כמות</div>
                        <Input
                          type="number"
                          min="1"
                          value={local.quantity}
                          onChange={(e) => setLocal(it.id, { quantity: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-gray-600 mb-1">רמת קושי</div>
                        <Select
                          value={local.difficulty}
                          onValueChange={(v) => setLocal(it.id, { difficulty: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר רמת קושי" />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTY_OPTIONS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Quick preview numbers */}
                    <div className="relative rounded-xl border bg-white/80 p-2 md:p-3">
                      {(() => {
                        const local = getLocal(it.id);
                        const qty = Number(local.quantity) || 1;
                        const pricing = computePricing(it, local.difficulty, qty, defaults);

                        const Tile = ({ amount, label, color, sub, children }) => (
                          <div className="relative rounded-lg border bg-gray-50 px-3 py-2 text-center">
                            <div className={`text-base md:text-lg font-bold ${color}`}>₪{formatPrice(amount)}</div>
                            <div className="text-[11px] md:text-xs text-gray-600 mt-0.5">{label}</div>
                            {sub ? (
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                ליחידה: ₪{formatPrice(sub)}
                              </div>
                            ) : null}
                            {children}
                          </div>
                        );

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
                            <Tile
                              amount={pricing.total.contractor}
                              sub={pricing.unit.contractor}
                              label="עלות לקבלן"
                              color="text-red-600"
                            />
                            <Tile
                              amount={pricing.total.profit}
                              sub={pricing.unit.profit}
                              label="רווח לקבלן"
                              color="text-green-600"
                            >
                              <div className="pointer-events-none absolute -top-3 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 shadow-sm">
                                {formatPct(pricing.total.profitPercent)}
                              </div>
                            </Tile>
                            <Tile
                              amount={pricing.total.client}
                              sub={pricing.unit.client}
                              label="מחיר ללקוח"
                              color="text-indigo-600"
                            />
                            <Tile
                              amount={pricing.total.hours}
                              sub={pricing.unit.hours}
                              label="זמן עבודה (ש׳)"
                              color="text-gray-700"
                            />
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex justify-end">
                      <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => addItem(it)}>
                        <PlusCircle className="w-4 h-4 ml-2" />
                        הוסף להצעה
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selected items preview for this category */}
          {selectedForThisCategory.length > 0 && (
            <>
              <Separator className="my-6" />
              <div className="text-sm font-semibold text-gray-800 mb-2">פריטים שנבחרו לקטגוריה זו</div>
              <div className="space-y-2">
                {selectedForThisCategory.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm p-2 border rounded">
                    <div className="truncate">
                      {s.description} • {s.quantity} {s.unit} • ₪{formatPrice(s.totalPrice)}
                    </div>
                    <Badge className="bg-gray-100 text-gray-700" variant="outline">
                      {s.difficultyData?.label || "קל"}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* תוספות ייעודיות להריסה - בלוק תוספות – מוזז עכשיו לפני הסיכום */}
      <div className="mt-6 space-y-3">
        <Separator />
        <div className="rounded-xl border bg-white p-3">
          <div className="mb-3 font-semibold text-gray-800">תוספות להריסה</div>

          {/* שורת שדות התוספות */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-gray-600">עלות מכולה (קבלן)</Label>
              <Input
                type="number"
                min="0"
                value={extras.container}
                onChange={(e) => setExtras((x) => ({ ...x, container: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600">עלות שרוול (קבלן)</Label>
              <Input
                type="number"
                min="0"
                value={extras.chute}
                onChange={(e) => setExtras((x) => ({ ...x, chute: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600">שעות הורדה (קבלן)</Label>
              <Input
                type="number"
                min="0"
                value={extras.unloadingHours}
                onChange={(e) => setExtras((x) => ({ ...x, unloadingHours: Number(e.target.value) }))}
                placeholder="0"
              />
              {Number(extras.unloadingHours || 0) > 0 && (
                <div className="text-[11px] text-gray-500 mt-1">
                  ≈ {((Number(extras.unloadingHours) || 0) / 8).toFixed(1)} ימי עבודה
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-gray-600">אחוז רווח לתוספות (%)</Label>
              <Input
                type="number"
                min="0"
                value={extras.profitPercent}
                onChange={(e) => setExtras((x) => ({ ...x, profitPercent: Number(e.target.value) }))}
                placeholder="0"
              />
              <div className="text-[11px] text-gray-400 mt-1">יישום על כל התוספות</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            {extrasAddedTotals ? (
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
                נוספו תוספות:
                <span className="mx-2 text-indigo-700 font-semibold">₪{formatPrice(extrasAddedTotals.clientSum)} ללקוח</span>
                <span className="mx-2 text-red-700 font-semibold">₪{formatPrice(extrasAddedTotals.contractorSum)} לקבלן</span>
                <span className="mx-2 text-green-700 font-semibold">₪{formatPrice(extrasAddedTotals.profitSum)} רווח</span>
              </div>
            ) : <div />}

            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={addExtrasToQuote}>
              <Plus className="ml-2 h-4 w-4" />
              הוסף תוספות להצעה
            </Button>
          </div>
        </div>
      </div>

      {/* סיכום קטגוריית הריסה – חישוב דינמי לפי מצב עיגול/ימים מדויקים */}
      <div className="mt-4 space-y-4">
        <Separator />
        {(() => {
          const items = selectedItems.filter((i) => i.categoryId === categoryId);
          if (!items.length) return null;

          // חישוב ימי עבודה
          const sumDaysExact = items.reduce((s, i) => s + calcItemDays(i), 0);
          const rawDaysNoRounding = getRawDaysWithoutRounding();
          const effectiveDays = roundingActive
            ? Math.max(roundingTargetDays || 0, rawDaysNoRounding)
            : sumDaysExact;

          // העלויות לפי פריטים (עבודה/חומרים) כדי לצרף חומרים גם כשמעגלים ימים
          const sumLaborCostItems = items.reduce((s, i) => s + (Number(i.laborCost) || 0), 0);
          const sumMaterialCostItems = items.reduce((s, i) => s + (Number(i.materialCost) || 0), 0);

          // פרמטרים מהדיפולטים של ההריסה
          const laborCostPerDay = Number(defaults?.laborCostPerDay || 0);
          const profitSetting = Number(defaults?.profitPercent || 30);

          // במצב עיגול – עלות עבודה = ימים אפקטיביים × עלות ליום; במדויקים – סכום עבודות כפי שחושבו בפריטים
          const contractorLaborDisplay = roundingActive
            ? Math.round(effectiveDays * laborCostPerDay)
            : Math.round(sumLaborCostItems);

          // תמיד מוסיפים חומרים/נלוות על בסיס פריטים
          const contractorDisplay = contractorLaborDisplay + Math.round(sumMaterialCostItems);

          // מחיר ללקוח ורווח לפי אחוז הרווח המוגדר
          const clientDisplay = Math.round(contractorDisplay * (1 + profitSetting / 100));
          const profitDisplay = clientDisplay - contractorDisplay;
          const profitPct = contractorDisplay > 0 ? (profitDisplay / contractorDisplay) * 100 : 0;

          const SumTile = ({ title, value, color, sub }) => (
            <div className="rounded-lg border bg-white px-4 py-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-600 mt-1">{title}</div>
              {sub ? <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div> : null}
            </div>
          );

          return (
            <div className="rounded-xl border bg-gray-50/60 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-800">סיכום קטגוריית הריסה</div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!roundingActive}
                    onChange={handleToggleRoundingMode}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">ימי עבודה מדויקים</span>
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SumTile
                  title="עלות לקבלן (סה״כ)"
                  value={`₪${formatPrice(contractorDisplay)}`}
                  color="text-red-600"
                />
                <SumTile
                  title="רווח לקבלן (סה״כ)"
                  value={`₪${formatPrice(profitDisplay)}`}
                  color="text-green-600"
                  sub={`(${Math.round(profitPct)}%)`}
                />
                <SumTile
                  title="מחיר ללקוח (סה״כ)"
                  value={`₪${formatPrice(clientDisplay)}`}
                  color="text-indigo-600"
                />
                <SumTile
                  title="ימי עבודה (סה״כ)"
                  value={`${effectiveDays.toFixed(1)}`}
                  color="text-gray-700"
                />
              </div>
            </div>
          );
        })()}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ArrowRight className="w-4 h-4 ml-2" />
          הקודם
        </Button>
        <Button variant="secondary" onClick={() => onProceed && onProceed()}>
          הבא
          <ArrowLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>

      {/* popup dialog with the same custom item form */}
      <Dialog open={openCustomDialog} onOpenChange={setOpenCustomDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הוספת פריט מותאם אישית</DialogTitle>
          </DialogHeader>
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3">
            {/* use the same card used בתצוגה התחתונה */}
            <DemolitionCustomItemCard
              defaults={defaults} // Pass local state 'defaults'
              onAdd={(item) => {
                onAddItemToQuote(item); // Call prop function
                setOpenCustomDialog(false); // Close the dialog after adding
              }}
              categoryId={categoryId} // Pass prop 'categoryId'
              pricingPerUnitOnly={true}
              disableDifficulty={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
