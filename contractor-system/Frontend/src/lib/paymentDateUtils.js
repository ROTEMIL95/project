/**
 * Utility functions for payment date calculations
 */

/**
 * Check if a payment term is approval-dependent based on its milestone description
 * @param {string} milestone - The milestone description
 * @returns {boolean} - True if the payment depends on approval
 */
export const isApprovalDependent = (milestone) => {
  const text = (milestone || '').toLowerCase();
  return text.includes('אישור') || text.includes('חתימה');
};

/**
 * Recalculate payment dates based on project timeline and approval date
 * @param {Array} paymentTerms - Array of payment term objects
 * @param {string} projectStartDate - Project start date (ISO string or Date)
 * @param {string} projectEndDate - Project end date (ISO string or Date)
 * @param {string|null} approvalDate - Approval date (ISO string or Date), null if not approved
 * @returns {Array} - Updated payment terms with recalculated dates
 */
export const recalculatePaymentDates = (paymentTerms, projectStartDate, projectEndDate, approvalDate) => {
  if (!projectStartDate || !projectEndDate || !paymentTerms || paymentTerms.length === 0) {
    return paymentTerms;
  }

  const startDate = new Date(projectStartDate);
  const endDate = new Date(projectEndDate);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  return paymentTerms.map((term, index) => {
    const milestone = (term.milestone || '').toLowerCase();
    let calculatedDate;

    // Payment dependent on approval - only set date if approved
    if (milestone.includes('אישור') || milestone.includes('חתימה')) {
      calculatedDate = approvalDate ? new Date(approvalDate) : null;
    }
    // First payment (not approval-dependent)
    else if (index === 0 ||
             milestone.includes('מקדמה') ||
             milestone.includes('ראשון') ||
             milestone.includes('התחלה')) {
      calculatedDate = approvalDate ? new Date(approvalDate) : startDate;
    }
    // Last payment
    else if (index === paymentTerms.length - 1 ||
             milestone.includes('סופי') ||
             milestone.includes('סיום') ||
             milestone.includes('אחרון')) {
      calculatedDate = endDate;
    }
    // Middle payments - distributed evenly
    else {
      const interval = totalDays / (paymentTerms.length - 1);
      const daysToAdd = Math.round(interval * index);
      calculatedDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    }

    return {
      ...term,
      paymentDate: calculatedDate ? calculatedDate.toISOString() : null
    };
  });
};
