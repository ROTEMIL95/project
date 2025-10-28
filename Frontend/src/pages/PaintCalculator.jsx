
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/components/utils/UserContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calculator,
  Settings,
  Plus,
  Save,
  RefreshCw,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PaintCalculator() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [calculations, setCalculations] = useState([]);
  const [currentCalculation, setCurrentCalculation] = useState({
    paintTypeId: '',
    area: 20,
    layers: 2,
    bucketCount: 0,
    materialCost: 0,
    workDays: 0,
    laborCost: 0,
    additionalMaterials: 0,
    totalCost: 0
  });

  // טעינת הגדרות הצבע של הקבלן
  const [settings, setSettings] = useState(null);
  const [paintTypes, setPaintTypes] = useState([]);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (user.user_metadata?.paintSettings) {
        setSettings(user.user_metadata.paintSettings);
        setPaintTypes(user.user_metadata.paintSettings.paintTypes || []);
      }
      setLoading(false);
    } catch (error) {
      console.error("שגיאה בטעינת הגדרות:", error);
      setLoading(false);
    }
  }, [user, userLoading]);

  // חישוב אוטומטי בכל שינוי של הפרמטרים
  useEffect(() => {
    if (currentCalculation.paintTypeId && currentCalculation.area) {
      const selectedPaint = paintTypes.find(p => p.id === currentCalculation.paintTypeId);
      
      if (selectedPaint) {
        // חישוב כמות דליים
        const totalConsumption = currentCalculation.area * selectedPaint.consumptionPerSqm * currentCalculation.layers;
        const bucketsNeeded = totalConsumption / selectedPaint.bucketSize;
        const roundedBuckets = Math.ceil(bucketsNeeded * 10) / 10;
        
        // חישוב עלות חומר
        const materialCost = roundedBuckets * selectedPaint.bucketPrice;
        
        // חישוב ימי עבודה (50 מ"ר ליום לשכבה אחת)
        const workDays = Math.ceil((currentCalculation.area / 50) * currentCalculation.layers * 10) / 10;
        
        // חישוב עלות עבודה
        const laborCost = workDays * (settings?.workerDailyCost || 500);
        
        setCurrentCalculation(prev => ({
          ...prev,
          bucketCount: roundedBuckets,
          materialCost,
          workDays,
          laborCost,
          totalCost: materialCost + laborCost + (prev.additionalMaterials || 0)
        }));
      }
    }
  }, [
    currentCalculation.paintTypeId,
    currentCalculation.area,
    currentCalculation.layers,
    currentCalculation.additionalMaterials
  ]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
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
        <h1 className="text-2xl font-bold">מחשבון צבע</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(createPageUrl('PaintSettings'))}>
            <Settings className="h-4 w-4 ml-2" />
            הגדרות
          </Button>
          <Button onClick={() => setCalculations([...calculations, currentCalculation])}>
            <Save className="h-4 w-4 ml-2" />
            שמור חישוב
          </Button>
        </div>
      </div>

      {(!settings || paintTypes.length === 0) && (
        <Alert>
          <AlertDescription className="flex items-center">
            <Info className="h-4 w-4 ml-2" />
            נדרש להגדיר את סוגי הצבע וההגדרות הבסיסיות לפני השימוש במחשבון
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>חישוב עלויות צבע</CardTitle>
          <CardDescription>הזן את הנתונים הנדרשים לחישוב</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>סוג צבע</Label>
                <Select 
                  value={currentCalculation.paintTypeId}
                  onValueChange={(value) => setCurrentCalculation(prev => ({
                    ...prev,
                    paintTypeId: value,
                    layers: paintTypes.find(p => p.id === value)?.recommendedLayers || 2
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג צבע" />
                  </SelectTrigger>
                  <SelectContent>
                    {paintTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>שטח לצביעה (מ"ר)</Label>
                <Input
                  type="number"
                  min="1"
                  value={currentCalculation.area}
                  onChange={(e) => setCurrentCalculation(prev => ({
                    ...prev,
                    area: Number(e.target.value)
                  }))}
                />
              </div>

              <div>
                <Label>מספר שכבות</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={currentCalculation.layers}
                  onChange={(e) => setCurrentCalculation(prev => ({
                    ...prev,
                    layers: Number(e.target.value)
                  }))}
                />
              </div>

              <div>
                <Label>חומרים נלווים (₪)</Label>
                <Input
                  type="number"
                  min="0"
                  value={currentCalculation.additionalMaterials}
                  onChange={(e) => setCurrentCalculation(prev => ({
                    ...prev,
                    additionalMaterials: Number(e.target.value)
                  }))}
                  placeholder="רולרים, ניילון, מסקינטייפ וכו'"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="font-medium text-lg mb-4">תוצאות החישוב</h3>
              
              {currentCalculation.paintTypeId ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">כמות דליים נדרשת:</span>
                    <span>{currentCalculation.bucketCount.toFixed(1)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">עלות חומר:</span>
                    <span>₪{currentCalculation.materialCost.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">ימי עבודה:</span>
                    <span>{currentCalculation.workDays.toFixed(1)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">עלות עבודה:</span>
                    <span>₪{currentCalculation.laborCost.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">חומרים נלווים:</span>
                    <span>₪{Number(currentCalculation.additionalMaterials).toLocaleString()}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>סה"כ עלות לקבלן:</span>
                    <span>₪{currentCalculation.totalCost.toLocaleString()}</span>
                  </div>
                  
                  {settings?.defaultProfit && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <div className="flex justify-between">
                        <span>מחיר מומלץ ללקוח:</span>
                        <span>₪{(currentCalculation.totalCost * (1 + settings.defaultProfit / 100)).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        כולל {settings.defaultProfit}% רווח
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-2" />
                  <p>בחר סוג צבע להתחלת החישוב</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {calculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>חישובים שמורים</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>סוג צבע</TableHead>
                  <TableHead>שטח</TableHead>
                  <TableHead>שכבות</TableHead>
                  <TableHead>כמות דליים</TableHead>
                  <TableHead>עלות חומר</TableHead>
                  <TableHead>ימי עבודה</TableHead>
                  <TableHead>עלות עבודה</TableHead>
                  <TableHead>סה"כ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculations.map((calc, index) => {
                  const paintType = paintTypes.find(p => p.id === calc.paintTypeId);
                  return (
                    <TableRow key={index}>
                      <TableCell>{paintType?.name}</TableCell>
                      <TableCell>{calc.area}</TableCell>
                      <TableCell>{calc.layers}</TableCell>
                      <TableCell>{calc.bucketCount.toFixed(1)}</TableCell>
                      <TableCell>₪{calc.materialCost.toLocaleString()}</TableCell>
                      <TableCell>{calc.workDays.toFixed(1)}</TableCell>
                      <TableCell>₪{calc.laborCost.toLocaleString()}</TableCell>
                      <TableCell>₪{calc.totalCost.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
