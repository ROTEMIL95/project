import React from 'react';
import QuoteToHTML from '@/components/quotes/QuoteToHTML';

export default function QuotePreviewSnapshot({ projectInfo, totals, selectedItems, companyInfo }) {
  // בניית אובייקט quote מלא לצורך התצוגה המקדימה
  const previewQuote = {
    projectName: projectInfo.projectName,
    clientName: projectInfo.clientName,
    clientEmail: projectInfo.clientEmail,
    clientPhone: projectInfo.clientPhone,
    projectAddress: projectInfo.projectAddress,
    projectType: projectInfo.projectType,
    items: selectedItems,
    totalAmount: totals.baseAmount,
    finalAmount: totals.total,
    companyInfo: companyInfo,
    created_date: new Date().toISOString(),
    generalStartDate: projectInfo.generalStartDate,
    workDays: projectInfo.workDays,
    generalEndDate: projectInfo.generalEndDate,
  };

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      {/* מסגרת חיצונית אלגנטית */}
      <div className="bg-gray-50 p-3 sm:p-4 md:p-6 lg:p-8 rounded-lg sm:rounded-xl md:rounded-2xl border border-gray-300 sm:border-2 shadow-lg sm:shadow-xl md:shadow-2xl">

        {/* המסמך עצמו - גובה מוגדל */}
        <div
          className="bg-white rounded-lg sm:rounded-xl shadow-xl sm:shadow-2xl overflow-hidden relative border border-gray-200 w-full max-w-full"
          style={{
            maxHeight: '400px'
          }}
        >
          {/* השתמש ב-QuoteToHTML הממשי */}
          <div style={{
            overflow: 'hidden',
            maxHeight: '400px',
            position: 'relative'
          }} className="w-full max-w-full">
            <div className="w-full max-w-full overflow-x-auto">
              <QuoteToHTML quote={previewQuote} />
            </div>

            {/* Gradient fade בתחתית */}
            <div
              className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, white)'
              }}
            />
          </div>
        </div>

        {/* אפקט "המסמך ממשיך" */}
        <div className="mt-3 sm:mt-4 md:mt-6 text-center">
          <div className="inline-block bg-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 rounded-full shadow-md border border-gray-300 sm:border-2">
            <span className="text-xs sm:text-sm text-gray-700 font-semibold">המסמך ממשיך...</span>
          </div>
        </div>

        {/* צל עמוק */}
        <div className="absolute inset-0 pointer-events-none hidden sm:block">
          <div className="absolute -bottom-3 left-6 right-6 h-6 bg-black/10 blur-xl rounded-b-2xl"></div>
        </div>
      </div>

      {/* טקסט הסבר - ללא אמוג'י */}
      <div className="text-center mt-3 sm:mt-4 md:mt-6">
        <p className="text-xs sm:text-sm md:text-base text-gray-600">
          זוהי תצוגה מקדימה של הצעת המחיר שלך. לחץ על הכפתור מטה לצפייה מלאה.
        </p>
      </div>
    </div>
  );
}