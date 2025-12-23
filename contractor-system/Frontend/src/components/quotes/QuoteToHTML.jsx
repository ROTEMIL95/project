
import React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { formatPrice } from '@/lib/utils';
import { isApprovalDependent } from '@/lib/paymentDateUtils';

// מפת צבעים לקטגוריות - צבעים עדינים ורכים
const CATEGORY_STYLES = {
  'cat_paint_plaster': {
    name: 'צבע ושפכטל',
    icon: '🎨',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    textColor: '#1E40AF',
    accentColor: '#60A5FA',
    lightBg: '#F0F9FF'
  },
  'cat_tiling': {
    name: 'ריצוף וחיפוי',
    icon: '📦',
    bgColor: '#FFF7ED',
    borderColor: '#FED7AA',
    textColor: '#C2410C',
    accentColor: '#FB923C',
    lightBg: '#FFF7ED'
  },
  'cat_demolition': {
    name: 'הריסה ופינוי',
    icon: '🔨',
    bgColor: '#FFF1F2',
    borderColor: '#FECACA',
    textColor: '#BE123C',
    accentColor: '#FB7185',
    lightBg: '#FFF1F2'
  },
  'cat_electricity': {
    name: 'חשמל',
    icon: '💡',
    bgColor: '#FEFCE8',
    borderColor: '#FEF08A',
    textColor: '#A16207',
    accentColor: '#FDE047',
    lightBg: '#FEFCE8'
  },
  'cat_plumbing': {
    name: 'אינסטלציה',
    icon: '🔧',
    bgColor: '#F0FDFA',
    borderColor: '#99F6E4',
    textColor: '#0F766E',
    accentColor: '#5EEAD4',
    lightBg: '#F0FDFA'
  },
  'cat_construction': {
    name: 'בינוי (כללי)',
    icon: '🏗️',
    bgColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    textColor: '#7C3AED',
    accentColor: '#C084FC',
    lightBg: '#FAF5FF'
  }
};

export default function QuoteToHTML({ quote }) {
  if (!quote) return null;

  // Helper function to apply price increase to item prices
  const getAdjustedPrice = (originalPrice) => {
    const priceIncrease = quote.priceIncrease || 0;
    if (priceIncrease === 0) return originalPrice;
    return Math.round(originalPrice * (1 + priceIncrease / 100));
  };

  // קיבוץ פריטים לפי קטגוריות (מסנן פריטי סיכום) + שמירת summary items בנפרד
  const itemsByCategory = {};
  const summaryItemsByCategory = {};

  (quote.items || []).forEach(item => {
    const categoryId = item.categoryId || 'other';

    // If it's a summary item, store it separately
    if (item.source === 'paint_plaster_category_summary') {
      summaryItemsByCategory[categoryId] = item;
      return;
    }

    if (!itemsByCategory[categoryId]) {
      itemsByCategory[categoryId] = [];
    }
    itemsByCategory[categoryId].push(item);
  });

  // חישוב סיכומים לכל קטגוריה - השתמש ב-summary item אם קיים, אחרת חשב מחדש
  const categorySummaries = {};
  Object.keys(itemsByCategory).forEach(categoryId => {
    const items = itemsByCategory[categoryId];
    const summaryItem = summaryItemsByCategory[categoryId];

    // If we have a summary item, use its values (this ensures consistency with the cart)
    if (summaryItem) {
      const itemCount = items.reduce((sum, item) => {
        if (item.unit === "יחידה") {
          return sum + (Number(item.quantity) || 1);
        }
        return sum + 1;
      }, 0);

      categorySummaries[categoryId] = {
        totalPrice: Number(summaryItem.totalPrice) || 0,
        totalCost: Number(summaryItem.totalCost) || 0,
        profit: Number(summaryItem.profit) || 0,
        totalWorkDays: Number(summaryItem.workDuration) || 0,
        itemCount
      };
    } else {
      // Fallback: calculate from items
      const totalPrice = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const totalCost = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
      const totalWorkDays = items.reduce((sum, item) => sum + (Number(item.workDuration) || 0), 0);

      const itemCount = items.reduce((sum, item) => {
        if (item.unit === "יחידה") {
          return sum + (Number(item.quantity) || 1);
        }
        return sum + 1;
      }, 0);

      categorySummaries[categoryId] = {
        totalPrice,
        totalCost,
        profit: totalPrice - totalCost,
        totalWorkDays,
        itemCount
      };
    }
  });

  const companyInfo = quote.companyInfo || {};

  const styles = `
    <style>
      .quote-container * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        direction: rtl;
        background: #fafafa;
        padding: 20px;
        line-height: 1.7;
        color: #374151;
      }

      .quote-container {
        max-width: 1000px;
        margin: 0 auto;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border-radius: 16px;
        overflow: hidden;
      }
      
      .quote-header {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        padding: 48px 40px;
        text-align: center;
      }
      
      .quote-header h1 {
        font-size: 32px;
        margin-bottom: 8px;
        font-weight: 600;
        letter-spacing: -0.5px;
      }
      
      .quote-date {
        font-size: 15px;
        opacity: 0.95;
        margin-top: 8px;
        font-weight: 400;
      }
      
      .info-section {
        background: #fafafa;
        padding: 32px 40px;
        border-bottom: 1px solid #f1f5f9;
      }
      
      .info-section-title {
        font-size: 18px;
        color: #1f2937;
        margin-bottom: 20px;
        font-weight: 600;
        letter-spacing: -0.3px;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }
      
      .info-item {
        background: white;
        padding: 16px;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
        transition: all 0.2s;
      }
      
      .info-label {
        font-weight: 500;
        color: #6b7280;
        font-size: 12px;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .info-value {
        color: #111827;
        font-size: 15px;
        font-weight: 500;
      }
      
      /* בלוק לוח זמנים - עיצוב מונוכרומי */
      .timeline-section {
        background: #f9fafb;
        padding: 24px 40px;
        margin: 32px 40px;
        border-radius: 12px;
        border: 2px solid #d1d5db;
      }
      
      .timeline-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 20px;
      }
      
      .timeline-icon {
        font-size: 20px;
      }
      
      .timeline-title {
        font-size: 18px;
        color: #111827;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      .timeline-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .timeline-item {
        background: white;
        padding: 14px 18px;
        border-radius: 10px;
        border: 2px solid #d1d5db;
        text-align: center;
        flex: 0 1 auto;
        min-width: 140px;
      }

      .timeline-item-icon {
        font-size: 18px;
        margin-bottom: 6px;
      }

      .timeline-item-label {
        font-weight: 600;
        color: #6b7280;
        font-size: 11px;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .timeline-item-value {
        color: #111827;
        font-size: 14px;
        font-weight: 700;
      }

      .timeline-arrow {
        color: #9ca3af;
        font-size: 16px;
        font-weight: bold;
      }
      
      /* עיצוב קטגוריה - מונוכרומי ועסקי */
      .category-block {
        margin: 40px;
        page-break-inside: avoid;
      }

      .category-header {
        padding: 20px 24px;
        border-radius: 12px 12px 0 0;
        border: 2px solid;
        border-bottom: none;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .category-icon {
        font-size: 28px;
      }

      .category-title {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      .category-content {
        border: 2px solid;
        border-top: none;
        border-radius: 0 0 12px 12px;
        overflow: hidden;
      }
      
      /* טבלת פריטים - עיצוב עדין */
      .items-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
      }
      
      .items-table thead {
        background: #fafafa;
      }
      
      .items-table th {
        padding: 14px 12px;
        text-align: right;
        font-weight: 600;
        color: #6b7280;
        font-size: 13px;
        border-bottom: 1px solid #e5e7eb;
        letter-spacing: 0.3px;
      }
      
      .items-table td {
        padding: 14px 12px;
        text-align: right;
        border-bottom: 1px solid #f3f4f6;
        font-size: 14px;
        color: #374151;
      }
      
      .items-table tbody tr:last-child td {
        border-bottom: none;
      }
      
      .items-table tbody tr:hover {
        background: #fafafa;
      }

      /* תיחום צבעוני לפריטים לפי גודל חדר */
      .room-small {
        border-right: 4px solid #10b981 !important;
        background: linear-gradient(to left, #ecfdf5, #ffffff) !important;
      }

      .room-medium {
        border-right: 4px solid #3b82f6 !important;
        background: linear-gradient(to left, #eff6ff, #ffffff) !important;
      }

      .room-large {
        border-right: 4px solid #a855f7 !important;
        background: linear-gradient(to left, #faf5ff, #ffffff) !important;
      }

      /* סיכום קטגוריה - עיצוב עדין */
      .category-summary {
        background: #fafafa;
        padding: 24px;
        border-top: 1px solid #e5e7eb;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
      }
      
      .summary-item {
        background: white;
        padding: 16px;
        border-radius: 10px;
        text-align: center;
        border: 1px solid #e5e7eb;
      }
      
      .summary-label {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .summary-value {
        font-size: 20px;
        font-weight: 700;
      }

      .summary-value-small {
        font-size: 14px;
        font-weight: 600;
      }
      
      /* התחייבויות קבלן - עיצוב עדין */
      .commitments-section {
        padding: 24px;
        border-top: 1px solid;
        border-radius: 0 0 12px 12px;
      }
      
      .commitments-title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: -0.2px;
      }
      
      .commitments-content {
        background: white;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid;
        border-right-width: 3px;
        white-space: pre-wrap;
        line-height: 1.8;
        font-size: 14px;
        color: #374151;
      }
      
      /* סיכום כללי - עיצוב מונוכרומי */
      .final-summary {
        margin: 40px;
        background: #111827;
        color: white;
        padding: 32px;
        border-radius: 12px;
        border: 3px solid #1f2937;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
      }

      .final-summary h2 {
        font-size: 24px;
        margin-bottom: 24px;
        text-align: center;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      .final-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
      }

      .final-item {
        background: #1f2937;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        border: 2px solid #374151;
      }

      .final-label {
        font-size: 13px;
        opacity: 0.9;
        margin-bottom: 10px;
        font-weight: 500;
        letter-spacing: 0.3px;
        color: #d1d5db;
      }

      .final-value {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: white;
      }
      
      /* תנאי תשלום - עיצוב עדין */
      .payment-terms {
        margin: 40px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
      }
      
      .payment-terms-header {
        background: #fafafa;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .payment-terms-title {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        letter-spacing: -0.3px;
      }
      
      .payment-terms-content {
        padding: 24px;
      }
      
      .payment-term {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #fafafa;
        border-radius: 8px;
        margin-bottom: 12px;
        border: 1px solid #f3f4f6;
      }
      
      .payment-term:last-child {
        margin-bottom: 0;
      }
      
      .term-milestone {
        font-weight: 600;
        color: #1f2937;
        font-size: 15px;
        flex: 1;
      }
      
      .term-details {
        display: flex;
        gap: 20px;
        align-items: center;
      }

      .term-percentage {
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        width: 60px;
        min-width: 60px;
        text-align: center;
        flex-shrink: 0;
      }

      .term-amount {
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        width: 120px;
        min-width: 120px;
        text-align: left;
        flex-shrink: 0;
      }

      .term-date {
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
        width: 150px;
        min-width: 150px;
        text-align: left;
        flex-shrink: 0;
      }
      
      /* New: Variable Costs Section - מונוכרומי */
      .variable-costs-section {
        margin: 40px;
      }

      .variable-costs-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 3px solid #111827;
      }

      .variable-costs-header h2 {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
      }

      .variable-costs-content {
        display: flex;
        flex-direction: column;
        gap: 12px; /* space-y-3 */
      }

      .variable-cost-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-radius: 12px;
        border-width: 2px;
      }

      .variable-cost-item-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .variable-cost-item-desc {
        font-size: 18px;
        font-weight: 600;
      }

      .variable-cost-item-value {
        font-size: 24px;
        font-weight: 700;
      }

      .variable-costs-total {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-radius: 12px;
        border-width: 2px;
        border-color: #d1d5db;
        background-color: #f9fafb;
        margin-top: 16px;
      }

      .variable-costs-total-label {
        font-size: 20px;
        font-weight: 700;
        color: #111827;
      }

      .variable-costs-total-value {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
      }
      
      /* New: Commitments Section */
      .commitments-wrapper {
        margin-bottom: 32px; /* For mb-8 from outline */
        margin-left: 40px; /* Preserve existing side margin */
        margin-right: 40px; /* Preserve existing side margin */
      }

      .commitments-grid {
        display: grid;
        grid-template-columns: 1fr; /* Default for mobile */
        gap: 24px; /* gap-6 */
      }

      @media (min-width: 768px) { /* md breakpoint */
        .commitments-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .commitment-card {
        padding: 24px; /* p-6 */
        border-radius: 16px; /* rounded-2xl */
        border-width: 2px; /* border-2 */
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); /* shadow-lg */
      }

      .commitment-header {
        display: flex;
        align-items: center;
        gap: 12px; /* gap-3 */
        margin-bottom: 16px; /* mb-4 */
        padding-bottom: 12px; /* pb-3 */
        border-bottom-width: 2px; /* border-b-2 */
      }

      .commitment-icon {
        font-size: 24px; /* text-2xl */
      }

      .commitment-title {
        font-size: 20px; /* text-xl */
        font-weight: 700; /* font-bold */
      }

      .commitment-content {
        font-size: 14px; /* text-sm */
        line-height: 1.6; /* leading-relaxed */
        white-space: pre-wrap; /* whitespace-pre-wrap */
      }

      /* Specific colors for contractor commitments - מונוכרומי */
      .contractor-commitment-card {
        background: #f9fafb;
        border-color: #d1d5db;
      }

      .contractor-commitment-header {
        border-color: #9ca3af;
      }

      .contractor-commitment-title {
        color: #111827;
      }

      .contractor-commitment-content {
        color: #374151;
      }

      /* Specific colors for client commitments - מונוכרומי */
      .client-commitment-card {
        background: #f9fafb;
        border-color: #d1d5db;
      }

      .client-commitment-header {
        border-color: #9ca3af;
      }

      .client-commitment-title {
        color: #111827;
      }

      .client-commitment-content {
        color: #374151;
      }
      
      .legal-note {
        margin-top: 16px; /* mt-4 */
        padding: 16px; /* p-4 */
        background-color: #f9fafb; /* bg-gray-50 */
        border: 1px solid #d1d5db; /* border border-gray-300 */
        border-radius: 8px; /* rounded-lg */
      }

      .legal-note p {
        font-size: 12px; /* text-xs */
        color: #4b5563; /* text-gray-600 */
        text-align: center; /* text-center */
      }
      
      /* New: Footer Section */
      .quote-footer {
        text-align: center; /* text-center */
        padding-top: 24px; /* py-6 */
        padding-bottom: 24px; /* py-6 */
        background-color: #f9fafb; /* bg-gray-50 */
        border-radius: 8px; /* rounded-lg */
        border-top: 2px solid #e5e7eb; /* border-t-2 border-gray-200 */
        margin-top: 32px; /* mt-8 */
        margin-left: 40px; /* Add margin to align with other sections */
        margin-right: 40px; /* Add margin to align with other sections */
        margin-bottom: 20px; /* Keep consistent with body padding */
      }

      .quote-footer p {
        font-size: 14px; /* text-sm */
        color: #4b5563; /* text-gray-600 */
        margin-bottom: 8px; /* mb-2 */
      }

      .quote-footer p:last-child {
        margin-bottom: 0;
      }

      .quote-footer strong {
        color: #374151; /* text-gray-700 */
      }

      /* ===== SIGNATURE SECTION ===== */
      .signature-section {
        margin: 40px;
        padding: 32px;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        page-break-inside: avoid;
      }

      .signature-section-title {
        font-size: 20px;
        font-weight: 700;
        color: #111827;
        text-align: center;
        margin-bottom: 32px;
        letter-spacing: -0.3px;
      }

      .signatures-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 48px;
      }

      .signature-box {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .signature-label {
        font-size: 16px;
        font-weight: 600;
        color: #374151;
        text-align: center;
      }

      .signature-line {
        border-bottom: 2px solid #111827;
        height: 60px;
        background: #fafafa;
        border-radius: 4px;
      }

      .signature-date-line {
        font-size: 14px;
        color: #6b7280;
        text-align: center;
        margin-top: 8px;
      }

      /* ===== RESPONSIVE MOBILE STYLES ===== */
      @media (max-width: 768px) {
        body {
          padding: 10px;
          font-size: 14px;
        }

        .quote-container {
          max-width: 100%;
          border-radius: 8px;
        }

        .quote-header {
          padding: 24px 20px;
        }

        .quote-header h1 {
          font-size: 24px;
        }

        .quote-date {
          font-size: 13px;
        }

        .info-section {
          padding: 20px 16px;
        }

        .info-section-title {
          font-size: 16px;
          margin-bottom: 16px;
        }

        .info-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .info-item {
          padding: 12px;
        }

        .timeline-section {
          padding: 16px 20px;
          margin: 20px 16px;
        }

        .timeline-content {
          flex-direction: column;
          gap: 8px;
        }

        .timeline-arrow {
          transform: rotate(90deg);
          font-size: 14px;
        }

        .timeline-item {
          min-width: 100%;
        }

        .category-block {
          margin: 24px 16px;
        }

        .category-header {
          padding: 16px 20px;
          flex-wrap: wrap;
        }

        .category-icon {
          font-size: 24px;
        }

        .category-title {
          font-size: 18px;
        }

        .items-table {
          font-size: 11px;
          width: 100%;
          overflow-x: auto;
          display: block;
        }

        .items-table thead th {
          font-size: 10px;
          padding: 10px 6px;
        }

        .items-table td {
          font-size: 11px;
          padding: 10px 6px;
        }

        .items-table tbody {
          display: table;
          width: 100%;
        }

        .items-table tr {
          display: table-row;
        }

        .category-summary {
          padding: 16px;
        }

        .summary-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .summary-item {
          padding: 12px;
        }

        .summary-value {
          font-size: 16px;
        }

        .commitments-section {
          padding: 16px;
        }

        .commitments-title {
          font-size: 14px;
        }

        .commitments-content {
          font-size: 13px;
          padding: 12px;
        }

        .variable-costs-section {
          margin: 24px 16px;
        }

        .variable-costs-header h2 {
          font-size: 20px;
        }

        .variable-cost-item {
          flex-direction: column;
          align-items: flex-start;
          padding: 12px;
          gap: 8px;
        }

        .variable-cost-item-desc {
          font-size: 15px;
        }

        .variable-cost-item-value {
          font-size: 20px;
          align-self: flex-end;
        }

        .final-summary {
          margin: 24px 16px;
          padding: 20px;
        }

        .final-summary h2 {
          font-size: 20px;
          margin-bottom: 16px;
        }

        .final-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .final-item {
          padding: 16px;
        }

        .final-value {
          font-size: 22px;
        }

        .payment-terms {
          margin: 24px 16px;
        }

        .payment-terms-header {
          padding: 16px 20px;
        }

        .payment-terms-title {
          font-size: 16px;
        }

        .payment-terms-content {
          padding: 16px;
        }

        .payment-term {
          flex-direction: column;
          align-items: flex-start;
          padding: 12px;
          gap: 8px;
        }

        .term-details {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          width: 100%;
        }

        .term-percentage,
        .term-amount,
        .term-date {
          min-width: auto;
          text-align: right;
        }

        .commitments-wrapper {
          margin: 24px 16px;
        }

        .commitments-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .commitment-card {
          padding: 16px;
        }

        .commitment-title {
          font-size: 16px;
        }

        .commitment-content {
          font-size: 13px;
        }

        .quote-footer {
          margin: 24px 16px 16px 16px;
          padding: 16px;
        }

        .quote-footer p {
          font-size: 13px;
        }

        .signature-section {
          margin: 24px 16px;
          padding: 20px;
        }

        .signature-section-title {
          font-size: 18px;
          margin-bottom: 24px;
        }

        .signatures-grid {
          grid-template-columns: 1fr;
          gap: 24px;
        }

        .signature-label {
          font-size: 15px;
        }

        .signature-line {
          height: 50px;
        }

        .signature-date-line {
          font-size: 13px;
        }
      }

      /* ===== PRINT STYLES - Optimized for PDF/Print Output ===== */
      @media print {
        /* ===== Page Setup ===== */
        @page {
          size: A4 portrait;
          margin: 15mm;
        }

        /* ===== Body & Container ===== */
        body {
          padding: 0 !important;
          margin: 0 !important;
          background: white !important;
          font-size: 10pt;
          line-height: 1.4;
        }

        .quote-container {
          max-width: 100% !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          margin: 0 !important;
        }

        /* ===== Header ===== */
        .quote-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
          color: white !important;
          padding: 20px 15px !important;
          page-break-after: avoid;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .quote-header h1 {
          font-size: 20pt;
          margin-bottom: 5px;
        }

        .quote-date {
          font-size: 10pt;
        }

        /* ===== Info Sections ===== */
        .info-section {
          background: white !important;
          padding: 12px 15px !important;
          border-bottom: 1px solid #ddd !important;
          page-break-inside: avoid;
        }

        .info-section-title {
          font-size: 12pt;
          margin-bottom: 10px;
          color: #000 !important;
        }

        .info-grid {
          gap: 8px;
        }

        .info-item {
          background: #f5f5f5 !important;
          padding: 8px !important;
          border: 1px solid #ddd !important;
          border-radius: 4px !important;
        }

        .info-label {
          font-size: 8pt;
          color: #666 !important;
        }

        .info-value {
          font-size: 10pt;
          color: #000 !important;
        }

        /* ===== Timeline Section ===== */
        .timeline-section {
          background: #f9fafb !important;
          padding: 12px 15px !important;
          margin: 10px 15px !important;
          border: 2px solid #d1d5db !important;
          border-radius: 6px !important;
          page-break-inside: avoid;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .timeline-header {
          margin-bottom: 10px;
        }

        .timeline-title {
          font-size: 12pt;
          color: #000 !important;
        }

        .timeline-item {
          background: #f5f5f5 !important;
          padding: 8px 10px !important;
          border: 1px solid #999 !important;
        }

        .timeline-item-label {
          font-size: 7pt;
          color: #666 !important;
        }

        .timeline-item-value {
          font-size: 10pt;
          color: #000 !important;
        }

        /* ===== Category Blocks ===== */
        .category-block {
          margin: 15px 10px !important;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .category-header {
          /* Keep original category colors - will be set inline */
          padding: 12px 15px !important;
          border-radius: 4px 4px 0 0 !important;
          border-width: 2px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .category-icon {
          font-size: 18pt;
          /* Keep icons colorful - remove grayscale */
        }

        .category-title {
          font-size: 14pt;
          /* Color will be set inline based on category */
        }

        .category-content {
          /* Border color will be set inline based on category */
          border-width: 2px !important;
          border-top: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* ===== Tables ===== */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          table-layout: fixed;
        }

        .items-table thead {
          background: #e0e0e0 !important;
        }

        .items-table th {
          padding: 6px 4px !important;
          font-size: 8pt;
          color: #000 !important;
          border-bottom: 2px solid #000 !important;
          font-weight: 700;
          word-wrap: break-word;
        }

        .items-table td {
          padding: 6px 4px !important;
          font-size: 9pt;
          color: #000 !important;
          border-bottom: 1px solid #ccc !important;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .items-table tbody tr:hover {
          background: transparent !important;
        }

        /* Room size colors - Keep original colors for print */
        .room-small {
          border-right: 4px solid #10b981 !important;
          background: linear-gradient(to left, #ecfdf5, #ffffff) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .room-medium {
          border-right: 4px solid #3b82f6 !important;
          background: linear-gradient(to left, #eff6ff, #ffffff) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .room-large {
          border-right: 4px solid #a855f7 !important;
          background: linear-gradient(to left, #faf5ff, #ffffff) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* ===== Category Summary ===== */
        .category-summary {
          background: #f5f5f5 !important;
          padding: 12px 15px !important;
          border-top: 2px solid #000 !important;
          page-break-inside: avoid;
        }

        .summary-grid {
          gap: 8px;
        }

        .summary-item {
          background: white !important;
          padding: 8px !important;
          border: 1px solid #999 !important;
        }

        .summary-label {
          font-size: 7pt;
          color: #666 !important;
        }

        .summary-value {
          font-size: 12pt;
          color: #000 !important;
        }

        .summary-value-small {
          font-size: 9pt;
          color: #000 !important;
        }

        /* ===== Commitments in Category ===== */
        .commitments-section {
          background: white !important;
          padding: 12px 15px !important;
          border-top: 1px solid #000 !important;
          page-break-inside: avoid;
        }

        .commitments-title {
          font-size: 10pt;
          color: #000 !important;
        }

        .commitments-content {
          background: #f9f9f9 !important;
          padding: 10px !important;
          border: 1px solid #999 !important;
          border-right-width: 3px !important;
          border-right-color: #000 !important;
          font-size: 9pt;
          color: #000 !important;
        }

        /* ===== Variable Costs Section ===== */
        .variable-costs-section {
          margin: 15px 10px !important;
          page-break-inside: avoid;
        }

        .variable-costs-header {
          border-bottom: 2px solid #000 !important;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }

        .variable-costs-header h2 {
          font-size: 14pt;
          color: #000 !important;
        }

        .variable-cost-item {
          background: #f5f5f5 !important;
          border: 1px solid #999 !important;
          padding: 10px !important;
          margin-bottom: 6px;
        }

        .variable-cost-item-desc {
          font-size: 10pt;
          color: #000 !important;
        }

        .variable-cost-item-value {
          font-size: 12pt;
          color: #000 !important;
        }

        .variable-costs-total {
          background: #e0e0e0 !important;
          border: 2px solid #000 !important;
          padding: 10px !important;
          margin-top: 10px;
        }

        .variable-costs-total-label,
        .variable-costs-total-value {
          color: #000 !important;
        }

        /* ===== Final Summary ===== */
        .final-summary {
          margin: 15px 10px !important;
          background: #111827 !important;
          color: white !important;
          padding: 15px !important;
          border: 3px solid #1f2937 !important;
          border-radius: 6px !important;
          page-break-inside: avoid;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important;
        }

        .final-summary h2 {
          font-size: 16pt;
          margin-bottom: 12px;
          color: white !important;
        }

        .final-grid {
          gap: 10px;
        }

        .final-item {
          background: #1f2937 !important;
          padding: 10px !important;
          border: 2px solid #374151 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .final-label {
          font-size: 9pt;
          color: #d1d5db !important;
        }

        .final-value {
          font-size: 14pt;
          color: white !important;
        }

        /* ===== Payment Terms ===== */
        .payment-terms {
          margin: 15px 10px !important;
          background: white !important;
          border: 2px solid #000 !important;
          page-break-inside: avoid;
        }

        .payment-terms-header {
          background: #e0e0e0 !important;
          padding: 10px 15px !important;
          border-bottom: 2px solid #000 !important;
        }

        .payment-terms-title {
          font-size: 12pt;
          color: #000 !important;
        }

        .payment-terms-content {
          padding: 12px 15px !important;
        }

        .payment-term {
          background: #f5f5f5 !important;
          padding: 8px 10px !important;
          border: 1px solid #999 !important;
          margin-bottom: 6px;
        }

        .term-milestone {
          font-size: 10pt;
          color: #000 !important;
        }

        .term-percentage,
        .term-amount {
          font-size: 11pt;
          color: #000 !important;
        }

        .term-date {
          font-size: 9pt;
          color: #666 !important;
        }

        /* ===== General Commitments Wrapper ===== */
        .commitments-wrapper {
          margin: 15px 10px 15px 10px !important;
          page-break-inside: avoid;
        }

        .commitments-grid {
          gap: 12px;
        }

        .commitment-card {
          background: white !important;
          padding: 12px !important;
          border: 2px solid #000 !important;
          border-radius: 6px !important;
          box-shadow: none !important;
          page-break-inside: avoid;
        }

        .commitment-header {
          border-bottom: 2px solid #999 !important;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }

        .commitment-icon {
          font-size: 16pt;
          /* Keep emoji icons colorful - removed grayscale filter */
        }

        .commitment-title {
          font-size: 11pt;
          color: #000 !important;
        }

        .commitment-content {
          font-size: 9pt;
          color: #000 !important;
          line-height: 1.5;
        }

        .contractor-commitment-card,
        .client-commitment-card {
          background: #f9f9f9 !important;
          border-color: #000 !important;
        }

        .contractor-commitment-header,
        .client-commitment-header {
          border-color: #666 !important;
        }

        .legal-note {
          background: #f0f0f0 !important;
          border: 1px solid #999 !important;
          padding: 8px !important;
          margin-top: 10px;
        }

        .legal-note p {
          font-size: 8pt;
          color: #333 !important;
        }

        /* ===== Footer ===== */
        .quote-footer {
          background: #f5f5f5 !important;
          border-top: 2px solid #000 !important;
          padding: 12px 15px !important;
          margin: 15px 10px 10px 10px !important;
          page-break-inside: avoid;
        }

        .quote-footer p {
          font-size: 9pt;
          color: #000 !important;
          margin-bottom: 4px;
        }

        .quote-footer strong {
          color: #000 !important;
        }

        /* ===== Signature Section ===== */
        .signature-section {
          margin: 15px 10px !important;
          padding: 20px 15px !important;
          background: white !important;
          border: 2px solid #000 !important;
          page-break-inside: avoid;
        }

        .signature-section-title {
          font-size: 14pt;
          margin-bottom: 20px;
          color: #000 !important;
        }

        .signatures-grid {
          gap: 30px;
        }

        .signature-label {
          font-size: 11pt;
          color: #000 !important;
        }

        .signature-line {
          border-bottom: 2px solid #000 !important;
          background: #f9f9f9 !important;
          height: 50px;
        }

        .signature-date-line {
          font-size: 9pt;
          color: #333 !important;
        }

        /* ===== Page Break Controls ===== */
        /* Prevent breaking inside key sections */
        .category-block,
        .timeline-section,
        .variable-costs-section,
        .final-summary,
        .payment-terms,
        .commitments-wrapper,
        .signature-section,
        .quote-footer {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Allow breaks between categories if needed */
        .category-block {
          page-break-after: auto;
        }

        /* Keep header with content */
        .category-header,
        .payment-terms-header,
        .commitment-header,
        .variable-costs-header {
          page-break-after: avoid;
        }

        /* Prevent widows/orphans in tables */
        .items-table tr {
          page-break-inside: avoid;
        }

        /* ===== Print-specific utilities ===== */
        /* Preserve colors in print */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        /* Override any hover states */
        *:hover {
          background: inherit !important;
        }
      }
    </style>
  `;

  return (
    <div dangerouslySetInnerHTML={{
      __html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>הצעת מחיר - ${quote.projectName || 'פרויקט'}</title>
          ${styles}
        </head>
        <body>
          <div class="quote-container">
            <!-- כותרת -->
            <div class="quote-header">
              <h1>הצעת מחיר</h1>
              <div class="quote-date">תאריך: ${quote.created_date ? format(new Date(quote.created_date), 'd MMMM yyyy', { locale: he }) : ''}</div>
            </div>
            
            <!-- פרטי קבלן -->
            <div class="info-section">
              <h2 class="info-section-title">פרטי הקבלן</h2>
              <div class="info-grid">
                ${companyInfo.companyName ? `
                <div class="info-item">
                  <div class="info-label">שם החברה</div>
                  <div class="info-value">${companyInfo.companyName}</div>
                </div>
                ` : ''}
                ${companyInfo.companyOwnerName ? `
                <div class="info-item">
                  <div class="info-label">שם בעל החברה</div>
                  <div class="info-value">${companyInfo.companyOwnerName}</div>
                </div>
                ` : ''}
                ${companyInfo.phone ? `
                <div class="info-item">
                  <div class="info-label">טלפון</div>
                  <div class="info-value">${companyInfo.phone}</div>
                </div>
                ` : ''}
                ${companyInfo.email ? `
                <div class="info-item">
                  <div class="info-label">אימייל</div>
                  <div class="info-value">${companyInfo.email}</div>
                </div>
                ` : ''}
                ${companyInfo.businessNumber ? `
                <div class="info-item">
                  <div class="info-label">ח.פ / ע.מ</div>
                  <div class="info-value">${companyInfo.businessNumber}</div>
                </div>
                ` : ''}
                ${companyInfo.address ? `
                <div class="info-item">
                  <div class="info-label">כתובת</div>
                  <div class="info-value">${companyInfo.address}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
            <!-- פרטי פרויקט -->
            <div class="info-section">
              <h2 class="info-section-title">פרטי הפרויקט</h2>
              <div class="info-grid">
                ${quote.projectName ? `
                <div class="info-item">
                  <div class="info-label">שם הפרויקט</div>
                  <div class="info-value">${quote.projectName}</div>
                </div>
                ` : ''}
                ${quote.clientName ? `
                <div class="info-item">
                  <div class="info-label">שם הלקוח</div>
                  <div class="info-value">${quote.clientName}</div>
                </div>
                ` : ''}
                ${quote.projectAddress ? `
                <div class="info-item">
                  <div class="info-label">כתובת הפרויקט</div>
                  <div class="info-value">${quote.projectAddress}</div>
                </div>
                ` : ''}
                ${quote.clientPhone ? `
                <div class="info-item">
                  <div class="info-label">טלפון הלקוח</div>
                  <div class="info-value">${quote.clientPhone}</div>
                </div>
                ` : ''}
                ${quote.clientEmail ? `
                <div class="info-item">
                  <div class="info-label">אימייל הלקוח</div>
                  <div class="info-value">${quote.clientEmail}</div>
                </div>
                ` : ''}
                ${quote.projectType ? `
                <div class="info-item">
                  <div class="info-label">סוג הנכס</div>
                  <div class="info-value">${quote.projectType}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
            <!-- בלוק לוח זמנים -->
            ${quote.generalStartDate && quote.workDays && quote.generalEndDate ? `
            <div class="timeline-section">
              <div class="timeline-header">
                <div class="timeline-icon">📅</div>
                <div class="timeline-title">לוח זמנים</div>
              </div>
              <div class="timeline-content">
                <div class="timeline-item">
                  <div class="timeline-item-icon">🚀</div>
                  <div class="timeline-item-label">התחלה</div>
                  <div class="timeline-item-value">${format(new Date(quote.generalStartDate), 'd.M.yyyy', { locale: he })}</div>
                </div>
                <div class="timeline-arrow">→</div>
                <div class="timeline-item">
                  <div class="timeline-item-icon">⏱️</div>
                  <div class="timeline-item-label">ימי עבודה</div>
                  <div class="timeline-item-value">${quote.workDays} ימים</div>
                </div>
                <div class="timeline-arrow">→</div>
                <div class="timeline-item">
                  <div class="timeline-item-icon">🏁</div>
                  <div class="timeline-item-label">סיום משוער</div>
                  <div class="timeline-item-value">${format(new Date(quote.generalEndDate), 'd.M.yyyy', { locale: he })}</div>
                </div>
              </div>
            </div>
            ` : ''}
            
            <!-- קטגוריות -->
            ${Object.keys(itemsByCategory).map(categoryId => {
              // Convert category ID from snake_case to camelCase for database lookup
              const convertCategoryKey = (catId) => {
                const mapping = {
                  'cat_paint_plaster': 'catPaintPlaster',
                  'cat_tiling': 'catTiling',
                  'cat_demolition': 'catDemolition',
                  'cat_electricity': 'catElectricity',
                  'cat_plumbing': 'catPlumbing',
                  'cat_construction': 'catConstruction'
                };
                return mapping[catId] || catId;
              };

              const items = itemsByCategory[categoryId];
              const style = CATEGORY_STYLES[categoryId] || CATEGORY_STYLES['cat_construction'];
              const summary = categorySummaries[categoryId];

              // Convert categoryId to match database format (camelCase)
              const dbCategoryId = convertCategoryKey(categoryId);

              // Use category-specific commitment from database, fallback to general commitment
              const commitment = quote.categoryCommitments?.[dbCategoryId] || quote.companyInfo?.contractorCommitments || '';
              // Use original categoryId (snake_case) for categoryTimings lookup
              const timings = quote.categoryTimings?.[categoryId] || {};
              
              return `
                <div class="category-block">
                  <!-- כותרת קטגוריה -->
                  <div class="category-header" style="background-color: ${style.bgColor}; border-color: ${style.borderColor}; color: ${style.textColor};">
                    <div class="category-icon">${style.icon}</div>
                    <div class="category-title">${style.name}</div>
                  </div>
                  
                  <div class="category-content" style="border-color: ${style.borderColor};">
                    <!-- טבלת פריטים -->
                    <table class="items-table">
                      <thead>
                        <tr>
                          <th style="width: 25%;">תיאור</th>
                          ${categoryId === 'cat_tiling' ? `
                          <th style="width: 10%;">סוג עבודה</th>
                          <th style="width: 10%;">גודל אריח</th>
                          ` : categoryId === 'cat_paint_plaster' ? `
                          <th style="width: 10%;">סוג צבע</th>
                          <th style="width: 8%;">שכבות</th>
                          ` : ''}
                          <th style="width: 10%;">כמות</th>
                          ${categoryId === 'cat_paint_plaster' ? `
                          <th style="width: 12%;">מחיר למ"ר</th>
                          <th style="width: 10%;">מורכבות</th>
                          <th style="width: 15%;">סה"כ</th>
                          ` : `
                          <th style="width: 8%;">יחידה</th>
                          <th style="width: 12%;">מחיר ליחידה</th>
                          <th style="width: 10%;">מורכבות</th>
                          <th style="width: 15%;">סה"כ</th>
                          `}
                        </tr>
                      </thead>
                      <tbody>
                        ${items.map(item => {
                          // Helper function to get complexity display text (for inline in description)
                          const getComplexityText = (item) => {
                            if (!item.complexity || item.complexity === 'none') return '';

                            const complexityMap = {
                              'low': { name: 'פשוט', percent: 5 },
                              'simple': { name: 'פשוט', percent: 5 },
                              'moderate': { name: 'בינוני', percent: 15 },
                              'medium': { name: 'בינוני', percent: 15 },
                              'high': { name: 'מורכב', percent: 25 },
                              'complex': { name: 'מורכב', percent: 25 },
                              'very_complex': { name: 'מאוד מורכב', percent: 35 },
                              'very_high': { name: 'מאוד מורכב', percent: 35 },
                              'custom': { name: item.customComplexityDescription || 'מותאם אישית', percent: null }
                            };

                            const complexityData = complexityMap[item.complexity];
                            if (!complexityData) return '';

                            // Try to get percentage from quote.projectComplexities first, then fallback to default
                            let complexityPercent = quote.projectComplexities?.complexities?.[item.complexity]?.percentage;
                            if (complexityPercent === undefined || complexityPercent === null) {
                              complexityPercent = complexityData.percent;
                            }

                            if (complexityPercent && complexityPercent > 0) {
                              return ` (${complexityData.name} +${complexityPercent}%)`;
                            }

                            return ` (${complexityData.name})`;
                          };

                          // Helper function to get complexity column value (for separate column)
                          const getComplexityColumn = (item) => {
                            // Check for complexity - support both formats: string (paint) and complexityLevel (tiling)
                            const complexityValue = item.complexityLevel || item.complexity;

                            if (!complexityValue || complexityValue === 'none') return '-';

                            const complexityMap = {
                              // Paint/Plaster complexity levels
                              'low': { name: 'פשוט', percent: 5 },
                              'simple': { name: 'פשוט', percent: 5 },
                              'moderate': { name: 'בינוני', percent: 15 },
                              'medium': { name: 'בינוני', percent: 15 },
                              'high': { name: 'מורכב', percent: 25 },
                              'complex': { name: 'מורכב', percent: 25 },
                              'very_complex': { name: 'מאוד מורכב', percent: 35 },
                              'very_high': { name: 'מאוד מורכב', percent: 35 },
                              'custom': { name: item.customComplexityDescription || 'מותאם אישית', percent: null },
                              // Tiling complexity levels (10% increments)
                              'light': { name: 'קלה', percent: 10 },
                              'mild': { name: 'בינונית-קלה', percent: 20 },
                              'standard': { name: 'בינונית', percent: 30 },
                              'challenging': { name: 'גבוהה', percent: 40 },
                              'difficult': { name: 'מאוד גבוהה', percent: 50 },
                              'extreme': { name: 'קיצונית', percent: 60 }
                            };

                            const complexityData = complexityMap[complexityValue];
                            if (!complexityData) return '-';

                            // Try to get percentage from quote.projectComplexities first, then fallback to default
                            let complexityPercent = quote.projectComplexities?.complexities?.[complexityValue]?.percentage;
                            if (complexityPercent === undefined || complexityPercent === null) {
                              complexityPercent = complexityData.percent;
                            }

                            if (complexityPercent && complexityPercent > 0) {
                              return `${complexityData.name}<br/>(+${complexityPercent}%)`;
                            }

                            return complexityData.name;
                          };

                          // Helper function to detect room size from item name
                          const getRoomSizeClass = (item) => {
                            const name = (item.name || item.description || '').toLowerCase();
                            if (name.includes('קטן')) return 'room-small';
                            if (name.includes('גדול')) return 'room-large';
                            if (name.includes('בינוני')) return 'room-medium';
                            return '';
                          };

                          // Helper function to get work type name (translate English to Hebrew)
                          const getWorkTypeName = (workType) => {
                            if (!workType) return '-';

                            // If workType is an array, take the first element
                            const workTypeValue = Array.isArray(workType) ? workType[0] : workType;
                            if (!workTypeValue) return '-';

                            const workTypeMap = {
                              'floor_tiling': 'ריצוף',
                              'wall_tiling': 'חיפוי קירות',
                              'bathroom_tiling': 'חיפוי חדר אמבטיה',
                              'kitchen_tiling': 'חיפוי מטבח',
                              'tiling': 'ריצוף',
                              'wall_covering': 'חיפוי',
                              'ריצוף רצפה': 'ריצוף רצפה' // Pass through Hebrew values
                            };

                            return workTypeMap[workTypeValue] || workTypeValue;
                          };

                          // Helper function to get selected size (handle both selectedSize, selectedSizes array, and size)
                          const getSelectedSize = (item) => {
                            // Try selectedSize first (singular)
                            if (item.selectedSize) return item.selectedSize;

                            // Try selectedSizes array
                            if (item.selectedSizes && Array.isArray(item.selectedSizes) && item.selectedSizes.length > 0) {
                              return item.selectedSizes.join(', ');
                            }

                            // Try size field
                            if (item.size) return item.size;

                            // If nothing found, return '-'
                            return '-';
                          };

                          // Helper function to get paint type name
                          const getPaintTypeName = (item, subType) => {
                            // Try to get type from subType parameter, then item.paintType/plasterType, then from selectedItemData
                            const type = subType || item.paintType || item.plasterType || item.selectedItemData?.itemName || item.selectedItemData?.tileName || item.selectedItemData?.name;
                            if (!type) return '-';

                            let typeStr = String(type);

                            // If it's just "קירות" or "תקרה" without a specific paint type, return "-"
                            if (typeStr === 'קירות' || typeStr === 'תקרה') {
                              return '-';
                            }

                            // Remove "עבודת צבע" or similar prefixes from paint names (from START and END)
                            typeStr = typeStr.replace(/^עבודת\s+צבע\s*-?\s*/gi, '').trim();
                            typeStr = typeStr.replace(/^עבודת\s+שפכטל\s*-?\s*/gi, '').trim();
                            typeStr = typeStr.replace(/^עבודת\s+טיח\s*-?\s*/gi, '').trim();
                            typeStr = typeStr.replace(/\s*-\s*עבודת\s+צבע\s*$/gi, '').trim();
                            typeStr = typeStr.replace(/\s*-\s*עבודת\s+שפכטל\s*$/gi, '').trim();

                            // Map English IDs to Hebrew names
                            const paintTypeMap = {
                              'acrylic': 'אקרילי',
                              'supercryl': 'סופרקריל',
                              'oil': 'שמן',
                              'effects': 'אפקטים',
                              'tambourflex': 'טמבורפלקס',
                              'gypsum': 'גבס',
                              'plaster': 'טיח',
                              'poksi': 'פוקסי',
                              'foxy': 'פוקסי'
                            };

                            // If it's an English ID, convert to Hebrew
                            if (paintTypeMap[typeStr.toLowerCase()]) {
                              return paintTypeMap[typeStr.toLowerCase()];
                            }

                            // Return the paint type as-is (e.g., "סופרקריל", "אקרילי פרימיום")
                            return typeStr;
                          };

                          // Check if this is a detailed/advanced paint item with wall/ceiling breakdown
                          const hasWallCeilingBreakdown = categoryId === 'cat_paint_plaster' &&
                            (item.wallPaintQuantity > 0 || item.ceilingPaintQuantity > 0);

                          if (hasWallCeilingBreakdown) {
                            // Split into two rows: walls and ceiling
                            let rows = '';

                            // Calculate total quantity for price distribution
                            const totalQuantity = (item.wallPaintQuantity || 0) + (item.ceilingPaintQuantity || 0);
                            const safeQuantity = totalQuantity > 0 ? totalQuantity : (item.quantity || 1);

                            // Get room size class once for both walls and ceiling
                            const roomSizeClass = getRoomSizeClass(item);

                            if (item.wallPaintQuantity > 0) {
                              const adjustedTotalPrice = getAdjustedPrice(item.totalPrice);
                              const wallPricePerSqm = item.wallPaintQuantity > 0 && safeQuantity > 0 ? Math.round((adjustedTotalPrice * (item.wallPaintQuantity / safeQuantity)) / item.wallPaintQuantity) : 0;
                              const wallTotalPrice = safeQuantity > 0 ? Math.round(adjustedTotalPrice * (item.wallPaintQuantity / safeQuantity)) : Math.round(adjustedTotalPrice / 2);

                              // Get paint type - prefer wallPaintName or paintType
                              const wallPaintType = getPaintTypeName(item, item.wallPaintName || item.paintType);
                              const wallLayers = item.wallPaintLayers || item.layers || 1;

                              rows += `
                              <tr class="${roomSizeClass}">
                                <td>
                                  <strong>${item.name || item.description || ''} - קירות</strong>
                                  ${item.name && item.description ? `<br/><span style="font-size: 12px; color: #6b7280; font-weight: normal;">${item.description}</span>` : ''}
                                </td>
                                <td>${wallPaintType}</td>
                                <td>${wallLayers}</td>
                                <td>${formatPrice(item.wallPaintQuantity || 0)} מ"ר</td>
                                <td>₪${formatPrice(wallPricePerSqm)}</td>
                                <td>${getComplexityColumn(item)}</td>
                                <td><strong>₪${formatPrice(wallTotalPrice)}</strong></td>
                              </tr>`;
                            }

                            if (item.ceilingPaintQuantity > 0) {
                              const adjustedTotalPrice = getAdjustedPrice(item.totalPrice);
                              const ceilingPricePerSqm = item.ceilingPaintQuantity > 0 && safeQuantity > 0 ? Math.round((adjustedTotalPrice * (item.ceilingPaintQuantity / safeQuantity)) / item.ceilingPaintQuantity) : 0;
                              const ceilingTotalPrice = safeQuantity > 0 ? Math.round(adjustedTotalPrice * (item.ceilingPaintQuantity / safeQuantity)) : Math.round(adjustedTotalPrice / 2);

                              // Get ceiling paint type - prefer ceilingPaintName
                              const ceilingPaintType = getPaintTypeName(item, item.ceilingPaintName || item.paintType);
                              const ceilingLayers = item.ceilingPaintLayers || item.layers || 1;

                              rows += `
                              <tr class="${roomSizeClass}">
                                <td>
                                  <strong>${item.name || item.description || ''} - תקרה</strong>
                                  ${item.name && item.description ? `<br/><span style="font-size: 12px; color: #6b7280; font-weight: normal;">${item.description}</span>` : ''}
                                </td>
                                <td>${ceilingPaintType}</td>
                                <td>${ceilingLayers}</td>
                                <td>${formatPrice(item.ceilingPaintQuantity || 0)} מ"ר</td>
                                <td>₪${formatPrice(ceilingPricePerSqm)}</td>
                                <td>${getComplexityColumn(item)}</td>
                                <td><strong>₪${formatPrice(ceilingTotalPrice)}</strong></td>
                              </tr>`;
                            }

                            return rows;
                          } else {
                            // Regular single-row display
                            const adjustedTotalPrice = getAdjustedPrice(item.totalPrice);
                            const pricePerSqm = item.quantity > 0 ? Math.round(adjustedTotalPrice / item.quantity) : 0;
                            const pricePerUnit = item.quantity > 0 ? Math.round(adjustedTotalPrice / item.quantity) : (item.unitPrice || 0);
                            const roomSizeClass = getRoomSizeClass(item);

                              return `
                              <tr class="${roomSizeClass}">
                                <td>
                                  <strong>${item.name || item.description || ''}</strong>
                                  ${item.name && item.description ? `<br/><span style="font-size: 12px; color: #6b7280; font-weight: normal;">${item.description}</span>` : ''}
                                </td>
                                ${categoryId === 'cat_tiling' ? `
                                <td>${getWorkTypeName(item.workType)}</td>
                                <td>${getSelectedSize(item)}</td>
                                ` : categoryId === 'cat_paint_plaster' ? `
                                <td>${getPaintTypeName(item)}</td>
                                <td>${item.layers || 1}</td>
                                ` : ''}
                                <td>${formatPrice(item.quantity || 0)}${categoryId === 'cat_paint_plaster' ? ' מ"ר' : ''}</td>
                                ${categoryId === 'cat_paint_plaster' ? `
                                <td>₪${formatPrice(pricePerSqm)}</td>
                                <td>${getComplexityColumn(item)}</td>
                                <td><strong>₪${formatPrice(adjustedTotalPrice || 0)}</strong></td>
                                ` : `
                                <td>${item.unit || 'יח\''}</td>
                                <td>₪${formatPrice(pricePerUnit)}</td>
                                <td>${getComplexityColumn(item)}</td>
                                <td><strong>₪${formatPrice(adjustedTotalPrice || 0)}</strong></td>
                                `}
                              </tr>
                            `;
                          }
                        }).join('')}
                      </tbody>
                    </table>
                    
                    <!-- סיכום קטגוריה -->
                    <div class="category-summary">
                      <div class="summary-grid">
                        <div class="summary-item">
                          <div class="summary-label">סה"כ מחיר</div>
                          <div class="summary-value" style="color: ${style.textColor};">₪${formatPrice(getAdjustedPrice(summary.totalPrice))}</div>
                        </div>
                        
                        ${timings.startDate ? `
                        <div class="summary-item">
                          <div class="summary-label">תאריך התחלה</div>
                          <div class="summary-value-small" style="color: ${style.textColor};">${format(new Date(timings.startDate), 'd.M.yyyy', { locale: he })}</div>
                        </div>
                        ` : ''}

                        ${timings.endDate ? `
                        <div class="summary-item">
                          <div class="summary-label">תאריך סיום</div>
                          <div class="summary-value-small" style="color: ${style.textColor};">${format(new Date(timings.endDate), 'd.M.yyyy', { locale: he })}</div>
                        </div>
                        ` : ''}

                        <div class="summary-item">
                          <div class="summary-label">כמות פריטים</div>
                          <div class="summary-value" style="color: ${style.textColor};">${formatPrice(summary.itemCount)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- התחייבויות קבלן -->
                    ${commitment ? `
                      <div class="commitments-section" style="background-color: ${style.lightBg}; border-color: ${style.borderColor};">
                        <div class="commitments-title" style="color: ${style.textColor};">
                          <span>✓</span>
                          <span>התחייבויות הקבלן</span>
                        </div>
                        <div class="commitments-content" style="border-right-color: ${style.accentColor}; border-color: ${style.borderColor};">${commitment}</div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
            
            <!-- עלויות משתנות -->
            ${(quote.projectComplexities && quote.projectComplexities.additionalCostDetails &&
               Array.isArray(quote.projectComplexities.additionalCostDetails) &&
               quote.projectComplexities.additionalCostDetails.some(cost => (cost.cost || 0) > 0)) ? `
              <div class="variable-costs-section">
                <div class="variable-costs-header">
                  <span style="font-size: 24px;">💰</span>
                  <h2>עלויות משתנות</h2>
                </div>
                
                <div class="variable-costs-content">
                  ${quote.projectComplexities.additionalCostDetails
                    .filter(cost => (cost.cost || 0) > 0)
                    .map((cost, index) => {
                      const emojis = ['📦', '🚚', '🏗️', '🧹', '🔧'];
                      const emoji = emojis[index % emojis.length];

                      return `
                        <div
                          class="variable-cost-item"
                          style="border-color: #d1d5db; background-color: #f9fafb;"
                        >
                          <div class="variable-cost-item-left">
                            <span style="font-size: 24px;">${emoji}</span>
                            <span class="variable-cost-item-desc" style="color: #111827;">
                              ${cost.description || 'עלות נוספת'}
                            </span>
                          </div>
                          <div class="variable-cost-item-value" style="color: #111827;">
                            ₪${formatPrice(cost.cost || 0)}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  
                  <!-- סה"כ עלויות משתנות -->
                  <div class="variable-costs-total">
                    <span class="variable-costs-total-label">סה"כ עלויות משתנות:</span>
                    <div class="variable-costs-total-value">
                      ₪${formatPrice(quote.projectComplexities.additionalCostDetails
                        .reduce((sum, cost) => sum + (cost.cost || 0), 0))}
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            <!-- סיכום כללי -->
            <div class="final-summary">
              <h2>סיכום כולל</h2>
              <div class="final-grid">
                ${(quote.discount || quote.discountPercent) > 0 || (quote.priceIncrease || 0) > 0 ? `
                  <div class="final-item">
                    <div class="final-label">סה"כ מחיר בסיס</div>
                    <div class="final-value">₪${formatPrice(quote.totalAmount || 0)}</div>
                  </div>
                ` : ''}
                ${(quote.priceIncrease || 0) > 0 ? `
                  <div class="final-item">
                    <div class="final-label">תוספת מחיר (+${quote.priceIncrease}%)</div>
                    <div class="final-value">₪${formatPrice((quote.totalAmount || 0) * ((quote.priceIncrease || 0) / 100))}</div>
                  </div>
                ` : ''}
                ${(quote.discount || quote.discountPercent) > 0 ? `
                  <div class="final-item">
                    <div class="final-label">הנחה (-${quote.discount || quote.discountPercent}%)</div>
                    <div class="final-value">-₪${formatPrice((quote.totalAmount || 0) * ((quote.discount || quote.discountPercent) / 100))}</div>
                  </div>
                ` : ''}
                <div class="final-item">
                  <div class="final-label">סה"כ לתשלום</div>
                  <div class="final-value">₪${formatPrice(quote.finalAmount || 0)}</div>
                </div>
                <div class="final-item">
                  <div class="final-label">סה"כ פריטים</div>
                  <div class="final-value">${formatPrice(
                    // Count regular items
                    (quote.items || [])
                      .filter(item => item.source !== 'paint_plaster_category_summary')
                      .reduce((sum, item) => {
                        if (item.unit === "יחידה") {
                          return sum + (Number(item.quantity) || 1);
                        }
                        return sum + 1;
                      }, 0) +
                    // Add additional costs count
                    ((quote.projectComplexities?.additionalCostDetails || [])
                      .filter(cost => (cost.cost || 0) > 0)
                      .length)
                  )}</div>
                </div>
              </div>
            </div>
            
            <!-- תנאי תשלום -->
            ${quote.paymentTerms && quote.paymentTerms.length > 0 ? `
              <div class="payment-terms">
                <div class="payment-terms-header">
                  <div class="payment-terms-title">תנאי תשלום</div>
                </div>
                <div class="payment-terms-content">
                  ${quote.paymentTerms.map(term => {
                    const finalAmount = quote.finalAmount || 0;
                    const termAmount = Math.round((finalAmount * (term.percentage || 0)) / 100);

                    // Check if this payment is approval-dependent and if quote is not yet approved
                    const isAwaitingApproval = isApprovalDependent(term.milestone) && !quote.approved_at && !term.paymentDate;

                    return `
                      <div class="payment-term">
                        <div class="term-milestone">${term.milestone || ''}</div>
                        <div class="term-details">
                          <div class="term-percentage">${term.percentage || 0}%</div>
                          <div class="term-amount">₪${formatPrice(termAmount)}</div>
                          ${isAwaitingApproval ? `
                            <div class="term-date" style="color: #9333ea; font-weight: 600;">תאריך אישור ההצעה</div>
                          ` : term.paymentDate ? `
                            <div class="term-date">${format(new Date(term.paymentDate), 'd/M/yyyy', { locale: he })}</div>
                          ` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- התחייבויות -->
            <div class="commitments-wrapper">
              <div class="commitments-grid">
                ${quote.companyInfo?.contractorCommitments ? `
                  <div class="commitment-card contractor-commitment-card">
                    <div class="commitment-header contractor-commitment-header">
                      <span class="commitment-icon">👷</span>
                      <h3 class="commitment-title contractor-commitment-title">התחייבויות הקבלן</h3>
                    </div>
                    <div class="commitment-content contractor-commitment-content">
                      ${quote.companyInfo.contractorCommitments}
                    </div>
                  </div>
                ` : ''}

                ${quote.companyInfo?.clientCommitments ? `
                  <div class="commitment-card client-commitment-card">
                    <div class="commitment-header client-commitment-header">
                      <span class="commitment-icon">✅</span>
                      <h3 class="commitment-title client-commitment-title">התחייבויות הלקוח</h3>
                    </div>
                    <div class="commitment-content client-commitment-content">
                      ${quote.companyInfo.clientCommitments}
                    </div>
                  </div>
                ` : ''}
              </div>

              ${(quote.companyInfo?.contractorCommitments || quote.companyInfo?.clientCommitments) ? `
                <div class="legal-note">
                  <p class="text-xs text-gray-600 text-center">
                    * התחייבויות אלו מהוות חלק בלתי נפרד מהצעת המחיר ומחייבות את שני הצדדים
                  </p>
                </div>
              ` : ''}
            </div>

            <!-- אזור חתימות -->
            <div class="signature-section">
              <div class="signature-section-title">חתימות</div>
              <div class="signatures-grid">
                <div class="signature-box">
                  <div class="signature-label">חתימת הקבלן</div>
                  <div class="signature-line"></div>
                  <div class="signature-date-line">תאריך: ___/___/______</div>
                </div>
                <div class="signature-box">
                  <div class="signature-label">חתימת הלקוח</div>
                  <div class="signature-line"></div>
                  <div class="signature-date-line">תאריך: ___/___/______</div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="quote-footer">
              <p class="text-sm text-gray-600 mb-2">
                הצעת מחיר זו בתוקף ל-30 יום מיום הנפקתה
              </p>
              ${quote.companyInfo?.phone ? `
                <p class="text-sm text-gray-700">
                  <strong>טלפון:</strong> ${quote.companyInfo.phone}
                </p>
              ` : ''}
              ${quote.companyInfo?.email ? `
                <p class="text-sm text-gray-700">
                  <strong>אימייל:</strong> ${quote.companyInfo.email}
                </p>
              ` : ''}
              ${quote.companyInfo?.website ? `
                <p class="text-sm text-gray-700">
                  <strong>אתר:</strong> ${quote.companyInfo.website}
                </p>
              ` : ''}
            </div>
          </div>
        </body>
        </html>
      `
    }} />
  );
}
