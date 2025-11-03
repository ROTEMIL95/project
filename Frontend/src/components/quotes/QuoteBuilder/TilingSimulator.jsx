
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Calculator, Plus, Settings, Package, TrendingUp, Loader2 } from 'lucide-react'; // Added Package, TrendingUp, and Loader2
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from '@/components/utils/UserContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

import { calculatePanelCosts } from '@/components/costCalculator/PricingService'; // New import for panel calculation

export default function TilingSimulator({
    onAddToQuote,
    onItemAdd,
    categoryId,
    categoryTimings = {}, // Ensure default value to prevent undefined errors
    onCategoryTimingChange
}) {
  const { user } = useUser();
  // NEW: internal loading state
  const [isLoadingData, setIsLoadingData] = useState(true);

  // State עבור המסך הנוכחי - עריכה או סיכום
  const [view, setView] = useState('editor');

  // State עבור הגדרות, כולל הגדרות פאנל חדשות
  const [settings, setSettings] = useState({
    additionalCostFactor: 10, // עלות נלוות באחוזים
    laborRatePerHour: 70, // שכר עבודה לשעה
    profitMargin: 25, // אחוז רווח
    // הגדרות ספציפיות לפאנל
    panelMaterialCostPerMeter: 30, // עלות חומר פאנל למטר רץ
    panelLaborCostPerMeter: 15, // עלות עבודת פאנל למטר רץ
    panelProfitMargin: 25, // אחוז רווח על פאנל
    panelWorkCapacityPerDay: 8 // הספק התקנת פאנל ליום במטר רץ
  });

  // State עבור הגדרות פתוחות
  const [showSettings, setShowSettings] = useState(false);

  // State עבור המידע של החדרים והריצוף
  const [rooms, setRooms] = useState([
    {
      id: 'room1',
      name: 'סלון',
      area: 25,
      tileSize: '60x60',
      tileQuality: 'standard', // הוספת רמת איכות אריח
      installationType: 'regular',
      installationQuality: 'standard', // הוספת רמת איכות ביצוע
      surfaceCondition: 'regular',
      complexity: 'regular',
      needsLeveling: false,
      levelingArea: 0,
      levelingThickness: 'standard',
      notes: ''
    }
  ]);

  // State עבור פריטי קטלוג - לצורך מדרגות מחיר
  const [items, setItems] = useState([
    {
      id: 'tile_30x30',
      name: 'אריח 30x30',
      customerPrice: 140,
      priceTiers: [
        { minArea: 0, maxArea: 10, price: 140 },
        { minArea: 10, maxArea: 20, price: 130 },
        { minArea: 20, maxArea: Infinity, price: 120 }
      ]
    },
    {
      id: 'tile_45x45',
      name: 'אריח 45x45',
      customerPrice: 160,
      priceTiers: [
        { minArea: 0, maxArea: 10, price: 160 },
        { minArea: 10, maxArea: 20, price: 150 },
        { minArea: 20, maxArea: Infinity, price: 140 }
      ]
    },
    {
      id: 'tile_60x60',
      name: 'אריח 60x60',
      customerPrice: 190,
      priceTiers: [
        { minArea: 0, maxArea: 10, price: 190 },
        { minArea: 10, maxArea: 20, price: 180 },
        { minArea: 20, maxArea: Infinity, price: 170 }
      ]
    },
    {
      id: 'tile_80x80',
      name: 'אריח 80x80',
      customerPrice: 220,
      priceTiers: [
        { minArea: 0, maxArea: 10, price: 220 },
        { minArea: 10, maxArea: 20, price: 210 },
        { minArea: 20, maxArea: Infinity, price: 200 }
      ]
    },
    {
      id: 'tile_100x100',
      name: 'אריח 100x100',
      customerPrice: 250,
      priceTiers: [
        { minArea: 0, maxArea: 10, price: 250 },
        { minArea: 10, maxArea: 20, price: 240 },
        { minArea: 20, maxArea: Infinity, price: 230 }
      ]
    }
  ]);

  // New state variables for panel
  const [panelQuantities, setPanelQuantities] = useState({});
  const [panelCosts, setPanelCosts] = useState({});

  // טעינת הגדרות המשתמש
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true); // Set loading to true at the start
      try {
        if (user?.user_metadata?.tilingSettings) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ...user.user_metadata.tilingSettings
          }));
        }
      } catch (error) {
        console.error("Error loading tiling settings:", error);
      } finally {
        setIsLoadingData(false); // Set loading to false when done, regardless of success or failure
      }
    };

    loadData();
  }, [user]);

  // שמירת הגדרות המשתמש
  const handleSaveSettings = async () => {
    try {
      await supabase.auth.updateUser({
        data: {
          tilingSettings: settings
        }
      });
    } catch (error) {
      console.error("Error saving tiling settings:", error);
    }
  };

  // גדלי אריחים
  const tileSizes = [
    { id: '30x30', name: '30x30', price: 95, laborHours: 0.7 },
    { id: '45x45', name: '45x45', price: 120, laborHours: 0.6 },
    { id: '60x60', name: '60x60', price: 150, laborHours: 0.5 },
    { id: '80x80', name: '80x80', price: 180, laborHours: 0.45 },
    { id: '100x100', name: '100x100', price: 220, laborHours: 0.4 }
  ];

  // סוגי התקנה
  const installationTypes = [
    { id: 'regular', name: 'רגילה', factor: 1 },
    { id: 'diagonal', name: 'אלכסונית', factor: 1.3 },
    { id: 'pattern', name: 'בדוגמה', factor: 1.5 },
    { id: 'complex', name: 'מורכבת', factor: 1.7 }
  ];

  // מצב התשתית
  const surfaceConditions = [
    { id: 'regular', name: 'רגיל', factor: 1 },
    { id: 'uneven', name: 'לא ישר', factor: 1.2 },
    { id: 'damaged', name: 'פגום', factor: 1.4 },
    { id: 'extreme', name: 'במצב קיצוני', factor: 1.6 }
  ];

  // רמות מורכבות
  const complexityLevels = [
    { id: 'regular', name: 'רגילה', factor: 1 },
    { id: 'medium', name: 'בינונית', factor: 1.15 },
    { id: 'complex', name: 'מורכבת', factor: 1.3 }
  ];

  // סוגי פילוס
  const levelingTypes = [
    { id: 'standard', name: 'רגיל (עד 1 ס"מ)', price: 25 },
    { id: 'medium', name: 'בינוני (1-3 ס"מ)', price: 35 },
    { id: 'thick', name: 'עבה (3-5 ס"מ)', price: 50 }
  ];

  // סוגי חדרים
  const roomTypes = [
    { id: 'living', name: 'סלון', defaultArea: 25 },
    { id: 'bedroom', name: 'חדר שינה', defaultArea: 15 },
    { id: 'kitchen', name: 'מטבח', defaultArea: 12 },
    { id: 'bathroom', name: 'חדר אמבטיה', defaultArea: 8 },
    { id: 'toilet', name: 'שירותים', defaultArea: 4 },
    { id: 'hallway', name: 'מסדרון', defaultArea: 10 }
  ];

  // הוספת רמות איכות אריחים
  const tileQualities = [
    { id: 'basic', name: 'בסיסית', priceFactor: 0.8 },
    { id: 'standard', name: 'סטנדרטית', priceFactor: 1 },
    { id: 'premium', name: 'פרימיום', priceFactor: 1.4 },
    { id: 'luxury', name: 'יוקרתית', priceFactor: 2 }
  ];

  // הוספת רמות איכות ביצוע
  const installationQualities = [
    { id: 'basic', name: 'בסיסית', priceFactor: 0.85, timeFactor: 0.8 },
    { id: 'standard', name: 'סטנדרטית', priceFactor: 1, timeFactor: 1 },
    { id: 'premium', name: 'מקצועית', priceFactor: 1.3, timeFactor: 1.2 },
    { id: 'expert', name: 'מומחה', priceFactor: 1.6, timeFactor: 1.4 }
  ];

  // פונקציה לחישוב עלויות ריצוף לחדר
  const calculateRoomCost = (room) => {
    if (!room || !room.area) return { materialCost: 0, laborCost: 0, additionalCost: 0, totalCost: 0, totalPrice: 0, profit: 0, laborDays: 0 };

    // מצא את הפרטים של האריח
    const tileSize = tileSizes.find(t => t.id === room.tileSize);
    if (!tileSize) return { materialCost: 0, laborCost: 0, additionalCost: 0, totalCost: 0, totalPrice: 0, profit: 0, laborDays: 0 };

    // מצא את פרטי האיכות
    const tileQuality = tileQualities.find(q => q.id === room.tileQuality) || tileQualities[1]; // default to standard
    const installationQuality = installationQualities.find(q => q.id === room.installationQuality) || installationQualities[1]; // default to standard

    // חישוב עלות חומרים מותאמת לאיכות
    const materialCost = room.area * tileSize.price * tileQuality.priceFactor;

    // מקדמי עלות נוספים
    const installationType = installationTypes.find(t => t.id === room.installationType);
    const surfaceCondition = surfaceConditions.find(c => c.id === room.surfaceCondition);
    const complexity = complexityLevels.find(c => c.id === room.complexity);

    // חישוב שעות עבודה
    let laborHours = room.area * tileSize.laborHours;

    // התאמת שעות עבודה למקדמים
    if (installationType) laborHours *= installationType.factor;
    if (surfaceCondition) laborHours *= surfaceCondition.factor;
    if (complexity) laborHours *= complexity.factor;

    // התאמת שעות עבודה לאיכות ביצוע
    laborHours *= installationQuality.timeFactor;

    // חישוב עלות עבודה מותאמת לאיכות ביצוע
    const laborCost = laborHours * settings.laborRatePerHour * installationQuality.priceFactor;

    // חישוב עלות נלוות (דבק, רובה וכו')
    const additionalCost = materialCost * (settings.additionalCostFactor / 100);

    // חישוב עלות פילוס אם נדרש
    let levelingCost = 0;
    if (room.needsLeveling && room.levelingArea > 0) {
      const levelingType = levelingTypes.find(t => t.id === room.levelingThickness);
      if (levelingType) {
        levelingCost = room.levelingArea * levelingType.price;
      }
    }

    // חישוב עלות כוללת לקבלן
    const totalCost = materialCost + laborCost + additionalCost + levelingCost;

    // חישוב מחיר ללקוח על פי מדרגות מחיר אם קיימות
    let customerPrice = 0;

    // בדיקה אם יש מדרגות מחיר לאריח שנבחר
    const catalogItem = items.find(item => item.id === `tile_${room.tileSize}`);

    if (catalogItem && catalogItem.priceTiers && catalogItem.priceTiers.length > 0) {
      // מציאת מדרגת המחיר המתאימה לפי שטח החדר
      const appropriateTier = catalogItem.priceTiers.find(
        tier => room.area >= tier.minArea && room.area <= tier.maxArea
      ) || catalogItem.priceTiers[0]; // ברירת מחדל למדרגה הראשונה

      customerPrice = appropriateTier.price;
    } else {
      // אם אין מדרגות מחיר, השתמש במחיר הרגיל
      customerPrice = catalogItem ? catalogItem.customerPrice : (totalCost * (1 + settings.profitMargin / 100));
    }

    // חישוב מחיר ללקוח על פי אחוז רווח
    const totalPrice = customerPrice;

    // חישוב רווח
    const profit = totalPrice - totalCost;

    // חישוב ימי עבודה (8 שעות ליום)
    const laborDays = laborHours / 8;

    return {
      materialCost: Math.round(materialCost),
      laborCost: Math.round(laborCost),
      additionalCost: Math.round(additionalCost),
      levelingCost: Math.round(levelingCost),
      totalCost: Math.round(totalCost),
      totalPrice: Math.round(totalPrice),
      profit: Math.round(profit),
      profitPercentage: Math.round((profit / totalPrice) * 100),
      laborHours: Math.round(laborHours * 10) / 10,
      laborDays: Math.round(laborDays * 10) / 10,
      tileQualityName: tileQuality.name,
      installationQualityName: installationQuality.name
    };
  };

  // פונקציה לחישוב עלות כוללת
  const calculateTotalCost = () => {
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let totalAdditionalCost = 0;
    let totalLevelingCost = 0;
    let totalArea = 0;
    let totalLaborHours = 0;

    rooms.forEach(room => {
      const { materialCost, laborCost, additionalCost, levelingCost, laborHours } = calculateRoomCost(room);
      totalMaterialCost += materialCost;
      totalLaborCost += laborCost;
      totalAdditionalCost += additionalCost;
      totalLevelingCost += levelingCost;
      totalArea += room.area;
      totalLaborHours += laborHours;
    });

    const totalCost = totalMaterialCost + totalLaborCost + totalAdditionalCost + totalLevelingCost;
    const totalPrice = totalCost * (1 + settings.profitMargin / 100);
    const profit = totalPrice - totalCost;
    const laborDays = totalLaborHours / 8;

    return {
      totalMaterialCost,
      totalLaborCost,
      totalAdditionalCost,
      totalLevelingCost,
      totalCost,
      totalPrice,
      profit,
      profitPercentage: Math.round((profit / totalPrice) * 100),
      totalArea,
      laborDays: Math.round(laborDays * 10) / 10
    };
  };

  // פונקציה חדשה לטיפול בשינוי כמות פאנל
  const handlePanelQuantityChange = (roomId, quantity) => {
    const numQuantity = Number(quantity) || 0;

    setPanelQuantities(prev => ({
      ...prev,
      [roomId]: numQuantity
    }));

    // חישוב עלויות פאנל באופן מיידי
    if (numQuantity > 0) {
      // Pass relevant settings for panel calculation
      const panelCalculation = calculatePanelCosts({
        panelMaterialCostPerMeter: settings.panelMaterialCostPerMeter,
        panelLaborCostPerMeter: settings.panelLaborCostPerMeter,
        panelProfitMargin: settings.panelProfitMargin,
        panelWorkCapacityPerDay: settings.panelWorkCapacityPerDay,
        profitMargin: settings.profitMargin // Pass global profit margin for consistency
      }, numQuantity);

      setPanelCosts(prev => ({
        ...prev,
        [roomId]: panelCalculation
      }));
    } else {
      // אם הכמות 0 או ריקה, נמחק את החישוב
      setPanelCosts(prev => {
        const newCosts = { ...prev };
        delete newCosts[roomId];
        return newCosts;
      });
    }
  };

  // פונקציה לחישוב סיכום פאנל כולל
  const calculateTotalPanelCosts = () => {
    let totalPanelCost = 0;
    let totalPanelSellingPrice = 0;
    let totalPanelProfit = 0;
    let totalPanelWorkDays = 0;

    Object.values(panelCosts).forEach(panelCalc => {
      if (panelCalc && panelCalc.isValid) {
        totalPanelCost += panelCalc.totalCost;
        totalPanelSellingPrice += panelCalc.sellingPrice;
        totalPanelProfit += panelCalc.profit;
        totalPanelWorkDays += panelCalc.workDaysNeeded || 0;
      }
    });

    return {
      totalCost: totalPanelCost,
      totalSellingPrice: totalPanelSellingPrice,
      totalProfit: totalPanelProfit,
      totalProfitPercent: totalPanelCost > 0 ? (totalPanelProfit / totalPanelCost) * 100 : 0,
      totalWorkDays: totalPanelWorkDays
    };
  };

  // פונקציה להוספת חדר
  const handleAddRoom = () => {
    const newId = `room${rooms.length + 1}`;
    setRooms([...rooms, {
      id: newId,
      name: 'חדר חדש',
      area: 15,
      tileSize: '60x60',
      tileQuality: 'standard',
      installationType: 'regular',
      installationQuality: 'standard',
      surfaceCondition: 'regular',
      complexity: 'regular',
      needsLeveling: false,
      levelingArea: 0,
      levelingThickness: 'standard',
      notes: ''
    }]);
  };

  // פונקציה לעדכון חדר
  const handleUpdateRoom = (index, field, value) => {
    const updatedRooms = [...rooms];
    updatedRooms[index] = { ...updatedRooms[index], [field]: value };

    // אם מעדכנים את שטח החדר, מעדכנים גם את שטח הפילוס אם נדרש
    if (field === 'area' && updatedRooms[index].needsLeveling) {
      updatedRooms[index].levelingArea = Math.min(value, updatedRooms[index].levelingArea);
    }

    setRooms(updatedRooms);
  };

  // פונקציה לבחירת סוג חדר
  const handleSelectRoomType = (index, roomTypeId) => {
    const roomType = roomTypes.find(r => r.id === roomTypeId);
    if (roomType) {
      const updatedRooms = [...rooms];
      updatedRooms[index] = {
        ...updatedRooms[index],
        name: roomType.name,
        area: roomType.defaultArea
      };
      setRooms(updatedRooms);
    }
  };

  // עדכון הפונקציה הקיימת של שמירה להצעה כדי לכלול את נתוני הפאנל
  const handleSaveToQuote = () => { // Renamed from handleSubmit
    const tilingItems = rooms.map(room => {
      const { totalPrice, totalCost, laborDays, profitPercentage } = calculateRoomCost(room);
      const panelQuantity = panelQuantities[room.id] || 0;
      const panelCalculation = panelCosts[room.id];

      return {
        id: room.id,
        name: `ריצוף ${room.name}`,
        description: `ריצוף ${room.tileSize} - ${installationTypes.find(t => t.id === room.installationType)?.name || 'רגיל'}`,
        size: room.tileSize,
        area: room.area,
        quantity: room.area, // Quantity for main tiling is area
        unitPrice: Math.round(totalPrice / room.area),
        totalPrice, // Selling price for tiling
        totalCost, // Contractor cost for tiling
        laborDurationDays: laborDays,
        profitPercentage,
        complexity: complexityLevels.find(c => c.id === room.complexity)?.name || 'רגילה',
        additionalDetails: {
          surfaceCondition: surfaceConditions.find(c => c.id === room.surfaceCondition)?.name || 'רגיל',
          needsLeveling: room.needsLeveling,
          levelingArea: room.levelingArea,
          levelingThickness: levelingTypes.find(t => t.id === room.levelingThickness)?.name || 'רגיל',
          notes: room.notes
        },
        hasPanel: true, // Assuming all rooms can have a panel
        panelQuantity: panelQuantity,
        panelCosts: panelCalculation && panelCalculation.isValid ? {
            totalCost: panelCalculation.totalCost,
            sellingPrice: panelCalculation.sellingPrice,
            profit: panelCalculation.profit,
            profitPercent: panelCalculation.profitPercent,
            workDaysNeeded: panelCalculation.workDaysNeeded,
            calculations: panelCalculation.calculations,
        } : null
      };
    });

    const panelTotals = calculateTotalPanelCosts();
    const tilingTotals = calculateTotalCost(); // Get existing tiling totals

    if (onAddToQuote) { // Using the original prop name
      // Constructing an object that combines all relevant data for the quote
      onAddToQuote({
        rooms: tilingItems, // Detailed info for each room (tiling + panel)
        overallTilingCost: tilingTotals.totalCost,
        overallTilingPrice: tilingTotals.totalPrice,
        overallPanelCost: panelTotals.totalCost,
        overallPanelPrice: panelTotals.totalSellingPrice,
        overallProfit: (tilingTotals.totalPrice + panelTotals.totalSellingPrice) - (tilingTotals.totalCost + panelTotals.totalCost),
        overallProfitPercentage: (tilingTotals.totalCost + panelTotals.totalCost) > 0 ? (((tilingTotals.totalPrice + panelTotals.totalSellingPrice) - (tilingTotals.totalCost + panelTotals.totalCost)) / (tilingTotals.totalCost + panelTotals.totalCost)) * 100 : 0
      });
    }
  };

  // החלפה בין מצבי תצוגה
  const toggleView = () => {
    setView(view === 'editor' ? 'summary' : 'editor');
  };

  // NEW: Show subtle loading indicator while data loads
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-600">טוען נתוני ריצוף וחיפוי...</p>
        </div>
      </div>
    );
  }

  // רינדור החלק העיקרי של הקומפוננטה
  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">סימולטור ריצוף</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 ml-2" />
            הגדרות
          </Button>
          <Button variant="outline" onClick={toggleView}>
            {view === 'editor' ? 'הצג סיכום' : 'חזור לעריכה'}
          </Button>
        </div>
      </div>

      {/* תאריכי עבודה לקטגוריה - זהה לקטגורית צבע */}
      <div className="bg-gray-50/50 p-4 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">תזמון עבודה לקטגוריה</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">תאריך התחלה</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <div className={cn(
                              "w-full p-3 border-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-50",
                              "flex items-center justify-between bg-white",
                              // צבע הגבול לפי בחירת תאריך
                              categoryTimings[categoryId]?.startDate
                                  ? "border-green-400 bg-green-50/30"
                                  : "border-red-400 bg-red-50/30"
                          )}>
                              <span className={cn(
                                  "text-sm",
                                  categoryTimings[categoryId]?.startDate
                                      ? "text-gray-900 font-medium"
                                      : "text-gray-500"
                              )}>
                                  {categoryTimings[categoryId]?.startDate
                                      ? format(new Date(categoryTimings[categoryId].startDate), 'dd/MM/yyyy', { locale: he })
                                      : "dd.mm.yyyy"
                                  }
                              </span>
                              <Calendar className="h-4 w-4 text-gray-400" />
                          </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                              mode="single"
                              selected={categoryTimings[categoryId]?.startDate ? new Date(categoryTimings[categoryId].startDate) : undefined}
                              onSelect={(date) => onCategoryTimingChange(categoryId, 'startDate', date)}
                              initialFocus
                              dir="rtl"
                          />
                      </PopoverContent>
                  </Popover>
              </div>

              <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">תאריך סיום</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <div className={cn(
                              "w-full p-3 border-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-50",
                              "flex items-center justify-between bg-white",
                              // צבע הגבול לפי בחירת תאריך
                              categoryTimings[categoryId]?.endDate
                                  ? "border-green-400 bg-green-50/30"
                                  : "border-red-400 bg-red-50/30"
                          )}>
                              <span className={cn(
                                  "text-sm",
                                  categoryTimings[categoryId]?.endDate
                                      ? "text-gray-900 font-medium"
                                      : "text-gray-500"
                              )}>
                                  {categoryTimings[categoryId]?.endDate
                                      ? format(new Date(categoryTimings[categoryId].endDate), 'dd/MM/yyyy', { locale: he })
                                      : "dd.mm.yyyy"
                                  }
                              </span>
                              <Calendar className="h-4 w-4 text-gray-400" />
                          </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                              mode="single"
                              selected={categoryTimings[categoryId]?.endDate ? new Date(categoryTimings[categoryId].endDate) : undefined}
                              onSelect={(date) => onCategoryTimingChange(categoryId, 'endDate', date)}
                              initialFocus
                              dir="rtl"
                          />
                      </PopoverContent>
                  </Popover>
              </div>
          </div>
      </div>

      {view === 'editor' ? (
        <div className="space-y-4">
          {rooms.map((room, index) => (
            <Card key={room.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex justify-between">
                  <CardTitle>חדר {index + 1}: {room.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Tabs defaultValue="basics">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="basics">נתונים בסיסיים</TabsTrigger>
                    <TabsTrigger value="advanced">הגדרות מתקדמות</TabsTrigger>
                    <TabsTrigger value="summary">סיכום עלויות</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basics" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>סוג החדר</Label>
                        <Select
                          value={roomTypes.find(r => r.name === room.name)?.id || ''}
                          onValueChange={(value) => handleSelectRoomType(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר סוג חדר" />
                          </SelectTrigger>
                          <SelectContent>
                            {roomTypes.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name} ({type.defaultArea} מ"ר)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>שטח (מ"ר)</Label>
                        <Input
                          type="number"
                          value={room.area}
                          onChange={(e) => handleUpdateRoom(index, 'area', Number(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>גודל אריח</Label>
                        <Select
                          value={room.tileSize}
                          onValueChange={(value) => handleUpdateRoom(index, 'tileSize', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר גודל אריח" />
                          </SelectTrigger>
                          <SelectContent>
                            {tileSizes.map(size => (
                              <SelectItem key={size.id} value={size.id}>
                                {size.name} - {size.price} ₪ למ"ר
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>רמת איכות אריח</Label>
                        <Select
                          value={room.tileQuality}
                          onValueChange={(value) => handleUpdateRoom(index, 'tileQuality', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר רמת איכות" />
                          </SelectTrigger>
                          <SelectContent>
                            {tileQualities.map(quality => (
                              <SelectItem key={quality.id} value={quality.id}>
                                {quality.name} ({quality.priceFactor * 100}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>רמת איכות ביצוע</Label>
                        <Select
                          value={room.installationQuality}
                          onValueChange={(value) => handleUpdateRoom(index, 'installationQuality', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר רמת ביצוע" />
                          </SelectTrigger>
                          <SelectContent>
                            {installationQualities.map(quality => (
                              <SelectItem key={quality.id} value={quality.id}>
                                {quality.name} ({quality.priceFactor * 100}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>סוג התקנה</Label>
                        <Select
                          value={room.installationType}
                          onValueChange={(value) => handleUpdateRoom(index, 'installationType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר סוג התקנה" />
                          </SelectTrigger>
                          <SelectContent>
                            {installationTypes.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name} ({type.factor * 100}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>מצב התשתית</Label>
                        <Select
                          value={room.surfaceCondition}
                          onValueChange={(value) => handleUpdateRoom(index, 'surfaceCondition', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר מצב משטח" />
                          </SelectTrigger>
                          <SelectContent>
                            {surfaceConditions.map(condition => (
                              <SelectItem key={condition.id} value={condition.id}>
                                {condition.name} ({condition.factor * 100}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>רמת מורכבות</Label>
                        <Select
                          value={room.complexity}
                          onValueChange={(value) => handleUpdateRoom(index, 'complexity', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר רמת מורכבות" />
                          </SelectTrigger>
                          <SelectContent>
                            {complexityLevels.map(level => (
                              <SelectItem key={level.id} value={level.id}>
                                {level.name} ({level.factor * 100}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            id={`leveling-${room.id}`}
                            checked={room.needsLeveling}
                            onCheckedChange={(checked) => handleUpdateRoom(index, 'needsLeveling', checked)}
                          />
                          <Label htmlFor={`leveling-${room.id}`}>נדרש פילוס רצפה</Label>
                        </div>

                        {room.needsLeveling && (
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-2">
                              <Label>שטח לפילוס (מ"ר)</Label>
                              <Input
                                type="number"
                                value={room.levelingArea}
                                onChange={(e) => handleUpdateRoom(index, 'levelingArea', Math.min(Number(e.target.value), room.area))}
                                max={room.area}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>עובי פילוס</Label>
                              <Select
                                value={room.levelingThickness}
                                onValueChange={(value) => handleUpdateRoom(index, 'levelingThickness', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר עובי פילוס" />
                                </SelectTrigger>
                                <SelectContent>
                                  {levelingTypes.map(type => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name} - {type.price} ₪ למ"ר
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <Label>הערות</Label>
                        <Input
                          value={room.notes}
                          onChange={(e) => handleUpdateRoom(index, 'notes', e.target.value)}
                          placeholder="הערות נוספות לריצוף בחדר זה"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="summary">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-md">
                          <div className="text-sm text-gray-500">עלות חומרים</div>
                          <div className="text-xl font-medium">
                            {calculateRoomCost(room).materialCost} ₪
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <div className="text-sm text-gray-500">עלות עבודה</div>
                          <div className="text-xl font-medium">
                            {calculateRoomCost(room).laborCost} ₪
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-md">
                          <div className="text-sm text-gray-500">חומרים נלווים</div>
                          <div className="text-xl font-medium">
                            {calculateRoomCost(room).additionalCost} ₪
                          </div>
                        </div>

                        {room.needsLeveling && (
                          <div className="bg-gray-50 p-3 rounded-md">
                            <div className="text-sm text-gray-500">עלות פילוס</div>
                            <div className="text-xl font-medium">
                              {calculateRoomCost(room).levelingCost} ₪
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <div className="text-sm text-gray-500">איכות אריח</div>
                            <div className="text-base font-medium">
                              {calculateRoomCost(room).tileQualityName}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <div className="text-sm text-gray-500">איכות ביצוע</div>
                            <div className="text-base font-medium">
                              {calculateRoomCost(room).installationQualityName}
                            </div>
                          </div>
                        </div>

                        <div className={`bg-blue-50 p-3 rounded-md ${room.needsLeveling ? 'col-span-2' : ''}`}>
                          <div className="text-sm text-blue-600">סה"כ עלות לקבלן</div>
                          <div className="text-xl font-medium text-blue-700">
                            {calculateRoomCost(room).totalCost} ₪
                          </div>
                        </div>

                        <div className="bg-green-50 p-3 rounded-md col-span-2">
                          <div className="text-sm text-green-600">מחיר ללקוח</div>
                          <div className="text-2xl font-medium text-green-700">
                            {calculateRoomCost(room).totalPrice} ₪
                          </div>
                          <div className="text-sm text-green-600">
                            ({calculateRoomCost(room).profitPercentage}% רווח)
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-md col-span-2">
                          <div className="text-sm text-gray-500">זמן עבודה משוער</div>
                          <div className="text-xl font-medium">
                            {calculateRoomCost(room).laborHours} שעות
                            ({calculateRoomCost(room).laborDays} ימי עבודה)
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            onClick={handleAddRoom}
            className="w-full"
          >
            <Plus className="h-4 w-4 ml-2" />
            הוסף חדר נוסף
          </Button>
        </div>
      ) : (
        // תצוגת סיכום - This section is replaced by the new detailed calculation UI
        <Card className="bg-white shadow-lg border-2 border-indigo-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <CardTitle className="text-xl font-bold text-indigo-800 flex items-center">
              <Calculator className="w-6 h-6 ml-2" />
              חישוב עלויות מפורט
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {rooms.map((room) => { // Iterate over rooms, which are the 'selected items' for this view
                const roomCalculations = calculateRoomCost(room);
                const panelQuantity = panelQuantities[room.id] || 0;
                const panelCalculation = panelCosts[room.id];
                const hasPanelSupport = true; // Assuming all rooms can have a panel

                return (
                  <div key={room.id} className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">{room.name} ({room.area} מ"ר)</h3>
                      <div className="text-lg font-semibold text-green-700">
                        {roomCalculations.totalPrice} ₪
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 mb-4">
                        <div>
                            <span className="font-medium">גודל אריח:</span> {room.tileSize}
                        </div>
                        <div>
                            <span className="font-medium">איכות אריח:</span> {roomCalculations.tileQualityName}
                        </div>
                        <div>
                            <span className="font-medium">איכות ביצוע:</span> {roomCalculations.installationQualityName}
                        </div>
                        <div>
                            <span className="font-medium">ימי עבודה (ריצוף):</span> {roomCalculations.laborDays}
                        </div>
                    </div>
                    <Separator className="my-4" />

                    {/* הוספת מקטע פאנל */}
                    {hasPanelSupport && (
                      <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                        <h4 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
                          <Package className="w-5 h-5 ml-2" />
                          פאנל לריצוף
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor={`panel-${room.id}`} className="text-sm font-medium text-orange-700">
                              כמות פאנל (מטר רץ)
                            </Label>
                            <Input
                              id={`panel-${room.id}`}
                              type="number"
                              min="0"
                              step="0.1"
                              value={panelQuantities[room.id] || ''}
                              onChange={(e) => handlePanelQuantityChange(room.id, e.target.value)}
                              className="mt-1 border-orange-300 focus:border-orange-500"
                              placeholder="הכנס כמות במטר רץ"
                            />
                          </div>

                          {panelQuantity > 0 && panelCalculation && panelCalculation.isValid && (
                            <div className="bg-white p-3 rounded-lg border border-orange-300">
                              <div className="text-sm text-orange-700">
                                <div className="flex justify-between">
                                  <span>עלות לקבלן:</span>
                                  <span className="font-bold">{panelCalculation.totalCost.toLocaleString()} ₪</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>מחיר ללקוח:</span>
                                  <span className="font-bold text-green-600">{panelCalculation.sellingPrice.toLocaleString()} ₪</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>רווח:</span>
                                  <span className="font-bold text-blue-600">
                                    {panelCalculation.profit.toLocaleString()} ₪ ({panelCalculation.profitPercent}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {panelQuantity > 0 && panelCalculation && panelCalculation.isValid && (
                          <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
                            <details className="cursor-pointer">
                              <summary className="text-sm font-medium text-orange-800 hover:text-orange-600">
                                פירוט חישוב פאנל (לחץ לפתיחה)
                              </summary>
                              <div className="mt-3 text-xs text-gray-600 space-y-1">
                                {panelCalculation.calculations?.materialCostFormula && <div><strong>חומרים:</strong> {panelCalculation.calculations.materialCostFormula}</div>}
                                {panelCalculation.calculations?.laborCostFormula && <div><strong>עבודה:</strong> {panelCalculation.calculations.laborCostFormula}</div>}
                                {panelCalculation.workDaysNeeded !== undefined && <div><strong>ימי עבודה:</strong> {panelCalculation.workDaysNeeded} ימים</div>}
                                {panelCalculation.settings && <div><strong>הגדרות:</strong> הספק {panelCalculation.settings.panelLaborWorkCapacity} מ"ר/יום, ניצול {panelCalculation.settings.panelUtilizationPercent}%</div>}
                              </div>
                            </details>
                          </div>
                        )}

                        {panelQuantity > 0 && panelCalculation && !panelCalculation.isValid && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                              <strong>שגיאה בחישוב פאנל:</strong> {panelCalculation.error}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* סיכום כולל עם פאנל */}
              <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
                <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                  <TrendingUp className="w-6 h-6 ml-2" />
                  סיכום כולל (כולל פאנל)
                </h3>

                {(() => {
                  const panelTotals = calculateTotalPanelCosts();
                  const tilingTotals = calculateTotalCost(); // Get existing tiling totals

                  const grandTotalCost = tilingTotals.totalCost + panelTotals.totalCost;
                  const grandTotalSellingPrice = tilingTotals.totalPrice + panelTotals.totalSellingPrice;
                  const grandTotalProfit = grandTotalSellingPrice - grandTotalCost;
                  const grandTotalProfitPercent = grandTotalCost > 0 ? (grandTotalProfit / grandTotalCost) * 100 : 0;
                  const grandTotalLaborDays = tilingTotals.laborDays + panelTotals.totalWorkDays;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">עלות ריצוף לקבלן:</span>
                          <span className="font-bold text-lg">{tilingTotals.totalCost.toLocaleString()} ₪</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">עלות פאנל לקבלן:</span>
                          <span className="font-bold text-lg text-orange-600">+{panelTotals.totalCost.toLocaleString()} ₪</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-gray-800 font-medium">סה"כ עלות לקבלן:</span>
                          <span className="font-bold text-xl text-blue-600">{grandTotalCost.toLocaleString()} ₪</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">מחיר ריצוף ללקוח:</span>
                          <span className="font-bold text-lg">{tilingTotals.totalPrice.toLocaleString()} ₪</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">מחיר פאנל ללקוח:</span>
                          <span className="font-bold text-lg text-orange-600">+{panelTotals.totalSellingPrice.toLocaleString()} ₪</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-gray-800 font-medium">סה"כ מחיר ללקוח:</span>
                          <span className="font-bold text-xl text-green-600">{grandTotalSellingPrice.toLocaleString()} ₪</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-gray-800 font-medium">רווח כולל:</span>
                          <span className="font-bold text-xl text-purple-600">
                            {grandTotalProfit.toLocaleString()} ₪ ({grandTotalProfitPercent.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t text-sm">
                            <span className="text-gray-800 font-medium">ימי עבודה כוללים:</span>
                            <span className="font-bold text-base text-gray-600">
                                {grandTotalLaborDays.toFixed(1)} ימים
                            </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* כפתור שמירה מעודכן */}
              <div className="text-center pt-4">
                <Button
                  onClick={handleSaveToQuote} // Call the modified save function
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg"
                >
                  <Plus className="w-5 h-5 ml-2" />
                  הוסף להצעת מחיר (כולל פאנל)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* דיאלוג הגדרות */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הגדרות סימולטור ריצוף</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>אחוז עלויות נלוות (%)</Label>
              <Input
                type="number"
                value={settings.additionalCostFactor}
                onChange={(e) => setSettings({
                  ...settings,
                  additionalCostFactor: Number(e.target.value)
                })}
              />
              <p className="text-xs text-gray-500">אחוז מעלות החומרים עבור דבק, רובה וכו'</p>
            </div>
            <div className="space-y-2">
              <Label>עלות עבודה לשעה (₪)</Label>
              <Input
                type="number"
                value={settings.laborRatePerHour}
                onChange={(e) => setSettings({
                  ...settings,
                  laborRatePerHour: Number(e.target.value)
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>אחוז רווח (%)</Label>
              <Input
                type="number"
                value={settings.profitMargin}
                onChange={(e) => setSettings({
                  ...settings,
                  profitMargin: Number(e.target.value)
                })}
              />
            </div>
            <Separator className="my-4" />
            <h3 className="text-lg font-medium">הגדרות פאנל</h3>
            <div className="space-y-2">
              <Label>עלות חומר פאנל למטר רץ (₪)</Label>
              <Input
                type="number"
                value={settings.panelMaterialCostPerMeter}
                onChange={(e) => setSettings({
                  ...settings,
                  panelMaterialCostPerMeter: Number(e.target.value)
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>עלות עבודת פאנל למטר רץ (₪)</Label>
              <Input
                type="number"
                value={settings.panelLaborCostPerMeter}
                onChange={(e) => setSettings({
                  ...settings,
                  panelLaborCostPerMeter: Number(e.target.value)
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>אחוז רווח פאנל (%)</Label>
              <Input
                type="number"
                value={settings.panelProfitMargin}
                onChange={(e) => setSettings({
                  ...settings,
                  panelProfitMargin: Number(e.target.value)
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>הספק התקנת פאנל ליום (מטר רץ)</Label>
              <Input
                type="number"
                value={settings.panelWorkCapacityPerDay}
                onChange={(e) => setSettings({
                  ...settings,
                  panelWorkCapacityPerDay: Number(e.target.value)
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              handleSaveSettings();
              setShowSettings(false);
            }}>
              שמור הגדרות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
