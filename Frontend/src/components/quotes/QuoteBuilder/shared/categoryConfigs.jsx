/**
 * Category Configurations
 *
 * Centralized configuration for all quote builder categories
 * Preserves all designs, colors, labels, and calculation logic
 * File size: ~250 lines - Small, maintainable, single source of truth
 */

// =============================================================================
// ELECTRICAL CATEGORY (חשמל)
// =============================================================================
export const electricalConfig = {
  id: 'electrical',
  name: 'חשמל',
  nameHe: 'חשמל',
  icon: 'lightbulb',

  // UI Colors & Styling (EXACT preservation)
  colors: {
    primary: 'yellow',
    bgLight: 'bg-yellow-50',
    bgMedium: 'bg-yellow-100',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    textDark: 'text-yellow-900',
    buttonBg: 'bg-yellow-600',
    buttonHover: 'hover:bg-yellow-700',
  },

  // Dialog Settings
  dialog: {
    title: 'עריכת פריט חשמל',
    titleNew: 'הוספת פריט חשמל',
    description: 'עדכן את פרטי הפריט',
    maxWidth: 'sm:max-w-[500px]',
  },

  // Form Fields Configuration
  fields: {
    showName: false,  // Item name comes from catalog
    showDescription: false,
    showQuantity: true,
    showUnit: false,  // Unit is fixed
    showContractorCost: true,
    showHoursPerUnit: false,
    showMaterialCost: false,
  },

  // Default Values
  defaults: {
    profitPercent: 40,
    unit: 'יחידה',
    initialQuantity: 1,
  },

  // Calculation Rules
  calculations: {
    useQuantityInTotal: true,
    roundToInteger: true,
  },

  // Summary Card Order & Labels
  summary: {
    order: ['client', 'contractor', 'profit'],
    labels: {
      client: 'מחיר ללקוח',
      contractor: 'עלות קבלן',
      profit: 'רווח',
    },
  },
};

// =============================================================================
// PLUMBING CATEGORY (אינסטלציה)
// =============================================================================
export const plumbingConfig = {
  id: 'plumbing',
  name: 'אינסטלציה',
  nameHe: 'אינסטלציה',
  icon: 'wrench',

  colors: {
    primary: 'teal',
    bgLight: 'bg-teal-50',
    bgMedium: 'bg-teal-100',
    border: 'border-teal-200',
    text: 'text-teal-700',
    textDark: 'text-teal-900',
    buttonBg: 'bg-teal-600',
    buttonHover: 'hover:bg-teal-700',
  },

  dialog: {
    title: 'פריט אינסטלציה ידני',
    titleNew: 'הוספת פריט אינסטלציה',
    description: 'מלא את נתוני הפריט. מחיר הלקוח יחושב אוטומטית לפי עלות קבלן + אחוז רווח.',
    maxWidth: 'sm:max-w-[420px]',
  },

  fields: {
    showName: true,  // Manual item - name required
    showDescription: true,
    showQuantity: true,
    showUnit: false,  // Unit fixed to 'יחידה'
    showContractorCost: true,
    showHoursPerUnit: false,
    showMaterialCost: false,
  },

  defaults: {
    profitPercent: 30,
    unit: 'יחידה',
    initialQuantity: 1,
    subCategory: 'infrastructure',
  },

  calculations: {
    useQuantityInTotal: true,
    roundToInteger: true,
    ignoreQuantity: true,  // Special flag for plumbing
  },

  summary: {
    order: ['profit', 'contractor', 'client'],
    labels: {
      client: 'מחיר ללקוח',
      contractor: 'עלות קבלן',
      profit: 'רווח',
    },
  },
};

// =============================================================================
// DEMOLITION CATEGORY (הריסות)
// =============================================================================
export const demolitionConfig = {
  id: 'demolition',
  name: 'הריסות',
  nameHe: 'הריסות',
  icon: 'trash',

  colors: {
    primary: 'rose',
    bgLight: 'bg-rose-50',
    bgMedium: 'bg-rose-100',
    border: 'border-rose-200',
    text: 'text-rose-700',
    textDark: 'text-rose-900',
    buttonBg: 'bg-gradient-to-r from-rose-500 to-pink-600',
    buttonHover: 'hover:from-rose-600 hover:to-pink-700',
  },

  dialog: {
    title: 'עריכת פריט הריסה',
    titleNew: 'הוספת פריט הריסה חדש',
    description: 'מלא את נתוני הפריט. הכמות לא תשנה את המחיר הכולל.',
    maxWidth: 'max-w-lg',
    // Custom styling - uses fixed inset dialog
    useCustomDialog: true,
  },

  fields: {
    showName: true,
    showDescription: true,
    showQuantity: true,
    showUnit: false,  // Unit fixed to 'יחידה'
    showContractorCost: false,  // Calculated from hours
    showHoursPerUnit: true,  // Main input
    showMaterialCost: false,
  },

  defaults: {
    profitPercent: 30,
    unit: 'יחידה',
    initialQuantity: 1,
    subCategory: 'general',
    laborCostPerDay: 1000,
    hoursPerDay: 8,
  },

  calculations: {
    useQuantityInTotal: false,  // Quantity doesn't affect price!
    roundToInteger: true,
    calculateFromHours: true,  // Uses hours × labor rate
  },

  summary: {
    order: ['client', 'profit', 'contractor'],
    labels: {
      client: 'מחיר ללקוח',
      contractor: 'עלות קבלן',
      profit: 'רווח',
    },
  },
};

// =============================================================================
// CONSTRUCTION CATEGORY (בנייה)
// =============================================================================
export const constructionConfig = {
  id: 'construction',
  name: 'בנייה',
  nameHe: 'בנייה',
  icon: 'construction',

  colors: {
    primary: 'indigo',
    bgLight: 'bg-indigo-50',
    bgMedium: 'bg-indigo-100',
    border: 'border-indigo-100',
    text: 'text-indigo-700',
    textDark: 'text-indigo-900',
    buttonBg: 'bg-indigo-600',
    buttonHover: 'hover:bg-indigo-700',
  },

  dialog: {
    title: 'הוספת פריט לבינוי',
    titlePreset: 'הוספת פריט מהמחירון',
    description: 'מלא/י את פרטי הפריט ולאשר להוספה להצעה.',
    maxWidth: 'max-w-xl',
  },

  fields: {
    showName: true,
    showDescription: true,
    showQuantity: true,
    showUnit: true,  // With dropdown selection
    showContractorCost: false,  // Calculated
    showHoursPerUnit: true,
    showMaterialCost: true,
    showClientPriceOverride: true,  // Allow manual price override
  },

  defaults: {
    profitPercent: 30,
    unit: 'יחידה',
    initialQuantity: 1,
    laborCostPerDay: 1000,
    hoursPerDay: 8,
  },

  unitOptions: [
    { value: 'יחידה', label: 'יחידה' },
    { value: 'מ״ר', label: 'מ"ר' },
    { value: 'מ״ק', label: 'מ"ק' },
    { value: 'מטר רץ', label: 'מטר רץ' },
    { value: 'קומפלט', label: 'קומפלט' },
  ],

  calculations: {
    useQuantityInTotal: true,
    roundToInteger: true,
    calculateLaborFromHours: true,
    includeMaterialCost: true,
    allowPriceOverride: true,
  },

  summary: {
    order: ['client', 'contractor', 'profit', 'workDays'],
    labels: {
      client: 'מחיר ללקוח (סה״כ)',
      contractor: 'עלות קבלן (סה״כ)',
      profit: 'רווח קבלן',
      workDays: 'ימי עבודה',
    },
    colors: {
      client: 'blue',
      contractor: 'red',
      profit: 'green',
      workDays: 'amber',
    },
  },
};

// =============================================================================
// TILING CATEGORY (ריצוף וחיפוי)
// =============================================================================
export const tilingConfig = {
  id: 'tiling',
  name: 'ריצוף וחיפוי',
  nameHe: 'ריצוף וחיפוי',
  icon: 'grid',

  colors: {
    primary: 'orange',
    bgLight: 'bg-orange-50',
    bgMedium: 'bg-orange-100',
    border: 'border-orange-200',
    text: 'text-orange-700',
    textDark: 'text-orange-900',
    buttonBg: 'bg-orange-600',
    buttonHover: 'hover:bg-orange-700',
  },

  dialog: {
    title: 'הוספת פריט ריצוף וחיפוי ידני',
    titleNew: 'הוספת פריט ריצוף וחיפוי',
    description: 'מלא את נתוני הפריט. מחיר הלקוח יחושב אוטומטית לפי עלות קבלן + אחוז רווח.',
    maxWidth: 'sm:max-w-[420px]',
  },

  fields: {
    showName: true,  // Manual item - name required
    showDescription: true,
    showQuantity: true,
    showUnit: false,  // Unit fixed to 'מ"ר'
    showContractorCost: true,
    showHoursPerUnit: false,
    showMaterialCost: false,
  },

  defaults: {
    profitPercent: 30,
    unit: 'מ"ר',
    initialQuantity: 1,
    subCategory: 'tiling',
  },

  calculations: {
    useQuantityInTotal: true,
    roundToInteger: true,
    ignoreQuantity: false,
  },

  summary: {
    order: ['profit', 'contractor', 'client'],
    labels: {
      client: 'מחיר ללקוח',
      contractor: 'עלות קבלן',
      profit: 'רווח',
    },
  },
};

// =============================================================================
// ALL CONFIGS EXPORT
// =============================================================================
export const categoryConfigs = {
  electrical: electricalConfig,
  plumbing: plumbingConfig,
  demolition: demolitionConfig,
  construction: constructionConfig,
  tiling: tilingConfig,
};

// Helper function to get config by category ID
export const getCategoryConfig = (categoryId) => {
  return categoryConfigs[categoryId] || electricalConfig; // Fallback to electrical
};

// Helper function to get button classes
export const getButtonClasses = (config) => {
  return `${config.colors.buttonBg} ${config.colors.buttonHover} transition-all shadow-sm`;
};

// Helper function to get summary card classes
export const getSummaryCardClasses = (type, config) => {
  const colorMap = config.summary.colors || {
    client: 'blue',
    contractor: 'red',
    profit: 'green',
    workDays: 'amber',
  };

  const color = colorMap[type] || 'blue';

  return {
    wrapper: `bg-${color}-50 border border-${color}-200 rounded-lg p-2 text-center`,
    label: `text-xs text-${color}-700`,
    value: `text-sm font-bold text-${color}-900`,
  };
};
