import React, { useState, useEffect } from 'react';
import { Quote } from '@/api/entities';
import QuoteToHTML from '@/components/quotes/QuoteToHTML';

export default function QuotePrint() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAndPrint = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const quoteId = urlParams.get('id');
        if (quoteId) {
          const fetchedQuote = await Quote.filter({ id: quoteId }).then(q => q[0]);
          if (fetchedQuote) {
            setQuote(fetchedQuote);
          }
        }
      } catch (error) {
        console.error("Error loading quote for printing:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAndPrint();
  }, []);

  useEffect(() => {
    if (quote && !loading) {
      // Give the browser a moment to render before printing
      const timer = setTimeout(() => {
        window.print();
        // Optional: close the window after printing is done or cancelled
        window.onafterprint = () => window.close();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [quote, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">מכין את ההצעה להדפסה...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
        <div className="flex h-screen items-center justify-center" dir="rtl">
            <p className="text-red-500 text-xl">שגיאה: לא נמצאה הצעת מחיר.</p>
        </div>
    );
  }

  return (
    <div>
        <style>{`
            @media print {
                body, html {
                    margin: 0;
                    padding: 0;
                }
                body * {
                    visibility: hidden;
                }
                #print-section, #print-section * {
                    visibility: visible;
                }
                #print-section {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
                @page {
                    size: A4;
                    margin: 20mm;
                }
            }
        `}</style>
        <div id="print-section">
            <QuoteToHTML quote={quote} />
        </div>
    </div>
  );
}