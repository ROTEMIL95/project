import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calculator } from "lucide-react";

export default function PaintCalculator({ onCalculated = () => {} }) {
  // נתוני חדר
  const [roomDimensions, setRoomDimensions] = useState({
    length: 4, // אורך החדר (מטר)
    width: 3,  // רוחב החדר (מטר)
    height: 2.6, // גובה תקרה (מטר)
    includeCeiling: true, // האם לכלול את התקרה
    windowsArea: 3, // שטח חלונות ודלתות (מ"ר)
    layers: 2, // מספר שכבות
    coverage: 7 // כמה מ"ר מכסה ליטר צבע (ברירת מחדל)
  });
  
  // תוצאות החישוב
  const [calculations, setCalculations] = useState({
    wallsArea: 0,
    ceilingArea: 0,
    totalArea: 0,
    netArea: 0,
    totalPaintArea: 0,
    paintNeeded: 0,
    bucketsNeeded: 0
  });
  
  // סוגי צבע וכיסוי
  const paintTypes = [
    { id: 'regular', name: 'צבע רגיל', coverage: 7 }, // מ"ר לליטר
    { id: 'washable', name: 'צבע רחיץ', coverage: 6.5 },
    { id: 'special', name: 'צבע מיוחד', coverage: 6 },
    { id: 'exterior', name: 'צבע חוץ', coverage: 5.5 }
  ];

  useEffect(() => {
    calculatePaintNeeds();
  }, [roomDimensions]);
  
  // חישוב צרכי צבע
  const calculatePaintNeeds = () => {
    const { length, width, height, includeCeiling, windowsArea, layers, coverage } = roomDimensions;
    
    // חישוב שטח קירות - היקף × גובה
    const perimeter = 2 * (length + width);
    const wallsArea = perimeter * height;
    
    // שטח תקרה
    const ceilingArea = length * width;
    
    // שטח כולל
    const totalArea = wallsArea + (includeCeiling ? ceilingArea : 0);
    
    // שטח נטו (בניכוי חלונות ודלתות)
    const netArea = Math.max(0, totalArea - windowsArea);
    
    // שטח כולל לצביעה (כולל שכבות)
    const totalPaintArea = netArea * layers;
    
    // חישוב כמות צבע דרושה בליטרים
    const paintNeeded = totalPaintArea / coverage;
    
    // כמות דליים (דלי = 18 ליטר)
    const bucketsNeeded = Math.ceil(paintNeeded / 18);
    
    setCalculations({
      wallsArea: parseFloat(wallsArea.toFixed(1)),
      ceilingArea: parseFloat(ceilingArea.toFixed(1)),
      totalArea: parseFloat(totalArea.toFixed(1)),
      netArea: parseFloat(netArea.toFixed(1)),
      totalPaintArea: parseFloat(totalPaintArea.toFixed(1)),
      paintNeeded: parseFloat(paintNeeded.toFixed(1)),
      bucketsNeeded
    });
  };
  
  // עדכון נתוני החדר
  const updateDimension = (key, value) => {
    setRoomDimensions(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // עדכון סוג צבע וכיסוי
  const handlePaintTypeChange = (typeId) => {
    const selectedType = paintTypes.find(type => type.id === typeId);
    if (selectedType) {
      setRoomDimensions(prev => ({
        ...prev,
        coverage: selectedType.coverage
      }));
    }
  };
  
  // העברת תוצאות החישוב להמשך
  const handleApplyCalculations = () => {
    onCalculated({
      ...calculations,
      dimensions: roomDimensions
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>מחשבון צריכת צבע</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* מידות החדר */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">מידות החדר</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>אורך (מ')</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={roomDimensions.length}
                  onChange={(e) => updateDimension('length', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>רוחב (מ')</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={roomDimensions.width}
                  onChange={(e) => updateDimension('width', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>גובה (מ')</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={roomDimensions.height}
                  onChange={(e) => updateDimension('height', parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ceiling"
                  checked={roomDimensions.includeCeiling}
                  onCheckedChange={(checked) => updateDimension('includeCeiling', checked)}
                />
                <Label htmlFor="ceiling" className="mr-2">כולל צביעת תקרה</Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>שטח חלונות ודלתות (מ"ר)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={roomDimensions.windowsArea}
                onChange={(e) => updateDimension('windowsArea', parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          {/* נתוני צבע */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">נתוני צבע</h3>
            <div className="space-y-2">
              <Label>סוג צבע</Label>
              <Select 
                value={paintTypes.find(t => t.coverage === roomDimensions.coverage)?.id || 'regular'}
                onValueChange={handlePaintTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג צבע" />
                </SelectTrigger>
                <SelectContent>
                  {paintTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.coverage} מ"ר לליטר)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>כיסוי (מ"ר לליטר)</Label>
              <Input
                type="number"
                min="1"
                step="0.1"
                value={roomDimensions.coverage}
                onChange={(e) => updateDimension('coverage', parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500">*ניתן להתאים את הכיסוי לפי נתוני היצרן</p>
            </div>
            
            <div className="space-y-2">
              <Label>מספר שכבות</Label>
              <Select 
                value={roomDimensions.layers.toString()} 
                onValueChange={(value) => updateDimension('layers', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">שכבה 1</SelectItem>
                  <SelectItem value="2">2 שכבות</SelectItem>
                  <SelectItem value="3">3 שכבות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* תוצאות החישוב */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-4">תוצאות החישוב</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-gray-500">שטח קירות</Label>
              <div className="text-xl font-bold">{calculations.wallsArea} מ"ר</div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">שטח תקרה</Label>
              <div className="text-xl font-bold">{calculations.ceilingArea} מ"ר</div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">שטח נטו לצביעה</Label>
              <div className="text-xl font-bold">{calculations.netArea} מ"ר</div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">שטח כולל (כולל שכבות)</Label>
              <div className="text-xl font-bold">{calculations.totalPaintArea} מ"ר</div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <Label className="text-sm text-blue-600">כמות צבע נדרשת</Label>
              <div className="text-2xl font-bold text-blue-700">{calculations.paintNeeded} ליטר</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <Label className="text-sm text-green-600">דליים (18 ליטר)</Label>
              <div className="text-2xl font-bold text-green-700">{calculations.bucketsNeeded} יח'</div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button className="w-full" onClick={handleApplyCalculations}>
          <Calculator className="h-4 w-4 ml-2" />
          חשב והוסף לטופס
        </Button>
      </CardFooter>
    </Card>
  );
}