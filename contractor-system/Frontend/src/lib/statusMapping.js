/**
 * Status Mapping Utility
 * 
 * Maps between Hebrew (UI display) and English (API/Database) status values
 */

// Status mappings: Hebrew to English
export const STATUS_HE_TO_EN = {
  'אושר': 'approved',
  'טיוטה': 'draft',
  'נשלח': 'sent',
  'נדחה': 'rejected',
  'בוטל': 'cancelled',
};

// Status mappings: English to Hebrew
export const STATUS_EN_TO_HE = {
  'approved': 'אושר',
  'draft': 'טיוטה',
  'sent': 'נשלח',
  'rejected': 'נדחה',
  'cancelled': 'בוטל',
};

// English status constants
export const STATUS_EN = {
  APPROVED: 'approved',
  DRAFT: 'draft',
  SENT: 'sent',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Hebrew status constants
export const STATUS_HE = {
  APPROVED: 'אושר',
  DRAFT: 'טיוטה',
  SENT: 'נשלח',
  REJECTED: 'נדחה',
  CANCELLED: 'בוטל',
};

/**
 * Convert Hebrew status to English for API calls
 * @param {string} hebrewStatus - Hebrew status value
 * @returns {string} English status value
 */
export function toEnglishStatus(hebrewStatus) {
  if (!hebrewStatus) return hebrewStatus;
  
  // If it's already in English, return as-is
  if (STATUS_EN_TO_HE[hebrewStatus]) {
    return hebrewStatus;
  }
  
  // Convert from Hebrew to English
  return STATUS_HE_TO_EN[hebrewStatus] || hebrewStatus;
}

/**
 * Convert English status to Hebrew for UI display
 * @param {string} englishStatus - English status value
 * @returns {string} Hebrew status value
 */
export function toHebrewStatus(englishStatus) {
  if (!englishStatus) return englishStatus;
  
  // If it's already in Hebrew, return as-is
  if (STATUS_HE_TO_EN[englishStatus]) {
    return englishStatus;
  }
  
  // Convert from English to Hebrew
  return STATUS_EN_TO_HE[englishStatus] || englishStatus;
}

/**
 * Check if a status value is in Hebrew
 * @param {string} status - Status value to check
 * @returns {boolean} True if Hebrew, false otherwise
 */
export function isHebrewStatus(status) {
  return status && STATUS_HE_TO_EN.hasOwnProperty(status);
}

/**
 * Check if a status value is in English
 * @param {string} status - Status value to check
 * @returns {boolean} True if English, false otherwise
 */
export function isEnglishStatus(status) {
  return status && STATUS_EN_TO_HE.hasOwnProperty(status);
}

