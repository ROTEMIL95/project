
// יוטיליטי להמרת HTML ל-PDF וטיפול בהורדת קבצים

export const downloadPDF = (filename, content) => {
  // יצירת סגנונות מותאמים להדפסה
  const printStyles = `
    @page {
      size: A4;
      margin: 1cm;
    }
    body {
      font-family: Arial, sans-serif;
      direction: rtl;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px;
      text-align: right;
    }
    th {
      background-color: #f9fafb;
      font-weight: bold;
    }
  `;
  
  // יצירת חלון הדפסה חדש
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>${filename}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // מתן זמן לדפדפן לטעון את התוכן
  setTimeout(() => {
    printWindow.print();
    // חלק מהדפדפנים יסגרו את החלון אוטומטית אחרי ההדפסה
    // אחרים ישאירו אותו פתוח לשמירה כPDF
  }, 500);
};

// הוספת ייצוא ברירת מחדל
const htmlToPdf = {
  downloadPDF
};

export default htmlToPdf;
