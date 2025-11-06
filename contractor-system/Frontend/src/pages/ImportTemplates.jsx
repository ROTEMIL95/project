import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

export default function ImportTemplates() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setResults([]);
    setError(null);
  };

  const simulateProcessing = async (file) => {
    // פונקציה מדמה שאינה משתמשת בשום אינטגרציה חיצונית
    return new Promise((resolve) => {
      setTimeout(() => {
        // נדמה עיבוד מוצלח של קובץ
        const mockTemplate = {
          name: file.name.split('.')[0] || "תבנית חדשה",
          category: "שיפוץ כללי",
          items: [
            {
              name: "ריצוף פורצלן",
              description: "ריצוף פורצלן 60x60",
              quantity: 1,
              unit: "מ\"ר",
              price: 180
            },
            {
              name: "צבע קירות",
              description: "צביעת קירות בגוון לבחירה",
              quantity: 1,
              unit: "מ\"ר", 
              price: 25
            },
            {
              name: "נקודת חשמל",
              description: "התקנת נקודת חשמל חדשה",
              quantity: 1,
              unit: "יחידה",
              price: 150
            }
          ]
        };

        resolve({
          fileName: file.name,
          status: "success",
          data: mockTemplate,
          error: null
        });
      }, 1000); // דימוי זמן עיבוד של שנייה אחת
    });
  };

  const handleImport = async () => {
    if (files.length === 0) {
      setError("נא לבחור לפחות קובץ אחד");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResults([]);
    setError(null);

    try {
      const processedResults = [];
      
      for (let i = 0; i < files.length; i++) {
        const result = await simulateProcessing(files[i]);
        processedResults.push(result);
        setProgress(((i + 1) / files.length) * 100);
      }

      setResults(processedResults);

      // אם הכל עבר בהצלחה, מעבירים לעמוד התבניות אחרי 2 שניות
      if (processedResults.every(r => r.status === "success")) {
        setTimeout(() => {
          navigate(createPageUrl('QuoteTemplates'));
        }, 2000);
      }
    } catch (error) {
      setError("אירעה שגיאה בתהליך הייבוא: " + (error.message || "שגיאה לא ידועה"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ייבוא תבניות מאקסל</h1>
          <p className="mt-1 text-gray-500">העלה קבצי אקסל כדי לייבא תבניות למערכת</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>העלאת קבצים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                onChange={handleFileChange}
                className="max-w-md"
              />
              <Button 
                onClick={handleImport}
                disabled={files.length === 0 || processing}
              >
                <Upload className="h-4 w-4 ml-2" />
                התחל ייבוא
              </Button>
            </div>

            {processing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">מעבד קבצים...</span>
                  <span className="text-sm font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {results.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם הקובץ</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>פרטים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        {result.fileName}
                      </TableCell>
                      <TableCell>
                        {result.status === "success" ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>ייבוא הצליח</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>ייבוא נכשל</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.status === "success" 
                          ? `יובאו ${result.data?.items?.length || 0} פריטים` 
                          : result.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הנחיות לייבוא</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">הערה חשובה:</h3>
              <Alert>
                <p className="font-semibold">במצב הדמו הנוכחי, כל קובץ שתעלה ייובא בהצלחה עם נתוני דוגמה קבועים.</p>
                <p className="mt-1">בגרסה המלאה, הנתונים יקראו מתוך הקובץ לפי המבנה המתואר מטה.</p>
              </Alert>
            </div>

            <div className="mt-4">
              <h3 className="font-medium mb-2">מבנה הקובץ הנדרש:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>הקובץ יכול להיות בפורמט Excel (.xlsx, .xls) או CSV</li>
                <li>יש ליצור גיליון אחד עם הנתונים</li>
                <li>שורה ראשונה צריכה להכיל כותרות עמודות</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">עמודות נדרשות:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>פריט (item) - שם הפריט</li>
                <li>תיאור (description) - תיאור הפריט</li>
                <li>קטגוריה (category) - קטגוריית הפריט</li>
                <li>כמות (quantity) - כמות ברירת מחדל</li>
                <li>יחידה (unit) - יחידת מידה</li>
                <li>מחיר (price) - מחיר ליחידה</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">דוגמה למבנה:</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-xs">
{`item,description,category,quantity,unit,price
ריצוף פורצלן,ריצוף פורצלן 60x60,ריצוף,1,מ"ר,180
צבע קירות,צביעת קירות בגוון לבחירה,צבע,1,מ"ר,25
נקודת חשמל,נקודת חשמל חדשה,חשמל,1,יחידה,150`}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}