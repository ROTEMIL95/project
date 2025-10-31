
import React, { useState, useEffect, useCallback, useRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paintbrush, Trash2, PlusCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PaintSimulatorV2 from './PaintSimulatorV2';
import { User } from '@/lib/entities';

// Default structure for a new room
const defaultRoom = {
  id: '', // Will be dynamically generated
  name: '',
  paintRoomsData: null, // null indicates work type not selected
  plasterRoomsData: null, // null indicates work type not selected
  paintCalculatedMetrics: {}, // Added to store calculated data from PaintSimulatorV2
  plasterCalculatedMetrics: {}, // Added to store calculated data for plaster
  errors: {}
};

// Default values for paintRoomsData when paint work type is selected
const defaultPaintData = {
  wallArea: 0,
  ceilingArea: 0,
  paintTypeWalls: 'standard',
  paintTypeCeiling: 'standard',
  finishTypeWalls: 'matte',
  finishTypeCeiling: 'matte',
  hasPrimerWalls: false,
  hasPrimerCeiling: false,
  hasWaterproofingWalls: false,
  hasWaterproofingCeiling: false,
  paintColor: '',
  wallPaintPricePerMeter: 0,
  ceilingPaintPricePerMeter: 0,
};

// Default values for plasterRoomsData when plaster work type is selected
const defaultPlasterData = {
  wallArea: 0,
  ceilingArea: 0,
  plasterTypeWalls: 'standard',
  plasterTypeCeiling: 'standard',
  plasterPricePerMeterWalls: 0,
  plasterPricePerMeterCeiling: 0,
};


export default React.forwardRef(function PaintRoomsManager({
  onAddItemToQuote,
  onUpdateCategoryData, // New prop from outline
  onUpdateRoomBreakdown,
  initialRooms = [], // Renamed from roomBreakdownsFromProject
  categoryId = 'cat_paint_plaster', // New prop from outline
  categoryTimings, // New prop from outline
  onCategoryTimingChange, // New prop from outline
  categoriesNav, // New prop from outline
  currentCategoryId, // New prop from outline
  onSelectCategory // New prop from outline
}, ref) {
  const [rooms, setRooms] = useState([]);
  const hasInitializedFromProp = useRef(false);

  // Helper to calculate plaster metrics based on current plasterRoomsData
  const calculatePlasterMetrics = useCallback((plasterData) => {
    if (!plasterData) return {};
    const wallArea = plasterData.wallArea || 0;
    const ceilingArea = plasterData.ceilingArea || 0;
    const wallsPrice = plasterData.plasterPricePerMeterWalls || 0;
    const ceilingPrice = plasterData.plasterPricePerMeterCeiling || 0;

    const totalSellingPrice = (wallArea * wallsPrice) + (ceilingArea * ceilingPrice);
    // Placeholder for cost, assuming 70% of selling price. Adjust as per actual business logic.
    const totalContractorCost = totalSellingPrice * 0.7;
    // Placeholder for work days, e.g., 1 day per 70 sq meters, with a minimum. Adjust as needed.
    const totalWorkDays = (wallArea + ceilingArea > 0) ? Math.max(0.1, (wallArea + ceilingArea) / 70) : 0;

    return {
      wallsArea: wallArea,
      ceilingArea: ceilingArea,
      totalSellingPrice: totalSellingPrice,
      totalContractorCost: totalContractorCost,
      totalWorkDays: totalWorkDays,
    };
  }, []);

  // Effect to synchronize rooms with initialRooms prop
  // Handles initial load and updates from parent component
  useEffect(() => {
    if (initialRooms && initialRooms.length > 0) {
      // Deep compare to prevent unnecessary state updates and potential infinite loops
      // if parent passes a new array reference but with identical content
      if (!hasInitializedFromProp.current || JSON.stringify(initialRooms) !== JSON.stringify(rooms)) {
        setRooms(initialRooms.map(room => {
          const roomWithDefaults = {
            ...defaultRoom, // Ensure default structure (including new metrics fields)
            ...room,
            paintRoomsData: room.paintRoomsData ? { ...defaultPaintData, ...room.paintRoomsData } : null,
            plasterRoomsData: room.plasterRoomsData ? { ...defaultPlasterData, ...room.plasterRoomsData } : null,
            paintCalculatedMetrics: room.paintCalculatedMetrics || {},
            // Recalculate plaster metrics on load if plasterRoomsData exists and metrics are missing/stale
            plasterCalculatedMetrics: room.plasterRoomsData && (!room.plasterCalculatedMetrics || Object.keys(room.plasterCalculatedMetrics).length === 0)
                                      ? calculatePlasterMetrics(room.plasterRoomsData)
                                      : (room.plasterCalculatedMetrics || {}),
          };
          return roomWithDefaults;
        }));
        hasInitializedFromProp.current = true;
      }
    } else if (rooms.length === 0 && !hasInitializedFromProp.current) {
      // If no project data and no rooms currently, add an initial default room
      setRooms([{ ...defaultRoom, id: `room-${Date.now()}-0` }]);
      hasInitializedFromProp.current = true; // Mark as initialized to prevent re-adding
    }
  }, [initialRooms, rooms, calculatePlasterMetrics]); // `rooms` is intentionally not a dependency here to avoid infinite loops, but `calculatePlasterMetrics` should be

  // Effect to call onUpdateRoomBreakdown whenever rooms state changes
  // This reports the current state of rooms back to the parent component
  useEffect(() => {
    // Only update if there are actual rooms, and prevent initial call with empty array if prop is also empty
    if (rooms.length > 0 || (initialRooms && initialRooms.length > 0)) {
        onUpdateRoomBreakdown(rooms);
    }
  }, [rooms, onUpdateRoomBreakdown, initialRooms]);


  // Adds a new room to the list
  const addRoom = useCallback(() => {
    setRooms(prevRooms => [
      ...prevRooms,
      { ...defaultRoom, id: `room-${Date.now()}-${prevRooms.length}` } // Ensure unique ID
    ]);
  }, []);

  // Removes a room from the list
  const removeRoom = useCallback((idToRemove) => {
    setRooms(prevRooms => prevRooms.filter(room => room.id !== idToRemove));
  }, []);

  // Updates a generic field for a specific room
  const updateRoomData = useCallback((id, key, value) => {
    setRooms(prevRooms =>
      prevRooms.map(room =>
        room.id === id ? { ...room, [key]: value } : room
      )
    );
  }, []);

  // Updates room-level metrics (e.g., paintCalculatedMetrics) directly
  const updateRoomMetrics = useCallback((roomId, metricKey, metrics) => {
    setRooms(prevRooms =>
      prevRooms.map(room =>
        room.id === roomId ? { ...room, [metricKey]: metrics } : room
      )
    );
  }, []);

  // Toggles the selection of a work type (paint or plaster) for a room
  const toggleWorkType = useCallback((id, type) => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.id === id) {
          if (type === 'paint') {
            return {
              ...room,
              paintRoomsData: room.paintRoomsData ? null : { ...defaultPaintData }, // Toggle between data and null
              paintCalculatedMetrics: room.paintRoomsData ? {} : room.paintCalculatedMetrics, // Clear metrics if toggling off
            };
          } else if (type === 'plaster') {
            const newPlasterData = room.plasterRoomsData ? null : { ...defaultPlasterData };
            return {
              ...room,
              plasterRoomsData: newPlasterData,
              // Calculate metrics immediately if plaster is enabled, clear if disabled
              plasterCalculatedMetrics: room.plasterRoomsData ? {} : calculatePlasterMetrics(newPlasterData),
            };
          }
        }
        return room;
      })
    );
  }, [calculatePlasterMetrics]);

  // Handles changes to paint-specific data for a room
  const handlePaintDataChange = useCallback((roomId, key, value) => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.id === roomId && room.paintRoomsData) {
          return {
            ...room,
            paintRoomsData: {
              ...room.paintRoomsData,
              [key]: value,
            },
          };
        }
        return room;
      })
    );
  }, []);

  // Handles changes to plaster-specific data for a room, recalculating metrics
  const handlePlasterDataChange = useCallback((roomId, key, value) => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.id === roomId && room.plasterRoomsData) {
          const updatedPlasterData = {
            ...room.plasterRoomsData,
            [key]: value,
          };
          const calculatedMetrics = calculatePlasterMetrics(updatedPlasterData);
          return {
            ...room,
            plasterRoomsData: updatedPlasterData,
            plasterCalculatedMetrics: calculatedMetrics, // Update calculated metrics
          };
        }
        return room;
      })
    );
  }, [calculatePlasterMetrics]);

  // Passes item to the parent's onAddItemToQuote function
  const handleAddItemToQuote = useCallback((item) => {
    onAddItemToQuote(item);
  }, [onAddItemToQuote]);

  useImperativeHandle(ref, () => ({
    saveData: () => {
      if (rooms.length === 0) {
        return [];
      }

      // We need to ensure plaster metrics are up-to-date right before saving,
      // as they are calculated within this component and might not have been
      // re-calculated if a parent prop changed or if just `saveData` was called.
      const roomsWithUpdatedPlasterMetrics = rooms.map(room => ({
          ...room,
          plasterCalculatedMetrics: room.plasterRoomsData ? calculatePlasterMetrics(room.plasterRoomsData) : {},
      }));


      const detailedItems = roomsWithUpdatedPlasterMetrics.map((room, index) => {
        const paintMetrics = room.paintCalculatedMetrics || {};
        const plasterMetrics = room.plasterCalculatedMetrics || {};

        // חישוב סה"כ לחדר זה
        const roomTotalPrice = (paintMetrics.totalSellingPrice || 0) + (plasterMetrics.totalSellingPrice || 0);
        const roomTotalCost = (paintMetrics.totalContractorCost || 0) + (plasterMetrics.totalContractorCost || 0);
        const roomProfit = roomTotalPrice - roomTotalCost;
        const roomWorkDays = (paintMetrics.totalWorkDays || 0) + (plasterMetrics.totalWorkDays || 0);

        return {
          id: `paint_room_${room.id || index}`,
          name: room.name || `חדר ${index + 1}`,
          description: `צבע ושפכטל - ${room.name || `חדר ${index + 1}`}`,
          categoryId: categoryId, // Using the prop `categoryId`
          source: 'paint_room_detail',
          totalPrice: Math.round(roomTotalPrice),
          totalCost: Math.round(roomTotalCost),
          profit: Math.round(roomProfit),
          profitPercent: roomTotalCost > 0 ? Math.round((roomProfit / roomTotalCost) * 100) : 0, // Round to nearest integer percentage
          workDuration: Math.round(roomWorkDays * 100) / 100, // Round to 2 decimal places
          unit: 'מ"ר',
          quantity: (paintMetrics.wallsArea || 0) + (paintMetrics.ceilingArea || 0) + (plasterMetrics.wallsArea || 0) + (plasterMetrics.ceilingArea || 0),
          // שמירת כל הנתונים המפורטים
          detailedBreakdown: [{
            name: room.name || `חדר ${index + 1}`,
            wallsArea: paintMetrics.wallsArea || 0,
            ceilingArea: paintMetrics.ceilingArea || 0,
            includeCeiling: paintMetrics.includeCeiling || false, // Assuming this comes from paintMetrics
            paintWallsName: room.paintRoomsData?.paintTypeWalls || '', // Assuming this is from paintRoomsData
            ceilingPaintName: room.paintRoomsData?.paintTypeCeiling || '', // Assuming this is from paintRoomsData
            wallLayers: paintMetrics.wallLayers || 0, // Assuming this comes from paintMetrics
            ceilingLayers: paintMetrics.ceilingLayers || 0, // Assuming this comes from paintMetrics
            difficultyData: paintMetrics.difficultyData || {}, // Assuming this comes from paintMetrics
            paintCalculatedMetrics: paintMetrics,
            plasterCalculatedMetrics: plasterMetrics,
          }],
          roomData: room, // Full room data for comprehensive context, if needed by parent
        };
      });

      // Optionally call onUpdateCategoryData if provided
      if (onUpdateCategoryData) {
        onUpdateCategoryData(categoryId, detailedItems);
      }

      return detailedItems;
    }
  }));

  return (
    <div className="space-y-6">
      {rooms.map((room, index) => (
        <Card key={room.id} className="border-2 border-blue-100 bg-blue-50/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                <Paintbrush className="w-5 h-5" />
                אזור {index + 1}
              </CardTitle>
              {rooms.length > 1 && ( // Only show remove button if there's more than one room
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRoom(room.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Input
              value={room.name}
              onChange={(e) => updateRoomData(room.id, 'name', e.target.value)}
              placeholder={`שם אזור/חדר (לדוגמה: סלון, חדר שינה ${index + 1})`}
              className="mt-2"
            />
            {room.errors?.name && ( // Display error message if room name is missing
              <Alert variant="destructive" className="mt-2 p-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {room.errors.name}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                בחר סוגי עבודה עבור אזור זה:
              </Label>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={room.paintRoomsData ? "default" : "outline"}
                  onClick={() => toggleWorkType(room.id, 'paint')}
                  className={room.paintRoomsData ? "bg-blue-500 hover:bg-blue-600" : "border-blue-300 text-blue-700 hover:bg-blue-50"}
                >
                  🎨 צבע
                </Button>
                <Button
                  type="button"
                  variant={room.plasterRoomsData ? "default" : "outline"}
                  onClick={() => toggleWorkType(room.id, 'plaster')}
                  className={room.plasterRoomsData ? "bg-gray-500 hover:bg-gray-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"}
                >
                  🧱 שפכטל
                </Button>
              </div>
            </div>

            {/* Paint Work Section - Conditionally rendered if paintRoomsData exists */}
            {room.paintRoomsData && (
              <div className="border p-4 rounded-lg bg-blue-50 space-y-4">
                <h4 className="text-md font-semibold text-blue-700">פרטי עבודת צבע</h4>
                <PaintSimulatorV2
                  initialCeilingPaintType={room.paintRoomsData.paintTypeCeiling ?? defaultPaintData.paintTypeCeiling}
                  initialWallPaintType={room.paintRoomsData.paintTypeWalls ?? defaultPaintData.paintTypeWalls}
                  initialWallFinishType={room.paintRoomsData.finishTypeWalls ?? defaultPaintData.finishTypeWalls}
                  initialCeilingFinishType={room.paintRoomsData.finishTypeCeiling ?? defaultPaintData.finishTypeCeiling}
                  initialCeilingArea={room.paintRoomsData.ceilingArea ?? defaultPaintData.ceilingArea}
                  initialWallArea={room.paintRoomsData.wallArea ?? defaultPaintData.wallArea}
                  initialHasPrimerWalls={room.paintRoomsData.hasPrimerWalls ?? defaultPaintData.hasPrimerWalls}
                  initialHasPrimerCeiling={room.paintRoomsData.hasPrimerCeiling ?? defaultPaintData.hasPrimerCeiling}
                  initialHasWaterproofingWalls={room.paintRoomsData.hasWaterproofingWalls ?? defaultPaintData.hasWaterproofingWalls}
                  initialHasWaterproofingCeiling={room.paintRoomsData.hasWaterproofingCeiling ?? defaultPaintData.hasWaterproofingCeiling}
                  initialPaintColor={room.paintRoomsData.paintColor ?? defaultPaintData.paintColor}
                  initialWallPaintPricePerMeter={room.paintRoomsData.wallPaintPricePerMeter ?? defaultPaintData.wallPaintPricePerMeter}
                  initialCeilingPaintPricePerMeter={room.paintRoomsData.ceilingPaintPricePerMeter ?? defaultPaintData.ceilingPaintPricePerMeter}
                  onCalculated={(data) => {
                    // Update paintRoomsData fields based on PaintSimulatorV2 calculations
                    handlePaintDataChange(room.id, 'wallArea', data.wallArea);
                    handlePaintDataChange(room.id, 'ceilingArea', data.ceilingArea);
                    handlePaintDataChange(room.id, 'paintTypeWalls', data.wallPaintType);
                    handlePaintDataChange(room.id, 'paintTypeCeiling', data.ceilingPaintType);
                    handlePaintDataChange(room.id, 'finishTypeWalls', data.wallFinishType);
                    handlePaintDataChange(room.id, 'finishTypeCeiling', data.ceilingFinishType);
                    handlePaintDataChange(room.id, 'hasPrimerWalls', data.hasPrimerWalls);
                    handlePaintDataChange(room.id, 'hasPrimerCeiling', data.hasPrimerCeiling);
                    handlePaintDataChange(room.id, 'hasWaterproofingWalls', data.hasWaterproofingWalls);
                    handlePaintDataChange(room.id, 'hasWaterproofingCeiling', data.hasWaterproofingCeiling);
                    handlePaintDataChange(room.id, 'paintColor', data.paintColor);
                    handlePaintDataChange(room.id, 'wallPaintPricePerMeter', data.wallPaintPricePerMeter);
                    handlePaintDataChange(room.id, 'ceilingPaintPricePerMeter', data.ceilingPaintPricePerMeter);

                    // Store all calculated metrics from PaintSimulatorV2 directly in room.paintCalculatedMetrics
                    updateRoomMetrics(room.id, 'paintCalculatedMetrics', data);
                  }}
                  onAddItemToQuote={handleAddItemToQuote} // Pass through onAddItemToQuote to PaintSimulator
                />
              </div>
            )}

            {/* Plaster Work Section - Conditionally rendered if plasterRoomsData exists */}
            {room.plasterRoomsData && (
              <div className="border p-4 rounded-lg bg-gray-50 space-y-4">
                <h4 className="text-md font-semibold text-gray-700">פרטי עבודת שפכטל</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`plaster-wall-area-${room.id}`}>שטח קירות (מ"ר)</Label>
                    <Input
                      id={`plaster-wall-area-${room.id}`}
                      type="number"
                      value={room.plasterRoomsData.wallArea ?? defaultPlasterData.wallArea}
                      onChange={(e) => handlePlasterDataChange(room.id, 'wallArea', parseFloat(e.target.value) || 0)}
                      min="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`plaster-ceiling-area-${room.id}`}>שטח תקרה (מ"ר)</Label>
                    <Input
                      id={`plaster-ceiling-area-${room.id}`}
                      type="number"
                      value={room.plasterRoomsData.ceilingArea ?? defaultPlasterData.ceilingArea}
                      onChange={(e) => handlePlasterDataChange(room.id, 'ceilingArea', parseFloat(e.target.value) || 0)}
                      min="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`plaster-type-walls-${room.id}`}>סוג שפכטל קירות</Label>
                    <Select
                      value={room.plasterRoomsData.plasterTypeWalls ?? defaultPlasterData.plasterTypeWalls}
                      onValueChange={(value) => handlePlasterDataChange(room.id, 'plasterTypeWalls', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="בחר סוג שפכטל" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">סטנדרטי</SelectItem>
                        <SelectItem value="smooth">החלקה</SelectItem>
                        <SelectItem value="fine">דק</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`plaster-type-ceiling-${room.id}`}>סוג שפכטל תקרה</Label>
                    <Select
                      value={room.plasterRoomsData.plasterTypeCeiling ?? defaultPlasterData.plasterTypeCeiling}
                      onValueChange={(value) => handlePlasterDataChange(room.id, 'plasterTypeCeiling', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="בחר סוג שפכטל" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">סטנדרטי</SelectItem>
                        <SelectItem value="smooth">החלקה</SelectItem>
                        <SelectItem value="fine">דק</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`plaster-price-walls-${room.id}`}>מחיר למ"ר קירות (₪)</Label>
                    <Input
                      id={`plaster-price-walls-${room.id}`}
                      type="number"
                      value={room.plasterRoomsData.plasterPricePerMeterWalls ?? defaultPlasterData.plasterPricePerMeterWalls}
                      onChange={(e) => handlePlasterDataChange(room.id, 'plasterPricePerMeterWalls', parseFloat(e.target.value) || 0)}
                      min="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`plaster-price-ceiling-${room.id}`}>מחיר למ"ר תקרה (₪)</Label>
                    <Input
                      id={`plaster-price-ceiling-${room.id}`}
                      type="number"
                      value={room.plasterRoomsData.plasterPricePerMeterCeiling ?? defaultPlasterData.plasterPricePerMeterCeiling}
                      onChange={(e) => handlePlasterDataChange(room.id, 'plasterPricePerMeterCeiling', parseFloat(e.target.value) || 0)}
                      min="0"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => handleAddItemToQuote({
                    type: 'plaster',
                    description: `שפכטל באזור ${room.name || `אזור ${index + 1}`}`,
                    unit: 'מ"ר',
                    quantity: (room.plasterRoomsData.wallArea ?? 0) + (room.plasterRoomsData.ceilingArea ?? 0),
                    unitPrice: Math.max(room.plasterRoomsData.plasterPricePerMeterWalls ?? 0, room.plasterRoomsData.plasterPricePerMeterCeiling ?? 0),
                    totalPrice: ((room.plasterRoomsData.wallArea ?? 0) * (room.plasterRoomsData.plasterPricePerMeterWalls ?? 0)) +
                                ((room.plasterRoomsData.ceilingArea ?? 0) * (room.plasterRoomsData.plasterPricePerMeterCeiling ?? 0))
                  })}
                  className="w-full mt-4 bg-gray-600 hover:bg-gray-700"
                >
                  הוסף שפכטל להצעת מחיר
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* CHANGED: Show "Add Room" button only after first room has at least one work type selected */}
      {/* This condition ensures the button appears only when there's at least one room and a work type is chosen for it */}
      {rooms.length > 0 && (rooms[0].paintRoomsData || rooms[0].plasterRoomsData) && (
        <Button
          type="button"
          onClick={addRoom}
          variant="outline"
          className="w-full border-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 py-6"
        >
          <PlusCircle className="w-5 h-5 ml-2" />
          הוסף חדר/אזור לצביעה
        </Button>
      )}
    </div>
  );
});
