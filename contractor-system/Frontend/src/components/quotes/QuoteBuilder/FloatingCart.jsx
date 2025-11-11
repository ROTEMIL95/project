
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, X, Trash2, DollarSign, TrendingUp, Info, Paintbrush, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price) || price === null || price === undefined) return '0';
    return price.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// NEW: category names fallback
const CATEGORY_NAMES = {
    cat_demolition: 'הריסה ופינוי',
    cat_paint_plaster: 'צבע ושפכטל',
    cat_tiling: 'ריצוף וחיפוי',
    cat_electricity: 'חשמל',
    cat_plumbing: 'אינסטלציה',
    cat_construction: 'בינוי (כללי)',
    other: 'אחר', // Default category for items without a categoryId
};

// NEW: group items by category (preserving original order)
const groupItemsByCategory = (items = []) => {
    const order = [];
    const map = {};
    items.forEach((it) => {
        const key = it.categoryId || 'other';
        if (!order.includes(key)) order.push(key);
        if (!map[key]) {
            map[key] = {
                name: it.categoryName || CATEGORY_NAMES[key] || 'קטגוריה',
                items: [],
            };
        }
        map[key].items.push(it);
    });
    return { order, map };
};

const safeToFixed = (value, decimals = 1) => {
    if (value === null || value === undefined || isNaN(value)) return '0.0';
    const num = Number(value);
    if (isNaN(num)) return '0.0';
    return num.toFixed(decimals);
};

const getProfitBadgeClass = (percent) => {
    const num = Number(percent);
    if (isNaN(num) || num < 15) return "bg-red-100 text-red-800";
    if (num < 30) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
};

// Helper: get numeric value from multiple candidates
const num = (...vals) => {
    for (const v of vals) {
        const n = Number(v);
        if (!isNaN(n) && isFinite(n) && n !== null) return n;
    }
    return 0;
};

// NEW: prefer first positive number; avoids getting stuck on 0 which blocks fallbacks
const firstPositive = (arr = []) => {
    for (const v of arr) {
        const n = Number(v);
        if (!isNaN(n) && isFinite(n) && n > 0) return n;
    }
    return 0;
};

// Helper: is manual-calc item
const isManualCalcItem = (item) => item && item.source === "manual_calc" && (item.manualFormSnapshot || item.manualMeta);

// Helper: extract walls/ceiling data from snapshot (support nested keys)
const extractManualParts = (item) => {
  const snap = item?.manualFormSnapshot || item?.manualMeta || {};

  // NEW: nested-safe reads
  const wallsEnabled = Boolean(
    (snap?.walls?.enabled) ??
    snap?.wallsEnabled ??
    (Number(snap?.walls?.area ?? snap?.wallsArea) > 0)
  );
  const ceilingEnabled = Boolean(
    (snap?.ceiling?.enabled) ??
    snap?.ceilingEnabled ??
    (Number(snap?.ceiling?.area ?? snap?.ceilingArea) > 0)
  );

  const walls = {
    enabled: wallsEnabled,
    area: Number(snap?.walls?.area ?? snap?.wallsArea ?? 0) || 0,
    type: (snap?.walls?.manualType ?? snap?.wallsType ?? snap?.manualTypeWalls ?? snap?.manualType ?? ""),
    layers: Number(snap?.walls?.layers ?? snap?.wallsLayers ?? 0) || 0,
    label: "קירות",
  };

  const ceiling = {
    enabled: ceilingEnabled,
    area: Number(snap?.ceiling?.area ?? snap?.ceilingArea ?? 0) || 0,
    type: (snap?.ceiling?.manualType ?? snap?.ceilingType ?? snap?.manualTypeCeiling ?? ""),
    layers: Number(snap?.ceiling?.layers ?? snap?.ceilingLayers ?? 0) || 0,
    label: "תקרה",
  };

  // price split
  const totalPrice = Number(item?.totalPrice) || 0;
  const totalArea = (walls.enabled ? walls.area : 0) + (ceiling.enabled ? ceiling.area : 0);

  if (totalArea > 0) {
    walls.price = walls.enabled ? Math.round(totalPrice * (walls.area / totalArea)) : 0;
    ceiling.price = ceiling.enabled ? (totalPrice - walls.price) : 0; // rest
  } else {
    if (walls.enabled && !ceiling.enabled) {
      walls.price = totalPrice;
      ceiling.price = 0;
    } else if (!walls.enabled && ceiling.enabled) {
      walls.price = 0;
      ceiling.price = totalPrice;
    } else {
      walls.price = 0;
      ceiling.price = 0;
    }
  }

  return { walls, ceiling, totalPrice };
};

// Renders the manual details block inside cart for a single item
const ManualCartDetails = ({ item }) => {
  const { walls, ceiling } = extractManualParts(item);

  if (!walls.enabled && !ceiling.enabled) {
    return null; // Don't render anything if neither walls nor ceiling are enabled
  }

  return (
    <div className="mt-2 space-y-1 text-sm">
      {walls.enabled && (
        <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
          <div className="text-gray-700">
            <div className="font-medium">{walls.label}</div>
            <div className="text-gray-600">
              {walls.type ? `סוג: ${walls.type}` : "סוג: —"} • שכבות: {walls.layers || 0} • כמות: {walls.area || 0} מ״ר
            </div>
          </div>
          <div className="font-semibold text-gray-800">₪ {formatPrice(walls.price)}</div>
        </div>
      )}
      {ceiling.enabled && (
        <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
          <div className="text-gray-700">
            <div className="font-medium">{ceiling.label}</div>
            <div className="text-gray-600">
              {ceiling.type ? `סוג: ${ceiling.type}` : "סוג: —"} • שכבות: {ceiling.layers || 0} • כמות: {ceiling.area || 0} מ״ר
            </div>
          </div>
          <div className="font-semibold text-gray-800">₪ {formatPrice(ceiling.price)}</div>
        </div>
      )}
    </div>
  );
};

// NEW: Render simple area items (paint_simulator, plaster_simulator)
const renderSimpleAreaItem = (item, onRemoveItem) => {
    const isPaint = item.source === 'paint_simulator';
    const isPlaster = item.source === 'plaster_simulator';
    
    if (!isPaint && !isPlaster) return null;
    
    const paintType = item.paintType || item.plasterType || 'N/A';
    const layers = item.layers || 1;
    const area = item.quantity || 0;
    
    return (
        <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Paintbrush className={`h-4 w-4 ${isPaint ? 'text-blue-500' : 'text-orange-500'}`} />
                        <p className="font-semibold text-gray-800 text-sm">{item.description || 'פריט ללא תיאור'}</p>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                            <span className="font-medium">סוג:</span>
                            <span>{paintType}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            <span className="font-medium">שכבות:</span>
                            <span>{layers}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-medium">שטח:</span>
                            <span>{safeToFixed(area)} מ"ר</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold text-gray-900">{formatPrice(item.totalPrice || 0)} ₪</p>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 mt-1 text-red-500 hover:bg-red-50"
                        onClick={() => onRemoveItem && onRemoveItem(item.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// NEW: Render room calculator items (paint_room_calc, plaster_room_calc)
const renderRoomCalcItem = (item, onRemoveItem) => {
    const isPaint = item.source === 'paint_room_calc';
    const isPlaster = item.source === 'plaster_room_calc';
    
    if (!isPaint && !isPlaster) return null;
    
    return (
        <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Paintbrush className={`h-4 w-4 ${isPaint ? 'text-blue-500' : 'text-orange-500'}`} />
                        <p className="font-semibold text-gray-800 text-sm">{item.description || 'פריט ללא תיאור'}</p>
                    </div>
                    {/* Show breakdown if available */}
                    {item.rooms && Array.isArray(item.rooms) && item.rooms.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                            {item.rooms.map((room, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>{room.name || `חדר ${idx + 1}`}</span>
                                    <span>{safeToFixed(room.area || 0)} מ"ר</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Show general info if no breakdown */}
                    {(!item.rooms || item.rooms.length === 0) && (
                        <p className="text-xs text-gray-500 mt-1">
                            {safeToFixed(item.quantity || 0)} {item.unit || 'יח'}
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <p className="font-bold text-gray-900">{formatPrice(item.totalPrice || 0)} ₪</p>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 mt-1 text-red-500 hover:bg-red-50"
                        onClick={() => onRemoveItem && onRemoveItem(item.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};


// פונקציה לעיבוד פריט בודד (לא מורכב או ידני)
const renderItem = (item, onRemoveItem) => {
    // בדיקה אם זה פריט הריסה עם רמת קושי
    const hasDifficulty = item.source === 'demolition_calculator' && item.difficultyData;

    return (
        <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border flex items-start gap-3">
            <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{item.description || 'פריט ללא תיאור'}</p>
                <p className="text-xs text-gray-500 mt-1">
                    {safeToFixed(item.quantity || 0)} {item.unit || 'יח'} &times; {formatPrice(item.unitPrice || 0)} ₪
                </p>
                {/* הצגת רמת קושי עבור פריטי הריסה */}
                {hasDifficulty && (
                    <div className="text-xs text-red-600 mt-1">
                        <span className="font-medium">רמת קושי: {item.difficultyData.label}</span>
                        <span className="text-gray-500"> (x{item.difficultyData.multiplier})</span>
                    </div>
                )}
            </div>
            <div className="text-right">
                <p className="font-bold text-gray-900">{formatPrice(item.totalPrice || 0)} ₪</p>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 mt-1 text-red-500 hover:bg-red-50"
                    onClick={() => onRemoveItem && onRemoveItem(item.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

// UPDATED: robust per-room breakdown + complexity split UI and pricing
const COMPLEXITY_LEVELS = [
  { id: 'normal', label: 'רגיל (x1.00)', multiplier: 1.00 },
  { id: 'medium', label: 'בינוני (x1.10)', multiplier: 1.10 },
  { id: 'high', label: 'גבוה (x1.25)', multiplier: 1.25 },
];

const renderPaintSummary = (item, onRemoveItem, fallbackRooms, onUpdateItem) => {

    // Extract room breakdown data - MERGE detailedRoomsData with detailedBreakdown
    let candidateRooms = [];

    // detailedBreakdown has the item details (itemName, quantity, prices)
    // detailedRoomsData has the layers info (paintLayers, paintQuantity)
    const breakdownItems = Array.isArray(item?.detailedBreakdown) ? item.detailedBreakdown : [];
    const roomsData = Array.isArray(item?.detailedRoomsData) ? item.detailedRoomsData : [];

    // Merge the two arrays by matching room IDs or names
    if (breakdownItems.length > 0) {
        candidateRooms = breakdownItems.map((breakdownItem, idx) => {
            // Find matching room data
            const roomData = roomsData.find(rd =>
                rd.id?.toString() === breakdownItem.id?.toString().split('_')[0] ||
                rd.name === breakdownItem.roomName
            ) || roomsData[idx] || {};

            // Merge both objects
            return {
                ...breakdownItem,
                paintLayers: roomData.paintLayers || breakdownItem.paintLayers || breakdownItem.layers || 0,
                paintQuantity: roomData.paintQuantity || breakdownItem.paintQuantity || breakdownItem.quantity || 0
            };
        });
    } else if (roomsData.length > 0) {
        // Fallback: use roomsData if no breakdown
        candidateRooms = roomsData;
    }

    const roomsRaw = (Array.isArray(fallbackRooms) && fallbackRooms.length > (candidateRooms?.length || 0))
        ? fallbackRooms
        : candidateRooms;

    const totalPriceCurrent = Number(firstPositive([item?.totalPrice, item?.finalAmount, item?.price]));

    if (!roomsRaw || roomsRaw.length === 0) {
        return renderItem(item, onRemoveItem);
    }

    const wallPaintGlobalItem =
        item?.selectedWallPaintItem ||
        item?.selectedPaintItem ||
        item?.wallPaintItem ||
        item?.paintItem ||
        item?.wallPaint;

    const globalWallPaintName =
        wallPaintGlobalItem?.itemName ||
        wallPaintGlobalItem?.paintName ||
        wallPaintGlobalItem?.name ||
        (typeof wallPaintGlobalItem === "string" ? wallPaintGlobalItem : "צבע לקירות");

    const globalWallLayers = firstPositive([
        item?.wallPaintLayers,
        item?.paintLayers,
        wallPaintGlobalItem?.layers,
        wallPaintGlobalItem?.layerCount,
        item?.layers?.wall,
        item?.layers
    ]);

    const ceilingPaintGlobalItem =
        item?.selectedCeilingPaintItem ||
        item?.ceilingPaintItem ||
        item?.ceilingPaint ||
        item?.selectedCeilingPaint;

    const globalCeilingPaintName =
        ceilingPaintGlobalItem?.itemName ||
        ceilingPaintGlobalItem?.paintName ||
        ceilingPaintGlobalItem?.name ||
        (typeof ceilingPaintGlobalItem === "string" ? ceilingPaintGlobalItem : "צבע לתקרה");

    // read ceiling layers only from ceiling-specific sources
    const globalCeilingLayers = firstPositive([
        item?.ceilingPaintLayers,
        item?.ceilingLayers,
        item?.layersCeiling,
        item?.ceiling_layers,
        ceilingPaintGlobalItem?.layers,
        ceilingPaintGlobalItem?.layerCount,
        item?.layers?.ceiling
    ]);

    const rooms = roomsRaw.map((r, idx) => {
        // 🐛 DEBUG: Log each room's complete data
        console.log(`🎨 [renderPaintSummary] Room ${idx}:`, JSON.parse(JSON.stringify(r)));

        // Check if this is a manual item
        const isManualItem = r?.source === 'manual_calc';

        // Extract paint data - detailedBreakdown has the actual item details
        const paintItemName = r?.itemName || r?.name || null;
        const paintLayers = Number(r?.layers || r?.paintLayers || 0);
        const paintQuantity = Number(r?.quantity || r?.paintQuantity || 0);

        console.log(`🔍 [Room ${idx}] Extracted paint data:`, {
            paintItemName,
            paintLayers,
            paintQuantity,
            source: r?.source,
            rawItem: r
        });

        const wallsArea = Number(firstPositive([
            r?.quantity, r?.paintQuantity, r?.calculatedWallArea, r?.wallArea, r?.wallAreaSqM, r?.wallsArea, r?.wallsNetArea, r?.wallAreaAfterOpenings
        ]));
        const ceilingAreaCandidate = Number(firstPositive([
            r?.ceilingArea, r?.calculatedCeilingArea, r?.ceilingAreaSqM, r?.ceilingNetArea, r?.ceilingAreaAfterOpenings
        ]));
        const includeCeiling = Boolean(r?.includeCeiling ?? r?.withCeiling ?? (ceilingAreaCandidate > 0));
        const ceilingArea = includeCeiling ? ceilingAreaCandidate : 0;

        const metricPrice = firstPositive([
            r?.totalSellingPrice,                             // detailedBreakdown items
            r?.totalPrice,                                    // Manual items
            r?.metrics?.totalSellingPrice,                    // Room items
            r?.price,
            r?.sellingPrice
        ]);

        return {
            name: r?.roomName || r?.description || r?.name || r?.roomType || `אזור ${idx + 1}`,
            wallsArea,
            ceilingArea,
            includeCeiling,
            metricPrice,
            isManualItem,
            // NEW: Add paint-specific details
            paintItemName,
            paintLayers,
            paintQuantity
        };
    });

    const totalWalls = rooms.reduce((s, r) => s + (r.wallsArea || 0), 0);
    const totalCeilings = rooms.reduce((s, r) => s + (r.includeCeiling ? (r.ceilingArea || 0) : 0), 0);
    const totalEffectiveArea = rooms.reduce((s, r) => s + r.wallsArea + (r.includeCeiling ? r.ceilingArea : 0), 0);

    // Base total before complexity (prefer explicit field; fallback by removing added price if we have it)
    const baseTotal =
      Number(firstPositive([
        item?.basePriceWithoutComplexity,
        (item?.complexityAddedPrice ? (totalPriceCurrent - item.complexityAddedPrice) : 0)
      ])) || 0;

    // Added price for client due to complexity (fallback to diff if base available)
    let totalAdded = Number(firstPositive([
      item?.complexityAddedPrice,
      (baseTotal > 0 && totalPriceCurrent > baseTotal ? (totalPriceCurrent - baseTotal) : 0)
    ]));
    // Fallback 2: compute from labor delta if base fields exist
    if (!totalAdded && (Number(item?.laborCost) > 0) && (Number(item?.baseLaborBeforeComplexity) >= 0)) {
      const laborDelta = Number(item.laborCost) - Number(item.baseLaborBeforeComplexity);
      const profitPct = Number(item?.profitPercent ?? item?.desiredProfitPercent ?? 30);
      const clientDelta = laborDelta > 0 ? Math.round(laborDelta * (1 + profitPct / 100)) : 0;
      if (clientDelta > 0) totalAdded = clientDelta;
    }

    const newTotalWithComplexity = baseTotal > 0 ? (baseTotal + totalAdded) : totalPriceCurrent;

    const anyCeilingSelected = totalCeilings > 0;

    // NEW: detect complexity by positive added value or extra hours/cost
    const hasComplexity = (totalAdded > 0) || (Number(item?.complexityHoursAdded) > 0) || (Number(item?.complexityLaborAddedCost) > 0);

    return (
        <div key={item.id} className="bg-white rounded-lg shadow-sm border">
            <div className="p-3 flex flex-col gap-3">
            {/* NEW: complexity summary – only if exists. No dropdowns here */}
                {hasComplexity && (
                  <div className="bg-indigo-50/40 p-3 rounded-lg border border-indigo-100 space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-700">
                      <span>סה״כ תוספת מורכבות (ללקוח)</span>
                      <span className="font-semibold">{formatPrice(totalAdded)} ₪</span>
                    </div>
                    {!!item?.complexityLaborAddedCost && (
                      <div className="flex justify-between text-[11px] text-gray-700">
                        <span>תוספת מורכבות (לקבלן)</span>
                        <span className="font-semibold">{formatPrice(Number(item.complexityLaborAddedCost))} ₪</span>
                      </div>
                    )}
                    {!!item?.complexityHoursAdded && (
                      <div className="flex justify-between text-[11px] text-gray-700">
                        <span>שעות עבודה נוספות</span>
                        <span className="font-semibold">{Number(item.complexityHoursAdded)} ש״ע</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Per-room breakdown remains */}
                <div className="border-t pt-3 space-y-2">
                    {rooms.map((room, index) => {
                        const roomEffectiveArea = room.wallsArea + (room.includeCeiling ? room.ceilingArea : 0);

                        const proportionalPrice = (baseTotal > 0 && totalEffectiveArea > 0 && roomEffectiveArea > 0)
                            ? (baseTotal * (roomEffectiveArea / totalEffectiveArea))
                            : 0;

                        const roomPrice = room.metricPrice > 0 ? room.metricPrice : proportionalPrice;

                        return (
                            <div key={`${room.name}-${index}`} className="rounded-md bg-gray-50 px-3 py-2 mb-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-gray-800 text-sm">{room.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900">{formatPrice(roomPrice)} ₪</span>
                                        {index === 0 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-500 hover:bg-red-50"
                                                onClick={() => onRemoveItem && onRemoveItem(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Paint details - use room-specific data */}
                                {room.wallsArea > 0 && (
                                    <div className="text-xs text-gray-600 mt-1">
                                        <div className="font-medium text-gray-700">צבע</div>
                                        <div>
                                            {room.paintItemName && <span>סוג: {room.paintItemName}</span>}
                                            {!room.paintItemName && globalWallPaintName && <span>סוג: {globalWallPaintName}</span>}
                                            {room.paintLayers > 0 && <span> • שכבות: {room.paintLayers}</span>}
                                            {room.paintLayers === 0 && globalWallLayers > 0 && <span> • שכבות: {safeToFixed(globalWallLayers, 0)}</span>}
                                            <span> • כמות: {safeToFixed(room.wallsArea)} מ"ר</span>
                                        </div>
                                    </div>
                                )}

                                {/* Ceiling section - if enabled */}
                                {room.includeCeiling && room.ceilingArea > 0 && (
                                    <div className="text-xs text-gray-600 mt-1">
                                        <div className="font-medium text-gray-700">תקרה</div>
                                        <div>
                                            {globalCeilingPaintName && <span>סוג: {globalCeilingPaintName}</span>}
                                            {globalCeilingLayers > 0 && <span> • שכבות: {safeToFixed(globalCeilingLayers, 0)}</span>}
                                            <span> • כמות: {safeToFixed(room.ceilingArea)} מ"ר</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default function FloatingCart({ items = [], totals, onRemoveItem, onGoToSummary, projectComplexities, onUpdateItem }) {
    const [isOpen, setIsOpen] = useState(false);


    const hasItems = items.length > 0;

    // Calculate totals - FIXED: always calculate from items for accuracy
    const totalPrice = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  
    // NEW: Calculate totalCost directly from items, ensuring we get the correct contractor cost
    const totalCost = items.reduce((sum, item) => {
      // For tiling items, make sure we use the correct cost field
      const itemCost = Number(item.totalCost) || Number(item.baseCost) || 0;
      return sum + itemCost;
    }, 0);
    
    const profit = totalPrice - totalCost;
    const profitPercent = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : '0.0';

    // NEW: compute grouping once
    const { order: categoriesOrder, map: categoriesMap } = groupItemsByCategory(items);

    // NEW: fallback from project breakdowns (advanced calc)
    const paintFallbackRooms = projectComplexities?.roomBreakdowns?.paint || [];

    // NEW: Calculate total quantity - ONLY for items with unit "יחידה"
    const totalQuantity = items.reduce((sum, item) => {
      // Only count items where unit is exactly "יחידה"
      if (item.unit === "יחידה") {
        return sum + (Number(item.quantity) || 1);
      }
      return sum;
    }, 0);
    
    // If no "יחידה" items exist, fall back to item count
    const badgeCount = totalQuantity > 0 ? totalQuantity : items.length;

    return (
        <>
            {/* כפתור העגלה הצף */}
            <div className="fixed bottom-6 left-6 z-50">
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:scale-110 transition-transform duration-300"
                    aria-label="פתח סיכום הצעה"
                >
                    <ShoppingCart className="h-7 w-7" />
                    {hasItems && (
                        <Badge
                            className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full bg-red-500 text-white border-2 border-white"
                        >
                            {badgeCount}
                        </Badge>
                    )}
                </Button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* רקע שחור שקוף */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-[51]"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* סרגל צד מלבני */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed top-[80px] right-4 bottom-4 w-[420px] bg-white rounded-2xl shadow-2xl z-[52] flex flex-col border"
                            style={{ direction: 'rtl' }}
                        >
                            {/* כותרת עם כפתור סגירה */}
                            <header className="flex items-center justify-between p-6 border-b bg-gradient-to-l from-indigo-50 to-purple-50 rounded-t-2xl">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <ShoppingCart className="h-6 w-6 text-indigo-600" />
                                    סיכום הצעה
                                </h2>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-full hover:bg-white/80 text-gray-600 hover:text-gray-800"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </header>

                            {/* תוכן העגלה עם גלילה */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {hasItems ? (
                                    categoriesOrder.map((catKey) => {
                                        const group = categoriesMap[catKey];
                                        const categorySubtotal = group.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);

                                        return (
                                            <div key={catKey} className="space-y-3">
                                                {/* Category header */}
                                                <div className="flex items-center justify-between pb-1 border-b border-gray-200 mb-2">
                                                    <div className="text-sm font-semibold text-gray-800">
                                                        {group.name}
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                        סיכום ביניים: <span className="font-bold text-gray-800">{formatPrice(categorySubtotal)} ₪</span>
                                                    </div>
                                                </div>

                                                {/* Items in this category */}
                                                <div className="space-y-3">
                                                    {group.items.map(item => {
                                                      const isManualItem = isManualCalcItem(item);
                                                      const isPaintSummary = item.categoryId === 'cat_paint_plaster' &&
                                                        (item.source === 'paint_plaster_category_summary' || Array.isArray(item?.detailedBreakdown));

                                                      // NEW: Check for simple area items
                                                      const isSimpleAreaItem = item.source === 'paint_simulator' || item.source === 'plaster_simulator';

                                                      // NEW: Check for room calculator items
                                                      const isRoomCalcItem = item.source === 'paint_room_calc' || item.source === 'plaster_room_calc';

                                                      if (isManualItem) {
                                                          const userDesc = (item?.manualFormSnapshot?.description || item?.manualMeta?.description || "").trim();

                                                      } else if (isPaintSummary) {
                                                            return renderPaintSummary(item, onRemoveItem, paintFallbackRooms, onUpdateItem);
                                                      } else if (isSimpleAreaItem) {
                                                            // NEW: Render simple area items with enhanced display
                                                            return renderSimpleAreaItem(item, onRemoveItem);
                                                      } else if (isRoomCalcItem) {
                                                            // NEW: Render room calculator items with breakdown
                                                            return renderRoomCalcItem(item, onRemoveItem);
                                                      } 
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12">
                                        <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-500 mb-2">העגלה ריקה</h3>
                                        <p className="text-gray-400">הוסף פריטים להצעה כדי לראות אותם כאן.</p>
                                    </div>
                                )}
                            </div>

                            {/* סיכום כספי בתחתית */}
                            {hasItems && (
                                <footer className="border-t bg-gray-50 p-6 rounded-b-2xl space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">מחיר ללקוח:</span>
                                            <span className="font-bold text-lg text-blue-600">{formatPrice(totalPrice)} ₪</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">עלות לקבלן:</span>
                                            <span className="font-bold text-lg text-red-600">{formatPrice(totalCost)} ₪</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">רווח צפוי:</span>
                                            <div className="text-right">
                                                <div className="font-bold text-lg text-green-600">
                                                    {formatPrice(profit)} ₪
                                                </div>
                                                <Badge className={cn("text-xs mt-1", getProfitBadgeClass(profitPercent))}>
                                                    {safeToFixed(profitPercent)}%
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </footer>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
