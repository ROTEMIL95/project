import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Category } from '@/lib/entities';
import { CatalogItem } from '@/lib/entities';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Package, Plus, Trash2 } from 'lucide-react';

export default function CatalogItemPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  
  const [item, setItem] = useState({
    name: '',
    description: '',
    categoryId: '',
    itemType: '',
    quantity: 1,
    unitMeasurement: '',
    unitPrice: 0,
    totalPrice: 0,
    complexityLevel: 'בינונית',
    needsExcavation: false,
    laborCost: 0,
    materialCost: 0,
    laborDurationDays: 0,
    workType: '',
    customerPrice: 0,
    expectedProfit: 0,
    additionalCost: 0,
    unit: 'יחידה',
    isActive: true
  });

  // לוגיקת משיכת פרמטר מה-URL לעריכת פריט קיים
  useEffect(() => {
    const fetchData = async () => {
      try {
        // בסביבה אמיתית היינו מושכים נתונים מהשרת
        // לצורך הדוגמה נשתמש בנתונים סטטיים
        
        setTimeout(() => {
          const mockCategories = [
            { id: "cat1", name: "חדר מקלחת/שירותים" },
            { id: "cat2", name: "מטבח" },
            { id: "cat3", name: "חדר שינה" },
            { id: "cat4", name: "סלון" },
          ];
          
          setCategories(mockCategories);
          
          const urlParams = new URLSearchParams(window.location.search);
          const itemId = urlParams.get('id');
          
          if (itemId) {
            // דוגמה לפריט מהטבלה ששלחת
            const mockItem = {
              id: itemId,
              name: 'החלפת צנרת',
              description: 'נחושת / SP / PEX',
              categoryId: 'cat1',
              itemType: 'צנרת',
              quantity: 20,
              unitMeasurement: 'מ"ר',
              unitPrice: 200,
              totalPrice: 4000,
              complexityLevel: 'גבוהה',
              needsExcavation: true,
              laborCost: 3000,
              materialCost: 1000,
              laborDurationDays: 3,
              workType: 'צנרת מתקדמת',
              unit: 'מ"ר',
              customerPrice: 4000,
              expectedProfit: 20,
              additionalCost: 0,
              isActive: true
            };
            
            setItem(mockItem);
          }
          
          setLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // חישוב עלות כוללת לקבלן בזמן אמת
  useEffect(() => {
    const materialCost = Number(item.materialCost) || 0;
    const laborCost = Number(item.laborCost) || 0;
    const additionalCost = Number(item.additionalCost) || 0;
    
    const totalCost = materialCost + laborCost + additionalCost;
    const customerPrice = Number(item.customerPrice) || 0;
    
    let expectedProfit = 0;
    if (totalCost > 0 && customerPrice > totalCost) {
      expectedProfit = ((customerPrice - totalCost) / customerPrice) * 100;
    }
    
    setItem({
      ...item,
      totalPrice: Number(item.quantity || 0) * Number(item.unitPrice || 0),
      expectedProfit: expectedProfit.toFixed(2)
    });
  }, [
    item.materialCost, 
    item.laborCost, 
    item.additionalCost, 
    item.customerPrice,
    item.quantity,
    item.unitPrice
  ]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setItem({
      ...item,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    });
  };

  const handleSelectChange = (name, value) => {
    setItem({
      ...item,
      [name]: value
    });
  };

  const handleSwitchChange = (name, checked) => {
    setItem({
      ...item,
      [name]: checked
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // כאן יהיה קוד לשמירת הפריט במסד הנתונים
      // לצורך הדוגמה נדמה שמירה מוצלחת
      setTimeout(() => {
        setSaving(false);
        navigate(createPageUrl('Catalog'));
      }, 1000);
    } catch (error) {
      console.error("Error saving item:", error);
      setError("אירעה שגיאה בשמירת הפריט");
      setSaving(false);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-2" 
            onClick={() => navigate(createPageUrl('Catalog'))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {item.id ? `עריכת פריט: ${item.name}` : 'פריט חדש'}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'שומר...' : 'שמור'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">פרטים כלליים</TabsTrigger>
          <TabsTrigger value="pricing">תמחור</TabsTrigger>
          <TabsTrigger value="technical">פרטים טכניים</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>פרטים כלליים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם הפריט *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={item.name} 
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="categoryId">קטגוריה *</Label>
                  <Select 
                    value={item.categoryId} 
                    onValueChange={(value) => handleSelectChange('categoryId', value)}
                  >
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="בחר קטגוריה" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="itemType">סוג פריט</Label>
                  <Input 
                    id="itemType" 
                    name="itemType" 
                    value={item.itemType} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="workType">תיאור העבודה</Label>
                  <Input 
                    id="workType" 
                    name="workType" 
                    value={item.workType} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">תיאור מפורט</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={item.description} 
                  onChange={handleInputChange}
                  rows={3} 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">כמות</Label>
                  <Input 
                    id="quantity" 
                    name="quantity" 
                    type="number" 
                    value={item.quantity} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unit">יחידת מידה</Label>
                  <Select 
                    value={item.unit} 
                    onValueChange={(value) => handleSelectChange('unit', value)}
                  >
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="יחידה">יחידה</SelectItem>
                      <SelectItem value="מ״ר">מ״ר</SelectItem>
                      <SelectItem value="מטר">מטר</SelectItem>
                      <SelectItem value="קומפלט">קומפלט</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="laborDurationDays">הערכת זמן (ימים)</Label>
                  <Input 
                    id="laborDurationDays" 
                    name="laborDurationDays" 
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.laborDurationDays} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={item.isActive}
                    onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive" className="mr-2">פריט פעיל</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>נתוני תמחור</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">מחיר ליחידה</Label>
                  <Input 
                    id="unitPrice" 
                    name="unitPrice" 
                    type="number" 
                    value={item.unitPrice} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="totalPrice">מחיר כולל</Label>
                  <Input 
                    id="totalPrice" 
                    name="totalPrice" 
                    type="number" 
                    value={item.totalPrice} 
                    disabled
                  />
                  <p className="text-xs text-gray-500">מחושב אוטומטית: כמות × מחיר ליחידה</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customerPrice">מחיר ללקוח</Label>
                  <Input 
                    id="customerPrice" 
                    name="customerPrice" 
                    type="number" 
                    value={item.customerPrice} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="materialCost">עלות חומרים</Label>
                  <Input 
                    id="materialCost" 
                    name="materialCost" 
                    type="number" 
                    value={item.materialCost} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="laborCost">עלות עבודה</Label>
                  <Input 
                    id="laborCost" 
                    name="laborCost" 
                    type="number" 
                    value={item.laborCost} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="additionalCost">עלויות נוספות</Label>
                  <Input 
                    id="additionalCost" 
                    name="additionalCost" 
                    type="number" 
                    value={item.additionalCost} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expectedProfit">רווח צפוי (%)</Label>
                  <Input 
                    id="expectedProfit" 
                    name="expectedProfit" 
                    type="number" 
                    value={item.expectedProfit} 
                    disabled 
                  />
                  <p className="text-xs text-gray-500">מחושב אוטומטית מההפרש בין העלות למחיר</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>פרטים טכניים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="complexityLevel">רמת מורכבות</Label>
                  <Select 
                    value={item.complexityLevel} 
                    onValueChange={(value) => handleSelectChange('complexityLevel', value)}
                  >
                    <SelectTrigger id="complexityLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="גבוהה">גבוהה</SelectItem>
                      <SelectItem value="בינונית">בינונית</SelectItem>
                      <SelectItem value="נמוכה">נמוכה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="needsExcavation"
                      checked={item.needsExcavation}
                      onCheckedChange={(checked) => handleSwitchChange('needsExcavation', checked)}
                    />
                    <Label htmlFor="needsExcavation" className="mr-2">דורש חציבה?</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}