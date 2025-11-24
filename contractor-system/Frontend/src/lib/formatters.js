/**
 * Formatters - פונקציות פורמט מרכזיות למערכת
 *
 * פונקציות אלו מספקות פורמט אחיד למספרים, מחירים וכמויות
 * עם הגבלות אוטומטיות למניעת overflow ותצוגה לא תקינה
 */

// קבועים גלובליים
export const MAX_PRICE = Number.MAX_SAFE_INTEGER; // No limit - allow any reasonable price
export const MAX_QUANTITY = 99999; // 99,999 - כמות מקסימלית
export const MAX_PERCENTAGE = 100; // 100% - אחוז מקסימלי
export const MAX_HOURS = 9999; // 9,999 שעות - מקסימום שעות עבודה

/**
 * פורמט מחיר עם הגבלה אוטומטית וסימני אלפים
 * @param {number} price - המחיר לפורמט
 * @param {object} options - אפשרויות נוספות
 * @param {number} options.maxValue - ערך מקסימלי (ברירת מחדל: MAX_PRICE)
 * @param {number} options.minFractionDigits - מספר ספרות אחרי הנקודה מינימלי
 * @param {number} options.maxFractionDigits - מספר ספרות אחרי הנקודה מקסימלי
 * @returns {string} - המחיר המפורמט
 *
 * @example
 * formatPrice(12345) // "12,345"
 * formatPrice(99999) // "99,999"
 * formatPrice(100000) // "99,999" (מוגבל אוטומטית)
 */
export const formatPrice = (price, options = {}) => {
  const {
    maxValue = MAX_PRICE,
    minFractionDigits = 0,
    maxFractionDigits = 0
  } = options;

  // בדיקת תקינות
  if (price === null || price === undefined || typeof price !== 'number' || isNaN(price)) {
    return '0';
  }

  // הגבלה לערך מקסימלי
  const limitedPrice = Math.min(Math.abs(price), maxValue);

  // פורמט עם סימני אלפים
  return limitedPrice.toLocaleString('he-IL', {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits
  });
};

/**
 * פורמט מספר כללי עם הגבלות
 * @param {number} num - המספר לפורמט
 * @param {object} options - אפשרויות
 * @returns {string} - המספר המפורמט
 */
export const formatNumber = (num, options = {}) => {
  const {
    maxValue = Number.MAX_SAFE_INTEGER,
    minFractionDigits = 0,
    maxFractionDigits = 2,
    locale = 'he-IL'
  } = options;

  if (num === null || num === undefined || typeof num !== 'number' || isNaN(num)) {
    return '0';
  }

  const limited = Math.min(Math.abs(num), maxValue);

  return limited.toLocaleString(locale, {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits
  });
};

/**
 * פורמט כמות עם הגבלה
 * @param {number} quantity - הכמות לפורמט
 * @param {number} decimals - מספר ספרות אחרי הנקודה
 * @returns {string} - הכמות המפורמטת
 */
export const formatQuantity = (quantity, decimals = 0) => {
  return formatNumber(quantity, {
    maxValue: MAX_QUANTITY,
    minFractionDigits: decimals,
    maxFractionDigits: decimals
  });
};

/**
 * פורמט אחוז עם הגבלה
 * @param {number} percentage - האחוז לפורמט
 * @param {number} decimals - מספר ספרות אחרי הנקודה
 * @returns {string} - האחוז המפורמט
 */
export const formatPercentage = (percentage, decimals = 1) => {
  return formatNumber(percentage, {
    maxValue: MAX_PERCENTAGE,
    minFractionDigits: decimals,
    maxFractionDigits: decimals
  });
};

/**
 * קיצוץ מספר למספר ספרות מקסימלי
 * @param {number} num - המספר לקיצוץ
 * @param {number} maxDigits - מספר ספרות מקסימלי
 * @returns {number} - המספר המקוצץ
 */
export const truncateNumber = (num, maxDigits = 8) => {
  if (typeof num !== 'number' || isNaN(num)) return 0;
  const max = Math.pow(10, maxDigits) - 1;
  return Math.min(Math.abs(num), max);
};

/**
 * בדיקה אם מספר חורג מההגבלות
 * @param {number} value - הערך לבדיקה
 * @param {number} maxValue - ערך מקסימלי
 * @returns {boolean} - האם המספר חורג
 */
export const isOverLimit = (value, maxValue) => {
  if (typeof value !== 'number' || isNaN(value)) return false;
  return Math.abs(value) > maxValue;
};

/**
 * פורמט עם סמל מטבע
 * @param {number} price - המחיר
 * @param {string} currency - סמל המטבע (ברירת מחדל: ₪)
 * @returns {string} - מחיר מפורמט עם סמל מטבע
 */
export const formatPriceWithCurrency = (price, currency = '₪') => {
  return `${formatPrice(price)} ${currency}`;
};
