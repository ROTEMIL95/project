import React, { useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import QuoteToHTML from '@/components/quotes/QuoteToHTML';

export default function QuotePreviewSnapshot({ projectInfo, totals, selectedItems, companyInfo, discountPercent = 0, priceIncrease = 0 }) {
  const iframeRef = useRef(null);
  const rootRef = useRef(null); // ✅ שמירת root כדי לא ליצור אותו מחדש

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

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
        discount: discountPercent, // QuoteToHTML expects 'discount'
        discountPercent: discountPercent, // Also include for consistency
        priceIncrease: priceIncrease,
        companyInfo: companyInfo,
        created_date: new Date().toISOString(),
        generalStartDate: projectInfo.generalStartDate,
        workDays: projectInfo.workDays,
        generalEndDate: projectInfo.generalEndDate,
        paymentTerms: projectInfo.paymentTerms,  // ✅ Added payment terms
        approved_at: projectInfo.approved_at,  // ✅ Added approval date
      };

      // ✅ צור root רק פעם אחת, אחר כך רק עדכן
      if (!rootRef.current) {
        // נקה את ה-iframe רק בפעם הראשונה
        iframeDoc.open();
        iframeDoc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><div id="root"></div></body></html>');
        iframeDoc.close();

        rootRef.current = createRoot(iframeDoc.getElementById('root'));
      }

      // רנדר את QuoteToHTML (יעדכן את התצוגה אם root כבר קיים)
      rootRef.current.render(<QuoteToHTML quote={previewQuote} />);
    }
  }, [selectedItems, totals, projectInfo, companyInfo, discountPercent, priceIncrease]);

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      {/* מסגרת חיצונית אלגנטית */}
      <div className="bg-gray-50 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl md:rounded-2xl border border-gray-300 sm:border-2 shadow-lg sm:shadow-xl md:shadow-2xl w-full max-w-full">

        {/* המסמך עצמו - גובה מוגדל */}
        <div
          className="bg-white rounded-lg sm:rounded-xl shadow-xl sm:shadow-2xl overflow-hidden relative border border-gray-200 w-full max-w-full"
          style={{
            height: '400px'
          }}
        >
          {/* השתמש ב-iframe לבידוד מלא */}
          <div style={{
            height: '571px',
            width: '142.86%',
            transform: 'scale(0.7)',
            transformOrigin: 'top right',
            overflow: 'hidden',
            position: 'absolute',
            right: 0,
            top: 0
          }}>
            <iframe
              ref={iframeRef}
              className="w-full border-0"
              style={{ minHeight: '100%', height: '100%' }}
              title="Quote Preview"
            />
          </div>

          {/* Gradient fade בתחתית */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(to bottom, transparent, white)'
            }}
          />
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