
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
import { supabase } from '@/lib/supabase';
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
  Building, // New import
  DollarSign, // New import for price summary
  Settings, // New import for edit mode
  Trash2, // New import for delete button
  Save, // New import for save button
  X, // New import for cancel button
  ChevronUp, // For expand/collapse controls
  ChevronDown // For expand/collapse controls
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

// פונקציה לזיהוי גודל החדר מתוך שם החדר
const getRoomSizeCategory = (roomType) => {
  const lowerRoomType = roomType.toLowerCase();

  if (lowerRoomType.includes('קטן')) {
    return 'small';
  }
  if (lowerRoomType.includes('בינוני')) {
    return 'medium';
  }
  if (lowerRoomType.includes('גדול')) {
    return 'large';
  }
  // ברירת מחדל לחדרים ללא סיווג גודל
  return 'medium';
};

// פונקציה להחזרת הצבעים לפי גודל החדר
const getRoomSizeStyles = (size) => {
  switch (size) {
    case 'small':
      return {
        border: 'border-green-500',
        borderHover: 'hover:border-green-400',
        bg: 'from-green-50 via-green-50/70 to-white',
        ring: 'ring-green-200',
        badge: 'bg-green-500',
        text: 'text-green-700',
        icon: 'text-green-600',
        label: 'קטן',
        badgeLabel: 'S'
      };
    case 'large':
      return {
        border: 'border-purple-500',
        borderHover: 'hover:border-purple-400',
        bg: 'from-purple-50 via-purple-50/70 to-white',
        ring: 'ring-purple-200',
        badge: 'bg-purple-500',
        text: 'text-purple-700',
        icon: 'text-purple-600',
        label: 'גדול',
        badgeLabel: 'L'
      };
    case 'medium':
    default:
      return {
        border: 'border-blue-500',
        borderHover: 'hover:border-blue-400',
        bg: 'from-blue-50 via-blue-50/70 to-white',
        ring: 'ring-blue-200',
        badge: 'bg-blue-500',
        text: 'text-blue-700',
        icon: 'text-blue-600',
        label: 'בינוני',
        badgeLabel: 'M'
      };
  }
};

export default function RoomEstimatesCalculator({ isOpen, onClose, onCalculate, workType = '', initialRoomData, paintItemData, plasterItemData, userDefaults }) {
  const { user } = useUser();
  const [roomEstimatesData, setRoomEstimatesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculatedArea, setCalculatedArea] = useState(0);

  // Array of objects: {id, quantity, includeCeiling, name, difficultyData: { id, label, factor }}
  const [selectedRooms, setSelectedRooms] = useState([]); 
  const [totalWallArea, setTotalWallArea] = useState(0);
  const [totalCeilingArea, setTotalCeilingArea] = useState(0);
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false);
  const [newRoom, setNewRoom] = useState({
    roomType: '',
    wallAreaSqM: 0,
    ceilingAreaSqM: 0
  });
  
  // Track which room cards are expanded (not auto-open)
  const [expandedRoomIds, setExpandedRoomIds] = useState([]);

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
    
    console.log('🔢 [RoomEstimatesCalculator] Calculating areas for selected rooms:', selectedRooms);
    
    selectedRooms.forEach(selectedRoom => {
      const roomData = roomEstimatesData.find(room => room.id === selectedRoom.id);
      if (roomData) {
        const quantity = selectedRoom.quantity || 1;
        const includeCeiling = selectedRoom.includeCeiling || false;
        const complexityFactor = selectedRoom.difficultyData?.factor || COMPLEXITY_OPTIONS[0].factor; // Default to easy

        let wallArea = roomData.wallAreaSqM * complexityFactor;
        
        finalTotalWallArea += wallArea * quantity;
        
        console.log(`🔢 Room: ${roomData.roomType}, includeCeiling: ${includeCeiling}, ceilingAreaSqM: ${roomData.ceilingAreaSqM}`);
        
        if (includeCeiling && roomData.ceilingAreaSqM) {
          const ceilingContribution = (roomData.ceilingAreaSqM * complexityFactor) * quantity;
          finalTotalCeilingArea += ceilingContribution;
          console.log(`✅ Adding ceiling: ${ceilingContribution} sqm`);
        } else {
          console.log(`❌ Ceiling not included or no ceiling area`);
        }
      }
    });
    
    console.log(`🔢 Final totals - Wall: ${finalTotalWallArea}, Ceiling: ${finalTotalCeilingArea}, Total: ${finalTotalWallArea + finalTotalCeilingArea}`);
    
    setTotalWallArea(Math.max(0, finalTotalWallArea));
    setTotalCeilingArea(Math.max(0, finalTotalCeilingArea));
    setCalculatedArea(Math.max(0, finalTotalWallArea + finalTotalCeilingArea));
  }, [selectedRooms, roomEstimatesData]);

  useEffect(() => {
    calculateRoomTypeArea();
  }, [selectedRooms, calculateRoomTypeArea]);

  // Calculate estimated price based on selected paint/plaster item
  const calculateEstimatedPrice = useCallback(() => {
    if (!paintItemData && !plasterItemData) return null;

    const itemData = workType === 'paint' ? paintItemData : plasterItemData;
    if (!itemData) return null;

    // Get pricing from item data
    const pricePerSqM = itemData.pricePerSqM || itemData.unitPrice || 0;
    const costPerSqM = itemData.costPerSqM || itemData.unitCost || 0;

    // Calculate totals
    const totalPrice = calculatedArea * pricePerSqM;
    const totalCost = calculatedArea * costPerSqM;
    const profit = totalPrice - totalCost;
    const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    return {
      totalPrice: Math.round(totalPrice),
      totalCost: Math.round(totalCost),
      profit: Math.round(profit),
      profitPercent: Math.round(profitPercent),
      pricePerSqM,
      costPerSqM
    };
  }, [calculatedArea, paintItemData, plasterItemData, workType]);

  const toggleRoomSelection = (roomId) => {
    setSelectedRooms(prev => {
      const isSelected = prev.find(r => r.id === roomId);
      if (isSelected) {
        // Remove from expanded list when deselecting
        setExpandedRoomIds(expanded => expanded.filter(id => id !== roomId));
        return prev.filter(r => r.id !== roomId);
      } else {
        const roomData = roomEstimatesData.find(room => room.id === roomId);
        // Don't auto-expand - user can click to expand manually
        return [...prev, {
          id: roomId,
          quantity: 1,
          difficultyData: COMPLEXITY_OPTIONS[0], // Default to 'easy' complexity
          includeCeiling: true, // Changed to true - include ceiling by default
          name: roomData?.roomType || roomId
        }];
      }
    });
  };
  
  const toggleRoomExpanded = (roomId) => {
    setExpandedRoomIds(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
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
    console.log('🔄 [toggleCeiling] Toggling ceiling for room:', roomId);
    setSelectedRooms(prev => {
      const updated = prev.map(room => {
        if (room.id === roomId) {
          const newValue = !room.includeCeiling;
          console.log(`🔄 Room ${roomId}: includeCeiling changed from ${room.includeCeiling} to ${newValue}`);
          return { ...room, includeCeiling: newValue };
        }
        return room;
      });
      console.log('🔄 Updated selectedRooms:', updated);
      return updated;
    });
  };

  // Edit mode functions
  const handleAddNewRoom = () => {
    setNewRoom({
      roomType: '',
      wallAreaSqM: 0,
      ceilingAreaSqM: 0
    });
    setShowAddRoomDialog(true);
  };

  const handleSaveNewRoom = () => {
    if (!newRoom.roomType.trim()) {
      alert('נא להזין שם חדר');
      return;
    }

    setRoomEstimatesData(prev => [...prev, {
      id: `custom_room_${Date.now()}`,
      roomType: newRoom.roomType,
      wallAreaSqM: Number(newRoom.wallAreaSqM) || 0,
      ceilingAreaSqM: Number(newRoom.ceilingAreaSqM) || 0
    }]);

    setShowAddRoomDialog(false);
    setNewRoom({
      roomType: '',
      wallAreaSqM: 0,
      ceilingAreaSqM: 0
    });
  };

  const handleDeleteRoom = (roomId) => {
    if (confirm('האם אתה בטוח שברצונך למחוק חדר זה?')) {
      setRoomEstimatesData(prev => prev.filter(r => r.id !== roomId));
      setSelectedRooms(prev => prev.filter(r => r.id !== roomId));
    }
  };

  const handleUpdateRoomField = (roomId, field, value) => {
    setRoomEstimatesData(prev => prev.map(r => 
      r.id === roomId ? { ...r, [field]: value } : r
    ));
  };

  const handleSaveRoomEstimates = async () => {
    try {
      // Save to user metadata
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          roomEstimates: roomEstimatesData
        }
      });
      alert('הגדרות החדרים נשמרו בהצלחה!');
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving room estimates:', error);
      alert('שגיאה בשמירת הגדרות החדרים');
    }
  };

  const handleConfirm = () => {
    if (calculatedArea > 0) {
      // Get pricing data
      const itemData = workType === 'paint' ? paintItemData : plasterItemData;
      const pricePerSqM = itemData?.pricePerSqM || itemData?.unitPrice || 0;
      const costPerSqM = itemData?.costPerSqM || itemData?.unitCost || 0;

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
            
            // Calculate total area for this room
            const roomTotalWallArea = wallArea * quantity;
            const roomTotalCeilingArea = selectedRoom.includeCeiling ? ceilingArea * quantity : 0;
            const roomTotalArea = roomTotalWallArea + roomTotalCeilingArea;
            
            // Calculate price for this room
            const roomTotalPrice = roomTotalArea * pricePerSqM;
            const roomTotalCost = roomTotalArea * costPerSqM;
            const roomProfit = roomTotalPrice - roomTotalCost;

            return {
              id: selectedRoom.id, // Include room ID for restoration
              name: roomData.roomType, // Always use the actual room type name from roomData
              roomName: roomData.roomType, // Keep the original room type for reference
              quantity: quantity,
              includeCeiling: selectedRoom.includeCeiling || false,
              difficultyData: selectedRoom.difficultyData, // Include complexity data
              wallArea: roomTotalWallArea,
              ceilingArea: roomTotalCeilingArea,
              totalArea: roomTotalArea,
              // Price information
              pricePerSqM: pricePerSqM,
              costPerSqM: costPerSqM,
              totalPrice: Math.round(roomTotalPrice),
              totalCost: Math.round(roomTotalCost),
              profit: Math.round(roomProfit)
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
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Calculator className="h-6 w-6 text-indigo-600" />
              </div>
              חישוב כמות מתקדם - שטח {workType === 'paint' ? 'קירות' : 'טיח'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button
                    onClick={handleSaveRoomEstimates}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 ml-2" />
                    שמור הגדרות
                  </Button>
                  <Button
                    onClick={() => setIsEditMode(false)}
                    size="sm"
                    variant="outline"
                  >
                    <X className="h-4 w-4 ml-2" />
                    ביטול
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditMode(true)}
                  size="sm"
                  variant="outline"
                  className="text-gray-600 hover:text-indigo-600"
                >
                  <Settings className="h-4 w-4 ml-2" />
                  ערוך חדרים
                </Button>
              )}
            </div>
          </div>
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
              <>
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

                {/* Price Summary */}
                {(() => {
                  const priceData = calculateEstimatedPrice();
                  if (priceData) {
                    return (
                      <Card className="bg-gradient-to-l from-blue-50 to-indigo-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                              <DollarSign className="h-5 w-5 text-blue-600" />
                              <span className="font-semibold text-blue-800">אומדן מחיר</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                                <div className="text-xs text-gray-600 mb-1">מחיר ללקוח</div>
                                <div className="text-xl font-bold text-blue-700">
                                  ₪{priceData.totalPrice.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  ₪{priceData.pricePerSqM.toFixed(2)} למ"ר
                                </div>
                              </div>
                              
                              <div className="bg-white/60 rounded-lg p-3 border border-orange-100">
                                <div className="text-xs text-gray-600 mb-1">עלות קבלן</div>
                                <div className="text-xl font-bold text-orange-700">
                                  ₪{priceData.totalCost.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  ₪{priceData.costPerSqM.toFixed(2)} למ"ר
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-l from-green-100 to-emerald-100 rounded-lg p-3 border border-green-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-800">רווח משוער</span>
                                <div className="text-left">
                                  <div className="text-lg font-bold text-green-700">
                                    ₪{priceData.profit.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-green-600">
                                    {priceData.profitPercent}% רווחיות
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  return null;
                })()}
              </>
            )}

            {/* בחירת חללים */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  בחר סוגי חדרים לחישוב
                  {selectedRooms.length > 0 && (
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {selectedRooms.length} נבחרו
                    </span>
                  )}
                </h3>
                {isEditMode && (
                  <Button
                    onClick={handleAddNewRoom}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף חדר
                  </Button>
                )}
              </div>
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

                    // Get room size category and corresponding styles
                    const roomSize = getRoomSizeCategory(room.roomType);
                    const sizeStyles = getRoomSizeStyles(roomSize);

                    return (
                  <Card
                    key={room.id}
                    className={`transition-all duration-200 ${
                      isSelected
                        ? `border-2 ${sizeStyles.border} bg-gradient-to-br ${sizeStyles.bg} shadow-lg ring-2 ${sizeStyles.ring} ring-offset-1`
                        : `border border-gray-200 ${sizeStyles.borderHover} hover:shadow-md`
                    }`}
                  >
                    <CardHeader className="pb-3">
                      {isEditMode ? (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              {getRoomIcon(room.roomType)}
                              <Input
                                value={room.roomType}
                                onChange={(e) => handleUpdateRoomField(room.id, 'roomType', e.target.value)}
                                className="h-8 text-sm font-semibold flex-1"
                                dir="rtl"
                                placeholder="שם החדר"
                              />
                            </div>
                            <Button
                              onClick={() => handleDeleteRoom(room.id)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-600 mb-1 block">שטח קירות (מ"ר)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={room.wallAreaSqM}
                                onChange={(e) => handleUpdateRoomField(room.id, 'wallAreaSqM', Number(e.target.value) || 0)}
                                className="h-8 text-sm"
                                dir="rtl"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600 mb-1 block">שטח תקרה (מ"ר)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={room.ceilingAreaSqM}
                                onChange={(e) => handleUpdateRoomField(room.id, 'ceilingAreaSqM', Number(e.target.value) || 0)}
                                className="h-8 text-sm"
                                dir="rtl"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleRoomSelection(room.id)}>
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
                          <div className="flex items-center justify-between mt-1">
                            <div className={`text-xs ${isSelected ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                              קירות: {room.wallAreaSqM} מ"ר • תקרה: {room.ceilingAreaSqM} מ"ר
                            </div>
                            {isSelected && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRoomExpanded(room.id);
                                }}
                                className="h-6 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              >
                                {expandedRoomIds.includes(room.id) ? (
                                  <>
                                    <ChevronUp className="h-3 w-3 ml-1" />
                                    סגור
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                    ערוך
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </CardHeader>
                    
                    {isSelected && !isEditMode && expandedRoomIds.includes(room.id) && (
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

      {/* Add Room Dialog */}
      {showAddRoomDialog && (
        <Dialog open={showAddRoomDialog} onOpenChange={setShowAddRoomDialog}>
          <DialogContent className="max-w-md p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                הוסף חדר חדש
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="roomType" className="text-sm font-medium text-gray-700">
                  שם החדר
                </Label>
                <Input
                  id="roomType"
                  value={newRoom.roomType}
                  onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
                  placeholder="לדוגמה: סלון, חדר שינה, מטבח..."
                  className="mt-1"
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="wallArea" className="text-sm font-medium text-gray-700">
                  שטח קירות (מ"ר)
                </Label>
                <Input
                  id="wallArea"
                  type="number"
                  step="0.1"
                  value={newRoom.wallAreaSqM}
                  onChange={(e) => setNewRoom({ ...newRoom, wallAreaSqM: e.target.value })}
                  placeholder="0.0"
                  className="mt-1"
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="ceilingArea" className="text-sm font-medium text-gray-700">
                  שטח תקרה (מ"ר)
                </Label>
                <Input
                  id="ceilingArea"
                  type="number"
                  step="0.1"
                  value={newRoom.ceilingAreaSqM}
                  onChange={(e) => setNewRoom({ ...newRoom, ceilingAreaSqM: e.target.value })}
                  placeholder="0.0"
                  className="mt-1"
                  dir="rtl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddRoomDialog(false);
                setNewRoom({
                  roomType: '',
                  wallAreaSqM: 0,
                  ceilingAreaSqM: 0
                });
              }}>
                ביטול
              </Button>
              <Button 
                onClick={handleSaveNewRoom}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="h-4 w-4 ml-2" />
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
