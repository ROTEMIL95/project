
import React, { useState, useEffect, useMemo, useCallback, useRef, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RoomEstimatesCalculator from './RoomEstimatesCalculator';
import BucketUsageIndicator from './BucketUsageIndicator';
import { Plus, Trash2, Loader2, ArrowLeft, ArrowRight, Settings, Calculator as CalculatorIcon, Paintbrush2, PlusCircle, Hammer, AlertCircle, ChevronUp, ChevronDown, CheckCircle, PaintBucket, Calendar as CalendarIcon, Copy, Minus, Building2, Eye, EyeOff, Calculator, Edit, Check, Save, X, CalendarDays, Building } from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { createPageUrl } from '@/utils';

import TilingCategoryEditorComponent from './TilingCategoryEditor';
import TilingManualItemDialog from './TilingManualItemDialog';

import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

import HideTilingCatalogAdd from "./HideTilingCatalogAdd";
import TilingAutoSaveOnAddArea from "./TilingAutoSaveOnAddArea";

import PaintSimulatorV2 from "./PaintSimulatorV2";
import CategoryFloatingAddButton from './CategoryFloatingAddButton';


// Global PAINT_TYPES constant
const PAINT_TYPES = [
    { id: 'acrylic', name: 'אקרילי' },
    { id: 'supercryl', name: 'סופרקריל' },
    { id: 'oil', name: 'שמן' },
    { id: 'effects', name: 'אפקטים' },
    { id: 'tambourflex', name: 'טמבורפלקס' },
    { id: 'poksi', name: 'פוקסי' }
];

// פונקציית עזר לייצור שם תצוגה ברור לפריט - גרסה סופית ומתוקנת
const getItemDisplayName = (item) => {
    if (!item) return "";

    // קח את השם משדה itemName או paintName
    const fullName = item.itemName || item.paintName || item.name;

    if (fullName) {
        // אם השם מתחיל ב"עבודת צבע ", הסר את התחילית
        if (fullName.startsWith('עבודת צבע ')) {
            return fullName.replace('עבודת צבע ', '').trim();
        }
        // אם השם מתחיל ב"עבודת טיח ", הסר את התחילית
        if (fullName.startsWith('עבודת טיח ')) {
            return fullName.replace('עבודת טיח ', '').trim();
        }
        // אחרת, החזר את השם המלא
        return fullName;
    }

    // גיבוי אם השדות הנכונים לא קיימים
    if (item.paintType && !item.paintType.startsWith('custom_')) {
        return item.paintType;
    }

    return item.name || "פריט לא מזוהה";
};


/**
 * Centralized function to calculate paint/plaster metrics for both simple and detailed modes.
 * It dispatches to calculateExactPaintMetrics for individual item calculations and combines them.
 * @param {object} params - Object containing all necessary parameters for calculation.
 * @param {number} params.quantity - Total quantity for simple mode.
 * @param {number} params.layers - Total layers for simple mode.
 * @param {string} params.itemId - ID of the selected item for simple mode.
 * @param {Array<object>} params.paintItems - List of all available paint/plaster items.
 * @param {boolean} params.isDetailed - Flag indicating detailed mode (wall/ceiling).
 * @param {object} params.wallPaintItem - Item object for wall (detailed mode).
 * @param {object} params.ceilingPaintItem - Item object for ceiling (detailed mode).
 * @param {number} params.wallQuantity - Quantity for wall (detailed mode).
 * @param {number} params.ceilingQuantity - Quantity for ceiling (detailed mode).
 * @param {number} params.wallLayers - Layers for wall (detailed mode).
 * @param {number} params.ceilingLayers - Layers for ceiling (detailed mode).
 * @param {boolean} params.bucketCalculationEnabled - Whether to round up buckets for material cost.
 * @returns {object} - Object containing calculated metrics.
*/
const calculatePaintMetrics = ({
    quantity,
    layers,
    itemId,
    paintItems = [],
    isDetailed = false,
    wallPaintItem,
    ceilingPaintItem,
    wallQuantity,
    ceilingQuantity,
    wallLayers,
    ceilingLayers,
    bucketCalculationEnabled = false
}) => {

    if (isDetailed) {

        // Ensure both wall and ceiling items are valid for detailed calculation
        const wallMetrics = wallPaintItem && Number(wallQuantity) > 0 ? calculateExactPaintMetrics(Number(wallQuantity), wallLayers, wallPaintItem, bucketCalculationEnabled) : null;
        const ceilingMetrics = ceilingPaintItem && Number(ceilingQuantity) > 0 ? calculateExactPaintMetrics(Number(ceilingQuantity), ceilingLayers, ceilingPaintItem, bucketCalculationEnabled) : null;


        // Sum properties from individual metrics
        const totalCost = (wallMetrics?.totalCost || 0) + (ceilingMetrics?.totalCost || 0);
        const totalPrice = (wallMetrics?.totalSellingPrice || 0) + (ceilingMetrics?.totalSellingPrice || 0);
        const profit = totalPrice - totalCost;
        const totalQty = (wallMetrics?.quantity || 0) + (ceilingMetrics?.quantity || 0);

        const result = {
            materialCost: (wallMetrics?.materialCost || 0) + (ceilingMetrics?.materialCost || 0),
            laborCost: (wallMetrics?.laborCost || 0) + (ceilingMetrics?.laborCost || 0),
            otherCosts: (wallMetrics?.otherCosts || 0) + (ceilingMetrics?.otherCosts || 0),
            equipmentCost: (wallMetrics?.equipmentCost || 0) + (ceilingMetrics?.equipmentCost || 0),
            totalCost,
            costPerMeter: totalQty > 0 ? totalCost / totalQty : 0,
            totalSellingPrice: totalPrice,
            sellingPricePerMeter: totalQty > 0 ? totalPrice / totalQty : 0,
            totalProfit: profit,
            profitPercentage: totalCost > 0 ? (profit / totalCost) * 100 : (totalPrice > 0 ? 100 : 0),
            totalWorkDays: (wallMetrics?.totalWorkDays || 0) + (ceilingMetrics?.totalWorkDays || 0),
            totalBucketsNeeded: (wallMetrics?.totalBucketsNeeded || 0) + (ceilingMetrics?.totalBucketsNeeded || 0),
            originalBucketsNeeded: (wallMetrics?.originalBucketsNeeded || 0) + (ceilingMetrics?.originalBucketsNeeded || 0),
            quantity: totalQty,
            wallMetrics,
            ceilingMetrics
        };

        return result;
    }

    // Simple mode calculation
    if (!itemId || paintItems.length === 0) {
        return { totalCost: 0, totalSellingPrice: 0, totalProfit: 0, profitPercentage: 0, totalBucketsNeeded: 0, originalBucketsNeeded: 0, equipmentCost: 0 };
    }

    const paintItem = paintItems.find(item => item.id === itemId);
    if (!paintItem) {
        return { totalCost: 0, totalSellingPrice: 0, totalProfit: 0, profitPercentage: 0, totalBucketsNeeded: 0, originalBucketsNeeded: 0, equipmentCost: 0 };
    }

    const simpleMetrics = calculateExactPaintMetrics(Number(quantity), layers, paintItem, bucketCalculationEnabled);

    // Return exact metrics directly, no need for remapping from totalPrice/profit
    return simpleMetrics;
};

/**
 * Calculates detailed paint/plaster metrics based on quantity, layers, and item properties.
 * Can optionally round the total buckets needed for material cost.
 * @param {number} quantity - The total area in square meters.
 * @param {number} layers - The number of layers.
 * @param {object} paintItem - The paint/plaster item object with properties like bucketPrice, coverage, etc.
 * @param {boolean} [roundBuckets=false] - Whether to round up the total buckets needed for material cost.
 * @returns {object|null} - An object containing calculated metrics or null if inputs are invalid.
*/
export const calculateExactPaintMetrics = (quantity, layers, paintItem, roundBuckets = false) => {
  if (!paintItem || quantity <= 0) {
    return {
        materialCost: 0, laborCost: 0, otherCosts: 0, equipmentCost: 0,
        totalCost: 0, costPerMeter: 0, totalSellingPrice: 0, sellingPricePerMeter: 0,
        totalProfit: 0, profitPercentage: 0, totalWorkDays: 0, totalBucketsNeeded: 0,
        originalBucketsNeeded: 0, quantity: 0, itemId: paintItem?.id,
        itemName: paintItem?.itemName || paintItem?.paintName || getItemDisplayName(paintItem) || 'פריט לא מזוהה',
        bucketPrice: 0,
        bucketCapacity: paintItem?.bucketCapacity || 1
    };
  }

  const qty = Number(quantity);
  const numLayers = Number(layers);

  if (numLayers === 0) {
    const equipmentCost = Number(paintItem.equipmentCost || 0);
    const cleaningCostPerMeter = Number(paintItem.cleaningCostPerMeter || 0);
    const preparationCostPerMeter = Number(paintItem.preparationCostPerMeter || 0);
    const otherCosts = (qty * cleaningCostPerMeter) + (qty * preparationCostPerMeter);
    const totalCost = otherCosts + equipmentCost;
    const profitPercent = Number(paintItem.desiredProfitPercent || 0);
    const totalSellingPrice = totalCost * (1 + (profitPercent / 100));

    return {
        materialCost: 0,
        laborCost: 0,
        otherCosts: otherCosts,
        equipmentCost: equipmentCost,
        totalCost,
        costPerMeter: qty > 0 ? totalCost / qty : 0,
        totalSellingPrice,
        sellingPricePerMeter: qty > 0 ? totalSellingPrice / qty : 0,
        totalProfit: totalSellingPrice - totalCost,
        profitPercentage: profitPercent,
        totalWorkDays: 0,
        totalBucketsNeeded: 0,
        originalBucketsNeeded: 0,
        quantity: qty,
        itemId: paintItem.id,
        itemName: paintItem.itemName || paintItem.paintName || getItemDisplayName(paintItem) || 'פריט לא מזוהה',
        bucketPrice: 0,
        bucketCapacity: paintItem.bucketCapacity || 1
    };
  }

  // Base data from paint item
  const bucketPrice = Number(paintItem.bucketPrice || 0);
  const baseCoverage = Number(paintItem.coverage || 0);
  const workerDailyCost = Number(paintItem.workerDailyCost || 0);
  const baseDailyOutput = Number(paintItem.dailyOutput || 0);
  const equipmentCost = Number(paintItem.equipmentCost || 0);
  const cleaningCostPerMeter = Number(paintItem.cleaningCostPerMeter || 0);
  const preparationCostPerMeter = Number(paintItem.preparationCostPerMeter || 0);
  const profitPercent = Number(paintItem.desiredProfitPercent || 0);

  // Layer settings
  const layerSettings = paintItem.layerSettings || [];

  let exactTotalBucketsNeeded = 0;
  let totalWorkDays = 0;

  // Calculate for each layer
  for (let layer = 1; layer <= numLayers; layer++) {
    // Coverage for this layer
    let layerCoverage = baseCoverage;
    if (layer > 1 && layerSettings[layer - 1]) {
      const coverageAdjustment = layerSettings[layer - 1].coverage || 0;
      layerCoverage = baseCoverage * (1 + coverageAdjustment / 100);
    }

    // Daily output for this layer
    let layerDailyOutput = baseDailyOutput;
    if (layer > 1 && layerSettings[layer - 1]) {
      const outputAdjustment = layerSettings[layer - 1].dailyOutput || 0;
      layerDailyOutput = baseDailyOutput * (1 + outputAdjustment / 100);
    }

    // Calculate buckets and work days for this layer
    const bucketsForLayer = layerCoverage > 0 ? qty / layerCoverage : 0;
    const workDaysForLayer = layerDailyOutput > 0 ? qty / layerDailyOutput : 0;

    exactTotalBucketsNeeded += bucketsForLayer;
    totalWorkDays += workDaysForLayer;
  }

  // Apply rounding to buckets if requested for cost calculation
  const finalBucketsForCost = roundBuckets ? Math.ceil(exactTotalBucketsNeeded) : exactTotalBucketsNeeded;

  // Cost calculations
  const materialCost = finalBucketsForCost * bucketPrice;
  const laborCost = totalWorkDays * workerDailyCost;
  const otherCosts = (qty * cleaningCostPerMeter) + (qty * preparationCostPerMeter) + equipmentCost;
  const totalCost = materialCost + laborCost + otherCosts;

  // Pricing calculation
  const totalSellingPrice = totalCost * (1 + (profitPercent / 100));
  const sellingPricePerMeter = qty > 0 ? totalSellingPrice / qty : 0;
  const totalProfit = totalSellingPrice - totalCost;
  const costPerMeter = qty > 0 ? totalCost / qty : 0;

  return {
    materialCost,
    laborCost,
    otherCosts,
    equipmentCost,
    totalCost,
    costPerMeter,
    totalSellingPrice,
    sellingPricePerMeter,
    totalProfit,
    profitPercentage: profitPercent,
    totalWorkDays,
    totalBucketsNeeded: finalBucketsForCost,
    originalBucketsNeeded: exactTotalBucketsNeeded,
    quantity: qty,
    itemId: paintItem.id,
    itemName: paintItem.itemName || paintItem.paintName || getItemDisplayName(paintItem) || 'פריט לא מזוהה',
    bucketPrice: bucketPrice,
    bucketCapacity: paintItem.bucketCapacity || 1
  };
};

const formatPrice = (price) => {
  if (typeof price !== 'number' || isNaN(price)) return '0';
  return price.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const getProfitBadgeClass = (percent) => {
  if (percent >= 25) return "bg-green-100 text-green-800";
  if (percent >= 15) return "bg-blue-100 text-blue-800";
  return "bg-yellow-100 text-yellow-800";
};


// פונקציית עזר לקביעת שכבות זמינות - מתוקנת (not strictly used by SelectItem anymore based on fixed list)
const getAvailableLayers = (item) => {
    if (!item) return [0, 1];

    const maxLayers = item.layers || item.maxLayers || 1;

    const layers = [0];
    for (let i = 1; i <= Math.min(maxLayers, 3); i++) {
        layers.push(i);
    }
    layers.sort((a,b) => a-b);
    return layers;
};

// Helper function for safe number conversion
const safeNumber = (value, defaultValue = 0) => {
    return (typeof value === 'number' && !isNaN(value)) ? value : defaultValue;
};
// Helper function for general number formatting (e.g., percentages, work days)
const formatValue = (value, decimals = 1) => {
    return safeNumber(value).toFixed(decimals);
};

// Modified MetricDisplay to support secondary value
const MetricDisplay = ({ label, value, secondaryValue, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-800',
        red: 'bg-red-100 text-red-800',
        green: 'bg-green-100 text-green-800',
        orange: 'bg-orange-100 text-orange-800',
        purple: 'bg-purple-100 text-purple-800',
        default: 'bg-gray-100 text-gray-800'
    };

    const selectedColor = colorClasses[color] || colorClasses.default;

    return (
        <div className={`p-3 rounded-lg text-center ${selectedColor} shadow-sm`}>
            <div className="text-lg font-bold">{value}</div>
            {secondaryValue && <div className="text-sm font-medium opacity-80">{secondaryValue}</div>}
            <div className="text-xs font-medium opacity-80 mt-1">{label}</div>
        </div>
    );
};

const PaintItemsManager = ({
    items,
    onUpdateItem,
    onRemoveItem,
    onAddItem,
    userPaintItems,
    onUpdateRoomBreakdown,
    initialRoomBreakdown,
}) => {
    const [isAddingNew, setIsAddingNew] = useState(false);

    // Define complexity options as per outline - with 6 levels and 10% increments
    const complexityOptions = useMemo(() => [
        { value: 'none', label: 'ללא מורכבות', percentage: 0, description: 'עבודה רגילה ללא תוספות מחיר' },
        { value: 'light', label: 'מורכבות קלה', percentage: 10, description: 'גישה מוגבלת, פינות קשות, עבודה בגובה נמוך' },
        { value: 'medium', label: 'מורכבות בינונית', percentage: 20, description: 'תקרות גבוהות, פרטי עיטור, דקות רבות' },
        { value: 'high', label: 'מורכבות גבוהה', percentage: 30, description: 'עבודה מעל ריהוט, חללים צרים, תנאי עבודה מורכבים' },
        { value: 'very_high', label: 'מורכבות גבוהה מאוד', percentage: 40, description: 'תנאי עבודה קשים מאוד, גישה מוגבלת ביותר' },
        { value: 'extreme', label: 'מורכבות קיצונית', percentage: 50, description: 'תנאי עבודה קשים במיוחד, גישה מאוד מוגבלת' }
    ], []);

    const getComplexityDefinition = useCallback((value) => {
        if (!value) return null;
        return complexityOptions.find(opt => opt.value === value) || null;
    }, [complexityOptions]);

    const updatePaintItem = useCallback((id, field, value) => {
        const itemToUpdate = items.find(i => i.id === id);
        if (!itemToUpdate) return;

        let updatedItem = { ...itemToUpdate, [field]: value };

        if (field === 'complexity') {
            const complexityDef = getComplexityDefinition(value);
            if (complexityDef) {
                const basePrice = (updatedItem.basePrice !== undefined) ? updatedItem.basePrice : updatedItem.totalPrice;
                const complexityAddedCost = basePrice * (complexityDef.percentage / 100);
                updatedItem.totalPrice = basePrice + complexityAddedCost;
                updatedItem.complexityAddedCost = complexityAddedCost;
                updatedItem.complexityDescription = `${complexityDef.label} (+${complexityDef.percentage}%)`;
            }
        }
        onUpdateItem(id, updatedItem);
    }, [items, onUpdateItem, getComplexityDefinition]);

    const handleAddItemFromUserCatalog = (userItem) => {
        onAddItem({
            ...userItem,
            id: `paint_${Date.now()}`,
            categoryId: 'cat_paint_plaster',
            categoryName: 'צבע וטיח',
            unit: 'מ"ר',
            quantity: 1,
            totalPrice: 0,
            totalCost: 0,
            workDuration: 0,
            materialCost: 0,
            laborCost: 0,
            source: 'paint_plaster_category_summary',
            complexity: 'none',
            complexityAddedCost: 0,
            basePrice: 0,
        });
        setIsAddingNew(false);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">ניהול פריטי צבע</h3>

            {items && items.filter(i => i.categoryId === 'cat_paint_plaster').map(item => (
                <Card key={item.id} className="bg-white shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between p-4 bg-gray-50/50">
                        <div className="flex-grow">
                            <CardTitle className="text-base font-bold text-gray-800">{item.name || "פריט צבע"}</CardTitle>
                            {item.description && <CardDescription className="text-xs text-gray-600 mt-1">{item.description}</CardDescription>}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor={`complexity-${item.id}`}>רמת מורכבות</Label>
                                <Select value={item.complexity} onValueChange={(value) => updatePaintItem(item.id, 'complexity', value)}>
                                    <SelectTrigger id={`complexity-${item.id}`} className="w-full bg-white border-gray-200">
                                        <SelectValue placeholder="בחר רמת מורכבות" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {complexityOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                <div className="flex justify-between items-center w-full">
                                                    <span>{option.label}</span>
                                                    {option.percentage > 0 && (
                                                        <span className="text-yellow-600 font-semibold text-sm mr-2">
                                                            (הוספה +{option.percentage}%)
                                                        </span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Collapsible open={isAddingNew} onOpenChange={setIsAddingNew}>
                <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full border-dashed">
                        <Plus className="w-4 h-4 ml-2" />
                        {isAddingNew ? 'בטל הוספה' : 'הוסף פריט צבע מהקטלוג'}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 mt-2 border rounded-lg bg-gray-50">
                    <h4 className="text-md font-semibold mb-2">בחר פריט להוספה:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {userPaintItems.length > 0 ? userPaintItems.map(userItem => (
                            <button
                                key={userItem.id}
                                onClick={() => handleAddItemFromUserCatalog(userItem)}
                                className="w-full text-right p-2 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                {userItem.name}
                            </button>
                        )) : (
                            <p className="text-sm text-gray-500">אין פריטי צבע שמורים בקטלוג האישי.</p>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>

        </div>
    );
};


const PaintRoomItem = ({ roomIndex, room, onUpdateRoom, onUpdateRoomMetrics, onRemoveRoom, paintItems, projectComplexities, user }) => {
    const [isPaintVisible, setIsPaintVisible] = useState(room.isPaintSelected || false);
    const [isPlasterVisible, setIsPlasterVisible] = useState(room.isPlasterSelected || false);
    const [isAdvancedCalcOpen, setAdvancedCalcOpen] = useState(false);

    const [isDetailedPaint, setIsDetailedPaint] = useState(room.isDetailedPaint || false);
    const [isPlasterDetailed, setIsPlasterDetailed] = useState(room.isDetailedPlaster || false);

    const [isCostsDetailsOpen, setIsCostsDetailsOpen] = useState(false);

    const [selectedPaintId, setSelectedPaintId] = useState(room.paintItemId || '');
    const [paintQuantity, setPaintQuantity] = useState(room.paintQuantity || '');
    const [paintLayers, setPaintLayers] = useState(room.paintLayers || 0);

    useEffect(() => {
        if (paintItems.length > 0) {
        }
    }, [paintItems]);

    const [wallPaintId, setWallPaintId] = useState(room.wallPaintId || '');
    const [wallPaintQuantity, setWallPaintQuantity] = useState(room.wallPaintQuantity || '');
    const [wallPaintLayers, setWallPaintLayers] = useState(room.wallPaintLayers || 0);
    const [ceilingPaintId, setCeilingPaintId] = useState(room.ceilingPaintId || '');
    const [ceilingPaintQuantity, setCeilingPaintQuantity] = useState(room.ceilingPaintQuantity || '');
    const [ceilingPaintLayers, setCeilingPaintLayers] = useState(room.ceilingPaintLayers || 0);

    const [selectedPlasterId, setSelectedPlasterId] = useState(room.plasterItemId || '');
    const [plasterQuantity, setPlasterQuantity] = useState(room.plasterQuantity || '');
    const [plasterLayers, setPlasterLayers] = useState(room.plasterLayers || 0);

    const [wallPlasterId, setWallPlasterId] = useState(room.wallPlasterId || '');
    const [wallPlasterQuantity, setWallPlasterQuantity] = useState(room.wallPlasterQuantity || '');
    const [wallPlasterLayers, setWallPlasterLayers] = useState(room.wallPlasterLayers || 0);
    const [ceilingPlasterId, setCeilingPlasterId] = useState(room.ceilingPlasterId || '');
    const [ceilingPlasterQuantity, setCeilingPlasterQuantity] = useState(room.ceilingPlasterQuantity || '');
    const [ceilingPlasterLayers, setCeilingPlasterLayers] = useState(room.ceilingPlasterLayers || 0);

    const [isComplexityOpen, setIsComplexityOpen] = useState(room.isComplexityOpen || false);

    const complexityOptions = useMemo(() => [
        { value: 'none', label: 'ללא מורכבות', percentage: 0, description: 'עבודה רגילה ללא תוספות מחיר' },
        { value: 'light', label: 'מורכבות קלה', percentage: 10, description: 'גישה מוגבלת, פינות קשות, עבודה בגובה נמוך' },
        { value: 'medium', label: 'מורכבות בינונית', percentage: 20, description: 'תקרות גבוהות, פרטי עיטור, דקות רבות' },
        { value: 'high', label: 'מורכבות גבוהה', percentage: 30, description: 'עבודה מעל ריהוט, חללים צרים, תנאי עבודה מורכבים' },
        { value: 'very_high', label: 'מורכבות גבוהה מאוד', percentage: 40, description: 'תנאי עבודה קשים מאוד, גישה מוגבלת ביותר' },
        { value: 'extreme', label: 'מורכבות קיצונית', percentage: 50, description: 'תנאי עבודה קשים במיוחד, גישה מאוד מוגבלת' }
    ], []);

    const getComplexityDefinition = useCallback((value) => {
        if (!value) return null;
        return complexityOptions.find(opt => opt.value === value) || null;
    }, [complexityOptions]);


    const paintItem = useMemo(() => paintItems.find(p => p.id === selectedPaintId), [selectedPaintId, paintItems]);
    const plasterItem = useMemo(() => paintItems.find(p => p.id === selectedPlasterId), [selectedPlasterId, paintItems]);

    const wallPaintItem = useMemo(() => paintItems.find(p => p.id === wallPaintId), [wallPaintId, paintItems]);
    const ceilingPaintItem = useMemo(() => paintItems.find(p => p.id === ceilingPaintId), [ceilingPaintId, paintItems]);
    const wallPlasterItem = useMemo(() => paintItems.find(p => p.id === wallPlasterId), [wallPlasterId, paintItems]);
    const ceilingPlasterItem = useMemo(() => paintItems.find(p => p.id === ceilingPlasterId), [ceilingPlasterId, paintItems]);

    const calculateMetricsWithComplexity = useCallback((baseMetrics, complexityPercent) => {
        if (!baseMetrics || complexityPercent === 0) return baseMetrics;

        const originalLaborCost = baseMetrics.laborCost || 0;
        const originalTotalCost = baseMetrics.totalCost || 0;
        const originalTotalSellingPrice = baseMetrics.totalSellingPrice || 0;
        const originalWorkDays = baseMetrics.totalWorkDays || 0;

        const complexityLaborCostIncrease = originalLaborCost * (complexityPercent / 100);
        const newLaborCost = originalLaborCost + complexityLaborCostIncrease;

        const complexityWorkDaysIncrease = originalWorkDays * (complexityPercent / 100);
        const newTotalWorkDays = originalWorkDays + complexityWorkDaysIncrease;

        const newTotalCost = (baseMetrics.materialCost || 0) + newLaborCost + (baseMetrics.otherCosts || 0);

        const originalProfitPercent = baseMetrics.profitPercentage;
        const newTotalSellingPrice = newTotalCost * (1 + (originalProfitPercent / 100));
        const newTotalProfit = newTotalSellingPrice - newTotalCost;

        const totalClientIncrease = newTotalSellingPrice - originalTotalSellingPrice;
        const profitAdjustmentIncrease = totalClientIncrease - complexityLaborCostIncrease;

        const newSellingPricePerMeter = baseMetrics.quantity > 0 ? newTotalSellingPrice / baseMetrics.quantity : 0;
        const newCostPerMeter = baseMetrics.quantity > 0 ? newTotalCost / baseMetrics.quantity : 0;

        return {
            ...baseMetrics,
            laborCost: newLaborCost,
            totalCost: newTotalCost,
            totalSellingPrice: newTotalSellingPrice,
            totalProfit: newTotalProfit,
            profitPercentage: originalProfitPercent,
            sellingPricePerMeter: newSellingPricePerMeter,
            costPerMeter: newCostPerMeter,
            totalWorkDays: newTotalWorkDays,
            complexityIncrease: complexityLaborCostIncrease,
            complexityWorkDaysIncrease: complexityWorkDaysIncrease,
            profitAdjustmentIncrease: profitAdjustmentIncrease,
            totalClientIncrease: totalClientIncrease,
            appliedComplexityPercent: complexityPercent,
            originalLaborCost: originalLaborCost,
            originalTotalCost: originalTotalCost,
            originalTotalSellingPrice: originalTotalSellingPrice,
            originalWorkDays: originalWorkDays
        };
    }, []);

    const paintMetrics = useMemo(() => {
        if (!isPaintVisible) return null;
        const baseMetrics = calculatePaintMetrics({
            quantity: Number(paintQuantity),
            layers: paintLayers,
            itemId: selectedPaintId,
            paintItems: paintItems,
            isDetailed: isDetailedPaint,
            wallPaintItem: wallPaintItem,
            ceilingPaintItem: ceilingPaintItem,
            wallQuantity: Number(wallPaintQuantity),
            ceilingQuantity: Number(ceilingPaintQuantity),
            wallLayers: wallPaintLayers,
            ceilingLayers: ceilingPaintLayers,
            bucketCalculationEnabled: false
        });

        const paintComplexityDef = getComplexityDefinition(room.paintComplexity);
        const paintComplexityPercentage = paintComplexityDef ? paintComplexityDef.percentage : 0;

        return calculateMetricsWithComplexity(baseMetrics, paintComplexityPercentage);
    }, [
        isPaintVisible, isDetailedPaint, paintQuantity, paintLayers, selectedPaintId, paintItems,
        wallPaintItem, ceilingPaintItem, wallPaintQuantity, ceilingPaintQuantity, wallPaintLayers, ceilingPaintLayers,
        calculateMetricsWithComplexity, room.paintComplexity, getComplexityDefinition
    ]);

    const plasterMetrics = useMemo(() => {
        if (!isPlasterVisible) return null;
        const baseMetrics = calculatePaintMetrics({
            quantity: Number(plasterQuantity),
            layers: plasterLayers,
            itemId: selectedPlasterId,
            paintItems: paintItems,
            isDetailed: isPlasterDetailed,
            wallPaintItem: wallPlasterItem,
            ceilingPaintItem: ceilingPlasterItem,
            wallQuantity: Number(wallPlasterQuantity),
            ceilingQuantity: Number(ceilingPlasterQuantity),
            wallLayers: wallPlasterLayers,
            ceilingLayers: ceilingPlasterLayers,
            bucketCalculationEnabled: false
        });

        const plasterComplexityDef = getComplexityDefinition(room.plasterComplexity);
        const plasterComplexityPercentage = plasterComplexityDef ? plasterComplexityDef.percentage : 0;

        return calculateMetricsWithComplexity(baseMetrics, plasterComplexityPercentage);
    }, [
        isPlasterVisible, isPlasterDetailed, plasterQuantity, plasterLayers, selectedPlasterId, paintItems,
        wallPlasterItem, ceilingPlasterItem, wallPlasterQuantity, ceilingPlasterQuantity, wallPlasterLayers, ceilingPlasterLayers,
        calculateMetricsWithComplexity, room.plasterComplexity, getComplexityDefinition
    ]);

    const handleMetricsUpdate = useCallback((metrics, type = 'paint') => {
        onUpdateRoom(room.id, {
            [`${type}CalculatedMetrics`]: metrics,
            isPaintSelected: type === 'paint' ? isPaintVisible : room.isPaintSelected,
            isPlasterSelected: type === 'plaster' ? isPlasterVisible : room.isPlasterSelected,
            isDetailedPaint: type === 'paint' ? isDetailedPaint : room.isDetailedPaint,
            isPlasterDetailed: type === 'plaster' ? isPlasterDetailed : room.isPlasterDetailed,
            paintItemId: type === 'paint' ? selectedPaintId : room.paintItemId,
            paintQuantity: type === 'paint' ? paintQuantity : room.paintQuantity,
            paintLayers: type === 'paint' ? paintLayers : room.paintLayers,
            wallPaintId: type === 'paint' ? wallPaintId : room.wallPaintId,
            wallPaintQuantity: type === 'paint' ? wallPaintQuantity : room.wallPaintQuantity,
            wallPaintLayers: type === 'paint' ? wallPaintLayers : room.wallPaintLayers,
            ceilingPaintId: type === 'paint' ? ceilingPaintId : room.ceilingPaintId,
            ceilingPaintQuantity: type === 'paint' ? ceilingPaintQuantity : room.ceilingPaintQuantity,
            ceilingPaintLayers: type === 'paint' ? ceilingPaintLayers : room.ceilingPaintLayers,
            plasterItemId: type === 'plaster' ? selectedPlasterId : room.plasterItemId,
            plasterQuantity: type === 'plaster' ? plasterQuantity : room.plasterQuantity,
            plasterLayers: type === 'plaster' ? plasterLayers : room.plasterLayers,
            wallPlasterId: type === 'plaster' ? wallPlasterId : room.wallPlasterId,
            wallPlasterQuantity: type === 'plaster' ? wallPlasterQuantity : room.wallPlasterQuantity,
            wallPlasterLayers: type === 'plaster' ? wallPlasterLayers : room.wallPlasterLayers,
            ceilingPlasterId: type === 'plaster' ? ceilingPlasterId : room.ceilingPlasterId,
            ceilingPlasterQuantity: type === 'plaster' ? ceilingPlasterQuantity : room.ceilingPlasterQuantity,
            ceilingPlasterLayers: type === 'plaster' ? ceilingPlasterLayers : room.ceilingPlasterLayers,
            isComplexityOpen,
            paintComplexity: room.paintComplexity,
            paintCustomComplexityDescription: room.paintCustomComplexityDescription,
            plasterComplexity: room.plasterComplexity,
            plasterCustomComplexityDescription: room.plasterCustomComplexityDescription,
            calculatedWallArea: room.calculatedWallArea,
            calculatedCeilingArea: room.calculatedCeilingArea,
            roomBreakdown: room.roomBreakdown,
        });

        if (onUpdateRoomMetrics) {
            onUpdateRoomMetrics(room.id, metrics, type);
        }
    }, [
        room, onUpdateRoom, onUpdateRoomMetrics, isPaintVisible, isPlasterVisible, isDetailedPaint, isPlasterDetailed,
        selectedPaintId, paintQuantity, paintLayers, wallPaintId, wallPaintQuantity, wallPaintLayers,
        ceilingPaintId, ceilingPaintQuantity, ceilingPaintLayers, selectedPlasterId, plasterQuantity, plasterLayers,
        wallPlasterId, wallPlasterQuantity, wallPlasterLayers, ceilingPlasterId, ceilingPlasterQuantity, ceilingPlasterLayers,
        paintItem, wallPaintItem, ceilingPaintItem, plasterItem, wallPlasterItem, ceilingPlasterItem,
        isComplexityOpen,
    ]);

    useEffect(() => {
        if (isPaintVisible && paintMetrics) {
            handleMetricsUpdate(paintMetrics, 'paint');
        } else if (!isPaintVisible && room.paintCalculatedMetrics) {
            handleMetricsUpdate(null, 'paint');
        }
    }, [isPaintVisible, paintMetrics, handleMetricsUpdate, room.paintCalculatedMetrics]);

    useEffect(() => {
        if (isPlasterVisible && plasterMetrics) {
            handleMetricsUpdate(plasterMetrics, 'plaster');
        } else if (!isPlasterVisible && room.plasterCalculatedMetrics) {
            handleMetricsUpdate(null, 'plaster');
        }
    }, [isPlasterVisible, plasterMetrics, handleMetricsUpdate, room.plasterCalculatedMetrics]);


    const handleOpenGlobalEstimatesCalculator = useCallback((type) => {
        setAdvancedCalcOpen({
            type,
            roomData: {
                initialWallQuantity: type === 'paint' ? wallPaintQuantity : wallPlasterQuantity,
                initialCeilingQuantity: type === 'paint' ? ceilingPaintQuantity : ceilingPlasterQuantity,
                roomBreakdown: room.roomBreakdown,
                calculatedWallArea: room.calculatedWallArea,
                calculatedCeilingArea: room.calculatedCeilingArea,
            }
        });
    }, [wallPaintQuantity, ceilingPaintQuantity, wallPlasterQuantity, ceilingPlasterQuantity, room.roomBreakdown, room.calculatedWallArea, room.calculatedCeilingArea]);

    const handleApplyAdvancedCalc = useCallback(({ wallSqM, ceilingSqM, detailedRooms }) => {
        if (isAdvancedCalcOpen.type === 'paint') {
            if (wallSqM > 0) {
                setWallPaintQuantity(wallSqM.toString());
            }
            if (ceilingSqM > 0) {
                setCeilingPaintQuantity(ceilingSqM.toString());
            }
            setIsDetailedPaint(true);
        } else if (isAdvancedCalcOpen.type === 'plaster') {
            if (wallSqM > 0) {
                setWallPlasterQuantity(wallSqM.toString());
            }
            if (ceilingSqM > 0) {
                setCeilingPlasterQuantity(ceilingSqM.toString());
            }
            setIsPlasterDetailed(true);
        }

        onUpdateRoom(room.id, {
            ...room,
            roomBreakdown: detailedRooms,
            calculatedWallArea: wallSqM,
            calculatedCeilingArea: ceilingSqM
        });

        setAdvancedCalcOpen(false);
    }, [isAdvancedCalcOpen, setWallPaintQuantity, setCeilingPaintQuantity, setWallPlasterQuantity, setCeilingPlasterQuantity, onUpdateRoom, room]);

    const handleRoomUpdate = useCallback((key, value) => {
        onUpdateRoom(room.id, { ...room, [key]: value });
    }, [room, onUpdateRoom]);

    const getSelectedComplexityDescription = useCallback((type) => {
        const selectedValue = type === 'paint' ? room.paintComplexity : room.plasterComplexity;
        if (!selectedValue || selectedValue === 'none') return '';
        const option = getComplexityDefinition(selectedValue);
        return option ? option.description : '';
    }, [room.paintComplexity, room.plasterComplexity, getComplexityDefinition]);

    const [isFullBreakdownOpen, setIsFullBreakdownOpen] = useState(false);


    const renderWorkSection = (type) => {
        const isPaint = type === 'paint';
        const title = isPaint ? 'צבע' : 'טיח';
        const workCategory = isPaint ? 'paint' : 'plaster';
        const colorClass = isPaint ? 'blue' : 'orange';
        const isDetailed = isPaint ? isDetailedPaint : isPlasterDetailed;
        const setIsDetailed = isPaint ? setIsDetailedPaint : setIsPlasterDetailed;
        const availableItems = paintItems.filter(p => p.workCategory === workCategory);

        const currentMetrics = isPaint ? paintMetrics : plasterMetrics;

        const renderTypeSelect = () => (
            <div className="space-y-1">
                <Label>סוג {title}</Label>
                <Select value={isPaint ? selectedPaintId : selectedPlasterId} onValueChange={(value) => {
                    if (isPaint) {
                        setSelectedPaintId(value);
                    } else {
                        setSelectedPlasterId(value);
                    }
                }}>
                    <SelectTrigger  dir="rtl" className={cn('border-2', (isPaint ? !selectedPaintId : !selectedPlasterId) ? 'border-red-300' : 'border-green-300')}>
                        <SelectValue placeholder={`בחר סוג ${title}`}>
                            {isPaint
                                ? (paintItem ? getItemDisplayName(paintItem) : "בחר סוג צבע")
                                : (plasterItem ? getItemDisplayName(plasterItem) : "בחר סוג טיח")
                            }
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                        {availableItems.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                                {getItemDisplayName(p)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );

        const renderLayersSelect = (item, currentLayers, onLayersChange) => {
            const availableLayers = getAvailableLayers(item);
            return (
                <div className="space-y-1">
                    <Label>מספר שכבות</Label>
                    <Select
                        value={String(currentLayers)}
                        onValueChange={(value) => onLayersChange(Number(value))}
                    >
                        <SelectTrigger dir="rtl" className={cn(
                            "text-center font-medium transition-colors duration-200 bg-white text-gray-900",
                            currentLayers > 0
                                ? "border-green-400"
                                : "border-red-400"
                        )}>
                            <SelectValue placeholder="בחר שכבות" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableLayers.map(layerNum => (
                                <SelectItem key={layerNum} value={String(layerNum)}>
                                    {layerNum === 0 ? "0 שכבות" : `${layerNum} שכבה${layerNum > 1 ? 'ות' : ''}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        };

        const renderQuantityInput = () => (
            <div className="space-y-1">
                <Label>כמות (מ"ר)</Label>
                <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="הזן כמות"
                    value={isPaint ? paintQuantity : plasterQuantity}
                    onChange={(e) => (isPaint ? setPaintQuantity : setPlasterQuantity)(e.target.value)}
                    className={cn('border-2', (isPaint ? (!paintQuantity || Number(paintQuantity) <= 0) : (!plasterQuantity || Number(plasterQuantity) <= 0)) ? 'border-red-300' : 'border-green-300')}
                />
            </div>
        );

        const renderDetailedInputs = (areaType) => {
            const isWall = areaType === 'wall';
            const itemHookId = isPaint ? (isWall ? wallPaintId : ceilingPaintId) : (isWall ? wallPlasterId : ceilingPlasterId);
            const setItemHookId = isPaint ? (isWall ? setWallPaintId : setCeilingPaintId) : (isWall ? setWallPlasterId : setCeilingPlasterId);
            const itemHookQuantity = isPaint ? (isWall ? wallPaintQuantity : ceilingPaintQuantity) : (isWall ? wallPlasterQuantity : ceilingPlasterQuantity);
            const setItemHookQuantity = isPaint ? (isWall ? setWallPaintQuantity : setCeilingPaintQuantity) : (isWall ? setWallPlasterQuantity : setCeilingPlasterQuantity);
            const itemHookLayers = isPaint ? (isWall ? wallPaintLayers : ceilingPaintLayers) : (isWall ? wallPlasterLayers : ceilingPlasterLayers);
            const setItemHookLayers = isPaint ? (isWall ? setWallPaintLayers : setCeilingPaintLayers) : (isWall ? setWallPlasterLayers : setCeilingPlasterLayers);
            const itemHook = isPaint ? (isWall ? wallPaintItem : ceilingPaintItem) : (isWall ? wallPlasterItem : ceilingPlasterItem);
            const calculatedArea = isWall ? room.calculatedWallArea : room.calculatedCeilingArea;

            return (
                <div className="p-4 border-l-4 border-gray-400 bg-white rounded-r-md">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-gray-700">{title} {isWall ? 'קירות' : 'תקרה'}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
                        <div className="space-y-1">
                            <Label>סוג {title}</Label>
                            <Select value={itemHookId} onValueChange={setItemHookId}>
                                <SelectTrigger className={cn('border-2', !itemHookId ? 'border-red-300' : 'border-green-300')}>
                                    <SelectValue>
                                        {itemHook ? getItemDisplayName(itemHook) : `בחר סוג ${title}`}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {availableItems.map(item => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {getItemDisplayName(item)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {renderLayersSelect(itemHook, itemHookLayers, setItemHookLayers)}
                        <div className="space-y-1">
                            <Label>כמות (מ"ר)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={itemHookQuantity}
                                onChange={(e) => setItemHookQuantity(e.target.value)}
                                className={cn('border-2', (!itemHookQuantity || Number(itemHookQuantity) <= 0) ? 'border-red-300' : 'border-green-300', calculatedArea > 0 ? "bg-green-50" : "")}
                            />
                        </div>
                    </div>
                </div>
            );
        };

        return (
             <div
                className={`space-y-4 p-3 bg-${colorClass}-50/50 border border-${colorClass}-200 rounded-md overflow-hidden`}
            >
                <div className="flex items-center justify-between ">
                    <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2" >
                        {isPaint ? <Paintbrush2 className={`w-5 h-5 text-${colorClass}-600`}  /> : <Building2 className={`w-5 h-5 text-${colorClass}-600`} />}
                        {isPaint ? 'הגדרות צבע' : 'הגדרות טיח'}
                    </h4>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setIsDetailed(!isDetailed)}
                        >
                            {isDetailed ? <EyeOff className="w-3 h-3 ml-1" /> : <Eye className="w-3 h-3 ml-1" />}
                            {isDetailed ? 'מצב פשוט' : 'מצב מפורט'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleOpenGlobalEstimatesCalculator(type)}
                        >
                            <CalculatorIcon className="w-3 h-3 ml-1" />
                            חישוב מתקדם
                        </Button>
                    </div>
                </div>

                {!isDetailed ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        {renderTypeSelect()}
                        {renderLayersSelect(isPaint ? paintItem : plasterItem, isPaint ? paintLayers : plasterLayers, isPaint ? setPaintLayers : setPlasterLayers)}
                        {renderQuantityInput()}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {renderDetailedInputs('wall')}
                        {renderDetailedInputs('ceiling')}
                        <div className="flex justify-between items-center pt-2">
                            <Button variant="outline" size="sm" onClick={() => setIsDetailed(false)}>
                                ← חזור למצב פשוט
                            </Button>
                            <div className="text-xs text-gray-500">
                                💡 טיפ: השתמש ב"חישוב מתקדם" לחישוב מדויק של שטחים
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg text-center bg-blue-50 border border-blue-200 shadow-sm">
                        <div className="text-xl font-bold text-blue-800">{formatPrice(currentMetrics?.totalSellingPrice || 0)} ₪</div>
                        <div className="text-sm text-gray-600">מחיר ללקוח</div>
                        <div className="text-xs text-blue-500">{formatPrice(currentMetrics?.sellingPricePerMeter || 0)} ₪ למ"ר</div>
                    </div>
                    <div className="p-3 rounded-lg text-center bg-red-50 border border-red-200 shadow-sm">
                        <div className="text-xl font-bold text-red-800">{formatPrice(currentMetrics?.totalCost || 0)} ₪</div>
                        <div className="text-sm text-gray-600">עלות קבלן</div>
                        <div className="text-xs text-gray-500">{formatPrice(currentMetrics?.costPerMeter || 0)} ₪ למ"ר</div>
                    </div>
                    <div className="p-3 rounded-lg text-center bg-green-100 border border-green-300 shadow-sm">
                        <div className="text-xl font-bold text-green-800">{formatPrice((currentMetrics?.totalSellingPrice || 0) - (currentMetrics?.totalCost || 0))} ₪</div>
                        <div className="text-sm text-gray-600">רווח</div>
                        <div className="text-xs text-green-500">{formatPrice(((currentMetrics?.totalSellingPrice || 0) - (currentMetrics?.totalCost || 0)) / (currentMetrics?.quantity || 1))} ₪ למ"ר</div>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsCostsDetailsOpen(!isCostsDetailsOpen)}
                        className="w-full flex justify-between items-center text-left p-2 hover:bg-gray-50 text-gray-700"
                    >
                        <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4" />
                            <span>פירוט עלויות מפורט</span>
                        </div>
                        {isCostsDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {isCostsDetailsOpen && (
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="p-4 rounded-lg text-center bg-white border border-gray-200 shadow-sm">
                                    <div className="text-lg font-bold text-gray-800">{formatPrice(currentMetrics?.materialCost || 0)} ₪</div>
                                    <div className="text-sm text-gray-600 font-medium">עלות חומרים</div>
                                    <div className="text-xs text-gray-500 mt-1">{formatPrice((currentMetrics?.materialCost || 0) / (currentMetrics?.quantity || 1))} ₪ למ"ר</div>
                                </div>
                                <div className="p-4 rounded-lg text-center bg-white border border-gray-200 shadow-sm">
                                    <div className="text-lg font-bold text-gray-800">{formatPrice(currentMetrics?.laborCost || 0)} ₪</div>
                                    <div className="text-sm text-gray-600 font-medium">עלות עבודה</div>
                                    <div className="text-xs text-gray-500 mt-1">{formatPrice((currentMetrics?.laborCost || 0) / (currentMetrics?.quantity || 1))} ₪ למ"ר</div>
                                </div>
                                <div className="p-4 rounded-lg text-center bg-white border border-gray-200 shadow-sm">
                                    <div className="text-lg font-bold text-gray-800">{(currentMetrics?.totalWorkDays || 0).toFixed(1)}</div>
                                    <div className="text-sm text-gray-600 font-medium">ימי עבודה</div>
                                    <div className="text-xs text-gray-500 mt-1">{((currentMetrics?.totalWorkDays || 0) / (currentMetrics?.quantity || 1)).toFixed(2)} ימים למ"ר</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50/50">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Edit className="h-5 w-5 text-gray-600" />
                    <Input
                        value={room.name || `אזור 1`}
                        onChange={(e) => onUpdateRoom(room.id, { ...room, name: e.target.value })}
                        className="text-lg font-semibold border-0 focus:ring-0 p-0 w-auto"
                        placeholder={`אזור ${roomIndex + 1}`}
                    />
                </div>
                <Button variant="ghost" size="icon" onClick={() => onRemoveRoom(room.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
            </div>

            <div className="border-t pt-4">
                <Label className="text-base font-bold text-gray-800 mb-3 block">
                    בחר סוגי עבודה עבור אזור זה:
                </Label>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={isPaintVisible ? "default" : "outline"}
                        onClick={() => setIsPaintVisible(!isPaintVisible)}
                        className={cn(
                            "transition-all duration-200 font-medium",
                            isPaintVisible ?
                                "bg-blue-600 hover:bg-blue-700 border-2 border-blue-500 text-white shadow-md" :
                                "bg-white hover:bg-blue-50 border-2 border-blue-300 text-blue-600 hover:border-blue-400"
                        )}
                    >
                        🎨 צבע
                        <Plus className="w-4 h-4 mr-2" />
                    </Button>
                    <Button
                        variant={isPlasterVisible ? "default" : "outline"}
                        onClick={() => setIsPlasterVisible(!isPlasterVisible)}
                        className={cn(
                            "transition-all duration-200 font-medium",
                            isPlasterVisible ?
                                "bg-orange-500 hover:bg-orange-600 border-2 border-orange-400 text-white shadow-md" :
                                "bg-white hover:bg-orange-50 border-2 border-orange-300 text-orange-600 hover:border-orange-400"
                        )}
                    >
                        🧱 טיח
                        <Plus className="w-4 h-4 mr-2" />
                    </Button>
                </div>
            </div>

            {isPaintVisible && renderWorkSection('paint')}
            {isPlasterVisible && renderWorkSection('plaster')}

            {(isPaintVisible || isPlasterVisible) && (
                <div className="bg-yellow-50/50 border border-yellow-200 rounded-lg p-4">
                    <Collapsible open={isComplexityOpen} onOpenChange={setIsComplexityOpen}>
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className="w-full flex justify-between items-center text-left p-0 hover:bg-transparent"
                            >
                                <div className="flex items-center gap-3">
                                    <Settings className="h-4 w-4 text-yellow-600" />
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        {(() => {
                                            const paintComplexityCost = paintMetrics?.complexityIncrease || 0;
                                            const plasterComplexityCost = plasterMetrics?.complexityIncrease || 0;
                                            const totalComplexityCost = paintComplexityCost + plasterComplexityCost;

                                            const paintComplexityWorkDays = paintMetrics?.complexityWorkDaysIncrease || 0;
                                            const plasterComplexityWorkDays = plasterMetrics?.complexityWorkDaysIncrease || 0;
                                            const totalComplexityWorkDays = paintComplexityWorkDays + plasterComplexityWorkDays;

                                            const formatWorkTimeIncrease = (workDaysIncrease) => {
                                                if (workDaysIncrease <= 0) return "";

                                                const totalMinutes = Math.round(workDaysIncrease * 8 * 60);

                                                if (totalMinutes === 0) return "";

                                                const workDayInMinutes = 8 * 60;

                                                if (totalMinutes >= workDayInMinutes) {
                                                    const fullDays = Math.floor(totalMinutes / workDayInMinutes);
                                                    const remainingMinutesAfterFullDays = totalMinutes % workDayInMinutes;

                                                    let resultParts = [];
                                                    resultParts.push(`${fullDays} ימי עבודה`);

                                                    const remainingHours = Math.floor(remainingMinutesAfterFullDays / 60);

                                                    if (remainingHours > 0) {
                                                        resultParts.push(`${remainingHours} שעות`);
                                                    }

                                                    return resultParts.join(' ו-');
                                                } else {
                                                    const hours = Math.floor(totalMinutes / 60);
                                                    const minutes = totalMinutes % 60;

                                                    if (hours === 0) {
                                                        return `${minutes} דקות`;
                                                    } else if (minutes === 0) {
                                                        return `${hours} שעות`;
                                                    } else {
                                                        return `${hours} שעות ו-${minutes} דקות`;
                                                    }
                                                }
                                            };

                                            const workTimeDisplay = formatWorkTimeIncrease(totalComplexityWorkDays);

                                            if (totalComplexityCost > 0 || totalComplexityWorkDays > 0) {
                                                return (
                                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                                        {totalComplexityCost > 0 && (
                                                            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md border">
                                                                <span className="text-xs">💰</span>
                                                                <span className="font-medium">+{formatPrice(totalComplexityCost)} ₪</span>
                                                            </div>
                                                        )}
                                                        {workTimeDisplay && (
                                                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md border">
                                                                <span className="text-xs">⏱️</span>
                                                                <span className="font-medium">+{workTimeDisplay}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <span className="text-sm text-gray-500 italic">(אופציונלי)</span>
                                                );
                                            }
                                        })()}
                                    </div>
                                </div>
                                {isComplexityOpen ? <ChevronUp className="h-4 w-4 text-yellow-600" /> : <ChevronDown className="h-4 w-4 text-yellow-600" />}
                            </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <AnimatePresence>
                                {isComplexityOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden mt-4 space-y-4 border-t border-yellow-200 pt-4"
                                    >
                                        <div className="space-y-4">
                                            {isPaintVisible && (
                                                <div className="space-y-3">
                                                    <Label className="text-sm font-medium text-gray-700">רמת מורכבות לצבע</Label>
                                                    <Select
                                                        value={room.paintComplexity || 'none'}
                                                        onValueChange={(value) => handleRoomUpdate('paintComplexity', value)}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="בחר רמת מורכבות" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {complexityOptions.map(option => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    <div className="flex justify-between items-center w-full">
                                                                        <span>{option.label}</span>
                                                                        {option.percentage > 0 && (
                                                                            <span className="text-yellow-600 font-semibold text-sm mr-2">
                                                                                (הוספה +{option.percentage}%)
                                                                            </span>
                                                                        )}
                                                                        {option.percentage === 0 && (
                                                                            <span className="text-gray-500 text-sm mr-2">
                                                                                (איפוס)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        placeholder={`תיאור נוסף: ${getSelectedComplexityDescription('paint')}`}
                                                        value={room.paintCustomComplexityDescription || ''}
                                                        onChange={(e) => handleRoomUpdate('paintCustomComplexityDescription', e.target.value)}
                                                        className="text-sm"
                                                    />
                                                </div>
                                            )}

                                            {isPlasterVisible && (
                                                <div className="space-y-3">
                                                    <Label className="text-sm font-medium text-gray-700">רמת מורכבות לטיח</Label>
                                                    <Select
                                                        value={room.plasterComplexity || 'none'}
                                                        onValueChange={(value) => handleRoomUpdate('plasterComplexity', value)}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="בחר רמת מורכבות" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {complexityOptions.map(option => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    <div className="flex justify-between items-center w-full">
                                                                        <span>{option.label}</span>
                                                                        {option.percentage > 0 && (
                                                                            <span className="text-yellow-600 font-semibold text-sm mr-2">
                                                                                (הוספה +{option.percentage}%)
                                                                            </span>
                                                                        )}
                                                                        {option.percentage === 0 && (
                                                                            <span className="text-gray-500 text-sm mr-2">
                                                                                (איפוס)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        placeholder={`תיאור נוסף: ${getSelectedComplexityDescription('plaster')}`}
                                                        value={room.plasterCustomComplexityDescription || ''}
                                                        onChange={(e) => handleRoomUpdate('plasterCustomComplexityDescription', e.target.value)}
                                                        className="text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            )}

            {isAdvancedCalcOpen && (
                <RoomEstimatesCalculator
                    isOpen={Boolean(isAdvancedCalcOpen)}
                    onClose={() => setAdvancedCalcOpen(false)}
                    onCalculate={handleApplyAdvancedCalc}
                    workType={isAdvancedCalcOpen?.type || ''}
                    initialRoomData={isAdvancedCalcOpen?.roomData}
                />
            )}
        </div>
    );
};

// New component: PaintRoomsManager
const PaintRoomsManager = React.forwardRef(({
    categoryId,
    onUpdateCategoryData,
    user,
    paintItems,
    projectComplexities,
    onUpdateRoomBreakdown,
    onAddItemToQuote,
    existingCategoryData,
    categoryTimings, // Added to pass down
    stagedManualItems = [], // 🆕 Staged manual items for consolidation
    setStagedManualItems, // 🆕 Function to clear staged items after consolidation
    selectedItems = [], // 🆕 Current selected items (needed to filter manual items)
}, ref) => {
    const [rooms, setRooms] = useState(() => {
        if (existingCategoryData && existingCategoryData.rooms && existingCategoryData.rooms.length > 0) {
            return existingCategoryData.rooms;
        }

        return [
            {
                id: Date.now(),
                name: `אזור 1`,
                isPaintSelected: false,
                isPlasterSelected: false,
                isDetailedPaint: false,
                isPlasterDetailed: false,
                paintItemId: '',
                paintQuantity: '',
                paintLayers: 0,
                wallPaintId: '', wallPaintQuantity: '', wallPaintLayers: 0,
                ceilingPaintId: '', ceilingPaintQuantity: '', ceilingPaintLayers: 0,
                calculatedWallArea: 0,
                calculatedCeilingArea: 0,
                roomBreakdown: [],
                plasterItemId: '',
                plasterQuantity: '',
                plasterLayers: 0,
                wallPlasterId: '', wallPlasterQuantity: '', wallPlasterLayers: 0,
                ceilingPlasterId: '', ceilingPlasterQuantity: '', ceilingPlasterLayers: 0,
                isComplexityOpen: false,
                paintComplexity: '',
                paintCustomComplexityDescription: '',
                plasterComplexity: '',
                plasterCustomComplexityDescription: '',
                paintCalculatedMetrics: null,
                plasterCalculatedMetrics: null,
            }
        ];
    });
    const [isSummaryOpen, setIsSummaryOpen] = useState(true);
    const [isTilingSummaryOpen, setIsTilingSummaryOpen] = useState(true);
    const [preciseWorkDays, setPreciseWorkDays] = useState(false);
    const [preciseBucketCalculation, setPreciseBucketCalculation] = useState(false);

    const handleAddRoom = () => setRooms(prev => [
        ...prev,
        {
            id: Date.now(),
            name: `אזור ${prev.length + 1}`,
            isPaintSelected: false,
            isPlasterSelected: false,
            isDetailedPaint: false,
            isPlasterDetailed: false,
            paintItemId: '',
            paintQuantity: '',
            paintLayers: 0,
            wallPaintId: '', wallPaintQuantity: '', wallPaintLayers: 0,
            ceilingPaintId: '', ceilingPaintQuantity: '', ceilingPaintLayers: 0,
            calculatedWallArea: 0,
            calculatedCeilingArea: 0,
            plasterItemId: '',
            plasterQuantity: '',
            plasterLayers: 0,
            wallPlasterId: '', wallPlasterQuantity: '', wallPlasterLayers: 0,
            ceilingPlasterId: '', ceilingPlasterQuantity: '', ceilingPlasterLayers: 0,
            isComplexityOpen: false,
            paintComplexity: '',
            paintCustomComplexityDescription: '',
            plasterComplexity: '',
            plasterCustomComplexityDescription: '',
            paintCalculatedMetrics: null,
            plasterCalculatedMetrics: null,
        }
    ]);

    const handleRemoveRoom = (roomIdToRemove) => setRooms(prev => prev.filter(room => room.id !== roomIdToRemove));

    const handleUpdateRoom = useCallback((roomId, updates) => {
        setRooms(prevRooms => {
            const newRooms = prevRooms.map(room =>
                room.id === roomId ? { ...room, ...updates } : room
            );
            return newRooms;
        });
    }, []);

    const handleUpdateRoomMetrics = useCallback((roomId, metrics, type = 'paint') => {
        setRooms(prevRooms => {
            return prevRooms.map(room => {
                if (room.id === roomId) {
                    const updatedRoom = {
                        ...room,
                        [`${type}CalculatedMetrics`]: metrics
                    };
                    return updatedRoom;
                }
                return room;
            });
        });
    }, []);

    const totalMetrics = useMemo(() => {
        let baseTotalCostRaw = 0;
        let baseTotalSellingPriceRaw = 0;
        let sumExactWorkDays = 0;
        let sumExactLaborCosts = 0;
        let sumOtherCosts = 0;
        let sumEquipmentCost = 0;

        let totalPaintPrice = 0;
        let totalPlasterPrice = 0;
        let totalPaintWorkDays = 0;
        let totalPlasterWorkDays = 0;
        let totalPaintLaborCost = 0;
        let totalPlasterLaborCost = 0;
        let totalPaintMaterialCost = 0;
        let totalPlasterMaterialCost = 0;
        let totalPaintComplexityIncrease = 0;
        let totalPlasterComplexityIncrease = 0;
        let totalPaintComplexityWorkDaysIncrease = 0;
        let totalPlasterComplexityWorkDaysIncrease = 0;

        let totalQuantity = 0;

        const rawMaterialAggregates = {};

        const aggregateIndividualMetrics = (metrics, isDetailedMode, type) => {
            if (!metrics) return;

            baseTotalCostRaw += Number(metrics.totalCost) || 0;
            baseTotalSellingPriceRaw += Number(metrics.totalSellingPrice) || 0;

            sumExactWorkDays += Number(metrics.totalWorkDays) || 0;
            sumExactLaborCosts += Number(metrics.laborCost) || 0;

            sumOtherCosts += Number(metrics.otherCosts || 0);
            sumEquipmentCost += Number(metrics.equipmentCost || 0);

            totalQuantity += Number(metrics.quantity) || 0;

            if (type === 'paint') {
                totalPaintPrice += Number(metrics.totalSellingPrice) || 0;
                totalPaintWorkDays += Number(metrics.totalWorkDays) || 0;
                totalPaintLaborCost += Number(metrics.laborCost) || 0;
                totalPaintMaterialCost += Number(metrics.materialCost) || 0;
                totalPaintComplexityIncrease += Number(metrics.complexityIncrease) || 0;
                totalPaintComplexityWorkDaysIncrease += Number(metrics.complexityWorkDaysIncrease) || 0;
            } else if (type === 'plaster') {
                totalPlasterPrice += Number(metrics.totalSellingPrice) || 0;
                totalPlasterWorkDays += Number(metrics.totalWorkDays) || 0;
                totalPlasterLaborCost += Number(metrics.laborCost) || 0;
                totalPlasterMaterialCost += Number(metrics.materialCost) || 0;
                totalPlasterComplexityIncrease += Number(metrics.complexityIncrease) || 0;
                totalPlasterComplexityWorkDaysIncrease += Number(metrics.complexityWorkDaysIncrease) || 0;
            }

            const processBucketsForMaterialAggregation = (itemMetrics) => {
                if (itemMetrics && (itemMetrics.totalBucketsNeeded > 0 || itemMetrics.originalBucketsNeeded > 0)) {
                    const materialKey = itemMetrics.itemId;
                    if (!rawMaterialAggregates[materialKey]) {
                        rawMaterialAggregates[materialKey] = {
                            itemId: itemMetrics.itemId,
                            itemName: itemMetrics.itemName || getItemDisplayName(itemMetrics),
                            pricePerBucket: itemMetrics.bucketPrice || 0,
                            exactBucketsNeeded: 0,
                            bucketCapacity: itemMetrics.bucketCapacity || 1,
                        };
                    }
                    rawMaterialAggregates[materialKey].exactBucketsNeeded += Number(itemMetrics.originalBucketsNeeded) || 0;
                }
            };

            if (isDetailedMode && metrics.wallMetrics && metrics.ceilingMetrics) {
                processBucketsForMaterialAggregation(metrics.wallMetrics);
                processBucketsForMaterialAggregation(metrics.ceilingMetrics);
            } else {
                processBucketsForMaterialAggregation(metrics);
            }
        };

        rooms.forEach(room => {
            aggregateIndividualMetrics(room.paintCalculatedMetrics, room.isDetailedPaint, 'paint');
            aggregateIndividualMetrics(room.plasterCalculatedMetrics, room.isPlasterDetailed, 'plaster');
        });

        // 🆕 Add staged manual items to totals
        const stagedPaintItems = (stagedManualItems || []).filter(item =>
            item.categoryId === categoryId && item.source === 'manual_calc'
        );

        // Track manual item costs separately for proper calculation
        let manualTotalCost = 0;
        let manualTotalPrice = 0;
        let manualWorkDays = 0;
        let manualMaterialCost = 0;
        let manualLaborCost = 0;
        let manualQuantity = 0;

        stagedPaintItems.forEach(item => {
            // Manual items have totalCost already calculated (materialCost + laborCost)
            // We track them separately to avoid double-counting when adding to component sums
            manualTotalCost += Number(item.totalCost) || 0;
            manualTotalPrice += Number(item.totalPrice) || 0;
            manualWorkDays += Number(item.workDuration) || 0;
            manualMaterialCost += Number(item.materialCost) || 0;
            manualLaborCost += Number(item.laborCost) || 0;
            manualQuantity += Number(item.quantity) || 0;
        });

        // Add manual item values to catalog item values for base calculations
        baseTotalCostRaw += manualTotalCost;
        baseTotalSellingPriceRaw += manualTotalPrice;
        sumExactWorkDays += manualWorkDays;
        totalQuantity += manualQuantity;

        let catalogMaterialCost = 0;
        let catalogLaborCost = 0;
        const materialSummary = [];

        // Calculate material costs from catalog items (bucket-based)
        Object.values(rawMaterialAggregates).forEach(material => {
            const bucketsToPurchase = preciseBucketCalculation
                ? material.exactBucketsNeeded
                : Math.ceil(material.exactBucketsNeeded);

            const cost = bucketsToPurchase * material.pricePerBucket;

            catalogMaterialCost += cost;

            materialSummary.push({
                ...material,
                bucketsToPurchase,
                totalMaterialCost: cost
            });
        });

        // Calculate catalog labor costs from catalog rooms only
        rooms.forEach(room => {
            if (room.paintCalculatedMetrics) {
                catalogLaborCost += Number(room.paintCalculatedMetrics.laborCost) || 0;
            }
            if (room.plasterCalculatedMetrics) {
                catalogLaborCost += Number(room.plasterCalculatedMetrics.laborCost) || 0;
            }
        });

        // 🆕 Total material and labor costs = catalog + manual
        const finalMaterialCost = catalogMaterialCost + manualMaterialCost;
        const finalLaborCost = catalogLaborCost + manualLaborCost;

        // Debug logging for labor cost calculation
        if (stagedPaintItems.length > 0 || manualLaborCost > 0) {
            console.log('[PaintRoomsManager] Labor Cost Calculation:', {
                catalogLaborCost,
                manualLaborCost,
                finalLaborCost,
                manualItemsCount: stagedPaintItems.length,
                roomsCount: rooms.length
            });
        }

        // Work days calculation
        let finalWorkDaysValue;
        if (sumExactWorkDays > 0) {
            finalWorkDaysValue = preciseWorkDays ? sumExactWorkDays : Math.ceil(sumExactWorkDays);
        } else {
            finalWorkDaysValue = sumExactWorkDays;
        }

        const sumNonMaterialCosts = finalLaborCost + sumOtherCosts;
        const finalCalculatedTotalCost = finalMaterialCost + sumNonMaterialCosts;


        const originalProfitRatio = baseTotalCostRaw > 0 ? (baseTotalSellingPriceRaw - baseTotalCostRaw) / baseTotalCostRaw : 0;
        const finalCalculatedTotalSellingPrice = finalCalculatedTotalCost * (1 + originalProfitRatio);

        const finalTotalProfit = finalCalculatedTotalSellingPrice - finalCalculatedTotalCost;
        const finalProfitPercent = finalCalculatedTotalCost > 0 ? (finalTotalProfit / finalCalculatedTotalCost) * 100 : 0;

        const pricePerSqM = totalQuantity > 0 ? finalCalculatedTotalSellingPrice / totalQuantity : 0;
        const costPerSqM = totalQuantity > 0 ? finalCalculatedTotalCost / totalQuantity : 0;
        const profitPerSqM = totalQuantity > 0 ? finalTotalProfit / totalQuantity : 0;

        return {
            totalCost: Math.round(finalCalculatedTotalCost),
            totalPrice: Math.round(finalCalculatedTotalSellingPrice),
            totalProfit: Math.round(finalTotalProfit),
            profitPercent: finalProfitPercent,
            totalWorkDays: finalWorkDaysValue,
            unroundedWorkDays: sumExactWorkDays,
            totalLaborCost: Math.round(finalLaborCost),
            totalQuantity: totalQuantity,
            pricePerSqM: Math.round(pricePerSqM),
            costPerSqM: Math.round(costPerSqM),
            profitPerSqM: Math.round(profitPerSqM),
            finalMaterialCost: Math.round(finalMaterialCost),
            totalFixedCost: Math.round(sumEquipmentCost),
            materialSummary: materialSummary,

            paintMetrics: {
                totalPrice: Math.round(totalPaintPrice),
                totalWorkDays: totalPaintWorkDays,
                totalLaborCost: totalPaintLaborCost,
                totalMaterialCost: totalPaintMaterialCost,
                complexityIncrease: totalPaintComplexityIncrease,
                complexityWorkDaysIncrease: totalPaintComplexityWorkDaysIncrease
            },
            plasterMetrics: {
                totalPrice: Math.round(totalPlasterPrice),
                totalWorkDays: totalPlasterWorkDays,
                totalLaborCost: totalPlasterLaborCost,
                totalMaterialCost: totalPlasterMaterialCost,
                complexityIncrease: totalPlasterComplexityIncrease,
                complexityWorkDaysIncrease: totalPlasterComplexityWorkDaysIncrease
            }
        };
    }, [rooms, preciseBucketCalculation, preciseWorkDays, stagedManualItems, categoryId]);

    useImperativeHandle(ref, () => ({
        saveData: () => {
            // 1. Get catalog-based room items
            const catalogItems = rooms.flatMap(room => {
                const items = [];
                if (room.isPaintSelected && room.paintCalculatedMetrics) {
                    items.push({
                        ...room.paintCalculatedMetrics,
                        id: `${room.id}_paint`, // Unique ID for this specific quote item
                        name: `צבע - ${room.name}`, // Display name for quote
                        categoryId: categoryId,
                        categoryName: 'צבע וטיח',
                        roomName: room.name, // Link to the room name
                        source: 'paint_room_detail', // Specific source for filtering later
                        complexity: room.paintComplexity,
                        customComplexityDescription: room.paintCustomComplexityDescription,
                    });
                }
                if (room.isPlasterSelected && room.plasterCalculatedMetrics) {
                    items.push({
                        ...room.plasterCalculatedMetrics,
                        id: `${room.id}_plaster`, // Unique ID for this specific quote item
                        name: `טיח - ${room.name}`, // Display name for quote
                        categoryId: categoryId,
                        categoryName: 'צבע וטיח',
                        roomName: room.name, // Link to the room name
                        source: 'paint_room_detail', // Specific source for filtering later
                        complexity: room.plasterComplexity,
                        customComplexityDescription: room.plasterCustomComplexityDescription,
                    });
                }
                return items;
            });

            // 2. Get manual items for this category
            const manualItems = stagedManualItems.filter(item =>
                item.categoryId === categoryId && item.source === 'manual_calc'
            );

            // 3. Consolidate into ONE summary item if there are catalog items
            let quoteItems;
            if (catalogItems.length > 0) {
                // Calculate totals from catalog items
                const catalogTotalCost = catalogItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
                const catalogTotalPrice = catalogItems.reduce((sum, item) => sum + (Number(item.totalSellingPrice) || 0), 0);
                const catalogTotalWorkDays = catalogItems.reduce((sum, item) => sum + (Number(item.totalWorkDays) || 0), 0);
                const catalogTotalQuantity = catalogItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

                // Add manual items totals
                const manualTotalCost = manualItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
                const manualTotalPrice = manualItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
                const manualTotalWorkDays = manualItems.reduce((sum, item) => sum + (Number(item.workDuration) || 0), 0);

                // Create consolidated summary item
                const consolidatedItem = {
                    id: `cat_paint_plaster_summary_${Date.now()}`,
                    categoryId: categoryId,
                    categoryName: 'צבע וטיח',
                    name: 'סיכום צבע ושפכטל',
                    source: 'paint_plaster_category_summary',
                    totalCost: catalogTotalCost + manualTotalCost,
                    totalSellingPrice: catalogTotalPrice + manualTotalPrice,
                    totalPrice: catalogTotalPrice + manualTotalPrice,
                    totalProfit: (catalogTotalPrice + manualTotalPrice) - (catalogTotalCost + manualTotalCost),
                    totalWorkDays: catalogTotalWorkDays + manualTotalWorkDays,
                    workDuration: catalogTotalWorkDays + manualTotalWorkDays,
                    quantity: catalogTotalQuantity,
                    unit: 'מ"ר',
                    // Store detailed breakdown for reference
                    detailedBreakdown: [...catalogItems, ...manualItems],
                    detailedRoomsData: rooms, // Keep room structure
                    catalogItemsCount: catalogItems.length,
                    manualItemsCount: manualItems.length,
                };

                quoteItems = [consolidatedItem];
            } else if (manualItems.length > 0) {
                // If only manual items exist, still consolidate them
                const manualTotalCost = manualItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
                const manualTotalPrice = manualItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
                const manualTotalWorkDays = manualItems.reduce((sum, item) => sum + (Number(item.workDuration) || 0), 0);

                const consolidatedItem = {
                    id: `cat_paint_plaster_summary_${Date.now()}`,
                    categoryId: categoryId,
                    categoryName: 'צבע וטיח',
                    name: 'סיכום צבע ושפכטל (ידני)',
                    source: 'paint_plaster_category_summary',
                    totalCost: manualTotalCost,
                    totalSellingPrice: manualTotalPrice,
                    totalPrice: manualTotalPrice,
                    totalProfit: manualTotalPrice - manualTotalCost,
                    totalWorkDays: manualTotalWorkDays,
                    workDuration: manualTotalWorkDays,
                    detailedBreakdown: manualItems,
                    catalogItemsCount: 0,
                    manualItemsCount: manualItems.length,
                };

                quoteItems = [consolidatedItem];
            } else {
                quoteItems = [];
            }

            // 4. Clear staged manual items for this category
            if (setStagedManualItems && manualItems.length > 0) {
                setStagedManualItems(prev => prev.filter(item =>
                    item.categoryId !== categoryId || item.source !== 'manual_calc'
                ));
            }

            return {
                quoteItems: quoteItems,
                rawRooms: rooms // Return the full internal rooms state for parent to store in categoryDataMap
            };
        }
    }), [rooms, categoryId, stagedManualItems, setStagedManualItems]);


    useEffect(() => {
        const categoryData = {
            categoryId,
            rooms,
            totalMetrics,
            type: 'paint_plaster'
        };

        if (onUpdateCategoryData) {
            onUpdateCategoryData(categoryData);
        }
    }, [categoryId, rooms, totalMetrics, onUpdateCategoryData]);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {rooms.map((room, index) => (
                        <motion.div
                            key={room.id}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <PaintRoomItem
                                roomIndex={index}
                                room={room}
                                onUpdateRoom={handleUpdateRoom}
                                onUpdateRoomMetrics={handleUpdateRoomMetrics}
                                onRemoveRoom={handleRemoveRoom}
                                paintItems={paintItems}
                                projectComplexities={projectComplexities}
                                user={user}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>

                <Button
                    onClick={handleAddRoom}
                    variant="outline"
                    className="w-full border-dashed border-2 border-indigo-300 hover:border-indigo-500 text-indigo-600 hover:text-indigo-800 py-6 transition-all duration-200 hover:bg-indigo-50 hover:shadow-md group"
                >
                    <Plus className="w-5 h-5 ml-2 transition-transform duration-200 group-hover:scale-110" />
                    הוסף חדר/אזור לצביעה
                </Button>
            </div>

            <div className="mt-6 p-0">
                <Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                    <CollapsibleTrigger asChild>
                        <button className="w-full bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 rounded-lg border-2 border-blue-300 p-3 hover:shadow-md transition-all duration-300 cursor-pointer">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                    <Paintbrush2 className="w-5 h-5 ml-2 text-indigo-600" />
                                    סיכום כולל לקטגוריית צבע וטיח
                                </h3>
                                {isSummaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                        <div className="bg-white rounded-lg border-2 border-blue-300 shadow-sm overflow-hidden">
                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                                        <div className="text-xl font-bold text-blue-800">
                                            ₪{formatPrice(totalMetrics?.totalPrice || 0)}
                                        </div>
                                        <div className="text-sm text-blue-600 font-medium">מחיר ללקוח</div>
                                        <div className="text-xs text-blue-500">
                                            ₪{formatPrice(totalMetrics?.pricePerSqM || 0)} למ"ר
                                        </div>
                                                                           </div>
                                    <div className="bg-gradient-to-br from-orange-50 to-red-100 p-3 rounded-lg border border-orange-200">
                                        <div className="text-xl font-bold text-orange-800">
                                            ₪{formatPrice(totalMetrics?.totalCost || 0)}
                                        </div>
                                        <div className="text-sm text-orange-600 font-medium">עלות קבלן</div>
                                        <div className="text-xs text-orange-500">
                                            ₪{formatPrice(totalMetrics?.costPerSqM || 0)} למ"ר
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                                        <div className="text-xl font-bold text-green-800">
                                            ₪{formatPrice((totalMetrics?.totalPrice || 0) - (totalMetrics?.totalCost || 0))}
                                        </div>
                                        <div className="text-sm text-green-600 font-medium">רווח</div>
                                        <div className="text-xs text-green-500">
                                            {totalMetrics?.profitPercent?.toFixed(1) || '0.0'}% | ₪{formatPrice(totalMetrics?.profitPerSqM || 0)} למ"ר
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 py-2 px-1">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={preciseBucketCalculation}
                                            onChange={(e) => setPreciseBucketCalculation(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 group-hover:text-gray-900">חישוב מדויק דליים</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={preciseWorkDays}
                                            onChange={(e) => setPreciseWorkDays(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 group-hover:text-gray-900">ימי עבודה מדויקים</span>
                                    </label>
                                </div>

                                <div className="border-t pt-3">
                                    <h4 className="font-semibold text-gray-700 mb-3 text-center">פירוט עלויות כללי:</h4>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-gray-100 p-2 rounded-lg">
                                            <div className="text-base font-bold text-gray-800">
                                                ₪{formatPrice(totalMetrics?.finalMaterialCost || 0)}
                                            </div>
                                            <div className="text-xs text-gray-500">עלות חומרים</div>
                                        </div>
                                        <div className="bg-gray-100 p-2 rounded-lg">
                                            <div className="text-base font-bold text-gray-800">
                                                ₪{formatPrice(totalMetrics?.totalLaborCost || 0)}
                                            </div>
                                            <div className="text-xs text-gray-500">עלויות עובדים</div>
                                        </div>
                                        <div className="bg-gray-100 p-2 rounded-lg">
                                            <div className="text-base font-bold text-gray-800">
                                                {(totalMetrics?.totalWorkDays || 0).toFixed(1)}
                                            </div>
                                            <div className="text-xs text-gray-500">ימי עבודה</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </div>
    );
});

// Wrapper for Tiling category - renamed to TilingCategoryEditor as per outline, uses TilingCategoryEditorComponent internally
const TilingCategoryEditor = React.forwardRef(({
    categoryId,
    onCategoryTimingChange,
    categoryTimings,
    user,
    existingCategoryData,
    userTilingItems = [], // NEW PROP
    tilingWorkTypes = [], // NEW PROP
    ...rest
}, ref) => {
    // Dates states and logic removed from this component, now handled in ItemSelector
    return (
        <div className="space-y-6">
            {/* Date selection section removed */}
            <TilingCategoryEditorComponent
                ref={ref}
                categoryId={categoryId}
                user={user}
                existingCategoryData={existingCategoryData}
                userTilingItems={userTilingItems} // PASSED DOWN
                tilingWorkTypes={tilingWorkTypes} // PASSED DOWN
                {...rest}
            />
        </div>
    );
});

// Wrapper for Paint/Plaster category - removed internal date pickers
const PaintPlasterCategory = React.forwardRef((props, ref) => {
    const {
        categoryId,
        onCategoryTimingChange, // Still passed, but not used for rendering dates here
        categoryTimings,        // Still passed, but not used for rendering dates here
        paintItems,
        user,
        existingCategoryData,
        ...rest
    } = props;

    // Dates states and logic removed from this component, now handled in ItemSelector
    return (
        <div className="space-y-6">
            {/* Date Selection Section removed */}
            <PaintRoomsManager
                ref={ref}
                categoryId={categoryId}
                paintItems={paintItems}
                user={user}
                existingCategoryData={existingCategoryData}
                categoryTimings={categoryTimings} // Pass categoryTimings down
                {...rest}
            />
        </div>
    );
});


// רכיב עבור ניהול פריטי הריסה ופינוי
const DemolitionItemManager = React.forwardRef(({
  user,
  categoryId,
  existingCategoryData
}, ref) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const difficultyLevels = useMemo(() => [
    { value: 'easy', label: 'קל', multiplier: 1.0, color: 'text-green-600' },
    { value: 'medium', label: 'בינוני', multiplier: 1.25, color: 'text-yellow-600' },
    { value: 'hard', label: 'קשה', multiplier: 1.5, color: 'text-orange-600' },
    { value: 'very_hard', label: 'קשה מאוד', multiplier: 2.0, color: 'text-red-600' }
  ], []);

  const calculateDemolitionItemPrice = useCallback((item) => {
      const defaults = user?.demolitionDefaults || {};
      const difficultyData = difficultyLevels.find(d => d.value === item.difficultyLevel) || difficultyLevels[0];

      const baseHoursPerUnit = Number(item.baseHoursPerUnit || 1);
      const baseLaborCostPerDay = Number(item.baseLaborCostPerDay || defaults.laborCostPerDay || 1000);
      const baseProfitPercent = Number(item.baseProfitPercent || defaults.profitPercent || 40);
      const quantity = Number(item.quantity || 0);

      const adjustedHoursPerUnit = baseHoursPerUnit * difficultyData.multiplier;
      const hourlyRate = baseLaborCostPerDay / 8;

      const contractorCostPerUnit = hourlyRate * adjustedHoursPerUnit;
      let clientPricePerUnit;
      if (baseProfitPercent >= 100) {
          clientPricePerUnit = contractorCostPerUnit * 2;
      } else {
          clientPricePerUnit = contractorCostPerUnit / (1 - (baseProfitPercent / 100));
      }

      const totalCost = contractorCostPerUnit * quantity;
      const totalPrice = clientPricePerUnit * quantity;
      const workDuration = (adjustedHoursPerUnit * quantity) / 8;

      return {
          ...item,
          unitPrice: Math.round(clientPricePerUnit),
          totalPrice: Math.round(totalPrice),
          totalCost: Math.round(totalCost),
          workDuration: Math.round(workDuration * 10) / 10,
          categoryId: categoryId,
          categoryName: 'הריסה ופינוי',
          source: 'demolition_calculator',
          difficultyData: difficultyData,
          baseHoursPerUnit: baseHoursPerUnit,
          baseLaborCostPerDay: baseLaborCostPerDay,
          baseProfitPercent: baseProfitPercent,
      };
  }, [difficultyLevels, categoryId, user?.demolitionDefaults]);


  useEffect(() => {
    if (user && user.demolitionItems) {
      setAvailableItems(user.demolitionItems.filter(item => item.name && item.unit));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
      if (existingCategoryData && existingCategoryData.items && existingCategoryData.items.length > 0) {
          const reCalculatedExistingItems = existingCategoryData.items.map(item =>
              calculateDemolitionItemPrice({
                  ...item,
                  baseLaborCostPerDay: user?.demolitionDefaults?.laborCostPerDay || 1000,
                  baseProfitPercent: user?.demolitionDefaults?.profitPercent || 40
              })
          );
          setSelectedItems(reCalculatedExistingItems);
      } else {
          setSelectedItems([]);
      }
  }, [existingCategoryData, calculateDemolitionItemPrice, user]);

  const handleItemSelect = useCallback((demolitionItem) => {
      const newItem = {
          id: `${demolitionItem.id}_${Date.now()}`,
          demolitionItemId: demolitionItem.id,
          name: demolitionItem.name,
          description: demolitionItem.description || demolitionItem.name,
          unit: demolitionItem.unit,
          quantity: 1,
          difficultyLevel: 'easy',
          baseHoursPerUnit: demolitionItem.hoursPerUnit || 1,
          baseLaborCostPerDay: user?.demolitionDefaults?.laborCostPerDay || 1000,
          baseProfitPercent: user?.demolitionDefaults?.profitPercent || 40
      };

      const calculatedItem = calculateDemolitionItemPrice(newItem);
      setSelectedItems(prev => [...prev, calculatedItem]);
  }, [calculateDemolitionItemPrice, user]);

  const updateSelectedItem = useCallback((id, field, value) => {
      setSelectedItems(prevItems => {
          const updatedItems = prevItems.map(item => {
              if (item.id === id) {
                  const updatedItem = { ...item, [field]: value };
                  if (field === 'quantity' || field === 'difficultyLevel') {
                      return calculateDemolitionItemPrice(updatedItem);
                  }
                  return updatedItem;
              }
              return item;
          });
          return updatedItems;
      });
  }, [calculateDemolitionItemPrice]);


  const removeSelectedItem = useCallback((idToRemove) => {
      setSelectedItems(prev => prev.filter(item => item.id !== idToRemove));
  }, []);

  useImperativeHandle(ref, () => ({
      saveData: () => {
          return selectedItems;
      }
  }));

  const formatPrice = (price) => {
    return new Intl.NumberFormat('he-IL').format(price || 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-red-600" />
        <span className="mr-2 text-gray-600">טוען פריטי הריסה...</span>
      </div>
    );
  }

  if (!availableItems.length && !selectedItems.length) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
        <Trash2 className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">לא נמצאו פריטי הריסה</h3>
        <p className="text-gray-600 mb-4">תחילה הגדר פריטי הריסה במחירון הקבלן.</p>
        <Button
          variant="outline"
          onClick={() => { window.open(createPageUrl('CostCalculator'), '_blank'); }}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          עבר למחירון קבלן
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {availableItems.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">בחר פריטי הריסה</h3>
            <div className="grid gap-3">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">
                      {item.description} • יחידת מידה: {item.unit}
                      {item.hoursPerUnit && (
                        <span className="mr-2">• {item.hoursPerUnit} שעות/{item.unit}</span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleItemSelect(item)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף
                  </Button>
                </div>
              ))}
            </div>
          </div>
      )}


      {selectedItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">פריטים נבחרים ({selectedItems.length})</h3>
          <div className="space-y-4">
            {selectedItems.map((item, index) => (
              <div key={item.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSelectedItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      כמות ({item.unit})
                    </Label>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => updateSelectedItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      רמת קושי
                    </Label>
                    <Select
                      value={item.difficultyLevel}
                      onValueChange={(value) => updateSelectedItem(item.id, 'difficultyLevel', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {difficultyLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <span className={level.color}>
                              {level.label} (x{level.multiplier})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      זמן עבודה משוער
                    </Label>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-medium text-gray-800">
                      {item.workDuration ? item.workDuration.toFixed(1) : '0.0'} ימי עבודה
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center mt-6">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <div className="text-sm text-red-600 font-medium">עלות לקבלן</div>
                    <div className="text-lg font-bold text-red-700">₪{formatPrice(item.totalCost)}</div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">מחיר ללקוח</div>
                    <div className="text-lg font-bold text-green-700">₪{formatPrice(item.totalPrice)}</div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">רווח משוער</div>
                    <div className="text-lg font-bold text-blue-700">
                      ₪{formatPrice(item.totalPrice - item.totalCost)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Wrapper for Demolition category - removed internal date pickers
const DemolitionCategory = React.forwardRef(({
    categoryId,
    onCategoryTimingChange, // Still passed, but not used for rendering dates here
    categoryTimings,        // Still passed, but not used for rendering dates here
    user,
    existingCategoryData,
    ...rest
}, ref) => {
    // Dates states and logic removed from this component, now handled in ItemSelector
    return (
        <div className="space-y-6">
            {/* Date Selection Section removed */}
            <DemolitionItemManager
                ref={ref}
                categoryId={categoryId}
                user={user}
                existingCategoryData={existingCategoryData}
                {...rest}
            />
        </div>
    );
});

// NEW: ElectricalItemManager Component
const ElectricalItemManager = React.forwardRef(({
  user,
  categoryId,
  existingCategoryData
}, ref) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getElectricalItemDetails = useCallback((itemId) => {
      return user?.electricalItems?.find(item => item.id === itemId);
  }, [user?.electricalItems]);


  const calculateElectricalItemPrice = useCallback((item) => {
      const catalogItem = getElectricalItemDetails(item.electricalItemId) || {};
      const quantity = Number(item.quantity || 0);

      const unitPrice = Number(item.unitPrice || catalogItem.unitPrice || 0);
      const unitCost = Number(item.unitCost || catalogItem.unitCost || 0);
      const profitPercent = Number(item.profitPercent || user?.electricalDefaults?.profitPercent || 0);

      let totalCost = quantity * unitCost;
      let totalPrice = quantity * unitPrice;

      if (unitPrice === 0 && unitCost > 0 && profitPercent > 0) {
          totalPrice = totalCost * (1 + (profitPercent / 100));
      } else if (unitPrice > 0 && unitCost === 0 && profitPercent > 0) {
          totalCost = totalPrice / (1 + (profitPercent / 100));
      } else if (unitPrice === 0 && unitCost === 0 && profitPercent > 0) {
          totalPrice = 0;
          totalCost = 0;
      }

      const totalProfit = totalPrice - totalCost;

      const workDuration = (Number(item.workDuration || catalogItem.workDuration || 0) * quantity) || 0;

      return {
          ...item,
          unitPrice: unitPrice,
          unitCost: unitCost,
          totalPrice: Math.round(totalPrice),
          totalCost: Math.round(totalCost),
          totalProfit: Math.round(totalProfit),
          workDuration: Math.round(workDuration * 10) / 10,
          categoryId: categoryId,
          categoryName: 'חשמל',
          source: 'electrical_calculator',
          profitPercent: profitPercent,
      };
  }, [categoryId, user?.electricalDefaults?.profitPercent, getElectricalItemDetails]);


  useEffect(() => {
    if (user && user.electricalItems) {
      setAvailableItems(user.electricalItems.filter(item => item.name && item.unit));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
      if (existingCategoryData && existingCategoryData.items && existingCategoryData.items.length > 0) {
          const reCalculatedExistingItems = existingCategoryData.items.map(item =>
              calculateElectricalItemPrice({
                  ...item,
                  profitPercent: user?.electricalDefaults?.profitPercent || 0
              })
          );
          setSelectedItems(reCalculatedExistingItems);
      } else {
          setSelectedItems([]);
      }
  }, [existingCategoryData, calculateElectricalItemPrice, user]);

  const handleItemSelect = useCallback((electricalCatalogItem) => {
      const newItem = {
          id: `${electricalCatalogItem.id}_${Date.now()}`,
          electricalItemId: electricalCatalogItem.id,
          name: electricalCatalogItem.name,
          description: electricalCatalogItem.description || electricalCatalogItem.name,
          unit: electricalCatalogItem.unit,
          quantity: 1,
          unitPrice: electricalCatalogItem.unitPrice || 0,
          unitCost: electricalCatalogItem.unitCost || 0,
          profitPercent: user?.electricalDefaults?.profitPercent || 0,
          workDuration: electricalCatalogItem.workDuration || 0,
      };

      const calculatedItem = calculateElectricalItemPrice(newItem);
      setSelectedItems(prev => [...prev, calculatedItem]);
  }, [calculateElectricalItemPrice, user]);

  const updateSelectedItem = useCallback((id, field, value) => {
      setSelectedItems(prevItems => {
          const updatedItems = prevItems.map(item => {
              if (item.id === id) {
                  const updatedItem = { ...item, [field]: value };
                  if (['quantity', 'unitPrice', 'unitCost', 'profitPercent'].includes(field)) {
                      return calculateElectricalItemPrice(updatedItem);
                  }
                  return updatedItem;
              }
              return item;
          });
          return updatedItems;
      });
  }, [calculateElectricalItemPrice]);


  const removeSelectedItem = useCallback((idToRemove) => {
      setSelectedItems(prev => prev.filter(item => item.id !== idToRemove));
  }, []);

  useImperativeHandle(ref, () => ({
      saveData: () => {
          return selectedItems;
      }
  }));

  const formatPrice = (price) => {
    return new Intl.NumberFormat('he-IL').format(price || 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="mr-2 text-gray-600">טוען פריטי חשמל...</span>
      </div>
    );
  }

  if (!availableItems.length && !selectedItems.length) {
    return (
      <div className="text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
        <Hammer className="h-12 w-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">לא נמצאו פריטי חשמל</h3>
        <p className="text-gray-600 mb-4">תחילה הגדר פריטי חשמל במחירון הקבלן.</p>
        <Button
          variant="outline"
          onClick={() => { window.open(createPageUrl('CostCalculator'), '_blank'); }}
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
        >
          עבר למחירון קבלן
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {availableItems.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">בחר פריטי חשמל</h3>
            <div className="grid gap-3">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">
                      {item.description} • יחידת מידה: {item.unit}
                      {item.unitPrice && (
                        <span className="mr-2">• ₪{formatPrice(item.unitPrice)}/{item.unit}</span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleItemSelect(item)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף
                  </Button>
                </div>
              ))}
            </div>
          </div>
      )}


      {selectedItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">פריטים נבחרים ({selectedItems.length})</h3>
          <div className="space-y-4">
            {selectedItems.map((item, index) => (
              <div key={item.id} className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSelectedItem(item.id)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      כמות ({item.unit})
                    </Label>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => updateSelectedItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      מחיר יחידה ללקוח (₪)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item.unitPrice}
                      onChange={(e) => updateSelectedItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      עלות יחידה לקבלן (₪)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item.unitCost}
                      onChange={(e) => updateSelectedItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center mt-6">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">עלות לקבלן</div>
                    <div className="text-lg font-bold text-blue-700">₪{formatPrice(item.totalCost)}</div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">מחיר ללקוח</div>
                    <div className="text-lg font-bold text-green-700">₪{formatPrice(item.totalPrice)}</div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <div className="text-sm text-purple-600 font-medium">רווח משוער</div>
                    <div className="text-lg font-bold text-purple-700">
                      ₪{formatPrice(item.totalProfit)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Wrapper for Electrical category - removed internal date pickers
const ElectricalCategory = React.forwardRef(({
    categoryId,
    onCategoryTimingChange, // Still passed, but not used for rendering dates here
    categoryTimings,        // Still passed, but not used for rendering dates here
    user,
    existingCategoryData,
    ...rest
}, ref) => {
    // Dates states and logic removed from this component, now handled in ItemSelector
    return (
        <div className="space-y-6">
            {/* Date Selection Section removed */}
            <ElectricalItemManager
                ref={ref}
                categoryId={categoryId}
                user={user}
                existingCategoryData={existingCategoryData}
                {...rest}
            />
        </div>
    );
});


// Modified TilingCategoryEditor to accept existingCategoryData and expose saveData
// NOTE: This component is the wrapper for TilingCategoryEditorComponent, and was previously named 'TilingCategory'.
// It has been renamed to 'TilingCategoryEditor' to align with the requested import name structure,
// assuming ItemSelector will now directly reference this renamed wrapper.
const TilingCategoryEditorLocalWrapper = React.forwardRef(({
    selectedItems,
    setSelectedItems,
    onAddItemToQuote,
    categoryTimings,
    onCategoryTimingChange,
    projectComplexities,
    onUpdateRoomBreakdown,
    currentCategoryForItems,
    setCurrentCategoryForItems,
    processedCategories,
    setProcessedCategories,
    selectedCategories,
    AVAILABLE_CATEGORIES,
    categoryId,
    onUpdateCategoryData,
    user,
    existingCategoryData,
    userTilingItems = [], // PASSED DOWN
    tilingWorkTypes = [], // PASSED DOWN
    userDefaults = {}, // NEW PROP, derived from userForData.tilingUserDefaults
    stagedManualItems = [], // 🆕 Staged manual items for consolidation
    setStagedManualItems, // 🆕 Function to clear staged items after consolidation
}, ref) => {
    const tilingEditorInternalRef = useRef(null);

    useImperativeHandle(ref, () => ({
        saveData: () => {
            // Get items from TilingCategoryEditorComponent's internal state
            let catalogItems = [];
            if (tilingEditorInternalRef.current && typeof tilingEditorInternalRef.current.saveData === 'function') {
                catalogItems = tilingEditorInternalRef.current.saveData();
            }

            // Get manual items for tiling category
            const manualItems = stagedManualItems.filter(item =>
                item.categoryId === categoryId &&
                (item.source === 'tiling_manual' || item.source === 'tiling_area_autosave' || item.source === 'manual_calc')
            );

            // Consolidate into ONE summary item if there are items
            let quoteItems;
            if (catalogItems.length > 0 || manualItems.length > 0) {
                // Calculate totals from catalog items
                const catalogTotalCost = catalogItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
                const catalogTotalPrice = catalogItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
                const catalogTotalWorkDays = catalogItems.reduce((sum, item) => sum + (Number(item.workDuration) || 0), 0);
                const catalogTotalQuantity = catalogItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

                // Add manual items totals
                const manualTotalCost = manualItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
                const manualTotalPrice = manualItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
                const manualTotalWorkDays = manualItems.reduce((sum, item) => sum + (Number(item.workDuration) || 0), 0);

                // Create consolidated summary item
                const consolidatedItem = {
                    id: `cat_tiling_summary_${Date.now()}`,
                    categoryId: categoryId,
                    categoryName: 'ריצוף וחיפוי',
                    name: 'סיכום ריצוף וחיפוי',
                    source: 'tiling_category_summary',
                    totalCost: catalogTotalCost + manualTotalCost,
                    totalPrice: catalogTotalPrice + manualTotalPrice,
                    totalProfit: (catalogTotalPrice + manualTotalPrice) - (catalogTotalCost + manualTotalCost),
                    workDuration: catalogTotalWorkDays + manualTotalWorkDays,
                    quantity: catalogTotalQuantity,
                    unit: 'מ"ר',
                    // Store detailed breakdown for reference
                    detailedBreakdown: [...catalogItems, ...manualItems],
                    catalogItemsCount: catalogItems.length,
                    manualItemsCount: manualItems.length,
                };

                quoteItems = [consolidatedItem];
            } else {
                quoteItems = [];
            }

            // Clear staged manual items for this category
            if (setStagedManualItems && manualItems.length > 0) {
                setStagedManualItems(prev => prev.filter(item =>
                    item.categoryId !== categoryId ||
                    !(item.source === 'tiling_manual' || item.source === 'tiling_area_autosave' || item.source === 'manual_calc')
                ));
            }

            return quoteItems;
        }
    }), [categoryId, stagedManualItems, setStagedManualItems]);


    return (
        <TilingCategoryEditorComponent
            ref={tilingEditorInternalRef}
            categoryTimings={categoryTimings}
            onCategoryTimingChange={onCategoryTimingChange}
            categoryId={categoryId}
            onUpdateCategoryData={onUpdateCategoryData}
            user={user}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            projectComplexities={projectComplexities}
            onUpdateRoomBreakdown={onUpdateRoomBreakdown}
            processedCategories={processedCategories}
            setProcessedCategories={setProcessedCategories}
            currentCategoryForItems={currentCategoryForItems}
            setCurrentCategoryForItems={setCurrentCategoryForItems}
            selectedCategories={selectedCategories}
            AVAILABLE_CATEGORIES={AVAILABLE_CATEGORIES}
            existingCategoryData={existingCategoryData}
            userTilingItems={userTilingItems} // PASSED DOWN
            tilingWorkTypes={tilingWorkTypes} // PASSED DOWN
            userDefaults={userDefaults} // PASSED DOWN
            stagedManualItems={stagedManualItems} // 🆕 Pass to child component
            setStagedManualItems={setStagedManualItems} // 🆕 Pass to child component
        />
    );
});


// Helper function for category colors
const getCategoryColors = (categoryId) => {
    const colorMap = {
        'cat_paint_plaster': {
            active: 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white',
            inactive: 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700',
            headerBg: 'bg-blue-50/50',
            iconBg: 'bg-blue-100',
            text: 'text-blue-600'
        },
        'cat_tiling': {
            active: 'bg-orange-600 hover:bg-orange-700 border-orange-600 text-white',
            inactive: 'bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-700',
            headerBg: 'bg-orange-50/50',
            iconBg: 'bg-orange-100',
            text: 'text-orange-600'
        },
        'cat_demolition': {
            active: 'bg-red-600 hover:bg-red-700 border-red-600 text-white',
            inactive: 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700',
            headerBg: 'bg-red-50/50',
            iconBg: 'bg-red-100',
            text: 'text-red-600'
        },
        'cat_electricity': {
            active: 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white',
            inactive: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-300 text-indigo-700',
            headerBg: 'bg-indigo-50/50',
            iconBg: 'bg-indigo-100',
            text: 'text-indigo-600'
        },
        'cat_plumbing': {
            active: 'bg-teal-600 hover:bg-teal-700 border-teal-600 text-white',
            inactive: 'bg-teal-50 hover:bg-teal-100 border-teal-300 text-teal-700',
            headerBg: 'bg-teal-50/50',
            iconBg: 'bg-teal-100',
            text: 'text-teal-600'
        },
        'cat_construction': {
            active: 'bg-gray-600 hover:bg-gray-700 border-gray-600 text-white',
            inactive: 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700',
            headerBg: 'bg-gray-50/50',
            iconBg: 'bg-gray-100',
            text: 'text-gray-600'
        }
    };
    return colorMap[categoryId] || colorMap['cat_construction'];
};

const LoadingSkeleton = ({ categoryName }) => (
  <div className="space-y-4 p-6 animate-pulse" dir="rtl">
    <div className="flex items-center justify-center gap-3 mb-6">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      <div className="text-lg text-gray-600">טוען {categoryName}...</div>
    </div>

    <div className="space-y-4">
      <div className="h-32 bg-gray-200 rounded-lg"></div>
      <div className="h-32 bg-gray-200 rounded-lg"></div>
      <div className="h-32 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

// Simple ErrorBoundary component to catch rendering errors
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="border border-red-400 bg-red-100 p-4 rounded-md text-red-700">
                    <h2 className="font-bold mb-2">משהו השתבש.</h2>
                    <p>{this.props.title || "אירעה שגיאה בטעינת הרכיב."}</p>
                    {this.props.debug && this.state.error && (
                        <details className="mt-2 text-sm">
                            <summary>פרטי שגיאה</summary>
                            <pre className="mt-2 whitespace-pre-wrap">
                                {this.state.error.toString()}
                                <br />
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}


// --- Main ItemSelector Component ---
export default function ItemSelector({
  selectedItems,
  setSelectedItems,
  onAddItemToQuote,
  selectedCategories,
  setCurrentStep,
  AVAILABLE_CATEGORIES,
  currentCategoryForItems,
  setCurrentCategoryForItems,
  processedCategories,
  setProcessedCategories,
  categoryId,
  categoryTimings,
  onCategoryTimingChange,
  onProceed,
  projectComplexities,
  onUpdateRoomBreakdown,
  generalStartDate,
  generalEndDate,
  tilingWorkTypes = [],
  userTilingItems = [],
  user, // ✅ Receive user from parent QuoteCreate
  stagedManualItems = [], // 🆕 Staged manual items for consolidation
  setStagedManualItems, // 🆕 Function to update staged manual items
}) {
  // Use user from parent instead of loading separately
  const userForData = user;
  const isUserLoadingHook = !user;
  const isLoadingUser = isUserLoadingHook;

  const [catalogItems, setCatalogItems] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [isCategorySpecificLoading, setIsCategorySpecificLoading] = useState(false);
  const [isInitialComplexCategoryLoad, setIsInitialComplexCategoryLoad] = useState(true);

  // עדכון הקריאה לדיאלוג הריצוף הידני
  const [showTilingManualDialog, setShowTilingManualDialog] = useState(false);

  // CHANGED: State for showing/hiding dates section - default to FALSE (closed)
  const [showDates, setShowDates] = React.useState(false);
    // For date pickers, we need the specific category timing
  const categoryTiming = useMemo(() => categoryTimings[currentCategoryForItems] || {}, [categoryTimings, currentCategoryForItems]);


  const COMPLEX_CATEGORIES = useMemo(() => ['cat_paint_plaster', 'cat_tiling'], []);

  const currentCategory = useMemo(() => AVAILABLE_CATEGORIES.find(cat => cat.id === currentCategoryForItems), [AVAILABLE_CATEGORIES, currentCategoryForItems]);
  const categoryName = currentCategory?.name || 'הקטגוריה';

  const categoryTitle = currentCategory?.name || 'הגדרת פריטים וכמויות';
  const categoryDescription = currentCategory?.description || 'עבור בין הקטגוריות שבחרת והוסף את הפריטים הנדרשים לכל אחת.';

  // Destructure headerBg and iconBg directly from getCategoryColors
  const categoryColors = getCategoryColors(currentCategoryForItems);
  const { active, inactive, headerBg, iconBg } = categoryColors;


  const categoryIcon = useMemo(() => {
    switch (currentCategoryForItems) {
        case 'cat_tiling': return <PaintBucket className={`w-5 h-5 ${categoryColors.text}`} />;
        case 'cat_paint_plaster': return <Paintbrush2 className={`w-5 h-5 ${categoryColors.text}`} />;
        case 'cat_demolition': return <Trash2 className={`w-5 h-5 ${categoryColors.text}`} />;
        case 'cat_electricity': return <Hammer className={`w-5 h-5 ${categoryColors.text}`} />;
        default: return <Hammer className={`w-5 h-5 ${categoryColors.text}`} />;
    }
  }, [currentCategoryForItems, categoryColors.text]);

  const categoriesForNav = React.useMemo(() => {
    return AVAILABLE_CATEGORIES
      .filter(c => selectedCategories.includes(c.id))
      .sort((a, b) => {
        return selectedCategories.indexOf(a.id) - selectedCategories.indexOf(b.id);
      })
      .map(c => ({ id: c.id, name: c.name }));
  }, [AVAILABLE_CATEGORIES, selectedCategories]);

  // חישוב סיכום כולל לריצוף - כולל פריטים ידניים
  const tilingCategorySummary = useMemo(() => {
    const tilingItems = selectedItems.filter(item => item.categoryId === 'cat_tiling');

    // 🆕 Include staged manual items for real-time summary
    const stagedTilingItems = (stagedManualItems || []).filter(item =>
      item.categoryId === 'cat_tiling' &&
      (item.source === 'tiling_manual' || item.source === 'tiling_area_autosave' || item.source === 'manual_calc')
    );

    if (tilingItems.length === 0 && stagedTilingItems.length === 0) {
      return {
        totalArea: 0,
        totalMaterialCost: 0,
        totalLaborCost: 0,
        totalContractorCost: 0,
        totalClientPrice: 0,
        totalProfit: 0,
        totalWorkDays: 0,
        itemCount: 0
      };
    }

    // Calculate totals from catalog items
    const catalogTotals = tilingItems.reduce((acc, item) => {
      return {
        totalArea: acc.totalArea + (Number(item.quantity) || 0),
        totalMaterialCost: acc.totalMaterialCost + (Number(item.materialCost) || 0),
        totalLaborCost: acc.totalLaborCost + (Number(item.laborCost) || 0),
        totalContractorCost: acc.totalContractorCost + (Number(item.totalCost) || 0),
        totalClientPrice: acc.totalClientPrice + (Number(item.totalPrice) || 0),
        totalProfit: acc.totalProfit + (Number(item.profit) || 0),
        totalWorkDays: acc.totalWorkDays + (Number(item.workDuration) || 0),
        itemCount: acc.itemCount + 1
      };
    }, {
      totalArea: 0,
      totalMaterialCost: 0,
      totalLaborCost: 0,
      totalContractorCost: 0,
      totalClientPrice: 0,
      totalProfit: 0,
      totalWorkDays: 0,
      itemCount: 0
    });

    // Calculate totals from staged manual items
    const manualTotals = stagedTilingItems.reduce((acc, item) => {
      return {
        totalArea: acc.totalArea + (Number(item.quantity) || 0),
        totalMaterialCost: acc.totalMaterialCost + (Number(item.materialCost) || 0),
        totalLaborCost: acc.totalLaborCost + (Number(item.laborCost) || 0),
        totalContractorCost: acc.totalContractorCost + (Number(item.totalCost) || 0),
        totalClientPrice: acc.totalClientPrice + (Number(item.totalPrice) || 0),
        totalProfit: acc.totalProfit + (Number(item.profit) || 0),
        totalWorkDays: acc.totalWorkDays + (Number(item.workDuration) || 0),
        itemCount: acc.itemCount + 1
      };
    }, {
      totalArea: 0,
      totalMaterialCost: 0,
      totalLaborCost: 0,
      totalContractorCost: 0,
      totalClientPrice: 0,
      totalProfit: 0,
      totalWorkDays: 0,
      itemCount: 0
    });

    // Combine both totals
    return {
      totalArea: catalogTotals.totalArea + manualTotals.totalArea,
      totalMaterialCost: catalogTotals.totalMaterialCost + manualTotals.totalMaterialCost,
      totalLaborCost: catalogTotals.totalLaborCost + manualTotals.totalLaborCost,
      totalContractorCost: catalogTotals.totalContractorCost + manualTotals.totalContractorCost,
      totalClientPrice: catalogTotals.totalClientPrice + manualTotals.totalClientPrice,
      totalProfit: catalogTotals.totalProfit + manualTotals.totalProfit,
      totalWorkDays: catalogTotals.totalWorkDays + manualTotals.totalWorkDays,
      itemCount: catalogTotals.itemCount + manualTotals.itemCount
    };
  }, [selectedItems, stagedManualItems]);


  const normalizeRoomsForBreakdown = useCallback((raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map((r, idx) => ({
      name: r.name || r.roomName || `חלל ${idx + 1}`,
      quantity: Number(r.quantity ?? 1),
      unit: r.unit || 'מ"ר',
      includeCeiling: (typeof r.includeCeiling === 'boolean') ? r.includeCeiling : (r.withCeiling ?? false),
      wallArea: Number(
        r.wallArea ??
        r.wallsArea ??
        r.walls ??
        r.wallAreaSqM ??
        0
      ),
      ceilingArea: Number(
        r.ceilingArea ??
        r.ceilingAreaSqM ??
        r.ceiling ??
        0
      ),
      difficultyData: r.difficultyData || (r.difficultyLevel ? { label: r.difficultyLevel } : undefined),
    }));
  }, []);

  const tilingEditorRef = useRef(null);
  const paintRoomsRef = useRef(null);
  const demolitionManagerRef = useRef(null);
  const electricalManagerRef = useRef(null);

  const [categoryDataMap, setCategoryDataMap] = useState({});

  const handleUpdateItems = useCallback((data) => {
      setCategoryDataMap(prev => {
          const newCategoryDataMap = {
              ...prev,
              [data.categoryId]: data
          };

          if (data.categoryId === 'cat_paint_plaster' && data.rooms && data.rooms.length > 0) {
              const allIndividualRoomBreakdowns = data.rooms.flatMap(room => room.roomBreakdown || []);
              const normalizedCombinedBreakdown = normalizeRoomsForBreakdown(allIndividualRoomBreakdowns);

              if (normalizedCombinedBreakdown.length > 0 && typeof onUpdateRoomBreakdown === 'function') {
                  onUpdateRoomBreakdown('paint', normalizedCombinedBreakdown);
              }

              if (normalizedCombinedBreakdown.length > 0) {
                try {
                  sessionStorage.setItem('paint_last_breakdown', JSON.stringify(normalizedCombinedBreakdown));
                } catch (e) {
                  console.warn("Failed to save paint_last_breakdown to sessionStorage:", e);
                }
              }
          }

          return newCategoryDataMap;
      });
  }, [normalizeRoomsForBreakdown, onUpdateRoomBreakdown]);


  const saveCurrentCategoryData = useCallback(async (categoryIdToSave) => {
    if (!categoryIdToSave) {
        return;
    }

    let itemsFromCurrentCategoryComponent = []; // Items returned by the category's saveData()
    let categorySpecificDataForMap = {}; // Data specific to store in categoryDataMap

    if (categoryIdToSave === 'cat_tiling') {
        if (tilingEditorRef.current && typeof tilingEditorRef.current.saveData === 'function') {
            itemsFromCurrentCategoryComponent = tilingEditorRef.current.saveData();
            categorySpecificDataForMap = { items: itemsFromCurrentCategoryComponent };
        }
    } else if (categoryIdToSave === 'cat_paint_plaster') {
        if (paintRoomsRef.current && typeof paintRoomsRef.current.saveData === 'function') {
            const savedPaintData = paintRoomsRef.current.saveData(); // Returns { quoteItems, rawRooms }
            itemsFromCurrentCategoryComponent = savedPaintData.quoteItems;
            categorySpecificDataForMap = {
                rooms: savedPaintData.rawRooms,
                items: savedPaintData.quoteItems
            };
        }
    } else if (categoryIdToSave === 'cat_demolition') {
        if (demolitionManagerRef.current && typeof demolitionManagerRef.current.saveData === 'function') {
            itemsFromCurrentCategoryComponent = demolitionManagerRef.current.saveData();
            categorySpecificDataForMap = { items: itemsFromCurrentCategoryComponent };
        }
    } else if (categoryIdToSave === 'cat_electricity') {
        if (electricalManagerRef.current && typeof electricalManagerRef.current.saveData === 'function') {
            itemsFromCurrentCategoryComponent = electricalManagerRef.current.saveData();
            categorySpecificDataForMap = { items: itemsFromCurrentCategoryComponent };
        }
    }

    // Update global selectedItems: remove old items for this category, add new ones
    setSelectedItems(prevItems => {
        const otherCategoryItems = prevItems.filter(item => item.categoryId !== categoryIdToSave);
        return [...otherCategoryItems, ...itemsFromCurrentCategoryComponent];
    });

    // Update categoryDataMap
    setCategoryDataMap(prev => ({
        ...prev,
        [categoryIdToSave]: {
            categoryId: categoryIdToSave,
            ...categorySpecificDataForMap,
            timing: categoryTimings[categoryIdToSave] || null,
        }
    }));

    // Mark category as processed if it has items.
    if (itemsFromCurrentCategoryComponent.length > 0) {
        setProcessedCategories(prev => {
            if (!prev.includes(categoryIdToSave)) {
                return [...prev, categoryIdToSave];
            }
            return prev;
        });
    }

  }, [selectedItems, setSelectedItems, setCategoryDataMap, categoryTimings, setProcessedCategories,
      tilingEditorRef, paintRoomsRef, demolitionManagerRef, electricalManagerRef
  ]);

  // Create stable reference for paint items to prevent unnecessary re-renders
  const userPaintItems = useMemo(() =>
    userForData?.user_metadata?.paintItems || [],
    [userForData?.user_metadata?.paintItems]
  );

  useEffect(() => {
    if (userForData !== null || isUserLoadingHook === false) {
        const loadCatalogData = async () => {
            setIsLoadingCatalog(true);
            try {
                if (userForData) {
                    if (userPaintItems && Array.isArray(userPaintItems) && userPaintItems.length > 0) {
                        const finalPaintItems = userPaintItems.filter(item => item).map(item => {
                            const newItem = { ...item };
                            if (!newItem.itemType) {
                                const name = (newItem.itemName || newItem.name || '').toLowerCase();
                                if (name.includes('טיח') || name.includes('שפכטל')) {
                                    newItem.itemType = 'טיח';
                                    newItem.workCategory = 'plaster';
                                } else {
                                    newItem.itemType = 'צבע';
                                    newItem.workCategory = 'paint';
                                }
                            }
                            return newItem;
                        });
                        setCatalogItems(finalPaintItems);
                    } else {
                        setCatalogItems([]);
                    }

                    if (projectComplexities && projectComplexities.categoryDataMap) {
                        setCategoryDataMap(projectComplexities.categoryDataMap);
                    }
                } else {
                    setCatalogItems([]);
                    setCategoryDataMap({});
                }
            } catch (error) {
                console.error("Error loading catalog items or project complexities:", error);
                setCatalogItems([]);
                setCategoryDataMap({});
            } finally {
                setIsLoadingCatalog(false);
            }
        };
        loadCatalogData();
    }
  }, [userPaintItems, projectComplexities, isUserLoadingHook, userForData]);

  useEffect(() => {
      const currentIsComplex = COMPLEX_CATEGORIES.includes(currentCategoryForItems);

      const handleCategoryContentLoad = async () => {
          if (currentIsComplex && isInitialComplexCategoryLoad) {
              setIsCategorySpecificLoading(true);
              await new Promise(resolve => setTimeout(resolve, 150));
          }
          setIsCategorySpecificLoading(false);
          if (currentIsComplex) {
            setIsInitialComplexCategoryLoad(false);
          }
      };

      if (!isLoadingUser && !isLoadingCatalog) {
          handleCategoryContentLoad();
      }
  }, [currentCategoryForItems, isLoadingUser, isLoadingCatalog, isInitialComplexCategoryLoad, COMPLEX_CATEGORIES]);

  const handleCategoryTimingChangeInternal = useCallback((categoryId, field, value) => {
    onCategoryTimingChange(categoryId, field, value);

    // REMOVED: Auto-calculation of endDate when startDate changes
    // This useEffect has been removed to allow manual selection of end date
    // The old logic would automatically calculate endDate = startDate + 1 day
    // Now users must manually select both start and end dates
  }, [onCategoryTimingChange, categoryTimings]);

    // Handler for opening manual calc dialog
    const handleOpenManualCalc = () => {
      const workType = currentCategoryForItems === 'cat_paint_plaster' ? 'paint' : 'paint'; // Default to paint, as this button is specific to paint/plaster
      if (typeof window.__b44OpenManualCalc === 'function') {
        window.__b44OpenManualCalc(workType, null, null);
      }
    };


  const renderCategoryEditor = useCallback(() => {
    if (!currentCategoryForItems) return null;

    let categorySpecificProps = {};
    let CategoryComponent;
    let componentRef;

    const existingCategoryData = categoryDataMap[currentCategoryForItems];

    if (isCategorySpecificLoading && COMPLEX_CATEGORIES.includes(currentCategoryForItems)) {
        return (
            <LoadingSkeleton categoryName={categoryName} />
        );
    }

    if (currentCategoryForItems === 'cat_tiling') {
        CategoryComponent = TilingCategoryEditorLocalWrapper;
        componentRef = tilingEditorRef;
        categorySpecificProps = {
            onUpdateCategoryData: handleUpdateItems,
            existingCategoryData: existingCategoryData,
            user: userForData,
            projectComplexities: projectComplexities,
            selectedItems: selectedItems,
            setSelectedItems: setSelectedItems,
            currentCategoryForItems: currentCategoryForItems,
            setCurrentCategoryForItems: setCurrentCategoryForItems,
            processedCategories: processedCategories,
            setProcessedCategories: setProcessedCategories,
            selectedCategories: selectedCategories,
            AVAILABLE_CATEGORIES: AVAILABLE_CATEGORIES,
            userTilingItems: userTilingItems,
            tilingWorkTypes: tilingWorkTypes,
            userDefaults: userForData?.user_metadata?.tilingUserDefaults || {},
            stagedManualItems: stagedManualItems, // 🆕 Pass staged manual items
            setStagedManualItems: setStagedManualItems, // 🆕 Pass setState function
        };
    } else if (currentCategoryForItems === 'cat_paint_plaster') {
        CategoryComponent = PaintPlasterCategory;
        componentRef = paintRoomsRef;
        categorySpecificProps = {
            onUpdateCategoryData: handleUpdateItems,
            existingCategoryData: existingCategoryData,
            user: userForData,
            projectComplexities: projectComplexities,
            onUpdateRoomBreakdown: onUpdateRoomBreakdown,
            paintItems: catalogItems,
            categoryTimings: categoryTimings, // Pass categoryTimings down to PaintPlasterCategory
            onCategoryTimingChange: onCategoryTimingChange, // Pass for consistency
            stagedManualItems: stagedManualItems, // 🆕 Pass staged manual items
            setStagedManualItems: setStagedManualItems, // 🆕 Pass setState function
            selectedItems: selectedItems, // 🆕 Pass selectedItems to filter manual items
        };
    } else if (currentCategoryForItems === 'cat_demolition') {
        CategoryComponent = DemolitionCategory;
        componentRef = demolitionManagerRef;
        categorySpecificProps = {
            onUpdateCategoryData: handleUpdateItems,
            existingCategoryData: existingCategoryData,
            user: userForData,
            categoryId: currentCategoryForItems,
        };
    } else if (currentCategoryForItems === 'cat_electricity') {
        CategoryComponent = ElectricalCategory;
        componentRef = electricalManagerRef;
        categorySpecificProps = {
            onUpdateCategoryData: handleUpdateItems,
            existingCategoryData: existingCategoryData,
            user: userForData,
            categoryId: currentCategoryForItems,
        };
    } else {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">מנהל הפריטים עבור קטגוריה זו עדיין לא מוכן</p>
                <p className="text-sm text-gray-500 mt-2">קטגוריה: {currentCategoryForItems}</p>
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentCategoryForItems}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-0"
            >
                {/* Wrap PaintPlasterCategory in ErrorBoundary only if it's the current category */}
                {currentCategoryForItems === 'cat_paint_plaster' ? (
                  <ErrorBoundary title="שגיאה בניהול חדרים" debug={false}>
                    <CategoryComponent
                        ref={componentRef}
                        categoryId={currentCategoryForItems}
                        onCategoryTimingChange={handleCategoryTimingChangeInternal}
                        categoryTimings={categoryTimings}
                        {...categorySpecificProps}
                    />
                  </ErrorBoundary>
                ) : (
                  <CategoryComponent
                      ref={componentRef}
                      categoryId={currentCategoryForItems}
                      onCategoryTimingChange={handleCategoryTimingChangeInternal}
                      categoryTimings={categoryTimings}
                      {...categorySpecificProps}
                  />
                )}
            </motion.div>
        </AnimatePresence>
    );
  }, [
    currentCategoryForItems, categoryTimings, handleCategoryTimingChangeInternal, handleUpdateItems,
    categoryDataMap, userForData, projectComplexities, onUpdateRoomBreakdown, catalogItems,
    selectedItems, setSelectedItems, setCurrentCategoryForItems, processedCategories,
    setProcessedCategories, selectedCategories, AVAILABLE_CATEGORIES, tilingEditorRef,
    paintRoomsRef, demolitionManagerRef, electricalManagerRef, isCategorySpecificLoading, categoryName, COMPLEX_CATEGORIES,
    userTilingItems, tilingWorkTypes, onCategoryTimingChange, stagedManualItems, setStagedManualItems
  ]);


  const handleCategoryChange = useCallback(async (newCategoryId) => {
    if (currentCategoryForItems) {
        await saveCurrentCategoryData(currentCategoryForItems);
    }

    setCurrentCategoryForItems(newCategoryId);
  }, [currentCategoryForItems, saveCurrentCategoryData, setCurrentCategoryForItems]);


  const isLastCategory = useMemo(() => {
    const currentIndex = selectedCategories.indexOf(currentCategoryForItems);
    return currentIndex === selectedCategories.length - 1;
  }, [selectedCategories, currentCategoryForItems]);

  const canGoBack = useMemo(() => {
      return selectedCategories.indexOf(currentCategoryForItems) > 0;
  }, [currentCategoryForItems, selectedCategories]);

  const handleNextCategory = useCallback(async () => {
    if (currentCategoryForItems) {
        await saveCurrentCategoryData(currentCategoryForItems);
    }

    const currentIndex = selectedCategories.indexOf(currentCategoryForItems);
    if (currentIndex < selectedCategories.length - 1) {
        const nextCategoryId = selectedCategories[currentIndex + 1];
        setCurrentCategoryForItems(nextCategoryId);
    }
  }, [currentCategoryForItems, selectedCategories, saveCurrentCategoryData, setCurrentCategoryForItems]);

  const handleSaveAndProceed = useCallback(async () => {
    if (currentCategoryForItems) {
        await saveCurrentCategoryData(currentCategoryForItems);
    }

    onProceed();
  }, [currentCategoryForItems, saveCurrentCategoryData, onProceed]);

  const handleBack = useCallback(async () => {
      if (currentCategoryForItems) {
          await saveCurrentCategoryData(currentCategoryForItems);
      }

      const currentIndex = selectedCategories.indexOf(currentCategoryForItems);
      if (currentIndex > 0) {
          const prevCategory = selectedCategories[currentIndex - 1];
          setCurrentCategoryForItems(prevCategory);
      }
  }, [selectedCategories, currentCategoryForItems, saveCurrentCategoryData, setCurrentCategoryForItems]);


  const nextCategory = useMemo(() => {
    const currentIndex = selectedCategories.indexOf(currentCategoryForItems);
    if (currentIndex < selectedCategories.length - 1) {
      const nextCategoryId = selectedCategories[currentIndex + 1];
      return AVAILABLE_CATEGORIES.find(c => c.id === nextCategoryId);
    }
    return null;
  }, [selectedCategories, currentCategoryForItems, AVAILABLE_CATEGORIES]);

  if (isLoadingUser || isLoadingCatalog) {
      return (
          <div className="flex items-center justify-center p-8 min-h-[400px]">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="mr-3">טוען נתונים...</p>
          </div>
      );
  }

  return (
    <>
      <Card className="shadow-lg flex flex-col h-full" dir="rtl">
        <CardHeader className={`${categoryColors.headerBg} border-b space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${categoryColors.iconBg} rounded-lg`}>
                {categoryIcon}
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-800">{categoryTitle}</CardTitle>
                <CardDescription className="text-gray-600">{categoryDescription}</CardDescription>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white">
            <Collapsible open={showDates} onOpenChange={setShowDates}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    תאריכי ביצוע - {categoryName}
                  </span>
                  {showDates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <AnimatePresence>
                  {showDates && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-2 border-t space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`startDate-${currentCategoryForItems}`} className="text-sm font-medium text-gray-700">
                              תאריך התחלה
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  id={`startDate-${currentCategoryForItems}`}
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-right font-normal h-10 mt-1",
                                    !categoryTiming.startDate
                                      ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                      : "bg-green-50 border-green-300 text-green-800"
                                  )}
                                >
                                  <CalendarDays className="ml-2 h-4 w-4" />
                                  {categoryTiming.startDate ? format(new Date(categoryTiming.startDate), "d MMMM, yyyy", { locale: he }) : <span>בחר תאריך</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                                  mode="single"
                                  selected={categoryTiming.startDate ? new Date(categoryTiming.startDate) : undefined}
                                  onSelect={(date) => {
                                    if (date && onCategoryTimingChange) {
                                      handleCategoryTimingChangeInternal(currentCategoryForItems, 'startDate', format(date, 'yyyy-MM-dd'));
                                    }
                                  }}
                                  initialFocus
                                  dir="rtl"
                                  disabled={(date) => {
                                    if (!generalStartDate) return false;
                                    const minDate = new Date(generalStartDate);
                                    if (generalEndDate) {
                                      const maxDate = new Date(generalEndDate);
                                      minDate.setHours(0,0,0,0);
                                      maxDate.setHours(23,59,59,999);
                                      return date < minDate || date > maxDate;
                                    }
                                    minDate.setHours(0,0,0,0);
                                    return date < minDate;
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div>
                            <Label htmlFor={`endDate-${currentCategoryForItems}`} className="text-sm font-medium text-gray-700">
                              תאריך סיום
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  id={`endDate-${currentCategoryForItems}`}
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-right font-normal h-10 mt-1",
                                    !categoryTiming.endDate
                                      ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                      : "bg-green-50 border-green-300 text-green-800"
                                  )}
                                  disabled={!categoryTiming.startDate}
                                >
                                  <CalendarDays className="ml-2 h-4 w-4" />
                                  {categoryTiming.endDate ? format(new Date(categoryTiming.endDate), "d MMMM, yyyy", { locale: he }) : <span>בחר תאריך</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                                  mode="single"
                                  selected={categoryTiming.endDate ? new Date(categoryTiming.endDate) : undefined}
                                  onSelect={(date) => {
                                    if (date && onCategoryTimingChange) {
                                      handleCategoryTimingChangeInternal(currentCategoryForItems, 'endDate', format(date, 'yyyy-MM-dd'));
                                    }
                                  }}
                                  disabled={(date) => {
                                    // Use the globally defined getTomorrow, ensuring we pass a Date object
                                    const getTomorrow = (d) => {
                                      const nextDay = new Date(d);
                                      nextDay.setDate(d.getDate() + 1);
                                      return nextDay;
                                    };
                                    const minDate = categoryTiming.startDate ? getTomorrow(new Date(categoryTiming.startDate)) : undefined;
                                    const generalMaxDate = generalEndDate ? new Date(generalEndDate) : undefined;
                                    generalMaxDate?.setHours(23,59,59,999);
                                    
                                    if (minDate && generalMaxDate) {
                                      minDate.setHours(0,0,0,0);
                                      return date < minDate || date > generalMaxDate;
                                    } else if (minDate) {
                                      minDate.setHours(0,0,0,0);
                                      return date < minDate;
                                    } else if (generalMaxDate) {
                                      return date > generalMaxDate;
                                    }
                                    return false;
                                  }}
                                  initialFocus
                                  dir="rtl"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {(currentCategoryForItems === 'cat_paint_plaster' || currentCategoryForItems === 'cat_tiling') && (
            <div className="pt-2">
              <Button
                onClick={currentCategoryForItems === 'cat_paint_plaster' ? handleOpenManualCalc : () => setShowTilingManualDialog(true)}
                variant="outline"
                className={cn(
                  "w-full border-2 border-dashed font-medium",
                  currentCategoryForItems === 'cat_paint_plaster'
                    ? "border-blue-300 hover:border-blue-400 hover:bg-blue-50 text-blue-700"
                    : "border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
                )}
                data-paint-advanced={currentCategoryForItems === 'cat_paint_plaster' ? 'true' : undefined}
                data-tiling-advanced={currentCategoryForItems === 'cat_tiling' ? 'true' : undefined}
              >
                <Calculator className="ml-2 h-4 w-4" />
                הוסף פריט ידני
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentCategoryForItems === 'cat_tiling' && (
            <>
              <HideTilingCatalogAdd />
              <TilingAutoSaveOnAddArea onAddItemToQuote={onAddItemToQuote} />
              {/* סיכום קטגוריה - כמו צבע ושפכטל */}
              {tilingCategorySummary.itemCount > 0 && (
                <div className="mt-6 p-0">
                  <Collapsible open={isTilingSummaryOpen} onOpenChange={setIsTilingSummaryOpen}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 rounded-lg border-2 border-orange-300 p-3 hover:shadow-md transition-all duration-300 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Building className="w-5 h-5 ml-2 text-orange-600" />
                            סיכום כולל לקטגוריית ריצוף וחיפוי
                          </h3>
                          {isTilingSummaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <div className="bg-white rounded-lg border-2 border-orange-300 shadow-sm overflow-hidden">
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                              <div className="text-xl font-bold text-blue-800">
                                ₪{formatPrice(tilingCategorySummary.totalClientPrice || 0)}
                              </div>
                              <div className="text-sm text-blue-600 font-medium">מחיר ללקוח</div>
                              <div className="text-xs text-blue-500">
                                {tilingCategorySummary.totalArea > 0
                                  ? `₪${formatPrice(tilingCategorySummary.totalClientPrice / tilingCategorySummary.totalArea)} למ"ר`
                                  : ''}
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-red-100 p-3 rounded-lg border border-orange-200">
                              <div className="text-xl font-bold text-orange-800">
                                ₪{formatPrice(tilingCategorySummary.totalContractorCost || 0)}
                              </div>
                              <div className="text-sm text-orange-600 font-medium">עלות קבלן</div>
                              <div className="text-xs text-orange-500">
                                {tilingCategorySummary.totalArea > 0
                                  ? `₪${formatPrice(tilingCategorySummary.totalContractorCost / tilingCategorySummary.totalArea)} למ"ר`
                                  : ''}
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                              <div className="text-xl font-bold text-green-800">
                                ₪{formatPrice(tilingCategorySummary.totalProfit || 0)}
                              </div>
                              <div className="text-sm text-green-600 font-medium">רווח</div>
                              <div className="text-xs text-green-500">
                                {tilingCategorySummary.totalContractorCost > 0
                                  ? `${((tilingCategorySummary.totalProfit / tilingCategorySummary.totalContractorCost) * 100).toFixed(1)}%`
                                  : '0%'}
                                {tilingCategorySummary.totalArea > 0
                                  ? ` | ₪${formatPrice(tilingCategorySummary.totalProfit / tilingCategorySummary.totalArea)} למ"ר`
                                  : ''}
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <h4 className="font-semibold text-gray-700 mb-3 text-center">פירוט עלויות כללי:</h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-gray-100 p-2 rounded-lg">
                                <div className="text-base font-bold text-gray-800">
                                  ₪{formatPrice(tilingCategorySummary.totalMaterialCost || 0)}
                                </div>
                                <div className="text-xs text-gray-500">עלות חומרים</div>
                              </div>
                              <div className="bg-gray-100 p-2 rounded-lg">
                                <div className="text-base font-bold text-gray-800">
                                  ₪{formatPrice(tilingCategorySummary.totalLaborCost || 0)}
                                </div>
                                <div className="text-xs text-gray-500">עלויות עובדים</div>
                              </div>
                              <div className="bg-gray-100 p-2 rounded-lg">
                                <div className="text-base font-bold text-gray-800">
                                  {(tilingCategorySummary.totalWorkDays || 0).toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-500">ימי עבודה</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </>
          )}

          <div className="flex-grow">
            {renderCategoryEditor()}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t p-4 bg-gray-50/50">
          <Button variant="outline" onClick={handleBack} disabled={!canGoBack} className="text-base px-6 py-2.5">
            <ArrowRight className="ml-2 h-4 w-4" />
            הקודם
          </Button>
          <div className="flex items-center gap-3">
            {nextCategory ? (
              <Button onClick={handleNextCategory} className={cn("text-base px-6 py-2.5", categoryColors.active)}>
                הבא: {nextCategory.name}
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSaveAndProceed} className={`text-base px-6 py-2.5 bg-green-600 hover:bg-green-700`}>
                <Save className="ml-2 h-4 w-4" />
                שמור והמשך לעלויות נוספות
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* כפתור צף להוספת פריט - לכל הקטגוריות */}
      <CategoryFloatingAddButton
        onClick={() => {
          if (currentCategoryForItems === 'cat_paint_plaster') {
            handleOpenManualCalc();
          } else if (currentCategoryForItems === 'cat_tiling') {
            setShowTilingManualDialog(true);
          }
        }}
        categoryColor={(() => {
            if (currentCategoryForItems === 'cat_paint_plaster') return 'blue';
            if (currentCategoryForItems === 'cat_tiling') return 'orange';
            const colors = getCategoryColors(currentCategoryForItems);
            if (colors.active.includes('bg-red')) return 'red';
            if (colors.active.includes('bg-teal')) return 'teal';
            if (colors.active.includes('bg-gray')) return 'gray';
            if (colors.active.includes('bg-indigo')) return 'indigo';
            return 'blue';
        })()}
        icon={Plus}
        label={(() => {
            if (currentCategoryForItems === 'cat_paint_plaster') return 'חישוב צבע מתקדם';
            if (currentCategoryForItems === 'cat_tiling') return 'חישוב ריצוף מתקדם';
            return 'הוסף פריט';
        })()}
      />

      <TilingManualItemDialog
        open={showTilingManualDialog}
        onOpenChange={setShowTilingManualDialog}
        onAdd={onAddItemToQuote}
        defaults={userForData?.user_metadata?.tilingUserDefaults || {}}
      />
    </>
  );
}
