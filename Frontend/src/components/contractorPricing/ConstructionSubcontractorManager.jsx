
import React from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/utils/UserContext";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Trash2, Wrench, Pencil, Hammer, Edit } from "lucide-react";
import ConstructionItemDialog from "@/components/contractorPricing/ConstructionItemDialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

// עדכון רשימת תתי־קטגוריות
const SUBCATS = [
  { key: "walls", label: "בנייה – קירות" },
  { key: "ceilings", label: "הנמכת תקרה" },
  { key: "floor_leveling", label: "יישור רצפה (מדה מתפלסת)" },
  { key: "chasing_electric", label: "חציבות לחשמל" },
  { key: "chasing_plumbing", label: "חציבות לאינסטלציה" },
  { key: "concrete", label: "בטון/יציקות" },
  { key: "waterproofing", label: "איטום" },
  { key: "plaster", label: "טיח/שפכטל" }, // Added as active
  { key: "systems_devices", label: "מערכות ומכשירים" }, // NEW: Added Systems & Devices
  // legacy subcats stay for תאימות לאחור (לא יוצגו בדרופדאון אלא רק לתוויות של פריטים קיימים)
  { key: "masonry", label: "בנייה/בלוקים" },
  { key: "gypsum", label: "קירות/תקרות גבס" },
  { key: "finishing", label: "גמרים" },
  { key: "misc", label: "שונות" }
];

// רשימת המוצגים בפועל בדרופדאון (מסתיר: masonry, gypsum, finishing)
const HIDDEN_KEYS = ["masonry", "gypsum", "finishing", "misc"]; // Also hide misc from dropdown
const VISIBLE_SUBCATS = SUBCATS.filter(s => !HIDDEN_KEYS.includes(s.key));

const UNITS = ["יחידה", "מ\"ר", "מ\"ק", "מטר רץ", "קומפלט"];
const formatNis = (n) => `₪${(Number(n) || 0).toLocaleString("he-IL")}`;
const calcClient = (cost, pp) => Math.max(0, Math.round((Number(cost) || 0) * (1 + (Number(pp) || 0) / 100)));

// NEW defaults by subcategory (כוללים ערכי דוגמה לחומרים ושעות)
const DEF_WALLS = [
  { id: "cn_walls_1", name: "קיר בלוקים 10 ס\"מ (מחיצה פנימית)", unit: "מ\"ר" },
  { id: "cn_walls_2", name: "קיר בלוקים 20 ס\"מ (קיר נושא)", unit: "מ\"ר" },
  { id: "cn_walls_3", name: "קיר איטונג (בלוק קל)", unit: "מ\"ר" },
  { id: "cn_walls_4", name: "קיר בטון יצוק במקום", unit: "מ\"ר" },
  { id: "cn_walls_5", name: "קיר גבס סטנדרטי חד-צדדי", unit: "מ\"ר" },
  { id: "cn_walls_6", name: "קיר גבס דו-צדדי", unit: "מ\"ר" },
  { id: "cn_walls_7", name: "קיר גבס בידוד כפול (אקוסטי/תרמי)", unit: "מ\"ר" },
  { id: "cn_walls_8", name: "קיר גבס ירוק (עמיד רטיבות)", unit: "מ\"ר" },
  { id: "cn_walls_9", name: "קיר גבס אדום (עמיד אש)", unit: "מ\"ר" },
  { id: "cn_walls_10", name: "קיר לבנים אדומות (מלא/חצי בלוק)", unit: "מ\"ר" }
].map(it => ({
  ...it,
  subCategory: "walls",
  materialCostPerUnit: 35,
  laborHoursPerUnit: 0.6,
  contractorCostPerUnit: 0,
  isActive: true
}));

const DEF_CEILINGS = [
  { id: "cn_ceil_1", name: "תקרת גבס סטנדרטית חלקה", unit: "מ\"ר" },
  { id: "cn_ceil_2", name: "תקרת גבס אקוסטית (לוחות מחוררים/אקוסטיים)", unit: "מ\"ר" },
  { id: "cn_ceil_3", name: "תקרת גבס מעוצבת (מדרגות/נישות/תקרה צפה)", unit: "מ\"ר" },
  { id: "cn_ceil_4", name: "תקרת גבס ירוק (עמיד רטיבות – חדרי אמבטיה/מטבח)", unit: "מ\"ר" },
  { id: "cn_ceil_5", name: "תקרת עץ (קורות/לוחות)", unit: "מ\"ר" },
  { id: "cn_ceil_6", name: "תקרת מתיחה PVC", unit: "מ\"ר" }
].map(it => ({
  ...it,
  subCategory: "ceilings",
  materialCostPerUnit: 28,
  laborHoursPerUnit: 0.7,
  contractorCostPerUnit: 0,
  isActive: true
}));

const DEF_FLOOR_LEVELING = [
  { id: "cn_flvl_1", name: "מדה מתפלסת עד 5 מ\"מ (יישור קל)", unit: "מ\"ר" },
  { id: "cn_flvl_2", name: "מדה מתפלסת 6–10 מ\"מ (עובי בינוני)", unit: "מ\"ר" },
  { id: "cn_flvl_3", name: "מדה מתפלסת 11–20 מ\"מ (תיקון עומק/שיפועים)", unit: "מ\"ר" },
  { id: "cn_flvl_4", name: "מדה מתפלסת מעל 20 מ\"מ (מילוי עבה במיוחד)", unit: "מ\"ר" },
  { id: "cn_flvl_5", name: "יישור בטון מוחלק (הליקופטר)", unit: "מ\"ר" },
  { id: "cn_flvl_6", name: "יישור עם טיט/מלט ידני (תיקוני נקודות/שיפועים קטנים)", unit: "מ\"ר" }
].map(it => ({
  ...it,
  subCategory: "floor_leveling",
  materialCostPerUnit: 25,
  laborHoursPerUnit: 0.5,
  contractorCostPerUnit: 0,
  isActive: true
}));

const DEF_CHASING_ELECTRIC = [
  { id: "cn_ch_elec_1", name: "חציבה לקופסה יחידה", unit: "יחידה" },
  { id: "cn_ch_elec_2", name: "חציבה לקופסה כפולה", unit: "יחידה" },
  { id: "cn_ch_elec_3", name: "חציבה לתעלה אנכית (עד התקרה/הרצפה)", unit: "מטר רץ" },
  { id: "cn_ch_elec_4", name: "חציבה לתעלה אופקית (מעבר בין שקעים)", unit: "מטר רץ" },
  { id: "cn_ch_elec_5", name: "חציבה בלוח בטון", unit: "מטר רץ" },
  { id: "cn_ch_elec_6", name: "חציבה בקיר בלוקים", unit: "מטר רץ" },
  { id: "cn_ch_elec_7", name: "חציבה בקיר גבס (חיתוך/פתיחה – לא בדיוק חציבה)", unit: "מטר רץ" }
].map(it => ({
  ...it,
  subCategory: "chasing_electric",
  materialCostPerUnit: 12,
  laborHoursPerUnit: 0.3,
  contractorCostPerUnit: 0,
  isActive: true
}));

const DEF_CHASING_PLUMBING = [
  { id: "cn_ch_plum_1", name: "חציבה לצינור ממים (קרה/חמה)", unit: "מטר רץ" },
  { id: "cn_ch_plum_2", name: "חציבה לצינור ניקוז קטן (32 מ\"מ)", unit: "מטר רץ" },
  { id: "cn_ch_plum_3", name: "חציבה לצינור ניקוז גדול (50–110 מ\"מ)", unit: "מטר רץ" },
  { id: "cn_ch_plum_4", name: "חציבה לברז אינטרפוץ/קופסת פינוק", unit: "יחידה" },
  { id: "cn_ch_plum_5", name: "חציבה לצנרת גז", unit: "מטר רץ" },
  { id: "cn_ch_plum_6", name: "חציבה למערכות מיוחדות (תקשורת, אינטרקום, כיבוי אש)", unit: "מטר רץ" }
].map(it => ({
  ...it,
  subCategory: "chasing_plumbing",
  materialCostPerUnit: 15,
  laborHoursPerUnit: 0.4,
  contractorCostPerUnit: 0,
  isActive: true
}));

// NEW: פריטי ברירת מחדל לבטון/יציקות
const DEF_CONCRETE = [
  {
    id: "cn_conc_1",
    name: "יציקת בטון ב30 (רצפה/משטח) – עובי 10 ס\"מ",
    unit: "מ\"ר",
    description: "יציקה, פילוס והחלקה בסיסית של בטון מוכן."
  },
  {
    id: "cn_conc_2",
    name: "יציקת עמוד/קורה בבטון ב30",
    unit: "מ\"ק",
    description: "בניית טפסות, קשירת ברזל (אם נדרש), יציקה וריטוט."
  }
].map(it => ({
  ...it,
  subCategory: "concrete",
  materialCostPerUnit: it.unit === 'מ\"ק' ? 300 : 80,
  laborHoursPerUnit: it.unit === 'מ\"ק' ? 1.0 : 1.2,
  contractorCostPerUnit: 0,
  isActive: true
}));

// NEW: פריטי ברירת מחדל לאיטום
const DEF_WATERPROOFING = [
  {
    id: "cn_wat_1",
    name: "איטום גג ביריעות ביטומניות 5 מ\"מ",
    unit: "מ\"ר",
    description: "כולל ניקוי יסודי, שכבת פריימר, הנחת יריעות 5 מ\"מ (כולל ריתוכים וחפיפות)."
  },
  {
    id: "cn_wat_2",
    name: "איטום חדר רטוב בחומר צימנטי גמיש",
    unit: "מ\"ר",
    description: "שתי שכבות איטום צימנטי, כולל יישום בפינות (בנדרול)."
  },
  {
    id: "cn_wat_3",
    name: "איטום קירות חיצוניים שלילי/חיובי",
    unit: "מ\"ר",
    description: "איטום קירות חיצוניים בחומר מתאים (אקרילי/פולימרי)."
  }
].map(it => ({
  ...it,
  subCategory: "waterproofing",
  materialCostPerUnit: 45,
  laborHoursPerUnit: 0.6,
  contractorCostPerUnit: 0,
  isActive: true
}));

// NEW: פריטי ברירת מחדל לקטגוריית טיח/שפכטל
const DEF_PLASTER = [
  {
    id: "cn_plst_1",
    name: "טיח פנים תקני (שתי שכבות)",
    unit: "מ\"ר",
    description: "שכבת רשת, שכבת מיישרת ושכבת גמר שליכט, כולל פינות (רגליות)."
  },
  {
    id: "cn_plst_2",
    name: "טיח חוץ שליכט צבעוני (על בסיס סיליקון)",
    unit: "מ\"ר",
    description: "הכנת תשתית ויישום שליכט צבעוני (עלות החומר בנפרד/לכלול)."
  }
].map(it => ({
  ...it,
  subCategory: "plaster",
  materialCostPerUnit: it.id === "cn_plst_2" ? 35 : 30,
  laborHoursPerUnit: it.id === "cn_plst_2" ? 1.0 : 0.8,
  contractorCostPerUnit: 0,
  isActive: true
}));

// NEW: פריטי ברירת מחדל למערכות ומכשירים עם זמני עבודה וחומרים רק כשצריך
const DEF_SYSTEMS_DEVICES = [
  // מזגנים
  { id: "sys_ac_prep_split", name: "הכנה למזגן עילי (תעלות + חציבות + צנרת)", unit: "יחידה", laborHoursPerUnit: 3.0, materialCostPerUnit: 120 },
  { id: "sys_ac_prep_mini", name: "הכנה למזגן מיני מרכזי (תעלות + הנמכות גבס)", unit: "יחידה", laborHoursPerUnit: 7.0, materialCostPerUnit: 350 },
  { id: "sys_ac_install_split", name: "התקנת מזגן עילי (יחידה)", unit: "יחידה", laborHoursPerUnit: 2.5, materialCostPerUnit: 80 },
  { id: "sys_ac_install_mini", name: "התקנת מזגן מיני מרכזי (יחידה)", unit: "יחידה", laborHoursPerUnit: 8.0, materialCostPerUnit: 400 },
  { id: "sys_ac_core_drill", name: "קדח יהלום למזגן (Ø50–Ø65)", unit: "יחידה", laborHoursPerUnit: 0.8 }, // אין חומרים

  // אוורור ומפוחים
  { id: "sys_vent_wc", name: "התקנת ונטה / מפוח שירותים", unit: "יחידה", laborHoursPerUnit: 1.5, materialCostPerUnit: 30 },
  { id: "sys_vent_kitchen", name: "התקנת מפוח מטבח + ארובה", unit: "יחידה", laborHoursPerUnit: 3.0, materialCostPerUnit: 150 },
  { id: "sys_vent_openings", name: "פתחים לאוורור טבעי (גומחות, גריל אוורור)", unit: "יחידה", laborHoursPerUnit: 1.0, materialCostPerUnit: 20 },

  // מערכות חימום/קירור נוספות
  { id: "sys_boiler_install", name: "התקנת דוד חשמל / שמש", unit: "יחידה", laborHoursPerUnit: 2.5, materialCostPerUnit: 100 },
  { id: "sys_boiler_pipes", name: "התקנת צנרת לדוד (מים חמים)", unit: "יחידה", laborHoursPerUnit: 2.0, materialCostPerUnit: 150 },

  // מערכות נוספות
  { id: "sys_prep_wm_dw", name: "הכנה למכונת כביסה / מדיח כלים (ניקוז + חשמל)", unit: "יחידה", laborHoursPerUnit: 1.5, materialCostPerUnit: 60 },
  { id: "sys_prep_dryer_vent", name: "הכנה לייבוש כביסה (קדח אוורור יבשני)", unit: "יחידה", laborHoursPerUnit: 1.5, materialCostPerUnit: 80 },
  { id: "sys_special_faucets", name: "התקנת כיור/ברזים מיוחדים (ברים, מרפסות)", unit: "יחידה", laborHoursPerUnit: 1.5, materialCostPerUnit: 50 },
].map(it => ({
  ...it,
  subCategory: "systems_devices",
  description: it.description || "",
  contractorCostPerUnit: 0,
  isActive: true
}));


const DEFAULTS_BY_SUBCAT = {
  walls: DEF_WALLS,
  ceilings: DEF_CEILINGS,
  floor_leveling: DEF_FLOOR_LEVELING,
  chasing_electric: DEF_CHASING_ELECTRIC,
  chasing_plumbing: DEF_CHASING_PLUMBING,
  concrete: DEF_CONCRETE,
  waterproofing: DEF_WATERPROOFING,
  plaster: DEF_PLASTER,
  systems_devices: DEF_SYSTEMS_DEVICES, // NEW: Added Systems & Devices defaults
};

export default function ConstructionSubcontractorManager() {
  const [items, setItems] = React.useState([]);
  const [defaults, setDefaults] = React.useState({ desiredProfitPercent: 30, workerCostPerUnit: 0 }); // workerCostPerUnit is now day cost
  const [filter, setFilter] = React.useState("all"); // CHANGE: default filter to 'all' for grouped tables view
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState(null);
  const [newItemSubcat, setNewItemSubcat] = React.useState(null); // NEW: remember subcategory when adding from a group
  const [saving, setSaving] = React.useState(false); // NEW

  // NEW: unified numeric styles (same as tiling/paint) - these are now explicitly overridden in table cells
  const numBase = "text-center font-mono text-[15px] md:text-base tracking-tight";
  const numNeutral = `${numBase} text-slate-700`;
  const numCost = `${numBase} text-red-600`;
  const numPrice = `${numBase} text-indigo-600 font-bold`;
  const numProfit = `${numBase} text-green-700 font-bold`;

  const { user } = useUser();

  React.useEffect(() => {
    const load = async () => {
      if (!user) return;

      const desired = (user.user_metadata?.constructionDefaults?.desiredProfitPercent ?? 30);
      const worker = (user.user_metadata?.constructionDefaults?.workerCostPerUnit ?? 0); // This is now day cost
      const its = user.user_metadata?.constructionSubcontractorItems || [];

      // אם אין נתונים – זורעים את כל הפריטים שנמסרו עם חישוב עלות קבלן מהחומרים והשעות
      if (!its || its.length === 0) {
        // CHANGED: use day cost / 8 as hourly rate
        const hourRate = (Number(worker) || 0) / 8;
        const seeded = Object.values(DEFAULTS_BY_SUBCAT).flat().map(x => {
          const contractor = Math.round((Number(x.materialCostPerUnit ?? 0)) + (Number(x.laborHoursPerUnit ?? 0)) * hourRate);
          return {
            ...x,
            contractorCostPerUnit: contractor,
            clientPricePerUnit: calcClient(contractor, desired),
            desiredProfitPercent: undefined
          };
        });
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            constructionDefaults: { desiredProfitPercent: desired, workerCostPerUnit: worker },
            constructionSubcontractorItems: seeded
          }
        });
        setItems(seeded);
        setDefaults({ desiredProfitPercent: desired, workerCostPerUnit: worker });
        return;
      }

      // השלמה אוטומטית לתת־קטגוריות/פריטים שחסרים + העשרת פריטים קיימים בחומרים/שעות אם חסרים
      const existingIds = new Set(its.map(i => i.id));
      let merged = [...its];
      let didMerge = false;

      // מפה מהירה של ברירות מחדל לפי id
      const defaultsMap = Object.values(DEFAULTS_BY_SUBCAT).flat().reduce((acc, x) => { acc[x.id] = x; return acc; }, {});

      Object.entries(DEFAULTS_BY_SUBCAT).forEach(([subcatKey, defs]) => {
        const userItemsForSubcat = its.filter(item => item.subCategory === subcatKey);

        if (userItemsForSubcat.length === 0) {
          const hourRate = (Number(worker) || 0) / 8;
          const toAdd = defs.map(x => {
            // CHANGED: hourly rate from day cost
            const contractor = Math.round((Number(x.materialCostPerUnit ?? 0)) + (Number(x.laborHoursPerUnit ?? 0)) * hourRate);
            return {
              ...x,
              contractorCostPerUnit: contractor,
              clientPricePerUnit: calcClient(contractor, desired),
              desiredProfitPercent: undefined
            };
          });
          if (toAdd.length) {
            merged = [...merged, ...toAdd];
            didMerge = true;
          }
        } else {
          const hourRate = (Number(worker) || 0) / 8;
          const toAdd = defs
            .filter(def => !existingIds.has(def.id))
            .map(x => {
              // CHANGED: hourly rate from day cost
              const contractor = Math.round((Number(x.materialCostPerUnit ?? 0)) + (Number(x.laborHoursPerUnit ?? 0)) * hourRate);
              return {
                ...x,
                contractorCostPerUnit: contractor,
                clientPricePerUnit: calcClient(contractor, desired),
                desiredProfitPercent: undefined
              };
            });
          if (toAdd.length) {
            merged = [...merged, ...toAdd];
            didMerge = true;
          }
        }
      });

      // ENRICHMENT: התייחסות גם ל-0 כ"חסר" כדי לעדכן לערכי ברירות מחדל החדשים
      let changedDuringEnrich = false;
      merged = merged.map(it => {
        const base = defaultsMap[it.id];

        const material = (it.materialCostPerUnit == null || it.materialCostPerUnit === 0)
          ? base?.materialCostPerUnit
          : it.materialCostPerUnit;

        const hours = (it.laborHoursPerUnit == null || it.laborHoursPerUnit === 0)
          ? base?.laborHoursPerUnit
          : it.laborHoursPerUnit;

        let contractor = it.contractorCostPerUnit;

        if ((material != null || hours != null) && (contractor === undefined || contractor === null || contractor === 0)) {
          const hourRate = (Number(worker) || 0) / 8;
          contractor = Math.round((Number(material ?? 0)) + (Number(hours ?? 0)) * hourRate);
        }

        let client = it.clientPricePerUnit;
        if ((client === undefined || client === null || client === 0) && (contractor !== undefined && contractor !== null)) {
          client = calcClient(contractor, desired);
        }

        const next = {
          ...it,
          ...(material != null ? { materialCostPerUnit: material } : {}),
          ...(hours != null ? { laborHoursPerUnit: hours } : {}),
          ...(contractor != null ? { contractorCostPerUnit: contractor } : {}),
          ...(client != null ? { clientPricePerUnit: client } : {})
        };

        // NEW: detect any enrichment change
        if (
          next.materialCostPerUnit !== it.materialCostPerUnit ||
          next.laborHoursPerUnit !== it.laborHoursPerUnit ||
          next.contractorCostPerUnit !== it.contractorCostPerUnit ||
          next.clientPricePerUnit !== it.clientPricePerUnit
        ) {
          changedDuringEnrich = true;
        }

        return next;
      });

      // היה שינוי כלשהו? נשמור אוטומטית (גם אם לא נוספו פריטים)
      if (didMerge || changedDuringEnrich) {
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            constructionDefaults: { desiredProfitPercent: desired, workerCostPerUnit: worker },
            constructionSubcontractorItems: merged
          }
        });
      }

      setItems(merged);
      setDefaults({ desiredProfitPercent: desired, workerCostPerUnit: worker });
    };
    load();
  }, [user]);

  // עדכון ברירות מחדל ושמירה למשתמש
  const updateDefaults = async (patch) => {
    setDefaults((prev) => {
      const next = { ...prev, ...patch };
      // שמירה אסינכרונית (אין צורך לחכות)
      supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          constructionDefaults: next
        }
      });
      return next;
    });
  };

  // EDIT: open add dialog with optional subcategory
  const openAddDialog = (subcat) => {
    setNewItemSubcat(subcat || null);
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  // Function to open edit dialog for an item
  const openEditDialog = (item) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDialogSave = async (updated) => {
    const desiredPP = defaults?.desiredProfitPercent ?? 30;
    // CHANGED: use day cost -> hour rate
    const hourRate = (Number(defaults.workerCostPerUnit) || 0) / 8;
    const contractor = Math.round(
      (Number(updated.materialCostPerUnit ?? 0)) +
      (Number(updated.laborHoursPerUnit ?? 0)) * hourRate
    );
    const client = calcClient(contractor, updated.desiredProfitPercent ?? desiredPP);

    const itemToSave = {
      ...updated,
      contractorCostPerUnit: contractor, // Ensure contractor cost is calculated and saved
      clientPricePerUnit: client,
    };

    const exists = items.some(i => i.id === itemToSave.id);
    const newList = exists ? items.map(i => (i.id === itemToSave.id ? itemToSave : i)) : [...items, itemToSave];

    await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        constructionSubcontractorItems: newList
      }
    });
    setItems(newList);
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const removeItem = async (id) => {
    const newList = items.filter(i => i.id !== id);
    await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        constructionSubcontractorItems: newList
      }
    });
    setItems(newList);
  };

  // NEW: שמירה גלובלית — מחשב ומעדכן כל הפריטים לפי ההגדרות הגלובליות
  const handleSaveAll = async () => {
    setSaving(true);
    const worker = Number(defaults.workerCostPerUnit || 0); // This is day cost
    const globalPP = Number(defaults.desiredProfitPercent || 0);
    const hourRate = worker / 8; // CHANGED: derive hourly rate from day cost

    const updated = items.map((it) => {
      const contractor = Math.round((Number(it.materialCostPerUnit ?? 0)) + (Number(it.laborHoursPerUnit ?? 0)) * hourRate);
      const usePP = (it.desiredProfitPercent === 0 || it.desiredProfitPercent)
        ? Number(it.desiredProfitPercent)
        : globalPP;
      const client = calcClient(contractor, usePP);
      return {
        ...it,
        contractorCostPerUnit: contractor,
        clientPricePerUnit: client,
      };
    });

    await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        constructionDefaults: defaults,
        constructionSubcontractorItems: updated,
      }
    });

    setItems(updated);
    setSaving(false);
  };

  // Group items by subcategory for rendering
  const catalogItemsGrouped = items.reduce((acc, item) => {
    if (!acc[item.subCategory]) {
      acc[item.subCategory] = [];
    }
    acc[item.subCategory].push(item);
    return acc;
  }, {});

  // Determine which subcategories to render based on filter and existing items
  const subcategoriesToRender = (filter === "all"
    ? VISIBLE_SUBCATS
    : VISIBLE_SUBCATS.filter(s => s.key === filter)
  ).filter(sc => (catalogItemsGrouped[sc.key]?.length || 0) > 0);


  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border-2 border-purple-100 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between border-b border-purple-50 bg-purple-50/20">
          <div>
            <CardTitle className="text-xl font-bold text-purple-700 flex items-center gap-2">
              <Hammer className="w-5 h-5" />
              מחירון בינוי — קבלן משנה
            </CardTitle>
            <CardDescription className="text-purple-600">
              נהל פריטי בינוי לפי תת־קטגוריות. הגדר עלות קבלן, רווח ומחיר ללקוח.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Toolbar */}
          <div className="relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/30 to-white p-4">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-purple-400 to-violet-400" />
            <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <div className="text-[11px] text-purple-700 font-medium mb-1">עלות יום עבודה (₪)</div>
                  <div className="relative w-36">
                    <Input
                      type="number"
                      value={defaults.workerCostPerUnit}
                      onChange={(e) => updateDefaults({ workerCostPerUnit: Number(e.target.value || 0) })}
                      placeholder="למשל 1000"
                      className="pr-10 h-9 border-purple-200 focus:border-purple-400"
                    />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-purple-600">₪</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-purple-700 font-medium mb-1">אחוז רווח רצוי</div>
                  <div className="relative w-28">
                    <Input
                      type="number"
                      value={defaults.desiredProfitPercent}
                      onChange={(e) => updateDefaults({ desiredProfitPercent: Number(e.target.value || 0) })}
                      placeholder="למשל 30"
                      className="pr-8 h-9 border-purple-200 focus:border-purple-400"
                    />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-purple-600">%</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-purple-700 font-medium mb-1">סינון תת־קטגוריה</div>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-48 h-9 border-purple-200">
                      <SelectValue placeholder="תת־קטגוריה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל התת־קטגוריות</SelectItem>
                      {VISIBLE_SUBCATS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="h-9 bg-purple-500 text-white hover:bg-purple-600 border-0 shadow-sm"
                >
                  {saving ? "שומר..." : "שמור הגדרות"}
                  <Save className="w-4 h-4 mr-2" />
                </Button>
                <Button
                  onClick={() => openAddDialog(filter === "all" ? "walls" : filter)}
                  className="h-9 bg-purple-500 text-white hover:bg-purple-600 border-0 shadow-sm"
                >
                  <Plus className="w-4 h-4 ml-2" /> הוסף פריט
                </Button>
              </div>
            </div>
          </div>

          {/* Tables per subcategory */}
          {subcategoriesToRender.length === 0 && (
            <div className="text-center text-gray-500 py-8">אין פריטים להצגה בתת־קטגוריה/ות שנבחרו. הוסף פריט חדש בעזרת הכפתור למעלה.</div>
          )}
          <div className="space-y-8">
            {subcategoriesToRender.map(({ key: scKey, label: scLabel }) => {
              const groupItems = catalogItemsGrouped[scKey] || [];
              const hasItems = groupItems.length > 0;

              if (!hasItems) return null;

              return (
                <div key={scKey} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-purple-800">{scLabel}</h3>
                    <span className="text-sm text-purple-600">{groupItems.length} פריטים</span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-purple-100">
                    <Table>
                      <TableHeader className="bg-purple-50/30">
                        <TableRow className="border-b border-purple-100">
                          <TableHead className="text-right font-semibold text-purple-900">שם הפריט</TableHead>
                          <TableHead className="text-center font-semibold text-purple-900">יח"מ</TableHead>
                          <TableHead className="text-center font-semibold text-red-700">עלות קבלן (₪)</TableHead>
                          <TableHead className="text-center font-semibold text-blue-700">מחיר ללקוח (₪)</TableHead>
                          <TableHead className="text-center font-semibold text-green-700">רווח (₪)</TableHead>
                          <TableHead className="text-center font-semibold text-purple-900">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupItems.map((it) => {
                          const pp = (it.desiredProfitPercent ?? defaults.desiredProfitPercent ?? 30);
                          const contractor = Number(it.contractorCostPerUnit || 0);
                          const client = it.clientPricePerUnit ?? calcClient(contractor, pp);
                          const profit = Math.max(0, client - contractor);

                          return (
                            <TableRow key={it.id} className="hover:bg-purple-50/20 border-b border-purple-50">
                              <TableCell className="text-right">
                                <div className="font-semibold text-purple-900">{it.name}</div>
                                {it.description && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{it.description}</div>}
                              </TableCell>
                              <TableCell className="text-center text-purple-700">{it.unit}</TableCell>
                              <TableCell className="text-center font-semibold text-red-600">₪{(contractor).toFixed(2)}</TableCell>
                              <TableCell className="text-center font-semibold text-blue-600">₪{(client).toFixed(2)}</TableCell>
                              <TableCell className="text-center font-semibold text-green-600">₪{(profit).toFixed(2)}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(it)} className="h-8 w-8 text-purple-600 hover:bg-purple-100">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ConstructionItemDialog
        open={isDialogOpen}
        onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingItem(null); setNewItemSubcat(null); } }}
        defaults={defaults}
        subCategory={newItemSubcat || (filter === "all" ? "walls" : filter)}
        onSave={handleDialogSave}
        units={UNITS}
        subCats={VISIBLE_SUBCATS}
        item={editingItem}
      />

      {/* Floating Add Button (FAB) for construction */}
      <Button
        onClick={() => openAddDialog(filter === "all" ? "walls" : filter)}
        className="fixed bottom-8 left-8 z-40 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center border-2 border-white"
        aria-label="הוסף פריט בינוי"
        title="הוסף פריט בינוי"
      >
        <Plus className="h-8 w-8" />
      </Button>
    </div>
  );
}
