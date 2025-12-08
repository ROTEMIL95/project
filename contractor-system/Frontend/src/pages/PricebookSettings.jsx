
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useUser } from '@/components/utils/UserContext';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, DollarSign, ChevronDown, ChevronUp, Settings, Info, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const CATS = [
  { id: "cat_paint_plaster", name: "צבע ושפכטל", color: "blue", border: "border-blue-300", chip: "bg-blue-50" },
  { id: "cat_tiling", name: "ריצוף וחיפוי", color: "orange", border: "border-orange-300", chip: "bg-orange-50" },
  { id: "cat_demolition", name: "הריסה ופינוי", color: "rose", border: "border-rose-300", chip: "bg-rose-50" },
  { id: "cat_electricity", name: "חשמל", color: "yellow", border: "border-yellow-300", chip: "bg-yellow-50" },
  { id: "cat_plumbing", name: "אינסטלציה", color: "teal", border: "border-teal-300", chip: "bg-teal-50" },
  { id: "cat_construction", name: "בינוי", color: "purple", border: "border-purple-300", chip: "bg-purple-50" },
];

export default function PricebookSettings() {
  const { user, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);

  const [generalSettings, setGeneralSettings] = useState({
    desiredDailyProfit: ""
  });

  const [paint, setPaint] = useState({ workerDailyCost: "", desiredProfitPercent: "" });
  const [tiling, setTiling] = useState({ laborCostPerDay: "", desiredProfitPercent: "" });
  const [demo, setDemo] = useState({ laborCostPerDay: "", profitPercent: "" });
  const [plumb, setPlumb] = useState({ desiredProfitPercent: "" });
  const [elec, setElec] = useState({ desiredProfitPercent: "" });
  const [construct, setConstruct] = useState({ desiredProfitPercent: "", workerCostPerUnit: "" });

  // State for catalog items (needed to apply changes to existing items)
  const [paintItems, setPaintItems] = useState([]);
  const [tilingItems, setTilingItems] = useState([]);

  // הגדרות עלויות נוספות עם תזמון
  const [additionalCostDefaults, setAdditionalCostDefaults] = useState({
    profitPercent: 20,
    fixedCosts: [
      {
        id: 'logistics_transport',
        description: 'שינוע חומרים ופסולת',
        contractorCost: 0,
        timing: 'project_start' // תחילת עבודה
      },
      {
        id: 'logistics_crane',
        description: 'מנוף או הרמה מכנית',
        contractorCost: 0,
        timing: 'project_start' // תחילת עבודה
      },
      {
        id: 'cleaning',
        description: 'ניקיון כללי',
        contractorCost: 0,
        timing: 'project_end' // סיום עבודה
      },
    ]
  });

  // תזמון הוצאות לצבע
  const [paintExpenseTiming, setPaintExpenseTiming] = useState({
    labor: { type: "fixed_day_of_month", dayOfMonth: 1 },
    materials: { type: "days_before_start", daysBefore: 7 }
  });

  // תזמון הוצאות לריצוף
  const [tilingExpenseTiming, setTilingExpenseTiming] = useState({
    labor: { type: "fixed_day_of_month", dayOfMonth: 1 },
    materials: { type: "days_before_start", daysBefore: 7 }
  });

  // תזמון הוצאות לבינוי
  const [constructExpenseTiming, setConstructExpenseTiming] = useState({
    labor: { type: "fixed_day_of_month", dayOfMonth: 1 },
    materials: { type: "days_before_start", daysBefore: 5 }
  });

  // תזמון הוצאות להריסה (רק עבודה!)
  const [demoExpenseTiming, setDemoExpenseTiming] = useState({
    labor: { type: "category_end", dayOfMonth: 1 }
  });

  // תזמון הוצאות לאינסטלציה (קבלן משנה) - פשוט!
  const [plumbExpenseTiming, setPlumbExpenseTiming] = useState({
    payment: { type: "category_start" } // אפשרויות: category_start, category_end, split_50_50
  });

  // תזמון הוצאות לחשמל (קבלן משנה) - פשוט!
  const [elecExpenseTiming, setElecExpenseTiming] = useState({
    payment: { type: "category_end" } // אפשרויות: category_start, category_end, split_50_50
  });

  // State לשליטה על פתיחה/סגירה של בלוקי תזמון
  const [timingExpanded, setTimingExpanded] = useState({
    paint: false,
    tiling: false,
    demo: false,
    plumb: false,
    elec: false,
    construct: false
  });

  const [activeMap, setActiveMap] = useState({
    cat_paint_plaster: true,
    cat_tiling: true,
    cat_demolition: true,
    cat_electricity: true,
    cat_plumbing: true,
    cat_construction: true,
  });

  const [generalNotes, setGeneralNotes] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (userLoading || !user) {
      setLoading(true);
      return;
    }

    (async () => {
      setLoading(true);

      // Fetch user profile from user_profiles table
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
        return;
      }

      // טעינת הגדרות כלליות
      setGeneralSettings({
        desiredDailyProfit: profile?.desired_daily_profit ?? ""
      });

      // טעינת צבע
      const p = profile?.paint_user_defaults || {};
      setPaint({
        workerDailyCost: p.workerDailyCost ?? "",
        desiredProfitPercent: p.desiredProfitPercent ?? "",
      });

      const pExpTiming = p.expenseTiming || {};
      setPaintExpenseTiming({
        labor: {
          type: pExpTiming.labor?.type || "fixed_day_of_month",
          dayOfMonth: pExpTiming.labor?.dayOfMonth || 1
        },
        materials: {
          type: pExpTiming.materials?.type === "offset_from_category_start" && (pExpTiming.materials.offsetDays < 0)
                ? "days_before_start"
                : (pExpTiming.materials?.type || "days_before_start"), // Use new type if present, otherwise default
          daysBefore: pExpTiming.materials?.daysBefore ??
                      (pExpTiming.materials?.type === "offset_from_category_start" && (pExpTiming.materials.offsetDays < 0)
                        ? -pExpTiming.materials.offsetDays
                        : 7) // Default to 7 daysBefore if not set and no explicit negative offset
        }
      });

      // טעינת ריצוף
      const t = profile?.tiling_user_defaults || {};
      setTiling({
        laborCostPerDay: t.laborCostPerDay ?? "",
        desiredProfitPercent: t.desiredProfitPercent ?? "",
      });

      const tExpTiming = t.expenseTiming || {};
      setTilingExpenseTiming({
        labor: {
          type: tExpTiming.labor?.type || "fixed_day_of_month",
          dayOfMonth: tExpTiming.labor?.dayOfMonth || 1
        },
        materials: {
          type: tExpTiming.materials?.type === "offset_from_category_start" && (tExpTiming.materials.offsetDays < 0)
                ? "days_before_start"
                : (tExpTiming.materials?.type || "days_before_start"),
          daysBefore: tExpTiming.materials?.daysBefore ??
                      (tExpTiming.materials?.type === "offset_from_category_start" && (tExpTiming.materials.offsetDays < 0)
                        ? -tExpTiming.materials.offsetDays
                        : 7)
        }
      });

      // טעינת הריסה
      const d = profile?.demolition_defaults || {};
      setDemo({
        laborCostPerDay: d.laborCostPerDay ?? "",
        profitPercent: d.profitPercent ?? "",
      });

      const dExpTiming = d.expenseTiming || {};
      setDemoExpenseTiming({
        labor: {
          type: dExpTiming.labor?.type || "category_end",
          dayOfMonth: dExpTiming.labor?.dayOfMonth || 1
        }
      });

      // טעינת בינוי
      const c = profile?.construction_defaults || {};
      setConstruct({
        desiredProfitPercent: c.desiredProfitPercent ?? "",
        workerCostPerUnit: c.workerCostPerUnit ?? "",
      });

      const cExpTiming = c.expenseTiming || {};
      setConstructExpenseTiming({
        labor: {
          type: cExpTiming.labor?.type || "fixed_day_of_month",
          dayOfMonth: cExpTiming.labor?.dayOfMonth || 1
        },
        materials: {
          type: cExpTiming.materials?.type === "offset_from_category_start" && (cExpTiming.materials.offsetDays < 0)
                ? "days_before_start"
                : (cExpTiming.materials?.type || "days_before_start"),
          daysBefore: cExpTiming.materials?.daysBefore ??
                      (cExpTiming.materials?.type === "offset_from_category_start" && (cExpTiming.materials.offsetDays < 0)
                        ? -cExpTiming.materials.offsetDays
                        : 5)
        }
      });

      // טעינת אינסטלציה
      const pl = profile?.plumbing_defaults || {};
      setPlumb({ desiredProfitPercent: pl.desiredProfitPercent ?? "" });

      const plExpTiming = pl.expenseTiming || {};
      setPlumbExpenseTiming({
        payment: {
          type: plExpTiming.payment?.type || "category_start"
        }
      });

      // טעינת חשמל
      const el = profile?.electrical_defaults || {};
      setElec({ desiredProfitPercent: el.desiredProfitPercent ?? "" });

      const elExpTiming = el.expenseTiming || {};
      setElecExpenseTiming({
        payment: {
          type: elExpTiming.payment?.type || "category_end"
        }
      });

      // טעינת עלויות נוספות
      const addCostDef = profile?.additional_cost_defaults || {};
      const defaultFixedCosts = [
        { id: 'logistics_transport', description: 'שינוע חומרים ופסולת', contractorCost: 0, timing: 'project_start' },
        { id: 'logistics_crane', description: 'מנוף או הרמה מכנית', contractorCost: 0, timing: 'project_start' },
        { id: 'cleaning', description: 'ניקיון כללי', contractorCost: 0, timing: 'project_end' },
      ];

      // מיזוג עם נתונים קיימים
      const loadedFixedCosts = (addCostDef.fixedCosts && addCostDef.fixedCosts.length > 0)
        ? addCostDef.fixedCosts.map(fc => ({
            ...fc,
            // שמור timing אם קיים, אחרת השתמש בברירת מחדל
            timing: fc.timing || (fc.id === 'cleaning' ? 'project_end' : 'project_start')
          }))
        : defaultFixedCosts;

      setAdditionalCostDefaults({
        profitPercent: addCostDef.profitPercent ?? 20,
        fixedCosts: loadedFixedCosts
      });

      setActiveMap({
        cat_paint_plaster: profile?.category_active_map?.cat_paint_plaster !== false,
        cat_tiling: profile?.category_active_map?.cat_tiling !== false,
        cat_demolition: profile?.category_active_map?.cat_demolition !== false,
        cat_electricity: profile?.category_active_map?.cat_electricity !== false,
        cat_plumbing: profile?.category_active_map?.cat_plumbing !== false,
        cat_construction: profile?.category_active_map?.cat_construction !== false,
      });

      setGeneralNotes(profile?.pricebook_general_notes || "");

      // Load catalog items (needed to apply changes to existing items)
      const paintItemsFromMetadata = user.user_metadata?.paintItems || [];
      const tilingItemsFromMetadata = user.user_metadata?.tilingItems || [];
      setPaintItems(paintItemsFromMetadata);
      setTilingItems(tilingItemsFromMetadata);

      setLoading(false);
    })();
  }, [user, userLoading]);

  // Helper function to calculate paint cost per meter (copied from CostCalculator logic)
  const calculatePaintCostPerMeter = (item) => {
    if (!item) return 0;

    const bucketPrice = Number(item.bucketPrice) || 0;
    const coverage = Number(item.coverage) || 1;
    const workerDailyCost = Number(item.workerDailyCost) || 0;
    const coatsNeeded = Number(item.coatsNeeded) || 1;
    const metersPerDay = Number(item.metersPerDay) || 1;

    // Material cost per sqm
    const materialCostPerMeter = (bucketPrice / coverage) * coatsNeeded;

    // Labor cost per sqm
    const laborCostPerMeter = workerDailyCost / metersPerDay;

    return materialCostPerMeter + laborCostPerMeter;
  };

  // Helper function to calculate tiling basic cost per meter (copied from CostCalculator logic)
  const calculateTilingBasicCostPerMeter = (item) => {
    if (!item) return 0;

    const materialCost = Number(item.materialCost) || 0;
    const additionalCost = Number(item.additionalCost) || 0;
    const method = item.laborCostMethod || 'perDay';
    const complexityValue = Number(item.complexityValue) || 1;

    let laborCost = 0;
    if (method === 'perDay') {
      const laborCostPerDay = Number(item.laborCostPerDay) || 0;
      const sqmPerDay = Number(item.sqmPerDay) || 1;
      laborCost = laborCostPerDay / sqmPerDay;
    } else if (method === 'perSqM') {
      laborCost = Number(item.laborCostPerSqM) || 0;
    }

    // Apply complexity multiplier
    laborCost = laborCost * complexityValue;

    return materialCost + laborCost + additionalCost;
  };

  const handleSave = useCallback(async () => {
    // Helper function to safely parse numbers, ignoring whitespace
    const parseNumber = (val) => {
      const trimmed = String(val || "").trim();
      return trimmed === "" ? 0 : (Number(trimmed) || 0);
    };

    const payload = {
      desiredDailyProfit: parseNumber(generalSettings.desiredDailyProfit),
      paintUserDefaults: {
        workerDailyCost: parseNumber(paint.workerDailyCost),
        desiredProfitPercent: parseNumber(paint.desiredProfitPercent),
        expenseTiming: {
          labor: {
            type: paintExpenseTiming.labor.type,
            dayOfMonth: parseNumber(paintExpenseTiming.labor.dayOfMonth) || 1
          },
          materials: {
            type: paintExpenseTiming.materials.type,
            daysBefore: parseNumber(paintExpenseTiming.materials.daysBefore)
          }
        }
      },
      tilingUserDefaults: {
        ...(user?.tilingUserDefaults || {}),
        laborCostPerDay: parseNumber(tiling.laborCostPerDay),
        desiredProfitPercent: parseNumber(tiling.desiredProfitPercent),
        expenseTiming: {
          labor: {
            type: tilingExpenseTiming.labor.type,
            dayOfMonth: parseNumber(tilingExpenseTiming.labor.dayOfMonth) || 1
          },
          materials: {
            type: tilingExpenseTiming.materials.type,
            daysBefore: parseNumber(tilingExpenseTiming.materials.daysBefore)
          }
        }
      },
      demolitionDefaults: {
        laborCostPerDay: parseNumber(demo.laborCostPerDay),
        profitPercent: parseNumber(demo.profitPercent),
        expenseTiming: {
          labor: {
            type: demoExpenseTiming.labor.type,
            dayOfMonth: parseNumber(demoExpenseTiming.labor.dayOfMonth) || 1
          }
        }
      },
      plumbingDefaults: {
        desiredProfitPercent: parseNumber(plumb.desiredProfitPercent),
        expenseTiming: {
          payment: {
            type: plumbExpenseTiming.payment.type
          }
        }
      },
      electricalDefaults: {
        desiredProfitPercent: parseNumber(elec.desiredProfitPercent),
        expenseTiming: {
          payment: {
            type: elecExpenseTiming.payment.type
          }
        }
      },
      constructionDefaults: {
        desiredProfitPercent: parseNumber(construct.desiredProfitPercent),
        workerCostPerUnit: parseNumber(construct.workerCostPerUnit),
        expenseTiming: {
          labor: {
            type: constructExpenseTiming.labor.type,
            dayOfMonth: parseNumber(constructExpenseTiming.labor.dayOfMonth) || 1
          },
          materials: {
            type: constructExpenseTiming.materials.type,
            daysBefore: parseNumber(constructExpenseTiming.materials.daysBefore)
          }
        }
      },
      additionalCostDefaults: {
        profitPercent: parseNumber(additionalCostDefaults.profitPercent),
        fixedCosts: additionalCostDefaults.fixedCosts.map(fc => ({
          id: fc.id,
          description: fc.description,
          contractorCost: parseNumber(fc.contractorCost),
          timing: fc.timing || 'project_start'
        }))
      },
      pricebookGeneralNotes: generalNotes,
      categoryActiveMap: activeMap,
    };

    try {
      // Update user profile in user_profiles table
      const { error } = await supabase
        .from('user_profiles')
        .update({
          desired_daily_profit: payload.desiredDailyProfit || null,
          paint_user_defaults: payload.paintUserDefaults,
          tiling_user_defaults: payload.tilingUserDefaults,
          demolition_defaults: payload.demolitionDefaults,
          construction_defaults: payload.constructionDefaults,
          plumbing_defaults: payload.plumbingDefaults,
          electrical_defaults: payload.electricalDefaults,
          additional_cost_defaults: payload.additionalCostDefaults,
          pricebook_general_notes: payload.pricebookGeneralNotes,
          category_active_map: payload.categoryActiveMap,
        })
        .eq('auth_user_id', user.id);

      if (error) throw error;

      // Check if worker cost or profit percent changed for paint items
      if (paintItems.length > 0 && (payload.paintUserDefaults.workerDailyCost || payload.paintUserDefaults.desiredProfitPercent)) {
        const ok = window.confirm("להחיל את עלות הפועל ואחוז הרווח על כל פריטי הצבע/שפכטל השמורים? הפעולה תעדכן גם מחיר/עלות/רווח ממוצעים להצגה.");
        if (ok) {
          const updatedPaintItems = paintItems.map((item) => {
            const newItem = { ...item };
            if (payload.paintUserDefaults.workerDailyCost !== undefined) {
              newItem.workerDailyCost = Number(payload.paintUserDefaults.workerDailyCost);
              newItem.laborCost = Number(payload.paintUserDefaults.workerDailyCost);
            }
            if (payload.paintUserDefaults.desiredProfitPercent !== undefined) {
              const baseCostPerMeter = Math.round(calculatePaintCostPerMeter({
                ...newItem,
                workerDailyCost: newItem.workerDailyCost
              }) || 0);

              const avgCustomerPrice = Math.round(baseCostPerMeter * (1 + (Number(payload.paintUserDefaults.desiredProfitPercent) / 100)));
              const avgProfitPerMeter = Math.round(avgCustomerPrice - baseCostPerMeter);

              newItem.desiredProfitPercent = Number(payload.paintUserDefaults.desiredProfitPercent);
              newItem.averageCostPerMeter = baseCostPerMeter;
              newItem.averageCustomerPrice = avgCustomerPrice;
              newItem.averageProfitPerMeter = avgProfitPerMeter;
              newItem.averageProfitPercent = Number(payload.paintUserDefaults.desiredProfitPercent);
            }
            return newItem;
          });

          await User.updateMyUserData({ paintItems: updatedPaintItems });
          setPaintItems(updatedPaintItems);
        }
      }

      // Check if worker cost or profit percent changed for tiling items
      if (tilingItems.length > 0 && (payload.tilingUserDefaults.laborCostPerDay || payload.tilingUserDefaults.desiredProfitPercent)) {
        const ok = window.confirm("להחיל את עלות העובד ואחוז הרווח הרצוי על כל פריטי הריצוף השמורים? הפעולה תעדכן גם את המחיר/עלות/רווח הממוצעים להצגה.");
        if (ok) {
          const laborCostPerDay = Number(payload.tilingUserDefaults.laborCostPerDay || 0);
          const desiredProfit = payload.tilingUserDefaults.desiredProfitPercent !== undefined ? Number(payload.tilingUserDefaults.desiredProfitPercent) : undefined;

          const updatedTilingItems = tilingItems.map((item) => {
            const newItem = {
              ...item,
              laborCostPerDay: laborCostPerDay,
            };

            if (desiredProfit !== undefined) {
              const baseCostPerMeter = Math.round(calculateTilingBasicCostPerMeter(newItem) || 0);
              const avgCustomerPrice = Math.round(baseCostPerMeter * (1 + (desiredProfit / 100)));
              const avgProfitPerMeter = Math.round(avgCustomerPrice - baseCostPerMeter);

              newItem.desiredProfitPercent = desiredProfit;
              newItem.averageCostPerMeter = baseCostPerMeter;
              newItem.averageCustomerPrice = avgCustomerPrice;
              newItem.averageProfitPerMeter = avgProfitPerMeter;
              newItem.averageProfitPercent = desiredProfit;
            }

            return newItem;
          });

          await User.updateMyUserData({ tilingItems: updatedTilingItems });
          setTilingItems(updatedTilingItems);
        }
      }

      toast({
        title: "נשמר בהצלחה",
        description: "ההגדרות נשמרו בהצלחה.",
      });

      // Navigate to dashboard after showing success toast
      setTimeout(() => {
        navigate(createPageUrl('Dashboard'));
      }, 1000);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את ההגדרות. נסה שוב.",
        variant: "destructive"
      });
    }
  }, [generalSettings, paint, tiling, demo, plumb, elec, construct, additionalCostDefaults, generalNotes, activeMap, paintExpenseTiming, tilingExpenseTiming, demoExpenseTiming, constructExpenseTiming, plumbExpenseTiming, elecExpenseTiming, user, navigate, paintItems, tilingItems, calculatePaintCostPerMeter, calculateTilingBasicCostPerMeter]);

  useEffect(() => {
    const handler = (e) => {
      const btn = e.target && e.target.closest && e.target.closest("button");
      if (!btn) return;
      const text = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (text.includes("שמור") && text.includes("הגדרות")) {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [handleSave]);

  if (loading) {
    return <div className="p-8 text-center">טוען...</div>;
  }

  // פונקציית עזר ליצירת בלוק תזמון עבודה
  const renderLaborTiming = (laborState, setLaborState, categoryId, colorScheme = "blue") => {
    const idPrefix = `${categoryId}-labor`;

    const getTimingLabel = (type, dayOfMonth) => {
      switch(type) {
        case 'category_end': return 'סיום עבודה';
        case 'fixed_day_of_month': return `יום ${dayOfMonth} בחודש`;
        case 'daily': return 'לפי יומיות';
        default: return 'סיום עבודה';
      }
    };

    return (
      <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-blue-50/30">
        <h5 className="font-semibold text-blue-800 text-sm">הוצאות עבודה (פועלים)</h5>

        <div className="space-y-2">
          {/* אופציה 1: סיום עבודה */}
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
            style={{
              borderColor: laborState.type === 'category_end' ? `var(--${colorScheme}-500, #3b82f6)` : '#e5e7eb',
              backgroundColor: laborState.type === 'category_end' ? `var(--${colorScheme}-50, #dbeafe)` : 'white'
            }}>
            <input
              type="radio"
              name={`${idPrefix}-timing`}
              value="category_end"
              checked={laborState.type === 'category_end'}
              onChange={(e) => setLaborState({ ...laborState, type: e.target.value })}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">סיום עבודה</div>
              <div className="text-xs text-gray-600">תשלום מלא בסיום העבודה בקטגוריה</div>
            </div>
            <div className="text-2xl">🏁</div>
          </label>

          {/* אופציה 2: יום קבוע בחודש */}
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
            style={{
              borderColor: laborState.type === 'fixed_day_of_month' ? `var(--${colorScheme}-500, #3b82f6)` : '#e5e7eb',
              backgroundColor: laborState.type === 'fixed_day_of_month' ? `var(--${colorScheme}-50, #dbeafe)` : 'white'
            }}>
            <input
              type="radio"
              name={`${idPrefix}-timing`}
              value="fixed_day_of_month"
              checked={laborState.type === 'fixed_day_of_month'}
              onChange={(e) => setLaborState({ ...laborState, type: e.target.value })}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">יום קבוע בחודש</div>
              <div className="text-xs text-gray-600">תשלום חודשי קבוע (משכורת)</div>
              {laborState.type === 'fixed_day_of_month' && (
                <div className="mt-2">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={laborState.dayOfMonth}
                    onChange={(e) => setLaborState({ ...laborState, dayOfMonth: e.target.value })}
                    className="w-24 h-8"
                    placeholder="1"
                  />
                  <span className="text-xs text-gray-500 mr-2">יום בחודש (1-31)</span>
                </div>
              )}
            </div>
            <div className="text-2xl">📅</div>
          </label>

          {/* אופציה 3: לפי יומיות */}
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
            style={{
              borderColor: laborState.type === 'daily' ? `var(--${colorScheme}-500, #3b82f6)` : '#e5e7eb',
              backgroundColor: laborState.type === 'daily' ? `var(--${colorScheme}-50, #dbeafe)` : 'white'
            }}>
            <input
              type="radio"
              name={`${idPrefix}-timing`}
              value="daily"
              checked={laborState.type === 'daily'}
              onChange={(e) => setLaborState({ ...laborState, type: e.target.value })}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">לפי יומיות</div>
              <div className="text-xs text-gray-600">העלות מתפזרת על כל ימי העבודה בפועל</div>
            </div>
            <div className="text-2xl">📆</div>
          </label>
        </div>

        {/* תצוגה של הבחירה */}
        <div className="mt-3 p-2 bg-white rounded border border-gray-200">
          <div className="text-xs text-gray-500">בחירה נוכחית:</div>
          <div className="text-sm font-semibold text-gray-800">{getTimingLabel(laborState.type, laborState.dayOfMonth)}</div>
        </div>
      </div>
    );
  };

  // פונקציית עזר ליצירת בלוק תזמון חומרים
  const renderMaterialsTiming = (materialsState, setMaterialsState, categoryId, colorScheme = "green") => {
    const idPrefix = `${categoryId}-materials`;

    const getTimingLabel = (type, dayOfMonth, daysBefore) => {
      switch(type) {
        case 'category_start': return 'תחילת עבודה';
        case 'fixed_day_of_month': return `יום ${dayOfMonth || 1} בחודש`;
        case 'days_before_start': return `${daysBefore || 0} ימים לפני תחילת עבודה`;
        default: return 'תחילת עבודה';
      }
    };

    return (
      <div className="space-y-3 p-4 border border-green-200 rounded-lg bg-green-50/30">
        <h5 className="font-semibold text-green-800 text-sm">הוצאות חומרים</h5>

        <div className="space-y-2">
          {/* אופציה 1: תחילת עבודה */}
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
            style={{
              borderColor: materialsState.type === 'category_start' ? `var(--${colorScheme}-500, #10b981)` : '#e5e7eb',
              backgroundColor: materialsState.type === 'category_start' ? `var(--${colorScheme}-50, #d1fae5)` : 'white'
            }}>
            <input
              type="radio"
              name={`${idPrefix}-timing`}
              value="category_start"
              checked={materialsState.type === 'category_start'}
              onChange={(e) => setMaterialsState({ ...materialsState, type: e.target.value })}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">תחילת עבודה</div>
              <div className="text-xs text-gray-600">קנייה ביום תחילת העבודה בקטגוריה</div>
            </div>
            <div className="text-2xl">🚀</div>
          </label>

          {/* אופציה 2: יום קבוע בחודש */}
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
            style={{
              borderColor: materialsState.type === 'fixed_day_of_month' ? `var(--${colorScheme}-500, #10b981)` : '#e5e7eb',
              backgroundColor: materialsState.type === 'fixed_day_of_month' ? `var(--${colorScheme}-50, #d1fae5)` : 'white'
            }}>
            <input
              type="radio"
              name={`${idPrefix}-timing`}
              value="fixed_day_of_month"
              checked={materialsState.type === 'fixed_day_of_month'}
              onChange={(e) => setMaterialsState({ ...materialsState, type: e.target.value })}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">יום קבוע בחודש</div>
              <div className="text-xs text-gray-600">קנייה ביום קבוע בחודש</div>
              {materialsState.type === 'fixed_day_of_month' && (
                <div className="mt-2">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={materialsState.dayOfMonth || 1}
                    onChange={(e) => setMaterialsState({ ...materialsState, dayOfMonth: e.target.value })}
                    className="w-24 h-8"
                    placeholder="1"
                  />
                  <span className="text-xs text-gray-500 mr-2">יום בחודש (1-31)</span>
                </div>
              )}
            </div>
            <div className="text-2xl">📅</div>
          </label>

          {/* אופציה 3: X ימים לפני תחילת עבודה */}
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
            style={{
              borderColor: materialsState.type === 'days_before_start' ? `var(--${colorScheme}-500, #10b981)` : '#e5e7eb',
              backgroundColor: materialsState.type === 'days_before_start' ? `var(--${colorScheme}-50, #d1fae5)` : 'white'
            }}>
            <input
              type="radio"
              name={`${idPrefix}-timing`}
              value="days_before_start"
              checked={materialsState.type === 'days_before_start'}
              onChange={(e) => setMaterialsState({ ...materialsState, type: e.target.value })}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">ימים לפני תחילת עבודה</div>
              <div className="text-xs text-gray-600">קנייה מספר ימים לפני תחילת העבודה</div>
              {materialsState.type === 'days_before_start' && (
                <div className="mt-2">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={materialsState.daysBefore || 0}
                    onChange={(e) => setMaterialsState({ ...materialsState, daysBefore: e.target.value })}
                    className="w-24 h-8"
                    placeholder="7"
                  />
                  <span className="text-xs text-gray-500 mr-2">ימים לפני (0-30)</span>
                </div>
              )}
            </div>
            <div className="text-2xl">⏰</div>
          </label>
        </div>

        {/* תצוגה של הבחירה */}
        <div className="mt-3 p-2 bg-white rounded border border-gray-200">
          <div className="text-xs text-gray-500">בחירה נוכחית:</div>
          <div className="text-sm font-semibold text-gray-800">{getTimingLabel(materialsState.type, materialsState.dayOfMonth, materialsState.daysBefore)}</div>
        </div>
      </div>
    );
  };

  // פונקציית עזר ליצירת בלוק תזמון הוצאות (עבור עבודה + חומרים)
  const renderExpenseTimingBlock = (title, timingState, setTimingState, categoryId, colorScheme = "indigo") => {
    return (
      <div className="space-y-6 p-4 bg-gray-50/50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded bg-${colorScheme}-100`}>
            <DollarSign className={`w-4 h-4 text-${colorScheme}-600`} />
          </div>
          <h4 className="font-semibold text-gray-800">{title}</h4>
        </div>
        <p className="text-sm text-gray-600">הגדר מתי בפועל אתה מוציא כסף על עבודה וחומרים בקטגוריה זו</p>

        {/* הוצאות עבודה */}
        {renderLaborTiming(
          timingState.labor,
          (newLaborState) => setTimingState(prev => ({ ...prev, labor: newLaborState })),
          categoryId,
          "blue"
        )}

        {/* הוצאות חומרים */}
        {renderMaterialsTiming(
          timingState.materials,
          (newMaterialsState) => setTimingState(prev => ({ ...prev, materials: newMaterialsState })),
          categoryId,
          "green"
        )}
      </div>
    );
  };

  // פונקציית עזר ליצירת בלוק תזמון פשוט לקבלני משנה (3 אפשרויות בלבד!)
  const renderSimpleSubcontractorTiming = (title, timingState, setTimingState, colorScheme = "purple") => {
    const idPrefix = title.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase();

    const getTimingLabel = (type) => {
      switch(type) {
        case 'category_start': return 'תחילת עבודה';
        case 'category_end': return 'סיום עבודה';
        case 'split_50_50': return 'חלוקה (50% בהתחלה, 50% בסוף)';
        default: return 'תחילת עבודה';
      }
    };

    return (
      <div className="space-y-4 p-4 bg-gray-50/50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded bg-${colorScheme}-100`}>
            <DollarSign className={`w-4 h-4 text-${colorScheme}-600`} />
          </div>
          <h4 className="font-semibold text-gray-800">{title}</h4>
        </div>
        <p className="text-sm text-gray-600">מתי בפועל אתה משלם לקבלן המשנה?</p>

        <div className={`space-y-3 p-4 border border-${colorScheme}-200 rounded-lg bg-${colorScheme}-50/30`}>
          <Label htmlFor={`${idPrefix}-payment-type`} className="text-sm font-medium text-gray-700">בחר אופציית תשלום</Label>

          <div className="space-y-2">
            {/* אופציה 1: תחילת עבודה */}
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
              style={{
                borderColor: timingState.payment.type === 'category_start' ? `var(--${colorScheme}-500, #4f46e5)` : '#e5e7eb',
                backgroundColor: timingState.payment.type === 'category_start' ? `var(--${colorScheme}-50, #f5f3ff)` : 'white'
              }}>
              <input
                type="radio"
                name={`${idPrefix}-timing`}
                value="category_start"
                checked={timingState.payment.type === 'category_start'}
                onChange={(e) => setTimingState(prev => ({ ...prev, payment: { type: e.target.value } }))}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">תחילת עבודה</div>
                <div className="text-xs text-gray-600">תשלום מלא (100%) ביום תחילת העבודה בקטגוריה</div>
              </div>
              <div className="text-2xl">🚀</div>
            </label>

            {/* אופציה 2: סיום עבודה */}
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
              style={{
                borderColor: timingState.payment.type === 'category_end' ? `var(--${colorScheme}-500, #4f46e5)` : '#e5e7eb',
                backgroundColor: timingState.payment.type === 'category_end' ? `var(--${colorScheme}-50, #f5f3ff)` : 'white'
              }}>
              <input
                type="radio"
                name={`${idPrefix}-timing`}
                value="category_end"
                checked={timingState.payment.type === 'category_end'}
                onChange={(e) => setTimingState(prev => ({ ...prev, payment: { type: e.target.value } }))}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">סיום עבודה</div>
                <div className="text-xs text-gray-600">תשלום מלא (100%) ביום סיום העבודה בקטגוריה</div>
              </div>
              <div className="2xl">🏁</div>
            </label>

            {/* אופציה 3: חלוקה 50-50 */}
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
              style={{
                borderColor: timingState.payment.type === 'split_50_50' ? `var(--${colorScheme}-500, #4f46e5)` : '#e5e7eb',
                backgroundColor: timingState.payment.type === 'split_50_50' ? `var(--${colorScheme}-50, #f5f3ff)` : 'white'
              }}>
              <input
                type="radio"
                name={`${idPrefix}-timing`}
                value="split_50_50"
                checked={timingState.payment.type === 'split_50_50'}
                onChange={(e) => setTimingState(prev => ({ ...prev, payment: { type: e.target.value } }))}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">חלוקה (50%-50%)</div>
                <div className="text-xs text-gray-600">50% בתחילת העבודה + 50% בסיום העבודה</div>
              </div>
              <div className="text-2xl">⚖️</div>
            </label>
          </div>

          {/* תצוגה של הבחירה */}
          <div className="mt-3 p-2 bg-white rounded border border-gray-200">
            <div className="text-xs text-gray-500">בחירה נוכחית:</div>
            <div className="text-sm font-semibold text-gray-800">{getTimingLabel(timingState.payment.type)}</div>
          </div>
        </div>
      </div>
    );
  };

  // פונקציית עזר ליצירת בלוק תזמון להריסה (3 אפשרויות בלבד)
  const renderDemolitionTiming = (title, timingState, setTimingState) => {
    const getTimingLabel = (type) => {
      switch(type) {
        case 'category_end': return 'סיום עבודה';
        case 'fixed_day_of_month': return `יום ${timingState.labor.dayOfMonth} בחודש`;
        case 'daily': return 'לפי יומיות';
        default: return 'סיום עבודה';
      }
    };

    return (
      <div className="space-y-4 p-4 bg-gray-50/50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-rose-100">
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <h4 className="font-semibold text-gray-800">{title}</h4>
        </div>
        <p className="text-sm text-gray-600">מתי בפועל אתה משלם לעובדי ההריסה?</p>

        <div className="space-y-3 p-4 border border-rose-200 rounded-lg bg-rose-50/30">
          <Label className="text-sm font-medium text-gray-700">בחר אופציית תשלום</Label>

          <div className="space-y-2">
            {/* אופציה 1: סיום עבודה */}
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
              style={{
                borderColor: timingState.labor.type === 'category_end' ? '#f43f5e' : '#e5e7eb',
                backgroundColor: timingState.labor.type === 'category_end' ? '#ffe4e6' : 'white'
              }}>
              <input
                type="radio"
                name="demo-timing"
                value="category_end"
                checked={timingState.labor.type === 'category_end'}
                onChange={(e) => setTimingState(prev => ({ ...prev, labor: { ...prev.labor, type: e.target.value } }))}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">סיום עבודה</div>
                <div className="text-xs text-gray-600">תשלום מלא (100%) ביום סיום ההריסה</div>
              </div>
              <div className="text-2xl">🏁</div>
            </label>

            {/* אופציה 2: יום קבוע בחודש */}
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
              style={{
                borderColor: timingState.labor.type === 'fixed_day_of_month' ? '#f43f5e' : '#e5e7eb',
                backgroundColor: timingState.labor.type === 'fixed_day_of_month' ? '#ffe4e6' : 'white'
              }}>
              <input
                type="radio"
                name="demo-timing"
                value="fixed_day_of_month"
                checked={timingState.labor.type === 'fixed_day_of_month'}
                onChange={(e) => setTimingState(prev => ({ ...prev, labor: { ...prev.labor, type: e.target.value } }))}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">יום קבוע בחודש</div>
                <div className="text-xs text-gray-600">תשלום חודשי קבוע (משכורת)</div>
                {timingState.labor.type === 'fixed_day_of_month' && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={timingState.labor.dayOfMonth}
                      onChange={(e) => setTimingState(prev => ({ ...prev, labor: { ...prev.labor, dayOfMonth: e.target.value } }))}
                      className="w-24 h-8"
                      placeholder="1"
                    />
                    <span className="text-xs text-gray-500 mr-2">יום בחודש (1-31)</span>
                  </div>
                )}
              </div>
              <div className="text-2xl">📅</div>
            </label>

            {/* אופציה 3: לפי יומיות */}
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-white hover:shadow-sm"
              style={{
                borderColor: timingState.labor.type === 'daily' ? '#f43f5e' : '#e5e7eb',
                backgroundColor: timingState.labor.type === 'daily' ? '#ffe4e6' : 'white'
              }}>
              <input
                type="radio"
                name="demo-timing"
                value="daily"
                checked={timingState.labor.type === 'daily'}
                onChange={(e) => setTimingState(prev => ({ ...prev, labor: { ...prev.labor, type: e.target.value } }))}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">לפי יומיות</div>
                <div className="text-xs text-gray-600">העלות מתפזרת על כל ימי העבודה בפועל (ללא שישי-שבת)</div>
              </div>
              <div className="text-2xl">📆</div>
            </label>
          </div>

          {/* תצוגה של הבחירה */}
          <div className="mt-3 p-2 bg-white rounded border border-gray-200">
            <div className="text-xs text-gray-500">בחירה נוכחית:</div>
            <div className="text-sm font-semibold text-gray-800">{getTimingLabel(timingState.labor.type)}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">הגדרות מחירון</h1>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="w-4 h-4 ml-2" />
            שמור הגדרות
          </Button>
        </div>

        {/* הגדרות כלליות - עיצוב מינימליסטי וחדשני */}
        <div className="space-y-4">
          {/* כותרת */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">הגדרות כלליות</h2>
              <p className="text-sm text-gray-500">הגדרות בסיסיות עבור כל הפרויקטים</p>
            </div>
          </div>

          {/* בלוק רווח רצוי - עיצוב מינימליסטי */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                {/* אייקון */}
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border border-indigo-100">
                    <DollarSign className="w-7 h-7 text-indigo-600" />
                  </div>
                </div>

                {/* תוכן */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">רווח רצוי ליום עבודה</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      הגדר את יעד הרווח היומי שלך. המערכת תשתמש בערך זה כדי לעזור לך להעריך את הרווחיות של כל פרויקט.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex-1 max-w-xs">
                      <Label htmlFor="desiredDailyProfit" className="text-sm font-medium text-gray-700 mb-2 block">
                        סכום ביום (₪)
                      </Label>
                      <div className="relative">
                        <Input
                          id="desiredDailyProfit"
                          type="number"
                          min={0}
                          value={generalSettings.desiredDailyProfit}
                          onChange={(e) => setGeneralSettings(prev => ({ ...prev, desiredDailyProfit: e.target.value }))}
                          className="text-xl font-semibold h-12 pr-3 pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="0"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                          ₪
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-left pt-6">
                      <div className="text-xs text-gray-500 mb-1">יעד יומי</div>
                      <div className="text-2xl font-bold bg-gradient-to-l from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        ₪{Number(generalSettings.desiredDailyProfit || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                    <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700">
                      הערך מוצג בסיכום כל הצעת מחיר ומסייע בקבלת החלטות תמחור מושכלות
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-indigo-200">
          <CardHeader>
            <CardTitle>סיכום וכללים כלליים</CardTitle>
            <CardDescription>הערות כלליות על המחירון (לשימוש פנימי).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>הערות כלליות</Label>
            <Textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} placeholder="לדוגמה: המחירים מתעדכנים אחת לרבעון; תנאי עבודה מיוחדים..." />
          </CardContent>
        </Card>

        {/* עלויות נוספות - ברירות מחדל */}
        <Card className="border border-green-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-800">עלויות נוספות - ברירות מחדל</CardTitle>
                <CardDescription>הגדר ערכי ברירת מחדל לעלויות לוגיסטיקה ושינוע שיופיעו אוטומטית בכל הצעת מחיר</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <Label className="text-sm font-medium text-green-800 mb-2 block">אחוז רווח רצוי לעלויות נוספות (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={additionalCostDefaults.profitPercent}
                onChange={(e) => setAdditionalCostDefaults(prev => ({
                  ...prev,
                  profitPercent: e.target.value
                }))}
                className="max-w-xs"
                placeholder="20"
              />
              <p className="text-xs text-green-600 mt-2">המחיר ללקוח יחושב אוטומטית: עלות קבלן + אחוז רווח</p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">עלויות קבועות - ערכי ברירת מחדל</h4>
              <p className="text-sm text-gray-600">הערכים שתגדיר כאן יופיעו אוטומטית בשלב 4 של יצירת הצעת מחיר. תוכל לשנות אותם בכל הצעה ספציפית.</p>

              <div className="grid gap-3">
                {additionalCostDefaults.fixedCosts.map((cost, index) => {
                  const isProjectStart = cost.timing === 'project_start';
                  const isProjectEnd = cost.timing === 'project_end';

                  return (
                    <div key={cost.id} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      {/* אייקון תזמון */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isProjectStart ? 'bg-blue-100' : 'bg-purple-100'}`}>
                        {isProjectStart ? '🚀' : '✅'}
                      </div>

                      {/* תיאור ותזמון */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-sm">{cost.description}</div>
                        <div className={`text-xs ${isProjectStart ? 'text-blue-600' : 'text-purple-600'} font-medium mt-0.5`}>
                          {isProjectStart ? '🕐 הוצאה בתחילת הפרויקט' : '🕐 הוצאה בסיום הפרויקט'}
                        </div>
                      </div>

                      {/* עלות קבלן */}
                      <div className="flex-shrink-0 w-32">
                        <Label className="text-xs text-gray-600 block mb-1">עלות קבלן (₪)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={cost.contractorCost}
                          onChange={(e) => {
                            const newFixedCosts = [...additionalCostDefaults.fixedCosts];
                            newFixedCosts[index] = {
                              ...newFixedCosts[index],
                              contractorCost: e.target.value
                            };
                            setAdditionalCostDefaults(prev => ({
                              ...prev,
                              fixedCosts: newFixedCosts
                            }));
                          }}
                          className="h-9"
                          placeholder="0"
                        />
                      </div>

                      {/* מחיר ללקוח מחושב */}
                      {Number(cost.contractorCost) > 0 && Number(additionalCostDefaults.profitPercent) > 0 && (
                        <div className="flex-shrink-0 text-left">
                          <div className="text-xs text-gray-500">מחיר ללקוח</div>
                          <div className="text-sm font-bold text-green-600">
                            {Math.round(Number(cost.contractorCost) * (1 + Number(additionalCostDefaults.profitPercent) / 100)).toLocaleString()} ₪
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* צבע ושפכטל */}
        <Card className="border border-blue-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-blue-800">צבע ושפכטל</CardTitle>
                <CardDescription>ברירות מחדל טכניות + תזמון הוצאות</CardDescription>
              </div>
              <button
                onClick={() => setActiveMap(m => ({ ...m, cat_paint_plaster: !m.cat_paint_plaster }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  activeMap.cat_paint_plaster
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-2 border-gray-300'
                }`}
              >
                {activeMap.cat_paint_plaster ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>קטגוריה פעילה</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>קטגוריה כבויה</span>
                  </>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>עלות עובד ליום (₪)</Label>
                <Input type="number" value={paint.workerDailyCost} onChange={(e) => setPaint({ ...paint, workerDailyCost: e.target.value })} />
              </div>
              <div>
                <Label>אחוז רווח רצוי (%)</Label>
                <Input type="number" value={paint.desiredProfitPercent} onChange={(e) => setPaint({ ...paint, desiredProfitPercent: e.target.value })} />
              </div>
            </div>

            <Separator />

            <Collapsible open={timingExpanded.paint} onOpenChange={(open) => setTimingExpanded(prev => ({ ...prev, paint: open }))}>
              <CollapsibleTrigger>
                <button type="button" className="w-full flex items-center justify-between px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    תזמון הוצאות הקבלן (צבע)
                  </span>
                  {timingExpanded.paint ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {renderExpenseTimingBlock("תזמון הוצאות הקבלן (צבע)", paintExpenseTiming, setPaintExpenseTiming, "paint", "blue")}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* ריצוף וחיפוי */}
        <Card className="border border-orange-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-orange-800">ריצוף וחיפוי</CardTitle>
                <CardDescription>ברירות מחדל טכניות + תזמון הוצאות</CardDescription>
              </div>
              <button
                onClick={() => setActiveMap(m => ({ ...m, cat_tiling: !m.cat_tiling }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  activeMap.cat_tiling
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-2 border-gray-300'
                }`}
              >
                {activeMap.cat_tiling ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>קטגוריה פעילה</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>קטגוריה כבויה</span>
                  </>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>עלות עובד ליום (₪)</Label>
                <Input type="number" value={tiling.laborCostPerDay} onChange={(e) => setTiling({ ...tiling, laborCostPerDay: e.target.value })} />
              </div>
              <div>
                <Label>אחוז רווח רצוי (%)</Label>
                <Input type="number" value={tiling.desiredProfitPercent} onChange={(e) => setTiling({ ...tiling, desiredProfitPercent: e.target.value })} />
              </div>
            </div>

            <Separator />

            <Collapsible open={timingExpanded.tiling} onOpenChange={(open) => setTimingExpanded(prev => ({ ...prev, tiling: open }))}>
              <CollapsibleTrigger>
                <button type="button" className="w-full flex items-center justify-between px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    תזמון הוצאות הקבלן (ריצוף)
                  </span>
                  {timingExpanded.tiling ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {renderExpenseTimingBlock("תזמון הוצאות הקבלן (ריצוף)", tilingExpenseTiming, setTilingExpenseTiming, "tiling", "orange")}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* הריסה ופינוי - רק עבודה! */}
        <Card className="border border-red-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-red-800">הריסה ופינוי</CardTitle>
                <CardDescription>ברירות מחדל טכניות + תזמון הוצאות</CardDescription>
              </div>
              <button
                onClick={() => setActiveMap(m => ({ ...m, cat_demolition: !m.cat_demolition }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  activeMap.cat_demolition
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-2 border-gray-300'
                }`}
              >
                {activeMap.cat_demolition ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>קטגוריה פעילה</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>קטגוריה כבויה</span>
                  </>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>עלות עובד ליום (₪)</Label>
                <Input type="number" value={demo.laborCostPerDay} onChange={(e) => setDemo({ ...demo, laborCostPerDay: e.target.value })} />
              </div>
              <div>
                <Label>אחוז רווח רצוי (%)</Label>
                <Input type="number" value={demo.profitPercent} onChange={(e) => setDemo({ ...demo, profitPercent: e.target.value })} />
              </div>
            </div>

            <Separator />

            <Collapsible open={timingExpanded.demo} onOpenChange={(open) => setTimingExpanded(prev => ({ ...prev, demo: open }))}>
              <CollapsibleTrigger>
                <button type="button" className="w-full flex items-center justify-between px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    תזמון הוצאות הקבלן (הריסה)
                  </span>
                  {timingExpanded.demo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {renderDemolitionTiming("תזמון הוצאות הקבלן (הריסה)", demoExpenseTiming, setDemoExpenseTiming)}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* בינוי */}
        <Card className="border border-purple-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-purple-800">בינוי</CardTitle>
                <CardDescription>ברירות מחדל טכניות + תזמון הוצאות</CardDescription>
              </div>
              <button
                onClick={() => setActiveMap(m => ({ ...m, cat_construction: !m.cat_construction }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  activeMap.cat_construction
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-2 border-gray-300'
                }`}
              >
                {activeMap.cat_construction ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>קטגוריה פעילה</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>קטגוריה כבויה</span>
                  </>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>עלות עובד ליום (₪)</Label>
                <Input type="number" value={construct.workerCostPerUnit} onChange={(e) => setConstruct({ ...construct, workerCostPerUnit: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">עלות יום עבודה מלא (8 שעות)</p>
              </div>
              <div>
                <Label>אחוז רווח רצוי (%)</Label>
                <Input type="number" value={construct.desiredProfitPercent} onChange={(e) => setConstruct({ ...construct, desiredProfitPercent: e.target.value })} />
              </div>
            </div>

            <Separator />

            <Collapsible open={timingExpanded.construct} onOpenChange={(open) => setTimingExpanded(prev => ({ ...prev, construct: open }))}>
              <CollapsibleTrigger>
                <button type="button" className="w-full flex items-center justify-between px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    תזמון הוצאות הקבלן (בינוי)
                  </span>
                  {timingExpanded.construct ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {renderExpenseTimingBlock("תזמון הוצאות הקבלן (בינוי)", constructExpenseTiming, setConstructExpenseTiming, "construct", "purple")}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* חשמל - קבלן משנה */}
        <Card className="border border-yellow-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-yellow-700">חשמל</CardTitle>
                <CardDescription>קבלן משנה - תזמון תשלום</CardDescription>
              </div>
              <button
                onClick={() => setActiveMap(m => ({ ...m, cat_electricity: !m.cat_electricity }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  activeMap.cat_electricity
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-2 border-gray-300'
                }`}
              >
                {activeMap.cat_electricity ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>קטגוריה פעילה</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>קטגוריה כבויה</span>
                  </>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-1 gap-4">
              <div>
                <Label>אחוז רווח רצוי (%)</Label>
                <Input type="number" value={elec.desiredProfitPercent} onChange={(e) => setElec({ ...elec, desiredProfitPercent: e.target.value })} />
              </div>
            </div>

            <Separator />

            <Collapsible open={timingExpanded.elec} onOpenChange={(open) => setTimingExpanded(prev => ({ ...prev, elec: open }))}>
              <CollapsibleTrigger>
                <button type="button" className="w-full flex items-center justify-between px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    תזמון תשלום לחשמלאי
                  </span>
                  {timingExpanded.elec ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {renderSimpleSubcontractorTiming("תזמון תשלום לחשמלאי", elecExpenseTiming, setElecExpenseTiming, "yellow")}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* אינסטלציה - קבלן משנה */}
        <Card className="border border-teal-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-teal-700">אינסטלציה</CardTitle>
                <CardDescription>קבלן משנה - תזמון תשלום</CardDescription>
              </div>
              <button
                onClick={() => setActiveMap(m => ({ ...m, cat_plumbing: !m.cat_plumbing }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  activeMap.cat_plumbing
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-2 border-gray-300'
                }`}
              >
                {activeMap.cat_plumbing ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>קטגוריה פעילה</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>קטגוריה כבויה</span>
                  </>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-1 gap-4">
              <div>
                <Label>אחוז רווח רצוי (%)</Label>
                <Input type="number" value={plumb.desiredProfitPercent} onChange={(e) => setPlumb({ ...plumb, desiredProfitPercent: e.target.value })} />
              </div>
            </div>

            <Separator />

            <Collapsible open={timingExpanded.plumb} onOpenChange={(open) => setTimingExpanded(prev => ({ ...prev, plumb: open }))}>
              <CollapsibleTrigger>
                <button type="button" className="w-full flex items-center justify-between px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    תזמון תשלום לאינסטלטור
                  </span>
                  {timingExpanded.plumb ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {renderSimpleSubcontractorTiming("תזמון תשלום לאינסטלטור", plumbExpenseTiming, setPlumbExpenseTiming, "teal")}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
        
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="w-4 h-4 ml-2" />
            שמור הגדרות
          </Button>
        </div>
      </div>
    </div>
  );
}
