
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from '@/components/utils/UserContext';
import { 
  Home, 
  Calculator, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Bed, // New import
  Sofa, // New import
  ChefHat, // New import
  Bath, // New import
  Building // New import
} from 'lucide-react';

// הוספת מקדמי מורכבות קבועים לשימוש מיידי
const COMPLEXITY_OPTIONS = [
  { id: 'easy', label: 'קל', factor: 1.0 },
  { id: 'medium', label: 'בינוני', factor: 1.10 },
  { id: 'hard', label: 'קשה', factor: 1.25 },
  { id: 'very_hard', label: 'קשה מאוד', factor: 1.50 },
];

// פונקציה לקביעת האייקון המתאים לכל סוג חלל
const getRoomIcon = (roomType) => {
  const lowerRoomType = roomType.toLowerCase();
  
  if (lowerRoomType.includes('שינה')) {
    return <Bed className="h-4 w-4 text-purple-500" />;
  }
  if (lowerRoomType.includes('סלון')) {
    return <Sofa className="h-4 w-4 text-orange-500" />;
  }
  if (lowerRoomType.includes('מטבח')) {
    return <ChefHat className="h-4 w-4 text-green-500" />;
  }
  if (lowerRoomType.includes('אמבטיה') || lowerRoomType.includes('שירותים')) {
    return <Bath className="h-4 w-4 text-blue-500" />;
  }
  // ברירת מחדל לחללים אחרים
  return <Building className="h-4 w-4 text-gray-500" />;
};

export default function RoomEstimatesCalculator({ isOpen, onClose, onCalculate, workType = '', initialRoomData }) {
  const { user } = useUser();
  const [roomEstimatesData, setRoomEstimatesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculatedArea, setCalculatedArea] = useState(0);

  // Array of objects: {id, quantity, includeCeiling, name, difficultyData: { id, label, factor }}
  const [selectedRooms, setSelectedRooms] = useState([]); 
  const [totalWallArea, setTotalWallArea] = useState(0);
  const [totalCeilingArea, setTotalCeilingArea] = useState(0);

  // Helper function to transform difficulty data from different formats to standard format
  const transformDifficultyData = useCallback((data) => {
    if (!data) return COMPLEXITY_OPTIONS[0];

    // If already in correct format with id and factor
    if (data.id && data.factor !== undefined) {
      return data;
    }

    // Transform from old format using 'multiplier' instead of 'factor'
    if (data.multiplier !== undefined) {
      const option = COMPLEXITY_OPTIONS.find(o => Math.abs(o.factor - data.multiplier) < 0.01);
      return option || COMPLEXITY_OPTIONS[0];
    }

    // Transform from label-only format
    if (data.label) {
      const option = COMPLEXITY_OPTIONS.find(o => o.label === data.label);
      return option || COMPLEXITY_OPTIONS[0];
    }

    // Fallback to easy
    return COMPLEXITY_OPTIONS[0];
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadRoomEstimatesData();

      // Load initial room data if provided, otherwise reset
      if (initialRoomData && initialRoomData.detailedRooms) {
        console.log('🔍 RoomEstimatesCalculator - Loading initial data:', initialRoomData);

        // Restore previously selected rooms with their complexity settings
        const restoredRooms = initialRoomData.detailedRooms.map(room => {
          const transformedDifficulty = transformDifficultyData(room.difficultyData);
          console.log('📊 Room:', room.name, '- Original difficulty:', room.difficultyData, '- Transformed:', transformedDifficulty);

          return {
            id: room.id || `room_${Date.now()}`,
            quantity: room.quantity || 1,
            includeCeiling: room.includeCeiling || false,
            difficultyData: transformedDifficulty,
            name: room.name
          };
        });

        console.log('✅ Restored rooms:', restoredRooms);
        setSelectedRooms(restoredRooms);
      } else {
        // Reset states when dialog opens without initial data
        setCalculatedArea(0);
        setSelectedRooms([]);
        setTotalWallArea(0);
        setTotalCeilingArea(0);
      }
    }
  }, [isOpen, user, initialRoomData, transformDifficultyData]);

  const loadRoomEstimatesData = async () => {
    try {
      setLoading(true);
      if (user && user.user_metadata?.roomEstimates) {
        setRoomEstimatesData(user.user_metadata.roomEstimates);
      } else {
        // Fallback to default data
        setRoomEstimatesData([
            { id: 'small_bedroom', roomType: 'חדר שינה קטן', wallAreaSqM: 35, ceilingAreaSqM: 10 },
            { id: 'medium_bedroom', roomType: 'חדר שינה בינוני', wallAreaSqM: 40, ceilingAreaSqM: 12 },
            { id: 'large_bedroom', roomType: 'חדר שינה גדול', wallAreaSqM: 45, ceilingAreaSqM: 15 },
            { id: 'small_living_room', roomType: 'סלון קטן', wallAreaSqM: 50, ceilingAreaSqM: 20 },
            { id: 'large_living_room', roomType: 'סלון גדול', wallAreaSqM: 80, ceilingAreaSqM: 30 },
            { id: 'kitchen', roomType: 'מטבח', wallAreaSqM: 25, ceilingAreaSqM: 10 },
            { id: 'bathroom', roomType: 'אמבטיה', wallAreaSqM: 20, ceilingAreaSqM: 5 },
        ]);
      }
    } catch (error) {
      console.error("Error loading room estimates:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRoomTypeArea = useCallback(() => {
    if (selectedRooms.length === 0) {
      setCalculatedArea(0);
      setTotalWallArea(0);
      setTotalCeilingArea(0);
      return;
    }

    let finalTotalWallArea = 0;
    let finalTotalCeilingArea = 0;
    
    selectedRooms.forEach(selectedRoom => {
      const roomData = roomEstimatesData.find(room => room.id === selectedRoom.id);
      if (roomData) {
        const quantity = selectedRoom.quantity || 1;
        const includeCeiling = selectedRoom.includeCeiling || false;
        const complexityFactor = selectedRoom.difficultyData?.factor || COMPLEXITY_OPTIONS[0].factor; // Default to easy

        let wallArea = roomData.wallAreaSqM * complexityFactor;
        
        finalTotalWallArea += wallArea * quantity;
        
        if (includeCeiling && roomData.ceilingAreaSqM) {
          finalTotalCeilingArea += (roomData.ceilingAreaSqM * complexityFactor) * quantity;
        }
      }
    });
    
    setTotalWallArea(Math.max(0, finalTotalWallArea));
    setTotalCeilingArea(Math.max(0, finalTotalCeilingArea));
    setCalculatedArea(Math.max(0, finalTotalWallArea + finalTotalCeilingArea));
  }, [selectedRooms, roomEstimatesData]);

  useEffect(() => {
    calculateRoomTypeArea();
  }, [selectedRooms, calculateRoomTypeArea]);

  const toggleRoomSelection = (roomId) => {
    setSelectedRooms(prev => {
      const isSelected = prev.find(r => r.id === roomId);
      if (isSelected) {
        return prev.filter(r => r.id !== roomId);
      } else {
        const roomData = roomEstimatesData.find(room => room.id === roomId);
        return [...prev, {
          id: roomId,
          quantity: 1,
          difficultyData: COMPLEXITY_OPTIONS[0], // Default to 'easy' complexity
          includeCeiling: false,
          name: roomData?.roomType || roomId
        }];
      }
    });
  };

  const updateRoomQuantity = (roomId, quantity) => {
    setSelectedRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, quantity: Math.max(1, quantity) } : room
    ));
  };

  const updateRoomComplexity = (roomId, levelId) => {
    const selectedComplexity = COMPLEXITY_OPTIONS.find(o => o.id === levelId) || COMPLEXITY_OPTIONS[0];
    setSelectedRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, difficultyData: selectedComplexity } : room
    ));
  };

  const toggleCeiling = (roomId) => {
    setSelectedRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, includeCeiling: !room.includeCeiling } : room
    ));
  };

  const handleConfirm = () => {
    if (calculatedArea > 0) {
      const detailedCalculation = {
        totalArea: calculatedArea,
        wallSqM: totalWallArea, 
        ceilingSqM: totalCeilingArea,
        detailedRooms: selectedRooms.map(selectedRoom => { 
          const roomData = roomEstimatesData.find(room => room.id === selectedRoom.id);
          if (roomData) {
            const quantity = selectedRoom.quantity || 1;
            const complexityFactor = selectedRoom.difficultyData?.factor || COMPLEXITY_OPTIONS[0].factor;

            let wallArea = roomData.wallAreaSqM * complexityFactor;
            let ceilingArea = roomData.ceilingAreaSqM * complexityFactor;

            return {
              id: selectedRoom.id, // Include room ID for restoration
              name: roomData.roomType,
              quantity: quantity,
              includeCeiling: selectedRoom.includeCeiling || false,
              difficultyData: selectedRoom.difficultyData, // Include complexity data
              wallArea: wallArea * quantity,
              ceilingArea: selectedRoom.includeCeiling ? ceilingArea * quantity : 0
            };
          }
          return null;
        }).filter(Boolean)
      };
      onCalculate(detailedCalculation);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calculator className="h-6 w-6 text-indigo-600" />
            </div>
            חישוב כמות מתקדם - שטח {workType === 'paint' ? 'קירות' : 'טיח'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="mr-2">טוען נתונים...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* סיכום כללי */}
            {calculatedArea > 0 && (
              <Card className="bg-gradient-to-l from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">סה"כ שטח מחושב</span>
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold text-green-700">{calculatedArea.toFixed(1)} מ"ר</div>
                      <div className="text-sm text-green-600">
                        קירות: {totalWallArea.toFixed(1)} • תקרה: {totalCeilingArea.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* בחירת חללים */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roomEstimatesData.map(room => {
                const selectedRoom = selectedRooms.find(r => r.id === room.id);
                const isSelected = !!selectedRoom;
                
                const currentComplexity = selectedRoom?.difficultyData?.id || COMPLEXITY_OPTIONS[0].id;

                return (
                  <Card 
                    key={room.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected 
                        ? 'border-2 border-indigo-400 bg-indigo-50/50 shadow-sm' 
                        : 'border border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => toggleRoomSelection(room.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                          {getRoomIcon(room.roomType)} {/* Using the new helper function */}
                          {room.roomType}
                        </CardTitle>
                        <input 
                          type="checkbox" 
                          checked={!!isSelected} 
                          readOnly
                          className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        קירות: {room.wallAreaSqM} מ"ר • תקרה: {room.ceilingAreaSqM} מ"ר
                      </div>
                    </CardHeader>
                    
                    {isSelected && (
                      <CardContent className="pt-0 space-y-3" onClick={e => e.stopPropagation()}>
                        {/* שורה עליונה: כמות ותקרה */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600 mb-1 block">כמות</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.preventDefault();
                                  updateRoomQuantity(room.id, (selectedRoom?.quantity || 1) - 1);
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={selectedRoom?.quantity || 1}
                                onChange={(e) => updateRoomQuantity(room.id, parseInt(e.target.value) || 1)}
                                className="h-8 text-center text-sm font-semibold"
                                min={1}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.preventDefault();
                                  updateRoomQuantity(room.id, (selectedRoom?.quantity || 1) + 1);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <Label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={selectedRoom?.includeCeiling || false}
                                onChange={() => toggleCeiling(room.id)}
                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                              />
                              <span className={selectedRoom?.includeCeiling ? 'text-indigo-700 font-medium' : 'text-gray-600'}>
                                כולל תקרה
                              </span>
                            </Label>
                          </div>
                        </div>

                        {/* שורה תחתונה: רמת מורכבות (מחליף פתחים) */}
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">רמת מורכבות</Label>
                          <Select
                            value={currentComplexity}
                            onValueChange={(value) => updateRoomComplexity(room.id, value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="בחר מורכבות" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPLEXITY_OPTIONS.map(o => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.label} (x{(o.factor).toFixed(2)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* תוצאה לחalל זה */}
                        <div className="text-xs bg-gray-50 p-2 rounded border-t">
                          <div className="flex justify-between text-gray-600">
                            <span>קירות לאחר מקדם מורכבות:</span>
                            <span className="font-mono font-semibold text-blue-600">
                              {(() => {
                                const complexityFactor = selectedRoom?.difficultyData?.factor || COMPLEXITY_OPTIONS[0].factor;
                                return (room.wallAreaSqM * complexityFactor * (selectedRoom?.quantity || 1)).toFixed(1);
                              })()} מ"ר
                            </span>
                          </div>
                          {selectedRoom?.includeCeiling && (
                            <div className="flex justify-between text-gray-600">
                              <span>תקרה לאחר מקדם מורכבות:</span>
                              <span className="font-mono font-semibold text-purple-600">
                                {((room.ceilingAreaSqM * (selectedRoom?.difficultyData?.factor || COMPLEXITY_OPTIONS[0].factor)) * (selectedRoom?.quantity || 1)).toFixed(1)} מ"ר
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={calculatedArea === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            השתמש בחישוב ({calculatedArea.toFixed(1)} מ"ר)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
