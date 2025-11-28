
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, Trash2, Calculator, ChevronDown, ChevronUp, Edit, X, Check, Layers, ArrowDown, Ruler, Award, Settings, ArrowRight, Percent, TrendingUp, DollarSign, ListChecks, Package, HardHat, Sidebar } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User } from '@/lib/entities';
import { useUser } from '@/components/utils/UserContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger // Added TooltipTrigger import
} from "@/components/ui/tooltip";

// עדכון הייבוא לשירות המחירים המשותף
import { calculateItemMetricsForQuantity, identifyPriceTier } from '@/components/costCalculator/PricingService';

// Helper for currency formatting - תיקון הפורמט
const formatPrice = (price) => {
  if (typeof price !== 'number' || isNaN(price)) return '0';
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// נעביר את TILE_SIZES למצב המשתמש - This is now only for default properties if no custom ones are set
const DEFAULT_TILE_TYPES = [
  {
    id: '30x30',
    size: '30x30',
    name: 'ריצוף 30x30',
    defaultPrice: 85,
    baseWorkTime: 0.7,
    defaultComplexity: 'normal',
    defaultSurface: 'regular',
    defaultInstallation: 'regular'
  },
  {
    id: '45x45',
    size: '45x45',
    name: 'ריצוף 45x45',
    defaultPrice: 95,
    baseWorkTime: 0.6,
    defaultComplexity: 'normal',
    defaultSurface: 'regular',
    defaultInstallation: 'regular'
  },
  {
    id: '60x60',
    size: '60x60',
    name: 'ריצוף 60x60',
    defaultPrice: 120,
    baseWorkTime: 0.5,
    defaultComplexity: 'normal',
    defaultSurface: 'regular',
    defaultInstallation: 'regular'
  },
  {
    id: '80x80',
    size: '80x80',
    name: 'ריצוף 80x80',
    defaultPrice: 150,
    baseWorkTime: 0.45,
    defaultComplexity: 'normal',
    defaultSurface: 'regular',
    defaultInstallation: 'regular'
  },
  {
    id: '100x100',
    size: '100x100',
    name: 'ריצוף 100x100',
    defaultPrice: 180,
    baseWorkTime: 0.4,
    defaultComplexity: 'normal',
    defaultSurface: 'regular',
    defaultInstallation: 'regular'
  }
];

// פונקציות חישוב מתוקנות עם בדיקות תקינות
const calculateDailyOutput = (baseOutput, complexityFactor) => {
    // complexityFactor is now always 1.0, so this simplifies
    if (!baseOutput || baseOutput <= 0) return 0;
    return Number((baseOutput / (complexityFactor || 1.0)).toFixed(2));
};

const calculateWorkDays = (area, dailyOutput) => {
    if (!area || area <= 0 || !dailyOutput || dailyOutput <= 0) return 0;
    // לפי בקשת המשתמש, החישוב יהיה מדויק ללא עיגול כלפי מעלה
    return Math.max(0, area / dailyOutput);
};

const calculateMaterialCost = (area, tilePrice, whitePrice) => {
    const totalMaterialPricePerMeter = (tilePrice || 0) + (whitePrice || 0);
    if (!area || area <= 0 || totalMaterialPricePerMeter < 0) return 0;
    return Math.round(totalMaterialPricePerMeter * area);
};

// Modified: calculates labor cost based on method (perDay or perSqM)
const calculateLaborCost = (method, workDays, dailyLaborCostPerDay, area, laborCostPerSqM) => {
    if (method === 'perDay') {
        if (!workDays || workDays <= 0 || !dailyLaborCostPerDay || dailyLaborCostPerDay <= 0) return 0;
        return Math.max(0, Math.round(workDays * dailyLaborCostPerDay));
    } else if (method === 'perSqM') {
        if (!area || area <= 0 || !laborCostPerSqM || laborCostPerSqM <= 0) return 0;
        return Math.max(0, Math.round(area * laborCostPerSqM));
    }
    return 0;
};

const calculateTotalCost = (materialCost, laborCost, fixedCost) => {
    return Math.round((materialCost || 0) + (laborCost || 0) + (fixedCost || 0));
};

const calculateCostPerMeter = (totalCost, area) => {
    if (!area || area <= 0 || !totalCost || totalCost < 0) return 0;
    return Number((totalCost / area).toFixed(2));
};

const calculateLaborCostPerMeter = (laborCost, area) => {
    if (!area || area <= 0 || !laborCost || laborCost < 0) return 0;
    return Number((laborCost / area).toFixed(2));
};

const calculateProfit = (sellingPrice, totalCost) => {
    if (!sellingPrice || !totalCost || totalCost <= 0) {
        return { profit: 0, profitPercentage: 0 };
    }
    const profit = Math.round(sellingPrice - totalCost);
    const profitPercentage = Number(((profit / totalCost) * 100).toFixed(1));
    return { profit, profitPercentage };
};

// עדכון פונקציית calculateMetrics כך שתתמוך בברירות מחדל גלובליות לעלות עובד
const calculateMetrics = (area, formData, tierPrice = null, defaults = {}) => {
    try {
        const validArea = Math.max(0, Number(area) || 0);
        if (validArea <= 0) {
            return {
                dailyOutput: 0, workDays: 0, materialCost: 0, laborCost: 0, totalCost: 0,
                costPerMeter: 0, laborCostPerMeter: 0, sellingPrice: 0, profit: 0, profitPercentage: 0,
                fixedCost: 0
            };
        }

        const baseDailyOutput = Number(formData.dailyOutput) || 0;
        const complexityFactor = 1.0;
        const dailyOutput = calculateDailyOutput(baseDailyOutput, complexityFactor);
        const workDays = calculateWorkDays(validArea, dailyOutput);

        const wastagePercent = Number(formData.wastagePercent) || 0;
        const wastageFactor = 1 + (wastagePercent / 100);

        const tileCostPerMeter = Number(formData.materialCost) || 0;
        const whiteMaterialCostPerMeter = Number(formData.additionalCost) || 0;

        // Apply wastage only on tile cost
        const costOfTilesWithWastage = tileCostPerMeter > 0 ? (tileCostPerMeter * validArea * wastageFactor) : 0;
        const costOfBlackMaterial = whiteMaterialCostPerMeter * validArea;
        const materialCost = Math.round(costOfTilesWithWastage + costOfBlackMaterial);

        // ✅ FIX: Labor cost values priority - use ONLY category defaults, ignore item-specific values
        // Category settings should ALWAYS be used, not item-specific values
        const laborCostMethod = defaults?.laborCostMethod || 'perDay';
        const laborCostPerDay = Number(
          defaults?.laborCostPerDay ?? 0
        );
        const laborCostPerSqM = Number(
          defaults?.laborCostPerSqM ?? 0
        );

        const laborCost = calculateLaborCost(laborCostMethod, workDays, laborCostPerDay, validArea, laborCostPerSqM);

        const fixedCost = 0;
        const totalCost = calculateTotalCost(materialCost, laborCost, fixedCost);

        const costPerMeter = calculateCostPerMeter(totalCost, validArea);
        const laborCostPerMeter = calculateLaborCostPerMeter(laborCost, validArea);

        const pricePerMeter = tierPrice || 0;
        const sellingPrice = Math.round(pricePerMeter * validArea);

        const { profit, profitPercentage } = calculateProfit(sellingPrice, totalCost);

        return {
            dailyOutput,
            workDays,
            materialCost,
            laborCost,
            totalCost,
            costPerMeter,
            laborCostPerMeter,
            sellingPrice,
            profit,
            profitPercentage,
            fixedCost,
            workDaysDetails: { area: validArea, baseOutput: baseDailyOutput, complexityFactor, result: workDays },
            materialCostDetails: { area: validArea, tileCost: tileCostPerMeter, whiteCost: whiteMaterialCostPerMeter, wastage: wastageFactor, result: materialCost },
            laborCostDetails: {
                method: laborCostMethod,
                days: workDays,
                dailyCost: laborCostPerDay,
                area: validArea,
                perSqMCost: laborCostPerSqM,
                result: laborCost
            },
            totalCostDetails: { material: materialCost, labor: laborCost, fixed: fixedCost, result: totalCost },
            profitDetails: { price: sellingPrice, cost: totalCost, result: profit, percent: profitPercentage }
        };
    } catch (error) {
        console.error("שגיאה בחישוב מדדים:", error);
        return {
          dailyOutput: 0, workDays: 0, materialCost: 0, laborCost: 0, totalCost: 0,
          costPerMeter: 0, laborCostPerMeter: 0, sellingPrice: 0, profit: 0, profitPercentage: 0,
          fixedCost: 0
        };
    }
};

export default function TilingForm({ editItem, onSubmit, onCancel, defaults, userTilingDefaults }) {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    id: editItem?.id || `tiling_${Date.now()}`,
    tileName: editItem?.tileName || '',
    selectedSizes: editItem?.selectedSizes || (editItem?.size ? [editItem.size] : []),
    customSize: editItem?.customSize || '',
    workType: editItem?.workType ? (Array.isArray(editItem.workType) ? editItem.workType : [editItem.workType]) : [],
    selectedQuality: editItem?.selectedQuality || '',
    generalDescription: editItem?.generalDescription || '',
    materialCost: editItem?.materialCost || '',
    additionalCost: editItem?.additionalCost || userTilingDefaults?.additionalCost || '',
    laborCostMethod: editItem?.laborCostMethod || userTilingDefaults?.laborCostMethod || 'perDay',
    laborCostPerDay: editItem?.laborCostPerDay || editItem?.laborCost || userTilingDefaults?.laborCostPerDay || '',
    laborCostPerSqM: editItem?.laborCostPerSqM || userTilingDefaults?.laborCostPerSqM || '',
    dailyOutput: editItem?.dailyOutput || '',
    wastagePercent: editItem?.wastagePercent !== undefined ? editItem.wastagePercent : (userTilingDefaults?.wastagePercent ?? ''),
    priceTiers: editItem?.priceTiers && editItem.priceTiers.length > 0 ? editItem.priceTiers : [{ minArea: 0, maxArea: '', price: '' }],
    category: 'tiling',
    unit: 'מ"ר',
    maxProjectRange: editItem?.maxProjectRange || '',
    desiredProfitPercent: editItem?.desiredProfitPercent !== undefined ? editItem.desiredProfitPercent : '', // Allow empty for fallback
    pricingMethod: 'quick', // Always default to 'quick' now
    averageCustomerPrice: 0,
    averageCostPerMeter: 0,
    averageProfitPerMeter: 0,
    averageProfitPercent: 0,
    // הוספת שדות פאנל - רק הגדרות, לא כמות
    hasPanel: editItem?.hasPanel || false,
    panelLaborWorkCapacity: editItem?.panelLaborWorkCapacity || userTilingDefaults?.panelLaborWorkCapacity || '',
    panelUtilizationPercent: editItem?.panelUtilizationPercent !== undefined ? editItem.panelUtilizationPercent : (userTilingDefaults?.panelUtilizationPercent ?? '')
  });

  // Dynamic lists from user data
  const [tileSizes, setTileSizes] = useState([]);
  const [qualityTiers, setQualityTiers] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);

  // Input states for new dynamic items
  const [newSize, setNewSize] = useState('');
  const [newQuality, setNewQuality] = useState('');
  const [newWorkType, setNewWorkType] = useState('');

  // States for Popovers
  const [addSizePopover, setAddSizePopover] = useState(false);
  const [addQualityPopover, setAddQualityPopover] = useState(false);
  const [addWorkTypePopover, setAddWorkTypePopover] = useState(false);

  // Add new state for quick pricing mode - make it editable
  const [quickPricingMode, setQuickPricingMode] = useState({
    indicativeQuantity: editItem ? 100 : 50 // התחל עם 50 כמברת מחדל
  });

  useEffect(() => {
    const loadDynamicOptions = () => {
      try {
        if (user?.user_metadata?.tilingOptions) {
          setTileSizes(user.user_metadata.tilingOptions.sizes || ['30x30', '45x45', '60x60', '80x80', '100x100', '120x120', 'מותאם אישית']);
          setQualityTiers(user.user_metadata.tilingOptions.qualities || ['בסיסי', 'איכותי', 'איכותי מאד', 'פרמיום']);
          setWorkTypes(user.user_metadata.tilingOptions.workTypes || ['חיפוי קירות', 'ריצוף רצפה', 'ריצוף פנלים', 'ריצוף מדרגות', 'ריצוף פסיפס', 'החלקה בטון']);
        } else {
          // Set default values if no user data
          setTileSizes(['30x30', '45x45', '60x60', '80x80', '100x100', '120x120', 'מותאם אישית']);
          setQualityTiers(['בסיסי', 'איכותי', 'איכותי מאד', 'פרמיום']);
          setWorkTypes(['חיפוי קירות', 'ריצוף רצפה', 'ריצוף פנלים', 'ריצוף מדרגות', 'ריצוף פסיפס', 'החלקה בטון']);
        }
      } catch (error) {
        console.error("Failed to load user options:", error);
      }
    };

    if (user) {
      loadDynamicOptions();
    }

    if (editItem) {
      setFormData(prev => ({
        ...prev,
        ...editItem,
        id: editItem.id,
        selectedSizes: editItem.selectedSizes || (editItem.size ? [editItem.size] : []),
        workType: editItem.workType ? (Array.isArray(editItem.workType) ? editItem.workType : [editItem.workType]) : [],
        selectedQuality: editItem.selectedQuality || '',
        wastagePercent: editItem.wastagePercent !== undefined ? editItem.wastagePercent : '',
        priceTiers: editItem.priceTiers && editItem.priceTiers.length > 0 ? editItem.priceTiers : [{ minArea: 0, maxArea: '', price: '' }],
        laborCostMethod: editItem.laborCostMethod || 'perDay',
        laborCostPerDay: editItem.laborCostPerDay !== undefined ? editItem.laborCostPerDay : editItem.laborCost || '',
        laborCostPerSqM: editItem.laborCostPerSqM !== undefined ? editItem.laborCostPerSqM : '',
        dailyOutput: editItem.dailyOutput !== undefined ? editItem.dailyOutput : '',
        materialCost: editItem.materialCost !== undefined ? editItem.materialCost : '',
        additionalCost: editItem.additionalCost !== undefined ? editItem.additionalCost : '',
        maxProjectRange: editItem.maxProjectRange || '',
        desiredProfitPercent: editItem.desiredProfitPercent !== undefined ? editItem.desiredProfitPercent : '', // Retain value or allow empty for default
        hasPanel: editItem.hasPanel || false,
        panelLaborWorkCapacity: editItem.panelLaborWorkCapacity || '',
        panelUtilizationPercent: editItem.panelUtilizationPercent !== undefined ? editItem.panelUtilizationPercent : '',
        complexityValue: undefined,
        pricingMethod: 'quick' // Always force quick pricing method
      }));
    }
  }, [editItem, user]);

  // THIS useEffect IS NOW REMOVED TO PREVENT OVERWRITING VALUES

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle checkbox inputs
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    // Handle number inputs to allow empty string for clearing
    const newValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;

    setFormData(prev => {
      const newFormData = { ...prev, [name]: newValue };

      // אם עלות ריצוף נמחקה או הפכה ל-0, נמחק גם את אחוז הבלאי
      if (name === 'materialCost' && (newValue === '' || newValue === 0)) {
        newFormData.wastagePercent = '';
        newFormData.selectedQuality = ''; // Clear selected quality if material cost is 0
      }

      return newFormData;
    });
  };

  const handleSelectChange = (field, value) => {
    if (field === 'workType') {
      // בחירה יחידה - החלפת הערך במקום הוספה/הסרה
      setFormData(prev => ({
        ...prev,
        workType: [value] // תמיד מערך עם ערך אחד בלבד
      }));
    } else if (field === 'selectedSizes') {
      // בחירה יחידה - החלפת הערך במקום הוספה/הסרה
      setFormData(prev => ({
        ...prev,
        selectedSizes: [value], // תמיד מערך עם ערך אחד בלבד
        // אם בוחרים גודל שאינו "מותאם אישית", מנקים את השדה המותאם
        customSize: value !== 'מותאם אישית' ? '' : prev.customSize
      }));
    } else {
        setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // וולידציה משופרת
  // וולידציה: מסירים דרישה לאחוז רווח בטופס פריט (נלקח מהגדרות הראשיות)
  const validateForm = () => {
    const errors = [];

    // בדיקה שנבחר לפחות סוג עבודה אחד
    if (!formData.workType || formData.workType.length === 0) {
      errors.push('יש לבחור סוג עבודה אחד');
    }

    // בדיקה שנבחר לפחות גודל אריח אחד
    if (!formData.selectedSizes || formData.selectedSizes.length === 0) {
      errors.push('יש לבחור גודל אריח אחד');
    }

    // בדיקה שהזינו הספק עבודה
    if (!formData.dailyOutput || Number(formData.dailyOutput) <= 0) {
      errors.push('יש להזין הספק עבודה יומי (מספר חיובי)');
    }

    // בדיקה של אחוז בלאי - חובה רק אם יש עלות ריצוף
    if (Number(formData.materialCost) > 0) {
      if (formData.wastagePercent === '' || formData.wastagePercent === null || formData.wastagePercent === undefined) {
          errors.push('יש להזין אחוז בלאי כאשר מוגדרת עלות ריצוף');
      }
      if (!formData.selectedQuality) {
        errors.push('יש לבחור רמת איכות כאשר מוגדרת עלות ריצוף');
      }
    }

    // אין דרישה לשדה desiredProfitPercent כאן – הוא מוגדר גלובלית
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // בדיקת וולידציה
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      alert('נא לתקן את השגיאות הבאות:\n' + validationErrors.join('\n'));
      return;
    }

    let finalData = { ...formData };

    // --- START: Final, simple calculation before submitting ---
    const quickMetrics = getQuickPricingMetrics();

    if (quickMetrics) {
      // Set the final values based on the UI summary
      finalData.averageCustomerPrice = quickMetrics.sellingPricePerMeter;
      finalData.averageCostPerMeter = quickMetrics.costPerMeter;
      finalData.averageProfitPerMeter = quickMetrics.profitPerMeter;
      finalData.averageProfitPercent = quickMetrics.profitPercentage;
    } else {
      finalData.averageCustomerPrice = 0;
      finalData.averageCostPerMeter = 0;
      finalData.averageProfitPerMeter = 0;
      finalData.averageProfitPercent = 0;
    }

    // שמירת אחוז רווח לפי ברירת מחדל גלובלית (לנוחות בדו"חות) אם לא הוגדר ספציפית לפריט
    if (finalData.desiredProfitPercent === '' || finalData.desiredProfitPercent === null || finalData.desiredProfitPercent === undefined) {
      if (userTilingDefaults?.desiredProfitPercent) {
        finalData.desiredProfitPercent = Number(userTilingDefaults.desiredProfitPercent);
      } else {
        finalData.desiredProfitPercent = 0; // Default to 0 if neither item-specific nor global default exists
      }
    }


    // איפוס שדות עלות עובד ברמת פריט – ההיגיון מגיע מברירות המחדל
    if (userTilingDefaults?.laborCostMethod) {
      finalData.laborCostMethod = userTilingDefaults.laborCostMethod;
      finalData.laborCostPerDay = userTilingDefaults.laborCostPerDay ?? 0;
      finalData.laborCostPerSqM = userTilingDefaults.laborCostPerSqM ?? 0;
    }

    // --- END: Final calculation ---

    // Remove the deprecated fields
    delete finalData.laborCost;
    delete finalData.size;
    delete finalData.complexityValue;
    delete finalData.fixedProjectCost;

    // Create a simple price tier for the quick pricing method
    if (finalData.pricingMethod === 'quick' && finalData.averageCustomerPrice) {
        finalData.priceTiers = [{
            minArea: 0,
            maxArea: 999999,
            price: finalData.averageCustomerPrice
        }];
    }

    console.log('Sending final data from form:', finalData);
    onSubmit(finalData);
  };

  const saveDynamicOptions = async (type, options) => {
      try {
        if (!user?.user_metadata) return;

        const currentOptions = user.user_metadata.tilingOptions || {};

        if (typeof User.updateMyUserData === 'function') {
          await User.updateMyUserData({
            tilingOptions: {
              ...currentOptions,
              [type]: options
            }
          });
        } else {
          console.log('User.updateMyUserData not available - backend not connected');
        }
      } catch (error) {
        console.error("Failed to save dynamic options:", error);
      }
  };

  const handleAddDynamicOption = (type) => {
      let newValue = '';
      let currentOptions = [];
      let setOptions = null;
      let setPopover = null;
      let setNewValueState = null;

      switch(type) {
          case 'sizes':
              newValue = newSize.trim();
              currentOptions = tileSizes;
              setOptions = setTileSizes;
              setPopover = setAddSizePopover;
              setNewValueState = setNewSize;
              break;
          case 'qualities':
              newValue = newQuality.trim();
              currentOptions = qualityTiers;
              setOptions = setQualityTiers;
              setPopover = setAddQualityPopover;
              setNewValueState = setNewQuality;
              break;
          case 'workTypes':
              newValue = newWorkType.trim();
              currentOptions = workTypes;
              setOptions = setWorkTypes;
              setPopover = setAddWorkTypePopover;
              setNewValueState = setNewWorkType;
              break;
          default:
              return;
      }

      if (newValue && !currentOptions.includes(newValue)) {
          const updatedOptions = [...currentOptions, newValue];
          if (setOptions) setOptions(updatedOptions);
          saveDynamicOptions(type, updatedOptions);
      }
      if (setPopover) setPopover(false);
      if (setNewValueState) setNewValueState('');
  };

  const handleDeleteDynamicOption = (type, optionToDelete) => {
      switch(type) {
          case 'sizes':
              const updatedSizes = tileSizes.filter(size => size !== optionToDelete);
              setTileSizes(updatedSizes);
              saveDynamicOptions('sizes', updatedSizes);
              if (formData.selectedSizes.includes(optionToDelete)) {
                  setFormData(prev => ({
                    ...prev,
                    selectedSizes: prev.selectedSizes.filter(s => s !== optionToDelete)
                  }));
              }
              break;
          case 'qualities':
              const updatedQualities = qualityTiers.filter(quality => quality !== optionToDelete);
              setQualityTiers(updatedQualities);
              saveDynamicOptions('qualities', updatedQualities);
              if (formData.selectedQuality === optionToDelete) {
                  handleSelectChange('selectedQuality', '');
              }
              break;
          case 'workTypes':
              const updatedWorkTypes = workTypes.filter(workType => workType !== optionToDelete);
              setWorkTypes(updatedWorkTypes);
              saveDynamicOptions('workTypes', updatedWorkTypes);
              if (formData.workType.includes(optionToDelete)) {
                  setFormData(prev => ({
                    ...prev,
                    workType: prev.workType.filter(wt => wt !== optionToDelete)
                  }));
              }
              break;
          default:
              return;
      }
  };

  const renderStyledBox = ({ title, icon, children, className, colorScheme = 'slate' }) => {
    const colorSchemes = {
      slate: {
        border: 'border-slate-300 hover:border-slate-400',
        titleText: 'text-slate-800',
      },
      amber: {
        border: 'border-amber-300 hover:border-amber-400',
        titleText: 'text-amber-800',
      },
      teal: {
        border: 'border-teal-300 hover:border-teal-400',
        titleText: 'text-teal-800',
      }
    };

    const scheme = colorSchemes[colorScheme] || colorSchemes.slate;

    return (
      <div className={`p-4 border-2 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 ${scheme.border} ${className || ''}`}>
        <h3 className={`text-lg font-bold mb-4 flex items-center ${scheme.titleText}`}>
          {icon}
          {title}
        </h3>
        {children}
      </div>
    );
  };

  // פונקציה לקביעת צבע לפי אחוז רווח
  const getProfitColor = (profit) => {
    const profitNum = Number(profit);
    if (profitNum <= 20) return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: 'text-red-500' };
    if (profitNum <= 40) return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' };
    return { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: 'text-green-500' };
  };

  // New handler for quick pricing mode
  const handleQuickPricingChange = (field, value) => {
    if (field === 'desiredProfitPercent') {
        setFormData(prev => ({
            ...prev,
            desiredProfitPercent: value === '' ? '' : Number(value)
        }));
    } else if (field === 'indicativeQuantity') {
        setQuickPricingMode(prev => ({
            ...prev,
            indicativeQuantity: value === '' ? '' : Number(value)
        }));
    }
  };

  // New: תמחור מהיר משתמש בברירת מחדל גלובלית לאחוז הרווח ובעלות עובד
  const getQuickPricingMetrics = () => {
    const quantity = Number(quickPricingMode.indicativeQuantity);

    // Use item-specific desiredProfitPercent if set, otherwise fallback to userTilingDefaults
    const profitPercent = Number(
      (formData.desiredProfitPercent !== '' && formData.desiredProfitPercent !== null && formData.desiredProfitPercent !== undefined)
        ? formData.desiredProfitPercent
        : (userTilingDefaults?.desiredProfitPercent ?? 0)
    );

    if (!quantity || quantity <= 0 || profitPercent === 0) { // Allow 0 for profit percent if intended
      return null;
    }

    const costMetrics = calculateMetrics(quantity, formData, 0, userTilingDefaults);
    if (!costMetrics || typeof costMetrics.totalCost !== 'number' || isNaN(costMetrics.totalCost)) {
      return null;
    }

    const requiredSellingPricePerMeter = costMetrics.costPerMeter * (1 + (profitPercent / 100));
    const totalSellingPrice = requiredSellingPricePerMeter * quantity;
    const totalProfit = totalSellingPrice - costMetrics.totalCost;
    const profitPerMeter = requiredSellingPricePerMeter - costMetrics.costPerMeter;

    // Return EXACTLY what will be displayed (rounded)
    return {
      costPerMeter: Math.round(costMetrics.costPerMeter),
      sellingPricePerMeter: Math.round(requiredSellingPricePerMeter),
      profitPerMeter: Math.round(profitPerMeter),
      profitPercentage: Math.round(profitPercent * 10) / 10, // Round to 1 decimal place
      totalSellingPrice: Math.round(totalSellingPrice),
      totalCost: Math.round(costMetrics.totalCost),
      profit: Math.round(totalProfit),
      workDays: costMetrics.workDays,
      // Pass through specific costs for display breakdown
      materialCost: costMetrics.materialCost,
      laborCost: costMetrics.laborCost,
      fixedCost: costMetrics.fixedCost,
    };
  };

  const quickMetrics = getQuickPricingMetrics();

  // רכיב לכותרת קטגוריה עם עיצוב חדש
  const CategoryHeader = ({ number, title, colorScheme = 'slate' }) => {
    const colorSchemes = {
      slate: { border: 'border-slate-300', text: 'text-slate-800', bg: 'bg-slate-100' },
      amber: { border: 'border-amber-300', text: 'text-amber-800', bg: 'bg-amber-100' },
      teal: { border: 'border-teal-300', text: 'text-teal-800', bg: 'bg-teal-100' },
    };

    const scheme = colorSchemes[colorScheme];

    return (
      <div className={`flex items-center gap-4 p-4 bg-white border-r-4 ${scheme.border} rounded-lg shadow-sm`}>
        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${scheme.bg} text-lg font-bold ${scheme.text}`}>
          {number}
        </div>
        <h2 className={`text-2xl font-bold ${scheme.text}`}>
          {title}
        </h2>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="w-full max-w-[1600px] mx-auto shadow-lg border-0">
          {/* Make header relative so the close button can be absolutely positioned */}
          <CardHeader className="relative flex flex-row items-center justify-center border-b bg-gray-50 p-4">
            <CardTitle className="text-xl">
              {editItem ? `עריכת פריט: ${editItem.tileName || 'פריט ריצוף'}` : 'הוספת פריט ריצוף חדש'}
            </CardTitle>

            {/* Move X to top-right and emphasize it */}
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={onCancel}
              className="absolute top-3 right-3 h-11 w-11 rounded-full bg-orange-500 text-white hover:bg-orange-600 shadow-lg"
            >
              <X className="h-6 w-6" />
              <span className="sr-only">סגור</span>
            </Button>
          </CardHeader>
          <CardContent className="pt-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
            <form onSubmit={handleSubmit} dir="rtl" className="space-y-8 text-lg md:text-xl">

              {/* 1. פרטים כלליים */}
              <div className="space-y-6">
                <CategoryHeader number="1" title="פרטים כלליים" colorScheme="slate" />

                {renderStyledBox({
                    title: "פרטי הפריט",
                    icon: <Edit className="h-5 w-5 text-slate-500 mr-3" />,
                    colorScheme: "slate",
                    children: (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="tileName" className="text-lg md:text-xl font-bold text-slate-800">שם הריצוף / חיפוי</Label>
                                <Input
                                  id="tileName"
                                  name="tileName"
                                  value={formData.tileName || ''}
                                  onChange={handleInputChange}
                                  placeholder="לדוגמה: גרניט פורצלן, ריצוף חוץ..."
                                  autoComplete="off"
                                  autoCorrect="off"
                                  autoCapitalize="none"
                                  spellCheck={false}
                                  className="bg-white border-gray-300 focus:border-slate-500 h-14 text-lg md:text-xl font-semibold"
                                />
                            </div>
                            <div>
                                <Label htmlFor="generalDescription" className="text-lg md:text-xl font-bold text-slate-800">תיאור כללי / הערות לפריט</Label>
                                <Textarea
                                  id="generalDescription"
                                  name="generalDescription"
                                  value={formData.generalDescription}
                                  onChange={handleInputChange}
                                  placeholder="הוסף פרטים נוספים כגון סוג החומר, דגם ספציפי, הערות התקנה חשובות..."
                                  spellCheck={false}
                                  autoCorrect="off"
                                  autoCapitalize="none"
                                  className="mt-1 min-h-[180px] bg-white border-gray-300 focus:border-slate-500 text-lg md:text-xl p-4"
                                />
                            </div>
                        </div>
                    )
                })}

                {renderStyledBox({
                    title: "בחר סוג עבודה *",
                    icon: <HardHat className="h-5 w-5 text-orange-500 mr-3" />,
                    colorScheme: "slate",
                    children: (
                        <div className="space-y-3">
                          {(!formData.workType || formData.workType.length === 0) && (
                            <p className="text-sm text-red-600 font-medium">* חובה לבחור סוג עבודה אחד</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {workTypes.map(wt => {
                                const isSelected = formData.workType && formData.workType.includes(wt);
                                return (
                                    <div key={wt} className="relative group">
                                        <Button
                                            type="button"
                                            variant={isSelected ? 'default' : 'outline'}
                                            className={`relative transition-all duration-200 ${isSelected
                                                ? 'bg-slate-600 text-white border-slate-600 shadow-md'
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-slate-50 hover:border-slate-400'
                                            } pr-8 pl-4 h-11 text-base md:text-lg px-5`}
                                            onClick={() => handleSelectChange('workType', wt)}
                                        >
                                            {wt}
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteDynamicOption('workTypes', wt);
                                            }}
                                            className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )
                            })}
                            <Popover open={addWorkTypePopover} onOpenChange={setAddWorkTypePopover}>
                                <PopoverTrigger asChild>
                                   <Button type="button" variant="outline" className="border-dashed bg-black text-white hover:bg-gray-700 h-11 text-base md:text-lg"><Plus className="h-4 w-4 mr-1" /> הוסף</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-60 p-2">
                                    <div className="flex gap-1">
                                        <Input value={newWorkType} onChange={(e) => setNewWorkType(e.target.value)} placeholder="הוסף סוג עבודה חדש..." />
                                        <Button size="sm" onClick={() => handleAddDynamicOption('workTypes')}>הוסף</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                    )
                })}

                {renderStyledBox({
                    title: "בחר גודל אריח *",
                    icon: <Ruler className="h-5 w-5 text-teal-500 mr-3" />,
                    colorScheme: "slate",
                    children: (
                        <>
                        {(!formData.selectedSizes || formData.selectedSizes.length === 0) && (
                          <p className="text-sm text-red-600 font-medium mb-2">* חובה לבחור גודל אחד</p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {tileSizes.map(size => (
                                <div key={size} className="relative group">
                                    <Button
                                        type="button"
                                        variant={formData.selectedSizes && formData.selectedSizes.includes(size) ? 'default' : 'outline'}
                                        className={`${formData.selectedSizes && formData.selectedSizes.includes(size)
                                            ? 'bg-slate-600 text-white border-slate-600 shadow-md'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-slate-50 hover:border-slate-400'
                                        } pr-8 h-11 text-base md:text-lg px-5`}
                                        onClick={() => handleSelectChange('selectedSizes', size)}
                                    >
                                        {size}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDynamicOption('sizes', size);
                                        }}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <Popover open={addSizePopover} onOpenChange={setAddSizePopover}>
                                <PopoverTrigger asChild>
                                   <Button type="button" variant="outline" className="border-dashed bg-black text-white hover:bg-gray-700 h-11 text-base md:text-lg"><Plus className="h-4 w-4 mr-1" /> הוסף</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4">
                                    <div className="space-y-3">
                                        <h4 className="font-medium text-sm">בחר גודל או הוסף חדש:</h4>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {['20x20', '25x25', '33x33', '40x40', '50x50', '75x75', '90x90', '15x60', '20x60', '30x60', '10x40', '15x90'].filter(size => !tileSizes.includes(size)).map(size => (
                                                <Button
                                                    key={size}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs"
                                                    onClick={() => {
                                                        const updatedOptions = [...tileSizes, size];
                                                        setTileSizes(updatedOptions);
                                                        saveDynamicOptions('sizes', updatedOptions);
                                                        setAddSizePopover(false);
                                                    }}
                                                >
                                                    {size}
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={newSize}
                                                onChange={(e) => setNewSize(e.target.value)}
                                                placeholder="גודל מותאם (לדוגמה: 120x60)"
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setNewSize(newSize + '×')}
                                                className="px-2 bg-slate-50 hover:bg-slate-100"
                                                title="הוסף סימן כפל"
                                            >
                                                ×
                                            </Button>
                                            <Button size="sm" onClick={() => handleAddDynamicOption('sizes')}>הוסף</Button>
                                        </div>
                                        <p className="text-xs text-gray-500">💡 לחץ על הכפתור × כדי להוסיף סימן כפל, או השתמש באפשרויות המוכנות למעלה</p>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        {formData.selectedSizes && formData.selectedSizes.includes('מותאם אישית') && (
                            <div>
                                <Label htmlFor="customSize">תיאור גודל מותאם אישית (לדוגמה: 120x60)</Label>
                                <Input id="customSize" name="customSize" value={formData.customSize || ''} onChange={handleInputChange} placeholder="לדוגמה: 120x60" className="bg-white border-gray-200 focus:border-slate-400 h-12 text-base md:text-lg" />
                            </div>
                        )}
                        </>
                    )
                })}
              </div>

              {/* 2. כמויות, חומרים ופאנל - בלוק מאוחד */}
              <div className="space-y-6">
                <CategoryHeader number="2" title="כמויות, חומרים ופאנל" colorScheme="amber" />
                {renderStyledBox({
                  title: "הספק עבודה, עלויות חומרים והגדרות פאנל",
                  icon: <Package className="h-5 w-5 text-green-500 mr-3" />,
                  colorScheme: "amber",
                  children: (
                    <div className="space-y-6">
                      {/* הספק עבודה (ללא עלות עובד) */}
                      <div>
                        <Label htmlFor="dailyOutput">הספק עבודה (ליום) *</Label>
                        <Input
                          id="dailyOutput"
                          name="dailyOutput"
                          type="number"
                          value={formData.dailyOutput}
                          onChange={handleInputChange}
                          placeholder='מ"ר'
                          className={`bg-white focus:border-amber-400 transition-all duration-300 ${(!formData.dailyOutput || Number(formData.dailyOutput) <= 0) ? 'border-red-300 border-2' : 'border-green-300 border-2'} h-12 text-base md:text-lg`}
                          required
                        />
                        {(!formData.dailyOutput || Number(formData.dailyOutput) <= 0) && (
                          <p className="text-xs text-red-600 mt-1">* חובה להזין - משפיע על חישוב ימי עבודה</p>
                        )}
                      </div>

                      {/* עלויות חומרים ופרמטרים */}
                      <div>
                        <h4 className="text-md font-semibold text-amber-800 mb-4 flex items-center">
                          <DollarSign className="h-4 w-4 ml-2" />
                          עלויות למ"ר
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="materialCost">עלות ריצוף</Label>
                            <Input id="materialCost" name="materialCost" type="number" value={formData.materialCost} onChange={handleInputChange} className="bg-white border-gray-200 focus:border-amber-400 h-12 text-base md:text-lg" />
                          </div>
                          <div>
                            <Label htmlFor="additionalCost">עלות למ"ר חומר שחור</Label>
                            <Input id="additionalCost" name="additionalCost" type="number" value={formData.additionalCost} onChange={handleInputChange} placeholder="דבק, רובה, איטום..." className="bg-white border-gray-200 focus:border-amber-400 h-12 text-base md:text-lg" />
                          </div>
                        </div>

                        {Number(formData.materialCost) > 0 && (
                          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <h4 className="text-md font-semibold text-amber-800 mb-4 flex items-center">
                              <Award className="h-5 w-5 text-amber-500 mr-3" />
                              בחר רמת איכות
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {qualityTiers.map(quality => (
                                <div key={quality} className="relative group">
                                  <Button
                                    type="button"
                                    variant={formData.selectedQuality === quality ? 'default' : 'outline'}
                                    className={`${formData.selectedQuality === quality ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white border-gray-300 text-gray-700 hover:bg-amber-50 hover:border-amber-400'} pr-8 h-11 text-base md:text-lg px-5`}
                                    onClick={() => handleSelectChange('selectedQuality', quality)}
                                  >
                                    {quality}
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteDynamicOption('qualities', quality); }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <Popover open={addQualityPopover} onOpenChange={setAddQualityPopover}>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" className="border-dashed bg-black text-white hover:bg-gray-700 h-11 text-base md:text-lg"><Plus className="h-4 w-4 mr-1" /> הוסף</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-60 p-2">
                                  <div className="flex gap-1">
                                    <Input value={newQuality} onChange={(e) => setNewQuality(e.target.value)} placeholder="הוסף רמת איכות חדשה..." />
                                    <Button size="sm" onClick={() => handleAddDynamicOption('qualities')}>הוסף</Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Label htmlFor="wastagePercent">אחוז בלאי (ריצוף) *</Label>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="w-4 h-4 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center cursor-help">?</div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="start" className="max-w-xs bg-gray-800 text-white p-3 rounded-lg border-none">
                                      <p className="font-bold">מוסיף אחוז בלאי (פחת) לעלות החומר של הריצוף.</p>
                                      <p className="mt-2"><strong>דוגמה:</strong> אם עלות החומר היא 100 ש"ח למ"ר, ואחוז הבלאי הוא 10%, המערכת תחשב את עלות החומר כ-110 ש"ח למ"ר.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <Input id="wastagePercent" name="wastagePercent" type="number" value={formData.wastagePercent} onChange={handleInputChange} placeholder="%" className="bg-white border-gray-200 focus:border-amber-400 h-12 text-base md:text-lg" required />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* פאנל לריצוף */}
                      <div>
                        <Separator className="bg-amber-200 my-6" />
                        <h4 className="text-md font-semibold text-amber-800 mb-4 flex items-center">
                            <Sidebar className="h-5 w-5 text-orange-500 mr-3" />
                            פאנל לריצוף
                        </h4>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 space-x-reverse">
                                <input
                                    type="checkbox"
                                    id="hasPanel"
                                    name="hasPanel"
                                    checked={formData.hasPanel}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                />
                                <Label htmlFor="hasPanel" className="text-sm font-medium text-gray-700">
                                    כולל פאנל לפריט זה
                                </Label>
                            </div>

                            {formData.hasPanel && (
                                <div className="space-y-4 mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="panelLaborWorkCapacity">הספק עבודה (מטר רץ ליום)</Label>
                                            <Input
                                                id="panelLaborWorkCapacity"
                                                name="panelLaborWorkCapacity"
                                                type="number"
                                                value={formData.panelLaborWorkCapacity}
                                                onChange={handleInputChange}
                                                placeholder="ברירת מחדל מהגדרות"
                                                className="bg-white border-amber-200 focus:border-amber-400 h-12 text-base md:text-lg"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Label htmlFor="panelUtilizationPercent">כמות תפוקה לפאנל באחוזים (%)</Label>
                                                     <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <span className="w-4 h-4 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center cursor-help">
                                                            ?
                                                          </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" align="start" className="max-w-xs bg-gray-800 text-white p-3 rounded-lg border-none">
                                                            <p className="font-bold">קובע איזה אחוז מעלות מטר מרובע של האריח המקורי מתורגם לעלות מטר רץ אחד של פאנל מוגמר.</p>
                                                            <p className="mt-2"><strong>דוגמה:</strong> אם מחיר למטר מרובע של אריח הוא 60 ש"ח, וכמות התפוקה לפאנל היא 50%, אז עלות החומר למטר רץ של פאנל תהיה 30 ש"ח.</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                </div>
                                                <Input
                                                    id="panelUtilizationPercent"
                                                    name="panelUtilizationPercent"
                                                    type="number"
                                                    value={formData.panelUtilizationPercent}
                                                    onChange={handleInputChange}
                                                    placeholder="ברירת מחדל מהגדרות"
                                                    className="bg-white border-amber-200 focus:border-amber-400 h-12 text-base md:text-lg"
                                                />
                                            </div>
                                    </div>
                                    <p className="text-xs text-amber-700">
                                        💡 הערכים למעלה נלקחים מברירות המחדל שהגדרת ב"ניהול מתקדם", אך ניתן לשנות אותם עבור פריט זה בלבד. הכמות הפועלית של הפאנל תיבחר בהצעת המחיר.
                                    </p>
                                </div>
                            )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 3. תמחור מהיר - ללא הזנת אחוז רווח בטופס (מציג את ברירת המחדל) */}
              <div className="space-y-6">
                <CategoryHeader number="3" title="תמחור" colorScheme="teal" />
                <Card className="border-2 border-teal-300 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl shadow-lg">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-teal-900">תמחור מהיר</span>
                    </CardTitle>
                    <CardDescription className="text-teal-700">
                      ניתן להגדיר אחוז רווח ייעודי לפריט זה. אם תישאר השדה ריק – נשתמש בברירת המחדל מההגדרות הראשיות.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-white rounded-lg shadow-sm border border-teal-200">
                        <Label className="flex items-center text-teal-700 font-semibold mb-2">
                          <Percent className="h-4 w-4 ml-2" />
                          אחוז רווח רצוי (לפריט)
                        </Label>
                        <Input
                          id="desiredProfitPercent"
                          name="desiredProfitPercent"
                          type="number"
                          value={formData.desiredProfitPercent === '' ? '' : formData.desiredProfitPercent}
                          onChange={(e) => handleQuickPricingChange('desiredProfitPercent', e.target.value)}
                          className="h-12 text-lg text-center font-bold border-teal-200"
                          placeholder={userTilingDefaults?.desiredProfitPercent != null ? String(userTilingDefaults.desiredProfitPercent) : 'לא הוגדר'}
                        />
                        <p className="text-xs text-teal-600 mt-1">
                          אם תשאיר ריק, נשתמש בברירת המחדל: {userTilingDefaults?.desiredProfitPercent ?? '—'}%
                        </p>
                      </div>
                      <div className="p-4 bg-white rounded-lg shadow-sm border border-teal-200">
                        <Label className="flex items-center text-teal-700 font-semibold mb-2">
                          <Calculator className="h-4 w-4 ml-2" />
                          כמות לדוגמה
                        </Label>
                        <div className="relative">
                            <Input
                              id="indicativeQuantity"
                              name="indicativeQuantity"
                              type="number"
                              value={quickPricingMode.indicativeQuantity || ''}
                              onChange={(e) => handleQuickPricingChange('indicativeQuantity', e.target.value)}
                              placeholder="לדוגמה: 50"
                              className="h-12 text-lg text-center font-bold pr-8 border-teal-200 focus:border-teal-400"
                              min="1"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500 font-semibold">מ"ר</span>
                        </div>
                      </div>
                    </div>

                    {quickMetrics && (
                      <div className="mt-6 p-6 bg-white rounded-xl border-2 border-teal-200 shadow-inner">
                        <h3 className="lg font-bold text-gray-800 mb-4 text-center">תוצאות החישוב עבור {quickPricingMode.indicativeQuantity} מ"ר</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200 flex flex-col justify-between">
                            <div>
                              <p className="text-sm text-orange-800 font-semibold mb-2">פירוט עלויות</p>
                              <p className="text-4xl font-bold text-orange-600">{quickMetrics.workDays?.toFixed(1)}</p>
                              <p className="text-md text-orange-700 font-medium">ימי עבודה</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-orange-200 space-y-2 text-sm text-right">
                              <p className="flex justify-between items-center"><span>חומרים:</span> <span className="font-bold">{formatPrice(quickMetrics.materialCost)} ₪</span></p>
                              <p className="flex justify-between items-center"><span>עבודה:</span> <span className="font-bold">{formatPrice(quickMetrics.laborCost)} ₪</span></p>
                              {quickMetrics.fixedCost > 0 && (
                                <p className="flex justify-between items-center"><span>עלות קבועה:</span> <span className="font-bold">{formatPrice(quickMetrics.fixedCost)} ₪</span></p>
                              )}
                            </div>
                          </div>

                          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 flex flex-col justify-center">
                            <p className="text-sm text-blue-800 font-semibold mb-2">עלות כוללת לקבלן</p>
                            <p className="text-4xl font-bold text-blue-600">{formatPrice(quickMetrics.totalCost)} ₪</p>
                            <div className="mt-4 pt-4 border-t border-blue-200">
                              <p className="text-sm text-blue-700 font-medium">עלות למ"ר</p>
                              <p className="text-2xl font-bold text-blue-800">{formatPrice(quickMetrics.costPerMeter)} ₪</p>
                            </div>
                          </div>

                          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 flex flex-col justify-center">
                            <p className="text-sm text-green-800 font-semibold mb-2">רווח כולל</p>
                            <p className="text-4xl font-bold text-green-600">{formatPrice(quickMetrics.profit)} ₪</p>
                            <Badge className="bg-green-200 text-green-900 mx-auto my-2">{quickMetrics.profitPercentage?.toFixed(1)}%</Badge>
                            <div className="mt-2 pt-4 border-t border-green-200">
                              <p className="text-sm text-green-700 font-medium">רווח למ"ר</p>
                              <p className="text-2xl font-bold text-green-800">{formatPrice(quickMetrics.profitPerMeter)} ₪</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 text-center p-4 bg-teal-50 rounded-lg border border-teal-200">
                          <p className="text-md text-teal-800 font-semibold">מחיר מכירה ללקוח</p>
                          <p className="text-5xl font-extrabold text-teal-600 my-2">{formatPrice(quickMetrics.totalSellingPrice)} ₪</p>
                          <p className="text-sm text-teal-700">לפי {formatPrice(quickMetrics.sellingPricePerMeter)} ₪ למ"ר</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* כפתורי פעולה - now inside the form */}
              <div className="flex justify-between items-center pt-6 border-t bg-gray-50 -mx-6 px-6 py-4 mt-8">
                <Button variant="ghost" type="button" onClick={onCancel}>ביטול</Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md hover:shadow-lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editItem ? 'עדכן פריט' : 'הוסף פריט'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
