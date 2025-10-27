
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
import {
  Calculator,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowRight,
  Plus,
  Palette,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// הוספת קבועים מדף הזנת נתונים
const PAINT_TYPES = [
  { id: 'acrylic', name: 'אקרילי' },
  { id: 'supercryl', name: 'סופרקריל' },
  { id: 'oil', name: 'שמן' },
  { id: 'effects', name: 'אפקטים' },
  { id: 'tambourflex', name: 'טמבורפלקס' },
  { id: 'poksi', name: 'פוקסי' }
];

// TilingForm component definition
const TilingForm = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    id: '',
    category: 'tiling',
    tileName: '',
    itemType: '', // e.g., tile, mosaic, facade
    size: '', // e.g., 60x60, 120x60
    workType: '', // e.g., flooring, wall, stairs
    materialCost: 0,
    laborCost: 0,
    additionalCost: 0,
    customerPrice: 0, // This is the single customer price, now affected by pricingMethod
    priceTiers: [{ minArea: 0, maxArea: 99999, price: 0 }], // Default tier
    quality: '', // e.g., basic, quality, very_quality, premium
    complexityValue: 1, // Multiplier for basic cost
    profitMargin: 0, // In percentage (kept for legacy, desiredProfitPercent is new)
    fixedProjectCost: 0, // For fixed price projects
    // New pricing method fields
    pricingMethod: 'percentage', // 'percentage' or 'tiered'
    desiredProfitPercent: 30, // Default profit for percentage method
    // Additional fields from outline, not yet used in UI
    laborCostMethod: 'perDay',
    dailyOutput: 15,
    wastagePercent: 10,
    isActive: true,
    // Calculated fields (might be passed or calculated internally)
    averageCustomerPrice: 0,
    averageCostPerMeter: 0,
    averageProfitPerMeter: 0,
    averageProfitPercent: 0,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        // Ensure priceTiers always has at least one valid tier for editing
        priceTiers: item.priceTiers && item.priceTiers.length > 0 ? item.priceTiers : [{ minArea: 0, maxArea: 99999, price: item.customerPrice || 0 }],
        pricingMethod: item.pricingMethod || 'percentage', // Default to percentage if not set
        desiredProfitPercent: item.desiredProfitPercent || 30, // Default to 30 if not set
      });
    } else {
      // Initialize for new item
      setFormData({
        id: crypto.randomUUID(),
        category: 'tiling',
        tileName: '',
        itemType: '',
        size: '',
        workType: '',
        materialCost: 0,
        laborCost: 0,
        additionalCost: 0,
        customerPrice: 0,
        priceTiers: [{ minArea: 0, maxArea: 99999, price: 0 }],
        quality: '',
        complexityValue: 1,
        profitMargin: 0,
        fixedProjectCost: 0,
        averageCustomerPrice: 0,
        averageCostPerMeter: 0,
        averageProfitPerMeter: 0,
        averageProfitPercent: 0,
        pricingMethod: 'percentage',
        desiredProfitPercent: 30,
        laborCostMethod: 'perDay',
        dailyOutput: 15,
        wastagePercent: 10,
        isActive: true,
      });
    }
  }, [item]);

  // Update customerPrice based on the first tier's price if in tiered mode
  useEffect(() => {
      if (formData.pricingMethod === 'tiered' && formData.priceTiers && formData.priceTiers.length > 0) {
          const firstTierPrice = formData.priceTiers[0].price;
          setFormData(prev => ({ ...prev, customerPrice: firstTierPrice }));
      } else if (formData.pricingMethod === 'percentage') {
          // If percentage-based, customerPrice might not be directly used from tiers
          setFormData(prev => ({ ...prev, customerPrice: 0 })); // Reset customerPrice as it's not derived from tiers here
      }
  }, [formData.priceTiers, formData.pricingMethod]);

  const handleChange = (eOrId, valueIfDirect) => {
    let id, value, type;
    if (typeof eOrId === 'string') { // Direct id, value call (e.g., from Select's onValueChange)
        id = eOrId;
        value = valueIfDirect;
        type = typeof valueIfDirect === 'number' ? 'number' : 'text'; // Infer type
    } else { // Event object call (e.g., from Input's onChange)
        const e = eOrId;
        id = e.target.id;
        value = e.target.value;
        type = e.target.type;
    }

    setFormData(prev => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleTierChange = (index, field, value) => {
    const newTiers = [...formData.priceTiers];
    newTiers[index][field] = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, priceTiers: newTiers }));
  };

  const addTier = () => {
    setFormData(prev => ({
      ...prev,
      priceTiers: [...prev.priceTiers, { minArea: 0, maxArea: 99999, price: 0 }],
    }));
  };

  const removeTier = (index) => {
    setFormData(prev => ({
      ...prev,
      priceTiers: prev.priceTiers.filter((_, i) => i !== index),
    }));
  };

  const handleSaveClick = () => {
    let finalData = { ...formData };

    // Set customerPrice based on pricing method for saving
    if (finalData.pricingMethod === 'tiered' && finalData.priceTiers.length > 0) {
        // If tiered, customerPrice is already updated by the useEffect
        // based on the first tier. Ensure tiers are sorted for consistency.
        finalData.priceTiers = [...finalData.priceTiers].sort((a, b) => (a.minArea || 0) - (b.minArea || 0));
        finalData.customerPrice = finalData.priceTiers[0].price || 0;
    } else if (finalData.pricingMethod === 'percentage') {
        // For percentage-based, customerPrice is not directly from tiers.
        // It's calculated dynamically in Catalog based on costs and desiredProfitPercent.
        // So, we can set customerPrice to 0 or null, and ensure priceTiers are minimal.
        finalData.customerPrice = 0;
        finalData.priceTiers = [{ minArea: 0, maxArea: 99999, price: 0 }]; // Keep a default minimal tier structure
    }
    
    onSave(finalData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{item ? `עריכת פריט: ${item.tileName || 'ריצוף/חיפוי'}` : 'הוסף פריט ריצוף/חיפוי חדש'}</DialogTitle>
          <DialogDescription>
            מלא את הפרטים עבור פריט הריצוף/חיפוי.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* פרטי הפריט */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>פרטי הפריט</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tileName">שם הריצוף/חיפוי</Label>
                  <Input
                    id="tileName"
                    value={formData.tileName}
                    onChange={handleChange}
                    placeholder="לדוגמה: גרניט פורצלן אפור"
                  />
                </div>
                <div>
                  <Label htmlFor="itemType">סוג פריט</Label>
                  <Input
                    id="itemType"
                    value={formData.itemType}
                    onChange={handleChange}
                    placeholder="לדוגמה: אריח, פסיפס, חיפוי קיר"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size">גודל (לדוגמה: 60x60)</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={handleChange}
                    placeholder="לדוגמה: 60x60, 120x60"
                  />
                </div>
                <div>
                  <Label htmlFor="workType">סוג עבודה</Label>
                  <Input
                    id="workType"
                    value={formData.workType}
                    onChange={handleChange}
                    placeholder="לדוגמה: ריצוף, חיפוי קירות, מדרגות"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="quality">רמת איכות</Label>
                <select
                  id="quality"
                  value={formData.quality}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">בחר רמת איכות</option>
                  <option value="בסיסי">בסיסי</option>
                  <option value="איכותי">איכותי</option>
                  <option value="איכותי מאד">איכותי מאד</option>
                  <option value="פרמיום">פרמיום</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* עבודה והספקים */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>עלויות עבודה ופרמטרים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="laborCost">עלות עבודה למ"ר (ש"ח)</Label>
                  <Input
                    id="laborCost"
                    type="number"
                    value={formData.laborCost}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="additionalCost">עלויות נוספות למ"ר (ש"ח)</Label>
                  <Input
                    id="additionalCost"
                    type="number"
                    value={formData.additionalCost}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="complexityValue">מקדם מורכבות (1 = רגיל)</Label>
                <Input
                  id="complexityValue"
                  type="number"
                  step="0.1"
                  value={formData.complexityValue}
                  onChange={handleChange}
                  placeholder="לדוגמה: 1.25 לעבודה מורכבת יותר"
                />
              </div>
            </CardContent>
          </Card>

          {/* עלויות חומרים ופרמטרים */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>עלויות חומרים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="materialCost">עלות חומרים למ"ר (ש"ח)</Label>
                <Input
                  id="materialCost"
                  type="number"
                  value={formData.materialCost}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* תמחור ללקוח */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>תמחור ללקוח</CardTitle>
              <CardDescription>בחר את שיטת התמחור עבור פריט זה.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                  <Label>שיטת תמחור</Label>
                  <Select value={formData.pricingMethod} onValueChange={(value) => handleChange('pricingMethod', value)}>
                      <SelectTrigger>
                          <SelectValue placeholder="בחר שיטת תמחור" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="percentage">לפי אחוז רווח</SelectItem>
                          <SelectItem value="tiered">לפי מדרגות מחיר</SelectItem>
                      </SelectContent>
                  </Select>
              </div>

              {formData.pricingMethod === 'percentage' && (
                <div className="p-4 border bg-gray-50 rounded-lg">
                  <Label htmlFor="desiredProfitPercent">אחוז רווח רצוי</Label>
                  <Input
                    id="desiredProfitPercent"
                    type="number"
                    value={formData.desiredProfitPercent}
                    onChange={(e) => handleChange('desiredProfitPercent', Number(e.target.value))}
                    placeholder="לדוגמה: 30"
                  />
                  <p className="text-xs text-gray-500 mt-1">המחיר ללקוח יחושב אוטומטית על בסיס עלות הקבלן + אחוז הרווח שתגדיר כאן.</p>
                </div>
              )}

              {formData.pricingMethod === 'tiered' && (
                <div className="p-4 border bg-gray-50 rounded-lg">
                  <Label>מדרגות מחיר (לפי כמות במ"ר)</Label>
                  <div className="space-y-2 mt-2">
                    {formData.priceTiers && formData.priceTiers.map((tier, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <Input placeholder="מ-" type="number" value={tier.minArea} onChange={(e) => handleTierChange(index, 'minArea', e.target.value)} className="col-span-3"/>
                        <Input placeholder="עד-" type="number" value={tier.maxArea} onChange={(e) => handleTierChange(index, 'maxArea', e.target.value)} className="col-span-3"/>
                        <Input placeholder="מחיר למ'ר" type="number" value={tier.price} onChange={(e) => handleTierChange(index, 'price', e.target.value)} className="col-span-4"/>
                        <Button variant="ghost" size="icon" onClick={() => removeTier(index)} className="col-span-2">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={addTier} className="mt-2">
                    <Plus className="h-4 w-4 ml-2" /> הוסף מדרגה
                  </Button>
                  <div className="space-y-2 pt-4 mt-4 border-t">
                      <Label htmlFor="customerPrice" className="font-semibold text-gray-700">מחיר בסיס ללקוח (למ"ר)</Label>
                      <Input
                        id="customerPrice"
                        type="number"
                        value={formData.customerPrice || ''}
                        readOnly
                        className="bg-gray-100 border-gray-300 cursor-not-allowed focus:ring-0"
                        placeholder="מחושב אוטומטית מהמדרגה הראשונה"
                      />
                      <p className="text-xs text-gray-500">
                        ערך זה נלקח אוטומטית מהמדרגה הנמוכה ביותר ומשמש לחישובים מהירים בהצעת המחיר.
                      </p>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          {/* עלות קבועה לפרויקט */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>עלות קבועה לפרויקט (לא למ"ר)</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="fixedProjectCost">עלות קבועה (ש"ח)</Label>
              <Input
                id="fixedProjectCost"
                type="number"
                value={formData.fixedProjectCost}
                onChange={handleChange}
                placeholder="לדוגמה: 500 (עבור פירוק, הכנה וכו')"
              />
              <p className="text-xs text-gray-500 mt-1">
                עלות זו תתווסף למחיר הסופי של פרויקט ריצוף ללא קשר לגודלו.
              </p>
            </CardContent>
          </Card>

        </div>
        <DialogFooter className="bg-slate-50 px-6 py-4 flex justify-between">
          <Button variant="outline" onClick={onCancel}>בטל</Button>
          <Button onClick={handleSaveClick} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {item ? 'שמור שינויים' : 'הוסף פריט'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function Catalog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('tiling');
  const [showDetailedColumns, setShowDetailedColumns] = useState(false); // This state variable is not used in the current code, but kept for potential future use.
  const [currentDisplayedItemIndex, setCurrentDisplayedItemIndex] = useState(0); // This state variable is not used in the current code, but kept for potential future use.
  const navigate = useNavigate();

  // פונקציות חישוב מדף הזנת נתונים
  const calculatePriceAverage = (item) => {
    // If pricingMethod is 'percentage', the customerPrice stored might be 0,
    // so calculate it based on contractor cost and desired profit.
    if (item.pricingMethod === 'percentage' && item.desiredProfitPercent !== undefined) {
      const cost = calculateBasicCostPerMeter(item);
      return cost * (1 + (Number(item.desiredProfitPercent) || 0) / 100);
    }
    
    // Fallback to existing logic for 'tiered' or old items
    if (!item?.priceTiers || item.priceTiers.length === 0) {
      return Number(item.customerPrice || 0);
    }

    const validTiers = item.priceTiers.filter(tier => tier.price > 0);
    if (validTiers.length === 0) {
      return Number(item.customerPrice || 0);
    }

    const sum = validTiers.reduce((acc, tier) => {
      return acc + Number(tier.price || 0);
    }, 0);

    return sum / validTiers.length;
  };

  const calculateBasicCostPerMeter = (item) => {
    if (!item) return 0;

    if (item.averageCostPerMeter) {
      return Number(item.averageCostPerMeter);
    }

    const baseCost = Number(item.materialCost || 0) +
      Number(item.laborCost || 0) +
      Number(item.additionalCost || 0);

    const complexityValue = Number(item.complexityValue || 1);
    const adjustedCost = baseCost * complexityValue;

    return adjustedCost;
  };

  const calculateProfitPerMeter = (item) => {
    if (item.averageProfitPerMeter !== undefined) {
      return Number(item.averageProfitPerMeter);
    }

    const price = calculatePriceAverage(item);
    const cost = calculateBasicCostPerMeter(item);
    return price - cost;
  };

  const calculateProfitPercent = (item) => {
    if (item.averageProfitPercent !== undefined) {
      return Number(item.averageProfitPercent).toFixed(1);
    }

    const profit = calculateProfitPerMeter(item);
    const cost = calculateBasicCostPerMeter(item);
    if (cost <= 0) return "0";
    return ((profit / cost) * 100).toFixed(1);
  };

  const calculatePaintCostPerMeter = (item) => {
    if (!item) return 0;

    const metersPerBucket = Number(item.coverage || 0);
    const bucketPrice = Number(item.bucketPrice || item.materialCost || 0);
    const materialCostPerMeter = metersPerBucket > 0 ? bucketPrice / metersPerBucket : 0;

    const workerDailyCost = Number(item.workerDailyCost || item.laborCost || 0);
    const dailyOutput = Number(item.dailyOutput || 0);
    const laborCostPerMeter = dailyOutput > 0 ? workerDailyCost / dailyOutput : 0;

    const equipmentCostPerMeter = Number(item.equipmentCost || item.additionalCost || 0);
    const cleaningCostPerMeter = Number(item.cleaningCostPerMeter || 0);
    const preparationCostPerMeter = Number(item.preparationCostPerMeter || 0);

    const difficultyMultiplier = item.selectedDifficulty?.multiplier || 1;

    const totalCostPerMeter = (materialCostPerMeter + laborCostPerMeter + equipmentCostPerMeter + cleaningCostPerMeter + preparationCostPerMeter) * difficultyMultiplier;

    return totalCostPerMeter;
  };

  const calculatePaintPricePerMeter = (item) => {
    // Similar to tiling, if percentage-based, calculate dynamically
    if (item.pricingMethod === 'percentage' && item.desiredProfitPercent !== undefined) {
      const cost = calculatePaintCostPerMeter(item);
      return cost * (1 + (Number(item.desiredProfitPercent) || 0) / 100);
    }

    if (!item?.priceTiers || item.priceTiers.length === 0) {
      return Number(item.customerPrice || 0);
    }

    const validTiers = item.priceTiers.filter(tier => tier.price > 0);
    if (validTiers.length === 0) return Number(item.customerPrice || 0);

    const totalPrice = validTiers.reduce((sum, tier) => sum + Number(tier.price || 0), 0);
    return totalPrice / validTiers.length;
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const user = await User.me();
        let allItems = [];

        if (user.tilingItems) {
          allItems = [...allItems, ...user.tilingItems];
        }

        if (user.paintItems) {
          allItems = [...allItems, ...user.paintItems];
        }

        setItems(allItems);
        setLoading(false);
      } catch (error) {
        console.error("Error loading user data:", error);
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleEditItem = (item) => {
    // במקום לנווט לדף הזנת נתונים, נעביר את הפריט לעריכה בדף CostCalculator
    // אבל נוסיף פרמטר שיגיד לחזור למחירון קבלן
    navigate(createPageUrl('CostCalculator'), { 
      state: { 
        itemToEdit: item,
        returnToCatalog: true // פרמטר חדש שיגיד לחזור למחירון
      } 
    });
  };

  const handleDeleteItem = async (itemToDelete) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את '${itemToDelete.tileName || itemToDelete.itemName || 'פריט זה'}'?`)) {
      return;
    }
    try {
      // Optimistically update UI
      const updatedItems = items.filter(item => item.id !== itemToDelete.id);
      setItems(updatedItems);

      const user = await User.me();
      if (itemToDelete.category === 'tiling') {
        const updatedTilingItems = (user.tilingItems || []).filter(item => item.id !== itemToDelete.id);
        await User.updateMyUserData({ tilingItems: updatedTilingItems });
      } else if (itemToDelete.category === 'paint_plaster') {
        const updatedPaintItems = (user.paintItems || []).filter(item => item.id !== itemToDelete.id);
        await User.updateMyUserData({ paintItems: updatedPaintItems });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("שגיאה במחיקת הפריט");
      // In case of error, re-fetch to revert to actual state
      setLoading(true); // Temporarily set loading to true
      const user = await User.me();
      let allItems = [];
      if (user.tilingItems) {
        allItems = [...allItems, ...user.tilingItems];
      }
      if (user.paintItems) {
        allItems = [...allItems, ...user.paintItems];
      }
      setItems(allItems);
      setLoading(false);
    }
  };

  const handleNextItem = () => {
    const currentCategoryItems = items
      .filter(item => item.category === activeCategory)
      .filter(item => {
        if (activeCategory === 'tiling') {
          return searchQuery === '' ||
            (item.tileName && item.tileName.includes(searchQuery)) ||
            (item.size && item.size.includes(searchQuery));
        } else if (activeCategory === 'paint_plaster') {
          return searchQuery === '' ||
            (item.itemName && item.itemName.includes(searchQuery)) ||
            (item.paintName && item.paintName.includes(searchQuery)) ||
            (item.paintType && PAINT_TYPES.find(pt => pt.id === item.paintType)?.name.includes(searchQuery));
        }
        return true;
      });
    if (currentDisplayedItemIndex < currentCategoryItems.length - 1) {
      setCurrentDisplayedItemIndex(prevIndex => prevIndex + 1);
    }
  };

  const handlePrevItem = () => {
    if (currentDisplayedItemIndex > 0) {
      setCurrentDisplayedItemIndex(prevIndex => prevIndex - 1);
    }
  };

  const renderTableContent = () => {
    if (activeCategory === 'tiling') {
      const tilingItems = items
        .filter(item => item.category === activeCategory)
        .filter(item =>
          searchQuery === '' ||
          (item.tileName && item.tileName.includes(searchQuery)) ||
          (item.size && item.size.includes(searchQuery))
        );

      const stats = tilingItems.length > 0 ? {
        avgPrice: tilingItems.reduce((sum, item) => {
          // Use the dynamic average price calculation
          const pricePerMeter = calculatePriceAverage(item);
          return sum + pricePerMeter;
        }, 0) / tilingItems.length,

        avgCost: tilingItems.reduce((sum, item) => {
          const costPerMeter = calculateBasicCostPerMeter(item);
          return sum + costPerMeter;
        }, 0) / tilingItems.length,

        avgProfit: tilingItems.reduce((sum, item) => {
          const profitPerMeter = calculateProfitPerMeter(item);
          return sum + profitPerMeter;
        }, 0) / tilingItems.length,

        avgProfitPercent: tilingItems.reduce((sum, item) => {
          const profitPerMeter = calculateProfitPerMeter(item);
          const costPerMeter = calculateBasicCostPerMeter(item);
          const profitPercent = costPerMeter > 0 ? (profitPerMeter / costPerMeter) * 100 : (profitPerMeter > 0 ? Infinity : 0);
          return sum + profitPercent;
        }, 0) / tilingItems.length
      } : {
        avgPrice: 0,
        avgCost: 0,
        avgProfit: 0,
        avgProfitPercent: 0
      };

      return (
        <>
          <div className="flex justify-between items-center mb-4 px-4 md:px-0">
            <h3 className="text-xl font-bold text-slate-800">פריטי ריצוף וחיפוי</h3>
            <Button onClick={() => navigate(createPageUrl('CostCalculator'))} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 ml-2" />
              הוסף פריט ריצוף
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="py-3 px-4 font-bold text-slate-700 text-sm">שם הריצוף</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">גודל</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">רמת איכות</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">מחיר למ"ר</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">עלות למ"ר</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">רווח למ"ר</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">אחוז רווח</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tilingItems.map(item => {
                const customerPrice = calculatePriceAverage(item); // Always use the calculated price
                const costPerMeter = calculateBasicCostPerMeter(item);
                const profitPerMeter = calculateProfitPerMeter(item);
                const profitPercent = calculateProfitPercent(item);
                const profitPercentValue = parseFloat(profitPercent);

                // קביעת צבע הבאדג' לפי רמת האיכות
                const qualityBadgeColor = (quality) => {
                  switch(quality) {
                    case 'בסיסי': return 'bg-gray-100 text-gray-700';
                    case 'איכותי': return 'bg-blue-100 text-blue-700';
                    case 'איכותי מאד': return 'bg-purple-100 text-purple-700';
                    case 'פרמיום': return 'bg-yellow-100 text-yellow-800';
                    default: return 'bg-slate-100 text-slate-600';
                  }
                };

                // קביעת צבע רקע השורה לפי אחוז רווח
                const getRowBackgroundColor = (profitPercent) => {
                  if (profitPercent < 20) {
                    return 'bg-red-50 hover:bg-red-100'; // אדום בהיר עבור רווח נמוך
                  } else if (profitPercent >= 20 && profitPercent < 30) {
                    return 'bg-orange-50 hover:bg-orange-100'; // כתום בהיר עבור רווח בינוני
                  } else if (profitPercent >= 30 && profitPercent < 40) {
                    return 'bg-yellow-50 hover:bg-yellow-100'; // צהוב בהיר עבור רווח טוב
                  } else {
                    return 'bg-green-50 hover:bg-green-100'; // ירוק בהיר עבור רווח גבוה
                  }
                };

                return (
                  <TableRow key={item.id} className={cn("transition-colors duration-200", getRowBackgroundColor(profitPercentValue))}>
                    <TableCell className="py-3 px-4">
                      <div className="font-semibold text-lg text-gray-800">
                        {item.tileName || `ריצוף ${item.size}`}
                      </div>
                      {item.workType && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.workType}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-medium text-gray-600">{item.size}</TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <Badge className={cn("text-sm font-medium px-2 py-1", qualityBadgeColor(item.quality || item.selectedQuality))}>
                        {item.quality || item.selectedQuality || 'לא צוין'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-extrabold text-xl text-indigo-600">
                      {customerPrice.toFixed(0)} ₪
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-extrabold text-xl text-gray-800">
                      {costPerMeter.toFixed(0)} ₪
                    </TableCell>
                    <TableCell className={`py-3 px-4 text-center font-extrabold text-xl ${profitPerMeter > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitPerMeter.toFixed(0)} ₪
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <Badge
                        className={cn("text-base font-bold px-3 py-1", {
                          "bg-red-100 text-red-800": profitPercentValue < 20,
                          "bg-orange-100 text-orange-800": profitPercentValue >= 20 && profitPercentValue < 30,
                          "bg-yellow-100 text-yellow-800": profitPercentValue >= 30 && profitPercentValue < 40,
                          "bg-green-100 text-green-800": profitPercentValue >= 40,
                        })}
                      >
                        {profitPercent}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 mt-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">סיכום נתונים</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">מחיר ממוצע למ"ר</div>
                <div className="text-xl font-bold text-indigo-600">
                  {stats.avgPrice.toFixed(0)} ₪
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">עלות ממוצעת למ"ר</div>
                <div className="text-xl font-bold">
                  {stats.avgCost.toFixed(0)} ₪
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">רווח ממוצע למ"ר</div>
                <div className={`text-xl font-bold ${stats.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.avgProfit.toFixed(0)} ₪
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">אחוז רווח ממוצע</div>
                <div className={`text-xl font-bold ${isFinite(stats.avgProfitPercent) && stats.avgProfitPercent >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {isFinite(stats.avgProfitPercent) ? `${stats.avgProfitPercent.toFixed(1)}%` : "N/A"}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-3">
              * הממוצעים מחושבים מהפריטים המוצגים בטבלה בלבד
            </div>
          </div>
        </>
      );
    } else if (activeCategory === 'paint_plaster') {
      const paintItems = items
        .filter(item => item.category === activeCategory)
        .filter(item =>
          searchQuery === '' ||
          (item.itemName && item.itemName.includes(searchQuery)) ||
          (item.paintName && item.paintName.includes(searchQuery)) ||
          (item.paintType && PAINT_TYPES.find(pt => pt.id === item.paintType)?.name.includes(searchQuery))
        );

      const simpleStats = paintItems.length > 0 ? {
        avgPrice: paintItems.reduce((sum, item) => {
          const pricePerMeter = calculatePaintPricePerMeter(item);
          return sum + pricePerMeter;
        }, 0) / paintItems.length,

        avgCost: paintItems.reduce((sum, item) => {
          const costPerMeter = calculatePaintCostPerMeter(item);
          return sum + costPerMeter;
        }, 0) / paintItems.length,

        avgProfit: paintItems.reduce((sum, item) => {
          const pricePerMeter = calculatePaintPricePerMeter(item);
          const costPerMeter = calculatePaintCostPerMeter(item);
          return sum + (pricePerMeter - costPerMeter);
        }, 0) / paintItems.length,

        avgProfitPercent: paintItems.reduce((sum, item) => {
          const pricePerMeter = calculatePaintPricePerMeter(item);
          const costPerMeter = calculatePaintCostPerMeter(item);
          const profitPerMeter = pricePerMeter - costPerMeter;
          const profitPercent = costPerMeter > 0 ? (profitPerMeter / costPerMeter) * 100 : (profitPerMeter > 0 ? Infinity : 0);
          return sum + profitPercent;
        }, 0) / paintItems.length
      } : {
        avgPrice: 0,
        avgCost: 0,
        avgProfit: 0,
        avgProfitPercent: 0
      };

      // פונקציה לקביעת צבע רקע השורה גם עבור צבע וטיח
      const getRowBackgroundColor = (profitPercent) => {
        if (profitPercent < 20) {
          return 'bg-red-50 hover:bg-red-100';
        } else if (profitPercent >= 20 && profitPercent < 30) {
          return 'bg-orange-50 hover:bg-orange-100';
        } else if (profitPercent >= 30 && profitPercent < 40) {
          return 'bg-yellow-50 hover:bg-yellow-100';
        } else {
          return 'bg-green-50 hover:bg-green-100';
        }
      };

      return (
        <>
          <div className="flex justify-between items-center mb-4 px-4 md:px-0">
            <h3 className="text-xl font-bold text-slate-800">פריטי צבע וטיח</h3>
            <Button onClick={() => navigate(createPageUrl('CostCalculator'))} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 ml-2" />
              הוסף פריט צבע/טיח
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="py-3 px-4 font-bold text-slate-700 text-sm">שם הצבע</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">סוג צבע / טיח</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">עלות למ"ר</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">מחיר למ"ר</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">רווח למ"ר</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">אחוז רווח</TableHead>
                <TableHead className="py-3 px-4 text-center font-bold text-slate-700 text-sm">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paintItems.map(item => {
                const costPerMeter = calculatePaintCostPerMeter(item);
                const pricePerMeter = calculatePaintPricePerMeter(item);
                let profitPerMeter = 0;
                let profitPercent = 0;

                if (costPerMeter > 0) {
                  profitPerMeter = pricePerMeter - costPerMeter;
                  profitPercent = (profitPerMeter / costPerMeter) * 100;
                } else if (pricePerMeter > 0) {
                  profitPerMeter = pricePerMeter;
                  profitPercent = Infinity;
                }

                let itemTypeDisplay = "לא צוין";
                let isPaintItem = false;
                if (item.workCategory === 'paint' || item.paintType) {
                  itemTypeDisplay = PAINT_TYPES.find(type => type.id === (item.paintType || item.type))?.name || "צבע כללי";
                  isPaintItem = true;
                } else if (item.workCategory === 'plaster' || item.plasterType) {
                  itemTypeDisplay = item.plasterType || item.selectedPlasterType || "טיח";
                }

                // שילוב צבע הרקע עם הצבע הקיים של הפריט
                const baseRowClass = isPaintItem ? "bg-blue-50/50 hover:bg-blue-100/60" : "bg-orange-50/50 hover:bg-orange-100/60";
                const profitRowClass = getRowBackgroundColor(profitPercent === Infinity ? 100 : profitPercent);
                
                // אם הרווח נמוך, נדרוס את הצבע הבסיסי
                const finalRowClass = profitPercent < 20 ? profitRowClass : cn(baseRowClass, "transition-colors duration-200");

                return (
                  <TableRow key={item.id} className={finalRowClass}>
                    <TableCell className="py-3 px-4">
                      <div className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                        {isPaintItem ? <Palette className="w-4 h-4 text-blue-600" /> : <Layers className="w-4 h-4 text-orange-600" />}
                        {item.itemName || item.paintName || `פריט ${item.id.slice(-4)}`}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-medium text-gray-600">
                      {itemTypeDisplay}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-extrabold text-xl text-gray-800">
                      {costPerMeter.toFixed(0)} ₪
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-extrabold text-xl text-indigo-600">
                      {pricePerMeter.toFixed(0)} ₪
                    </TableCell>
                    <TableCell className={`py-3 px-4 text-center font-extrabold text-xl ${profitPerMeter >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitPerMeter.toFixed(0)} ₪
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <Badge
                        className={cn("text-base font-bold px-3 py-1", {
                          "bg-red-100 text-red-800": profitPercent < 20,
                          "bg-orange-100 text-orange-800": profitPercent >= 20 && profitPercent < 30,
                          "bg-yellow-100 text-yellow-800": profitPercent >= 30 && profitPercent < 40,
                          "bg-green-100 text-green-800": profitPercent >= 40,
                        })}
                      >
                        {profitPercent === Infinity ? "∞" : `${profitPercent.toFixed(1)}%`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 mt-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">סיכום נתונים</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">מחיר ממוצע למ"ר</div>
                <div className="text-xl font-bold text-indigo-600">
                  {simpleStats.avgPrice.toFixed(0)} ₪
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">עלות ממוצעת למ"ר</div>
                <div className="text-xl font-bold">
                  {simpleStats.avgCost.toFixed(0)} ₪
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">רווח ממוצע למ"ר</div>
                <div className={`text-xl font-bold ${simpleStats.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {simpleStats.avgProfit.toFixed(0)} ₪
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">אחוז רווח ממוצע</div>
                <div className={`text-xl font-bold ${isFinite(simpleStats.avgProfitPercent) && simpleStats.avgProfitPercent >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {isFinite(simpleStats.avgProfitPercent) ? `${simpleStats.avgProfitPercent.toFixed(1)}%` : "N/A"}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-3">
              * הממוצעים מחושבים מהפריטים המוצגים בטבלה בלבד
            </div>
          </div>
        </>
      );
    } else {
      return (
        <div className="text-center py-8 text-gray-500">
          אין פריטים בקטגוריה זו או הקטגוריה לא נתמכת עדיין
        </div>
      );
    }
  };

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

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8" dir="rtl">
      <Card className="mb-8 bg-gradient-to-br from-indigo-900 to-purple-900 text-white shadow-2xl rounded-2xl">
        <CardHeader className="p-6">
          <CardTitle className="text-3xl font-bold tracking-tight flex items-center">
            <Calculator className="w-8 h-8 ml-3" />
            מחירון קבלן
          </CardTitle>
          <CardDescription className="text-indigo-100 text-lg mt-2">
            רשימת הפריטים והמחירים השמורים במחירון שלך.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-start items-center mb-6">
        <Button onClick={() => navigate(createPageUrl('Dashboard'))} variant="outline" className="text-gray-700">
          <ArrowRight className="ml-2 h-4 w-4" />
          חזור לדשבורד
        </Button>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl h-auto">
          <TabsTrigger value="tiling" className="flex items-center gap-2 py-3">
            <Layers className="w-4 h-4" />
            ריצוף וחיפוי
          </TabsTrigger>
          <TabsTrigger value="paint_plaster" className="flex items-center gap-2 py-3">
            <Palette className="w-4 h-4" />
            צבע וטיח
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="pt-6">
          <Card className="shadow-xl">
            <CardHeader className="flex flex-col items-center justify-center bg-slate-50 border-b p-6 gap-4">
              <CardTitle className="text-2xl font-bold text-slate-800">
                {activeCategory === 'tiling' ? 'ריצוף וחיפוי' : 'צבע וטיח'}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 md:p-4">
              {renderTableContent()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
