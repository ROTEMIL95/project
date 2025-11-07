
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/lib/entities';
// import { Quote } from '@/lib/entities'; // REMOVED - Quote API will be rebuilt
import { useUser } from '@/components/utils/UserContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Save, Send, Trash2, DollarSign, Loader2, Info } from 'lucide-react';
import { calculateItemMetricsForQuantity, identifyPriceTier } from '@/components/costCalculator/PricingService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export default function QuoteCreateNewPage() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: פרטי פרויקט, 2: בחירת פריטים, 3: סיכום
  
  const [projectInfo, setProjectInfo] = useState({
    projectName: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    projectAddress: '',
    projectType: 'דירה',
    notes: '',
  });

  const [tilingItems, setTilingItems] = useState([]);
  const [selectedTilingItems, setSelectedTilingItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  
  // מצב חדש לשמירת הכמות הזמנית עבור כל פריט בקטלוג
  const [catalogItemQuantities, setCatalogItemQuantities] = useState({});

  // עדכון פונקציית חישוב אחוז רווח
  const calculateProfitPercent = (profit, cost) => {
    if (!cost || cost <= 0) return 0;
    return (profit / cost) * 100;
  };

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fix: Access tiling items from user.user_metadata.tilingItems
      const userTilingItems = user?.user_metadata?.tilingItems;
      if (userTilingItems && Array.isArray(userTilingItems)) {
        console.log("QuoteCreateNewPage: Loaded tiling items from user data:", userTilingItems.length);
        setTilingItems(userTilingItems);

        const initialQuantities = {};
        userTilingItems.forEach(item => {
          initialQuantities[item.id] = 1; // Default quantity
        });
        setCatalogItemQuantities(initialQuantities);
      } else {
        console.warn("QuoteCreateNewPage: No tiling items found in user data or data is not an array.", {
          hasUser: !!user,
          hasUserMetadata: !!user?.user_metadata,
          tilingItemsType: typeof userTilingItems,
          isArray: Array.isArray(userTilingItems)
        });
        setTilingItems([]);
      }

    } catch (error) {
      console.error("QuoteCreateNewPage: Error processing tiling items:", error);
      setTilingItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, userLoading]);

  const handleProjectInfoChange = (field, value) => {
    setProjectInfo(prev => ({ ...prev, [field]: value }));
  };

  // פונקציה מעודכנת לטיפול בשינוי כמות בקטלוג
  const handleCatalogQuantityChange = (itemId, newQuantity) => {
    setCatalogItemQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }));
  };

  // פונקציה מעודכנת להוספת פריט
  const handleAddTilingItem = (itemId) => {
    console.log("[handleAddTilingItem] Called. Current state of tilingItems:", 
                "Type:", typeof tilingItems, 
                "IsArray:", Array.isArray(tilingItems), 
                "Length:", Array.isArray(tilingItems) ? tilingItems.length : "N/A");

    if (!Array.isArray(tilingItems)) {
      console.error("handleAddTilingItem: CRITICAL - tilingItems is not an array. Aborting. Value:", tilingItems);
      alert("שגיאה פנימית: נתוני הריצוף אינם זמינים כרגע. אנא רענן את העמוד.");
      return;
    }

    const catalogItem = tilingItems.find(item => item.id === itemId);
    if (!catalogItem) {
      console.error("handleAddTilingItem: Could not find catalog item with id:", itemId, ". Available tilingItems:", tilingItems);
      return;
    }
    
    const quantity = catalogItemQuantities[itemId] || 1;
    
    try {
      const metrics = calculateItemMetricsForQuantity(catalogItem, quantity, tilingItems);
      if (!metrics) {
        console.error("handleAddTilingItem: calculateItemMetricsForQuantity returned null for item:", catalogItem, "quantity:", quantity);
        return;
      }

      const existingItemIndex = selectedTilingItems.findIndex(item => item.catalogItemId === itemId);
      
      if (existingItemIndex >= 0) {
        setSelectedTilingItems(prev => {
          const updatedItems = [...prev];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity,
            unitPrice: metrics.customerPricePerUnit,
            totalPrice: metrics.totalCustomerPrice,
            totalCost: metrics.totalContractorCost,
            workDuration: metrics.workDays, // ימי עבודה מעוגלים
            profit: metrics.totalProfit,
            profitPercent: metrics.profitPercent,
            // שמירת נתונים גולמיים להשוואה
            rawWorkDays: metrics.rawWorkDays,
            rawTotalProfit: metrics.rawTotalProfit,
            rawProfitPercent: metrics.rawProfitPercent,
            metrics // שמירת כל המדדים
          };
          return updatedItems;
        });
      } else {
        const newItem = {
          id: `quote_item_${Date.now()}`,
          catalogItemId: catalogItem.id,
          description: catalogItem.tileName || `ריצוף ${catalogItem.size}`,
          unit: "מ\"ר",
          quantity,
          unitPrice: metrics.customerPricePerUnit,
          totalPrice: metrics.totalCustomerPrice,
          categoryId: 'tiling',
          materialCost: metrics.materialCostTotal,
          laborCost: metrics.laborCostTotal,
          additionalCost: metrics.additionalCostTotal,
          totalCost: metrics.totalContractorCost,
          workDuration: metrics.workDays, // ימי עבודה מעוגלים
          profit: metrics.totalProfit,
          profitPercent: metrics.profitPercent,
          // שמירת נתונים גולמיים להשוואה
          rawWorkDays: metrics.rawWorkDays,
          rawTotalProfit: metrics.rawTotalProfit,
          rawProfitPercent: metrics.rawProfitPercent,
          complexityValue: catalogItem.complexityValue || 1,
          wastagePercent: catalogItem.wastagePercent || 10,
          metrics // שמירת כל המדדים
        };
        setSelectedTilingItems(prev => [...prev, newItem]);
      }
    } catch (error) {
      console.error("handleAddTilingItem: Error during metric calculation or state update:", error);
    }
  };

  // פונקציה מעודכנת לטיפול בשינוי כמות
  const handleQuantityChange = (itemId, newQuantity) => {
     console.log("[handleQuantityChange] Called. Current state of tilingItems:", 
                "Type:", typeof tilingItems, 
                "IsArray:", Array.isArray(tilingItems), 
                "Length:", Array.isArray(tilingItems) ? tilingItems.length : "N/A");

    if (!Array.isArray(tilingItems)) {
      console.error("handleQuantityChange: CRITICAL - tilingItems is not an array. Aborting. Value:", tilingItems);
      alert("שגיאה פנימית: נתוני הריצוף אינם זמינים כרגע. אנא רענן את העמוד.");
      return;
    }
    
    setSelectedTilingItems(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          const catalogItem = tilingItems.find(cat => cat.id === item.catalogItemId);
          if (!catalogItem) {
            console.error("handleQuantityChange: Could not find catalog item with id:", item.catalogItemId, ". Available tilingItems:", tilingItems);
            return item;
          }
          
          try {
            if (newQuantity <= 0) {
                console.warn(`handleQuantityChange: Quantity is ${newQuantity}. Resetting metrics for item ID`, itemId);
                return {
                    ...item,
                    quantity: newQuantity,
                    unitPrice: 0,
                    totalPrice: 0,
                    totalCost: 0,
                    workDuration: 0,
                    profit: 0,
                    profitPercent: 0,
                    rawWorkDays: 0,
                    rawTotalProfit: 0,
                    rawProfitPercent: 0,
                    metrics: null
                };
            }

            const metrics = calculateItemMetricsForQuantity(catalogItem, newQuantity, tilingItems);
            if (!metrics) {
              console.error("handleQuantityChange: calculateItemMetricsForQuantity returned null for item:", JSON.stringify(catalogItem), "quantity:", newQuantity);
              return item;
            }

            return {
              ...item,
              quantity: newQuantity,
              unitPrice: metrics.customerPricePerUnit,
              totalPrice: metrics.totalCustomerPrice,
              totalCost: metrics.totalContractorCost,
              workDuration: metrics.workDays, // ימי עבודה מעוגלים
              profit: metrics.totalProfit,
              profitPercent: metrics.profitPercent,
              // שמירת נתונים גולמיים להשוואה
              rawWorkDays: metrics.rawWorkDays,
              rawTotalProfit: metrics.rawTotalProfit,
              rawProfitPercent: metrics.rawProfitPercent,
              metrics
            };
          } catch (error) {
            console.error("handleQuantityChange: Error during metric calculation for item ID", itemId, ":", error);
            return item; 
          }
        }
        return item;
      });
    });
  };

  const handleRemoveItem = (itemId) => {
    setSelectedTilingItems(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalWorkDays = 0;
    let totalCost = 0;

    selectedTilingItems.forEach(item => {
      subtotal += (item.totalPrice || 0);
      totalCost += (item.totalCost || 0); 
      totalWorkDays += (item.workDuration || 0);
    });

    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal - discountAmount;
    
    const profit = total > 0 && totalCost > 0 ? ((total - totalCost) / totalCost * 100) : 0;

    return {
      subtotal,
      discountAmount,
      total,
      totalWorkDays,
      totalCost,
      profit: profit.toFixed(1)
    };
  };
  
  const totals = calculateTotals();

  const handleSaveQuote = async (status = 'draft') => {
    setIsSaving(true);
    if (selectedTilingItems.length === 0 && status !== 'draft') {
        alert("לא ניתן לשלוח הצעת מחיר ללא פריטים. אנא הוסף פריטים או שמור כטיוטה.");
        setIsSaving(false);
        return;
    }
    try {
      const quoteDataToSave = {
        ...projectInfo,
        status,
        items: selectedTilingItems,
        totalAmount: totals.subtotal,
        discount: discount,
        finalAmount: totals.total,
        estimatedWorkDays: totals.totalWorkDays,
        estimatedCost: totals.totalCost,
        estimatedProfitPercent: parseFloat(totals.profit),
      };
      
      console.log("Saving quote:", quoteDataToSave);
      const newQuote = await Quote.create(quoteDataToSave);
      console.log("Quote saved:", newQuote);
      
      navigate(createPageUrl('SentQuotes')); 
      
    } catch (error) {
      console.error("Error saving quote:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mr-2">טוען נתונים...</p>
      </div>
    );
  }

  // פונקציית עזר לעיצוב מחיר
  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const renderStepContent = () => {
    if (isLoading) return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" />טוען נתונים...</div>;

    switch (currentStep) {
      case 1: // פרטי פרויקט ולקוח
        return (
          <Card>
            <CardHeader>
              <CardTitle>פרטי פרויקט ולקוח</CardTitle>
              <CardDescription>הזן את המידע הבסיסי על הפרויקט והלקוח.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="projectName">שם הפרויקט</Label>
                <Input id="projectName" value={projectInfo.projectName} onChange={(e) => handleProjectInfoChange('projectName', e.target.value)} placeholder="לדוגמה: שיפוץ דירת 4 חדרים ברמת גן" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">שם הלקוח</Label>
                  <Input id="clientName" value={projectInfo.clientName} onChange={(e) => handleProjectInfoChange('clientName', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="clientEmail">אימייל הלקוח</Label>
                  <Input id="clientEmail" type="email" value={projectInfo.clientEmail} onChange={(e) => handleProjectInfoChange('clientEmail', e.target.value)} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientPhone">טלפון הלקוח</Label>
                  <Input id="clientPhone" type="tel" value={projectInfo.clientPhone} onChange={(e) => handleProjectInfoChange('clientPhone', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="projectAddress">כתובת הפרויקט</Label>
                  <Input id="projectAddress" value={projectInfo.projectAddress} onChange={(e) => handleProjectInfoChange('projectAddress', e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="projectType">סוג הנכס</Label>
                <Select value={projectInfo.projectType} onValueChange={(value) => handleProjectInfoChange('projectType', value)}>
                  <SelectTrigger id="projectType">
                    <SelectValue placeholder="בחר סוג נכס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="דירה">דירה</SelectItem>
                    <SelectItem value="בית פרטי">בית פרטי</SelectItem>
                    <SelectItem value="משרד">משרד</SelectItem>
                    <SelectItem value="עסק">עסק</SelectItem>
                    <SelectItem value="אחר">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">הערות כלליות לפרויקט</Label>
                <Textarea id="notes" value={projectInfo.notes} onChange={(e) => handleProjectInfoChange('notes', e.target.value)} placeholder="הערות, דרישות מיוחדות, וכו'..." />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setCurrentStep(2)} className="mr-auto">הבא: בחירת פריטים</Button>
            </CardFooter>
          </Card>
        );
      
      case 2: // בחירת פריטים
        return (
          <Card>
            <CardHeader>
              <CardTitle>בחירת פריטי ריצוף</CardTitle>
              <CardDescription>בחר פריטי ריצוף מהקטלוג והוסף אותם להצעה.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="catalog">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="catalog">קטלוג פריטים</TabsTrigger>
                  <TabsTrigger value="selected">פריטים נבחרים ({selectedTilingItems.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="catalog" className="space-y-4 pt-4">
                  {tilingItems.map(item => (
                    <Card key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                      <div>
                        <h4 className="font-semibold">{item.tileName || `ריצוף ${item.size}`}</h4>
                        <p className="text-sm text-gray-500">
                          גודל: {item.size} | מחיר בסיס למ"ר: {formatPrice(item.customerPrice)} ₪
                        </p>
                        <p className="text-xs text-gray-400">
                          מקדם מורכבות: {item.complexityValue || 1} | בלאי: {item.wastagePercent || 10}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <Label htmlFor={`cat-qty-${item.id}`} className="text-sm">כמות:</Label>
                        <Input
                          id={`cat-qty-${item.id}`}
                          type="number"
                          min="1"
                          value={catalogItemQuantities[item.id] || 1}
                          onChange={(e) => handleCatalogQuantityChange(item.id, Number(e.target.value))}
                          className="w-20"
                        />
                        <Button size="sm" onClick={() => handleAddTilingItem(item.id)}>
                          <PlusCircle className="h-4 w-4 mr-2" /> הוסף
                        </Button>
                      </div>
                    </Card>
                  ))}
                </TabsContent>
                
                <TabsContent value="selected" className="space-y-4 pt-4">
                  {renderSelectedItems()}
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>הקודם</Button>
              <Button onClick={() => setCurrentStep(3)} disabled={selectedTilingItems.length === 0}>הבא</Button>
            </CardFooter>
          </Card>
        );
        
      case 3: // סיכום ותמחור
        return (
          <Card>
            <CardHeader>
              <CardTitle>סיכום הצעת המחיר</CardTitle>
              <CardDescription>בדוק את כל הפריטים, הוסף הנחה אם נדרש, ושמור או שלח את ההצעה.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">פירוט פריטי ריצוף:</h3>
                {selectedTilingItems.length === 0 ? (
                  <p className="text-gray-500">עדיין לא נוספו פריטים להצעה.</p>
                ) : (
                  <div className="space-y-2">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-right p-2">תיאור</th>
                          <th className="text-center p-2">כמות (מ"ר)</th>
                          <th className="text-center p-2">מחיר ליח'</th>
                          <th className="text-center p-2">סה"כ</th>
                          <th className="text-center p-2">פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTilingItems.map(item => (
                          <tr key={item.id} className="border-b">
                            <td className="p-2">{item.description}</td>
                            <td className="text-center p-2">{item.quantity}</td>
                            <td className="text-center p-2">{item.unitPrice?.toLocaleString()} ₪</td>
                            <td className="text-center p-2 font-medium">{item.totalPrice?.toLocaleString()} ₪</td>
                            <td className="text-center p-2">
                              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleRemoveItem(item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">סיכום הצעת מחיר:</h3>
                  <div className="w-32">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="discount" className="whitespace-nowrap">הנחה (%):</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-24"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>סה"כ לפני הנחה:</span>
                    <span>{totals.subtotal.toLocaleString()} ₪</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>הנחה ({discount}%):</span>
                      <span>- {totals.discountAmount.toLocaleString()} ₪</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>סה"כ סופי:</span>
                    <span>{totals.total.toLocaleString()} ₪</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600 pt-3 border-t">
                    <span>סה"כ ימי עבודה:</span>
                    <span>{totals.totalWorkDays.toFixed(1)} ימים</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>אחוז רווח צפוי:</span>
                    <span className={Number(totals.profit) >= 20 ? 'text-green-600' : 'text-orange-600'}>
                      {totals.profit}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>הקודם</Button>
              <div className="flex gap-2">
                <Button onClick={() => handleSaveQuote('טיוטה')} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                  שמור טיוטה
                </Button>
                <Button onClick={() => handleSaveQuote('נשלח')} disabled={isSaving || selectedTilingItems.length === 0} className="bg-green-600 hover:bg-green-700">
                   {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}
                  שמור ושלח
                </Button>
              </div>
            </CardFooter>
          </Card>
        );
      default:
        return null;
    }
  };

  const renderPriceRange = (item, metrics) => {
    if (!metrics) return null;
  
    return (
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="text-sm font-medium">נתוני מחירון מדויקים לכמות {item.quantity} מ"ר:</div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-blue-600 text-xl font-bold">{metrics.customerPricePerUnit} ₪</div>
            <div className="text-sm text-gray-500">מחיר למ"ר</div>
          </div>
          <div>
            <div className="text-gray-700 text-xl font-bold">{metrics.contractorCostPerUnit} ₪</div>
            <div className="text-sm text-gray-500">עלות למ"ר</div>
          </div>
          <div>
            <div className="text-green-600 text-xl font-bold">{metrics.profitPerUnit} ₪</div>
            <div className="text-sm text-gray-500">רווח למ"ר</div>
          </div>
        </div>
  
        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              ימי עבודה:{' '}
              <span className="font-medium">{metrics.workDays.toFixed(1)}</span>
              {metrics.rawWorkDays !== metrics.workDays && (
                <span className="text-gray-500 ml-2">
                  (מדויק: {metrics.rawWorkDays.toFixed(1)})
                </span>
              )}
            </div>
            <Badge 
              className={
                metrics.profitPercent >= 25 ? "bg-green-100 text-green-800" : 
                metrics.profitPercent >= 15 ? "bg-blue-100 text-blue-800" : 
                "bg-yellow-100 text-yellow-800"
              }
            >
              {metrics.profitPercent.toFixed(1)}% רווח
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  // עדכון החלק שמציג את הפריטים הנבחרים בטאב "פריטים נבחרים"
  const renderSelectedItems = () => {
    if (selectedTilingItems.length === 0) {
      return (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-gray-500">לא נבחרו פריטים עדיין</p>
          <Button onClick={() => document.querySelector('[data-value="catalog"]').click()} variant="link" className="mt-2">
            עבור לקטלוג לבחירת פריטים
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {selectedTilingItems.map(item => {
          const metrics = item.metrics; // metrics already contains rawWorkDays, rawTotalProfit, etc.
          if (!metrics) {
            return (
              <Card key={item.id}>
                <CardContent className="p-4">טעינת נתוני פריט...</CardContent>
              </Card>
            );
          }

          return (
            <Card key={item.id}>
              <CardHeader className="py-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{item.description}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Label htmlFor={`quantity-${item.id}`} className="whitespace-nowrap">כמות (מ"ר):</Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                      className="w-24"
                    />
                    <Badge variant="outline" className="text-xs">בלאי: {item.wastagePercent || 0}%</Badge>
                  </div>
                  <div className="text-left rtl:text-right">
                    <div className="text-sm">מחיר למ"ר: <strong>{formatPrice(metrics.customerPricePerUnit)} ₪</strong></div>
                    <div className="text-sm font-bold text-blue-700">סה"כ: {formatPrice(metrics.totalCustomerPrice)} ₪</div>
                  </div>
                </div>
                
                {/* אזור השוואת חישוב */}
                <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-amber-50 mt-2">
                  <div className="text-sm font-medium text-gray-800 mb-2">
                    השוואת חישוב - ימי עבודה מדויקים ({metrics.rawWorkDays?.toFixed(1)} ימים):
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-gray-500">סה"כ עלות עם ימי עבודה מדויקים:</div>
                      <div className="font-medium">{formatPrice(metrics.rawTotalContractorCost)} ₪</div>
                    </div>
                    <div>
                      <div className="text-gray-500">רווח עם ימי עבודה מדויקים:</div>
                      <div className="font-medium text-green-700">
                        {formatPrice(metrics.rawTotalProfit)} ₪ 
                        <Badge variant="secondary" className={
                          metrics.rawProfitPercent >= 25 ? "bg-green-200 text-green-800" : 
                          metrics.rawProfitPercent >= 15 ? "bg-blue-200 text-blue-800" : 
                          "bg-yellow-200 text-yellow-800"
                        }>
                          {metrics.rawProfitPercent?.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-dashed border-gray-300 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">הפרש באחוז רווח:</span>
                      <span className={
                        metrics.rawProfitPercent > metrics.profitPercent ? "text-red-600" : "text-green-600"
                      }>
                        {(metrics.rawProfitPercent - metrics.profitPercent).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <Card className="mb-6 bg-indigo-600 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">הצעת מחיר עדכנית</CardTitle>
          <CardDescription className="text-indigo-100">
            הצעת מחיר פשוטה ומהירה עם מיקוד בריצוף בלבד
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ניווט שלבים ויזואלי */}
      <div className="mb-8 flex justify-center">
        <ol className="flex items-center w-full max-w-2xl text-sm font-medium text-center text-gray-500 sm:text-base">
          {[
            { step: 1, title: "פרטי פרויקט" },
            { step: 2, title: "בחירת פריטים" },
            { step: 3, title: "סיכום" }
          ].map(({ step, title }) => (
            <li
              key={step}
              className={`flex md:w-full items-center ${
                currentStep > step ? "text-indigo-600" : ""
              } ${step < 3 ? "sm:after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10" : ""}`}
            >
              <span className={`flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200 ${currentStep >= step ? "cursor-pointer hover:text-indigo-800" : "cursor-not-allowed"}`} onClick={() => currentStep >= step && setCurrentStep(step)}>
                {currentStep > step ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 sm:ml-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                ) : (
                  <span className={`w-4 h-4 sm:w-5 sm:h-5 ml-2 sm:ml-2.5 rounded-full flex items-center justify-center ${currentStep === step ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>
                    {step}
                  </span>
                )}
                {title}
              </span>
            </li>
          ))}
        </ol>
      </div>
      
      {renderStepContent()}
    </div>
  );
}
