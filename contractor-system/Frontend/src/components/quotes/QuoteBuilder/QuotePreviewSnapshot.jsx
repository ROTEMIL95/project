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
      {/* מסגרת חיצונית עדינה */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
        
        {/* המסמך עצמו - חתוך בגובה */}
        <div 
          className="bg-white rounded-lg shadow-xl overflow-hidden relative"
          style={{ 
            maxHeight: '500px',
            transform: 'perspective(1200px) rotateX(0.5deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* השתמש ב-QuoteToHTML הממשי */}
          <div style={{ 
            overflow: 'hidden',
            maxHeight: '500px',
            position: 'relative'
          }}>
            <QuoteToHTML quote={previewQuote} />
            
            {/* Gradient fade בתחתית */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, white)'
              }}
            />
          </div>
        </div>

        {/* אפקט "המסמך ממשיך" */}
        <div className="mt-4 text-center">
          <div className="inline-block bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <span className="text-xs text-gray-600 font-medium">המסמך ממשיך...</span>
          </div>
        </div>

        {/* צל תלת-ממדי */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -bottom-2 left-4 right-4 h-4 bg-gradient-to-b from-transparent to-gray-300 blur-sm rounded-b-lg opacity-20"></div>
        </div>
      </div>

      {/* טקסט הסבר */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          💡 זוהי תצוגה מקדימה של הצעת המחיר שלך. לחץ על הכפתור מטה לצפייה מלאה.
        </p>
      </div>
    </div>
  );
}