
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  ArrowRight, 
  Save, 
  Check, 
  ArrowLeftRight,
  Settings
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useUser } from '@/components/utils/UserContext';
import { supabase } from '@/lib/supabase';

export default function PaintSimulator({ onAddToQuote }) {
  const { user } = useUser();
  const [settings, setSettings] = useState({
    additionalLayerDiscount: 15, // אחוז הנחה לשכבות נוספות
    baseLaborCost: 60, // עלות עבודה בסיסית למ"ר
    profitMargin: 20 // אחוז רווח
  });

  // State לניהול תצוגת סיכום
  const [showSummary, setShowSummary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // שימוש בstate בסיסי לחדרים
  const [rooms, setRooms] = useState([
    { 
      id: "room1", 
      name: 'חדר מגורים', 
      area: 20, 
      paintType: 'paint_1', 
      layers: 2,
      notes: '',
      complexity: 'normal',
      needsRestoration: false,
      restorationArea: 0,
      restorationLevel: 'light'
    }
  ]);
  
  // רשימת סוגי צבעים
  const paintTypes = [
    { id: 'paint_1', name: 'סופרקריל מט', price: 120 },
    { id: 'paint_2', name: 'סופרקריל משי', price: 150 },
    { id: 'paint_3', name: 'אמולזין', price: 90 },
    { id: 'paint_4', name: 'סופרקריל מ.ד. (חוץ)', price: 190 },
    { id: 'paint_5', name: 'צבע למטבחים ואמבטיות', price: 120 }
  ];
  
  // רשימת סוגי חדרים
  const roomTypes = [
    { id: 'living', name: 'סלון', defaultArea: 25 },
    { id: 'bedroom', name: 'חדר שינה', defaultArea: 16 },
    { id: 'kitchen', name: 'מטבח', defaultArea: 12 },
    { id: 'bathroom', name: 'חדר אמבטיה', defaultArea: 6 },
    { id: 'toilet', name: 'שירותים', defaultArea: 3 },
    { id: 'hallway', name: 'מסדרון', defaultArea: 8 }
  ];

  // מקדמי מורכבות
  const complexityFactors = {
    easy: { label: 'קלה', factor: 1 },
    normal: { label: 'בינונית', factor: 1.1 },
    complex: { label: 'מורכבת', factor: 1.2 }
  };

  // עלויות שיקום למ"ר
  const restorationCosts = {
    light: { label: 'קל', price: 25 },
    medium: { label: 'בינוני', price: 40 },
    heavy: { label: 'כבד', price: 60 }
  };

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        if (user?.user_metadata?.paintSettings) {
          setSettings(user.user_metadata.paintSettings);
        }
      } catch (error) {
        console.error("Error loading paint settings:", error);
      }
    };
    
    loadUserSettings();
  }, [user]);

  const handleSaveSettings = async (newSettings) => {
    try {
      await supabase.auth.updateUser({
        data: {
          paintSettings: newSettings
        }
      });
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving paint settings:", error);
    }
  };
  
  // עדכון פונקציית החישוב לשימוש בהגדרות דינמיות
  const calculateRoomCost = (room) => {
    if (!room || !room.area || !room.paintType) return { cost: 0, days: 0 };
    
    const paintType = paintTypes.find(p => p.id === room.paintType);
    const pricePerSqm = paintType ? paintType.price / 6 : 20; // מחיר למ"ר
    
    // חישוב בסיסי לשכבה ראשונה
    const baseCost = room.area * pricePerSqm;
    
    // חישוב עלות כולל לפי מספר שכבות עם הנחה דינמית
    let totalLayerCost = baseCost;
    
    if (room.layers > 1) {
      // שימוש באחוז ההנחה מההגדרות
      const discountFactor = (100 - settings.additionalLayerDiscount) / 100;
      const additionalLayerCost = baseCost * discountFactor;
      totalLayerCost += additionalLayerCost * (room.layers - 1);
    }
    
    // חישוב ימי עבודה בסיסיים
    let days = (room.area / 50) * room.layers;
    
    // תוספת מורכבות
    const complexityFactor = complexityFactors[room.complexity]?.factor || 1;
    totalLayerCost *= complexityFactor;
    days *= complexityFactor;

    // הוספת עלות שיקום אם נדרש
    if (room.needsRestoration && room.restorationArea > 0) {
      const restorationCost = restorationCosts[room.restorationLevel]?.price || 0;
      totalLayerCost += room.restorationArea * restorationCost;
      days += room.restorationArea / 30;
    }
    
    // הכנת פירוט שכבות לתצוגה
    const layerBreakdown = [
      { layer: 1, cost: baseCost, discount: 0 }, // שכבה ראשונה - מחיר מלא
      ...Array.from({ length: room.layers - 1 }, (_, i) => ({
        layer: i + 2,
        cost: baseCost * ((100 - settings.additionalLayerDiscount) / 100),
        discount: settings.additionalLayerDiscount
      }))
    ];
    
    return {
      cost: Math.round(totalLayerCost),
      days: Math.round(days * 10) / 10,
      layerBreakdown
    };
  };

  
  // חישוב עלות כוללת
  const calculateTotalCost = () => {
    let totalCost = 0;
    let totalDays = 0;
    
    rooms.forEach(room => {
      const { cost, days } = calculateRoomCost(room);
      totalCost += cost;
      totalDays += days;
    });
    
    return { totalCost, totalDays };
  };
  
  // הוספת חדר חדש - עדכון
  const handleAddRoom = () => {
    const newId = `room${rooms.length + 1}`;
    setRooms([...rooms, { 
      id: newId, 
      name: 'חדר חדש', 
      area: 15, 
      paintType: 'paint_1', 
      layers: 2,
      notes: '',
      complexity: 'normal',
      needsRestoration: false,
      restorationArea: 0,
      restorationLevel: 'light'
    }]);
  };
  
  // עדכון פרטי חדר - הרחבת הפונקציה
  const handleUpdateRoom = (index, field, value) => {
    const updatedRooms = [...rooms];
    updatedRooms[index] = { ...updatedRooms[index], [field]: value };

    // אם מעדכנים את שטח החדר ויש שיקום, נעדכן גם את שטח השיקום
    if (field === 'area' && updatedRooms[index].needsRestoration) {
      updatedRooms[index].restorationArea = Math.min(value, updatedRooms[index].restorationArea);
    }

    setRooms(updatedRooms);
  };
  
  // בחירת סוג חדר
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
  
  // החלפה בין מצב עריכה לסיכום
  const handleToggleSummary = () => {
    setShowSummary(!showSummary);
  };
  
  // הגשת הבחירות להצעת המחיר
  const handleSubmit = () => {
    console.log("Submitting paint selections to quote");
    const paintItems = rooms.map(room => {
      const { cost, days } = calculateRoomCost(room);
      const paintType = paintTypes.find(p => p.id === room.paintType);
      
      let description = `${paintType?.name || 'צבע'} - ${room.layers} שכבות`;
      if (room.notes) {
        description += ` - ${room.notes}`;
      }
      
      return {
        itemId: `paint_item_${room.id}`,
        name: `צביעת ${room.name}`,
        description: description,
        quantity: room.area,
        unit: 'מ"ר',
        layers: room.layers,
        unitPrice: Math.round(cost / room.area),
        materialCost: Math.round(cost * 0.6),
        laborCost: Math.round(cost * 0.4),
        totalCost: cost,
        additionalDetails: {
          workDays: days,
          notes: room.notes
        }
      };
    });
    
    // העברת הפריטים חזרה למסך הראשי
    if (onAddToQuote) {
      console.log("Calling onAddToQuote with items:", paintItems);
      onAddToQuote(paintItems);
    }
  };
  
  const { totalCost, totalDays } = calculateTotalCost();
  
  // עדכון התצוגה להציג את פירוט העלויות לפי שכבות
  const renderCostBreakdown = (room) => {
    const { layerBreakdown } = calculateRoomCost(room);
    return (
      <div className="mt-2 text-sm">
        <div className="font-medium mb-1">פירוט עלויות לפי שכבות:</div>
        {layerBreakdown.map((layer) => (
          <div key={layer.layer} className="text-gray-600">
            שכבה {layer.layer}: {Math.round(layer.cost)} ₪
            {layer.discount > 0 && <span className="text-green-600 mr-2">(-{layer.discount}%)</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">סימולטור צבע</h2>
        <Button variant="outline" onClick={() => setShowSettings(true)}>
          <Settings className="h-4 w-4 ml-2" />
          הגדרות מחירים
        </Button>
      </div>
      {!showSummary ? (
        // מצב עריכה - הוספת חדרים
        <Card>
          <CardHeader>
            <CardTitle>בחירת חדרים לצביעה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {rooms.map((room, index) => (
                <div key={room.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">חדר {index + 1}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>סוג החדר</Label>
                      <Select
                        value={roomTypes.find(rt => rt.name === room.name)?.id || ''}
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
                      <Label>סוג צבע</Label>
                      <Select
                        value={room.paintType}
                        onValueChange={(value) => handleUpdateRoom(index, 'paintType', value)}
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
                    
                    <div className="space-y-2">
                      <Label>מספר שכבות</Label>
                      <Select
                        value={room.layers.toString()}
                        onValueChange={(value) => handleUpdateRoom(index, 'layers', Number(value))}
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

                    <div className="space-y-2">
                      <Label>רמת מורכבות</Label>
                      <Select
                        value={room.complexity}
                        onValueChange={(value) => handleUpdateRoom(index, 'complexity', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(complexityFactors).map(([key, { label, factor }]) => (
                            <SelectItem key={key} value={key}>
                              {label} (+{((factor - 1) * 100).toFixed(0)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={room.needsRestoration}
                          onCheckedChange={(checked) => 
                            handleUpdateRoom(index, 'needsRestoration', checked)
                          }
                        />
                        <Label>נדרש שיקום קירות</Label>
                      </div>

                      {room.needsRestoration && (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="space-y-2">
                            <Label>שטח לשיקום (מ"ר)</Label>
                            <Input
                              type="number"
                              value={room.restorationArea}
                              onChange={(e) => handleUpdateRoom(index, 'restorationArea', 
                                Math.min(Number(e.target.value), room.area))}
                              max={room.area}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>רמת שיקום</Label>
                            <Select
                              value={room.restorationLevel}
                              onValueChange={(value) => 
                                handleUpdateRoom(index, 'restorationLevel', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(restorationCosts).map(([key, { label, price }]) => (
                                  <SelectItem key={key} value={key}>
                                    {label} ({price} ₪ למ"ר)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 col-span-2">
                      <Label>הערות</Label>
                      <Textarea
                        placeholder="הערות נוספות לגבי צביעת החדר..."
                        value={room.notes}
                        onChange={(e) => handleUpdateRoom(index, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <div className="flex justify-between mb-1">
                      <span>עלות צביעה:</span>
                      <span>₪{calculateRoomCost(room).cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ימי עבודה:</span>
                      <span>{calculateRoomCost(room).days}</span>
                    </div>
                    {renderCostBreakdown(room)}
                  </div>
                </div>
              ))}
              
              <Button onClick={handleAddRoom} variant="outline" className="w-full">
                <Plus className="h-4 w-4 ml-2" />
                הוסף חדר נוסף
              </Button>
            </div>
          </CardContent>
          <CardFooter className="gap-2 justify-end">
            <Button onClick={handleToggleSummary} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeftRight className="h-4 w-4 ml-2" />
              צפה בסיכום
            </Button>
          </CardFooter>
        </Card>
      ) : (
        // מצב סיכום
        <Card>
          <CardHeader>
            <CardTitle>סיכום עבודות צבע</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>חדר</TableHead>
                  <TableHead>סוג צבע</TableHead>
                  <TableHead>שטח (מ"ר)</TableHead>
                  <TableHead>שכבות</TableHead>
                  <TableHead>ימי עבודה</TableHead>
                  <TableHead>עלות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => {
                  const { cost, days } = calculateRoomCost(room);
                  const paintType = paintTypes.find(p => p.id === room.paintType);
                  
                  return (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">
                        {room.name}
                        {room.notes && (
                          <div className="text-xs text-gray-500">{room.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>{paintType?.name}</TableCell>
                      <TableCell>{room.area}</TableCell>
                      <TableCell>{room.layers}</TableCell>
                      <TableCell>{days}</TableCell>
                      <TableCell>₪{cost}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            <div className="grid grid-cols-2 gap-4 my-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600">סה"כ שטח</div>
                <div className="text-2xl font-bold text-blue-700">
                  {rooms.reduce((sum, room) => sum + (room.area || 0), 0)} מ"ר
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">סה"כ ימי עבודה</div>
                <div className="text-2xl font-bold text-green-700">
                  {totalDays.toFixed(1)}
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex justify-between text-xl font-medium my-6">
              <span>סה"כ עלות:</span>
              <span className="text-2xl font-bold">₪{totalCost}</span>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 justify-between">
            <Button variant="outline" onClick={handleToggleSummary}>
              חזרה לעריכה
            </Button>
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 ml-2" />
              אישור והוספה להצעת המחיר
            </Button>
          </CardFooter>
        </Card>
      )}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הגדרות מחירי צבע</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>הנחה לשכבות נוספות (%)</Label>
                <Input
                  type="number"
                  value={settings.additionalLayerDiscount}
                  onChange={(e) => setSettings({
                    ...settings,
                    additionalLayerDiscount: Number(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>עלות עבודה בסיסית למ"ר (₪)</Label>
                <Input
                  type="number"
                  value={settings.baseLaborCost}
                  onChange={(e) => setSettings({
                    ...settings,
                    baseLaborCost: Number(e.target.value)
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
            </div>
            <DialogFooter>
              <Button onClick={() => {
                handleSaveSettings(settings);
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
