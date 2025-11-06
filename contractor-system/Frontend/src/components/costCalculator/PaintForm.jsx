
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Info, Palette, Layers, Edit, Settings, ListChecks, DollarSign, TrendingUp, HardHat, Package, ArrowUp, Calculator, RectangleVertical, Grid, Paintbrush, CheckCircle, PlusCircle, Save, SlidersHorizontal, User, Wrench, X, XCircle, PaintBucket, Percent } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { debounce } from 'lodash';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { User as UserEntity } from '@/lib/entities';
import { useUser } from '@/components/utils/UserContext';
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import BucketUsageIndicator from '@/components/quotes/QuoteBuilder/BucketUsageIndicator';

// הגדרת ברירות מחדל לסוגי צבע וטיח
const DEFAULT_PAINT_TYPES = [
  { id: 'acrylic', name: 'אקרילי' },
  { id: 'supercryl', name: 'סופרקריל' },
  { id: 'oil', name: 'שמן' },
  { id: 'effects', name: 'אפקטים' },
  { id: 'tambourflex', name: 'טמבורפלקס' },
  { id: 'poksi', name: 'פוקסי' }
];

const DEFAULT_PLASTER_TYPES = [
  { id: 'spot_fixes', name: 'תיקונים נקודתיים' },
  { id: 'partial_spackle', name: 'שפכטל חלקי' },
  { id: 'full_spackle', name: 'שפכטל מלא' },
  { id: 'full_plaster', name: 'טיח מלא' }
];

const WORK_TYPES = {
  paint: [
    { id: 'walls', label: 'קירות', icon: <RectangleVertical className="w-5 h-5"/> },
    { id: 'ceilings', label: 'תקרות', icon: <ArrowUp className="w-5 h-5"/> },
    { id: 'wood', label: 'עץ', icon: <Grid className="w-5 h-5"/> },
    { id: 'metal', label: 'מתכת', icon: <Settings className="w-5 h-5"/> },
    { id: 'effects', label: 'אפקטים', icon: <Palette className="w-5 h-5"/> },
  ],
  plaster: [
    { id: 'walls', label: 'קירות', icon: <RectangleVertical className="w-5 h-5"/> },
    { id: 'ceilings', label: 'תקרות', icon: <ArrowUp className="w-5 h-5"/> },
  ]
};

// מקדמי קושי
const DIFFICULTY_FACTORS = [
  { id: 'normal', name: 'רגילה', factor: 1.0 },
  { id: 'medium', name: 'בינונית', factor: 1.2 },
  { id: 'hard', name: 'קשה', factor: 1.5 }
];

// הגדרת פונקציית עזר לעיצוב מחיר
const formatPrice = (price, decimalPlaces = 0) => {
  if (typeof price !== 'number' || isNaN(price)) return '0';
  return price.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
  });
};

// Internal paint metrics calculation function - CORRECTED
const calculateInternalPaintMetrics = (formData, squareMeters, layersToApply, desiredProfitPercent, roundBucketCost = true, roundWorkDays = false) => {
  // Access base coverage and daily output from layerSettings[0]
  const baseCoverage = Number(formData.layerSettings[0]?.coverage) || 0;
  const baseDailyOutput = Number(formData.layerSettings[0]?.dailyOutput) || 0;

  if (!formData || !squareMeters || !layersToApply || !desiredProfitPercent) {
    return null;
  }

  const bucketPrice = Number(formData.bucketPrice) || 0;
  const workerDailyCost = Number(formData.workerDailyCost) || 0;
  const equipmentCost = Number(formData.equipmentCost) || 0;
  
  if (bucketPrice <= 0 || workerDailyCost <= 0) {
    return null;
  }
  if (baseCoverage <= 0 || baseDailyOutput <= 0) {
    return null;
  }

  let totalBucketsNeeded = 0;
  let totalWorkDays = 0;

  for (let i = 0; i < layersToApply; i++) {
    const layerSetting = formData.layerSettings?.[i] || { coverage: 0, discountPercent: 0 };
    const currentLayerCoverage = i === 0 
      ? baseCoverage 
      : baseCoverage * (1 + (Number(layerSetting.coverage || 0) / 100));
    const currentLayerDailyOutput = i === 0
      ? baseDailyOutput
      : baseDailyOutput * (1 + (Number(layerSetting.discountPercent || 0) / 100));
    
    if (currentLayerCoverage > 0) {
      totalBucketsNeeded += squareMeters / currentLayerCoverage;
    }
    if (currentLayerDailyOutput > 0) {
      totalWorkDays += squareMeters / currentLayerDailyOutput;
    }
  }

  const finalBuckets = roundBucketCost ? Math.ceil(totalBucketsNeeded) : totalBucketsNeeded;
  const finalWorkDays = roundWorkDays ? Math.ceil(totalWorkDays) : totalWorkDays;

  const totalMaterialCost = finalBuckets * bucketPrice;
  const totalLaborCost = finalWorkDays * workerDailyCost;
  const totalOtherCosts = equipmentCost;

  const difficultyMultiplier = formData.selectedDifficulty?.multiplier || 
    DIFFICULTY_FACTORS.find(f => f.id === formData.selectedDifficulty)?.factor || 1;

  const totalCost = (totalMaterialCost + totalLaborCost + totalOtherCosts) * difficultyMultiplier;
  const costPerMeter = squareMeters > 0 ? totalCost / squareMeters : 0;

  const profitMultiplier = 1 + (desiredProfitPercent / 100);
  const sellingPrice = totalCost * profitMultiplier;
  const pricePerMeter = squareMeters > 0 ? sellingPrice / squareMeters : 0;
  
  const profit = sellingPrice - totalCost;
  const profitPerMeter = squareMeters > 0 ? profit / squareMeters : 0; // Corrected calculation
  const profitPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return {
    totalCost: Math.round(totalCost),
    costPerMeter: costPerMeter,
    totalMaterialCost: Math.round(totalMaterialCost),
    totalLaborCost: Math.round(totalLaborCost),
    totalOtherCosts: Math.round(totalOtherCosts),
    totalWorkDays: totalWorkDays,
    finalWorkDays: finalWorkDays,
    totalBucketsNeeded: totalBucketsNeeded,
    finalBuckets: finalBuckets,
    sellingPrice: Math.round(sellingPrice),
    pricePerMeter: pricePerMeter,
    profit: Math.round(profit),
    profitPerMeter: profitPerMeter,
    profitPercentage: profitPercentage
  };
};

function TypeManagerDialog({ isOpen, onOpenChange, title, types, onSave }) {
  const [editableTypes, setEditableTypes] = useState([]);

  useEffect(() => {
    setEditableTypes([...types]);
  }, [types, isOpen]);

  const handleUpdateName = (id, newName) => {
    setEditableTypes(current => current.map(t => t.id === id ? { ...t, name: newName } : t));
  };

  const handleRemoveType = (id) => {
    setEditableTypes(current => current.filter(t => t.id !== id));
  };

  const handleAddType = () => {
    setEditableTypes(current => [...current, { id: `custom_${Date.now()}`, name: 'סוג חדש' }]);
  };

  const handleSaveChanges = () => {
    onSave(editableTypes);
    onOpenChange(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95%] text-right rounded-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto px-1">
          {editableTypes.map((type) => (
            <div key={type.id} className="flex items-center gap-2">
              <Input
                value={type.name}
                onChange={(e) => handleUpdateName(type.id, e.target.value)}
                className="flex-grow"
              />
              <Button variant="ghost" size="icon" onClick={() => handleRemoveType(type.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={handleAddType} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            הוסף סוג חדש
          </Button>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSaveChanges}>שמור שינויים</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// New component for section headers
const CategoryHeader = ({ number, title, colorScheme }) => {
  const schemeColors = {
    indigo: { border: "border-indigo-500", text: "text-indigo-800", bg: "bg-indigo-500" },
    blue: { border: "border-blue-500", text: "text-blue-800", bg: "bg-blue-500" },
    green: { border: "border-green-500", text: "text-green-800", bg: "bg-green-500" },
    purple: { border: "border-purple-500", text: "text-purple-800", bg: "bg-purple-500" },
    teal: { border: "border-teal-500", text: "text-teal-800", bg: "bg-teal-500" },
  };
  const colors = schemeColors[colorScheme] || schemeColors.indigo;

  return (
    <div className="text-center space-y-2">
      <h2 className={`text-xl font-bold ${colors.text} border-r-4 ${colors.border} pr-4 inline-block`}>
        {number}. {title}
      </h2>
    </div>
  );
};

export default function PaintForm({ onSubmit, onCancel, editItem, userPaintDefaults, presetCategory }) {
  const { user } = useUser();
  const initialLayersCount = editItem?.layerSettings?.length > 0 ? editItem.layerSettings.length : 3;
  
  const initialLayerSettings = useMemo(() => {
    if (editItem?.layerSettings && editItem.layerSettings.length > 0) {
      // Ensure layerSettings[0] has dailyOutput and coverage if it's supposed to hold base values now
      return editItem.layerSettings.map((layer, idx) => ({
        ...layer,
        // For layer 0, use existing value or empty string for default
        dailyOutput: idx === 0 ? (editItem?.dailyOutput ?? layer.dailyOutput ?? '') : layer.dailyOutput,
        coverage: idx === 0 ? (editItem?.coverage ?? layer.coverage ?? '') : layer.coverage,
      }));
    } else {
      // For new items, default base layer values to empty string
      return [
        { layer: 1, name: `שכבה 1`, coverage: '', discountPercent: 0, dailyOutput: '' },
        { layer: 2, name: `שכבה 2`, coverage: 20, discountPercent: 20 },
        { layer: 3, name: `שכבה 3`, coverage: 20, discountPercent: 20 }
      ];
    }
  }, [editItem]);

  const [paintTypes, setPaintTypes] = useState(DEFAULT_PAINT_TYPES);
  const [plasterTypes, setPlasterTypes] = useState(DEFAULT_PLASTER_TYPES);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [isPaintTypeDialogOpen, setIsPaintTypeDialogOpen] = useState(false);
  const [isPlasterTypeDialogOpen, setIsPlasterTypeDialogOpen] = useState(false);
  // ADDED: quick-add dialog state for paint type
  const [isAddPaintTypeOpen, setIsAddPaintTypeOpen] = useState(false);
  const [newPaintTypeName, setNewPaintTypeName] = useState('');
  const [isExplanationVisible, setIsExplanationVisible] = useState(false);

  // ADDED: quick-add dialog state for plaster type
  const [isAddPlasterTypeOpen, setIsAddPlasterTypeOpen] = useState(false);
  const [newPlasterTypeName, setNewPlasterTypeName] = useState('');

  const [roundBucketCost, setRoundBucketCost] = useState(editItem?.roundBucketCost !== undefined ? editItem.roundBucketCost : true);
  const [roundWorkDays, setRoundWorkDays] = useState(editItem?.roundWorkDays !== undefined ? editItem.roundWorkDays : false);

  const [quickPricingMode, setQuickPricingMode] = useState({
    indicativeQuantity: editItem?.priceTiers?.[0]?.squareMeters || 100,
    indicativeLayers: editItem?.priceTiers?.[0]?.selectedLayers || 3,
  });

  const [formData, setFormData] = useState({
    paintType: editItem?.paintType || editItem?.type || '',
    plasterType: editItem?.plasterType || '',
    selectedMaterialCategory: editItem
      ? (editItem?.paintType ? 'paint' : (editItem?.plasterType ? 'plaster' : ''))
      : (presetCategory || ''),
    workCategory: editItem?.workCategory || '',
    bucketLiters: editItem?.bucketLiters || 18,
    bucketPrice: editItem?.bucketPrice || editItem?.materialCost || 0,
    workerDailyCost: editItem?.workerDailyCost || userPaintDefaults?.workerDailyCost || 0,
    equipmentCost: editItem?.equipmentCost || editItem?.additionalCost || 0,
    customerPrice: editItem?.customerPrice || 0,
    unitType: editItem?.unitType || 'דלי', // New field for unit type
    difficultyFactors: editItem?.difficultyFactors || {
      normal: { label: 'רגיל', value: 1.0 },
      complex: { label: 'מורכב', value: 1.3 },
      hard: { label: 'קשה', value: 1.5 }
    },
    selectedDifficulty: editItem?.selectedDifficulty || 'normal',
    layers: initialLayersCount,
    layerSettings: initialLayerSettings,
    generalDescription: editItem?.generalDescription || editItem?.paintInfo || editItem?.plasterInfo || '',
    executionNotes: editItem?.executionNotes || '',
    limitations: editItem?.limitations || '',
    id: editItem?.id || null,
    pricingMethod: 'quick',
    desiredProfitPercent: editItem?.desiredProfitPercent !== undefined && editItem?.desiredProfitPercent !== null ? editItem.desiredProfitPercent : '',
    priceTiers: [{
        squareMeters: editItem?.priceTiers?.[0]?.squareMeters || 100,
        pricesByLayer: {},
        selectedLayers: editItem?.priceTiers?.[0]?.selectedLayers || 3,
    }],
  });

  const getAutoGeneratedItemName = useCallback(() => {
    let baseCategoryName = '';
    let specificTypeName = '';

    if (formData.selectedMaterialCategory === 'paint') {
      baseCategoryName = 'עבודת צבע';
      specificTypeName = paintTypes.find(type => type.id === formData.paintType)?.name || '';
    } else if (formData.selectedMaterialCategory === 'plaster') {
      baseCategoryName = 'עבודת שפכטל';
      specificTypeName = plasterTypes.find(type => type.id === formData.plasterType)?.name || '';
    }

    if (specificTypeName) {
      return `${baseCategoryName} ${specificTypeName}`.trim();
    } else if (baseCategoryName) {
      return baseCategoryName;
    }
    return 'פריט חדש';
  }, [formData.selectedMaterialCategory, formData.paintType, formData.plasterType, paintTypes, plasterTypes]);

  const isEditMode = !!editItem;

  useEffect(() => {
    const loadCustomTypes = () => {
      try {
        if (user?.user_metadata?.customPaintTypes) {
          setPaintTypes(user.user_metadata.customPaintTypes);
        } else {
          setPaintTypes(DEFAULT_PAINT_TYPES);
        }
        if (user?.user_metadata?.customPlasterTypes) {
          setPlasterTypes(user.user_metadata.customPlasterTypes);
        } else {
          setPlasterTypes(DEFAULT_PLASTER_TYPES);
        }
      } catch (error) {
        console.error("Failed to load user custom types:", error);
        setPaintTypes(DEFAULT_PAINT_TYPES);
        setPlasterTypes(DEFAULT_PLASTER_TYPES);
      } finally {
        setUserDataLoaded(true);
      }
    };

    if (user) {
      loadCustomTypes();
    }
  }, [user]);

  useEffect(() => {
    const loadSavedPreferences = () => {
      try {
        if (user?.user_metadata?.paintWorkCategoryPreference && !editItem) {
          setFormData(prev => ({
            ...prev,
            workCategory: user.user_metadata.paintWorkCategoryPreference
          }));
        }
      } catch (error) {
        console.log('Could not load work category preference:', error);
      }
    };

    if (user) {
      loadSavedPreferences();
    }
  }, [user, editItem]);

  // HIDE legacy "Selected work type" banner that shows "נבחר: ..."
  useEffect(() => {
    const hideLegacySelectedBanner = () => {
      try {
        const nodes = Array.from(document.querySelectorAll('div,section,aside,article'));
        nodes.forEach((n) => {
          const txt = (n.textContent || '').trim();
          // Hide blocks that start with "נבחר:" and refer to work type (צבע/שפכטל)
          if (/^נבחר[:\s]/.test(txt) && (txt.includes('עבוד') || txt.includes('צבע') || txt.includes('שפכט'))) {
            // only hide container-like elements with noticeable size to avoid touching small labels
            const rect = n.getBoundingClientRect?.();
            if (rect && rect.height > 20 && rect.width > 100) {
              n.style.display = 'none';
              n.setAttribute('data-legacy-selected-banner-hidden', 'true');
            }
          } // FIX: Added missing closing brace for the forEach callback
        });
      } catch (e) {
        // no-op
      }
    };

    hideLegacySelectedBanner();
    const mo = new MutationObserver(() => hideLegacySelectedBanner());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  const handleSavePaintTypes = async (updatedTypes) => {
    try {
        if (typeof UserEntity.updateMyUserData === 'function') {
          await UserEntity.updateMyUserData({ customPaintTypes: updatedTypes });
          setPaintTypes(updatedTypes);
        } else {
          console.log('User.updateMyUserData not available - backend not connected');
          setPaintTypes(updatedTypes);
        }
    } catch (error) {
        console.error("Failed to save custom paint types:", error);
    }
  };

  const handleSavePlasterTypes = async (updatedTypes) => {
    try {
        if (typeof UserEntity.updateMyUserData === 'function') {
          await UserEntity.updateMyUserData({ customPlasterTypes: updatedTypes });
          setPlasterTypes(updatedTypes);
        } else {
          console.log('User.updateMyUserData not available - backend not connected');
          setPlasterTypes(updatedTypes);
        }
    } catch (error) {
        console.error("Failed to save custom plaster types:", error);
    }
  };

  // ADDED: confirm add paint type handler
  const handleConfirmAddPaintType = async () => {
    const name = (newPaintTypeName || '').trim();
    if (!name) {
      alert('נא להזין שם סוג צבע');
      return;
    }
    if (paintTypes.some(t => (t.name || '').trim() === name)) {
      alert('סוג צבע בשם זה כבר קיים');
      return;
    }
    const newType = { id: `custom_${Date.now()}`, name };
    const updated = [...paintTypes, newType];
    try {
      if (typeof UserEntity.updateMyUserData === 'function') {
        await UserEntity.updateMyUserData({ customPaintTypes: updated });
      }
    } catch (e) {
      // keep silent - state will still update locally
      console.error("Failed to save custom paint type:", e);
    }
    setPaintTypes(updated);
    setFormData(prev => ({ ...prev, paintType: newType.id }));
    setIsAddPaintTypeOpen(false);
    setNewPaintTypeName('');
  };

  // ADDED: confirm add plaster type handler
  const handleConfirmAddPlasterType = async () => {
    const name = (newPlasterTypeName || '').trim();
    if (!name) {
      alert('נא להזין שם סוג שפכטל');
      return;
    }
    if (plasterTypes.some(t => (t.name || '').trim() === name)) {
      alert('סוג שפכטל בשם זה כבר קיים');
      return;
    }
    const newType = { id: `custom_${Date.now()}`, name };
    const updated = [...plasterTypes, newType];
    try {
      if (typeof UserEntity.updateMyUserData === 'function') {
        await UserEntity.updateMyUserData({ customPlasterTypes: updated });
      }
    } catch (e) {
      console.error("Failed to save custom plaster type:", e);
    }
    setPlasterTypes(updated);
    setFormData(prev => ({ ...prev, plasterType: newType.id }));
    setIsAddPlasterTypeOpen(false);
    setNewPlasterTypeName('');
  };

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => {
      const updatedData = { ...prev, [field]: value };
      if (field === 'selectedMaterialCategory') {
        updatedData.paintType = value === 'plaster' ? '' : prev.paintType;
        updatedData.plasterType = value === 'paint' ? '' : prev.plasterType;
        updatedData.workCategory = (value && WORK_TYPES[value]?.some(t => t.id === prev.workCategory)) ? prev.workCategory : '';
        // Reset unitType to default 'דלי' if switching to paint
        if (value === 'paint') {
          updatedData.unitType = 'דלי';
        }
      }
      return updatedData;
    });
  }, []);

  const handleWorkCategoryChange = (value) => {
    // Just update local state - work category will be saved with the paint item
    setFormData(prev => ({ ...prev, workCategory: value }));
  };
  
  const quickMetrics = useMemo(() => {
    const { indicativeQuantity, indicativeLayers } = quickPricingMode;
    const desiredProfitPercent =
      (formData.desiredProfitPercent !== '' && formData.desiredProfitPercent !== undefined)
        ? Number(formData.desiredProfitPercent)
        : Number(userPaintDefaults?.desiredProfitPercent || 0);

    if (!indicativeQuantity || indicativeQuantity <= 0 || !indicativeLayers || indicativeLayers <= 0 || !desiredProfitPercent || desiredProfitPercent <= 0) {
      return null;
    }

    // ensure workerDailyCost comes from defaults if not set
    const fd = {
      ...formData,
      workerDailyCost: Number(formData.workerDailyCost || userPaintDefaults?.workerDailyCost || 0)
    };
    return calculateInternalPaintMetrics(fd, indicativeQuantity, indicativeLayers, desiredProfitPercent, roundBucketCost, roundWorkDays);
  }, [formData, quickPricingMode, roundBucketCost, roundWorkDays, userPaintDefaults]);

  // EFFECTIVE desired profit for display (shows default when field empty)
  const displayDesiredProfit = (formData.desiredProfitPercent !== '' && formData.desiredProfitPercent !== undefined)
    ? Number(formData.desiredProfitPercent)
    : (userPaintDefaults?.desiredProfitPercent ?? '');

  const calculateActualCoverage = useCallback((targetLayerIndex) => {
    const baseCoverage = Number(formData.layerSettings[0]?.coverage) || 0;
    if (baseCoverage <= 0) return 0;

    let effectiveCoverage = baseCoverage;
    for (let i = 1; i <= targetLayerIndex; i++) {
        if (i < formData.layerSettings.length) { 
            const coverageChangePercent = Number(formData.layerSettings[i].coverage) || 0; // This is a percentage change
            effectiveCoverage *= (1 + coverageChangePercent / 100);
        } else {
            break; 
        }
    }
    return effectiveCoverage;
  }, [formData.layerSettings]);

  const calculateActualOutput = useCallback((targetLayerIndex) => {
    const baseDailyOutput = Number(formData.layerSettings[0]?.dailyOutput) || 0;
    if (baseDailyOutput <= 0) return 0;

    let effectiveOutput = baseDailyOutput;
    for (let i = 1; i <= targetLayerIndex; i++) {
        if (i < formData.layerSettings.length) { 
            const outputChangePercent = Number(formData.layerSettings[i].discountPercent) || 0; // This is a percentage change
            effectiveOutput *= (1 + outputChangePercent / 100);
        } else {
            break;
        }
    }
    return effectiveOutput;
  }, [formData.layerSettings]);

  // NEW: smart number formatter to avoid trailing .0 and keep 1 decimal only when needed
  const formatSmart = useCallback((val) => {
    const n = Number(val);
    if (!isFinite(n)) return '';
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded.toFixed(1));
  }, []);

  const handleUpdateLayer = (index, field, value) => {
    setFormData(prev => ({ 
      ...prev, 
      layerSettings: prev.layerSettings.map((layer, i) => {
        if (i === index) {
          // Special handling for coverage and dailyOutput on layer 0 to allow empty string
          if (index === 0 && (field === 'coverage' || field === 'dailyOutput')) {
            return { ...layer, [field]: value === '' ? '' : Number(value) };
          }
          // For all other cases (percentage changes or non-layer 0 updates)
          return { ...layer, [field]: Number(value) };
        }
        return layer;
      }) 
    }));
  };

  // NEW: Update layer using absolute value (converts back to percent so storage stays identical)
  const handleUpdateLayerAbsolute = (index, field, rawValue) => {
    const value = rawValue === '' ? '' : Number(rawValue);

    if (index === 0) {
      // Base layer uses direct absolute values
      handleUpdateLayer(index, field === 'coverage' ? 'coverage' : 'dailyOutput', rawValue);
      return;
    }

    setFormData(prev => {
      const ls = prev.layerSettings || [];

      // effective calculators based on local ls (not from outer state)
      const getEffectiveCoverageAt = (targetIdx) => {
        const base = Number(ls[0]?.coverage) || 0;
        if (base <= 0) return 0;
        let eff = base;
        for (let i = 1; i <= targetIdx; i++) {
          if (i < ls.length) {
            const pct = Number(ls[i]?.coverage || 0);
            eff *= (1 + (pct / 100));
          }
        }
        return eff;
      };
      const getEffectiveOutputAt = (targetIdx) => {
        const base = Number(ls[0]?.dailyOutput) || 0;
        if (base <= 0) return 0;
        let eff = base;
        for (let i = 1; i <= targetIdx; i++) {
          if (i < ls.length) {
            const pct = Number(ls[i]?.discountPercent || 0);
            eff *= (1 + (pct / 100));
          }
        }
        return eff;
      };

      const prevEff = field === 'coverage'
        ? getEffectiveCoverageAt(index - 1)
        : getEffectiveOutputAt(index - 1);

      let percentChange = 0; // Default to 0% change if calculation fails or value is empty/invalid
      if (value !== '' && !isNaN(value) && isFinite(value) && prevEff > 0) {
        percentChange = ((Number(value) / prevEff) - 1) * 100;
      } else if (value !== '') { // If a non-empty, but invalid value is entered, default to some reasonable percentage, or clear
          // For now, if prevEff is 0 but an absolute value is entered, we can't calculate % accurately.
          // This implies base layer values are missing/zero. We'll rely on form validation for base layer.
          // If value is not empty, but prevEff is 0, we can't derive a meaningful percentage.
          // Let's set it to 0% change, essentially making this layer's output same as prev (which would be 0).
          // This case should ideally not happen if base layer validation is strict.
          percentChange = 0;
      }


      const newLayerSettings = ls.map((layer, i) => {
        if (i !== index) return layer;
        if (field === 'coverage') {
          return { ...layer, coverage: Number(percentChange) };
        } else {
          return { ...layer, discountPercent: Number(percentChange) };
        }
      });

      return { ...prev, layerSettings: newLayerSettings };
    });
  };

  // CHANGE: When adding a new layer, default to +20% on both coverage and output
  const handleAddLayer = () => {
    setFormData(prev => ({
      ...prev,
      layerSettings: [
        ...prev.layerSettings,
        { layer: prev.layerSettings.length + 1, name: `שכבה ${prev.layerSettings.length + 1}`, coverage: 20, discountPercent: 20, dailyOutput: 0 }
      ],
      layers: prev.layerSettings.length + 1
    }));
  };

  const handleRemoveLayer = (index) => {
    setFormData(prev => {
      const newLayerSettings = prev.layerSettings.filter((_, i) => i !== index).map((layer, i) => ({ ...layer, layer: i + 1, name: `שכבה ${i + 1}` }));
      const newLayersCount = newLayerSettings.length;
      
      const updatedPriceTiers = prev.priceTiers.map(tier => ({ 
        ...tier, 
        selectedLayers: Math.min(tier.selectedLayers, newLayersCount) || 1,
      }));
      
      setQuickPricingMode(prevQuick => ({
        ...prevQuick,
        indicativeLayers: Math.min(prevQuick.indicativeLayers, newLayersCount) || 1
      }));
      
      return { ...prev, layerSettings: newLayerSettings, layers: newLayersCount, priceTiers: updatedPriceTiers };
    });
  };

  const validateForm = () => {
    const errors = [];
    const desiredProfitPercent = (formData.desiredProfitPercent !== '' && formData.desiredProfitPercent !== undefined)
      ? Number(formData.desiredProfitPercent)
      : Number(userPaintDefaults?.desiredProfitPercent || 0);

    if (!formData.selectedMaterialCategory) {
      errors.push('חובה לבחור קטגוריית חומר (צבע או שפכטל)');
    } else {
      if (formData.selectedMaterialCategory === 'paint' && (!formData.paintType || formData.paintType === '')) {
        errors.push('חובה לבחור סוג צבע');
      }
      if (formData.selectedMaterialCategory === 'plaster' && (!formData.plasterType || formData.plasterType === '') ) {
        errors.push('חובה לבחור סוג שפכטל');
      }
    }
    
    if (!formData.workCategory || formData.workCategory === '') {
      errors.push('חובה לבחור סוג עבודה');
    }

    // Check for layerSettings[0] coverage and dailyOutput
    const firstLayerCoverage = Number(formData.layerSettings[0]?.coverage);
    if (isNaN(firstLayerCoverage) || firstLayerCoverage <= 0) {
        errors.push(`שדה "כושר כיסוי ל${formData.selectedMaterialCategory === 'plaster' ? formData.unitType : 'דלי'}" הוא שדה חובה וח חייב להיות גדול מ-0`);
    }

    const firstLayerDailyOutput = Number(formData.layerSettings[0]?.dailyOutput);
    if (isNaN(firstLayerDailyOutput) || firstLayerDailyOutput <= 0) {
        errors.push('שדה "הספק יומי של פועל" הוא שדה חובה וחייב להיות גדול מ-0');
    }

    if (!formData.bucketPrice || formData.bucketPrice <= 0) {
      errors.push(`שדה "מחיר ל${formData.selectedMaterialCategory === 'plaster' ? formData.unitType : 'דלי'}" הוא שדה חובה וחייב להיות גדול מ-0`);
    }

    const effectiveWorkerDailyCost = Number(formData.workerDailyCost || userPaintDefaults?.workerDailyCost || 0);
    if (effectiveWorkerDailyCost <= 0) {
      errors.push('יש להגדיר "עלות פועל ליום" בבלוק ברירות המחדל של צבע/שפכטל.');
    }

    if (desiredProfitPercent <= 0) {
        errors.push('יש להגדיר אחוז רווח חיובי (בפריט או בברירת המחדל).');
    }

    return errors;
  };

  const handleSaveItem = async () => {
    const validationErrors = validateForm();
    
    if (validationErrors.length > 0) {
      const errorMessage = 'נמצאו השגיאות הבאות:\n\n' + validationErrors.join('\n');
      alert(errorMessage);
      return;
    }

    try {
        if (!quickMetrics) {
            alert('שגיאה בחישוב מדדי מחיר לשמירה. ודא שכל השדות הוזנו כראוי.');
            return;
        }

        const savedPriceTiers = [{
            squareMeters: quickPricingMode.indicativeQuantity,
            selectedLayers: quickPricingMode.indicativeLayers,
            pricesByLayer: { [quickPricingMode.indicativeLayers]: quickMetrics.sellingPrice },
            profit: quickMetrics.profitPercentage.toFixed(1),
            costPerSqm: quickMetrics.costPerMeter.toFixed(1),
            profitPerSqm: quickMetrics.profitPerMeter, // This is already fixed to be a number
            details: {
              materialCostPerSqm: quickPricingMode.indicativeQuantity > 0 ? quickMetrics.totalMaterialCost / quickPricingMode.indicativeQuantity : 0,
              laborCostPerSqm: quickPricingMode.indicativeQuantity > 0 ? quickMetrics.totalLaborCost / quickPricingMode.indicativeQuantity : 0,
              equipmentCostPerSqm: quickPricingMode.indicativeQuantity > 0 ? quickMetrics.totalOtherCosts / quickPricingMode.indicativeQuantity : 0,
              workDays: quickMetrics.finalWorkDays,
            }
        }];

        const finalDesiredProfitPercent = (formData.desiredProfitPercent !== '' && formData.desiredProfitPercent !== undefined)
          ? Number(formData.desiredProfitPercent)
          : Number(userPaintDefaults?.desiredProfitPercent || 0);
        const avgCostPerSqm = quickMetrics.costPerMeter;
        const avgCustomerPrice = quickMetrics.pricePerMeter;
        const avgProfitPerSqm = Number(quickMetrics.profitPerMeter); // Ensure this is a number from the calculation
        const avgProfitPercent = quickMetrics.profitPercentage;

        const newItem = {
            id: formData.id || editItem?.id || `paint_${Date.now()}`,
            itemName: getAutoGeneratedItemName(),
            paintName: formData.selectedMaterialCategory === 'paint' ? (paintTypes.find(p => p.id === formData.paintType)?.name || '') : '',
            plasterName: formData.selectedMaterialCategory === 'plaster' ? (plasterTypes.find(p => p.id === formData.plasterType)?.name || '') : '',
            
            paintType: formData.paintType,
            plasterType: formData.plasterType,
            type: formData.paintType || formData.plasterType || '',
            
            category: 'paint_plaster',
            unit: 'מ"ר',
            
            materialCost: formData.bucketPrice || 0,
            laborCost: Number(formData.workerDailyCost || userPaintDefaults?.workerDailyCost || 0),
            additionalCost: Number(formData.equipmentCost) || 0,
            
            coverage: formData.layerSettings[0]?.coverage, // Now from layerSettings[0]
            bucketLiters: formData.bucketLiters,
            unitType: formData.unitType,
            workCategory: formData.workCategory,
            dailyOutput: formData.layerSettings[0]?.dailyOutput, // Now from layerSettings[0]
            difficultyFactors: formData.difficultyFactors,
            selectedDifficulty: formData.selectedDifficulty,
            layers: formData.layerSettings.length,
            layerSettings: formData.layerSettings.map(layer => ({
              layer: layer.layer,
              name: layer.name,
              coverage: Number(layer.coverage) || 0, // This is base for layer 0, percentage for others
              discountPercent: Number(layer.discountPercent) || 0, // This is 0 for layer 0, percentage for others
              dailyOutput: Number(layer.dailyOutput) || 0 // Only relevant for layer 0
            })),
            priceTiers: savedPriceTiers, 

            averageCustomerPrice: Number(avgCustomerPrice.toFixed(2)),
            averageCostPerMeter: Number(avgCostPerSqm.toFixed(2)),
            averageProfitPerMeter: Number(avgProfitPerSqm.toFixed(2)),
            averageProfitPercent: Number(avgProfitPercent.toFixed(1)),
            
            bucketPrice: formData.bucketPrice,
            workerDailyCost: Number(formData.workerDailyCost || userPaintDefaults?.workerDailyCost || 0),
            equipmentCost: formData.equipmentCost,
            roundBucketCost: roundBucketCost,
            roundWorkDays: roundWorkDays,
            
            generalDescription: formData.generalDescription || '',
            executionNotes: formData.executionNotes || '',
            limitations: formData.limitations || '',
            customerPrice: Number(avgCustomerPrice.toFixed(2)),
            totalCost: Number(avgCostPerSqm.toFixed(2)),
            profit: Number(avgProfitPercent.toFixed(1)),
            profitPerSqm: Number(avgProfitPerSqm.toFixed(2)),
            pricingMethod: 'quick',
            desiredProfitPercent: finalDesiredProfitPercent 
        };

        await onSubmit(newItem);
    } catch (error) {
        console.error("שגיאה בשמירת פריט צבע:", error);
        alert('שגיאה בשמירת הנתונים');
    }
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <Card className="max-w-full">
        {/* עדכון הכותרת: הכפתור בכחול בצד ימין למעלה */}
        <CardHeader className="relative flex flex-row items-center justify-center border-b bg-gray-50 p-4">
          <CardTitle className="text-xl">
            {isEditMode ? `עריכת פריט: ${getAutoGeneratedItemName()}` : `הוספת פריט חדש: ${getAutoGeneratedItemName()}`}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onCancel}
            className="absolute top-3 right-3 h-11 w-11 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
          >
            <X className="h-6 w-6" />
            <span className="sr-only">סגור</span>
          </Button>
        </CardHeader>

        <CardContent className="pt-6 max-h-[calc(100vh-12rem)] overflow-y-auto px-4 md:px-6 lg:px-8"> 
          <div className="space-y-8 max-w-none" dir="rtl">
            {/* ====== Section 1: General Details ====== */}
            <div className="space-y-6">
              <CategoryHeader number="1" title="פרטים כלליים" colorScheme="indigo" />
              
              {/* Category Selection Status Bar */}
              <div className={cn(
                "w-full p-4 rounded-lg border-2 transition-all duration-300",
                !formData.selectedMaterialCategory 
                  ? "bg-red-50 border-red-300 text-red-800" 
                  : "bg-green-50 border-green-300 text-green-800"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      !formData.selectedMaterialCategory 
                        ? "bg-red-500 animate-pulse" 
                        : "bg-green-500"
                    )}></div>
                    <span className="font-bold text-lg">
                      {!formData.selectedMaterialCategory 
                        ? "בחר קטגוריה" 
                        : `נבחר: ${formData.selectedMaterialCategory === 'paint' ? 'עבודות צבע' : 'שפכטל'}`
                      }
                    </span>
                  </div>
                  {formData.selectedMaterialCategory && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>✓</span>
                      <span className="font-medium">קטגוריה נבחרה</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Material Category Selection - Enhanced Design */}
              {!presetCategory && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-full mx-auto">
                  {/* Paint Category */}
                  <div
                    onClick={() => handleInputChange('selectedMaterialCategory', 'paint')}
                    className={cn(
                      "group cursor-pointer transition-all duration-300 hover:scale-105",
                      formData.selectedMaterialCategory === 'paint' && "scale-105"
                    )}
                  >
                    <Card className={cn(
                      "h-full border-2 transition-all duration-300 hover:shadow-lg rounded-xl",
                      formData.selectedMaterialCategory === 'paint'
                        ? "border-blue-400 bg-blue-50 shadow-lg"
                        : "border-gray-200 hover:border-blue-300 bg-white shadow-sm hover:shadow-md"
                    )}>
                      <CardHeader className="text-center pb-2 pt-6">
                        <div className={cn(
                          "mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-all duration-300",
                          formData.selectedMaterialCategory === 'paint'
                            ? "bg-blue-500 shadow-md"
                            : "bg-blue-100 group-hover:bg-blue-200"
                        )}>
                          <Paintbrush className="w-6 h-6 transition-all duration-300"
                            color={formData.selectedMaterialCategory === 'paint' ? "white" : "#3b82f6"}
                          />
                        </div>
                        <CardTitle className={cn(
                          "text-xl font-bold transition-all duration-300",
                          formData.selectedMaterialCategory === 'paint'
                            ? "text-blue-700"
                            : "text-gray-700 group-hover:text-blue-600"
                        )}>
                          עבודות צבע
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500">
                          אקרילי, סופרקריל, שמן, אפקטים ועוד
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 pb-6">
                        <div className="text-center">
                          {formData.selectedMaterialCategory === 'paint' && (
                            <Badge className="bg-blue-100 text-blue-800 font-medium text-sm px-4 py-2">
                              ✓ נבחר
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Plaster Category - Changed name to שפכטל and color to gray */}
                  <div
                    onClick={() => handleInputChange('selectedMaterialCategory', 'plaster')}
                    className={cn(
                      "group cursor-pointer transition-all duration-300 hover:scale-105",
                      formData.selectedMaterialCategory === 'plaster' && "scale-105"
                    )}
                  >
                    <Card className={cn(
                      "h-full border-2 transition-all duration-300 hover:shadow-lg rounded-xl",
                      formData.selectedMaterialCategory === 'plaster'
                        ? "border-gray-400 bg-gray-50 shadow-lg"
                        : "border-gray-200 hover:border-gray-300 bg-white shadow-sm hover:shadow-md"
                    )}>
                      <CardHeader className="text-center pb-2 pt-6">
                        <div className={cn(
                          "mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-all duration-300",
                          formData.selectedMaterialCategory === 'plaster'
                            ? "bg-gray-500 shadow-md"
                            : "bg-gray-100 group-hover:bg-gray-200"
                        )}>
                          <Layers className="w-6 h-6 transition-all duration-300"
                            color={formData.selectedMaterialCategory === 'plaster' ? "white" : "#64748b"}
                          />
                        </div>
                        <CardTitle className={cn(
                          "text-xl font-bold transition-all duration-300",
                          formData.selectedMaterialCategory === 'plaster'
                            ? "text-gray-700"
                            : "text-gray-700 group-hover:text-gray-600"
                        )}>
                          שפכטל
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500">
                          טיח פנים, שפכטל גמר, הכנת קירות וע עוד
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 pb-6">
                        <div className="text-center">
                          {formData.selectedMaterialCategory === 'plaster' && (
                            <Badge className="bg-gray-100 text-gray-800 font-medium text-sm px-4 py-2">
                              ✓ נבחר
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Display auto-generated name preview */}
                {formData.selectedMaterialCategory && (formData.paintType || formData.plasterType) && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-600 mb-1">שם הפריט שיוצג:</p>
                        <p className="font-bold text-lg text-gray-800">{getAutoGeneratedItemName()}</p>
                    </div>
                )}

                {/* General Description */}
                {formData.selectedMaterialCategory && (
                  <div className="mt-6">
                    <Label htmlFor="generalDescription">תיאור כללי / הערות לפריט</Label>
                    <Textarea 
                      id="generalDescription"
                      name="generalDescription"
                      value={formData.generalDescription || ''}
                      onChange={(e) => handleInputChange('generalDescription', e.target.value)}
                      placeholder="הוסף פרטים נוספים כגון יצרן, דגם ספציפי, הערות התקנה חשובות..."
                      className="mt-1 min-h-[80px] bg-white border-gray-200 focus:border-slate-400"
                    />
                  </div>
                )}
              </div>
              )}
              
              {/* Conditional Paint Type Selection and Management - UPDATED UI + merge work type */}
              {formData.selectedMaterialCategory === 'paint' && (
                <div
                  className={cn(
                    "p-5 rounded-xl border transition-all duration-300 bg-white", // CHANGED: thin border, white bg
                    (!formData.paintType || formData.paintType === "")
                      ? "border-red-300"
                      : "border-blue-300" // CHANGED: only blue border
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          (!formData.paintType || formData.paintType === "")
                            ? "bg-red-500 animate-pulse"
                            : "bg-green-500"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <Palette className="w-4 h-4 ml-1" />
                          בחר סוג צבע
                        </span>
                        <span className="text-xs text-gray-500">
                          {formData.paintType
                            ? `נבחר: ${paintTypes.find(t => t.id === formData.paintType)?.name || ""}`
                            : "נא לבחור סוג צבע להמשך"}
                        </span>
                      </div>
                    </div>

                    {/* ACTIONS: Manage + Add (unchanged) */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 text-sm border-blue-300 hover:bg-blue-50" // subtle hover
                        onClick={(e) => { e.stopPropagation(); setIsPaintTypeDialogOpen(true); }}
                      >
                        <Settings className="w-4 h-4 ml-1" />
                        ניהול
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 px-3 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={(e) => { e.stopPropagation(); setIsAddPaintTypeOpen(true); }}
                      >
                        <Plus className="w-4 h-4 ml-1" />
                        הוספה
                      </Button>
                    </div>
                  </div>

                  {/* Paint type options grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {userDataLoaded && paintTypes
                      .filter(type => type.id && type.id.trim() !== '')
                      .map((type) => {
                        const selected = formData.paintType === type.id;
                        return (
                          <button
                            type="button"
                            key={type.id}
                            onClick={() => handleInputChange('paintType', type.id)}
                            className={cn(
                              "relative flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all",
                              selected
                                ? "border-blue-500 bg-white ring-2 ring-blue-200 shadow-sm"
                                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                            )}
                          >
                            <span className={cn("font-medium", selected ? "text-blue-700" : "text-gray-800")}>
                              {type.name}
                            </span>
                            {selected && <CheckCircle className="w-4 h-4 text-blue-600" />}
                          </button>
                        );
                      })}
                    {!userDataLoaded && (
                      <div className="col-span-full text-sm text-gray-500">טוען סוגים...</div>
                    )}
                  </div>

                  {!formData.paintType && (
                    <p className="text-xs text-red-600 mt-2">נא לבחור סוג צבע להמשך</p>
                  )}

                  {/* NEW: merged work-type selection into the same block */}
                  <Separator className="my-5" />
                  <Label className="text-sm font-medium text-gray-700 block mb-2">סוג עבודת צבע</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {(WORK_TYPES['paint'] || []).map((type) => (
                      <div
                        key={type.id}
                        onClick={() => handleWorkCategoryChange(type.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all h-20",
                          formData.workCategory === type.id
                            ? "bg-indigo-600 border-indigo-700 text-white shadow-lg"
                            : "bg-white border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                        )}
                      >
                        {type.icon}
                        <span className="text-xs font-semibold mt-1">{type.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Plaster Type Selection and Management - REPLACED UI TO MATCH PAINT */}
              {formData.selectedMaterialCategory === 'plaster' && (
                <div
                  className={cn(
                    "p-5 rounded-xl border transition-all duration-300 bg-white",
                    (!formData.plasterType || formData.plasterType === "")
                      ? "border-red-300"
                      : "border-gray-300" // Use gray for plaster theme
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          (!formData.plasterType || formData.plasterType === "")
                            ? "bg-red-500 animate-pulse"
                            : "bg-green-500" // Still green for "selected" status dot
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <Layers className="w-4 h-4 ml-1" />
                          בחר סוג שפכטל
                        </span>
                        <span className="text-xs text-gray-500">
                          {formData.plasterType
                            ? `נבחר: ${plasterTypes.find(t => t.id === formData.plasterType)?.name || ""}`
                            : "נא לבחור סוג שפכטל להמשך"}
                        </span>
                      </div>
                    </div>

                    {/* ACTIONS: Manage + Add */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 text-sm border-gray-300 hover:bg-gray-50" // Adjusted colors for plaster theme
                        onClick={(e) => { e.stopPropagation(); setIsPlasterTypeDialogOpen(true); }}
                      >
                        <Settings className="w-4 h-4 ml-1" />
                        ניהול
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 px-3 text-sm bg-gray-700 hover:bg-gray-800 text-white" // Adjusted colors for plaster theme
                        onClick={(e) => { e.stopPropagation(); setIsAddPlasterTypeOpen(true); }}
                      >
                        <Plus className="w-4 h-4 ml-1" />
                        הוספה
                      </Button>
                    </div>
                  </div>

                  {/* Plaster type options grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {userDataLoaded && plasterTypes
                      .filter(type => type.id && type.id.trim() !== '')
                      .map((type) => {
                        const selected = formData.plasterType === type.id;
                        return (
                          <button
                            type="button"
                            key={type.id}
                            onClick={() => handleInputChange('plasterType', type.id)}
                            className={cn(
                              "relative flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all",
                              selected
                                ? "border-gray-600 bg-white ring-2 ring-gray-200 shadow-sm" // Adjusted colors for plaster theme
                                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60" // Adjusted colors for plaster theme
                            )}
                          >
                            <span className={cn("font-medium", selected ? "text-gray-800" : "text-gray-800")}>
                              {type.name}
                            </span>
                            {selected && <CheckCircle className="w-4 h-4 text-gray-700" />} {/* Adjusted colors */}
                          </button>
                        );
                      })}
                    {!userDataLoaded && (
                      <div className="col-span-full text-sm text-gray-500">טוען סוגים...</div>
                    )}
                  </div>

                  {!formData.plasterType && (
                    <p className="text-xs text-red-600 mt-2">נא לבחור סוג שפכטל להמשך</p>
                  )}

                  {/* NEW: merged work-type selection into the same block */}
                  <Separator className="my-5" />
                  <Label className="text-sm font-medium text-gray-700 block mb-2">סוג עבודת שפכטל</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {(WORK_TYPES['plaster'] || []).map((type) => (
                      <div
                        key={type.id}
                        onClick={() => handleWorkCategoryChange(type.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all h-20",
                          formData.workCategory === type.id
                            ? "bg-indigo-600 border-indigo-700 text-white shadow-lg"
                            : "bg-white border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                        )}
                      >
                        {type.icon}
                        <span className="text-xs font-semibold mt-1">{type.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-8" />
            
            {/* ====== Section 2: Materials and Costs ====== */}
            <div className="space-y-6">
              <CategoryHeader number="2" title="חומרים ועלויות" colorScheme="blue" />
              
              <div className="w-full flex justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
                 {/* Card for Bucket Price */}
                 <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                     <div className="flex items-center gap-4">
                         <div className="p-4 bg-blue-100 rounded-lg">
                             <PaintBucket className="w-8 h-8 text-blue-600" />
                         </div>
                         <div className="flex-1">
                             <div className="flex items-center justify-between mb-2">
                                 <Label htmlFor="bucketPrice" className="text-base font-medium text-gray-600">
                                     מחיר ל{formData.selectedMaterialCategory === 'plaster' ? formData.unitType : 'דלי'}
                                 </Label>
                                 {formData.selectedMaterialCategory === 'plaster' && (
                                     <div className="flex bg-gray-100 rounded-lg p-1 text-xs">
                                         <button
                                             type="button"
                                             onClick={() => handleInputChange('unitType', 'דלי')}
                                             className={`px-2 py-1 rounded transition-all ${
                                                 formData.unitType === 'דלי' 
                                                     ? 'bg-white text-blue-600 shadow-sm' 
                                                     : 'text-gray-600 hover:text-gray-800'
                                             }`}
                                         >
                                             דלי
                                         </button>
                                         <button
                                             type="button"
                                             onClick={() => handleInputChange('unitType', 'שק')}
                                             className={`px-2 py-1 rounded transition-all ${
                                                 formData.unitType === 'שק' 
                                                     ? 'bg-white text-blue-600 shadow-sm' 
                                                     : 'text-gray-600 hover:text-gray-800'
                                             }`}
                                         >
                                             שק
                                         </button>
                                     </div>
                                 )}
                             </div>
                             <div className="relative">
                                 <Input 
                                     id="bucketPrice" 
                                     name="bucketPrice" 
                                     type="number" 
                                     value={formData.bucketPrice || ''} 
                                     onChange={(e) => handleInputChange('bucketPrice', e.target.value)} 
                                     className="text-2xl font-bold border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 pl-8 bg-transparent"
                                     placeholder="0"
                                 />
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">₪</span>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Card for Equipment Cost - Added info tooltip */}
                 <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                     <div className="flex items-center gap-4">
                         <div className="p-4 bg-yellow-100 rounded-lg">
                             <Wrench className="w-8 h-8 text-yellow-600" />
                         </div>
                         <div className="flex-1">
                             <div className="flex items-center gap-2">
                                 <Label htmlFor="equipmentCost" className="text-base font-medium text-gray-600">עלות ציוד קבועה</Label>
                                 <Tooltip delayDuration={0}>
                                     <TooltipTrigger asChild>
                                         <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-help text-xs font-bold hover:bg-blue-600 transition-colors">
                                             i
                                         </div>
                                     </TooltipTrigger>
                                     <TooltipContent side="top" className="max-w-xs bg-gray-800 text-white p-3 rounded-lg border-none">
                                         <p className="font-bold text-sm">עלות קבועה היא הרולר, המגש, זמן ההקמה לתחילת העבודה.</p>
                                     </TooltipContent>
                                 </Tooltip>
                             </div>
                             <div className="relative mt-2">
                                 <Input 
                                     id="equipmentCost" 
                                     name="equipmentCost" 
                                     type="number" 
                                     value={formData.equipmentCost || ''} 
                                     onChange={(e) => handleInputChange('equipmentCost', e.target.value)} 
                                     className="text-2xl font-bold border-0 border-b-2 border-gray-200 focus:border-yellow-500 focus:ring-0 pl-8 bg-transparent"
                                     placeholder="0"
                                 />
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">₪</span>
                             </div>
                         </div>
                     </div>
                 </div>
               </div>
             </div>
            </div>

            <Separator className="my-8" />
            
            {/* ====== Section 3: Layers & Execution ====== */}
            <div className="space-y-6">
              <CategoryHeader number="3" title="שכבות וביצוע" colorScheme="green" />
              
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-lg font-medium text-gray-700">הגדרות שכבות</Label>
                      <p className="text-sm text-gray-600 mt-1">נא למלא כושר כיסוי והספק יומי בשכבה הבסיסית</p>
                    </div>
                </div>

                {formData.layerSettings.map((layerData, index) => {
                  const layerNumber = index + 1;
                  const isBaseLayer = index === 0;
                  const isPlaster = formData.selectedMaterialCategory === 'plaster';
                  const highlightColorClass = formData.selectedMaterialCategory === 'paint' ? 'text-blue-600' : 'text-gray-600';

                  // Define specific background colors for each layer
                  const layerBgColors = [
                    'bg-gray-50',   // Layer 1 (lightest)
                    'bg-gray-100',  // Layer 2
                    'bg-gray-200',  // Layer 3
                    'bg-gray-300'   // Layer 4
                  ];
                  const bgColorClass = layerBgColors[index] || 'bg-gray-400'; // Default for more than 4 layers, darker

                  // Determine border classes for layer 0 inputs (required)
                  const firstLayerCoverageValue = Number(formData.layerSettings[0]?.coverage);
                  const firstLayerDailyOutputValue = Number(formData.layerSettings[0]?.dailyOutput);
                  const coverageBorderClass = isBaseLayer
                    ? (firstLayerCoverageValue > 0 ? 'border-green-300 focus:border-green-500' : 'border-red-300 focus:border-red-500')
                    : 'border-gray-300 focus:border-indigo-500';
                  const outputBorderClass = isBaseLayer
                    ? (firstLayerDailyOutputValue > 0 ? 'border-green-300 focus:border-green-500' : 'border-red-300 focus:border-red-500')
                    : 'border-gray-300 focus:border-indigo-500';

                  return (
                    <Card key={`layer-${index}`} className={cn("bg-white border shadow-sm overflow-hidden", bgColorClass)}>
                      <CardHeader className="p-4 bg-gray-50 border-b">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-md font-semibold text-gray-700 flex items-center">
                            <Layers className="h-4 w-4 ml-2 text-indigo-500" />
                            שכבה {layerNumber} {isBaseLayer ? '(בסיס)' : ''}
                          </CardTitle>
                          {index > 0 && ( // Only show remove button for layers after the first (base)
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveLayer(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-100/50 rounded-full w-8 h-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* COVERAGE */}
                          <div>
                            <Label className="text-sm font-medium text-gray-600">
                              {isBaseLayer
                                ? `כושר כיסוי ל${isPlaster ? formData.unitType : 'דלי'}`
                                : `כושר כיסוי לשכבה (מ"ר/${isPlaster ? formData.unitType : 'דלי'})`}
                            </Label>
                            <div className="relative mt-1">
                              <Input
                                type="number"
                                step="any"
                                value={
                                  isBaseLayer
                                    ? (layerData.coverage ?? '')
                                    : formatSmart(calculateActualCoverage(index))
                                }
                                onChange={(e) => {
                                  if (isBaseLayer) {
                                    handleUpdateLayer(index, 'coverage', e.target.value);
                                  } else {
                                    handleUpdateLayerAbsolute(index, 'coverage', e.target.value);
                                  }
                                }}
                                className={cn(
                                  "text-lg font-semibold text-right pl-12",
                                  coverageBorderClass
                                )}
                                placeholder="0"
                              />
                              {/* Move unit to the left so it won't overlap the value */}
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 pointer-events-none">
                                מ"ר
                              </span>
                            </div>
                            {isBaseLayer && (
                              <p className="text-xs text-gray-500 mt-2">
                                כמה מ"ר מכסה {isPlaster ? formData.unitType : 'דלי'} אחד
                              </p>
                            )}
                          </div>

                          {/* DAILY OUTPUT */}
                          <div>
                            <Label className="text-sm font-medium text-gray-600">
                              {isBaseLayer ? 'הספק יומי לפועל (מ"ר)' : 'הספק יומי לשכבה (מ"ר/יום)'}
                            </Label>
                            <div className="relative mt-1">
                              <Input
                                type="number"
                                step="any"
                                value={
                                  isBaseLayer
                                    ? (layerData.dailyOutput ?? '')
                                    : formatSmart(calculateActualOutput(index))
                                }
                                onChange={(e) => {
                                  if (isBaseLayer) {
                                    handleUpdateLayer(index, 'dailyOutput', e.target.value);
                                  } else {
                                    handleUpdateLayerAbsolute(index, 'dailyOutput', e.target.value);
                                  }
                                }}
                                className={cn(
                                  "text-lg font-semibold text-right pl-16",
                                  outputBorderClass
                                )}
                                placeholder="0"
                              />
                              {!isBaseLayer && (
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 pointer-events-none">
                                  מ"ר/יום
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {/* Add Layer Button */}
                <div className="flex justify-center mt-4">
                  <Button 
                    type="button"
                    onClick={handleAddLayer} 
                    disabled={formData.layerSettings.length >= 4}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף שכבה
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-8" />
            
            {/* ====== Section 4: Pricing ====== */}
            <div className="space-y-6">
              <CategoryHeader number="4" title="תמחור" colorScheme="purple" />
              
              <Card className="border-2 border-green-300 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-green-900">הזן אחוז רווח רצוי</span>
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    המערכת תחשב את המחיר ללקוח על בסיס עלויות הקבלן ואחוז הרווח שמוגדר.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-lg shadow-sm border border-green-200 max-w-xs">
                      <Label className="flex items-center text-green-700 font-semibold mb-2 justify-center">
                        <span>אחוז רווח רצוי:</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="desiredProfitPercent"
                          type="number"
                          value={displayDesiredProfit}
                          onChange={(e) => handleInputChange('desiredProfitPercent', Number(e.target.value))}
                          placeholder=" " // Placeholder must exist but can be empty for peer selector
                          className="peer h-12 text-2xl font-bold text-center pr-12 border-green-200 focus:border-green-400"
                          min="0"
                          step="0.1"
                        />
                         {/* Custom placeholder */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400 pointer-events-none peer-focus:hidden peer-[:not(:placeholder-shown)]:hidden">
                           לדוגמה: <span className="text-red-500 font-medium">40</span>
                        </div>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-green-600 text-xl">%</span>
                      </div>
                    </div>
                  </div>

                  {/* דוגמת חישוב */}
                  <Card className="border-2 border-teal-200 shadow-inner">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-3 text-teal-800 justify-center">
                        <Calculator className="w-5 h-5" />
                        דוגמת חישוב
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-white rounded-lg shadow-sm border border-teal-200">
                          <Label className="text-teal-700 font-semibold mb-2 block text-center">כמות לדוגמה (מ"ר)</Label>
                          <Input
                            type="number"
                            value={quickPricingMode.indicativeQuantity}
                            onChange={(e) => setQuickPricingMode(prev => ({...prev, indicativeQuantity: Number(e.target.value) || 100}))}
                            className="text-center text-lg font-bold border-teal-200 focus:border-teal-400"
                            min="1"
                          />
                        </div>

                        <div className="p-3 bg-white rounded-lg shadow-sm border border-teal-200">
                          <Label className="text-teal-700 font-semibold mb-2 block text-center">מספר שכבות לדוגמה</Label>
                          <div className="flex gap-1 justify-center flex-wrap">
                            {Array.from({ length: Math.max(1, formData.layerSettings.length) }, (_, i) => i + 1).map(layer => (
                              <Button
                                key={layer}
                                type="button"
                                variant={quickPricingMode.indicativeLayers === layer ? 'default' : 'outline'}
                                size="sm"
                                className={cn(
                                  "min-w-[40px] h-10 font-bold text-sm transition-all duration-200",
                                  quickPricingMode.indicativeLayers === layer 
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-md' 
                                    : 'bg-white border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400'
                                )}
                                onClick={() => setQuickPricingMode(prev => ({...prev, indicativeLayers: layer}))}
                              >
                                {layer}
                              </Button>
                            ))}
                          </div>
                          <p className="text-xs text-teal-600 text-center mt-1">
                            {quickPricingMode.indicativeLayers === 1 ? 'שכבה 1 (בסיס)' : `${quickPricingMode.indicativeLayers} שכבות`}
                          </p>
                        </div>
                      </div>

                      {/* Display calculation results */}
                      {quickMetrics ? (
                        <div className="mt-6 p-6 bg-white rounded-xl border-2 border-teal-200 shadow-inner">
                          <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                            ניתוח מחיר לכמות של {quickPricingMode.indicativeQuantity} מ"ר ({quickPricingMode.indicativeLayers} שכבות):
                          </h3>

                          {/* Rounding Options */}
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                              <div className="flex items-center gap-3">
                                  <Checkbox 
                                      id="roundBucketCost" 
                                      checked={roundBucketCost} 
                                      onCheckedChange={setRoundBucketCost}
                                  />
                                  <Label htmlFor="roundBucketCost" className="text-sm font-medium text-blue-700">
                                      עיגול עלות {formData.selectedMaterialCategory === 'plaster' ? formData.unitType === 'שק' ? 'שקים' : 'דליים' : 'דליים'} כלפי מעלה
                                  </Label>
                              </div>
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id="roundWorkDays"
                                  checked={roundWorkDays}
                                  onCheckedChange={setRoundWorkDays}
                                />
                                <Label htmlFor="roundWorkDays" className="text-sm font-medium text-blue-700">
                                  עיגול ימי עבודה כלפי מעלה
                                </Label>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200 flex flex-col justify-center">
                              <p className="text-sm text-orange-800 font-semibold mb-2">עלות כוללת לקבלן</p>
                              <p className="text-4xl font-bold text-orange-600">{formatPrice(quickMetrics.totalCost)} ₪</p>
                              <div className="mt-4 pt-4 border-t border-orange-200">
                                <p className="text-sm text-orange-700 font-medium">עלות למ"ר</p>
                                <p className="text-2xl font-bold text-orange-800">{formatPrice(quickMetrics.costPerMeter, 2)} ₪</p>
                              </div>
                            </div>
                            
                            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 flex flex-col justify-center">
                              <p className="text-sm text-green-800 font-semibold mb-2">רווח כולל</p>
                              <p className="text-4xl font-bold text-green-600">{formatPrice(quickMetrics.profit)} ₪</p>
                              <Badge className="bg-green-200 text-green-900 mx-auto my-2 text-lg">
                                {quickMetrics.profitPercentage?.toFixed(1)}%
                              </Badge>
                              <div className="mt-2 pt-4 border-t border-green-200">
                                <p className="text-sm text-green-700 font-medium">רווח למ"ר</p>
                                <p className="text-2xl font-bold text-green-800">{formatPrice(quickMetrics.profitPerMeter, 2)} ₪</p>
                              </div>
                            </div>

                            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 flex flex-col justify-center">
                              <p className="text-sm text-blue-800 font-semibold mb-2">מחיר מכירה ללקוח</p>
                              <p className="text-4xl font-bold text-blue-600">{formatPrice(Math.round(quickMetrics.sellingPrice))} ₪</p>
                              <div className="mt-4 pt-4 border-t border-blue-200">
                                <p className="text-sm text-blue-700 font-medium">מחיר למ"ר</p>
                                <p className="text-2xl font-bold text-blue-800">{formatPrice(quickMetrics.pricePerMeter, 2)} ₪</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Updated detailed breakdown - more compact and clear */}
                          <div className="mt-4 p-3 bg-teal-50/70 rounded-lg border border-teal-200/80">
                            <h4 className="text-md font-semibold text-teal-800 mb-2 text-center">פירוט עלויות</h4>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between items-baseline">
                                <span className="text-gray-600">ימי עבודה:</span>
                                <span className="font-bold text-gray-800">{quickMetrics.finalWorkDays?.toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-gray-600">עלות חומרים:</span>
                                <span className="font-bold text-gray-800">{formatPrice(quickMetrics.totalMaterialCost)} ₪</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-gray-600">עלות עבודה:</span>
                                <span className="font-bold text-gray-800">{formatPrice(quickMetrics.totalLaborCost)} ₪</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-gray-600">עלויות ציוד:</span>
                                <span className="font-bold text-gray-800">{formatPrice(quickMetrics.totalOtherCosts)} ₪</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <p>הזן נתונים כדי לראות ניתוח מחיר.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* כפתורים תחתונים */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button 
          onClick={handleSaveItem}
          className="bg-black hover:bg-gray-800 text-white px-8 py-2"
        >
          {isEditMode ? 'עדכן פריט' : 'הוסף פריט'}
        </Button>
      </div>

      <TypeManagerDialog
        isOpen={isPaintTypeDialogOpen}
        onOpenChange={setIsPaintTypeDialogOpen}
        title="ניהול סוגי צבע"
        types={paintTypes}
        onSave={handleSavePaintTypes}
      />
      
      {/* ADDED: Add Paint Type Dialog */}
      <Dialog open={isAddPaintTypeOpen} onOpenChange={setIsAddPaintTypeOpen}>
        <DialogContent className="sm:max-w-md w-[95%] text-right rounded-xl">
          <DialogHeader>
            <DialogTitle>הוספת סוג צבע חדש</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="newPaintTypeName">שם סוג הצבע</Label>
            <Input
              id="newPaintTypeName"
              value={newPaintTypeName}
              onChange={(e) => setNewPaintTypeName(e.target.value)}
              placeholder="לדוגמה: סופרקריל 2000"
              className="mt-2"
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddPaintTypeOpen(false)}>ביטול</Button>
            <Button onClick={handleConfirmAddPaintType}>הוסף</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TypeManagerDialog
        isOpen={isPlasterTypeDialogOpen}
        onOpenChange={setIsPlasterTypeDialogOpen}
        title="ניהול סוגי שפכטל"
        types={plasterTypes}
        onSave={handleSavePlasterTypes}
      />

      {/* ADDED: Add Plaster Type Dialog */}
      <Dialog open={isAddPlasterTypeOpen} onOpenChange={setIsAddPlasterTypeOpen}>
        <DialogContent className="sm:max-w-md w-[95%] text-right rounded-xl">
          <DialogHeader>
            <DialogTitle>הוספת סוג שפכטל חדש</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="newPlasterTypeName">שם סוג השפכטל</Label>
            <Input
              id="newPlasterTypeName"
              value={newPlasterTypeName}
              onChange={(e) => setNewPlasterTypeName(e.target.value)}
              placeholder="לדוגמה: שפכטל גמר, טיח פנים עדין"
              className="mt-2"
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddPlasterTypeOpen(false)}>ביטול</Button>
            <Button onClick={handleConfirmAddPlasterType}>הוסף</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
