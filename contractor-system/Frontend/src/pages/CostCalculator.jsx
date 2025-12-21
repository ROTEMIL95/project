
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Plus, Edit, Trash2, ArrowRight, X, ChevronDown, Info, ChevronLeft, ChevronRight, Palette, Lock, Calculator, ArrowLeft, Layers, BookOpen, Check, Settings, HardHat, Package, Award, SlidersHorizontal, Target, TrendingUp, Building, Paintbrush, Hammer as ConstructionIcon, Trash2 as DemolitionIcon, Edit2, Home, Wrench, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TilingForm from '@/components/costCalculator/TilingForm';
import PaintForm from '@/components/costCalculator/PaintForm';
import RoomEstimatesSettings from '@/components/costCalculator/RoomEstimatesSettings';
import TilingDefaultsSettings from '@/components/costCalculator/TilingDefaultsSettings';
import TilingQuickDefaults from '@/components/costCalculator/TilingQuickDefaults';
import PaintQuickDefaults from '@/components/costCalculator/PaintQuickDefaults';
import { supabase } from '@/lib/supabase';
import { userProfileAPI } from '@/lib/api';
import { Category, User } from '@/lib/entities';
import { cn } from '@/lib/utils';
import CategorySwitcher from "@/components/common/CategorySwitcher";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUser } from '@/components/utils/UserContext';

// Consts
const PAINT_TYPES = [
    { id: 'acrylic', name: 'אקרילי' },
    { id: 'supercryl', name: 'סופרקריל' },
    { id: 'oil', name: 'שמן' },
    { id: 'effects', name: 'אפקטים' }
];

// Default tiling items for new users - same as in Catalog.jsx
const DEFAULT_TILING_ITEMS = [
  {
    id: 'default_til_1',
    category: 'tiling',
    tileName: 'גרניט פורצלן 60x60 איכותי',
    itemType: 'אריח',
    size: '60x60',
    workType: 'ריצוף',
    materialCost: 80,
    laborCost: 40,
    additionalCost: 10,
    customerPrice: 0,
    quality: 'איכותי',
    complexityValue: 1,
    pricingMethod: 'percentage',
    desiredProfitPercent: 35,
    isActive: true,
  },
  {
    id: 'default_til_2',
    category: 'tiling',
    tileName: 'קרמיקה לקיר 30x60',
    itemType: 'אריח',
    size: '30x60',
    workType: 'חיפוי קירות',
    materialCost: 60,
    laborCost: 50,
    additionalCost: 8,
    customerPrice: 0,
    quality: 'איכותי',
    complexityValue: 1,
    pricingMethod: 'percentage',
    desiredProfitPercent: 40,
    isActive: true,
  },
  {
    id: 'default_til_3',
    category: 'tiling',
    tileName: 'פורצלן גדול 120x60 פרמיום',
    itemType: 'אריח',
    size: '120x60',
    workType: 'ריצוף',
    materialCost: 150,
    laborCost: 60,
    additionalCost: 15,
    customerPrice: 0,
    quality: 'פרמיום',
    complexityValue: 1.2,
    pricingMethod: 'percentage',
    desiredProfitPercent: 30,
    isActive: true,
  },
];

// Default paint items for new users - same as in Catalog.jsx
const DEFAULT_PAINT_ITEMS = [
  {
    id: 'default_pnt_1',
    category: 'paint_plaster',
    itemName: 'צבע אקרילי לקירות פנים',
    paintName: 'אקרילי סטנדרט',
    paintType: 'acrylic',
    workCategory: 'paint',
    bucketPrice: 180,
    coverage: 40,
    workerDailyCost: 400,
    dailyOutput: 60,
    equipmentCost: 5,
    pricingMethod: 'percentage',
    desiredProfitPercent: 45,
    isActive: true,
  },
  {
    id: 'default_pnt_2',
    category: 'paint_plaster',
    itemName: 'סופרקריל לתקרה',
    paintName: 'סופרקריל איכותי',
    paintType: 'supercryl',
    workCategory: 'paint',
    bucketPrice: 220,
    coverage: 35,
    workerDailyCost: 400,
    dailyOutput: 50,
    equipmentCost: 5,
    pricingMethod: 'percentage',
    desiredProfitPercent: 50,
    isActive: true,
  },
  {
    id: 'default_pnt_3',
    category: 'paint_plaster',
    itemName: 'טיח גמר חיצוני',
    paintName: 'טיח אקרילי',
    workCategory: 'plaster',
    plasterType: 'אקרילי',
    bucketPrice: 250,
    coverage: 20,
    workerDailyCost: 450,
    dailyOutput: 30,
    equipmentCost: 10,
    pricingMethod: 'percentage',
    desiredProfitPercent: 40,
    isActive: true,
  },
];

export default function CostCalculator() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: userData, loading: userLoading } = useUser();

    // State management
    const [activeTab, setActiveTab] = useState(null); // 'tiling', 'paint_plaster', or null for landing
    const [tilingItems, setTilingItems] = useState([]);
    const [paintItems, setPaintItems] = useState([]);
    // Removed: demolitionItems state
    const [loading, setLoading] = useState(true);

    const [isAddingNewTilingItem, setIsAddingNewTilingItem] = useState(false);
    const [selectedTilingItemToEdit, setSelectedTilingItemToEdit] = useState(null);
    const [isAddingNewPaintItem, setIsAddingNewPaintItem] = useState(false);
    const [selectedPaintItemToEdit, setSelectedPaintItemToEdit] = useState(null);
    const [paintPresetCategory, setPaintPresetCategory] = useState(null); // 'paint' | 'plaster' | null
    // Removed: isAddingNewDemolitionItem and selectedDemolitionItemToEdit states
    const [showRoomEstimatesSettings, setShowRoomEstimatesSettings] = useState(false);
    const [showTilingDefaultsSettings, setShowTilingDefaultsSettings] = useState(false);
    const [userTilingDefaults, setUserTilingDefaults] = useState(null);
    const [userPaintDefaults, setUserPaintDefaults] = useState(null);

    // Detailed columns state for each tab (keeping existing, but not directly used in outline)
    const [showDetailedColumnsTiling, setShowDetailedColumnsTiling] = useState(false);
    const [currentDisplayedTilingItemIndex, setCurrentDisplayedTilingItemIndex] = useState(0);
    const [showDetailedColumnsPaint, setShowDetailedColumnsPaint] = useState(0);
    const [currentDisplayedPaintItemIndex, setCurrentDisplayedPaintItemIndex] = useState(0);

    const [tilingDefaults, setTilingDefaults] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // עדכון: קרא פרמטר tab בכל שינוי של ה-URL כדי לפתוח ישר את הקטגוריה המבוקשת
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const tab = urlParams.get('tab');
        if (tab === 'tiling' || tab === 'paint_plaster') {
            setActiveTab(tab);
        }
    }, [location.search]);

    // NEW: dynamic gradient classes for FAB by active tab
    const getFabGradient = () => {
        if (activeTab === 'tiling') return 'from-orange-500 to-orange-600';
        // if (activeTab === 'paint_plaster') return 'from-blue-500 to-blue-600'; // FAB is now hidden for paint_plaster
        return 'from-emerald-500 to-green-600'; // Fallback, though should only be tiling now
    };

    // --- Start of calculation functions ---
    // פונקציה לחישוב מדדים שונים (עודכנה לשימוש בנתונים החדשים מהטופס עבור עלות למ"ר)
    const calculateMetrics = (area, formData, price) => { // 'area' and 'price' are not used in this specific calculation logic for costPerMeter
        const materialCost = Number(formData.materialCost || 0);
        const additionalCost = Number(formData.additionalCost || 0);
        let laborCostPerMeter = 0;

        // Calculate labor cost per meter based on the selected method
        if (formData.laborCostMethod === 'perSqM') {
            laborCostPerMeter = Number(formData.laborCostPerSqM || 0);
        } else if (formData.laborCostMethod === 'perDay') {
            const dailyOutput = Number(formData.dailyOutput || 0);
            const laborCostPerDay = Number(formData.laborCostPerDay || 0);
            if (dailyOutput > 0) {
                laborCostPerMeter = laborCostPerDay / dailyOutput;
            }
        }

        const baseCostPerMeter = materialCost + additionalCost + laborCostPerMeter;

        // Apply wastage percentage if applicable
        const wastagePercent = Number(formData.wastagePercent || 0);
        const wastageFactor = 1 + (wastagePercent / 100);
        const costAfterWastage = baseCostPerMeter * wastageFactor;

        // Apply complexity value if applicable
        const complexityValue = Number(formData.complexityValue || 1);
        const finalCostPerMeter = costAfterWastage * complexityValue;

        return { costPerMeter: finalCostPerMeter };
    };

    // עדכון פונקציית חישוב ממוצע מחיר (לצורך חישוב דינמי אם לא שמור)
    const calculatePriceAverage = (item) => {
        // Always prioritize the saved averageCustomerPrice
        if (item.averageCustomerPrice !== undefined && item.averageCustomerPrice > 0) {
            // console.log('Using saved averageCustomerPrice:', item.averageCustomerPrice);
            return Number(item.averageCustomerPrice);
        }

        // Fallback logic (should rarely be used with the new system)
        if (!item?.priceTiers || item.priceTiers.length === 0) {
            return Number(item.customerPrice || 0);
        }

        const validTiers = item.priceTiers.filter(tier => tier.price > 0);
        if (validTiers.length === 0) {
            return Number(item.customerPrice || 0);
        }

        const sum = validTiers.reduce((acc, tier) => acc + Number(tier.price || 0), 0);
        return sum / validTiers.length;
    };

    // פונקציה לחישוב ממוצע עלות למ"ר מכל המדרגות (לצורך חישוב דינמי אם לא שמור)
    const calculateAverageCostPerMeter = (item) => {
        // Always prioritize the saved averageCostPerMeter
        if (item.averageCostPerMeter !== undefined && item.averageCostPerMeter > 0) {
            // console.log('Using saved averageCostPerMeter:', item.averageCostPerMeter);
            return Number(item.averageCostPerMeter);
        }

        // Fallback to basic cost per meter if no saved average cost
        return calculateBasicCostPerMeter(item);
    };

    // עדכון פונקציית החישוב הבסיסית (לא כוללת complexityValue, משמשת כ-fallback)
    const calculateBasicCostPerMeter = (item) => {
        if (!item) return 0;

        const materialCost = Number(item.materialCost || 0);
        const additionalCost = Number(item.additionalCost || 0);
        let laborCostPerMeter = 0;

        if (item.laborCostMethod === 'perSqM') {
            laborCostPerMeter = Number(item.laborCostPerSqM || 0);
        } else if (item.laborCostMethod === 'perDay') {
            const dailyOutput = Number(item.dailyOutput || 0);
            const laborCostPerDay = Number(item.laborCostPerDay || 0);
            if (dailyOutput > 0) {
                laborCostPerMeter = laborCostPerDay / dailyOutput;
            }
        }

        const baseCostPerMeter = materialCost + additionalCost + laborCostPerMeter;

        const wastagePercent = Number(item.wastagePercent || 0);
        const wastageFactor = 1 + (wastagePercent / 100);

        return baseCostPerMeter * wastageFactor;
    };

    // פונקציה לחישוב רווח למ"ר (משתמשת בנתונים שמורים או מחשבת דינמית)
    const calculateProfitPerMeter = (item) => {
        if (item.averageProfitPerMeter !== undefined) {
            return Number(item.averageProfitPerMeter);
        }

        const price = calculatePriceAverage(item);
        const cost = calculateAverageCostPerMeter(item); // Use the (potentially saved) average cost
        return price - cost;
    }

    // פונקציה לחישוב אחוז רווח (משתמשת בנתונים שמורים או מחשבת דינמית)
    const calculateProfitPercent = (item) => {
        if (item.averageProfitPercent !== undefined) {
            return Number(item.averageProfitPercent).toFixed(1);
        }

        const profit = calculateProfitPerMeter(item);
        const cost = calculateAverageCostPerMeter(item); // Use the (potentially saved) average cost
        if (cost <= 0) return "0";
        return ((profit / cost) * 100).toFixed(1);
    }

    // פונקציה לחישוב עלות למ"ר עבור צבע
    const calculatePaintCostPerMeter = (item) => {
        if (!item) return 0;

        const metersPerBucket = Number(item.coverage || 0);
        const bucketPrice = Number(item.bucketPrice || item.materialCost || 0);
        const materialCostPerMeter = metersPerBucket > 0 ? bucketPrice / metersPerBucket : 0;

        const workerDailyCost = Number(item.workerDailyCost || item.laborCost || 0);
        const dailyOutput = Number(item.dailyOutput || 0);
        const laborCostPerMeter = dailyOutput > 0 ? workerDailyCost / dailyOutput : 0;
        const cleaningCostPerMeter = Number(item.cleaningCostPerMeter || 0);
        const preparationCostPerMeter = Number(item.preparationCostPerMeter || 0);

        const difficultyMultiplier = item.selectedDifficulty?.multiplier || 1;

        const totalCostPerMeter = (materialCostPerMeter + laborCostPerMeter + cleaningCostPerMeter + preparationCostPerMeter) * difficultyMultiplier;

        return totalCostPerMeter;
    };

    // פונקציה לחישוב מחיר מכירה למ"ר
    const calculatePaintPricePerMeter = (item) => {
        if (!item?.priceTiers || item.priceTiers.length === 0) {
            return Number(item.customerPrice || 0);
        }

        const validTiers = item.priceTiers.filter(tier => tier.price > 0);
        if (validTiers.length === 0) return Number(item.customerPrice || 0);

        const totalPrice = validTiers.reduce((sum, tier) => sum + Number(tier.price || 0), 0);
        return totalPrice / validTiers.length;
    };

    // פונקציה לחישוב רווח למ"ר
    const calculatePaintProfitPerMeter = (item) => {
        const costPerMeter = calculatePaintCostPerMeter(item);
        const pricePerMeter = calculatePaintPricePerMeter(item);
        return pricePerMeter - costPerMeter;
    };

    // פונקציה לחישוב אחוז רווח
    const calculatePaintProfitPercent = (item) => {
        const costPerMeter = calculatePaintCostPerMeter(item);
        const pricePerMeter = calculatePaintPricePerMeter(item);

        if (costPerMeter <= 0) {
            return pricePerMeter > 0 ? Infinity : 0;
        }
        return ((pricePerMeter - costPerMeter) / costPerMeter) * 100;
    };

    // פונקציה פשוטה יותר לקבלת ממוצעים מהפריט
    const getTilingItemAverages = (item) => {
        const displaySize = (item.selectedSizes && item.selectedSizes.length > 0)
            ? item.selectedSizes.join(', ')
            : 'לא צוין';

        // ALWAYS use the saved averages, never recalculate
        const averageCustomerPrice = Number(item.averageCustomerPrice || 0);
        const averageCostPerMeter = Number(item.averageCostPerMeter || 0);

        // console.log('Displaying saved averages for item:', item.tileName, {
        //     averageCustomerPrice,
        //     averageCostPerMeter
        // });

        return {
            averageCustomerPrice,
            averageCostPerMeter,
            displaySize
        };
    };

    const getPaintItemAverages = (item) => {
        const averageCustomerPrice = item.averageCustomerPrice !== undefined ? Number(item.averageCustomerPrice) : calculatePaintPricePerMeter(item);
        const averageCostPerMeter = item.averageCostPerMeter !== undefined ? Number(item.averageCostPerMeter) : calculatePaintCostPerMeter(item);
        return { averageCustomerPrice, averageCostPerMeter };
    };

    // Removed: getDemolitionItemAverages function

    const calculateCategoryStats = (categoryId, categoryItemsToCalculate) => {
        if (!categoryItemsToCalculate || categoryItemsToCalculate.length === 0) {
            return {
                avgPrice: 0,
                avgCost: 0,
                avgProfit: 0,
                avgProfitPercent: 0
            };
        }

        let totalAvgPrice = 0;
        let totalAvgCost = 0;
        const itemCount = categoryItemsToCalculate.length;

        categoryItemsToCalculate.forEach(item => {
            let itemPrice = 0;
            let itemCost = 0;

            if (categoryId === 'tiling') {
                const averages = getTilingItemAverages(item);
                itemPrice = averages.averageCustomerPrice;
                itemCost = averages.averageCostPerMeter;
            } else if (categoryId === 'paint_plaster') {
                const averages = getPaintItemAverages(item);
                itemPrice = averages.averageCustomerPrice;
                itemCost = averages.averageCostPerMeter;
            }
            // Removed: else if for demolition_disposal

            totalAvgPrice += itemPrice;
            totalAvgCost += itemCost;
        });

        if (itemCount === 0) {
            return { avgPrice: 0, avgCost: 0, avgProfit: 0, avgProfitPercent: 0 };
        }

        const avgPrice = totalAvgPrice / itemCount;
        const avgCost = totalAvgCost / itemCount;
        const avgProfit = avgPrice - avgCost;
        const avgProfitPercent = avgCost > 0 ? (avgProfit / avgCost) * 100 : (avgProfit > 0 ? Infinity : 0);

        return { avgPrice, avgCost, avgProfit, avgProfitPercent };
    };

    const calculateLayerRequirements = (squareMeters, numberOfLayers = 1, item) => {
        const coverage = Number(item.coverage || 0);
        const bucketPrice = Number(item.bucketPrice || item.materialCost || 0);
        const dailyOutput = Number(item.dailyOutput || 0);
        const workerDailyCost = Number(item.workerDailyCost || item.laborCost || 0);
        const equipmentCost = Number(item.equipmentCost || item.additionalCost || 0);
        const cleaningCost = Number(item.cleaningCostPerMeter || 0);
        const preparationCost = Number(item.preparationCostPerMeter || 0);
        const difficultyMultiplier = item.selectedDifficulty?.multiplier || 1;

        if (coverage <= 0 || dailyOutput <= 0 || squareMeters <= 0) {
            return { totalCost: 0 };
        }

        const bucketsPerLayer = squareMeters / coverage;
        const workDaysPerLayer = squareMeters / dailyOutput;

        const totalBuckets = bucketsPerLayer * numberOfLayers;
        const totalWorkDays = workDaysPerLayer * numberOfLayers;

        const materialCost = totalBuckets * bucketPrice;
        const laborCost = totalWorkDays * workerDailyCost;
        const otherCosts = (equipmentCost + cleaningCost + preparationCost) * squareMeters * numberOfLayers;

        const totalCost = (materialCost + laborCost + otherCosts) * difficultyMultiplier;

        return { totalCost };
    };

    const calculateCostPerMeterForTier = (item, tierMaxArea) => {
        if (!item || !tierMaxArea || tierMaxArea <= 0) return 0;

        try {
            const materialCostTotal = Number(item.materialCost || 0) * tierMaxArea;
            const dailyOutput = Number(item.dailyOutput || 0);
            const workDays = dailyOutput > 0 ? tierMaxArea / dailyOutput : 0;

            // Handle labor cost based on method
            let laborCostTotal = 0;
            if (item.laborCostMethod === 'perSqM') {
                laborCostTotal = Number(item.laborCostPerSqM || 0) * tierMaxArea;
            } else if (item.laborCostMethod === 'perDay') {
                const laborCostPerDay = Number(item.laborCostPerDay || 0);
                laborCostTotal = workDays * laborCostPerDay;
            } else { // Fallback to old laborCost if method not specified (for existing items)
                 laborCostTotal = workDays * Number(item.laborCost || 0);
            }

            const additionalCostTotal = Number(item.additionalCost || 0) * tierMaxArea;
            const fixedProjectCost = Number(item.fixedProjectCost || 0);
            const complexityFactor = Number(item.complexityValue || 1);

            const totalVariableCost = materialCostTotal + laborCostTotal + additionalCostTotal;
            const totalCost = (totalVariableCost * complexityFactor) + fixedProjectCost;
            const costPerMeter = totalCost / tierMaxArea;
            return costPerMeter;
        } catch (error) {
            console.error("שגיאה בחישוב עלות למטר עבור מדרגה:", error);
            return 0;
        }
    };

    const handleNextTilingItem = () => {
        const currentCategoryItems = tilingItems
            .filter(item =>
                searchQuery === '' ||
                (item.tileName && item.tileName.includes(searchQuery)) ||
                (item.selectedSizes && item.selectedSizes.join(', ').includes(searchQuery))
            );
        if (currentDisplayedTilingItemIndex < currentCategoryItems.length - 1) {
            setCurrentDisplayedTilingItemIndex(prevIndex => prevIndex + 1);
        }
    };

    const handlePrevTilingItem = () => {
        if (currentDisplayedTilingItemIndex > 0) {
            setCurrentDisplayedTilingItemIndex(prevIndex => prevIndex + 1);
        }
    };

    const handleNextPaintItem = () => {
        const currentCategoryItems = paintItems
            .filter(item =>
                searchQuery === '' ||
                (item.itemName && item.itemName.includes(searchQuery)) ||
                (item.paintName && item.paintName.includes(searchQuery)) ||
                (item.paintType && PAINT_TYPES.find(pt => pt.id === item.paintType)?.name.includes(searchQuery))
            );
        if (currentDisplayedPaintItemIndex < currentCategoryItems.length - 1) {
            setCurrentDisplayedPaintItemIndex(prevIndex => prevIndex + 1);
        }
    };

    const handlePrevPaintItem = () => {
        if (currentDisplayedPaintItemIndex > 0) {
            setCurrentDisplayedPaintItemIndex(prevIndex => prevIndex + 1);
        }
    };

    const calculateTotalCostForTier = (squareMeters, itemContext = null) => {
        if (!squareMeters || squareMeters <= 0 || !itemContext) return 0;

        if (itemContext.category === 'tiling') {
            const materialCost = Number(itemContext.materialCost || 0);
            const laborCost = Number(itemContext.laborCost || 0);
            const additionalCost = Number(itemContext.additionalCost || 0);
            const complexityValue = Number(itemContext.complexityValue || 1);
            const fixedProjectCost = Number(itemContext.fixedProjectCost || 0);
            const dailyOutput = Number(itemContext.dailyOutput || 100);

            const workDays = dailyOutput > 0 ? (squareMeters / dailyOutput) : 0;
            const totalLabor = workDays * laborCost;
            const totalMaterial = materialCost * squareMeters;
            const totalAdditional = additionalCost * squareMeters;
            const totalVariableCost = totalMaterial + totalLabor + totalAdditional;
            return (totalVariableCost * complexityValue) + fixedProjectCost;

        } else if (itemContext.category === 'paint_plaster') {
            const bucketPrice = Number(itemContext.bucketPrice || 0);
            const coverage = Number(itemContext.coverage || 0);
            const workerDailyCost = Number(itemContext.workerDailyCost || 0);
            const dailyOutput = Number(itemContext.dailyOutput || 0);
            const cleaningCostPerMeter = Number(itemContext.cleaningCostPerMeter || 0); // Corrected from 'item' to 'itemContext'
            const preparationCostPerMeter = Number(itemContext.preparationCostPerMeter || 0); // Corrected from 'item' to 'itemContext'
            const equipmentCost = Number(itemContext.equipmentCost || 0);

            let totalMaterialCost = 0;
            if (coverage > 0) {
                const bucketsNeeded = Math.ceil(squareMeters / coverage);
                totalMaterialCost = bucketsNeeded * bucketPrice;
            } else {
                totalMaterialCost = Number(itemContext.materialCost || 0) * squareMeters;
            }

            let totalLaborCost = 0;
            if (dailyOutput > 0) {
                const workDaysNeeded = squareMeters / dailyOutput;
                totalLaborCost = workDaysNeeded * workerDailyCost;
            } else {
                totalLaborCost = Number(itemContext.laborCost || 0) * squareMeters;
            }

            const totalOtherPerMeterCosts = (cleaningCostPerMeter + preparationCostPerMeter + equipmentCost) * squareMeters;
            const difficultyMultiplier = itemContext.selectedDifficulty?.multiplier || 1;
            const totalCost = (totalMaterialCost + totalLaborCost + totalOtherPerMeterCosts) * difficultyMultiplier;

            return totalCost;
        }
        return 0;
    };

    const calculateCombinedMultiplier = (item) => {
        if (!item || !item.workFactors) return 1;

        const complexityValue =
            item.workFactors.complexity?.[item.complexity || 'normal']?.value || 1;
        const surfaceValue =
            item.workFactors.surface?.[item.surface || 'regular']?.value || 1;
        const installationValue =
            item.workFactors.installation?.[item.installation || 'regular']?.value || 1;

        return complexityValue * surfaceValue * installationValue;
    };

    const calculateBaseCost = (item) => {
        if (!item) return 0;

        const materialCost = Number(item.materialCost || 0);
        const laborCost = Number(item.laborCost || 0);
        const additionalCost = Number(item.additionalCost || 0);

        return materialCost + laborCost + additionalCost;
    };

    const calculateAdjustedCost = (item) => {
        const baseCost = calculateBaseCost(item);
        const combinedMultiplier = calculateCombinedMultiplier(item);

        return baseCost * combinedMultiplier;
    };

    const calculateTotalCost = (item) => {
        return calculateAdjustedCost(item);
    };

    const calculateProfit = (item) => {
        if (!item || !item.customerPrice || item.customerPrice <= 0 || !item.totalCost || item.totalCost <= 0) {
            return "0";
        }

        const profit = ((item.customerPrice - item.totalCost) / item.customerPrice) * 100;

        if (isNaN(profit) || !isFinite(profit)) {
            return "0";
        }

        return profit.toFixed(1);
    };

    // --- End of calculation functions ---

    const handleCategorySelect = (tabName) => {
        // Navigate to plumbing manager
        if (tabName === 'plumbing') {
            navigate(createPageUrl('ContractorPricing?tab=plumbing'));
            return;
        }

        // Navigate to electricity manager
        if (tabName === 'electricity') {
            navigate(createPageUrl('ContractorPricing?tab=electricity'));
            return;
        }

        // Navigate to construction manager
        if (tabName === 'construction') {
            navigate(createPageUrl('ContractorPricing?tab=construction'));
            return;
        }

        // Intercept and navigate for demolition
        if (tabName === 'demolition_disposal') {
            navigate(createPageUrl('DemolitionCalculator'));
            return;
        }

        setActiveTab(tabName);
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // --- Start of event handlers ---
    const handleEditItem = async (item) => {
        if (!item || !item.id) {
            console.error("פריט לא תקין לעריכה", item);
            return;
        }
        if (item.category === 'tiling') {
            setSelectedTilingItemToEdit(item);
            setIsAddingNewTilingItem(true);
        } else if (item.category === 'paint_plaster') {
            const paintItemToEdit = { ...item, bucketPrice: item.bucketPrice !== undefined ? item.bucketPrice : item.materialCost, workerDailyCost: item.workerDailyCost !== undefined ? item.workerDailyCost : item.laborCost, equipmentCost: item.equipmentCost !== undefined ? item.equipmentCost : item.additionalCost };
            setSelectedPaintItemToEdit(paintItemToEdit);
            setIsAddingNewPaintItem(true);
            setPaintPresetCategory(null); // בעת עריכה לא נכריח קטגוריה
        }
        // Removed: else if for demolition_disposal
    };

    const handleDeleteItem = async (itemId, category) => {
        try {
            if (category === 'tiling') {
                const updatedTilingItems = tilingItems.filter(i => i.id !== itemId);
                if (typeof User.updateMyUserData === 'function') {
                    await User.updateMyUserData({ tilingItems: updatedTilingItems });
                } else {
                    console.log('User.updateMyUserData not available - backend not connected');
                }
                setTilingItems(updatedTilingItems);
            } else if (category === 'paint_plaster') {
                const updatedPaintItems = paintItems.filter(i => i.id !== itemId);
                if (typeof User.updateMyUserData === 'function') {
                    await User.updateMyUserData({ paintItems: updatedPaintItems });
                } else {
                    console.log('User.updateMyUserData not available - backend not connected');
                }
                setPaintItems(updatedPaintItems);
            }
            // Removed: else if for demolition_disposal
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };

    const handleAddNewTilingItem = () => {
        setIsAddingNewTilingItem(true);
        setSelectedTilingItemToEdit(null);
    };

    const handleAddNewPaintItem = (preset = null) => {
        setIsAddingNewPaintItem(true);
        setSelectedPaintItemToEdit(null);
        setPaintPresetCategory(preset); // 'paint' או 'plaster' או null
    };

    // Removed: handleAddNewDemolitionItem function

    // Helper function for getting profit badge class
    const getProfitBadgeClass = (profitPercentRaw) => {
        const p = !isFinite(profitPercentRaw) ? Infinity : Math.round(Number(profitPercentRaw) * 10) / 10;
        if (p === Infinity || p >= 40) return "bg-green-100 text-green-800";
        if (p >= 30) return "bg-yellow-100 text-yellow-800";
        if (p >= 20) return "bg-orange-100 text-orange-800";
        return "bg-red-100 text-red-800";
    };

    // New handler to open tiling defaults settings
    const handleOpenTilingDefaultsSettings = () => {
        setShowTilingDefaultsSettings(true);
    };

    // New handler to save tiling defaults
    const handleSaveTilingDefaults = async (defaults) => {
        try {
            console.log('[CostCalculator] 💾 Saving advanced tiling defaults to user_profiles:', defaults);

            // ✅ FIXED: Save to user_profiles table instead of user_metadata
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    tiling_user_defaults: defaults
                })
                .eq('auth_user_id', userData.id);

            if (error) {
                console.error('[CostCalculator] ❌ Error saving tiling defaults:', error);
                alert('שגיאה בשמירת ברירות המחדל: ' + error.message);
                return;
            }

            console.log('[CostCalculator] ✅ Advanced tiling defaults saved successfully');
            setUserTilingDefaults(defaults);
            setShowTilingDefaultsSettings(false);
        } catch (error) {
            console.error('[CostCalculator] ❌ Exception saving tiling defaults:', error);
            alert('שגיאה בשמירת ברירות המחדל');
        }
    };

    // שמירת ברירות מחדל לריצוף + החלה אופציונלית על כל הפריטים השמורים עם חישוב אוטומטי
    const handleSaveTilingQuickDefaults = async (partialDefaults, options = {}) => {
        console.log('[CostCalculator] 📥 Received tiling data to save:', partialDefaults);
        console.log('[CostCalculator] 📋 Current userTilingDefaults:', userTilingDefaults);

        const merged = {
            ...(userTilingDefaults || {}),
            ...partialDefaults,
        };

        console.log('[CostCalculator] 🔀 Merged tiling data:', merged);

        // ✅ FIXED: Save to user_profiles table instead of user_metadata
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    tiling_user_defaults: merged
                })
                .eq('auth_user_id', userData.id);

            if (error) {
                console.error('[CostCalculator] ❌ Error saving tiling defaults:', error);
                alert('שגיאה בשמירת הגדרות ריצוף: ' + error.message);
                return;
            }

            console.log('[CostCalculator] ✅ Tiling defaults saved successfully to user_profiles');
        } catch (error) {
            console.error('[CostCalculator] ❌ Exception saving tiling defaults:', error);
            alert('שגיאה בשמירת הגדרות ריצוף');
            return;
        }

        // Force update with a new object reference to trigger re-render
        setUserTilingDefaults({ ...merged });
        console.log('[CostCalculator] 🔄 State updated with new object reference');

        // החלת ההגדרות על כל פריטי הריצוף השמורים (ללא כניסה לפריטים)
        if (options.applyToExisting) {
            const ok = window.confirm("להחיל את עלות העובד ואחוז הרווח הרצוי על כל פריטי הריצוף השמורים? הפעולה תעדכן גם את המחיר/עלות/רווח הממוצעים להצגה.");
            if (ok) {
                const method = merged.laborCostMethod || 'perDay';
                const perDay = Number(merged.laborCostPerDay || 0);
                const perSqM = Number(merged.laborCostPerSqM || 0);
                const desiredProfit = merged.desiredProfitPercent !== undefined ? Number(merged.desiredProfitPercent) : undefined;

                const updatedItems = (tilingItems || []).map((item) => {
                    const newItem = {
                        ...item,
                        laborCostMethod: method,
                        laborCostPerDay: method === 'perDay' ? perDay : 0,
                        laborCostPerSqM: method === 'perSqM' ? perSqM : 0,
                    };

                    // אם יש אחוז רווח רצוי – נחשב ונעדכן ערכי תצוגה ממוצעים (נראות)
                    if (desiredProfit !== undefined) {
                        // שימוש בפונקציה הקיימת שמחשבת עלות בסיסית למ"ר (כולל בלאי אם קיים)
                        const baseCostPerMeter = Math.round(calculateBasicCostPerMeter(newItem) || 0);
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

                if (typeof User.updateMyUserData === 'function') {
                    await User.updateMyUserData({ tilingItems: updatedItems });
                } else {
                    console.log('User.updateMyUserData not available - backend not connected');
                }
                setTilingItems(updatedItems);
            }
        }
    };

    // add handler to save paint quick defaults and optionally apply to existing items
    const handleSavePaintQuickDefaults = async (partialDefaults, options = {}) => {
        const merged = {
            ...(userPaintDefaults || {}),
            ...partialDefaults,
        };

        console.log('[CostCalculator] 💾 Saving paint defaults to user_profiles:', merged);

        // ✅ FIXED: Save to user_profiles table instead of user_metadata
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    paint_user_defaults: merged
                })
                .eq('auth_user_id', userData.id);

            if (error) {
                console.error('[CostCalculator] ❌ Error saving paint defaults:', error);
                alert('שגיאה בשמירת הגדרות: ' + error.message);
                return;
            }

            console.log('[CostCalculator] ✅ Paint defaults saved successfully');
            setUserPaintDefaults(merged);
        } catch (error) {
            console.error('[CostCalculator] ❌ Exception saving paint defaults:', error);
            alert('שגיאה בשמירת הגדרות');
            return;
        }

        if (options.applyToExisting) {
            const ok = window.confirm("להחיל את עלות הפועל ואחוז הרווח על כל פריטי הצבע/שפכטל השמורים? הפעולה תעדכן גם מחיר/עלות/רווח ממוצעים להצגה.");
            if (ok) {
                const updatedItems = (paintItems || []).map((item) => {
                    const newItem = { ...item };
                    if (merged.workerDailyCost !== undefined) {
                        newItem.workerDailyCost = Number(merged.workerDailyCost);
                        newItem.laborCost = Number(merged.workerDailyCost); // שמירה לשדה הישן אם קיים שימוש
                    }
                    if (merged.desiredProfitPercent !== undefined) {
                        // חשב עלות ממוצעת למ"ר לפי ההגדרות המעודכנות
                        // נשתמש בפונקציות שקיימות בדף
                        const baseCostPerMeter = Math.round(calculatePaintCostPerMeter({
                            ...newItem,
                            workerDailyCost: newItem.workerDailyCost
                        }) || 0);

                        const avgCustomerPrice = Math.round(baseCostPerMeter * (1 + (Number(merged.desiredProfitPercent) / 100)));
                        const avgProfitPerMeter = Math.round(avgCustomerPrice - baseCostPerMeter);

                        newItem.desiredProfitPercent = Number(merged.desiredProfitPercent);
                        newItem.averageCostPerMeter = baseCostPerMeter;
                        newItem.averageCustomerPrice = avgCustomerPrice;
                        newItem.averageProfitPerMeter = avgProfitPerMeter;
                        newItem.averageProfitPercent = Number(merged.desiredProfitPercent);
                    }
                    return newItem;
                });

                if (typeof User.updateMyUserData === 'function') {
                    await User.updateMyUserData({ paintItems: updatedItems });
                } else {
                    console.log('User.updateMyUserData not available - backend not connected');
                }
                setPaintItems(updatedItems);
            }
        }
    };

    const handleOpenRoomEstimatesSettings = () => {
        setShowRoomEstimatesSettings(true);
    };

    const handleCloseRoomEstimatesSettings = () => {
        setShowRoomEstimatesSettings(false);
    };

    const handleSaveRoomEstimates = async (updatedEstimates) => {
        try {
            // Update user_profiles table via API
            await userProfileAPI.updateMe({
                room_estimates: updatedEstimates
            });

            setShowRoomEstimatesSettings(false);

            // The useUser hook will automatically refresh the user data
            console.log('Room estimates saved successfully');
        } catch (error) {
            console.error("Error saving room estimates:", error);
            alert("שגיאה בשמירת הגדרות אומדן חללים.");
        }
    };

    const handleTilingFormSubmit = async (formData) => {
        try {
            // --- NEW SIMPLIFIED LOGIC ---
            // Use the pre-calculated averages and properties directly from the form data.
            // No more recalculations here. What the form sends is what we save.

            const newItem = {
                id: formData.id || `tiling_${Date.now()}`,
                tileName: formData.tileName,
                generalDescription: formData.generalDescription,
                workType: formData.workType,
                category: 'tiling',
                unit: 'מ"ר',
                materialCost: Number(formData.materialCost || 0),
                additionalCost: Number(formData.additionalCost || 0),
                dailyOutput: Number(formData.dailyOutput || 0),
                fixedProjectCost: Number(formData.fixedProjectCost || 0),
                priceTiers: formData.priceTiers,
                // Use the exact, rounded values passed from the form
                averageCustomerPrice: formData.averageCustomerPrice,
                averageCostPerMeter: formData.averageCostPerMeter,
                averageProfitPerMeter: formData.averageProfitPerMeter,
                averageProfitPercent: formData.averageProfitPercent,
                wastagePercent: Number(formData.wastagePercent || 0),
                selectedQuality: formData.selectedQuality || '',
                laborCostMethod: formData.laborCostMethod || 'perDay',
                laborCostPerDay: Number(formData.laborCostPerDay || 0),
                laborCostPerSqM: Number(formData.laborCostPerSqM || 0),
                maxProjectRange: formData.maxProjectRange || '',
                desiredProfitPercent: formData.pricingMethod === 'quick' ? Number(formData.desiredProfitPercent || 0) : 0,
                pricingMethod: formData.pricingMethod,
                selectedSizes: formData.selectedSizes || [],
                hasPanel: formData.hasPanel || false,
                panelLaborWorkCapacity: Number(formData.panelLaborWorkCapacity || 0),
                panelUtilizationPercent: Number(formData.panelUtilizationPercent || 0)
            };

            // console.log("Saving new item with values from form:", {
            //     price: newItem.averageCustomerPrice,
            //     cost: newItem.averageCostPerMeter,
            //     profit: newItem.averageProfitPerMeter,
            // });

            // הסרת שדות ישנים
            delete newItem.size;
            delete newItem.customSize;
            delete newItem.laborCost;
            delete newItem.totalCost;
            delete newItem.customerPrice;
            delete newItem.complexityValue;
            delete newItem.baseWorkTime;
            delete newItem.quality;

            let updatedItems;
            if (selectedTilingItemToEdit) {
                updatedItems = tilingItems.map(item =>
                    item.id === selectedTilingItemToEdit.id ? newItem : item
                );
            } else {
                updatedItems = [...tilingItems, newItem];
            }

            // Save to user_profile table via backend API
            if (typeof User.updateMyUserData === 'function') {
                await User.updateMyUserData({ tilingItems: updatedItems });
            } else {
                console.log('User.updateMyUserData not available - backend not connected');
            }

            setTilingItems(updatedItems);
            setIsAddingNewTilingItem(false);
            setSelectedTilingItemToEdit(null);

            if (location.state?.returnToCatalog) {
                navigate(createPageUrl('Catalog'));
                return;
            }

        } catch (error) {
            console.error("Error saving tiling data:", error);
            alert('שגיאה בשמירת הנתונים');
        }
    };

    const handlePaintFormSubmit = async (formData) => {
        try {
            // console.log('Received paint form data:', formData);

            const newItem = {
                id: formData.id || `paint_${Date.now()}`,
                category: 'paint_plaster',
                itemName: formData.itemName || '',
                paintName: formData.itemName || '',
                paintType: formData.paintType || '',
                type: formData.paintType || '',
                materialCost: Number(formData.bucketPrice || 0),
                laborCost: Number(formData.workerDailyCost || 0),
                additionalCost: Number(formData.equipmentCost || 0),
                customerPrice: Number(formData.customerPrice || 0),
                coverage: Number(formData.coverage || 0),
                bucketLiters: Number(formData.bucketLiters || 0),
                workCategory: formData.workCategory,
                dailyOutput: Number(formData.dailyOutput || 0),
                difficultyFactors: formData.difficultyFactors,
                selectedDifficulty: formData.selectedDifficulty,
                layers: Number(formData.layers || 0),
                layerSettings: formData.layerSettings,
                priceTiers: formData.priceTiers,
                pricingMethod: formData.pricingMethod, // Save the selected pricing method
                desiredProfitPercent: formData.desiredProfitPercent ? Number(formData.desiredProfitPercent) : undefined,
                averageCustomerPrice: Number(formData.averageCustomerPrice || 0),
                averageCostPerMeter: Number(formData.averageCostPerMeter || 0),
                averageProfitPerMeter: Number(formData.averageProfitPerMeter || 0),
                averageProfitPercent: Number(formData.averageProfitPercent || 0),
                paintInfo: formData.paintInfo,
                executionNotes: formData.executionNotes,
                limitations: formData.limitations,
                bucketPrice: Number(formData.bucketPrice || 0),
                workerDailyCost: Number(formData.workerDailyCost || 0),
                equipmentCost: Number(formData.equipmentCost || 0),
                cleaningCostPerMeter: Number(formData.cleaningCostPerMeter || 0),
                preparationCostPerMeter: Number(formData.preparationCostPerMeter || 0),
                plasterType: formData.plasterType,
                selectedPlasterType: formData.selectedPlasterType,
            };

            // console.log('Saving paint item with desiredProfitPercent:', newItem.desiredProfitPercent);

            let updatedItems;
            if (selectedPaintItemToEdit) {
                updatedItems = paintItems.map(item =>
                    item.id === selectedPaintItemToEdit.id ? newItem : item
                );
            } else {
                updatedItems = [...paintItems, newItem];
            }

            // Save to user_profile table via backend API
            if (typeof User.updateMyUserData === 'function') {
                await User.updateMyUserData({ paintItems: updatedItems });
            } else {
                console.log('User.updateMyUserData not available - backend not connected');
            }

            setPaintItems(updatedItems);
            setIsAddingNewPaintItem(false);
            setSelectedPaintItemToEdit(null);
            setPaintPresetCategory(null); // Reset preset after form submission

            if (location.state?.returnToCatalog) {
                navigate(createPageUrl('Catalog'));
                return;
            }

        } catch (error) {
            console.error("Error saving paint data:", error);
            alert('שגיאה בשמירת נתוני הצבע');
        }
    };

    // Removed: handleDemolitionFormSubmit function


    const createDefaultPriceTiers = (basePrice, adjustedCost) => {
        const minProfit = 15;
        const minPrice = adjustedCost / (1 - (minProfit / 100));

        return [
            { minArea: 0, maxArea: 30, price: basePrice },
            { minArea: 31, maxArea: 50, price: Math.max(minPrice, basePrice * 0.9) },
            { minArea: 51, maxArea: 100, price: Math.max(minPrice, basePrice * 0.85) }
        ];
    };

    const handleCancelEdit = () => {
        setIsAddingNewTilingItem(false);
        setSelectedTilingItemToEdit(null);
        setIsAddingNewPaintItem(false);
        setSelectedPaintItemToEdit(null);
        setPaintPresetCategory(null); // Reset preset on cancel
        // Removed: demolition states reset

        if (location.state?.returnToCatalog) {
            navigate(createPageUrl('Catalog'));
        }
    };
    // --- End of event handlers ---

    // --- Start of data loading effect ---
    useEffect(() => {
        const loadInitialData = async () => {
            if (userLoading) return;

            if (!userData) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const defaultRoomEstimates = [
                    { id: 'small_bedroom', roomType: 'חדר שינה קטן', wallAreaSqM: 35, ceilingAreaSqM: 10, openingsReduction: { few: 5, regular: 10, many: 15 } },
                    { id: 'medium_bedroom', roomType: 'חדר שינה בינוני', wallAreaSqM: 40, ceilingAreaSqM: 12, openingsReduction: { few: 5, regular: 10, many: 15 } },
                    { id: 'large_bedroom', roomType: 'חדר שינה גדול', wallAreaSqM: 45, ceilingAreaSqM: 15, openingsReduction: { few: 5, regular: 10, many: 15 } },
                    { id: 'small_living_room', roomType: 'סלון קטן', wallAreaSqM: 50, ceilingAreaSqM: 20, openingsReduction: { few: 10, regular: 15, many: 25 } },
                    { id: 'large_living_room', roomType: 'סלון גדול', wallAreaSqM: 80, ceilingAreaSqM: 30, openingsReduction: { few: 10, regular: 15, many: 25 } },
                    { id: 'kitchen', roomType: 'מטבח', wallAreaSqM: 25, ceilingAreaSqM: 10, openingsReduction: { few: 5, regular: 10, many: 20 } },
                    { id: 'bathroom', roomType: 'אמבטיה', wallAreaSqM: 20, ceilingAreaSqM: 5, openingsReduction: { few: 5, regular: 10, many: 20 } },
                ];
                if (!userData.user_metadata?.roomEstimates || userData.user_metadata.roomEstimates.length === 0) {
                    if (typeof User.updateMyUserData === 'function') {
                        await User.updateMyUserData({ roomEstimates: defaultRoomEstimates });
                    } else {
                        console.log('User.updateMyUserData not available - backend not connected');
                    }
                }

                // ✅ FIX: Load user defaults from user_profiles table (same as PriceBookSettings)
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('auth_user_id', userData.id)
                    .single();

                if (profileError) {
                    console.error('Error loading profile:', profileError);
                }

                // Load user's tiling defaults (from profile first, fallback to user_metadata)
                const tilingDefaultsFromProfile = profile?.tiling_user_defaults;
                const tilingDefaultsFromMetadata = userData.user_metadata?.tilingUserDefaults;
                if (tilingDefaultsFromProfile || tilingDefaultsFromMetadata) {
                    setUserTilingDefaults(tilingDefaultsFromProfile || tilingDefaultsFromMetadata);
                }

                // Load user's paint defaults (from profile first, fallback to user_metadata)
                const paintDefaultsFromProfile = profile?.paint_user_defaults;
                const paintDefaultsFromMetadata = userData.user_metadata?.paintUserDefaults;
                if (paintDefaultsFromProfile || paintDefaultsFromMetadata) {
                    setUserPaintDefaults(paintDefaultsFromProfile || paintDefaultsFromMetadata);
                }

                const categories = await Category.list();
                const tilingDefaultCategory = categories.find(c => c.categoryType === 'ריצוף וחיפוי');
                if (tilingDefaultCategory && tilingDefaultCategory.tilingDefaults) {
                    setTilingDefaults(tilingDefaultCategory.tilingDefaults);
                }

                // Load tiling items - seed if empty
                let currentTilingItems = userData.user_metadata?.tilingItems || [];
                if (currentTilingItems.length === 0) {
                    console.log('📦 [CostCalculator] User has no tiling items, seeding defaults...');
                    const seededTiling = DEFAULT_TILING_ITEMS.map(item => ({
                        ...item,
                        id: `til_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    }));

                    if (typeof User.updateMyUserData === 'function') {
                        await User.updateMyUserData({ tilingItems: seededTiling });
                    } else {
                        console.log('User.updateMyUserData not available - backend not connected');
                    }
                    currentTilingItems = seededTiling;
                    console.log(`✅ [CostCalculator] Seeded ${seededTiling.length} tiling items for user`);
                }

                // Load paint items - seed if empty
                let currentPaintItems = userData.user_metadata?.paintItems || [];
                if (currentPaintItems.length === 0) {
                    console.log('📦 [CostCalculator] User has no paint items, seeding defaults...');
                    const seededPaint = DEFAULT_PAINT_ITEMS.map(item => ({
                        ...item,
                        id: `pnt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    }));

                    if (typeof User.updateMyUserData === 'function') {
                        await User.updateMyUserData({ paintItems: seededPaint });
                    } else {
                        console.log('User.updateMyUserData not available - backend not connected');
                    }
                    currentPaintItems = seededPaint;
                    console.log(`✅ [CostCalculator] Seeded ${seededPaint.length} paint items for user`);
                }

                setTilingItems(currentTilingItems);
                setPaintItems(currentPaintItems);
                // Removed: setDemolitionItems
                setLoading(false);
            } catch (error) {
                console.error("Error loading user data:", error);
                setLoading(false);
            }
        };
        loadInitialData();

        const itemToEditFromLocation = location.state?.itemToEdit;
        if (itemToEditFromLocation) {
            handleEditItem(itemToEditFromLocation);
            window.history.replaceState({}, document.title);
        }
    }, [userData, userLoading, location.state]);
    // --- End of data loading effect ---

    // Helper function for formatting price
    const formatPrice = (price) => {
        return Math.round(price); // Round to nearest integer for display
    };

    // --- Start of render functions ---
    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-3 text-gray-600">טוען נתונים...</p>
                </div>
            </div>
        );
    }

    const showForm = isAddingNewTilingItem || isAddingNewPaintItem; // Updated (removed demolition)
    if (showForm) {
        // המצב שבו הטופס מוצג
        if (isAddingNewTilingItem) {
            return (
                <div className="mx-auto max-w-[1600px] p-2 md:p-4 lg:p-6" dir="rtl">
                    <TilingForm
                        onSubmit={handleTilingFormSubmit}
                        onCancel={handleCancelEdit}
                        editItem={selectedTilingItemToEdit}
                        defaults={tilingDefaults}
                        userTilingDefaults={userTilingDefaults}
                    />
                </div>
            )
        }
        if (isAddingNewPaintItem) {
            return (
                 <div className="mx-auto max-w-[1600px] p-2 md:p-4 lg:p-6" dir="rtl">
                    <PaintForm
                        onSubmit={handlePaintFormSubmit}
                        onCancel={handleCancelEdit}
                        editItem={selectedPaintItemToEdit}
                        userPaintDefaults={userPaintDefaults || {}}
                        presetCategory={paintPresetCategory}
                    />
                </div>
            )
        }
        // Removed: Demolition form render
    }

    const currentTilingItemsFiltered = tilingItems.filter(item => searchQuery === '' || (item.tileName && item.tileName.includes(searchQuery)) || (item.selectedSizes && item.selectedSizes.join(', ').includes(searchQuery)));
    const currentPaintItemsFiltered = paintItems.filter(item => searchQuery === '' || (item.itemName && item.itemName.includes(searchQuery)) || (item.paintName && item.paintName.includes(searchQuery)) || (item.paintType && PAINT_TYPES.find(pt => pt.id === item.paintType)?.name.includes(searchQuery)));
    // Removed: currentDemolitionItemsFiltered

    const tilingStats = calculateCategoryStats('tiling', currentTilingItemsFiltered);
    const paintStats = calculateCategoryStats('paint_plaster', currentPaintItemsFiltered);
    // Removed: demolitionStats

    const renderTilingTable = () => (
        <Card className="shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b p-4 sm:p-6">
                <div className="flex items-center gap-4">
                    <CardTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center">
                        <Home className="w-6 h-6 sm:w-7 sm:h-7 ml-2 text-orange-500" />
                        מחירון ריצוף וחיפוי
                    </CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleOpenTilingDefaultsSettings} className="text-gray-600 border-gray-200 hover:bg-gray-50" size="sm">
                        <Settings className="h-4 w-4 ml-2" />
                        ניהול מתקדם
                    </Button>
                    {/* CHANGED: Make add button orange to match tiling */}
                    <Button
                        onClick={handleAddNewTilingItem}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out flex items-center gap-2"
                        size="sm"
                    >
                        <Plus className="h-5 w-5" /> <span>הוספת פריט</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 md:p-4">
                {/* בלוק ראשי מהיר: עלות עובד + אחוז רווח רצוי */}
                <TilingQuickDefaults
                    key={JSON.stringify(userTilingDefaults)}
                    defaults={userTilingDefaults || {}}
                    onSave={handleSaveTilingQuickDefaults}
                />
                {currentTilingItemsFiltered.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Info className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                        <p className="text-lg">אין פריטי ריצוף להצגה.</p>
                        <p className="text-sm">התחל על ידי הוספת פריט חדש.</p>
                    </div>
                ) : (
                    <>
                    <Table>
                    <TableHeader>
                    <TableRow className="bg-slate-100 border-b-2 border-slate-200">
                        <TableHead className="py-5 px-4 font-black text-slate-800 text-base text-right">שם הריצוף</TableHead>
                        <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">גודל</TableHead>
                        <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">רמת איכות</TableHead>
                        <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">מחיר למ"ר</TableHead>
                        <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">עלות למ"ר</TableHead>
                        <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">רווח למ"ר</TableHead>
                        <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">פעולות</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {currentTilingItemsFiltered.map(item => {
                        const averages = getTilingItemAverages(item);
                        const averageCustomerPrice = averages.averageCustomerPrice;
                        const averageCostPerMeter = averages.averageCostPerMeter;

                        const averageProfitPerMeter = item.averageProfitPerMeter !== undefined
                            ? Number(item.averageProfitPerMeter)
                            : averageCustomerPrice - averageCostPerMeter;

                        const profitPercentValue = item.averageProfitPercent !== undefined
                            ? Number(item.averageProfitPercent)
                            : (averageCostPerMeter > 0 ? ((averageCustomerPrice - averageCostPerMeter) / averageCostPerMeter) * 100 : 0);

                        // console.log('Table row for', item.tileName, {
                        //     price: averageCustomerPrice,
                        //     cost: averageCostPerMeter,
                        //     profit: averageProfitPerMeter,
                        //     profitPercent: profitPercentValue
                        // });

                        const getRowBackgroundColor = (profitPercent) => {
                            if (profitPercent < 20) return 'bg-red-50/50 hover:bg-red-100/50';
                            if (profitPercent >= 20 && profitPercent < 30) return 'bg-orange-50/50 hover:bg-orange-100/50';
                            if (profitPercent >= 30 && profitPercent < 40) return 'bg-yellow-50/50 hover:bg-yellow-100/50';
                            return 'bg-green-50/50 hover:bg-green-100/50';
                        };

                        return (
                            <TableRow key={item.id} className={cn("transition-colors duration-200", getRowBackgroundColor(profitPercentValue))}>
                                <TableCell className="py-4 px-4 text-right">
                                    <div className="font-semibold text-gray-800">{item.tileName || `ריצוף`}</div>
                                </TableCell>
                                <TableCell className="py-4 px-4 text-center font-medium text-gray-600">{averages.displaySize}</TableCell>
                                <TableCell className="py-4 px-4 text-center text-sm font-medium text-gray-700">{item.selectedQuality || 'לא צוין'}</TableCell>
                                <TableCell className="py-4 px-4 text-center font-bold text-lg text-indigo-600">{formatPrice(averageCustomerPrice)}</TableCell>
                                {/* עלות למ"ר - שינוי לצבע אדום עדין */}
                                <TableCell className="py-4 px-4 text-center font-bold text-rose-600">
                                    {formatPrice(averageCostPerMeter)}
                                </TableCell>
                                <TableCell className={`py-4 px-4 text-center font-bold text-base ${averageProfitPerMeter >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPrice(averageProfitPerMeter)}</TableCell>
                                <TableCell className="py-4 px-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id, item.category)} className="text-red-600 hover:text-red-800 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                    </Table>
                    </>
                )}
            </CardContent>
        </Card>
    );

    const renderPaintTable = () => (
        <Card className="shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b p-4 sm:p-6">
                <div className="flex items-center gap-4">
                    <CardTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center">
                        <Paintbrush className="w-6 h-6 sm:w-7 sm:h-7 ml-2 text-blue-500" />
                        מחירון צבע ושפכטל
                    </CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => handleAddNewPaintItem('paint')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out flex items-center gap-2" size="sm">
                        <Plus className="h-5 w-5" /> <span>הוסף פריט צבע</span>
                    </Button>
                    <Button onClick={() => handleAddNewPaintItem('plaster')} className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out flex items-center gap-2" size="sm">
                        <Plus className="h-5 w-5" /> <span>הוסף פריט שפכטל</span>
                    </Button>
                    <Button variant="outline" onClick={handleOpenRoomEstimatesSettings} className="text-gray-600 border-gray-200 hover:bg-gray-50" size="sm"><Settings className="h-4 w-4 ml-2" />הגדרות אומדן חללים</Button>
                </div>
            </CardHeader>
             <CardContent className="p-0 md:p-4">
                <PaintQuickDefaults
                    defaults={userPaintDefaults || {}}
                    onSave={handleSavePaintQuickDefaults}
                />
                {currentPaintItemsFiltered.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Info className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                        <p className="text-lg">אין פריטי צבע ושפכטל להצגה.</p>
                        <p className="text-sm">התחל על ידי הוספת פריט חדש.</p>
                    </div>
                ) : (
                    <>
                    <Table>
                        <TableHeader>
                        <TableRow className="bg-slate-100 border-b-2 border-slate-200">
                            <TableHead className="py-5 px-4 font-black text-slate-800 text-base text-right">שם</TableHead>
                            <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">סוג צבע / טיח</TableHead>
                            <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">עלות למ"ר</TableHead>
                            <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">מחיר למ"ר</TableHead>
                            <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">רווח למ"ר</TableHead>
                            <TableHead className="py-5 px-4 text-center font-black text-slate-800 text-base">פעולות</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {(() => {
                            const nameOf = (it) => (it.itemName || it.paintName || it.plasterName || '').toString();
                            const isPaint = (it) => it.workCategory === 'paint' || (!!it.paintType && !it.plasterType);
                            const isPlaster = (it) => it.workCategory === 'plaster' || !!it.plasterType;

                            const paintGroup = [...currentPaintItemsFiltered]
                                .filter(isPaint)
                                .sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'he'));
                            const plasterGroup = [...currentPaintItemsFiltered]
                                .filter(isPlaster)
                                .sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'he'));

                            return (
                                <>
                                  {paintGroup.length > 0 && (
                                    <>
                                      <TableRow className="bg-blue-50/70">
                                        <TableCell colSpan={6} className="text-right font-bold text-blue-800">צבע</TableCell>
                                      </TableRow>
                                      {paintGroup.map(item => {
                                        // ✅ תמיד להשתמש בערכים השמורים מהטופס (מתחתית הטופס)
                                        const costPerMeter = Number(item.averageCostPerMeter || 0);
                                        const pricePerMeter = Number(item.averageCustomerPrice || 0);
                                        const profitPerMeter = Number(item.averageProfitPerMeter || 0);

                                        let displayName = item.itemName ? item.itemName.replace('עבודת צבע ', '').trim() : (item.paintName || 'צבע');
                                        const itemTypeDisplay = "צבע";
                                        const rowClass = "bg-blue-50/50 hover:bg-blue-100/60";

                                        return (
                                          <TableRow key={item.id} className={rowClass}>
                                            <TableCell className="py-4 px-4 text-right">
                                              <div className="font-semibold text-gray-800 flex items-center gap-2">
                                                <Palette className="w-4 h-4 text-blue-600" />
                                                {displayName}
                                              </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-center font-medium text-gray-600">{itemTypeDisplay}</TableCell>
                                            {/* עלות למ"ר - שינוי לצבע אדום עדין */}
                                            <TableCell className="py-4 px-4 text-center font-bold text-rose-600">
                                                {formatPrice(costPerMeter)}
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-center font-bold text-lg text-indigo-600">{formatPrice(pricePerMeter)}</TableCell>
                                            <TableCell className={`py-4 px-4 text-center font-bold text-base ${profitPerMeter >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPrice(profitPerMeter)}</TableCell>
                                            <TableCell className="py-4 px-4 text-center">
                                              <div className="flex justify-center gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id, item.category)} className="text-red-600 hover:text-red-800 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </>
                                  )}

                                  {plasterGroup.length > 0 && (
                                    <>
                                      <TableRow className="bg-orange-50/70">
                                        <TableCell colSpan={6} className="text-right font-bold text-orange-800">שפכטל</TableCell>
                                      </TableRow>
                                      {plasterGroup.map(item => {
                                        // ✅ תמיד להשתמש בערכים השמורים מהטופס (מתחתית הטופס)
                                        const costPerMeter = Number(item.averageCostPerMeter || 0);
                                        const pricePerMeter = Number(item.averageCustomerPrice || 0);
                                        const profitPerMeter = Number(item.averageProfitPerMeter || 0);

                                        let displayName = item.itemName ? item.itemName.replace('עבודת טיח ', '').replace('עבודת שפכטל ', '').trim() : (item.plasterName || 'שפכטל');
                                        const itemTypeDisplay = "שפכטל";
                                        const rowClass = "bg-orange-50/50 hover:bg-orange-100/60";

                                        return (
                                          <TableRow key={item.id} className={rowClass}>
                                            <TableCell className="py-4 px-4 text-right">
                                              <div className="font-semibold text-gray-800 flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-orange-600" />
                                                {displayName}
                                              </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-center font-medium text-gray-600">{itemTypeDisplay}</TableCell>
                                            {/* עלות למ"ר - שינוי לצבע אדום עדין */}
                                            <TableCell className="py-4 px-4 text-center font-bold text-rose-600">
                                                {formatPrice(costPerMeter)}
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-center font-bold text-lg text-indigo-600">{formatPrice(pricePerMeter)}</TableCell>
                                            <TableCell className={`py-4 px-4 text-center font-bold text-base ${profitPerMeter >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPrice(profitPerMeter)}</TableCell>
                                            <TableCell className="py-4 px-4 text-center">
                                              <div className="flex justify-center gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id, item.category)} className="text-red-600 hover:text-red-800 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </>
                                  )}
                                </>
                            );
                        })()}
                        </TableBody>
                    </Table>
                    </>
                )}
            </CardContent>
        </Card>
    );

    // Removed: renderDemolitionTable function

    const renderLandingPage = () => {
        const cards = [
            {
                title: "מחירון צבע וטיח",
                description: "ניהול פריטי צבע, שפכטל וטיח",
                icon: <Paintbrush className="w-7 h-7 text-blue-500"/>,
                color: "blue",
                features: [
                    "חישוב מתקדם לפי כיסוי ושכבות",
                    "ניהול עלויות ציוד וחומרי עזר",
                    "חישוב רווח אוטומטי"
                ],
                buttonText: "התחל עם צבע וטיח",
                onClick: () => handleCategorySelect('paint_plaster')
            },
            {
                title: "מחירון ריצוף וחיפוי",
                description: "ניהול פריטי ריצוף, חיפוי וקרמיקה",
                icon: <Home className="w-7 h-7 text-orange-500"/>,
                color: "orange",
                features: [
                    "חישוב לפי דרכי עבודה שונות",
                    "ניהול בזבוז וחומרים נלווים",
                    "מחיר משתנה לפי כמויות"
                ],
                buttonText: "התחל עם ריצוף וחיפוי",
                onClick: () => handleCategorySelect('tiling')
            },
            {
                title: "הריסה ופינוי",
                description: "ניהול מחירי הריסות, פירוק, אלמנטים ופינוי פסולת",
                icon: <Trash2 className="w-7 h-7 text-red-500"/>,
                color: "red",
                features: [
                    "הגדרת עלויות לפי יחידות/מ\"ר",
                    "ניהול עלויות פינוי ופסולת",
                    "חישוב רווח אוטומטי"
                ],
                buttonText: "התחל עם הריסה ופינוי",
                onClick: () => handleCategorySelect('demolition_disposal')
            },
            // NEW CARD: Plumbing subcontractor pricing
            {
                title: "מחירון אינסטלציה - קבלן משנה",
                description: "ניהול פריטי אינסטלציה לקבלן משנה לפי תתי-קטגוריות",
                icon: <Wrench className="w-7 h-7 text-teal-500"/>,
                color: "teal",
                features: [
                    "תשתיות, סניטריה, חיבורים ואיטום",
                    "עלות קבלן + אחוז רווח",
                    "בחירה קלה להצעות מחיר"
                ],
                buttonText: "התחל עם אינסטלציה",
                onClick: () => handleCategorySelect('plumbing')
            },
            // NEW: חשמל — קבלן משנה
            {
                title: "מחירון חשמל — קבלן משנה",
                description: "ניהול פריטי חשמל לקבלן משנה לפי תתי-קטגוריות",
                icon: <Lightbulb className="w-7 h-7 text-yellow-500"/>,
                color: "yellow",
                features: [
                    "נקודות, תאורה, לוחות ותקשורת",
                    "עלות קבלן + אחוז רווח",
                    "בחירה מהירה להצעות מחיר"
                ],
                buttonText: "התחל עם חשמל",
                onClick: () => handleCategorySelect('electricity')
            },
            // NEW CARD: Construction subcontractor pricing
            {
                title: "מחירון בינוי — קבלן משנה",
                description: "ניהול פריטי בינוי/שלד/גבס לקבלן משנה לפי תתי-קטגוריות",
                icon: <ConstructionIcon className="w-7 h-7 text-amber-500"/>,
                color: "amber",
                features: [
                    "גבס, בלוקים, יציקות ואיטום",
                    "עלות קבלן + אחוז רווח",
                    "בחירה מהירה להצעות מחיר"
                ],
                buttonText: "התחל עם בינוי",
                onClick: () => handleCategorySelect('construction')
            }
        ];

        return (
            <div className="space-y-6" dir="rtl">
                <div className="text-center">
                    <div className="inline-block p-4 bg-indigo-100 rounded-2xl mb-4">
                        <Calculator className="w-10 h-10 text-indigo-600"/>
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">מחירון הקבלן האישי שלך</h1>
                    <p className="max-w-2xl mx-auto mt-3 text-lg text-gray-500">
                        ברוך הבא למרכז התמחור המתקדם שלך. כאן תוכל להזין, לעדכן ולנהל את כל פרטי העלויות והמחירים של הפרויקטים שלך.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto pt-4">
                    {cards.map((card, index) => (
                        <div key={index} onClick={card.onClick} className="cursor-pointer group">
                            <Card className={`h-full flex flex-col border-2 border-${card.color}-200/50 hover:border-${card.color}-400 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 bg-white rounded-2xl overflow-hidden`}>
                                <CardHeader className="pt-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="text-right">
                                            <CardTitle className="text-2xl font-bold text-gray-800">{card.title}</CardTitle>
                                            <CardDescription className="mt-2 text-gray-600">{card.description}</CardDescription>
                                        </div>
                                        <div className={`p-3 bg-${card.color}-100 rounded-2xl`}>{card.icon}</div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-between pt-0">
                                <ul className="space-y-2 text-right text-gray-700 my-4">
                                    {card.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-center gap-3"><Check className="w-4 h-4 text-green-500"/><span className="text-sm">{feature}</span></li>
                                    ))}
                                    </ul>
                                    <Button className={`w-full bg-${card.color}-500 hover:bg-${card.color}-600 text-lg font-bold py-4 rounded-xl shadow-lg group-hover:shadow-${card.color}-300 transition-all duration-300`}>
                                        {card.buttonText} <ArrowLeft className="mr-3 h-4 w-4 group-hover:mr-2 transition-all"/>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-6">
                    <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))}>
                        חזור לדשבורד <ArrowRight className="mr-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    };
    // --- End of render functions ---

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="relative z-10">
                {!activeTab && renderLandingPage()}

                {activeTab === 'tiling' && (
                    <div className="space-y-6">
                        <CategorySwitcher active="tiling" onSelectCategory={handleCategorySelect} />
                        <div className="px-4 md:px-6 lg:px-8 pt-8">
                            {renderTilingTable()}
                        </div>
                    </div>
                )}

                {activeTab === 'paint_plaster' && (
                    <div className="space-y-6">
                        <CategorySwitcher active="paint_plaster" onSelectCategory={handleCategorySelect} />
                        <div className="px-4 md:px-6 lg:px-8 pt-8">
                            {renderPaintTable()}
                        </div>
                    </div>
                )}

                {/* Removed: demolition_disposal render */}
            </div>
            <RoomEstimatesSettings isOpen={showRoomEstimatesSettings} onClose={handleCloseRoomEstimatesSettings} onSave={handleSaveRoomEstimates} />
            <TilingDefaultsSettings isOpen={showTilingDefaultsSettings} onClose={() => setShowTilingDefaultsSettings(false)} onSave={handleSaveTilingDefaults} initialDefaults={userTilingDefaults || {}} />

            {/* NEW: Split FAB for paint/plaster */}
            {activeTab === 'paint_plaster' && !showTilingDefaultsSettings && !showRoomEstimatesSettings && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            className="fixed bottom-8 left-8 z-50 h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 ease-in-out flex items-center justify-center"
                            aria-label="הוסף פריט צבע/שפכטל"
                        >
                            <Plus className="h-8 w-8" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        side="top"
                        align="start"
                        className="z-50 w-56 p-2 rounded-xl border border-blue-200 bg-white shadow-xl"
                    >
                        <div className="flex flex-col gap-2" dir="rtl">
                            <Button
                                className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleAddNewPaintItem('paint')}
                            >
                                <Paintbrush className="w-4 h-4" />
                                הוסף פריט צבע
                            </Button>
                            <Button
                                className="w-full justify-start gap-2 bg-gray-700 hover:bg-gray-800 text-white"
                                onClick={() => handleAddNewPaintItem('plaster')}
                            >
                                <Layers className="w-4 h-4" />
                                הוסף פריט שפכטל
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )}

            {/* Existing FAB only for tiling */}
            {activeTab === 'tiling' && !showTilingDefaultsSettings && !showRoomEstimatesSettings && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={handleAddNewTilingItem}
                                className={`fixed bottom-8 left-8 z-50 h-16 w-16 rounded-full bg-gradient-to-r ${getFabGradient()} text-white shadow-lg hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 ease-in-out flex items-center justify-center`}
                            >
                                <Plus className="h-8 w-8" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="bg-gray-800 text-white border-none">
                            <p>הוספת פריט ריצוף</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}
