
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

// הוספת מקדמי מורכבות קבועים לשימוש מיידי - ייעודי לחישוב חדרים
const COMPLEXITY_OPTIONS = [
  {
    id: 'standard',
    label: 'רגיל',
    factor: 1.0,
    description: 'חדר רגיל, תקרות סטנדרטיות, גישה טובה'
  },
  {
    id: 'moderate',
    label: 'בינוני',
    factor: 1.15,
    description: 'תקרה גבוהה מעט, מעט פינות, גישה סבירה'
  },
  {
    id: 'complex',
    label: 'מורכב',
    factor: 1.30,
    description: 'תקרה גבוהה, פינות רבות, גישה מוגבלת'
  },
  {
    id: 'very_complex',
    label: 'מורכב מאוד',
    factor: 1.50,
    description: 'תקרה גבוהה מאוד, פרטים רבים, גישה קשה'
  },
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8" dir="rtl">
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

            {/* טבלת סיכום חדרים נבחרים */}
            {selectedRooms.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    חדרים נבחרים ({selectedRooms.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {selectedRooms.map(selectedRoom => {
                      const roomData = roomEstimatesData.find(r => r.id === selectedRoom.id);
                      if (!roomData) return null;

                      const complexityFactor = selectedRoom.difficultyData?.factor || 1.0;
                      const wallArea = roomData.wallAreaSqM * complexityFactor * selectedRoom.quantity;
                      const ceilingArea = selectedRoom.includeCeiling
                        ? roomData.ceilingAreaSqM * complexityFactor * selectedRoom.quantity
                        : 0;

                      return (
                        <div key={selectedRoom.id} className="flex justify-between items-center text-sm p-3 bg-white rounded border border-blue-200 hover:border-blue-300 transition-colors">
                          <div className="flex items-center gap-3">
                            {getRoomIcon(roomData.roomType)}
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{roomData.roomType}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs h-5">
                                  כמות: {selectedRoom.quantity}
                                </Badge>
                                <Badge variant="outline" className="text-xs h-5 bg-purple-50 border-purple-200">
                                  {selectedRoom.difficultyData?.label || 'רגיל'} (×{complexityFactor.toFixed(2)})
                                </Badge>
                                {selectedRoom.includeCeiling && (
                                  <Badge variant="outline" className="text-xs h-5 bg-yellow-50 border-yellow-200">
                                    + תקרה
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">
                              {wallArea.toFixed(1)} מ"ר קירות
                            </span>
                            {ceilingArea > 0 && (
                              <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded">
                                + {ceilingArea.toFixed(1)} מ"ר תקרה
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* בחירת חללים */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Home className="h-4 w-4" />
                בחר סוגי חדרים לחישוב
                {selectedRooms.length > 0 && (
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    {selectedRooms.length} נבחרו
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Show selected rooms first */}
                {roomEstimatesData
                  .sort((a, b) => {
                    const aSelected = selectedRooms.find(r => r.id === a.id);
                    const bSelected = selectedRooms.find(r => r.id === b.id);
                    if (aSelected && !bSelected) return -1;
                    if (!aSelected && bSelected) return 1;
                    return 0;
                  })
                  .map(room => {
                    const selectedRoom = selectedRooms.find(r => r.id === room.id);
                    const isSelected = !!selectedRoom;

                    const currentComplexity = selectedRoom?.difficultyData?.id || COMPLEXITY_OPTIONS[0].id;

                    return (
                  <Card
                    key={room.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 via-indigo-50/70 to-white shadow-lg ring-2 ring-indigo-200 ring-offset-1'
                        : 'border border-gray-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                    onClick={() => toggleRoomSelection(room.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className={`text-base font-semibold flex items-center gap-2 ${
                          isSelected ? 'text-indigo-800' : 'text-gray-800'
                        }`}>
                          {getRoomIcon(room.roomType)}
                          {room.roomType}
                          {isSelected && (
                            <Badge className="bg-indigo-500 text-white text-xs h-5 px-2">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              נבחר
                            </Badge>
                          )}
                        </CardTitle>
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          readOnly
                          className={`w-5 h-5 rounded focus:ring-indigo-500 focus:ring-2 ${
                            isSelected ? 'text-indigo-600 bg-indigo-100 border-indigo-400' : 'text-indigo-600 bg-gray-100 border-gray-300'
                          }`}
                        />
                      </div>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
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
                            dir="rtl"
                          >
                            <SelectTrigger className="h-8 text-sm bg-white" dir="rtl">
                              <SelectValue placeholder="בחר מורכבות" />
                            </SelectTrigger>
                            <SelectContent 
                              className="z-[9999] bg-white" 
                              position="popper" 
                              sideOffset={5}
                              align="start"
                              avoidCollisions={true}
                              dir="rtl"
                            >
                              {COMPLEXITY_OPTIONS.map(o => (
                                <SelectItem key={o.id} value={o.id} className="cursor-pointer text-right" dir="rtl">
                                  <div className="flex flex-col items-start py-1 text-right w-full" dir="rtl">
                                    <div className="flex items-center gap-2 w-full justify-start">
                                      <span className="font-medium">{o.label}</span>
                                      <span className="text-xs text-gray-500">(×{o.factor.toFixed(2)})</span>
                                    </div>
                                    {o.description && (
                                      <span className="text-xs text-gray-500 mt-0.5 leading-tight text-right">{o.description}</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* תוצאה לחדר זה */}
                        <div className="text-xs bg-gradient-to-l from-indigo-50 to-white p-3 rounded border border-indigo-200">
                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-indigo-100">
                            <span className="font-semibold text-gray-700">חישוב לחדר זה:</span>
                            <Badge variant="outline" className="text-xs bg-white border-indigo-300">
                              {selectedRoom?.difficultyData?.label || 'רגיל'}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-gray-600 mb-1">
                            <span>קירות (בסיס: {room.wallAreaSqM} מ"ר):</span>
                            <span className="font-mono font-semibold text-blue-600">
                              {(() => {
                                const complexityFactor = selectedRoom?.difficultyData?.factor || COMPLEXITY_OPTIONS[0].factor;
                                return (room.wallAreaSqM * complexityFactor * (selectedRoom?.quantity || 1)).toFixed(1);
                              })()} מ"ר
                            </span>
                          </div>
                          {selectedRoom?.includeCeiling && (
                            <div className="flex justify-between text-gray-600">
                              <span>תקרה (בסיס: {room.ceilingAreaSqM} מ"ר):</span>
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
