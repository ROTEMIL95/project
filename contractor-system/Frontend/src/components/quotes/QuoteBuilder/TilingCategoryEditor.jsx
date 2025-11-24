
import React, { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, ArrowLeft, ArrowRight, BarChart2, Trash2, CheckCircle, Settings, Calculator, Edit, X, Check, ChevronDown, ChevronUp, Box, AlertCircle, Building, BarChart3, Users, TrendingDown, TrendingUp, Package, Maximize2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar"; // Changed to CalendarComponent as per outline
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as PricingService from '@/components/costCalculator/PricingService';
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import TilingInlineItemForm from "./TilingInlineItemForm"; // Inline editor UI bits

// Assuming TilingManualItemDialog is a new component or already exists.
// If it does not exist, this import will cause an error, but based on the outline, it's expected.
import TilingManualItemDialog from './TilingManualItemDialog';
import { useUser } from '@/components/utils/UserContext'; // Path changed as per outline
import CategoryNav from '@/components/costCalculator/CategoryNav'; // Added as per outline

// Keeping the original formatPrice import and not redefining it locally.
import { formatPrice } from '@/components/costCalculator/TilingCalculator';

// Helper function to format item display name with size
const formatItemNameWithSize = (item) => {
  if (!item || !item.selectedItemData) return '';

  let baseName = item.selectedItemData.name || item.selectedItemData.tileName || item.selectedItemData.itemName || '';

  // If the item has a selected size, add it to the display name
  if (item.selectedSize) {
    baseName += ` (${item.selectedSize})`;
  }

  // If the item has a workType, add it
  if (item.workType && !baseName.includes(item.workType)) { // Avoid duplication if workType is already in name
    baseName += ` [${item.workType}]`;
  }

  return baseName;
};

/**
 * Improved helper function to return the display name of a catalog item,
 * including its most relevant tile size found across various fields.
 * This is used for displaying options in the Select dropdown.
 * @param {object} catalogItem The raw catalog item object.
 * @returns {string} The formatted display name (e.g., "אריח קרמיקה (60x60)").
 */
const getDisplayNameForCatalogItemOption = (catalogItem) => {
  if (!catalogItem) return '';

  let baseName = catalogItem.tileName || catalogItem.itemName || catalogItem.name || '';
  let displaySize = null;

  // Order of preference for size fields, to robustly find a single representative size
  const possibleSizeFields = [
    'selectedSizes', // If the catalog item itself implies a specific selected size
    'availableSizes', // Often an array, take the first one
    'tileSizes',      // Another common field for tile sizes
    'size',
    'tileSize',
    'dimensions',
    'itemSize',
    'tileFormat'
  ];

  for (const field of possibleSizeFields) {
    const fieldValue = catalogItem[field];
    if (fieldValue) {
      if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        // If it's an array, take the first element as the representative size
        displaySize = fieldValue[0];
        break;
      } else if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
        // If it's a non-empty string, use it directly
        displaySize = fieldValue;
        break;
      }
    }
  }

  // Append the found size if it exists
  if (displaySize) {
    baseName += ` (${displaySize})`;
  }

  return baseName;
};

const calculateTilingMetrics = (item, tilingItemData, userDefaults) => {
  if (!item) return null;

  // Ensure we have default objects to prevent undefined errors
  const safeUserDefaults = userDefaults || {};
  const safeTilingItemData = tilingItemData || {};

  const quantity = parseFloat(item.quantity) || 0;
  const panelQuantity = parseFloat(item.panelQuantity) || 0;

  // ✅ FIX: In stage 3, labor cost is saved WITH the item (tilingItemData), not in userDefaults
  // Priority: item's saved laborCostPerDay first, then user defaults as fallback
  const laborCostPerDay = parseFloat(safeTilingItemData.laborCostPerDay || safeUserDefaults.laborCostPerDay) || 0;

  // Keep original logic for other fields (item first, then defaults)
  const dailyOutput = parseFloat(safeTilingItemData.dailyOutput || safeUserDefaults.dailyOutput) || 1;
  const panelWorkCapacity = parseFloat(safeTilingItemData.panelLaborWorkCapacity || safeUserDefaults.panelLaborWorkCapacity) || 1;
  const complexityMultiplier = (item.complexity?.multiplier || 0) / 100; // Convert percentage to decimal

  // Material Cost Calculation - FIXED TO APPLY WASTAGE ONLY TO TILE COST
  const materialCostPerMeter = parseFloat(safeTilingItemData.materialCost) || 0;
  const additionalMaterialCostPerMeter = parseFloat(safeTilingItemData.additionalCost || safeUserDefaults.additionalCost) || 0;
  const wastagePercent = parseFloat(safeTilingItemData.wastagePercent || safeUserDefaults.wastagePercent) || 0;
  const wastageMultiplier = 1 + wastagePercent / 100;

  const costOfTilesWithWastage = materialCostPerMeter * quantity * wastageMultiplier;
  const costOfBlackMaterial = additionalMaterialCostPerMeter * quantity; // Wastage is NOT applied here
  const totalMaterialCost = Math.round(costOfTilesWithWastage + costOfBlackMaterial);


  // Labor Cost Calculation - MODIFIED with proper complexity handling and separate tracking
  let quantityWorkDays = 0;
  let panelWorkDays = 0;

  if (quantity > 0) {
    quantityWorkDays = quantity / dailyOutput;
  }
  if (panelQuantity > 0) {
    panelWorkDays = panelQuantity / panelWorkCapacity;
  }

  const baseWorkDays = quantityWorkDays + panelWorkDays;

  // Apply complexity multiplier correctly to work days
  const totalWorkDays = baseWorkDays * (1 + complexityMultiplier);
  const baseLaborCost = baseWorkDays * laborCostPerDay;
  const totalLaborCost = totalWorkDays * laborCostPerDay;

  // Separate labor costs for display
  const quantityLaborCost = quantityWorkDays * laborCostPerDay;
  const panelLaborCost = panelWorkDays * laborCostPerDay;

  // Total Contractor Cost
  const fixedProjectCost = parseFloat(safeTilingItemData.fixedProjectCost || safeUserDefaults.fixedProjectCost) || 0;
  const totalContractorCost = totalMaterialCost + totalLaborCost + fixedProjectCost;

  // Pricing Calculation
  const desiredProfitPercent = parseFloat(safeTilingItemData.desiredProfitPercent || safeUserDefaults.desiredProfitPercent) || 30;
  const profit = totalContractorCost * (desiredProfitPercent / 100);
  const totalPrice = totalContractorCost + profit;
  const pricePerMeter = quantity > 0 ? totalPrice / quantity : 0;

  return {
    totalPrice: totalPrice || 0,
    pricePerMeter: pricePerMeter || 0,
    totalContractorCost: totalContractorCost || 0,
    profit: profit || 0,
    profitPercent: desiredProfitPercent,
    totalMaterialCost: totalMaterialCost || 0,
    totalLaborCost: totalLaborCost || 0,
    totalWorkDays: totalWorkDays || 0,
    fixedProjectCost: fixedProjectCost || 0,
    baseLaborCost: baseLaborCost || 0, // Keep for complexity diff calculation
    baseWorkDays: baseWorkDays || 0, // Added to return base work days for complexity calculation
    costOfBlackMaterial: costOfBlackMaterial, // Return specifically for additionalCost
    // ✅ NEW: Separate metrics for regular tiling vs panel work
    quantityWorkDays: quantityWorkDays || 0,
    panelWorkDays: panelWorkDays || 0,
    quantityLaborCost: quantityLaborCost || 0,
    panelLaborCost: panelLaborCost || 0
  };
};

// Metric Card Component for Summary
const MetricCard = ({ title, value, footer, color, icon }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    default: 'bg-gray-50 border-gray-200 text-gray-800'
  };
  const selectedColor = colorClasses[color] || colorClasses.default;

  // Map string icon names to actual Lucide icons
  const IconComponent = useMemo(() => {
    switch (icon) {
      case 'client':
        return Users;
      case 'contractor':
      return TrendingDown;
      case 'profit':
        return TrendingUp;
      default:
        return null; // or a default icon if desired
    }
  }, [icon]);

  return (
    <div className={`p-4 rounded-lg border shadow-sm ${selectedColor}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-80">{title}</span>
        {IconComponent && <IconComponent className="w-5 h-5 opacity-50" />}
      </div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {footer && <div className="text-xs opacity-70 mt-2">{footer}</div>}
    </div>);

};

// Summary Card for Tiling Category
const TilingSummaryCard = ({ metrics, preciseWorkDays, setPreciseWorkDays, formatPrice }) => {
  if (!metrics) return null;

  return (
    <Card className="rounded-lg shadow-sm border-2 border-orange-300 bg-white">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
          <BarChart3 className="w-5 h-5 ml-2 text-orange-600" />
          סיכום קטגוריה
        </CardTitle>
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{metrics.totalQuantity.toFixed(1)}</span> סה"כ מ"ר
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            title="מחיר כולל ללקוח"
            value={`₪${formatPrice(metrics.totalPrice)}`}
            footer={`${formatPrice(metrics.pricePerMeter)} ₪ למ"ר`}
            color="blue"
            icon="client" />

          <MetricCard
            title="עלות כוללת לקבלן"
            value={`₪${formatPrice(metrics.totalContractorCost)}`}
            footer={`${formatPrice(metrics.costPerMeter)} ₪ למ"ר`}
            color="red"
            icon="contractor" />

          <MetricCard
            title="רווח כולל"
            value={`₪${formatPrice(metrics.profit)}`}
            footer={`${metrics.profitPercent.toFixed(1)}%`}
            color="green"
            icon="profit" />

        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-gray-50 rounded-lg shadow-sm">
            <div className="text-lg font-bold text-gray-800">₪{formatPrice(metrics.totalMaterialCost)}</div>
            <div className="text-xs text-gray-600">עלות חומרים</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg shadow-sm">
            <div className="text-lg font-bold text-gray-800">₪{formatPrice(metrics.totalLaborCost)}</div>
            <div className="text-xs text-gray-600">עלות עבודה</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg shadow-sm">
            <div className="text-lg font-bold text-gray-800">
              {/* Show precise when toggle is on, rounded when off */}
              {preciseWorkDays ? metrics.unroundedWorkDays.toFixed(1) : Math.ceil(metrics.unroundedWorkDays).toFixed(0)}
            </div>
            <div className="text-xs text-gray-600">ימי עבודה</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg shadow-sm">
            <div className="text-lg font-bold text-gray-800">{metrics.totalQuantity.toFixed(1)}</div>
            <div className="text-xs text-gray-600">סה"כ מ"ר</div>
          </div>
        </div>

        {/* Work Days Precision Toggle */}
        <div className="flex justify-center pt-4 border-t border-gray-200">
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
      </CardContent>
    </Card>);

};

// Define complexity options - 6 levels with 10% increments
const TILING_COMPLEXITY_OPTIONS = [
  { value: 'none', label: 'ללא מורכבות', multiplier: 0, description: 'עבודה רגילה ללא תוספות מחיר' },
  { value: 'light', label: 'מורכבות קלה', multiplier: 10, description: 'גישה מוגבלת, פינות קשות' },
  { value: 'medium', label: 'מורכבות בינונית', multiplier: 20, description: 'תקרות גבוהות, פרטי עיטור' },
  { value: 'high', label: 'מורכבות גבוהה', multiplier: 30, description: 'עבודה מעל ריהוט, חללים צרים' },
  { value: 'very_high', label: 'מורכבות גבוהה מאוד', multiplier: 40, description: 'תנאי עבודה קשים מאוד' },
  { value: 'extreme', label: 'מורכבות קיצונית', multiplier: 50, description: 'תנאי עבודה קשים במיוחד' }];


// Complexity component for individual items
const ProjectComplexity = ({ item, itemMetrics, complexityAddition, complexityWorkDaysIncrease, onUpdateComplexity, formatPrice }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Wrap currentComplexity in useMemo to prevent useCallback dependency issues
  const currentComplexity = useMemo(() => {
    return item.complexity?.level ? item.complexity : { level: 'none', description: '', multiplier: 0 };
  }, [item.complexity]);

  const handleLevelChange = useCallback((selectedOption) => {// Modified to accept the option object
    const newComplexity = {
      ...currentComplexity,
      level: selectedOption.value, // Extract value from the object
      multiplier: selectedOption.multiplier,
      description: selectedOption.description // Propagate description from selected option
    };
    onUpdateComplexity({ ...item, complexity: newComplexity });
  }, [currentComplexity, item, onUpdateComplexity]);

  const handleDescriptionChange = useCallback((description) => {
    const newComplexity = {
      ...currentComplexity,
      description: description
    };
    onUpdateComplexity({ ...item, complexity: newComplexity });
  }, [currentComplexity, item, onUpdateComplexity]);

  // Helper function to format work time increase for display
  const formatWorkTimeIncrease = (workDaysIncrease) => {
    if (workDaysIncrease <= 0) return "";

    const totalMinutes = Math.round(workDaysIncrease * 8 * 60); // Convert days to total minutes

    if (totalMinutes === 0) return ""; // Handle zero case

    const workDayInMinutes = 8 * 60; // 480 minutes

    if (totalMinutes >= workDayInMinutes) {// If total is 8 hours or more
      const fullDays = Math.floor(totalMinutes / workDayInMinutes);
      const remainingMinutesAfterFullDays = totalMinutes % workDayInMinutes;

      let resultParts = [];
      resultParts.push(`${fullDays} ימי עבודה`);

      const remainingHours = Math.floor(remainingMinutesAfterFullDays / 60);

      if (remainingHours > 0) {
        resultParts.push(`${remainingHours} שעות`);
      }

      return resultParts.join(' ו-');
    } else {// Less than one full day (less than 8 hours)
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4 w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex justify-between items-center bg-white hover:bg-yellow-50 p-3 rounded-lg border border-yellow-200">

          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-yellow-600" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="font-semibold text-yellow-800">מורכבות פרויקט</span>
              {complexityAddition > 0 && Math.abs(complexityAddition) > 0.01 || complexityWorkDaysIncrease > 0 ?
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {complexityAddition > 0 && Math.abs(complexityAddition) > 0.01 &&
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md border">
                      <span className="text-xs">💰</span>
                      <span className="font-medium">+{formatPrice(complexityAddition)} ₪</span>
                    </div>
                  }
                  {complexityWorkDaysIncrease > 0 &&
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md border">
                      <span className="text-xs">⏱️</span>
                      <span className="font-medium">+{formatWorkTimeIncrease(complexityWorkDaysIncrease)}</span>
                    </div>
                  }
                </div> :

                <span className="text-sm text-gray-500 italic">(אופציונלי)</span>
              }
            </div>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 border-t bg-yellow-50/50 rounded-b-lg">
        <div className="space-y-4">
          <div>
            <Label htmlFor={`complexity-level-${item.id}`} className="text-sm font-medium text-gray-700 mb-2 block">
              רמת מורכבות לריצוף/חיפוי
            </Label>
            <div className="flex flex-wrap gap-2">
              {TILING_COMPLEXITY_OPTIONS.map((level) =>
                <Button
                  key={level.value}
                  onClick={() => handleLevelChange(level)}
                  variant={currentComplexity?.level === level.value ? "default" : "outline"}
                  className={cn(
                    "flex-1 transition-all duration-200",
                    currentComplexity?.level === level.value ?
                      "bg-yellow-500 hover:bg-yellow-600 text-white shadow" :
                      "bg-white hover:bg-yellow-50"
                  )}>

                  {level.label}
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor={`complexity-desc-${item.id}`} className="text-sm font-medium text-gray-700 mb-2 block">
              תיאור נוסף:
            </Label>
            <Input
              id={`complexity-desc-${item.id}`}
              value={currentComplexity.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="הוסף תיאור ספציפי למורכבות הפרויקט..."
              className="w-full" />

          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>);

};

export default React.forwardRef(function TilingCategoryEditor({
  categoryId = "cat_tiling",
  onAddItemToQuote,
  selectedItems = [],
  onProceed,
  categoriesNav = [],
  currentCategoryId,
  onSelectCategory,
  categoryTimings = {},
  onCategoryTimingChange,
  tilingWorkTypes = [],
  userTilingItems = [],
  stagedManualItems = [],      // ✅ ADD: Manual items prop
  setStagedManualItems,         // ✅ ADD: Manual items setter
  initialRooms = [],            // ✅ ADD: For restoration
  existingCategoryData,         // ✅ ADD: Existing category data
  onUpdateCategoryData,         // ✅ NEW: Callback to update parent's categoryDataMap
  onRemoveItemFromQuote,        // 🆕 Function to remove items from cart when area is deleted
}, ref) {
  const [tilingItems, setTilingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localItems, setLocalItems] = useState([]);
  const [preciseWorkDays, setPreciseWorkDays] = useState(false); // Default to false (rounded work days)
  // State to track which breakdown sections are open
  const [openBreakdowns, setOpenBreakdowns] = useState({});

  const { user: ctxUser } = useUser();
  const userTilingDefaults = useMemo(() => ctxUser?.tilingUserDefaults || {}, [ctxUser]);

  // NEW: which catalog item is currently opened inline for add/edit
  const [activeItemIdForForm, setActiveItemIdForForm] = useState(null);
  const [showManualDialog, setShowManualDialog] = useState(false);

  // ✅ Restore localItems from initialRooms when returning to category
  const [hasInitializedFromProp, setHasInitializedFromProp] = useState(false);

  useEffect(() => {
    if (initialRooms && initialRooms.length > 0 && !hasInitializedFromProp) {
      console.log('[TilingCategoryEditor] Restoring items from initialRooms:', initialRooms.length);
      setLocalItems(initialRooms);
      setHasInitializedFromProp(true);
    }
  }, [initialRooms, hasInitializedFromProp]);

  // Helper: toggle inline editor below a specific available item
  const toggleInlineFormFor = useCallback((catalogItemId) => {
    setActiveItemIdForForm((prev) => prev === catalogItemId ? null : catalogItemId);
  }, []);

  // NEW: Memoize available work types from the prop, replacing previous derivation
  const availableWorkTypes = useMemo(() => {
    if (!Array.isArray(tilingWorkTypes)) return [];
    return tilingWorkTypes.sort();
  }, [tilingWorkTypes]);

  // This memo now holds all subcategories, filtering will be applied when rendering the Select component
  // MODIFIED: Include 'availableSizes' in the subCategory object for display in SelectItem
  const allSubCategories = useMemo(() => {
    return tilingItems.filter((item) => item.id && (item.tileName || item.itemName || item.name)).map((item) => ({
      id: item.id,
      name: item.tileName || item.itemName || item.name,
      tileName: item.tileName || item.itemName || item.name,
      generalDescription: item.generalDescription,
      workType: item.workType,
      availableSizes: item.availableSizes, // Include availableSizes from the catalog item
      // Pass all relevant size fields to getDisplayNameForCatalogItemOption
      selectedSizes: item.selectedSizes,
      tileSizes: item.tileSizes,
      size: item.size,
      tileSize: item.tileSize,
      dimensions: item.dimensions,
      itemSize: item.itemSize,
      tileFormat: item.tileFormat,
    }));
  }, [tilingItems]);

  useEffect(() => {
    setLoading(true);
    if (Array.isArray(userTilingItems)) {
        setTilingItems(userTilingItems.filter(item => item && item.id));
    } else {
        setTilingItems([]);
    }
    setLoading(false);
  }, [userTilingItems]);

  // Effect to log the structure of loaded tiling items for debugging/inspection
  useEffect(() => {
    if (tilingItems && tilingItems.length > 0) {
      console.log('=== מבנה פריטי ריצוף מהקטלוג (Tiling Items) ===');
      console.log('פריט ראשון:', tilingItems[0]);
      console.log('כל השדות בפריט הראשון:', Object.keys(tilingItems[0]));
    }
  }, [tilingItems]);

  useEffect(() => {
    if (tilingItems.length > 0) {
      const existingTilingItems = Array.isArray(selectedItems) ?
      selectedItems.filter((item) => item.categoryId === categoryId && item.itemType === 'tiling') :
      [];

      const initialLocalItems = existingTilingItems.length > 0 ?
      existingTilingItems.map((item) => {
        const catalogItem = tilingItems.find((cat) => cat.id === item.catalogItemId);
        // Find the complexity option to get the correct multiplier and description
        const matchedComplexityOption = TILING_COMPLEXITY_OPTIONS.find((opt) => opt.value === (item.complexityLevel || 'none'));

        const complexityData = {
          level: item.complexityLevel || 'none', // default to 'none' instead of empty string
          description: item.complexityDescription || matchedComplexityOption?.description || '',
          multiplier: item.complexityMultiplier || matchedComplexityOption?.multiplier || 0 // Ensure multiplier is correctly loaded
        };

        return {
          id: item.id, // Assuming roomId is the unique ID for this instance in the quote
          name: item.name, // Use item.name (roomName) from selectedItems
          subCategory: catalogItem ? catalogItem.tileName || catalogItem.itemName || catalogItem.name : '',
          selectedItemData: catalogItem,
          quantity: item.quantity,
          panelQuantity: item.panelQuantity || 0,
          manualPriceOverride: item.manualPriceOverride,
          manualCustomerPrice: item.manualCustomerPrice,
          complexity: complexityData,
          selectedSize: item.selectedSize || catalogItem?.availableSizes?.[0] || null, // Load existing size, or default to first available
          catalogItemId: item.catalogItemId, // Keep catalogItemId for comparison
          workType: item.workType || '', // NEW: Load workType
        };
      }) :
      [{
        id: `new_item_${Date.now()}`,
        name: `אזור 1`, // Default name for a new item
        subCategory: '',
        quantity: 0,
        panelQuantity: 0,
        manualPriceOverride: false,
        manualCustomerPrice: null,
        complexity: { level: 'none', description: TILING_COMPLEXITY_OPTIONS.find((opt) => opt.value === 'none')?.description || '', multiplier: 0 }, // default to 'none', multiplier is 0 for no complexity
        selectedSize: null,
        workType: '', // NEW: Initialize workType for new items
      }];

      setLocalItems(initialLocalItems);
    } else {
        // If tilingItems are not loaded yet, or if there are no existing selected items, start with a blank item
        if (selectedItems.length === 0 && localItems.length === 0) {
            setLocalItems([{
                id: `new_item_${Date.now()}`,
                name: `אזור 1`,
                subCategory: '',
                quantity: 0,
                panelQuantity: 0,
                manualPriceOverride: false,
                manualCustomerPrice: null,
                complexity: { level: 'none', description: TILING_COMPLEXITY_OPTIONS.find((opt) => opt.value === 'none')?.description || '', multiplier: 0 },
                selectedSize: null,
                workType: '',
            }]);
        }
    }
  }, [categoryId, selectedItems, tilingItems]);


  const handleAddItem = useCallback(() => {
    setLocalItems((prev) => [...prev, {
      id: `new_item_${Date.now()}`,
      name: `אזור ${prev.length + 1}`,
      subCategory: '',
      quantity: 0,
      panelQuantity: 0,
      manualPriceOverride: false,
      manualCustomerPrice: null,
      complexity: { level: 'none', description: TILING_COMPLEXITY_OPTIONS.find((opt) => opt.value === 'none')?.description || '', multiplier: 0 }, // default to 'none', multiplier is 0 for no complexity
      selectedSize: null,
      workType: '', // NEW: Initialize workType for manually added items
    }]);
  }, []);

  // Helper: adds an item from the inline form to localItems
  const handleAddItemFromInlineForm = useCallback((catalogItemId, values) => {
    const selectedCatalogItem = tilingItems.find((cat) => cat.id === catalogItemId);
    if (!selectedCatalogItem) return;

    // Map values.complexity from TilingInlineItemForm to internal complexity structure
    const complexityData = values.complexity || { level: 'none', description: TILING_COMPLEXITY_OPTIONS.find((opt) => opt.value === 'none')?.description || '', multiplier: 0 };

    const newItem = {
      id: `new_item_${Date.now()}_inline`, // Differentiate from manual add for unique ID
      catalogItemId: selectedCatalogItem.id,
      name: values.name || selectedCatalogItem.tileName || selectedCatalogItem.itemName || selectedCatalogItem.name,
      subCategory: selectedCatalogItem.tileName || selectedCatalogItem.itemName || selectedCatalogItem.name,
      selectedItemData: selectedCatalogItem,
      quantity: Number(values.quantity) || 0,
      panelQuantity: Number(values.panelQuantity) || 0,
      manualPriceOverride: false,
      manualCustomerPrice: null,
      complexity: complexityData,
      selectedSize: values.selectedSize || selectedCatalogItem.availableSizes?.[0] || null,
      workType: values.workType || (Array.isArray(selectedCatalogItem.workType) ? selectedCatalogItem.workType[0] : selectedCatalogItem.workType) || '', // NEW: Capture workType from inline form if available, or catalog, or default
    };

    setLocalItems((prev) => {
      // Check if an item for this catalogId and selectedSize already exists, if so, update its quantity
      const existingItemIndex = prev.findIndex((item) =>
      item.catalogItemId === catalogItemId && item.selectedSize === newItem.selectedSize && item.workType === newItem.workType // Added workType for uniqueness
      );

      if (existingItemIndex > -1) {
        const updatedPrev = [...prev];
        updatedPrev[existingItemIndex] = {
          ...updatedPrev[existingItemIndex],
          quantity: (updatedPrev[existingItemIndex].quantity || 0) + newItem.quantity,
          panelQuantity: (updatedPrev[existingItemIndex].panelQuantity || 0) + newItem.panelQuantity
        };
        return updatedPrev;
      }
      return [...prev, newItem];
    });

    setActiveItemIdForForm(null); // Close the form after saving
  }, [tilingItems, setLocalItems]);

  // Helper: when saving from inline mini-form
  const handleInlineSave = useCallback((catalogItemId, values) => {
    handleAddItemFromInlineForm(catalogItemId, values);
  }, [handleAddItemFromInlineForm]);

  // Helper: cancel inline edit
  const handleInlineCancel = useCallback(() => setActiveItemIdForForm(null), []);

  const handleAddItemToLocalItems = useCallback((itemData) => {
    setLocalItems((prev) => [...prev, itemData]);
  }, []);

  const handleAddManualItem = useCallback((manualItemValues) => {
    // Construct an item object from manual inputs
    const newManualItem = {
      id: `manual_item_${Date.now()}`,
      name: manualItemValues.name || 'פריט ידני',
      subCategory: 'פריט מותאם אישית', // Descriptive text for manual items
      selectedItemData: { // Minimal catalog data for manual items to allow calculations
        id: `manual_catalog_${Date.now()}`,
        name: manualItemValues.name || 'פריט מותאם אישית',
        tileName: manualItemValues.name || 'פריט מותאם אישית',
        materialCost: manualItemValues.materialCost || 0, // Manual material cost
        additionalCost: manualItemValues.additionalCost || 0, // Manual additional material cost
        laborCostPerDay: manualItemValues.laborCostPerDay || 0, // Manual labor cost
        dailyOutput: manualItemValues.dailyOutput || 1, // Manual daily output
        wastagePercent: manualItemValues.wastagePercent || 0,
        desiredProfitPercent: manualItemValues.desiredProfitPercent || 0,
        fixedProjectCost: manualItemValues.fixedProjectCost || 0,
      },
      quantity: Number(manualItemValues.quantity) || 0,
      panelQuantity: Number(manualItemValues.panelQuantity) || 0, // Assuming manual items can have panel quantity
      manualPriceOverride: false, // Manual items are inherently 'manual' in their inputs
      manualCustomerPrice: null,
      complexity: { level: 'none', description: '', multiplier: 0 }, // Default complexity for manual items
      selectedSize: manualItemValues.selectedSize || null,
      workType: manualItemValues.workType || '',
    };

    handleAddItemToLocalItems(newManualItem);
    setShowManualDialog(false);
  }, [handleAddItemToLocalItems]);

  const handleItemUpdate = useCallback((itemId, field, value) => {
    setLocalItems((prevItems) => prevItems.map((item) => {
      if (item.id === itemId) {
        let updatedItem = { ...item, [field]: value };

        // NEW: If workType changes, clear related fields as the available subcategories might change
        if (field === 'workType') {
            updatedItem.subCategory = '';
            updatedItem.selectedItemData = null;
            updatedItem.catalogItemId = null;
            updatedItem.selectedSize = null;
        }

        if (field === 'subCategory') {
          const selectedCatalogItem = tilingItems.find((cat) => (cat.tileName || cat.name) === value);
          updatedItem.selectedItemData = selectedCatalogItem || null;
          updatedItem.catalogItemId = selectedCatalogItem?.id || null; // Update catalogItemId
          if (selectedCatalogItem && !selectedCatalogItem.hasPanel) {
            updatedItem.panelQuantity = 0;
          }
          // Handle selectedSize when subCategory changes
          if (selectedCatalogItem && selectedCatalogItem.availableSizes && selectedCatalogItem.availableSizes.length > 0) {
            // If the current selected size is not valid for the new item, reset it
            if (!selectedCatalogItem.availableSizes.includes(updatedItem.selectedSize)) {
              updatedItem.selectedSize = selectedCatalogItem.availableSizes[0]; // Default to first available size
            }
          } else {
            updatedItem.selectedSize = null; // No sizes for this item
          }
          // NEW: If subCategory is selected and item's workType is empty, populate it from the catalog item's workType
          // This ensures that if a user picks a tile, its workType is automatically set if not already chosen.
          if (selectedCatalogItem && selectedCatalogItem.workType && !updatedItem.workType) {
              updatedItem.workType = Array.isArray(selectedCatalogItem.workType) ? selectedCatalogItem.workType[0] : selectedCatalogItem.workType;
          }
        }

        if (field === 'quantity' || field === 'panelQuantity' || field === 'subCategory' || field === 'selectedSize' || field === 'workType') { // NEW: Include workType change in reset
          updatedItem.manualPriceOverride = false;
          updatedItem.manualCustomerPrice = null;
        }

        return updatedItem;
      }
      return item;
    }));
  }, [tilingItems]);

  const handleRemoveItem = useCallback((itemId) => {
    console.log(`🗑️ [TilingCategoryEditor] handleRemoveItem called for: ${itemId}`);

    // Remove from local state
    setLocalItems((prev) => {
      if (prev.length === 1 && prev[0].id === itemId) {
        // If only one item left and it's being removed, reset to a blank item
        return [{
          id: `new_item_${Date.now()}`,
          name: `אזור 1`, // Default name for a new item
          subCategory: '',
          quantity: 0,
          panelQuantity: 0,
          manualPriceOverride: false,
          manualCustomerPrice: null,
          complexity: { level: 'none', description: TILING_COMPLEXITY_OPTIONS.find((opt) => opt.value === 'none')?.description || '', multiplier: 0 },
          selectedSize: null,
          workType: '', // NEW: Reset workType
        }];
      }
      return prev.filter((item) => item.id !== itemId);
    });

    // ✅ FIX: Remove associated items from cart immediately using all possible ID variants
    // Don't rely on selectedItems prop as it might be stale - let the parent handle the filtering
    if (onRemoveItemFromQuote) {
      console.log(`🗑️ [TilingCategoryEditor] Requesting removal from cart for itemId: ${itemId}`);

      // Try all possible ID transformations that might exist in the cart
      const possibleIds = [
        itemId,                    // Original ID
        `${itemId}_tiling`,       // Transformed ID for regular tiling
        `${itemId}_panel`,        // Transformed ID for panel
      ];

      possibleIds.forEach(id => {
        console.log(`  🗑️ Attempting to remove ID: ${id}`);
        onRemoveItemFromQuote(id);
      });
    }
  }, [onRemoveItemFromQuote, categoryId]);

  const toggleBreakdown = useCallback((itemId) => {
    setOpenBreakdowns((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  }, []);

  const calculatedItemsMetrics = useMemo(() => {
    // userTilingDefaults is now used here
    const safeUserDefaults = userTilingDefaults;

    return localItems.map((item) => {
      const selectedCatalogItem = item.selectedItemData;
      const quantity = parseFloat(item.quantity) || 0;
      const panelQuantity = parseFloat(item.panelQuantity || 0);

      // If no catalog item or no quantity, return zeroed metrics
      if (!selectedCatalogItem || (quantity <= 0 && panelQuantity <= 0)) {
        return {
          finalMetrics: {
            totalPrice: 0, totalContractorCost: 0, totalLaborCost: 0, workDays: 0, profit: 0, totalArea: 0, totalMaterialCost: 0, totalFixedCost: 0, costOfBlackMaterial: 0
          },
          complexity: { laborCostIncrease: 0, workDaysIncrease: 0, description: item.complexity?.description || '' }
        };
      }

      // Use the new comprehensive calculateTilingMetrics
      const calculatedResult = calculateTilingMetrics(item, selectedCatalogItem, safeUserDefaults);

      // Map the results from the new calculation to the expected `finalMetrics` structure
      let finalMetrics = {
        totalPrice: calculatedResult.totalPrice,
        totalContractorCost: calculatedResult.totalContractorCost,
        totalLaborCost: calculatedResult.totalLaborCost,
        workDays: calculatedResult.totalWorkDays,
        profit: calculatedResult.profit,
        totalArea: quantity, // totalArea is quantity only, as per pricePerMeter calculation
        totalMaterialCost: calculatedResult.totalMaterialCost,
        totalFixedCost: calculatedResult.fixedProjectCost,
        costOfBlackMaterial: calculatedResult.costOfBlackMaterial,
        // ✅ NEW: Include separate metrics for display
        quantityWorkDays: calculatedResult.quantityWorkDays,
        panelWorkDays: calculatedResult.panelWorkDays,
        quantityLaborCost: calculatedResult.quantityLaborCost,
        panelLaborCost: calculatedResult.panelLaborCost,
        panelArea: panelQuantity
      };

      // Calculate complexity addition based on the difference between total labor cost and base labor cost
      const complexityLaborCostIncrease = calculatedResult.totalLaborCost - calculatedResult.baseLaborCost;
      const complexityWorkDaysIncrease = calculatedResult.totalWorkDays - calculatedResult.baseWorkDays;

      // Apply manual price override if set
      if (item.manualPriceOverride && typeof item.manualCustomerPrice === 'number') {
        finalMetrics.totalPrice = item.manualCustomerPrice;
        // Recalculate profit based on new total price and original contractor cost
        finalMetrics.profit = finalMetrics.totalPrice - finalMetrics.totalContractorCost;
      }

      return {
        finalMetrics: finalMetrics,
        complexity: {
          laborCostIncrease: complexityLaborCostIncrease,
          workDaysIncrease: complexityWorkDaysIncrease,
          description: item.complexity?.description || ''
        }
      };
    });
  }, [localItems, userTilingDefaults]); // Added userTilingDefaults dependency

  const currentCategorySummaryMetrics = useMemo(() => {
    let totalQuantity = 0; // Renamed from totalArea
    let totalWorkDaysUnrounded = 0; // Store the raw sum
    let totalMaterialCost = 0;
    let totalLaborCostUnadjusted = 0; // Store raw labor cost
    let totalContractorCostUnadjusted = 0; // Store raw contractor cost
    let totalCustomerPriceUnadjusted = 0; // Store raw customer price
    let totalProfitUnadjusted = 0;

    calculatedItemsMetrics.forEach((metrics) => {
      const { finalMetrics } = metrics;
      if (!finalMetrics) return;

      totalQuantity += finalMetrics.totalArea;
      totalWorkDaysUnrounded += finalMetrics.workDays;
      totalMaterialCost += finalMetrics.totalMaterialCost;
      totalLaborCostUnadjusted += finalMetrics.totalLaborCost;
      totalContractorCostUnadjusted += finalMetrics.totalContractorCost;
      totalCustomerPriceUnadjusted += finalMetrics.totalPrice;
      totalProfitUnadjusted += finalMetrics.profit; // Corrected: Use finalMetrics.profit directly
    });

    // Determine final work days and costs based on `preciseWorkDays` toggle
    let finalWorkDays;
    let finalLaborCost;
    let finalContractorCost;
    let finalCustomerPrice;
    let finalProfit;

    if (preciseWorkDays) {// User wants precise (unrounded) work days
      finalWorkDays = totalWorkDaysUnrounded;
      finalLaborCost = totalLaborCostUnadjusted;
      finalContractorCost = totalContractorCostUnadjusted;
      finalCustomerPrice = totalCustomerPriceUnadjusted;
      finalProfit = totalProfitUnadjusted;
    } else {// User wants rounded work days (default)
      finalWorkDays = Math.ceil(totalWorkDaysUnrounded);

      // Calculate day rate based on unadjusted totals for consistency
      const dayRate = totalWorkDaysUnrounded > 0 ? totalLaborCostUnadjusted / totalWorkDaysUnrounded : 0;
      finalLaborCost = finalWorkDays * dayRate;

      // Adjust contractor cost and customer price to maintain profit ratio
      // Only adjust if there's actually a change in labor cost due to rounding
      const laborCostDifference = finalLaborCost - totalLaborCostUnadjusted;
      if (Math.abs(laborCostDifference) > 0.01) { // Check for meaningful difference
        finalContractorCost = totalContractorCostUnadjusted + laborCostDifference;
        // Recalculate profit based on adjusted contractor cost and previous profit ratio
        const initialProfitRatio = totalContractorCostUnadjusted > 0 ? totalProfitUnadjusted / totalContractorCostUnadjusted * 100 : 0;
        finalProfit = finalContractorCost * (initialProfitRatio / 100);
        finalCustomerPrice = finalContractorCost + finalProfit;
      } else {
        finalContractorCost = totalContractorCostUnadjusted;
        finalCustomerPrice = totalCustomerPriceUnadjusted;
        finalProfit = totalProfitUnadjusted;
      }
    }

    return {
      totalQuantity: totalQuantity,
      totalLaborDays: finalWorkDays,
      unroundedWorkDays: totalWorkDaysUnrounded, // Always return unrounded for display
      totalMaterialCost: totalMaterialCost,
      totalLaborCost: finalLaborCost,
      totalContractorCost: finalContractorCost,
      totalPrice: finalCustomerPrice,
      profit: finalProfit,
      pricePerMeter: totalQuantity > 0 ? finalCustomerPrice / totalQuantity : 0,
      costPerMeter: totalQuantity > 0 ? finalContractorCost / totalQuantity : 0,
      profitPercent: finalContractorCost > 0 ? finalProfit / finalContractorCost * 100 : finalCustomerPrice > 0 ? 100 : 0
    };
  }, [calculatedItemsMetrics, preciseWorkDays]);

  // שלב 1: פונקציה חדשה לאיסוף נתונים מפורטים עם לוגים
  const saveData = useCallback(() => {
    console.log("🔥 TilingCategoryEditor: Entering saveData function.");
    console.log("📊 TilingCategoryEditor: localItems (raw data from form):", localItems);
    console.log("📈 TilingCategoryEditor: currentCategorySummaryMetrics (aggregated totals):", currentCategorySummaryMetrics);

    // הכנת נתונים למשלוח - נמיר כל פריט ב-localItems למבנה המתאים ל-selectedItems
    // ✅ NEW: When an item has both quantity AND panelQuantity, split it into 2 separate quote items
    const processedItemsForQuote = [];

    localItems.forEach((item, index) => {
      const itemMetrics = calculatedItemsMetrics[index]?.finalMetrics;
      const complexityData = calculatedItemsMetrics[index]?.complexity;

      // Default values for metrics if itemMetrics is not available (e.g., quantity is 0)
      const defaultMetrics = {
        totalPrice: 0,
        totalContractorCost: 0,
        profit: 0,
        totalMaterialCost: 0,
        totalLaborCost: 0,
        workDays: 0,
        costOfBlackMaterial: 0,
        quantityWorkDays: 0,
        panelWorkDays: 0,
        quantityLaborCost: 0,
        panelLaborCost: 0
      };

      const metrics = itemMetrics || defaultMetrics;
      const hasRegularTiling = Number(item.quantity) > 0;
      const hasPanel = Number(item.panelQuantity) > 0;

      // ✅ Calculate proportional split of costs if both exist
      const totalWorkDays = (metrics.quantityWorkDays || 0) + (metrics.panelWorkDays || 0);
      const totalLaborCost = (metrics.quantityLaborCost || 0) + (metrics.panelLaborCost || 0);

      // Material cost and complexity are split proportionally to labor
      const tilingLaborRatio = totalLaborCost > 0 ? (metrics.quantityLaborCost || 0) / totalLaborCost : 0.5;
      const panelLaborRatio = totalLaborCost > 0 ? (metrics.panelLaborCost || 0) / totalLaborCost : 0.5;

      // Split material cost proportionally
      const tilingMaterialCost = metrics.totalMaterialCost * tilingLaborRatio;
      const panelMaterialCost = metrics.totalMaterialCost * panelLaborRatio;

      // Split complexity cost proportionally
      const tilingComplexityCost = (complexityData?.laborCostIncrease || 0) * tilingLaborRatio;
      const panelComplexityCost = (complexityData?.laborCostIncrease || 0) * panelLaborRatio;

      // Calculate total costs for each
      const tilingTotalCost = tilingMaterialCost + (metrics.quantityLaborCost || 0) + tilingComplexityCost;
      const panelTotalCost = panelMaterialCost + (metrics.panelLaborCost || 0) + panelComplexityCost;

      // Calculate prices with same profit margin
      const profitPercent = metrics.totalContractorCost > 0 ? (metrics.profit / metrics.totalContractorCost) : 0.3;
      const tilingProfit = tilingTotalCost * profitPercent;
      const panelProfit = panelTotalCost * profitPercent;
      const tilingTotalPrice = tilingTotalCost + tilingProfit;
      const panelTotalPrice = panelTotalCost + panelProfit;

      // ✅ CREATE REGULAR TILING ITEM (if quantity > 0)
      if (hasRegularTiling) {
        const tilingItem = {
          id: hasPanel ? `${item.id}_tiling` : item.id, // Add suffix if split
          catalogItemId: item.selectedItemData?.id || null,
          categoryId: categoryId,
          categoryName: 'ריצוף וחיפוי',
          name: hasPanel ? `${item.name} - ריצוף` : item.name,
          description: `סוג: ${formatItemNameWithSize(item)}${item.selectedItemData?.generalDescription ? `, ${item.selectedItemData.generalDescription}` : ''}`,
          quantity: Number(item.quantity),
          unit: item.selectedItemData?.unit || 'מ"ר',
          unitPrice: hasPanel ? (tilingTotalPrice / Number(item.quantity)) : (metrics.totalPrice > 0 && Number(item.quantity) > 0 ? metrics.totalPrice / Number(item.quantity) : 0),
          totalPrice: hasPanel ? tilingTotalPrice : metrics.totalPrice,
          totalCost: hasPanel ? tilingTotalCost : metrics.totalContractorCost,
          profit: hasPanel ? tilingProfit : metrics.profit,
          profitPercent: hasPanel ? (tilingTotalCost > 0 ? tilingProfit / tilingTotalCost * 100 : 0) : (metrics.totalContractorCost > 0 ? metrics.profit / metrics.totalContractorCost * 100 : 0),
          workDuration: metrics.quantityWorkDays || 0,
          quality: item.selectedItemData?.quality || '',
          complexityLevel: item.complexity?.level || 'none',
          complexityDescription: item.complexity?.description || '',
          complexityAddedCost: hasPanel ? tilingComplexityCost : (complexityData?.laborCostIncrease || 0),
          materialCost: hasPanel ? tilingMaterialCost : metrics.totalMaterialCost,
          laborCost: metrics.quantityLaborCost || 0,
          additionalCost: hasPanel ? (metrics.costOfBlackMaterial * tilingLaborRatio) : metrics.costOfBlackMaterial,
          quantityWorkDays: metrics.quantityWorkDays || 0,
          panelWorkDays: 0, // No panel in this item
          quantityLaborCost: metrics.quantityLaborCost || 0,
          panelLaborCost: 0, // No panel in this item
          panelQuantity: 0, // No panel in this item
          itemType: 'tiling',
          source: 'tiling_area_detail', // ✅ FIX: Add source field for cart item identification
          isFromSimulator: false,
          addedAt: new Date().toISOString(),
          manualPriceOverride: item.manualPriceOverride || false,
          manualCustomerPrice: item.manualCustomerPrice || null,
          selectedSize: item.selectedSize || null,
          workType: item.workType || '',
        };
        processedItemsForQuote.push(tilingItem);
      }

      // ✅ CREATE PANEL ITEM (if panelQuantity > 0)
      if (hasPanel) {
        const panelItem = {
          id: `${item.id}_panel`,
          catalogItemId: item.selectedItemData?.id || null,
          categoryId: categoryId,
          categoryName: 'ריצוף וחיפוי',
          name: `${item.name} - פאנל`,
          description: `פאנל - ${formatItemNameWithSize(item)}${item.selectedItemData?.generalDescription ? `, ${item.selectedItemData.generalDescription}` : ''}`,
          quantity: Number(item.panelQuantity),
          unit: 'מ"ר',
          unitPrice: panelTotalPrice / Number(item.panelQuantity),
          totalPrice: panelTotalPrice,
          totalCost: panelTotalCost,
          profit: panelProfit,
          profitPercent: panelTotalCost > 0 ? panelProfit / panelTotalCost * 100 : 0,
          workDuration: metrics.panelWorkDays || 0,
          quality: item.selectedItemData?.quality || '',
          complexityLevel: item.complexity?.level || 'none',
          complexityDescription: item.complexity?.description || '',
          complexityAddedCost: panelComplexityCost,
          materialCost: panelMaterialCost,
          laborCost: metrics.panelLaborCost || 0,
          additionalCost: hasRegularTiling ? (metrics.costOfBlackMaterial * panelLaborRatio) : metrics.costOfBlackMaterial,
          quantityWorkDays: 0, // No regular tiling in this item
          panelWorkDays: metrics.panelWorkDays || 0,
          quantityLaborCost: 0, // No regular tiling in this item
          panelLaborCost: metrics.panelLaborCost || 0,
          panelQuantity: Number(item.panelQuantity),
          itemType: 'tiling',
          source: 'tiling_area_detail', // ✅ FIX: Add source field for cart item identification
          isFromSimulator: false,
          addedAt: new Date().toISOString(),
          manualPriceOverride: false, // Panel is auto-calculated
          manualCustomerPrice: null,
          selectedSize: item.selectedSize || null,
          workType: item.workType || '',
        };
        processedItemsForQuote.push(panelItem);
      }

      console.log(`🔧 TilingCategoryEditor: Processing item ${index + 1}:`, {
        originalItem: item,
        hasRegularTiling,
        hasPanel,
        splitIntoTwoItems: hasRegularTiling && hasPanel,
        itemMetrics: itemMetrics,
        complexityData: complexityData
      });
    });

    console.log("✅ TilingCategoryEditor: Processed items ready for selectedItems:", processedItemsForQuote);
    console.log("📝 TilingCategoryEditor: Total items processed:", processedItemsForQuote.length);

    // ✅ Return object with both quoteItems and rawRooms for restoration
    return {
      quoteItems: processedItemsForQuote,
      rawRooms: localItems
    };
  }, [localItems, calculatedItemsMetrics, currentCategorySummaryMetrics, categoryId]);

  // ✅ NEW: Live update parent's categoryDataMap whenever localItems or metrics change
  useEffect(() => {
    if (onUpdateCategoryData && typeof onUpdateCategoryData === 'function') {
      const data = saveData();
      onUpdateCategoryData({
        categoryId: categoryId,
        quoteItems: data.quoteItems,
        rooms: data.rawRooms
      });
    }
  }, [localItems, calculatedItemsMetrics, onUpdateCategoryData, saveData, categoryId]);

  // For proper ref exposure, this component needs to be wrapped with React.forwardRef.
  useImperativeHandle(ref, () => ({
    saveData
  }));

  const handleProceedClick = useCallback(() => {
    const itemsToSave = saveData();

    // The 'onProceed' function is expected to handle saving these items to the quote,
    // and then navigating to the next step.
    if (onProceed) {
      onProceed(itemsToSave, categoryId);
    }
  }, [saveData, onProceed, categoryId]);


  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Section for adding new items from the catalog */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-600" /> הוסף פריט חדש מהקטלוג
            </h2>
            <div className="space-y-4">
              {tilingItems.length === 0 && !loading &&
                <p className="text-gray-500 text-center">אין פריטי ריצוף זמינים בקטלוג.</p>
              }
              {/* This map displays all available catalog items for quick add. No workType filtering here. */}
              {tilingItems.map((availableItem) =>
                <div key={availableItem.id} className="mb-4 p-4 border rounded-lg bg-gray-50 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {getDisplayNameForCatalogItemOption(availableItem)} {/* Use the new helper for catalog item display */}
                      </h3>
                      {availableItem.generalDescription &&
                        <p className="text-sm text-gray-600">{availableItem.generalDescription}</p>
                      }
                      {availableItem.materialCost &&
                        <p className="text-xs text-gray-500">עלות חומר למ"ר: ₪{formatPrice(availableItem.materialCost)}</p>
                      }
                      {/* NEW: Display work type for available catalog item */}
                      {availableItem.workType &&
                        <p className="text-xs text-gray-500">
                          סוג עבודה: {Array.isArray(availableItem.workType) ? availableItem.workType.join(', ') : availableItem.workType}
                        </p>
                      }
                    </div>
                    <Button
                      onClick={() => toggleInlineFormFor(availableItem.id)}
                      variant="outline"
                      className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200">

                      <Plus className="w-4 h-4 ml-2" />
                      הוסף
                    </Button>
                  </div>

                  {activeItemIdForForm === availableItem.id &&
                    <div className="mt-3 p-4 bg-white border border-gray-200 rounded-md">
                      <TilingInlineItemForm
                        catalogItem={availableItem}
                        onSave={handleInlineSave}
                        onCancel={handleInlineCancel}
                        TILING_COMPLEXITY_OPTIONS={TILING_COMPLEXITY_OPTIONS}
                        // NEW: Pass available work types to the inline form if it needs to display/select
                        availableWorkTypes={availableWorkTypes}
                      />

                    </div>
                  }
                </div>
              )}
            </div>
          </div>

          {/* Section for currently added/selected items */}
          <Separator className="my-8" />
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Edit className="w-5 h-5 text-indigo-600" /> פריטי ריצוף/חיפוי בפרויקט
          </h2>

          <div className="space-y-4">
            {localItems.map((item, index) => {
              const fullCalculatedItemMetrics = calculatedItemsMetrics[index];
              const itemMetrics = fullCalculatedItemMetrics?.finalMetrics;
              const isDetailBreakdownOpen = openBreakdowns[item.id] || false;

              // Calculate complexity addition for this item using the pre-calculated value
              const complexityLaborCostIncrease = fullCalculatedItemMetrics?.complexity?.laborCostIncrease || 0;
              const complexityWorkDaysIncrease = fullCalculatedItemMetrics?.complexity?.workDaysIncrease || 0;

              // Filter subcategories based on selected workType for THIS item
              const filteredSubCategories = allSubCategories.filter(sub => {
                if (!item.workType || item.workType === '') return true; // If no work type selected for this item, show all
                if (Array.isArray(sub.workType)) {
                  return sub.workType.includes(item.workType);
                }
                return sub.workType === item.workType;
              });

              return (
                <Card key={item.id} className="p-4 border-2 border-orange-200 bg-orange-50/30">
                  <div className="flex justify-between items-center mb-4">
                    <Input
                      value={item.name || ''}
                      onChange={(e) => handleItemUpdate(item.id, 'name', e.target.value)}
                      className="text-md font-semibold border-0 focus:ring-0 p-0 w-auto bg-transparent"
                      placeholder={`אזור ${index + 1}`} />

                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* NEW: Work Type Select */}
                    <div className="space-y-1">
                      <Label htmlFor={`workType-${item.id}`}>סוג עבודה</Label>
                      <Select
                        value={item.workType || ''} // Handle null/undefined by defaulting to empty string
                        onValueChange={(value) => handleItemUpdate(item.id, 'workType', value)}>

                        <SelectTrigger className="border-2 border-gray-300" dir="rtl">
                          <SelectValue placeholder="בחר סוג עבודה (אופציונלי)">
                            {item.workType || "בחר סוג עבודה (אופציונלי)"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value={null}>הצג הכל</SelectItem> {/* Option to clear filter */}
                          {availableWorkTypes.map(wt => (
                            <SelectItem key={wt} value={wt}>
                              {wt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`subCategory-${item.id}`}>בחר סוג ריצוף</Label>
                      <Select
                        value={item.subCategory || ''}
                        onValueChange={(value) => handleItemUpdate(item.id, 'subCategory', value)}>

                        <SelectTrigger className={cn('border-2', !item.subCategory ? 'border-red-300' : 'border-green-300')}  dir="rtl">
                          <SelectValue placeholder="בחר פריט מהמחירון...">
                            {item.selectedItemData ? formatItemNameWithSize(item) : "בחר פריט מהמחירון..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {filteredSubCategories.length === 0 ? (
                              <SelectItem value="__empty__" disabled>
                                {item.workType ? `אין פריטים עבור ${item.workType}` : 'אין פריטים זמינים'}
                              </SelectItem>
                            ) : (
                              filteredSubCategories.map((sub) =>
                                <SelectItem key={sub.id} value={sub.name}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {getDisplayNameForCatalogItemOption(sub)} {/* Using the new helper here */}
                                    </span>
                                    {sub.generalDescription && <span className="text-xs text-gray-500">{sub.generalDescription}</span>}
                                  </div>
                                </SelectItem>
                              )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Size Selection */}
                    {item.selectedItemData && item.selectedItemData.availableSizes && item.selectedItemData.availableSizes.length > 0 &&
                      <div className="space-y-1">
                        <Label htmlFor={`tile-size-${item.id}`}>גודל אריח</Label>
                        <div className="flex flex-wrap gap-2">
                          {item.selectedItemData.availableSizes.map((size) =>
                            <button
                              key={size}
                              type="button"
                              onClick={() => handleItemUpdate(item.id, 'selectedSize', size)}
                              className={cn(
                                "px-3 py-2 text-xs font-medium rounded-md border transition-all duration-200",
                                item.selectedSize === size ?
                                  "bg-indigo-100 border-indigo-300 text-indigo-800" :
                                  "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                              )}>

                              {size}
                            </button>
                          )}
                        </div>
                      </div>
                    }

                    <div className="space-y-1">
                      <Label htmlFor={`quantity-${item.id}`}>כמות (מ"ר)</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        value={item.quantity === 0 ? '' : item.quantity || ''}
                        onChange={(e) => handleItemUpdate(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="לדוגמה: 50"
                        className={cn('border-2', (!item.quantity || Number(item.quantity) <= 0) && (!item.panelQuantity || Number(item.panelQuantity) <= 0) ? 'border-red-300' : 'border-green-300')} // Validation for quantity or panelQuantity
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`panelQuantity-${item.id}`}>פאנל (מ"ר)</Label>
                      <Input
                        id={`panelQuantity-${item.id}`}
                        type="number"
                        value={item.panelQuantity === 0 ? '' : item.panelQuantity || ''}
                        onChange={(e) => handleItemUpdate(item.id, 'panelQuantity', parseFloat(e.target.value) || 0)}
                        placeholder="אופציונלי"
                        className="border-2 border-gray-300"
                        disabled={!item.selectedItemData?.hasPanel} />

                    </div>
                  </div>

                  {/* Individual Item Summary - always display, itemMetrics will be zeroed if quantities are zero or no item selected */}
                  {itemMetrics &&
                    <div className="mt-4 space-y-3">

                      {/* Top Summary Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg text-center shadow-sm border border-blue-200">
                          <Label className="text-xs text-blue-800">מחיר ללקוח</Label>
                          <p className="font-bold text-blue-600 text-lg">₪{formatPrice(itemMetrics.totalPrice)}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg text-center shadow-sm border border-red-200">
                          <Label className="text-xs text-red-800">עלות לקבלן</Label>
                          <p className="font-bold text-red-600 text-lg">₪{formatPrice(itemMetrics.totalContractorCost)}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg text-center shadow-sm border border-green-200">
                          <Label className="text-xs text-green-800">רווח</Label>
                          <p className="font-bold text-green-600 text-lg">₪{formatPrice(itemMetrics.profit)}</p>
                        </div>
                      </div>

                      {/* Collapsible Breakdown */}
                      <Collapsible open={isDetailBreakdownOpen} onOpenChange={() => toggleBreakdown(item.id)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full flex justify-between items-center bg-gray-100/70 hover:bg-gray-200/70 p-2 rounded-lg">
                            <span className="font-semibold text-gray-700">פירוט עלויות לאזור</span>
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-gray-500" />
                              {isDetailBreakdownOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-3 pt-2">
                            {/* Price Display for User - Moved Inside Breakdown */}
                            {(item.panelQuantity > 0 || item.quantity > 0) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Regular Tiling Price */}
                                {item.quantity > 0 && (
                                  <div className="p-3 bg-gray-100 rounded-lg text-center shadow-sm border border-gray-200">
                                    <Label className="text-xs text-gray-500">מחיר ריצוף</Label>
                                    <p className="font-bold text-black text-base">₪{formatPrice(
                                      item.panelQuantity > 0
                                        ? (itemMetrics.totalPrice * (itemMetrics.quantityLaborCost / (itemMetrics.quantityLaborCost + itemMetrics.panelLaborCost)))
                                        : itemMetrics.totalPrice
                                    )}</p>
                                    <span className="text-xs text-gray-400">{itemMetrics.totalArea.toFixed(1)} מ"ר</span>
                                  </div>
                                )}

                                {/* Panel Price */}
                                {item.panelQuantity > 0 && (
                                  <div className="p-3 bg-gray-100 rounded-lg text-center shadow-sm border border-gray-200">
                                    <Label className="text-xs text-gray-500">מחיר פאנל</Label>
                                    <p className="font-bold text-black text-base">₪{formatPrice(
                                      item.quantity > 0
                                        ? (itemMetrics.totalPrice * (itemMetrics.panelLaborCost / (itemMetrics.quantityLaborCost + itemMetrics.panelLaborCost)))
                                        : itemMetrics.totalPrice
                                    )}</p>
                                    <span className="text-xs text-gray-400">{itemMetrics.panelArea.toFixed(1)} מ"ר</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Cost Breakdown Grid */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 bg-gray-100 rounded-lg text-center shadow-sm border border-gray-200">
                                <Label className="text-xs text-gray-500">עלות חומרים (סה"כ)</Label>
                                <p className="font-bold text-black text-base">₪{formatPrice(itemMetrics.totalMaterialCost || 0)}</p>
                                <span className="text-xs text-gray-400">ריצוף + חומר שחור</span>
                              </div>
                              <div className="p-3 bg-gray-100 rounded-lg text-center shadow-sm border border-gray-200">
                                <Label className="text-xs text-gray-500">עלות עובדים סה"כ</Label>
                                <p className="font-bold text-black text-base">₪{formatPrice(itemMetrics.totalLaborCost || 0)}</p>
                              </div>
                              <div className="p-3 bg-gray-100 rounded-lg text-center shadow-sm border border-gray-200">
                                <Label className="text-xs text-gray-500">ימי עבודה מדויקים</Label>
                                <p className="font-bold text-black text-base">{(itemMetrics.workDays || 0).toFixed(1)}</p>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {item.selectedItemData &&
                        <ProjectComplexity
                          item={item}
                          itemMetrics={itemMetrics}
                          complexityAddition={complexityLaborCostIncrease}
                          complexityWorkDaysIncrease={complexityWorkDaysIncrease}
                          onUpdateComplexity={(updatedItem) => {
                            setLocalItems((prev) => prev.map((i) => i.id === updatedItem.id ? updatedItem : i));
                          }}
                          formatPrice={formatPrice} />

                      }
                    </div>
                  }
                </Card>);

            })}
          </div>

          {/* Add New Area Button - Clean White Design */}
          <div className="mt-8">
            <Button
              onClick={handleAddItem}
              variant="outline"
              className="w-full py-6 bg-white hover:bg-orange-50 text-orange-600 hover:text-orange-700 font-semibold text-base rounded-xl border-2 border-dashed border-orange-300 hover:border-orange-400 shadow-sm hover:shadow-md transition-all duration-300 group">

              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-orange-100 group-hover:bg-orange-200 rounded-full flex items-center justify-center transition-colors duration-300">
                  <Plus className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-lg">הוסף אזור נוסף</span>
              </div>
            </Button>

            {/* Helper text */}
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-500 font-medium">

              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TilingManualItemDialog - תיקון: העברת userDefaults */}
      <TilingManualItemDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        onAdd={handleAddManualItem}
        userDefaults={userTilingDefaults}
      />
    </div>);

});
