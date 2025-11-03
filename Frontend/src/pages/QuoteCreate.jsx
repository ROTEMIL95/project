
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { Quote } from '@/lib/entities';
import { Client } from '@/lib/entities';
import { CatalogItem } from '@/lib/entities';
import { Category } from '@/lib/entities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  PlusCircle, Save, Send, DollarSign, CalendarDays, Percent, AlertCircle, CheckCircle, Loader2, ArrowLeft, ArrowRight, Briefcase,
  User as UserIcon, Phone, MapPin, FileText as NotesIcon,
  Home as HomeIconProp, Building, Paintbrush, Wrench, Lightbulb, Hammer as ConstructionIcon, Trash2 as DemolitionIcon,
  Calendar as CalendarIcon,
  Copy, Mail, Share2, X, Edit, Bug, Info,
  ChevronRight,
  ChevronLeft,
  Plus,
  Settings,
  Eye,
  Calculator,
  MessageCircle,
} from 'lucide-react';
import CategorySelector from '@/components/quotes/QuoteBuilder/CategorySelector';
import ItemSelector from '@/components/quotes/QuoteBuilder/ItemSelector';
import QuoteSummary from '@/components/quotes/QuoteBuilder/QuoteSummary';
import AdditionalCostsForm from '@/components/quotes/QuoteBuilder/AdditionalCostsForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QuoteToHTML from '@/components/quotes/QuoteToHTML';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import ProfitGuard from '@/components/quotes/QuoteBuilder/ProfitGuard';
import PaymentTermsEditor from '@/components/quotes/QuoteBuilder/PaymentTermsEditor';
import { useProfitGuard } from '@/components/quotes/QuoteBuilder/useProfitGuard';
import { Badge } from "@/components/ui/badge";
import FloatingCart from '@/components/quotes/QuoteBuilder/FloatingCart';
import DemolitionCategory from '@/components/quotes/QuoteBuilder/DemolitionCategory';
import TilingAutoSaveOnAddArea from '@/components/quotes/QuoteBuilder/TilingAutoSaveOnAddArea';
import ConstructionCategory from '@/components/quotes/QuoteBuilder/ConstructionCategory';
import PlumbingCategory from '@/components/quotes/QuoteBuilder/PlumbingCategory';
import ElectricalCategory from '@/components/quotes/QuoteBuilder/ElectricalCategory';
import HebrewLabelPatcher from '@/components/utils/HebrewLabelPatcher';
import ManualCalcDialog from "@/components/quotes/QuoteBuilder/ManualCalcDialog";
import ManualCalcInjector from "@/components/quotes/QuoteBuilder/ManualCalcInjector";
import ShareQuoteDialog from "@/components/quotes/QuoteBuilder/ShareQuoteDialog";
import ItemsDebugPanel from '@/components/utils/ItemsDebugPanel';
import ErrorBoundary from '@/components/utils/ErrorBoundary';
import { useUser } from '@/components/utils/UserContext';
import CategoryStepper from '@/components/quotes/QuoteBuilder/CategoryStepper';
import QuotePreviewSnapshot from '@/components/quotes/QuoteBuilder/QuotePreviewSnapshot';
import ContractorCostBreakdown from '@/components/quotes/QuoteBuilder/ContractorCostBreakdown';
import { useToast } from "@/components/ui/use-toast";
import CategoryFloatingAddButton from '@/components/quotes/QuoteBuilder/CategoryFloatingAddButton';


// קטגוריות זמינות לבחירה - אפשר לטעון אותן גם מהשרת בעתיד
const AVAILABLE_CATEGORIES = [
  {
    id: 'cat_paint_plaster',
    name: 'צבע ושפכטל',
    icon: Paintbrush,
    description: 'עבודות צבע ושפכטל',
    subCategories: [
      { id: 'paint_interior_qc', name: 'צבע פנים' },
      { id: 'paint_exterior_qc', name: 'צבע חוץ' },
      { id: 'plaster_qc', name: 'שפכטל' }
    ],
    workDuration: 4,
    baseColor: 'blue',
    bgColorClass: 'bg-blue-50',
    textColorClass: 'text-blue-700',
    iconColorClass: 'text-blue-500',
    hoverBgColorClass: 'hover:bg-blue-100',
    activeBorderColorClass: 'border-blue-500',
    activeBgColorClass: 'bg-blue-100',
    activeTextColorClass: 'text-blue-700',
    activeIconColorClass: 'text-blue-600',
  },
  {
    id: 'cat_tiling',
    name: 'ריצוף וחיפוי',
    icon: Building,
    description: 'ריצוף, חיפוי ועבודות קירמיקה',
    subCategories: [
      { id: 'floor_tiling_qc', name: 'ריצוף רצפה' },
      { id: 'wall_tiling_qc', name: 'חיפוי קירות' },
      { id: 'special_tiling_qc', name: 'עבודות מיוחדות' }
    ],
    workDuration: 5,
    baseColor: 'orange',
    bgColorClass: 'bg-orange-50',
    textColorClass: 'text-orange-700',
    iconColorClass: 'text-orange-500',
    hoverBgColorClass: 'hover:bg-orange-100',
    activeBorderColorClass: 'border-orange-500',
    activeBgColorClass: 'bg-orange-100',
    activeTextColorClass: 'text-orange-700',
    activeIconColorClass: 'text-orange-600',
  },
  {
    id: 'cat_demolition',
    name: 'הריסה ופינוי',
    icon: DemolitionIcon,
    description: 'עבודות הריסה, פירוק ופינוי',
    subCategories: [
      { id: 'wall_demolition_qc', name: 'הריסת קירות' },
      { id: 'floor_removal_qc', name: 'פירוק ריצוף/חיפוי' },
      { id: 'waste_disposal_qc', name: 'פינוי פסולת' }
    ],
    workDuration: 2,
    baseColor: 'red',
    bgColorClass: 'bg-red-50',
    textColorClass: 'text-red-700',
    iconColorClass: 'text-red-500',
    hoverBgColorClass: 'hover:bg-red-100',
    activeBorderColorClass: 'border-red-500',
    activeBgColorClass: 'bg-red-100',
    activeTextColorClass: 'text-red-700',
    activeIconColorClass: 'text-red-600',
  },
  {
    id: 'cat_electricity',
    name: 'חשמל',
    icon: Lightbulb,
    description: 'נקודות חשמל, תאורה ותשתיות',
    subCategories: [
      { id: 'power_points_qc', name: 'נקודות חשמל' },
      { id: 'lighting_qc', name: 'תאורה' },
      { id: 'infrastructure_qc', name: 'תשתיות' }
    ],
    workDuration: 4,
    baseColor: 'yellow',
    bgColorClass: 'bg-yellow-50',
    textColorClass: 'text-yellow-700',
    iconColorClass: 'text-yellow-500',
    hoverBgColorClass: 'hover:bg-yellow-100',
    activeBorderColorClass: 'border-yellow-500',
    activeBgColorClass: 'bg-yellow-100',
    activeTextColorClass: 'text-yellow-700',
    activeIconColorClass: 'text-yellow-600',
  },
  {
    id: 'cat_plumbing',
    name: 'אינסטלציה',
    icon: Wrench,
    description: 'צנרת, כלים סניטריים ומערכות מים',
    subCategories: [
      { id: 'water_pipes_qc', name: 'צנרת מים וביוב' },
      { id: 'fixtures_qc', name: 'כלים סניטריים' },
      { id: 'heating_qc', name: 'מערכות חימום' }
    ],
    workDuration: 5,
    baseColor: 'teal',
    bgColorClass: 'bg-teal-50',
    textColorClass: 'text-teal-700',
    iconColorClass: 'text-teal-500',
    hoverBgColorClass: 'hover:bg-teal-100',
    activeBorderColorClass: 'border-teal-500',
    activeBgColorClass: 'bg-teal-100',
    activeTextColorClass: 'text-teal-700',
    activeIconColorClass: 'text-teal-600',
  },
  {
    id: 'cat_construction',
    name: 'בינוי (כללי)',
    icon: ConstructionIcon,
    description: 'עבודות בנייה, קירות, בטון (לא כולל הריסה)',
    subCategories: [
      { id: 'walls_qc', name: 'קירות ומחיצות' },
      { id: 'concrete_qc', name: 'בטון ויציקות' },
      { id: 'structural_work_qc', name: 'עבודות קונסטרוקציה' }
    ],
    workDuration: 7,
    baseColor: 'gray',
    bgColorClass: 'bg-gray-50',
    textColorClass: 'text-gray-700',
    iconColorClass: 'text-gray-500',
    hoverBgColorClass: 'hover:bg-gray-100',
    activeBorderColorClass: 'border-gray-500',
    activeBgColorClass: 'bg-gray-100',
    activeTextColorClass: 'text-gray-700',
    activeIconColorClass: 'text-gray-600',
  },
];

// NEW: persistently-mounted step 3 content to keep internal state when navigating away
function PersistedStep3({
  visible,
  userCategories,
  selectedCategories,
  selectedItems,
  setSelectedItems,
  currentCategoryForItems,
  setCurrentCategoryForItems,
  processedCategories,
  setProcessedCategories,
  categoryTimings,
  onCategoryTimingChange,
  onAddItemToQuote,
  onProceedToAdditionalCosts,
  projectComplexities,
  onUpdateRoomBreakdown,
  generalStartDate,
  generalEndDate,
  // NEW PROPS:
  tilingWorkTypes,
  userTilingItems,
  user,
  stagedManualItems,
  setStagedManualItems,
  itemSelectorRef, // 🆕 Ref to ItemSelector
}) {
  // compute effective category
  const effectiveCategoryId = selectedCategories.includes(currentCategoryForItems)
    ? currentCategoryForItems
    : (selectedCategories[0] || null);

  // if no categories selected, show friendly message (same UX as before)
  if (!effectiveCategoryId) {
    return (
      <div style={{ display: visible ? 'block' : 'none' }}>
        <Card className="shadow-lg">
          <CardHeader className="bg-gray-50/50 border-b">
            <CardTitle className="text-xl font-semibold text-gray-800">לא נבחרו קטגוריות</CardTitle>
            <CardDescription className="text-gray-600">כדי להוסיף פריטים, חזור לשלב הקטגוריות ובחר לפחות קטגוריה אחת.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-700">לחץ על "הקודם" כדי לבחור קטגוריות.</p>
          </CardContent>
          <CardFooter className="border-t p-4">
            {/* This button should go back to step 2, but PersistedStep3 doesn't control setCurrentStep directly.
                The navigation to previous step is handled by the main component.
                For now, leave as a no-op or reconsider if this button is truly necessary here.
                In original design, this message appeared only if currentStep=3 and no categories were selected,
                suggesting 'back' was handled by the main stepper controls. */}
            <Button variant="outline" onClick={() => { /* No-op, parent manages step navigation */ }}>
                <ArrowRight className="ml-2 h-4 w-4" />
                חזרה לקטגוריות
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const navCats = (userCategories.length ? userCategories : AVAILABLE_CATEGORIES)
    .filter(c => selectedCategories.includes(c.id))
    .map(c => ({ id: c.id, name: c.name }));

  // category-specific editors (same as original case 3 logic)
  let content = null;

  if (effectiveCategoryId === 'cat_demolition') {
    content = (
      <ErrorBoundary title="שגיאה בקטגוריית הריסה" debug={false}>
        <DemolitionCategory
          key={`cat-${effectiveCategoryId}`}
          selectedItems={selectedItems}
          onAddItemToQuote={onAddItemToQuote}
          categoryId="cat_demolition"
          categoryTimings={categoryTimings}
          onCategoryTimingChange={onCategoryTimingChange}
          onProceed={onProceedToAdditionalCosts}
          categoriesNav={navCats}
          currentCategoryId={effectiveCategoryId}
          onSelectCategory={setCurrentCategoryForItems}
        />
      </ErrorBoundary>
    );
  } else if (effectiveCategoryId === 'cat_construction') {
    content = (
      <ErrorBoundary title="שגיאה בקטגוריית בינוי" debug={false}>
        <ConstructionCategory
          key={`cat-${effectiveCategoryId}`}
          onAddItemToQuote={onAddItemToQuote}
          categoriesNav={navCats}
          currentCategoryId={effectiveCategoryId}
          onSelectCategory={setCurrentCategoryForItems}
          categoryTimings={categoryTimings}
          onCategoryTimingChange={onCategoryTimingChange}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          onProceed={onProceedToAdditionalCosts}
        />
      </ErrorBoundary>
    );
  } else if (effectiveCategoryId === 'cat_plumbing') {
    content = (
      <ErrorBoundary title="שגיאה בקטגוריית אינסטלציה" debug={false}>
        <PlumbingCategory
          key={`cat-${effectiveCategoryId}`}
          selectedItems={selectedItems}
          onAddItemToQuote={onAddItemToQuote}
          categoryId="cat_plumbing"
          categoryTimings={categoryTimings}
          onCategoryTimingChange={onCategoryTimingChange}
          categoriesNav={navCats}
          currentCategoryId={effectiveCategoryId}
          onSelectCategory={setCurrentCategoryForItems}
          onProceed={onProceedToAdditionalCosts}
        />
      </ErrorBoundary>
    );
  } else if (effectiveCategoryId === 'cat_electricity') {
    content = (
      <ErrorBoundary title="שגיאה בקטגוריית חשמל" debug={false}>
        <ElectricalCategory
          key={`cat-${effectiveCategoryId}`}
          selectedItems={selectedItems}
          onAddItemToQuote={onAddItemToQuote}
          categoryId="cat_electricity"
          categoryTimings={categoryTimings}
          onCategoryTimingChange={onCategoryTimingChange}
          categoriesNav={navCats}
          currentCategoryId={effectiveCategoryId}
          onSelectCategory={setCurrentCategoryForItems}
        />
      </ErrorBoundary>
    );
  } else {
    // generic selector (e.g., paint/tiling)
    content = (
      <ErrorBoundary title="שגיאה בעורך פריטים" debug={false}>
        <>
          {/* ביטול סרגל הניווט העליון הכפול - ItemSelector מציג כבר ניווט קטגוריות */}

          {effectiveCategoryId === 'cat_tiling' && (
            <TilingAutoSaveOnAddArea onAddItemToQuote={onAddItemToQuote} />
          )}

          <ItemSelector
            ref={itemSelectorRef}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            onAddItemToQuote={onAddItemToQuote}
            selectedCategories={selectedCategories}
            setCurrentStep={() => { /* no-op; step נשלט מההורה */ }}
            AVAILABLE_CATEGORIES={userCategories.length ? userCategories : AVAILABLE_CATEGORIES}
            currentCategoryForItems={effectiveCategoryId}
            setCurrentCategoryForItems={setCurrentCategoryForItems}
            processedCategories={processedCategories}
            setProcessedCategories={setProcessedCategories}
            categoryId={effectiveCategoryId}
            categoryTimings={categoryTimings}
            onCategoryTimingChange={onCategoryTimingChange}
            onProceed={onProceedToAdditionalCosts}
            projectComplexities={projectComplexities}
            onUpdateRoomBreakdown={onUpdateRoomBreakdown}
            generalStartDate={generalStartDate}
            generalEndDate={generalEndDate}
            // NEW PROPS
            tilingWorkTypes={user?.user_metadata?.tilingWorkTypes || tilingWorkTypes}
            userTilingItems={user?.user_metadata?.tilingItems || userTilingItems}
            user={user}
            stagedManualItems={stagedManualItems}
            setStagedManualItems={setStagedManualItems}
          />
        </>
      </ErrorBoundary>
    );
  }

  return (
    <div 
      style={{ display: visible ? 'block' : 'none' }} 
      className="persisted-step3-container"
    >
      <style>{`
        .persisted-step3-container [role="dialog"] {
          margin: 24px;
        }
        @media (max-width: 768px) {
          .persisted-step3-container [role="dialog"] {
            margin: 12px;
          }
        }
      `}</style>
      {content}
    </div>
  );
}

export default function QuoteCreate() {
  const navigate = useNavigate();
  const { user, refresh: refreshUser } = useUser();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true); // Renamed from 'isLoading'
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [existingQuoteId, setExistingQuoteId] = useState(null); // Renamed from 'editingQuoteId'
  const [quoteData, setQuoteData] = useState(null);
  const [showItemsDebug, setShowItemsDebug] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dbg = (urlParams.get('debug') || '').toLowerCase();
    return dbg === 'items' || dbg === 'all';
  });
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState(null);

  const { toast } = useToast();
  
  // ✅ ADD THIS LINE - Initialize the profit guard hook
  const { showProfitGuard, profitGuardData, triggerProfitGuard, closeProfitGuard } = useProfitGuard(30);

  const [projectInfo, setProjectInfo] = useState({
    projectName: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    projectAddress: '',
    projectType: '', // Changed from 'דירה' default
    startDate: '', // Preserved
    endDate: '', // Preserved
    notes: '', // Preserved
    generalStartDate: null, // Changed from '' to null
    workDays: 0, // Changed from '' to 0
    generalEndDate: null, // Changed from '' to null
  });

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [stagedManualItems, setStagedManualItems] = useState([]); // Temporary storage for manual items before consolidation
  const [currentCategoryForItems, setCurrentCategoryForItems] = useState(null);
  const [processedCategories, setProcessedCategories] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0); // Renamed from 'discount'
  const [priceIncrease, setPriceIncrease] = useState(0);
  const [categoryTimings, setCategoryTimings] = useState({});
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [projectComplexities, setProjectComplexities] = useState({
    floor: 1,
    hasElevator: true,
    parkingDistance: 10,
    storageAvailable: true,
    transportMethod: 'elevator',
    transportCosts: {
      manualLaborCostPerDay: 500,
      manualLaborDays: 1,
      craneCost: 0,
    },
    isOccupied: false,
    workHourRestrictions: false,
    specialSiteConditions: '',
    additionalCostDetails: [],
    totalAdditionalCost: 0,
    roomBreakdowns: {},
  });

  const [categoryCommitments, setCategoryCommitments] = useState({}); // New state
  const [tilingWorkTypes, setTilingWorkTypes] = useState([]); // New state, previously useMemo
  const [userTilingItems, setUserTilingItems] = useState([]); // New state, previously from user object

  // 🆕 Ref to ItemSelector for saving data when switching categories via CategoryStepper
  const itemSelectorRef = useRef(null);

  // Expose roomBreakdowns as a stable reference for hooks dependencies
  const roomBreakdowns = projectComplexities?.roomBreakdowns;

  // Run-once guard to prevent re-initialization that resets currentStep to 1
  const didInitRef = useRef(false);

  // NEW: filter categories by user's active map
  const userCategories = useMemo(() => {
    const map = (user?.user_metadata?.categoryActiveMap) || {};
    return AVAILABLE_CATEGORIES.filter(c => map[c.id] !== false);
  }, [user?.user_metadata?.categoryActiveMap]);

  // NEW: Helper function to get ordered categories based on selectedCategories order
  const getOrderedSelectedCategories = useCallback(() => {
    const sourceCategories = userCategories.length ? userCategories : AVAILABLE_CATEGORIES;
    return selectedCategories
      .map(catId => sourceCategories.find(c => c.id === catId))
      .filter(Boolean);
  }, [selectedCategories, userCategories]);


  // נרמול מבנה פירוט חדרים שמגיע מהטופס לגרסה עקבית להצגה ושמירה
  const normalizeRoomBreakdown = useCallback((raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map((r, idx) => ({
      name: r.name || r.roomName || `חלל ${idx + 1}`,
      quantity: Number(r.quantity ?? 1),
      unit: r.unit || 'מ"ר',
      includeCeiling: (typeof r.includeCeiling === 'boolean') ? r.includeCeiling : (r.withCeiling ?? false),
      wallArea: Number(
        r.wallArea ??
        r.wallsArea ??
        r.walls ??
        r.wallAreaSqM ??
        0
      ),
      ceilingArea: Number(
        r.ceilingArea ??
        r.ceilingAreaSqM ??
        r.ceiling ??
        0
      ),
      difficultyData: r.difficultyData || (r.difficultyLevel ? { label: r.difficultyLevel } : undefined),
    }));
  }, []);

  // פונקציה חדשה לעדכון פירוט החללים
  const handleUpdateRoomBreakdown = useCallback((type, breakdown) => {
    setProjectComplexities(prev => ({
      ...prev,
      roomBreakdowns: {
        ...prev.roomBreakdowns,
        [type]: breakdown,
      },
    }));
  }, [setProjectComplexities]);

  // פונקציה מעודכנת להוספת פריטים להצעה עם שמירת פירוט חללים
  const handleAddItemToQuote = useCallback((items) => {
    const itemsToAdd = Array.isArray(items) ? items : [items];
    if (itemsToAdd.length === 0) {
        return;
    }

    const itemCategoryId = itemsToAdd[0].categoryId;
    if (!itemCategoryId) {
        return;
    }

    // Check if these are manual items that should be staged instead of added directly
    const isManualItem = itemsToAdd.some(item =>
      item.source === 'manual_calc' ||
      item.source === 'tiling_manual' ||
      item.source === 'tiling_area_autosave'
    );

    if (isManualItem) {
      // Stage manual items for consolidation when category is saved
      setStagedManualItems(prev => {
        // Check if we're editing an existing item (has an ID that matches an existing staged item)
        const firstItemId = itemsToAdd[0]?.id;
        const isEditing = firstItemId && prev.some(item => item.id === firstItemId);

        if (isEditing) {
          // Replace the existing item with the edited version
          console.log('Replacing edited manual item:', firstItemId);
          return prev.map(item => item.id === firstItemId ? itemsToAdd[0] : item);
        } else {
          // Add new manual items
          console.log('Manual items staged for consolidation:', itemsToAdd);
          return [...prev, ...itemsToAdd];
        }
      });
      return; // Don't add to selectedItems yet
    }

    const roomBreakdownKey = itemCategoryId === 'cat_paint_plaster' ? 'paint' :
                             itemCategoryId === 'cat_demolition' ? 'demolition' : null;

    let updatedRoomBreakdownForProjectComplexities = null;

    setSelectedItems(prevItems => {
      const isDemolitionRegularItem = itemCategoryId === 'cat_demolition' &&
                                      !itemsToAdd.some(it => it.source === 'demolition_rounding');

      const hasExistingRounding = prevItems.some(it =>
        it.categoryId === 'cat_demolition' &&
        ((Number(it.demolitionRoundingSharePrice) || 0) > 0 || (Number(it.demolitionRoundingShareCost) || 0) > 0 || (Number(it.demolitionRoundingShareWorkDays) || 0) > 0)
      );

      let cleanedItems = prevItems;
      if (isDemolitionRegularItem && hasExistingRounding) {
        cleanedItems = prevItems.map(it => {
          if (it.categoryId !== 'cat_demolition') return it;

          const basePrice = Math.max(0, (Number(it.totalPrice) || 0) - (Number(it.demolitionRoundingSharePrice) || 0));
          const baseCost = Math.max(0, (Number(it.totalCost) || 0) - (Number(it.demolitionRoundingShareCost) || 0));
          const baseWorkDays = Math.max(0, (Number(it.workDuration) || 0) - (Number(it.demolitionRoundingShareWorkDays) || 0));

          const { demolitionRoundingSharePrice, demolitionRoundingShareCost, demolitionRoundingShareWorkDays, ...rest } = it;

          return {
            ...rest,
            totalPrice: basePrice,
            totalCost: baseCost,
            workDuration: baseWorkDays,
            basePrice: basePrice,
            baseCost: baseCost
          };
        });
      }

      const itemsWithBreakdown = itemsToAdd.map(item => {
        const rawBreakdown = item.detailedBreakdown || item.detailedRoomsData || item.roomBreakdown;

        if (rawBreakdown && Array.isArray(rawBreakdown)) {
          let normalized = normalizeRoomBreakdown(rawBreakdown);
          const hasDifficulty = normalized.some(r => r?.difficultyData || r?.difficultyLevel);
          if (!hasDifficulty && item.categoryId === 'cat_paint_plaster') {
            try {
              const cached = sessionStorage.getItem('paint_last_breakdown');
              if (cached) {
                const cachedArr = JSON.parse(cached);
                if (Array.isArray(cachedArr) && cachedArr.length > 0) {
                  normalized = normalized.map((r, idx) => {
                    const fromCache = cachedArr[idx] || {};
                    return r?.difficultyData || fromCache?.difficultyData
                      ? { ...r, difficultyData: r.difficultyData || fromCache.difficultyData }
                      : r;
                  });
                }
              }
            } catch (e) {
              console.warn("Failed to parse paint_last_breakdown from sessionStorage:", e);
            }
          }
          if (roomBreakdownKey && normalized.length > 0) {
            updatedRoomBreakdownForProjectComplexities = normalized;
          }
          let withBreakdown = { ...item, detailedBreakdown: normalized };

          if ((withBreakdown.categoryId === 'cat_paint_plaster') && normalized.some(r => r?.difficultyData || r?.difficultyLevel)) {
            const factorFromLabel = (label) => {
              const l = String(label || '').toLowerCase();
              if (['קל', 'easy'].some(k => l.includes(k))) return 1.0;
              if (['בינוני', 'medium'].some(k => l.includes(k))) return 1.1;
              if (['קשה מאוד', 'very', 'very_hard'].some(k => l.includes(k))) return 1.5;
              if (['קשה', 'hard'].some(k => l.includes(k))) return 1.25;
              return 1.0;
            };
            let totalWeight = 0;
            let sum = 0;
            normalized.forEach(r => {
              const factor = r?.difficultyData?.factor ??
                             (r?.difficultyData?.label ? factorFromLabel(r.difficultyData.label) : undefined) ??
                             (r?.difficultyLevel ? factorFromLabel(r.difficultyLevel) : 1.0);
              const weight = Number(r.wallArea || r.wallsArea || 0) || 1;
              totalWeight += weight;
              sum += (factor || 1.0) * weight;
            });
            const complexityFactor = totalWeight > 0 ? (sum / totalWeight) : 1.0;

            const materialCost = Number(withBreakdown.materialCost ?? 0);
            const laborCost = Number(withBreakdown.laborCost ?? 0);
            const otherCost = Math.max(0, Number(withBreakdown.totalCost ?? 0) - materialCost - laborCost);
            const profitPercentExisting = Number(withBreakdown.profitPercent ?? withBreakdown.desiredProfitPercent ?? 30);
            const quantity = Number(withBreakdown.quantity ?? 0);
            const workDuration = Number(withBreakdown.workDuration ?? withBreakdown.estimatedTime ?? 0);

            const baseTotalCost = (materialCost || 0) + (otherCost || 0) + (laborCost || 0);
            const baseTotalPrice = Math.round(baseTotalCost * (1 + (profitPercentExisting / 100)));

            const newLaborCost = laborCost > 0 ? laborCost * complexityFactor : 0;
            const newTotalCost = (materialCost || 0) + (otherCost || 0) + newLaborCost;
            const newTotalPrice = Math.round(newTotalCost * (1 + (profitPercentExisting / 100)));
            const newUnitPrice = quantity > 0 ? Math.round(newTotalPrice / quantity) : (withBreakdown.unitPrice ?? newTotalPrice);
            const newWorkDuration = workDuration > 0 ? workDuration * complexityFactor : workDuration;

            const complexityLaborAddedCost = Math.max(0, newLaborCost - laborCost);
            const complexityWorkDaysAdded = Math.max(0, newWorkDuration - workDuration);
            const complexityHoursAdded = Math.round(complexityWorkDaysAdded * 8);
            const complexityAddedPrice = Math.max(0, newTotalPrice - baseTotalPrice);

            withBreakdown = {
              ...withBreakdown,
              laborCost: newLaborCost,
              totalCost: newTotalCost,
              totalPrice: newTotalPrice,
              unitPrice: newUnitPrice,
              workDuration: newWorkDuration,
              complexityFactorApplied: complexityFactor,
              baseLaborBeforeComplexity: laborCost,
              baseWorkDurationBeforeComplexity: workDuration,
              complexityLaborAddedCost,
              complexityHoursAdded,
              basePriceWithoutComplexity: baseTotalPrice,
              complexityAddedPrice,
              basePrice: newTotalPrice,
              baseCost: newTotalCost
            };
          } else {
            withBreakdown = {
              ...withBreakdown,
              basePrice: withBreakdown.totalPrice || 0,
              baseCost: withBreakdown.totalCost || 0
            };
          }

          return withBreakdown;
        }

        const fromProject = roomBreakdownKey && roomBreakdowns && roomBreakdowns[roomBreakdownKey];
        if (fromProject && Array.isArray(fromProject) && fromProject.length > 0) {
          return {
            ...item,
            detailedBreakdown: fromProject,
            basePrice: item.totalPrice || 0,
            baseCost: item.totalCost || 0
          };
        }

        if (roomBreakdownKey === 'paint') {
          try {
            const cached = sessionStorage.getItem('paint_last_breakdown');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const normalized = normalizeRoomBreakdown(parsed);
                updatedRoomBreakdownForProjectComplexities = normalized;
                return {
                  ...item,
                  detailedBreakdown: normalized,
                  basePrice: item.totalPrice || 0,
                  baseCost: item.totalCost || 0
                };
              }
            }
          } catch (e) {
            console.warn("Failed to parse paint_last_breakdown from sessionStorage for fallback:", e);
          }
        } else if (roomBreakdownKey === 'demolition') {
          try {
            const cached = sessionStorage.getItem('demolition_last_breakdown');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const normalized = normalizeRoomBreakdown(parsed);
                updatedRoomBreakdownForProjectComplexities = normalized;
                return {
                  ...item,
                  detailedBreakdown: normalized,
                  basePrice: item.totalPrice || 0,
                  baseCost: item.totalCost || 0
                };
              }
            }
          } catch (e) {
            console.warn("Failed to parse demolition_last_breakdown from sessionStorage for fallback:", e);
          }
        }

        let updatedItem = item;

        const isTiling = (updatedItem.categoryId === 'cat_tiling' || updatedItem.source === 'tiling_calculator');
        const desiredProfitFromItem = Number(
          updatedItem.desiredProfitPercent ??
          updatedItem.desired_profit_percent ??
          updatedItem.profitPercentOverride
        );

        if (isTiling && !isNaN(desiredProfitFromItem) && desiredProfitFromItem >= 0) {
          let totalCost = Number(updatedItem.totalCost ?? 0);
          if (totalCost <= 0) {
            const costPerMeter = Number(updatedItem.costPerMeter ?? updatedItem.averageCostPerMeter ?? 0);
            const qty = Number(updatedItem.quantity ?? 0);
            totalCost = costPerMeter > 0 && qty > 0 ? costPerMeter * qty : 0;
          }

          if (totalCost > 0) {
            const finalTotalPrice = Math.round(totalCost * (1 + desiredProfitFromItem / 100));
            const qty = Number(updatedItem.quantity ?? 0);
            const unitPrice = qty > 0 ? Math.round(finalTotalPrice / qty) : (updatedItem.unitPrice ?? finalTotalPrice);
            const profitAmount = finalTotalPrice - totalCost;

            updatedItem = {
              ...updatedItem,
              desiredProfitPercent: desiredProfitFromItem,
              totalCost: totalCost,
              totalPrice: finalTotalPrice,
              unitPrice,
              profit: profitAmount,
              profitPercent: desiredProfitFromItem,
              basePrice: finalTotalPrice,
              baseCost: totalCost
            };
          }
        }

        if ((updatedItem?.categoryId === 'cat_demolition') && Number(updatedItem?.totalCost) > 0) {
          const pct = Number(updatedItem?.profitPercent ?? updatedItem?.desiredProfitPercent ?? 0);
          if (pct > 0 && pct < 100) {
            const cost = Number(updatedItem.totalCost);
            const currentPrice = Number(updatedItem.totalPrice ?? 0);
            const marginPrice = Math.round(cost / (1 - pct / 100));
            const markupPrice = Math.round(cost * (1 + pct / 100));

            if (Math.abs(currentPrice - marginPrice) <= 2) {
              const qty = Math.max(1, Number(updatedItem.quantity ?? 1));
              updatedItem = {
                ...updatedItem,
                totalPrice: markupPrice,
                unitPrice: Math.round(markupPrice / qty),
                profit: markupPrice - cost,
                profitCalculationMode: 'markup',
                basePrice: markupPrice,
                baseCost: cost
              };
            }
          }
        }

        if (!updatedItem.basePrice) {
          updatedItem = {
            ...updatedItem,
            basePrice: updatedItem.totalPrice || 0,
            baseCost: updatedItem.totalCost || 0
          };
        }

        return updatedItem;
      });

      const containsRounding = itemsWithBreakdown.some(it => it.source === 'demolition_rounding');
      const isDemolition = itemCategoryId === 'cat_demolition';
      const isTiling = itemCategoryId === 'cat_tiling';
      const isConstruction = itemCategoryId === 'cat_construction';
      const isPlumbing = itemCategoryId === 'cat_plumbing';
      const isElectricity = itemCategoryId === 'cat_electricity';

      if (isDemolition && containsRounding) {
        const roundingItems = itemsWithBreakdown.filter(it => it.source === 'demolition_rounding');
        const newNonRounding = itemsWithBreakdown.filter(it => it.source !== 'demolition_rounding');

        const roundPriceTotal = roundingItems.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
        const roundCostTotal = roundingItems.reduce((s, it) => s + (Number(it.totalCost) || 0), 0);
        const roundWorkDaysTotal = roundingItems.reduce((s, it) => s + (Number(it.workDuration) || 0), 0);

        const prevWithoutRoundingItems = cleanedItems.filter(x => x.source !== 'demolition_rounding');
        const combined = [...prevWithoutRoundingItems, ...newNonRounding];

        const demolitionIdxs = combined.reduce((acc, it, idx) => {
          if (it.categoryId === 'cat_demolition') acc.push(idx);
          return acc;
        }, []);

        if (demolitionIdxs.length === 0) {
          return combined;
        }
        if (roundPriceTotal === 0 && roundCostTotal === 0 && roundWorkDaysTotal === 0) {
          const cleaned = combined.map((it) => {
            if (it.categoryId !== 'cat_demolition') return it;
            const basePrice = Math.max(0, (Number(it.totalPrice) || 0) - (Number(it.demolitionRoundingSharePrice) || 0));
            const baseCost = Math.max(0, (Number(it.totalCost) || 0) - (Number(it.demolitionRoundingShareCost) || 0));
            const baseWorkDays = Math.max(0, (Number(it.workDuration) || 0) - (Number(it.demolitionRoundingShareWorkDays) || 0));
            const { demolitionRoundingSharePrice, demolitionRoundingShareCost, demolitionRoundingShareWorkDays, ...rest } = it;
            return { ...rest, totalPrice: basePrice, totalCost: baseCost, workDuration: baseWorkDays, basePrice: basePrice, baseCost: baseCost };
          });
          return cleaned;
        }

        const baseTotals = demolitionIdxs.map(i => {
          const it = combined[i];
          const basePrice = Math.max(0, (Number(it.totalPrice) || 0) - (Number(it.demolitionRoundingSharePrice) || 0));
          const baseCost = Math.max(0, (Number(it.totalCost) || 0) - (Number(it.demolitionRoundingShareCost) || 0));
          const baseWorkDays = Math.max(0, (Number(it.workDuration) || 0) - (Number(it.demolitionRoundingShareWorkDays) || 0));
          return { i, basePrice, baseCost, baseWorkDays };
        });

        const weights = demolitionIdxs.map(i => {
          const base = baseTotals.find(b => b.i === i);
          const p = Number(base?.basePrice || 0);
          return p > 0 ? p : 1;
        });
        const weightSum = weights.reduce((a, b) => a + b, 0) || demolitionIdxs.length;

        let allocatedPrice = 0;
        let allocatedCost = 0;
        let allocatedWorkDays = 0;
        const shares = demolitionIdxs.map((i, k) => {
          let p = Math.round(roundPriceTotal * (weights[k] / weightSum));
          let c = Math.round(roundCostTotal * (weights[k] / weightSum));
          let w = roundWorkDaysTotal * (weights[k] / weightSum);
          if (k === demolitionIdxs.length - 1) {
            p = roundPriceTotal - allocatedPrice;
            c = roundCostTotal - allocatedCost;
            w = roundWorkDaysTotal - allocatedWorkDays;
          }
          allocatedPrice += p;
          allocatedCost += c;
          allocatedWorkDays += w;
          return { i, sharePrice: p, shareCost: c, shareWorkDays: w };
        });

        const updated = combined.map((it, idx) => {
          if (it.categoryId !== 'cat_demolition') return it;
          const base = baseTotals.find(b => b.i === idx);
          const share = shares.find(s => s.i === idx) || { sharePrice: 0, shareCost: 0, shareWorkDays: 0 };
          const { demolitionRoundingSharePrice, demolitionRoundingShareCost, demolitionRoundingShareWorkDays, ...rest } = it;
          const newTotalPrice = (base?.basePrice ?? (Number(it.totalPrice) || 0)) + share.sharePrice;
          const newTotalCost = (base?.baseCost ?? (Number(it.totalCost) || 0)) + share.shareCost;

          return {
            ...rest,
            totalPrice: newTotalPrice,
            totalCost: newTotalCost,
            workDuration: (base?.baseWorkDays ?? (Number(it.workDuration) || 0)) + share.shareWorkDays,
            demolitionRoundingSharePrice: share.sharePrice,
            demolitionRoundingShareCost: share.shareCost,
            demolitionRoundingShareWorkDays: share.shareWorkDays,
            basePrice: newTotalPrice,
            baseCost: newTotalCost
          };
        });

        return updated;
      } else if (isDemolition || isConstruction || isPlumbing || isElectricity || isTiling) {
        return [...cleanedItems, ...itemsWithBreakdown];
      } else {
        const itemsFromOtherCategories = cleanedItems.filter(existingItem => existingItem.categoryId !== itemCategoryId);
        return [...itemsFromOtherCategories, ...itemsWithBreakdown];
      }
    });

    if (roomBreakdownKey && updatedRoomBreakdownForProjectComplexities) {
      setProjectComplexities(prev => ({
        ...prev,
        roomBreakdowns: {
          ...(prev.roomBreakdowns || {}),
          [roomBreakdownKey]: updatedRoomBreakdownForProjectComplexities,
        },
      }));
    }
  }, [normalizeRoomBreakdown, roomBreakdowns, setProjectComplexities, setSelectedItems, setStagedManualItems]);


  // נשמור פונקציה גלובלית שתאפשר הוספה לעגלה גם מאזין כללי
  useEffect(() => {
    window.__b44AddItemToQuote = (item) => {
      handleAddItemToQuote(item);
    };
    return () => {
      try { delete window.__b44AddItemToQuote; } catch (e) {
      }
    };
  }, [handleAddItemToQuote]);

  // NEW: update a single item inside selectedItems by id
  const handleUpdateItemInQuote = useCallback((itemId, patch) => {
    setSelectedItems(prev => prev.map(it => it.id === itemId ? { ...it, ...patch } : it));
  }, []);

  // פונקציה להסרת פריט מההצעה
  const handleRemoveItemFromQuote = useCallback((itemId) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // פונקציה לחישוב תאריך סיום אוטומטי (ללא ימי שישי-שבת)
  const calculateEndDate = useCallback((startDate, workDays) => {
    if (!startDate || !workDays || workDays <= 0) return null; // Changed to null

    const start = new Date(startDate);
    let currentDate = new Date(start);

    while (true) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
            break;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (workDays === 1) {
        return currentDate.toISOString().split('T')[0];
    }

    let remainingWorkDaysToAdd = workDays - 1;

    while (remainingWorkDaysToAdd > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        remainingWorkDaysToAdd--;
      }
    }

    return currentDate.toISOString().split('T')[0];
  }, []);

  // עדכון אוטומטי של תאריך סיום כאשר משנים תחילה או ימי עבודה
  useEffect(() => {
    if (projectInfo.generalStartDate && projectInfo.workDays && Number(projectInfo.workDays) > 0) {
      const calculatedEndDate = calculateEndDate(projectInfo.generalStartDate, Number(projectInfo.workDays));
      if (calculatedEndDate && calculatedEndDate !== projectInfo.generalEndDate) {
        setProjectInfo(prev => ({ ...prev, generalEndDate: calculatedEndDate }));
      }
    } else if (!projectInfo.generalStartDate || Number(projectInfo.workDays) <= 0) {
      if (projectInfo.generalEndDate !== null) { // Changed to null
          setProjectInfo(prev => ({ ...prev, generalEndDate: null })); // Changed to null
      }
    }
  }, [projectInfo.generalStartDate, projectInfo.workDays, projectInfo.generalEndDate, calculateEndDate]);

  // useEffect חדש - החלת הנחה/העלאת מחיר על כל הפריטים
  useEffect(() => {
    if (selectedItems.length === 0) return;

    // חישוב מקדם ההתאמה: (1 + העלאה%) * (1 - הנחה%)
    const adjustmentFactor = (1 + priceIncrease / 100) * (1 - discountPercent / 100); // Using discountPercent

    // עדכון מחירי הפריטים בהתאם למקדם
    setSelectedItems(prevItems =>
      prevItems.map(item => {
        const itemBasePrice = item.basePrice ?? item.totalPrice ?? 0;
        const itemBaseCost = item.baseCost ?? item.totalCost ?? 0;

        const newTotalPrice = Math.round(itemBasePrice * adjustmentFactor);

        const newProfit = newTotalPrice - itemBaseCost;
        const newProfitPercent = itemBaseCost > 0 ? ((newProfit / itemBaseCost) * 100) : 0;

        const quantity = Number(item.quantity) || 1;
        const newUnitPrice = quantity > 0 ? Math.round(newTotalPrice / quantity) : (item.unitPrice ?? newTotalPrice);

        return {
          ...item,
          totalPrice: newTotalPrice,
          unitPrice: newUnitPrice,
          profit: newProfit,
          profitPercent: newProfitPercent
        };
      })
    );
  }, [discountPercent, priceIncrease]); // Dependency: discountPercent


  // פונקציה לאיפוס נתוני ההצעה
  const resetQuoteData = useCallback(() => {
    setProjectInfo({
      projectName: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      projectAddress: '',
      projectType: '', // Changed from 'דירה'
      startDate: '',
      endDate: '',
      notes: '',
      generalStartDate: null, // Changed from '' to null
      workDays: 0, // Changed from '' to 0
      generalEndDate: null, // Changed from '' to null
    });

    setSelectedCategories([]);
    setSelectedItems([]);
    setCurrentCategoryForItems(null);
    setProcessedCategories([]);
    setDiscountPercent(0); // Renamed from setDiscount
    setPriceIncrease(0);
    setCategoryTimings({});
    setPaymentTerms([]); // Will be reset to user default by useEffect below
    setProjectComplexities({
      floor: 1,
      hasElevator: true,
      parkingDistance: 10,
      storageAvailable: true,
      transportMethod: 'elevator',
      transportCosts: {
        manualLaborCostPerDay: 500,
        manualLaborDays: 1,
        craneCost: 0,
      },
      isOccupied: false,
      workHourRestrictions: false,
      specialSiteConditions: '',
      additionalCostDetails: [],
      totalAdditionalCost: 0,
      roomBreakdowns: {},
    });

    setExistingQuoteId(null); // Renamed from setEditingQuoteId
    setQuoteData(null);
    setCurrentStep(1);
    setTilingWorkTypes([]); // Reset new state
    setUserTilingItems([]); // Reset new state
    setCategoryCommitments({}); // Reset new state
  }, []);

  const loadExistingQuote = useCallback(async (quoteId, userLoadedData) => { // Renamed currentUser to userLoadedData for clarity
    try {
      setIsLoadingUser(true); // Renamed from setIsLoading
      setExistingQuoteId(quoteId); // Renamed from setEditingQuoteId

      if (!userLoadedData || !userLoadedData.email) {
          console.warn("User not fetched yet or user email is missing, cannot load quote.");
          navigate(createPageUrl('SentQuotes'));
          return;
      }

      const quotes = await Quote.filter({ id: quoteId, user_id: userLoadedData.id });
      const existingQuote = quotes[0];

      if (existingQuote) {
        setQuoteData(existingQuote);

        setProjectInfo({
          projectName: existingQuote.projectName || '',
          clientName: existingQuote.clientName || '',
          clientEmail: existingQuote.clientEmail || '',
          clientPhone: existingQuote.clientPhone || '',
          projectAddress: existingQuote.projectAddress || '',
          projectType: existingQuote.projectType || '', // Default to empty string
          startDate: existingQuote.startDate || '',
          endDate: existingQuote.endDate || '',
          notes: existingQuote.notes || '',
          generalStartDate: existingQuote.generalStartDate || null, // Default to null
          workDays: existingQuote.workDays ?? 0, // Default to 0
          generalEndDate: existingQuote.generalEndDate || null, // Default to null
        });

        if (existingQuote.items && Array.isArray(existingQuote.items)) {
          const loadedItems = existingQuote.items.map(item => {
              let updatedItem = item;
              const roomBreakdownKey = item.categoryId === 'cat_paint_plaster' ? 'paint' :
                                       item.categoryId === 'cat_demolition' ? 'demolition' : null;

              if (roomBreakdownKey && (item.detailedBreakdown || item.detailedRoomsData)) {
                  const rawBreakdown = item.detailedBreakdown || item.detailedRoomsData;
                  const normalized = normalizeRoomBreakdown(rawBreakdown);

                  setProjectComplexities(prev => ({
                      ...prev,
                      roomBreakdowns: {
                          ...(prev.roomBreakdowns || {}),
                          [roomBreakdownKey]: normalized,
                      },
                  }));
                  updatedItem = { ...item, detailedBreakdown: normalized };
              } else if (roomBreakdownKey && projectComplexities?.roomBreakdowns?.[roomBreakdownKey]) {
                updatedItem = { ...item, detailedBreakdown: projectComplexities.roomBreakdowns[roomBreakdownKey] };
              }
              return updatedItem;
          });

          const itemsWithBasePrices = loadedItems.map(item => ({
            ...item,
            basePrice: item.totalPrice ?? 0,
            baseCost: item.totalCost ?? 0,
          }));

          setSelectedItems(itemsWithBasePrices);

          const categoriesFromItems = [...new Set(loadedItems.map(item => item.categoryId))];
          setSelectedCategories(categoriesFromItems);
        }

        if (existingQuote.categoryTimings) {
          setCategoryTimings(existingQuote.categoryTimings);
        }

        if (existingQuote.paymentTerms && Array.isArray(existingQuote.paymentTerms)) {
          setPaymentTerms(existingQuote.paymentTerms);
        } else if (userLoadedData && Array.isArray(userLoadedData.defaultPaymentTerms)) { // Using userLoadedData
          setPaymentTerms(userLoadedData.defaultPaymentTerms);
        }

        if (existingQuote.projectComplexities) {
            const loadedComplexities = existingQuote.projectComplexities;
            setProjectComplexities(prev => ({
                ...prev,
                floor: loadedComplexities.floor ?? 1,
                hasElevator: loadedComplexities.hasElevator ?? true,
                parkingDistance: loadedComplexities.parkingDistance ?? 10,
                storageAvailable: loadedComplexities.storageAvailable ?? true,
                transportMethod: loadedComplexities.transportMethod ?? 'elevator',
                transportCosts: loadedComplexities.transportCosts ?? {
                  manualLaborCostPerDay: 500,
                  manualLaborDays: 1,
                  craneCost: 0,
                },
                isOccupied: loadedComplexities.isOccupied ?? false,
                workHourRestrictions: loadedComplexities.workHourRestrictions ?? false,
                specialSiteConditions: '',
                additionalCostDetails: Array.isArray(loadedComplexities.additionalCostDetails) ? loadedComplexities.additionalCostDetails : [],
                totalAdditionalCost: typeof loadedComplexities.totalAdditionalCost === 'number' ? loadedComplexities.totalAdditionalCost : 0,
                roomBreakdowns: loadedComplexities.roomBreakdowns ?? prev.roomBreakdowns ?? {},
            }));
        } else {
             setProjectComplexities({
                floor: 1,
                hasElevator: true,
                parkingDistance: 10,
                storageAvailable: true,
                transportMethod: 'elevator',
                transportCosts: {
                  manualLaborCostPerDay: 500,
                  manualLaborDays: 1,
                  craneCost: 0,
                },
                isOccupied: false,
                workHourRestrictions: false,
                specialSiteConditions: '',
                additionalCostDetails: [],
                totalAdditionalCost: 0,
                roomBreakdowns: {},
            });
        }

        if (existingQuote.discountPercent !== undefined) { // Check for new discountPercent
          setDiscountPercent(existingQuote.discountPercent);
        } else if (existingQuote.discount !== undefined) { // Fallback to old discount if present
          setDiscountPercent(existingQuote.discount);
        }

        if (existingQuote.priceIncrease !== undefined) {
          setPriceIncrease(existingQuote.priceIncrease);
        }

        // Set new states from loaded quote or user defaults
        setCategoryCommitments(existingQuote.categoryCommitments || userLoadedData?.categoryCommitments || {});
        setTilingWorkTypes(existingQuote.tilingWorkTypes || userLoadedData?.tilingOptions?.workTypes || []);
        // ✅ Load from snake_case database column, fallback to camelCase for backward compatibility
        setUserTilingItems(existingQuote.tiling_items || existingQuote.userTilingItems || userLoadedData?.tilingItems || []);

      } else {
        console.warn("No existing quote found for ID:", quoteId);
        navigate(createPageUrl('SentQuotes'));
      }
    } catch (error) {
      console.error("Error loading existing quote:", error);
      navigate(createPageUrl('SentQuotes'));
    } finally {
        setIsLoadingUser(false); // Renamed from setIsLoading
    }
  }, [
    setIsLoadingUser, setExistingQuoteId, setQuoteData, setProjectInfo,
    setCategoryTimings, setPaymentTerms, setProjectComplexities,
    setDiscountPercent, setPriceIncrease, navigate, normalizeRoomBreakdown,
    setSelectedItems, setSelectedCategories, projectComplexities,
    setCategoryCommitments, setTilingWorkTypes, setUserTilingItems // New states in dependencies
  ]);


  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const fetchUser = async () => {
      try {
          const userData = user;
        setCurrentUser(userData); // Renamed from setUser

        // Set new states from user defaults
        setCategoryCommitments(userData?.user_metadata?.categoryCommitments || {});
        setTilingWorkTypes(userData?.user_metadata?.tilingWorkTypes || []);
        setUserTilingItems(userData?.user_metadata?.tilingItems || []);

        const urlParams = new URLSearchParams(window.location.search);
        const quoteIdParam = urlParams.get('id');

        if (quoteIdParam) {
          await loadExistingQuote(quoteIdParam, userData);
        } else {
          resetQuoteData();
          if (userData && Array.isArray(userData.defaultPaymentTerms)) {
            setPaymentTerms(userData.defaultPaymentTerms);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setCurrentUser(null); // Renamed from setUser
        // Default new states to empty if user fetch fails
        setTilingWorkTypes([]);
        setUserTilingItems([]);
        setCategoryCommitments({});
      } finally {
        setIsLoadingUser(false); // Renamed from setIsLoading
      }
    };
    fetchUser();
  }, [user, loadExistingQuote, resetQuoteData, setPaymentTerms, setIsLoadingUser, setCurrentUser, setCategoryCommitments, setTilingWorkTypes, setUserTilingItems]);

  // REMOVED: visibilitychange handler that was causing data loss when minimizing tab
  // The useSafeUser hook already handles connectivity with online/offline events
  // If user settings need to be refreshed, users can manually refresh the page (F5)

  // ADDED: Keep currentCategoryForItems valid when categories change or on step 3
  useEffect(() => {
    if (currentStep !== 3) return;
    const isValid = currentCategoryForItems && selectedCategories.includes(currentCategoryForItems);
    const fallback = selectedCategories.length > 0 ? selectedCategories[0] : null;
    if (!isValid && fallback !== currentCategoryForItems) {
      setCurrentCategoryForItems(fallback);
    }
  }, [currentStep, selectedCategories, currentCategoryForItems]);


  const handleProjectInfoChange = (field, value) => {
    setProjectInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryTimingChange = (categoryId, field, value) => {
    setCategoryTimings(prev => ({
        ...prev,
        [categoryId]: {
            ...prev[categoryId],
            [field]: value
        }
    }));
  };

  const toggleCategory = (categoryId) => {
    const isCurrentlySelected = selectedCategories.includes(categoryId);

    if (isCurrentlySelected) {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
      setSelectedItems(prevItems => prevItems.filter(item => item.categoryId !== categoryId));
    } else {
      setSelectedCategories(prev => [...prev, categoryId]);
    }
  };

  // NEW: Function to reorder categories
  const reorderCategories = useCallback((fromIndex, toIndex) => {
    setSelectedCategories(prev => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);
      return newOrder;
    });
  }, []);

  // NEW: Move category up in order
  const moveCategoryUp = useCallback((categoryId) => {
    const index = selectedCategories.indexOf(categoryId);
    if (index > 0) {
      reorderCategories(index, index - 1);
    }
  }, [selectedCategories, reorderCategories]);

  // NEW: Move category down in order
  const moveCategoryDown = useCallback((categoryId) => {
    const index = selectedCategories.indexOf(categoryId);
    if (index < selectedCategories.length - 1) {
      reorderCategories(index, index + 1);
    }
  }, [selectedCategories, reorderCategories]);

  // Totals calculation (kept existing detailed logic)
  const totals = useMemo(() => {
    const subtotalItems = selectedItems.reduce((accumulator, item) => accumulator + (item.totalPrice || 0), 0);
    const projectAdditionalCosts = (projectComplexities?.additionalCostDetails || []).reduce((accumulator, cost) => accumulator + (cost.cost || 0), 0);

    const total = subtotalItems + projectAdditionalCosts;

    const totalItemsCost = selectedItems.reduce((accumulator, item) => accumulator + (item.totalCost || 0), 0);
    const totalContractorAdditionalCosts = (projectComplexities?.additionalCostDetails || []).reduce(
      (accumulator, cost) => accumulator + (cost.contractorCost || 0), 0
    );
    const totalContractorCost = totalItemsCost + totalContractorAdditionalCosts;

    const profit = total - totalContractorCost;
    const profitPercent = totalContractorCost > 0 ? (profit / totalContractorCost * 100) : 0;

    const totalWorkDays = selectedItems.reduce((accumulator, item) => accumulator + (Number(item.workDuration) || 0), 0);

    return {
      baseAmount: subtotalItems + projectAdditionalCosts,
      priceIncreaseAmount: 0,
      totalBeforeDiscount: 0,
      discountAmount: 0,
      total,
      totalWorkDays,
      totalCost: totalContractorCost,
      profit: profit,
      profitPercent: profitPercent.toFixed(1),
      projectAdditionalCosts: projectAdditionalCosts
    };
  }, [selectedItems, projectComplexities]);

  // פונקציה לחישוב ימי עבודה נטו (ללא שישי-שבת)
  const calculateWorkingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        workingDays++;
      }
    }

    return workingDays;
  };

  // Save/Update Quote Logic
  const proceedWithSave = useCallback(async (isDraft = false) => {
    setIsLoadingUser(true); // Renamed from setIsLoading
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const currentTotals = totals;

      const quoteDataToSave = {
        ...projectInfo,
        workDays: projectInfo.workDays ? Number(projectInfo.workDays) : null,
        generalStartDate: projectInfo.generalStartDate || null,
        generalEndDate: projectInfo.generalEndDate || null,
        startDate: projectInfo.startDate || null,
        endDate: projectInfo.endDate || null,
        notes: projectInfo.notes || '',

        status: isDraft ? 'טיוטה' : 'נשלח',
        totalAmount: currentTotals.baseAmount,
        discountPercent: discountPercent, // Using discountPercent state
        priceIncrease: priceIncrease,
        finalAmount: currentTotals.total,
        items: selectedItems,
        categoryTimings: categoryTimings,
        projectComplexities: {
          ...projectComplexities,
          additionalCostDetails: Array.isArray(projectComplexities?.additionalCostDetails) ? projectComplexities.additionalCostDetails : [],
          totalAdditionalCost: typeof currentTotals.projectAdditionalCosts === 'number' ? currentTotals.projectAdditionalCosts : 0
        },
        estimatedWorkDays: currentTotals.totalWorkDays || 0,
        estimatedCost: currentTotals.totalCost,
        estimatedProfitPercent: currentTotals.totalCost > 0 ? ((currentTotals.total - currentTotals.totalCost) / currentTotals.totalCost) * 100 : 0,
        companyInfo: user?.user_metadata?.companyInfo || {},
        paymentTerms: paymentTerms || [],
        categoryCommitments: user?.user_metadata?.categoryCommitments || {},
        tilingWorkTypes: tilingWorkTypes, // New state
        tiling_items: userTilingItems, // ✅ Use snake_case for database column
      };

      let savedQuote;
      if (existingQuoteId) { // Renamed from editingQuoteId
        savedQuote = await Quote.update(existingQuoteId, quoteDataToSave); // Renamed from editingQuoteId
        setQuoteData(prev => ({...prev, ...quoteDataToSave, id: existingQuoteId})); // Renamed from editingQuoteId
      } else {
        if (user?.email) {
            quoteDataToSave.created_by = user.email;
        }
        savedQuote = await Quote.create(quoteDataToSave);
        setQuoteData(prev => ({...prev, ...quoteDataToSave, id: savedQuote.id}));
      }

      toast({
        title: isDraft ? "הצעה נשמרה כטיוטה" : "הצעה נשלחה בהצלחה",
        description: `הצעת המחיר "${projectInfo.projectName || 'ללא שם'}" ${isDraft ? 'נשמרה' : 'נשלחה'} בהצלחה.`,
      });

      // If not a draft, show share dialog instead of immediate redirect
      if (!isDraft) {
        setSavedQuoteId(savedQuote?.id || existingQuoteId);
        setShowShareDialog(true);
      } else {
        // For drafts, navigate immediately
        setTimeout(() => {
          navigate(createPageUrl('SentQuotes'));
        }, 500);
      }

    } catch (error) {
      console.error("Error saving quote:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת ההצעה",
        description: error.message || "אירעה שגיאה בשמירת ההצעה. נסה שוב.",
      });
    } finally {
      setIsLoadingUser(false); // Renamed from setIsLoading
    }
  }, [
    currentUser, projectInfo, existingQuoteId, totals, selectedItems, categoryTimings, // Renamed user to currentUser, editingQuoteId to existingQuoteId
    projectComplexities, priceIncrease, discountPercent, paymentTerms, navigate, toast, // Renamed discount to discountPercent
    setQuoteData, setIsLoadingUser, tilingWorkTypes, userTilingItems, setSavedQuoteId, setShowShareDialog // Renamed setIsSaving to setIsLoadingUser, added new states
  ]);

  const handleSaveQuote = async (isDraft = false) => {
    // Save current step data first
    if (currentStep === 3) {
      await saveItemsFromCurrentStep();
    }

    if (selectedItems.length === 0 && !isDraft) {
      alert("לא ניתן לשלוח הצעת מחיר ללא פריטים. אנא הוסף פריטים או שמור כטיוטה.");
      return;
    }

    if (!isDraft) {
        const { total, totalCost } = totals;

        const needsProfitGuard = triggerProfitGuard(total, totalCost);

        if (needsProfitGuard) {
            return;
        }
    }

    await proceedWithSave(isDraft);
  };

  // פונקציות להתמודדות עם החלטות ה-ProfitGuard
  const handleAcceptRecommendedPrice = useCallback(() => {
    if (profitGuardData) {
        closeProfitGuard();

        const currentTotalBeforeGlobalAdjustments = selectedItems.reduce((sum, item) => item.basePrice + sum, 0) +
                                                    (projectComplexities?.additionalCostDetails || []).reduce((sum, cost) => sum + (cost.cost || 0), 0);

        if (currentTotalBeforeGlobalAdjustments > 0) {
            const desiredAdjustmentFactor = profitGuardData.recommendedPrice / currentTotalBeforeGlobalAdjustments;

            const newDiscount = (1 - desiredAdjustmentFactor) * 100;
            setDiscountPercent(Math.max(0, newDiscount)); // Using setDiscountPercent
            setPriceIncrease(0);
        } else {
            setDiscountPercent(0); // Using setDiscountPercent
            setPriceIncrease(0);
        }

        setTimeout(() => {
            proceedWithSave(false);
        }, 100);
    }
  }, [profitGuardData, closeProfitGuard, proceedWithSave, selectedItems, projectComplexities, setDiscountPercent]); // Dependency: setDiscountPercent

  const handleKeepOriginalPrice = useCallback(() => {
    closeProfitGuard();

    setTimeout(() => {
        proceedWithSave(false);
    }, 100);
  }, [closeProfitGuard, proceedWithSave]);

  const handleCancelProfitGuard = useCallback(() => {
    closeProfitGuard();
  }, [closeProfitGuard]);


  const getQuoteDataForPreview = () => {
    const { total, profitPercent } = totals;
    const projectAdditionalCosts = totals.projectAdditionalCosts;
    const totalCost = totals.totalCost;

    const clonedItems = JSON.parse(JSON.stringify(selectedItems || []));

    const enhanceManualItems = (items) => {
      const HOURS_PER_DAY = 8; // Define HOURS_PER_DAY here
      return items.map((it) => {
        if (!(it && it.source === "manual_calc")) return it;
        if (Array.isArray(it.detailedBreakdown) && it.detailedBreakdown.length > 0) return it;

        const snap = it.manualFormSnapshot || it.manualMeta || {};
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
        const wallsArea = Number(snap?.walls?.area ?? snap?.wallsArea ?? 0) || 0;
        const ceilingArea = Number(snap?.ceiling?.area ?? snap?.ceilingArea ?? 0) || 0;
        const wallsType = (snap?.walls?.manualType ?? snap?.wallsType ?? "");
        const ceilingType = (snap?.ceiling?.manualType ?? snap?.ceilingType ?? "");
        const wallLayers = Number(snap?.walls?.layers ?? snap?.wallsLayers ?? 0) || 0;
        const ceilingLayers = Number(snap?.ceiling?.layers ?? snap?.ceilingLayers ?? 0) || 0;

        const totalPrice = Number(it.totalPrice) || 0;
        const totalArea = (wallsEnabled ? wallsArea : 0) + (ceilingEnabled ? ceilingArea : 0);
        let priceWalls = 0, priceCeiling = 0;
        if (totalArea > 0) {
          priceWalls = wallsEnabled ? Math.round(totalPrice * (wallsArea / totalArea)) : 0;
          priceCeiling = ceilingEnabled ? (totalPrice - priceWalls) : 0;
        } else {
          if (wallsEnabled && !ceilingEnabled) priceWalls = totalPrice;
          if (!wallsEnabled && ceilingEnabled) priceCeiling = totalPrice;
        }

        const breakdown = [];
        if (wallsEnabled && wallsArea > 0) {
          breakdown.push({
            name: "קירות",
            wallsArea,
            includeCeiling: false,
            withCeiling: false,
            ceilingArea: 0,
            paintWallsName: wallsType || "",
            wallLayers,
            price: priceWalls,
            sellingPrice: priceWalls,
            metrics: { totalSellingPrice: priceWalls },
          });
        }
        if (ceilingEnabled && ceilingArea > 0) {
          breakdown.push({
            name: "תקרה",
            wallsArea: 0,
            includeCeiling: true,
            withCeiling: true,
            ceilingArea,
            ceilingPaintName: ceilingType || "",
            ceilingLayers,
            price: priceCeiling,
            sellingPrice: priceCeiling,
            metrics: { totalSellingPrice: priceCeiling },
          });
        }

        return {
          ...it,
          detailedBreakdown: breakdown,
        };
      });
    };

    const previewItems = enhanceManualItems(clonedItems);

    const workforceData = {};
    const categoriesWithItems = (userCategories.length ? userCategories : AVAILABLE_CATEGORIES).filter(category =>
      previewItems.some(item => item.categoryId === category.id)
    );

    categoriesWithItems.forEach(category => {
      const categoryItems = previewItems.filter(item => item.categoryId === category.id);
      const timings = categoryTimings[category.id];

      if (timings && timings.startDate && timings.endDate && categoryItems.length > 0) {
        const totalWorkDaysNeeded = categoryItems.reduce((sum, item) => sum + (Number(item.workDuration) || 0), 0);
        const availableWorkDays = calculateWorkingDays(timings.startDate, timings.endDate);
        const workersNeeded = availableWorkDays > 0 ? Math.ceil(totalWorkDaysNeeded / availableWorkDays) : 0;

        workforceData[category.id] = {
          categoryName: category.name,
          startDate: timings.startDate,
          endDate: timings.endDate,
          availableWorkDays,
          totalWorkDaysNeeded,
          workersNeeded
        };
      }
    });

    const estimatedWorkDaysFromForm = Number(projectInfo.workDays) || 0;

    return {
      ...projectInfo,
      items: previewItems,
      categoryTimings,
      projectComplexities: {
        ...projectComplexities,
        additionalCostDetails: projectComplexities?.additionalCostDetails || [],
        totalAdditionalCost: projectAdditionalCosts
      },
      totalAmount: totals.baseAmount, // Using existing totals structure
      discount: discountPercent, // Using discountPercent
      priceIncrease: priceIncrease,
      finalAmount: total,
      estimatedWorkDays: estimatedWorkDaysFromForm,
      estimatedCost: totalCost,
      estimatedProfitPercent: parseFloat(profitPercent),
      companyInfo: {
        ...(user?.user_metadata?.companyInfo || {}),
        contractorCommitments: user?.user_metadata?.contractorCommitments || '',
        clientCommitments: user?.user_metadata?.clientCommitments || ''
      },
      paymentTerms: paymentTerms,
      categoryCommitments: user?.user_metadata?.categoryCommitments || {},
      created_date: new Date().toISOString(),
      quoteNumber: existingQuoteId ? `QUOTE-${existingQuoteId}` : 'PREVIEW', // Renamed from editingQuoteId
      generalStartDate: projectInfo.generalStartDate,
      workDays: projectInfo.workDays,
      generalEndDate: projectInfo.generalEndDate,
    };
  };

  const getStepStatus = (step) => {
    if (step === currentStep) return 'current';

    switch (step) {
      case 1:
        if (!projectInfo.clientName && !projectInfo.projectAddress && !projectInfo.projectName && !projectInfo.clientEmail) {
          return 'neutral';
        }

        const hasBasicInfo = projectInfo.clientName && projectInfo.projectAddress;
        if (hasBasicInfo) return 'completed';
        return 'incomplete';

      case 2:
        if (selectedCategories.length === 0 && currentStep < 2) return 'neutral';
        if (selectedCategories.length === 0) return 'incomplete';
        return 'completed';

      case 3:
        if (currentStep < 3) return 'neutral';
        if (currentStep > 3) {
          if (selectedItems.length === 0) return 'incomplete';
          const categoriesWithItems = [...new Set(selectedItems.map(item => item.categoryId))];
          const allCategoriesHaveItems = selectedCategories.every(catId =>
            categoriesWithItems.includes(catId)
          );
          if (allCategoriesHaveItems) return 'completed';
          return 'partial';
        }
        return 'neutral';

      case 4:
        if (currentStep < 4) return 'neutral';
        const hasAdditionalCosts = projectComplexities?.additionalCostDetails &&
          Array.isArray(projectComplexities.additionalCostDetails) &&
          projectComplexities.additionalCostDetails.some(cost => (cost.cost || 0) > 0 || (cost.contractorCost || 0) > 0);

        if (hasAdditionalCosts) return 'completed';
        return 'neutral';

      case 5:
        if (currentStep < 5) return 'neutral';
        if (selectedItems.length === 0) return 'incomplete';
        return 'completed';

      default:
        return 'neutral';
    }
  };

  const saveItemsFromCurrentStep = useCallback(async () => {
    if (currentStep === 3) {
      // Save current category data via ItemSelector ref
      if (itemSelectorRef.current && typeof itemSelectorRef.current.saveCurrentCategoryData === 'function') {
        console.log('[QuoteCreate] Saving Step 3 data before navigation');
        try {
          await itemSelectorRef.current.saveCurrentCategoryData();
          console.log('[QuoteCreate] Step 3 data saved successfully');
        } catch (error) {
          console.error('[QuoteCreate] Error saving Step 3 data:', error);
        }
      }
    }
  }, [currentStep]);

  const navigateToStep = async (targetStep) => {
    // Save current step data before navigating
    if (currentStep === 3) {
      await saveItemsFromCurrentStep();
    }

    if (targetStep === 3) {
      if (selectedCategories.length > 0) {
        if (!currentCategoryForItems || !selectedCategories.includes(currentCategoryForItems)) {
          setCurrentCategoryForItems(selectedCategories[0]);
        }
      } else {
        setCurrentCategoryForItems(null);
      }
    }

    setCurrentStep(targetStep);

    setTimeout(() => {
      if (targetStep !== 3) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  if (isLoadingUser) { // Using isLoadingUser
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="ml-2">טוען נתונים...</p>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="shadow-lg">
            <CardHeader className="bg-gray-50/50 border-b">
              <CardTitle className="text-xl font-semibold text-gray-800">פרטי פרויקט ולקוח</CardTitle>
              <CardDescription className="text-gray-600">הזן את המידע הבסיסי על הפרויקט והלקוח.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="clientName" className="flex items-center text-sm font-medium text-gray-700">
                    <UserIcon className="w-4 h-4 mr-2 text-indigo-600" />
                    שם הלקוח
                  </Label>
                  <Input
                    id="clientName"
                    value={projectInfo.clientName}
                    onChange={(e) => handleProjectInfoChange('clientName', e.target.value)}
                    placeholder="הזן את שם הלקוח"
                    className="text-sm h-9"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="projectAddress" className="flex items-center text-sm font-medium text-gray-700">
                    <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
                    כתובת הפרויקט
                  </Label>
                  <Input
                    id="projectAddress"
                    value={projectInfo.projectAddress}
                    onChange={(e) => handleProjectInfoChange('projectAddress', e.target.value)}
                    placeholder="הזן את כתובת הפרויקט"
                    className="text-sm h-9"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="clientEmail" className="flex items-center text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4 mr-2 text-indigo-600" />
                    אימייל הלקוח
                  </Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={projectInfo.clientEmail}
                    onChange={(e) => handleProjectInfoChange('clientEmail', e.target.value)}
                    className="text-sm h-9"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="clientPhone" className="flex items-center text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4 mr-2 text-indigo-600" />
                    טלפון הלקוח
                  </Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={projectInfo.clientPhone}
                    onChange={(e) => handleProjectInfoChange('clientPhone', e.target.value)}
                    className="text-sm h-9"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="projectName" className="flex items-center text-sm font-medium text-gray-700">
                    <Briefcase className="w-4 h-4 mr-2 text-indigo-600" />
                    שם הפרויקט
                  </Label>
                  <Input
                    id="projectName"
                    value={projectInfo.projectName}
                    onChange={(e) => handleProjectInfoChange('projectName', e.target.value)}
                    placeholder="לדוגמה: שיפוץ דירת 4 חדרים ברמת גן"
                    className="text-sm h-9"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="projectType" className="flex items-center text-sm font-medium text-gray-700">
                    <HomeIconProp className="w-4 h-4 mr-2 text-indigo-600" />
                    סוג הנכס
                  </Label>
                  <Select
                    value={projectInfo.projectType}
                    onValueChange={(value) => handleProjectInfoChange('projectType', value)}
                  >
                    <SelectTrigger id="projectType" className="text-sm h-9" dir="rtl" >
                      <SelectValue placeholder="בחר סוג נכס" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">                      <SelectItem value="דירה">דירה</SelectItem>
                      <SelectItem value="בית פרטי">בית פרטי</SelectItem>
                      <SelectItem value="משרד">משרד</SelectItem>
                      <SelectItem value="עסק">עסק</SelectItem>
                      <SelectItem value="אחר">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4 hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">לוח זמנים כללי לפרויקט</h3>
                    <p className="text-xs text-gray-500">תכנון ותזמון העבודות</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="generalStartDate" className="text-sm font-medium text-gray-700">
                      תאריך תחילת עבודה
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="generalStartDate"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-right font-normal h-10",
                            !projectInfo.generalStartDate
                              ? "border-red-300 bg-red-50/30 text-red-700 hover:bg-red-100"
                              : "border-green-300 bg-green-50/30 text-green-800 hover:bg-green-100"
                          )}
                        >
                          <CalendarDays className="ml-2 h-4 w-4" />
                          {projectInfo.generalStartDate
                            ? format(new Date(projectInfo.generalStartDate), 'd MMMM, yyyy', { locale: he })
                            : <span className="text-red-600 font-medium">בחר תאריך</span>
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={projectInfo.generalStartDate ? new Date(projectInfo.generalStartDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              handleProjectInfoChange('generalStartDate', format(date, 'yyyy-MM-dd'));
                            }
                          }}
                          initialFocus
                          dir="rtl"
                          locale={he}
                        />
                      </PopoverContent>
                    </Popover>
                    {!projectInfo.generalStartDate && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        נדרש לבחור תאריך
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="workDays" className="text-sm font-medium text-gray-700">
                      כמות ימי עבודה נטו
                    </Label>
                    <Input
                      id="workDays"
                      type="number"
                      min="0" // Changed min to 0 as default is 0
                      value={projectInfo.workDays}
                      onChange={(e) => handleProjectInfoChange('workDays', Number(e.target.value))} // Convert to Number
                      placeholder="הזן מספר ימים"
                      className={cn(
                        "text-sm h-10",
                        projectInfo.generalStartDate === null || projectInfo.workDays === 0 // Check for null and 0
                          ? "border-red-300 bg-red-50/30 text-red-700 placeholder:text-red-500"
                          : "border-green-300 bg-green-50/30 text-green-800"
                      )}
                      disabled={projectInfo.generalStartDate === null} // Check for null
                    />
                    <p className="text-xs text-gray-500">ימים בפועל (ללא שישי-שבת)</p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="generalEndDate" className="text-sm font-medium text-gray-700">
                      תאריך סיום משוער
                    </Label>
                    <div className="relative">
                      <Input
                        id="generalEndDate"
                        type="text"
                        value={projectInfo.generalEndDate ? format(new Date(projectInfo.generalEndDate), 'd MMMM, yyyy', { locale: he }) : ''}
                        className="text-sm h-10 bg-gray-50 border-gray-300 text-gray-700"
                        disabled
                        readOnly
                        placeholder="יחושב אוטומטית"
                      />
                      {projectInfo.generalEndDate && (
                        <CheckCircle className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">מחושב אוטומטית</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes" className="flex items-center text-sm font-medium text-gray-700">
                  <NotesIcon className="w-4 h-4 mr-2 text-indigo-600" />
                  הערות כלליות לפרויקט
                </Label>
                <Textarea
                  id="notes"
                  value={projectInfo.notes}
                  onChange={(e) => handleProjectInfoChange('notes', e.target.value)}
                  placeholder="הערות, דרישות מיוחדות, וכו'..."
                  className="text-sm min-h-[80px]"
                />
              </div>
            </CardContent>

            <CardFooter className="border-t p-4">
              <Button onClick={() => setCurrentStep(2)} className="ml-auto text-base px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700">
                הבא: בחירת קטגוריות
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card className="shadow-lg">
            <CardHeader className="bg-gray-50/50 border-b">
              <CardTitle className="text-xl font-semibold text-gray-800">בחירת קטגוריות לפי סדר העבודה</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CategorySelector
                categories={userCategories}
                selectedCategories={selectedCategories}
                onToggleCategory={toggleCategory}
                onMoveUp={moveCategoryUp}
                onMoveDown={moveCategoryDown}
              />
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="text-base px-6 py-2.5">
                <ArrowRight className="ml-2 h-4 w-4" />
                הקודם
              </Button>
              <Button onClick={() => {
                if (selectedCategories.length > 0) {
                  setProcessedCategories([]);
                  setCurrentCategoryForItems(selectedCategories[0]);
                  setCurrentStep(3);
                } else {
                  alert("אנא בחר לפחות קטגוריה אחת.");
                }
              }} className="text-base px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700">
                הבא: בחירת פריטים
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
      case 4:
        return (
          <AdditionalCostsForm
            projectComplexities={projectComplexities}
            onUpdateProjectComplexities={setProjectComplexities}
            onBack={async () => {
              await saveItemsFromCurrentStep();
              setCurrentStep(3);
            }}
            onNext={async () => {
              await saveItemsFromCurrentStep();
              setCurrentStep(5);
            }}
          />
        );
      case 5:
        const { total, profitPercent } = totals;
        const projectAdditionalCosts = totals.projectAdditionalCosts;
        const totalCost = totals.totalCost;

        const workDaysFromForm = Number(projectInfo.workDays) || 0;
        const actualProfit = total - totalCost;
        const dailyProfit = workDaysFromForm > 0 ? (actualProfit / workDaysFromForm) : 0;
        const desiredDailyProfit = user?.user_metadata?.desiredDailyProfit || 0;
        const dailyProfitDiff = desiredDailyProfit > 0 ? dailyProfit - desiredDailyProfit : 0;

        const missingProjectDates = projectInfo.generalStartDate === null || projectInfo.generalEndDate === null; // Check for null

        const categoriesWithoutDates = selectedCategories.filter(catId => {
          const timing = categoryTimings[catId];
          return !timing || !timing.startDate || !timing.endDate;
        });

        const hasMissingCategoryDates = categoriesWithoutDates.length > 0;

        return (
          <Card className="shadow-lg">
            <CardHeader className="bg-gray-50/50 border-b">
              <CardTitle className="text-xl font-semibold text-gray-800">סיכום סופי ואישור</CardTitle>
              <CardDescription className="text-gray-600">בדוק את המסמך, תכנן את הת payments ושלח ללקוח.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {(missingProjectDates || hasMissingCategoryDates) && (
                <div className="space-y-3">
                  {missingProjectDates && (
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-900 mb-1">
                            ⚠️ חסרים תאריכי פרויקט כלליים
                          </h4>
                          <p className="text-sm text-yellow-800 mb-2">
                            לא נבחרו תאריך התחלה וסיום כלליים לפרויקט.
                            <strong className="font-semibold"> לכן, תחזית התשלומים בגרף התזרים לא תהיה זמינה או מדויקת.</strong>
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentStep(1)}
                            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border-yellow-400"
                          >
                            <ArrowRight className="ml-2 h-4 w-4" />
                            חזור לשלב 'פרטי פרויקט' להשלמת תאריכים
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasMissingCategoryDates && (
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-orange-900 mb-1">
                            ⚠️ חסרים תאריכי עבודה לקטגוריות
                          </h4>
                          <p className="text-sm text-orange-800 mb-2">
                            {categoriesWithoutDates.length === 1
                              ? 'קטגוריה אחת חסרה תאריכי התחלה/סיום עבודה.'
                              : `${categoriesWithoutDates.length} קטגוריות חסרות תאריכי התחלה/סיום עבודה.`
                            }
                            {' '}
                            <strong className="font-semibold">הדבר ישפיע על דיוק תחזית ההוצאות בגרף התזרים.</strong>
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {categoriesWithoutDates.map(catId => {
                              const cat = (userCategories.length ? userCategories : AVAILABLE_CATEGORIES).find(c => c.id === catId);
                              return cat ? (
                                <Badge key={catId} variant="outline" className="bg-orange-100 text-orange-900 border-orange-300">
                                  {cat.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentStep(3)}
                            className="bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-400"
                          >
                            <ArrowRight className="ml-2 h-4 w-4" />
                            חזור לשלב 'פריטים' להגדרת תאריכי קטגוריות
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <QuotePreviewSnapshot
                projectInfo={projectInfo}
                totals={totals}
                selectedItems={selectedItems}
                companyInfo={{
                  ...(user?.user_metadata?.companyInfo || {}),
                  contractorCommitments: user?.user_metadata?.contractorCommitments || '',
                  clientCommitments: user?.user_metadata?.clientCommitments || ''
                }}
              />

              <div className="flex justify-center">
                <Button
                  onClick={() => setShowPreview(true)}
                  size="lg"
                  className="text-base px-10 py-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 font-semibold rounded-xl"
                >
                  <svg className="ml-3 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  הצג את המסמך המ מלא לפני שליחה
                </Button>
              </div>

              <Separator className="my-6" />

              {workDaysFromForm > 0 && (
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CalendarDays className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-emerald-900">רווח יומי ממוצע</h4>
                        <p className="text-sm text-emerald-700">
                          {workDaysFromForm} ימי עבודה נטו (ללא שישי-שבת)
                        </p>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-2xl font-bold text-emerald-900">
                        ₪ {dailyProfit.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-sm text-emerald-700">ליום עבודה</div>
                    </div>
                  </div>

                  {desiredDailyProfit > 0 && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-700">רווח יומי רצוי (יעד):</span>
                        <span className="font-medium text-emerald-800">
                          ₪ {desiredDailyProfit.toLocaleString('he-IL')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-emerald-700">פער מהיעד:</span>
                        <span className={cn(
                          "font-bold flex items-center gap-1",
                          dailyProfitDiff >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {dailyProfitDiff >= 0 ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              +₪ {Math.abs(dailyProfitDiff).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </>
                          ) : (
                            <>
                              <Info className="w-4 h-4" />
                              -₪ {Math.abs(dailyProfitDiff).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </>
                          )}
                        </span>
                      </div>
                      {dailyProfitDiff < 0 && (
                        <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          שקול להעלות את המחיר ללקוח או להפחית הנחה כדי להגיע ליעד הרווח היומי
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-6">
                <QuoteSummary
                  selectedItems={selectedItems}
                  projectComplexities={projectComplexities}
                  discount={discountPercent} // Pass discountPercent
                  onUpdateDiscount={setDiscountPercent} // Pass setDiscountPercent
                  priceIncrease={priceIncrease}
                  onUpdatePriceIncrease={setPriceIncrease}
                  categoryTimings={categoryTimings}
                  onRemoveItem={handleRemoveItemFromQuote}
                  paymentTerms={paymentTerms}
                />

                <ContractorCostBreakdown
                  selectedItems={selectedItems}
                  projectComplexities={projectComplexities}
                />

                <PaymentTermsEditor
                  terms={paymentTerms}
                  onUpdateTerms={setPaymentTerms}
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t p-6 flex-wrap gap-4 bg-gray-50/30">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(4)} className="text-base px-6 py-2.5">
                  <ArrowRight className="ml-2 h-4 w-4" />
                  הקודם
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {existingQuoteId ? ( // Renamed from editingQuoteId
                  <>
                    <Button
                      variant="outline"
                      onClick={() => navigate(createPageUrl('SentQuotes'))}
                      disabled={isLoadingUser} // Renamed from isSaving
                      className="text-base px-6 py-2.5"
                    >
                      סגור
                    </Button>

                    <Button
                      onClick={() => handleSaveQuote(false)}
                      disabled={isLoadingUser} // Renamed from isSaving
                      className="bg-green-600 hover:bg-green-700 text-base px-6 py-2.5"
                    >
                      {isLoadingUser ? <Loader2 className="animate-spin ml-2" /> : <Send className="ml-2 h-4 w-4" />}
                      עדכן ושלח
                    </Button>

                    {quoteData?.status === 'טיוטה' && (
                      <Button
                        variant="secondary"
                        onClick={() => handleSaveQuote(true)}
                        disabled={isLoadingUser} // Renamed from isSaving
                        className="text-base px-6 py-2.5"
                      >
                        {isLoadingUser ? <Loader2 className="animate-spin ml-2" /> : <Edit className="ml-2 h-4 w-4" />}
                        שמור כטיוטה
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => handleSaveQuote(true)}
                      disabled={isLoadingUser} // Renamed from isSaving
                      className="text-base px-6 py-2.5"
                    >
                      {isLoadingUser ? <Loader2 className="animate-spin ml-2" /> : <Edit className="ml-2 h-4 w-4" />}
                      שמור כטיוטה
                    </Button>

                    <Button
                      onClick={() => handleSaveQuote(false)}
                      disabled={isLoadingUser} // Renamed from isSaving
                      className="bg-green-600 hover:bg-green-700 text-white text-base px-6 py-2.5"
                    >
                      {isLoadingUser ? <Loader2 className="animate-spin ml-2" /> : <Send className="ml-2 h-4 w-4" />}
                      שמור ושלח
                    </Button>
                  </>
                )}
              </div>
            </CardFooter>
          </Card>
        );

      default:
        return null;
    }
  };

  const steps = [
    { step: 1, title: "פרטי פרויקט" },
    { step: 2, title: "קטגוריות" },
    { step: 3, title: "פריטים" },
    { step: 4, title: "עלויות נוספות" },
    { step: 5, title: "סיכום ואישור" }
  ];


  return (
    <div dir="rtl" id="quote-create-root">
      <HebrewLabelPatcher containerSelector="#quote-create-root" />
      <ManualCalcInjector containerSelector="#quote-create-root" />
      <ManualCalcDialog />

      <div className="fixed top-16 left-0 right-0 h-72 bg-gray-50 z-30"></div>

      <div className="fixed top-28 left-4 right-4 z-40">
        <div className="container mx-auto max-w-7xl">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl rounded-2xl p-6 border border-gray-700">
            <h1 className="text-3xl font-bold tracking-tight">
              {existingQuoteId ? 'עריכת הצעת מחיר' : 'יצירת הצעת מחיר חדשה'} {/* Renamed from editingQuoteId */}
            </h1>
            <p className="text-gray-300 text-lg mt-2">
              {existingQuoteId
                ? 'עדכן את פרטי ההצעה הקיימת לפי הצורך.'
                : 'עבור על השלבים כדי להרכיב הצעת מחיר מפורטת ומקצועית ללקוח שלך.'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="fixed left-4 right-4 z-40" style={{ top: '270px' }}>
        <div className="container mx-auto max-w-7xl">
          <div className="p-1 bg-gray-100 rounded-xl flex items-center justify-between gap-1 shadow-inner">
            {steps.map(({ step, title }) => {
              const stepStatus = getStepStatus(step);
              const isCurrentStep = currentStep === step;

              let statusClasses = '';
              let statusIcon = null;
              let indicatorClasses = '';

              if (isCurrentStep) {
                statusClasses = 'bg-indigo-600 text-white shadow-lg';
                indicatorClasses = 'bg-indigo-600';
              } else {
                switch (stepStatus) {
                  case 'completed':
                    statusClasses = 'text-green-700 hover:bg-green-50 cursor-pointer hover:shadow-sm';
                    statusIcon = <CheckCircle className="w-5 h-5 text-green-500" />;
                    break;
                  case 'partial':
                    statusClasses = 'text-orange-700 hover:bg-orange-50 cursor-pointer hover:shadow-sm';
                    statusIcon = <AlertCircle className="w-5 h-5 text-orange-500" />;
                    break;
                  case 'incomplete':
                    statusClasses = 'text-red-700 hover:bg-red-50 cursor-pointer hover:shadow-sm';
                    statusIcon = <X className="w-5 h-5 text-red-500" />;
                    break;
                  case 'neutral':
                    statusClasses = 'text-gray-500 hover:bg-gray-50 cursor-pointer hover:shadow-sm';
                    statusIcon = <span className="w-5 h-5 flex items-center justify-center text-xs font-semibold text-gray-400">{step}</span>;
                    break;
                  default:
                    statusClasses = 'text-gray-400 hover:bg-gray-50 cursor-pointer';
                    statusIcon = <span className="w-5 h-5 flex items-center justify-center text-xs font-semibold">{step}</span>;
                }
              }

              return (
                <button
                  key={step}
                  onClick={() => navigateToStep(step)}
                  className={cn(
                    "relative w-full rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500",
                    "flex flex-col items-center justify-center",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    isCurrentStep ? "bg-indigo-600 text-white" : statusClasses
                  )}
                >
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    {isCurrentStep ? (
                      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold">{step}</span>
                    ) : (
                      statusIcon
                    )}
                    <span className="relative z-10 hidden sm:inline">{title}</span>
                  </div>

                  {isCurrentStep && (
                    <motion.div
                      className={cn("absolute inset-0 rounded-lg z-0", indicatorClasses)}
                      layoutId="step-indicator"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 block sm:hidden text-xs mt-1">{title}</span>

                  {!isCurrentStep && (
                    <div className={cn(
                      "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white z-20",
                      stepStatus === 'completed' && 'bg-green-500',
                      stepStatus === 'partial' && 'bg-orange-500',
                      stepStatus === 'incomplete' && 'bg-red-500',
                      stepStatus === 'neutral' && 'bg-gray-300'
                    )}></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-8 max-w-7xl relative pb-24" style={{ marginTop: '315px' }}>
        <div className="h-1 md:h-2"></div>

        {currentStep === 2 && selectedCategories.length > 0 && (
          <div className="sticky top-[315px] z-30 bg-white/95 backdrop-blur-sm shadow-md rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">קטגוריות שנבחרו:</span>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                {selectedCategories.length} {selectedCategories.length === 1 ? 'קטגוריה' : 'קטגוריות'}
              </Badge>
            </div>
            <CategoryStepper
              categories={getOrderedSelectedCategories()}
              currentId={null}
              onSelect={(catId) => {
                toggleCategory(catId);
              }}
            />
          </div>
        )}

        {currentStep === 3 && selectedCategories.length > 0 && (
          <div className="sticky top-[315px] z-30 bg-white/95 backdrop-blur-sm shadow-md rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">מעבר בין קטגוריות:</span>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                {selectedCategories.length} {selectedCategories.length === 1 ? 'קטגוריה' : 'קטגוריות'}
              </Badge>
            </div>
            <CategoryStepper
              categories={getOrderedSelectedCategories()}
              currentId={currentCategoryForItems}
              onSelect={async (catId) => {
                // ✅ Save current category data before switching
                if (itemSelectorRef.current && itemSelectorRef.current.saveCurrentCategoryData) {
                  await itemSelectorRef.current.saveCurrentCategoryData();
                }
                setCurrentCategoryForItems(catId);
              }}
            />
          </div>
        )}

        {currentStep !== 3 && (
          <AnimatePresence mode="wait">
            <ErrorBoundary title="שגיאה בתצוגת השלב" debug={true}>
              <motion.div
                key={`step-${currentStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-full mx-auto"
              >
                {renderStepContent()}
              </motion.div>
            </ErrorBoundary>
          </AnimatePresence>
        )}

        <PersistedStep3
          visible={currentStep === 3}
          userCategories={userCategories}
          selectedCategories={selectedCategories}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          currentCategoryForItems={currentCategoryForItems}
          setCurrentCategoryForItems={setCurrentCategoryForItems}
          processedCategories={processedCategories}
          setProcessedCategories={setProcessedCategories}
          categoryTimings={categoryTimings}
          onCategoryTimingChange={handleCategoryTimingChange}
          onAddItemToQuote={handleAddItemToQuote}
          onProceedToAdditionalCosts={async () => {
            await saveItemsFromCurrentStep();
            setCurrentStep(4);
          }}
          projectComplexities={projectComplexities}
          onUpdateRoomBreakdown={handleUpdateRoomBreakdown}
          generalStartDate={projectInfo.generalStartDate}
          generalEndDate={projectInfo.generalEndDate}
          tilingWorkTypes={tilingWorkTypes}
          userTilingItems={userTilingItems}
          user={user}
          stagedManualItems={stagedManualItems}
          setStagedManualItems={setStagedManualItems}
          itemSelectorRef={itemSelectorRef}
        />

        <FloatingCart
            items={selectedItems}
            totals={totals}
            onRemoveItem={handleRemoveItemFromQuote}
            onGoToSummary={() => navigateToStep(5)}
            projectComplexities={projectComplexities}
            onUpdateItem={handleUpdateItemInQuote}
        />

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-medium">תצוגה מקדימה של הצעת המחיר</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <QuoteToHTML quote={getQuoteDataForPreview()} />
                </div>
                <div className="p-4 border-t flex justify-end">
                    <Button onClick={() => setShowPreview(false)}>סגור</Button>
                </div>
          </DialogContent>
      </Dialog>

      {showProfitGuard && profitGuardData && (
        <ProfitGuard
          currentProfitPercent={profitGuardData.currentProfitPercent}
          currentTotalPrice={profitGuardData.currentTotalPrice}
          recommendedPrice={profitGuardData.recommendedPrice}
          minimumProfitPercent={30}
          onAcceptRecommended={handleAcceptRecommendedPrice}
          onKeepOriginal={handleKeepOriginalPrice}
          onCancel={handleCancelProfitGuard}
        />
      )}

      </div>

      {showItemsDebug && currentStep === 3 && (
        <ItemsDebugPanel
          selectedCategories={selectedCategories}
          currentCategoryForItems={currentCategoryForItems}
          effectiveCategoryId={selectedCategories.includes(currentCategoryForItems) ? currentCategoryForItems : (selectedCategories[0] || null)}
          categories={userCategories.length ? userCategories : AVAILABLE_CATEGORIES}
          selectedItems={selectedItems}
          processedCategories={processedCategories}
          categoryTimings={categoryTimings}
          currentStep={currentStep}
          currentCategoryItemsCount={selectedItems.filter(it => it.categoryId === (selectedCategories.includes(currentCategoryForItems) ? currentCategoryForItems : (selectedCategories[0] || null))).length}
          totalItemsCount={selectedItems.length}
          onSelectCategory={setCurrentCategoryForItems}
          onClose={() => setShowItemsDebug(false)}
        />
      )}

      {/* Share Quote Dialog */}
      <ShareQuoteDialog
        open={showShareDialog}
        onOpenChange={(open) => {
          setShowShareDialog(open);
          // Navigate to SentQuotes when dialog closes
          if (!open) {
            navigate(createPageUrl('SentQuotes'));
          }
        }}
        quoteId={savedQuoteId}
        quoteData={projectInfo}
      />
    </div>
  );
}
