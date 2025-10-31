
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/components/utils/UserContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Info, ArrowDown, DollarSign, Clock, Loader2, Calculator, Building2, AlertCircle, Trash2, Save } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateQuoteItemPrice } from './PriceTierCalculator';
import ElectricalCategory from "./ElectricalCategory"; 

export default function ImprovedItemSelector({ 
  activeCategoryId, // Renamed from categoryId
  onAddItemToQuote, // Renamed from onAddItem
  onFinish,
  selectedItems, // New prop
  categoryTimings, // New prop
  onCategoryTimingChange, // New prop
  categoriesNav, // New prop
  onSelectCategory // New prop
}) {
  const { user, loading: userLoading } = useUser();
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('rooms');

  // קבוע הפחת שישמש רק בחישובים פנימיים, לא יוצג למשתמש
  const WASTAGE_PERCENTAGE = 10; 

  const initialRoom = {
    id: `room_${Date.now()}`,
    name: 'חדר לדוגמה',
    area: 10,
    complexityPercent: 0, // אחוז תוספת למחיר בגלל מורכבות
    complexityLevel: '', // רמת מורכבות (קל, בינוני, קשה)
    complexityDescription: '', // תיאור המורכבות
    selectedCatalogItemId: '',
    quantity: 0,
    // שדות חדשים עבור צביעה
    ceilingHeight: 2.7, // גובה תקרה במטרים (ברירת מחדל)
    paintLayers: 2, // מספר שכבות צבע (ברירת מחדל)
    additionalLayerPricePercent: 50, // אחוז תוספת מחיר לשכבה נוספת (ברירת מחדל)
    wallAreaAdjustmentFactor: 100, // מקדם התאמה לשטח קירות באחוזים (100% = שטח רצפה * גובה, ללא תיקון)
    useManualWallArea: false, // האם להשתמש בשטח קירות ידני או בחישוב אוטומטי
    manualWallArea: 0, // שטח קירות ידני שהוקלד על ידי המשתמש
    paintLayerSettings: [ // הגדרות מפורטות לשכבות צבע
      { layer: 1, pricePercent: 100 }, // שכבה ראשונה תמיד 100%
      { layer: 2, pricePercent: 50 }  // שכבה שנייה - ברירת מחדל 50%
    ]
  };

  const [rooms, setRooms] = useState([initialRoom]);
  const [addedQuoteItems, setAddedQuoteItems] = useState([]);

  // If the active category is "Electricity", render the ElectricalCategory component
  if (activeCategoryId === "cat_electricity") {
    return (
      <ElectricalCategory
        selectedItems={selectedItems}
        onAddItemToQuote={onAddItemToQuote}
        categoryId="cat_electricity" // This seems to be a fixed ID for the ElectricalCategory itself
        categoryTimings={categoryTimings}
        onCategoryTimingChange={onCategoryTimingChange}
        categoriesNav={categoriesNav}
        currentCategoryId={activeCategoryId} // This passes the actual current category
        onSelectCategory={onSelectCategory}
      />
    );
  }

  // יבוא נתוני קטלוג בטעינה ראשונית
  useEffect(() => {
    loadCatalogItems();
  }, [activeCategoryId, user]); // Use activeCategoryId and user here

  // פונקציה לטעינת פריטי קטלוג לפי קטגוריה
  const loadCatalogItems = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        setCatalogItems([]);
        setLoading(false);
        return;
      }
      
      let fetchedItems = [];
      switch (activeCategoryId) { // Use activeCategoryId here
        case 'cat_flooring':
        case 'cat_tiling':
          fetchedItems = user.user_metadata?.tilingItems || [];
          break;
        case 'cat_painting':
        case 'cat_paint_plaster':
          fetchedItems = user.user_metadata?.paintItems || [];
          break;
        default:
          fetchedItems = [];
      }
      setCatalogItems(fetchedItems);
    } catch (err) {
      console.error("Error loading catalog items:", err);
      setError("שגיאה בטעינת פריטי קטלוג");
    } finally {
      setLoading(false);
    }
  };
  
  // פונקציות לניהול חדרים
  const addNewRoom = () => {
    const newRoom = {
      ...initialRoom,
      id: `room_${Date.now()}`,
      name: `חדר ${rooms.length + 1}`,
    };
    setRooms(prevRooms => [...prevRooms, newRoom]);
  };

  // חישוב שטח קירות לצביעה
  const calculateWallPaintingArea = (room) => {
    if (room.useManualWallArea) {
      return parseFloat(room.manualWallArea) || 0;
    }
    
    const floorArea = parseFloat(room.area) || 0;
    const ceilingHeight = parseFloat(room.ceilingHeight) || 0;
    const adjustmentFactor = parseFloat(room.wallAreaAdjustmentFactor) || 100;
    
    // חישוב: שטח רצפה * גובה * מקדם התאמה (באחוזים)
    return floorArea * ceilingHeight * (adjustmentFactor / 100);
  };

  // עדכון שדה בחדר
  const updateRoomField = (roomId, field, value) => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.id === roomId) {
          const updatedRoom = { ...room, [field]: value };
          
          // אם שינינו את ה-complexityPercent ל-0, ננקה את שדות המורכבות האחרים
          if (field === 'complexityPercent' && Number(value) === 0) {
            updatedRoom.complexityLevel = '';
            updatedRoom.complexityDescription = '';
          }
          
          // יחידת מדידה של הפריט הנבחר
          const selectedCatalogItem = catalogItems.find(ci => ci.id === updatedRoom.selectedCatalogItemId);
          
          // אם שינינו את השטח וזה פריט שנמדד במ"ר, נחשב מחדש את הכמות
          if ((field === 'area' || field === 'ceilingHeight' || field === 'wallAreaAdjustmentFactor' || 
               field === 'useManualWallArea' || field === 'manualWallArea') 
              && selectedCatalogItem && selectedCatalogItem.unit === 'מ"ר') {
            // אם זו קטגוריית צבע, נחשב עם הפונקציה המיוחדת לחישוב שטח קירות
            if (activeCategoryId === 'cat_painting') { // Use activeCategoryId here
              updatedRoom.quantity = parseFloat(calculateWallPaintingArea(updatedRoom).toFixed(2));
            } else {
              // עבור ריצוף, נשתמש בחישוב שטח רגיל
              const areaValue = parseFloat(value) || 0;
              updatedRoom.quantity = parseFloat(areaValue.toFixed(2));
            }
          }
          
          // אם שינינו את הפריט הנבחר ויש שטח, נחשב את הכמות בהתאם
          if (field === 'selectedCatalogItemId') {
            const newSelectedCatalogItem = catalogItems.find(ci => ci.id === value);
            if (newSelectedCatalogItem && newSelectedCatalogItem.unit === 'מ"ר') {
              if (activeCategoryId === 'cat_painting') { // Use activeCategoryId here
                updatedRoom.quantity = parseFloat(calculateWallPaintingArea(updatedRoom).toFixed(2));
              } else {
                const areaValue = parseFloat(updatedRoom.area) || 0;
                updatedRoom.quantity = parseFloat(areaValue.toFixed(2));
              }
            } else if (value) {
              // אם זה לא מ"ר אבל יש פריט נבחר, כמות ברירת מחדל היא 1
              updatedRoom.quantity = 1; 
            }
          }
          return updatedRoom;
        }
        return room;
      })
    );
  };
  
  // פונקציה לניהול שכבות צבע
  const handlePaintLayerChange = (roomId, layerIndex, percentValue) => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.id === roomId) {
          const updatedSettings = [...room.paintLayerSettings];
          
          // אם זה אינדקס קיים, עדכן אותו
          if (updatedSettings[layerIndex]) {
            updatedSettings[layerIndex] = { 
              ...updatedSettings[layerIndex], 
              pricePercent: parseFloat(percentValue) || 0 
            };
          }
          
          return {
            ...room,
            paintLayerSettings: updatedSettings
          };
        }
        return room;
      })
    );
  };

  // הוספת/הסרת שכבות צבע
  const addPaintLayer = (roomId) => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.id === roomId) {
          const currentLayers = room.paintLayerSettings || [];
          const nextLayerNumber = currentLayers.length + 1;
          
          return {
            ...room,
            paintLayers: nextLayerNumber,
            paintLayerSettings: [
              ...currentLayers,
              { layer: nextLayerNumber, pricePercent: 50 } // ברירת מחדל 50% לשכבה חדשה
            ]
          };
        }
        return room;
      })
    );
  };
  
  const removePaintLayer = (roomId) => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.id === roomId && room.paintLayerSettings.length > 1) {
          const updatedSettings = [...room.paintLayerSettings];
          updatedSettings.pop(); // הסר את השכבה האחרונה
          
          return {
            ...room,
            paintLayers: updatedSettings.length,
            paintLayerSettings: updatedSettings
          };
        }
        return room;
      })
    );
  };
  
  // פונקציה למחיקת חדר
  const deleteRoom = (roomIdToDelete) => {
    if (rooms.length <= 1) {
      alert("לא ניתן למחוק את החדר האחרון.");
      return;
    }
    setRooms(prevRooms => prevRooms.filter(room => room.id !== roomIdToDelete));
    setAddedQuoteItems(prevItems => prevItems.filter(item => item.roomId !== roomIdToDelete));
  };

  // חישוב מחיר משוער לפי אחוז מורכבות
  const calculateEstimatedPrice = (room) => {
    const selectedCatalogItem = catalogItems.find(ci => ci.id === room.selectedCatalogItemId);
    if (!selectedCatalogItem) return null;
    
    const basePrice = selectedCatalogItem.customerPrice || 0;
    const complexityPercent = parseFloat(room.complexityPercent) || 0;
    
    return {
      original: basePrice,
      adjusted: Math.round(basePrice * (1 + complexityPercent / 100))
    };
  };

  // פונקציה לשמירת פריט בחדר
  const handleSaveRoomItem = (roomToSave) => {
    if (!roomToSave.selectedCatalogItemId) {
      alert("אנא בחר פריט מהקטלוג.");
      return;
    }

    const catalogItemDetails = catalogItems.find(ci => ci.id === roomToSave.selectedCatalogItemId);
    if (!catalogItemDetails) {
      alert("פריט קטלוג לא נמצא.");
      return;
    }
    
    // חישוב הכמות המוזנת בהתאם לסוג הפריט
    let enteredQuantity = 0;
    if (catalogItemDetails.unit === 'מ"ר') {
      if (activeCategoryId === 'cat_painting') { // Use activeCategoryId here
        enteredQuantity = parseFloat(calculateWallPaintingArea(roomToSave).toFixed(2));
      } else {
        enteredQuantity = parseFloat(roomToSave.area) || 0;
      }
    } else {
      enteredQuantity = parseFloat(roomToSave.quantity) || 0;
    }
    
    console.log(`[שמירת פריט] פרטי הפריט הנבחר:`, JSON.stringify(catalogItemDetails));
    console.log(`[שמירת פריט] כמות שהוזנה: ${enteredQuantity} ${catalogItemDetails.unit || 'יח'}`);

    if (enteredQuantity <= 0) {
      alert("כמות הפריט חייבת להיות גדולה מאפס. אנא הגדר שטח או כמות.");
      return;
    }

    // חישוב פקטור מורכבות
    const complexityPercent = parseFloat(roomToSave.complexityPercent) || 0;
    const complexityFactor = 1 + (complexityPercent / 100);
    
    // הכנת אופציות לחישוב המחיר
    const priceCalcOptions = {
      catalogItem: catalogItemDetails,
      quantity: enteredQuantity,
      complexityFactor,
      wastagePercent: activeCategoryId === 'cat_flooring' ? WASTAGE_PERCENTAGE : 0, // Use activeCategoryId here, פחת רק לריצוף
      paintLayers: roomToSave.paintLayerSettings // רלוונטי רק לצבע
    };
    
    // חישוב מחיר ונתונים נוספים באמצעות הפונקציה החדשה
    const calculationResult = calculateQuoteItemPrice(priceCalcOptions);
    
    // יצירת אובייקט הפריט להצעת המחיר
    const quoteItem = {
      id: `quote_item_${roomToSave.id}_${catalogItemDetails.id}_${Date.now()}`,
      catalogItemId: catalogItemDetails.id,
      description: catalogItemDetails.itemName || catalogItemDetails.tileName || catalogItemDetails.paintName || '(פריט ללא שם)',
      unit: catalogItemDetails.unit || "מ\"ר",
      quantity: calculationResult.finalQuantity,
      originalQuantity: enteredQuantity,
      unitPrice: calculationResult.unitPrice,
      originalUnitPrice: calculationResult.basePrice,
      totalPrice: calculationResult.totalPrice,
      categoryId: activeCategoryId, // Use activeCategoryId here
      roomId: roomToSave.id,
      roomName: roomToSave.name,
      
      // עלויות קבלן
      materialCost: calculationResult.materialCost,
      laborCost: calculationResult.laborCost,
      additionalCost: calculationResult.additionalCost,
      totalCost: calculationResult.totalCost,
      
      workDuration: calculationResult.workDays,
      profit: calculationResult.profit,
      
      // פרטי מורכבות
      complexityFactorApplied: complexityFactor,
      complexityPercent: roomToSave.complexityPercent,
      complexityLevel: roomToSave.complexityLevel,
      complexityDescription: roomToSave.complexityDescription,
      
      // מידע על מדרגות מחיר
      priceTiers: catalogItemDetails.priceTiers || [],
      selectedPriceTier: calculationResult.selectedPriceTier,
      
      // מידע נוסף אם רלוונטי
      wastagePercent: activeCategoryId === 'cat_flooring' ? WASTAGE_PERCENTAGE : 0 // Use activeCategoryId here
    };
    
    // הוספת הפריט להצעת המחיר (עם עדכון אם קיים כבר)
    setAddedQuoteItems(prev => {
      const existingIndex = prev.findIndex(item => 
        item.roomId === quoteItem.roomId && 
        item.catalogItemId === quoteItem.catalogItemId
      );
      
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = quoteItem;
        return updated;
      }
      return [...prev, quoteItem];
    });

    // קריאה לפונקציה שהועברה מהקומפוננטה האב
    onAddItemToQuote(quoteItem); // Use onAddItemToQuote here
    alert(`הפריט "${quoteItem.description}" נשמר עבור חדר "${quoteItem.roomName}"`);
  };

  // פונקציות חישוב סיכומים
  const calculateTotalArea = () => rooms.reduce((sum, room) => sum + (Number(room.area) || 0), 0);
  const calculateTotalMaterialCost = () => addedQuoteItems.reduce((sum, item) => sum + (item.materialCost || 0), 0);
  const calculateTotalLaborCost = () => addedQuoteItems.reduce((sum, item) => sum + (item.laborCost || 0), 0);
  const calculateTotalAdditionalCost = () => addedQuoteItems.reduce((sum, item) => sum + (item.additionalCost || 0), 0);
  const calculateTotalCostForContractor = () => calculateTotalMaterialCost() + calculateTotalLaborCost() + calculateTotalAdditionalCost();
  const calculateTotalRevenue = () => addedQuoteItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const calculateTotalProfit = () => calculateTotalRevenue() - calculateTotalCostForContractor();
  const calculateProfitPercentage = () => {
    const profit = calculateTotalProfit();
    const cost = calculateTotalCostForContractor();
    return cost > 0 ? (profit / cost) * 100 : 0;
  };
  const calculateTotalWorkDays = () => addedQuoteItems.reduce((sum, item) => sum + (item.workDuration || 0), 0);

  if (userLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-gray-600">טוען נתונים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-red-600 mb-1">{error}</h3>
        <p className="text-sm text-red-500">
          אנא נסה שוב מאוחר יותר או פנה לתמיכה.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-indigo-700">הגדרת פריטי {activeCategoryId === 'cat_flooring' ? 'ריצוף' : 'צבע'} להצעה</CardTitle>
          <CardDescription>
            עבור על השלבים הבאים כדי להגדיר את כל הפרטים הנדרשים עבור הצעת המחיר.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6 bg-indigo-50 p-1 rounded-lg">
              <TabsTrigger value="rooms" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md py-2 px-4 transition-all">
                <Building2 className="h-5 w-5 ml-2" />
                1. הגדרת חדרים ופריטים
              </TabsTrigger>
              <TabsTrigger value="summary" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md py-2 px-4 transition-all">
                <DollarSign className="h-5 w-5 ml-2" />
                2. סיכום ותמחור
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="rooms" className="space-y-6">
              <div className="pb-4 border-b">
                <h3 className="text-xl font-semibold text-gray-800">הגדר חדרים ובחר פריטים לכל חדר</h3>
              </div>
              
              <div className="space-y-6">
                {rooms.map(room => {
                  const selectedCatalogItem = catalogItems.find(ci => ci.id === room.selectedCatalogItemId);
                  const isSquareMeterItem = selectedCatalogItem?.unit === 'מ"ר';
                  const isPaintCategory = activeCategoryId === 'cat_painting'; // Use activeCategoryId here
                  
                  // חישוב מחיר משוער לפי אחוז תוספת המורכבות
                  const estimatedPrice = room.selectedCatalogItemId ? calculateEstimatedPrice(room) : null;

                  // חישוב שטח קירות אם זו קטגוריית צבע
                  const wallPaintingArea = isPaintCategory ? calculateWallPaintingArea(room) : 0;

                  return (
                    <Card key={room.id} className="border-gray-300 shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row justify-between items-center bg-gray-100 p-4 rounded-t-lg">
                        <div className="flex-grow">
                          <Label htmlFor={`roomName-${room.id}`} className="block text-sm text-gray-500 mb-1">שם החדר</Label>
                          <Input 
                            id={`roomName-${room.id}`}
                            value={room.name}
                            onChange={(e) => updateRoomField(room.id, 'name', e.target.value)}
                            className="border bg-white"
                            placeholder="הכנס שם לחדר"
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteRoom(room.id)}
                          className="text-red-500 hover:bg-red-100"
                          disabled={rooms.length <= 1}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {/* בחירת פריט */}
                        <div>
                          <Label htmlFor={`roomCatalogItem-${room.id}`}>
                            בחר {activeCategoryId === 'cat_flooring' ? 'ריצוף' : 'סוג צבע'} לחדר זה
                          </Label>
                          <Select
                            value={room.selectedCatalogItemId}
                            onValueChange={(value) => updateRoomField(room.id, 'selectedCatalogItemId', value)}
                          >
                            <SelectTrigger id={`roomCatalogItem-${room.id}`} className="w-full">
                              <SelectValue 
                                placeholder={`בחר ${activeCategoryId === 'cat_flooring' ? 'ריצוף' : 'סוג צבע'}...`} 
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogItems.length === 0 && (
                                <SelectItem value={null} disabled>אין פריטים בקטלוג לקטגוריה זו</SelectItem>
                              )}
                              {catalogItems.map(catItem => (
                                <SelectItem key={catItem.id} value={catItem.id}>
                                  {catItem.itemName || catItem.tileName || catItem.paintName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedCatalogItem && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-md">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>יחידת מידה: {selectedCatalogItem.unit || 'יחידה'}</span>
                                {isSquareMeterItem && (
                                  <span>* כמות תחושב על בסיס השטח</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* שדות חישוב שטח קירות לצביעה בקטגוריית צבע */}
                        {isPaintCategory && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-blue-800">
                                חישוב שטח קירות לצביעה
                              </h4>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <Info className="h-5 w-5 text-blue-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-md p-4 bg-white shadow-lg border">
                                  <div className="space-y-2 text-right">
                                    <h5 className="font-medium text-lg mb-1">מידע על חישוב שטח קירות</h5>
                                    <p className="text-sm">
                                      החישוב האוטומטי (שטח רצפה × גובה התקרה) הוא קירוב שיכול לכלול סטיות 
                                      בהשוואה לשטח הקירות האמיתי.
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            {/* אפשרות בחירה בין חישוב אוטומטי או הזנה ידנית */}
                            <div className="flex gap-4">
                              <div className="flex items-center">
                                <input 
                                  type="radio" 
                                  id={`autoWallArea-${room.id}`} 
                                  name={`wallAreaCalcMethod-${room.id}`}
                                  checked={!room.useManualWallArea}
                                  onChange={() => updateRoomField(room.id, 'useManualWallArea', false)}
                                  className="ml-2"
                                />
                                <label htmlFor={`autoWallArea-${room.id}`}>חישוב אוטומטי</label>
                              </div>
                              <div className="flex items-center">
                                <input 
                                  type="radio" 
                                  id={`manualWallArea-${room.id}`} 
                                  name={`wallAreaCalcMethod-${room.id}`}
                                  checked={room.useManualWallArea}
                                  onChange={() => updateRoomField(room.id, 'useManualWallArea', true)}
                                  className="ml-2"
                                />
                                <label htmlFor={`manualWallArea-${room.id}`}>הזנה ידנית</label>
                              </div>
                            </div>

                            {room.useManualWallArea ? (
                              <div>
                                <Label htmlFor={`manualWallArea-${room.id}`}>שטח קירות (מ"ר)</Label>
                                <Input 
                                  id={`manualWallArea-${room.id}`}
                                  type="number"
                                  value={room.manualWallArea}
                                  min="0"
                                  step="0.1"
                                  onChange={(e) => updateRoomField(room.id, 'manualWallArea', e.target.value)}
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                  <Label htmlFor={`roomArea-${room.id}`}>
                                    שטח רצפת החדר (מ"ר)
                                  </Label>
                                  <Input 
                                    id={`roomArea-${room.id}`}
                                    type="number"
                                    value={room.area}
                                    min="0"
                                    step="0.1"
                                    onChange={(e) => updateRoomField(room.id, 'area', e.target.value)}
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`roomCeilingHeight-${room.id}`}>גובה תקרה (מ')</Label>
                                  <Input 
                                    id={`roomCeilingHeight-${room.id}`}
                                    type="number"
                                    value={room.ceilingHeight}
                                    min="0"
                                    step="0.1"
                                    onChange={(e) => updateRoomField(room.id, 'ceilingHeight', e.target.value)}
                                    placeholder="2.7"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`wallAreaAdjustmentFactor-${room.id}`}>
                                    מקדם התאמת שטח קירות (%)
                                  </Label>
                                  <Input 
                                    id={`wallAreaAdjustmentFactor-${room.id}`}
                                    type="number"
                                    value={room.wallAreaAdjustmentFactor}
                                    min="50"
                                    max="200"
                                    step="5"
                                    onChange={(e) => updateRoomField(room.id, 'wallAreaAdjustmentFactor', e.target.value)}
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <Label className="mb-2">שטח קירות מחושב</Label>
                                  <div className="h-10 flex items-center px-3 bg-white border rounded-md text-lg font-medium text-indigo-600">
                                    {wallPaintingArea.toFixed(2)} מ"ר
                                  </div>
                                  <p className="text-xs mt-1 text-gray-500">
                                    * שטח הצביעה המחושב לפי השטח × גובה × מקדם
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* חלק שכבות הצבע */}
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <Label>שכבות צבע</Label>
                                <div className="flex gap-2">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => addPaintLayer(room.id)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    הוסף שכבה
                                  </Button>
                                  {room.paintLayerSettings && room.paintLayerSettings.length > 1 && (
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => removePaintLayer(room.id)}
                                      className="h-8 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
                                    >
                                      הסר שכבה
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {/* תצוגה של כל השכבות */}
                              <div className="space-y-2">
                                {(room.paintLayerSettings || []).map((layer, index) => (
                                  <div key={`layer-${index}-${room.id}`} className="flex items-center gap-3 p-2 border rounded-md bg-white">
                                    <span className="font-medium min-w-[80px]">שכבה {layer.layer}:</span>
                                    {index === 0 ? (
                                      <span>100% (בסיס)</span>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Input 
                                          type="number" 
                                          min="10" 
                                          max="100" 
                                          step="5"
                                          value={layer.pricePercent}
                                          onChange={(e) => handlePaintLayerChange(room.id, index, e.target.value)}
                                          className="max-w-[80px]"
                                        />
                                        <span>%</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* שדה שטח רגיל - מוצג רק בקטגוריות שאינן צבע */}
                        {!isPaintCategory && (
                          <div>
                            <Label htmlFor={`roomArea-${room.id}`}>
                              שטח (מ"ר)
                            </Label>
                            <Input 
                              id={`roomArea-${room.id}`}
                              type="number"
                              value={room.area}
                              min="0"
                              step="0.1"
                              onChange={(e) => updateRoomField(room.id, 'area', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`roomComplexityPercent-${room.id}`} className="flex items-center">
                              תוספת מחיר בגין מורכבות (%)
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-block ml-1 cursor-help">
                                    <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="p-3 bg-white">
                                  <p>אחוז התוספת למחיר בגלל מורכבות העבודה:<br/>
                                     <strong>0%:</strong> ללא תוספת למחיר הבסיס.<br/>
                                     <strong>20%:</strong> תוספת של 20% למחיר.<br/>
                                     <strong>50%:</strong> תוספת של 50% למחיר.<br/>
                                     <strong>100%:</strong> הכפלת המחיר.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Input 
                              id={`roomComplexityPercent-${room.id}`}
                              type="number"
                              value={room.complexityPercent}
                              min="0"
                              step="5"
                              max="200"
                              onChange={(e) => updateRoomField(room.id, 'complexityPercent', e.target.value)}
                              placeholder="0"
                            />
                            {estimatedPrice && (
                              <p className="text-xs text-gray-500 mt-1">
                                מחיר יחידה ללקוח: 
                                {estimatedPrice.original !== estimatedPrice.adjusted ? (
                                  <span>
                                    <span className="line-through ml-1">{estimatedPrice.original}₪</span>
                                    <span className="font-semibold text-indigo-600 mr-1">{estimatedPrice.adjusted}₪</span>
                                  </span>
                                ) : (
                                  <span className="font-semibold ml-1">{estimatedPrice.original}₪</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* שדות מורכבות נוספים שמופיעים רק אם יש אחוז תוספת */}
                        {parseFloat(room.complexityPercent) > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div>
                              <Label htmlFor={`roomComplexityDescription-${room.id}`}>תיאור המורכבות (סיבה לתוספת)</Label>
                              <Textarea
                                id={`roomComplexityDescription-${room.id}`}
                                value={room.complexityDescription}
                                onChange={(e) => updateRoomField(room.id, 'complexityDescription', e.target.value)}
                                placeholder="לדוגמה: קיר עגול, תקרה גבוהה במיוחד, הרבה פינות..."
                                className="h-20"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 border-t bg-gray-50">
                        <Button 
                          onClick={() => handleSaveRoomItem(room)}
                          className="w-full bg-green-600 hover:bg-green-700"
                          disabled={!room.selectedCatalogItemId || 
                            (!room.area && isSquareMeterItem && !room.useManualWallArea) || 
                            (!room.manualWallArea && room.useManualWallArea && isSquareMeterItem)}
                        >
                          <Save className="h-4 w-4 ml-2" />
                          שמור פריט לחדר זה
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
              
              {/* כפתור להוספת חדר חדש */}
              <div className="flex justify-center mt-6">
                <Button 
                  variant="outline" 
                  onClick={addNewRoom} 
                  className="border-indigo-500 text-indigo-500 hover:bg-indigo-50 w-full md:w-auto"
                  size="lg"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף חדר חדש
                </Button>
              </div>
              
              <div className="flex justify-end gap-2 mt-8 pt-6 border-t">
                <Button variant="outline" onClick={() => setActiveTab('summary')}>
                  הבא: סיכום
                </Button>
              </div>
            </TabsContent>
          
            <TabsContent value="summary" className="space-y-6">
                {addedQuoteItems.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 rounded-lg border">
                    <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-xl font-medium mb-2">עדיין לא נוספו פריטים להצעה</h3>
                    <p className="text-gray-500 mb-4">חזור לשלב 'הגדרת חדרים ופריטים' ושמור פריטים לחדרים כדי לראות סיכום.</p>
                    <Button variant="outline" onClick={() => setActiveTab('rooms')}>
                    חזור להגדרת חדרים
                    </Button>
                </div>
                ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: 'סה"כ להצעה', value: `${calculateTotalRevenue().toLocaleString()} ₪`, Icon: DollarSign, color: "text-blue-600", bgColor: "bg-blue-50" },
                        { title: 'סה"כ עלויות קבלן', value: `${calculateTotalCostForContractor().toLocaleString()} ₪`, Icon: Calculator, color: "text-green-600", bgColor: "bg-green-50" },
                        { title: 'רווח צפוי', value: `${calculateTotalProfit().toLocaleString()} ₪ (${calculateProfitPercentage().toFixed(1)}%)`, Icon: DollarSign, color: calculateTotalProfit() >=0 ? "text-emerald-600" : "text-red-600", bgColor: calculateTotalProfit() >=0 ? "bg-emerald-50" : "bg-red-50" },
                        { title: 'ימי עבודה', value: `${calculateTotalWorkDays().toFixed(1)}`, Icon: Clock, color: "text-indigo-600", bgColor: "bg-indigo-50" }
                    ].map(stat => (
                        <Card key={stat.title} className={`shadow-sm ${stat.bgColor}`}>
                        <CardContent className="pt-5">
                            <div className="flex items-center gap-3">
                            <stat.Icon className={`h-7 w-7 ${stat.color}`} />
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.title}</p>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                            </div>
                            </div>
                        </CardContent>
                        </Card>
                    ))}
                    </div>
                    
                    <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>פירוט הפריטים בהצעת המחיר</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                            <tr className="bg-gray-100 text-right">
                                <th className="p-3 text-sm font-semibold text-gray-600">חדר</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">תיאור פריט</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 text-center">כמות</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 text-center">מחיר ליחידה</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 text-center">סה"כ מחיר</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 text-center">סה"כ עלות</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 text-center">ימי עבודה</th>
                            </tr>
                            </thead>
                            <tbody>
                            {addedQuoteItems.map((item, index) => (
                                <tr key={item.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                <td className="p-3 text-sm">{item.roomName}</td>
                                <td className="p-3 text-sm">{item.description}</td>
                                <td className="p-3 text-sm text-center">{item.quantity.toFixed(1)} {item.unit}</td>
                                <td className="p-3 text-sm text-center">{item.unitPrice?.toLocaleString() || 0}₪</td>
                                <td className="p-3 text-sm text-center font-medium">{item.totalPrice?.toLocaleString() || 0}₪</td>
                                <td className="p-3 text-sm text-center">{item.totalCost?.toLocaleString() || 0}₪</td>
                                <td className="p-3 text-sm text-center">{item.workDuration?.toFixed(1) || "-"}</td>
                                </tr>
                            ))}
                            </tbody>
                            <tfoot>
                            <tr className="bg-gray-100 font-semibold">
                                <td colSpan={3} className="p-3 text-sm text-gray-700">סה"כ כללי:</td>
                                <td className="p-3 text-sm text-center"></td>
                                <td className="p-3 text-sm text-center">{calculateTotalRevenue().toLocaleString()}₪</td>
                                <td className="p-3 text-sm text-center">{calculateTotalCostForContractor().toLocaleString()}₪</td>
                                <td className="p-3 text-sm text-center">{calculateTotalWorkDays().toFixed(1)}</td>
                            </tr>
                            </tfoot>
                        </table>
                        </div>
                    </CardContent>
                    </Card>
                    
                    <Card className="bg-gray-50/70 shadow-sm">
                    <CardHeader>
                        <CardTitle>סיכום נתונים כלליים לעבודת {activeCategoryId === 'cat_flooring' ? 'ריצוף' : 'צבע'}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                        {[
                            { label: "סה\"כ שטח לעבודה (כל החדרים):", value: `${calculateTotalArea()} מ"ר` },
                            { label: "סה\"כ ימי עבודה צפויים:", value: `${calculateTotalWorkDays().toFixed(1)} ימים` },
                            { label: `אחוז רווחיות מחושב:`, value: `${calculateProfitPercentage().toFixed(1)}%`, color: calculateProfitPercentage() >= 30 ? 'text-green-600' : calculateProfitPercentage() >= 15 ? 'text-amber-600' : 'text-red-600' },
                            { label: `רווח צפוי מהעבודה:`, value: `${calculateTotalProfit().toLocaleString()} ₪`, color: calculateTotalProfit() >= 0 ? 'text-green-600' : 'text-red-600' },
                        ].map(item => (
                            <div key={item.label} className="flex justify-between items-center text-sm p-2 border-b">
                                <span className="text-gray-600">{item.label}</span>
                                <span className={`font-medium ${item.color || ''}`}>{item.value}</span>
                            </div>
                        ))}
                    </CardContent>
                    </Card>
                </>
                )}
                
                <div className="flex justify-between mt-8 pt-6 border-t">
                <Button variant="outline" onClick={() => setActiveTab('rooms')}>
                    חזרה להגדרת חדרים
                </Button>
                <Button 
                    onClick={() => onFinish(addedQuoteItems)} 
                    className="bg-green-600 hover:bg-green-700 text-base px-6 py-3"
                    disabled={addedQuoteItems.length === 0}
                >
                    סיים והמשך להצעת מחיר
                </Button>
                </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
