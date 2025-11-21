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
    <div className="relative">
      {/* מסגרת חיצונית אלגנטית */}
      <div className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-300 shadow-2xl">

        {/* המסמך עצמו - גובה מוגדל */}
        <div
          className="bg-white rounded-xl shadow-2xl overflow-hidden relative border border-gray-200"
          style={{
            maxHeight: '650px'
          }}
        >
          {/* השתמש ב-QuoteToHTML הממשי */}
          <div style={{
            overflow: 'hidden',
            maxHeight: '650px',
            position: 'relative'
          }}>
            <QuoteToHTML quote={previewQuote} />

            {/* Gradient fade בתחתית */}
            <div
              className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, white)'
              }}
            />
          </div>
        </div>

        {/* אפקט "המסמך ממשיך" */}
        <div className="mt-6 text-center">
          <div className="inline-block bg-white px-6 py-3 rounded-full shadow-md border-2 border-gray-300">
            <span className="text-sm text-gray-700 font-semibold">המסמך ממשיך...</span>
          </div>
        </div>

        {/* צל עמוק */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -bottom-3 left-6 right-6 h-6 bg-black/10 blur-xl rounded-b-2xl"></div>
        </div>
      </div>

      {/* טקסט הסבר - ללא אמוג'י */}
      <div className="text-center mt-6">
        <p className="text-base text-gray-600">
          זוהי תצוגה מקדימה של הצעת המחיר שלך. לחץ על הכפתור מטה לצפייה מלאה.
        </p>
      </div>
    </div>
  );
}