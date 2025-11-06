import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ProfitGuard = ({ 
  currentProfitPercent, 
  currentTotalPrice, 
  recommendedPrice, 
  minimumProfitPercent = 30,
  onAcceptRecommended,
  onKeepOriginal,
  onCancel 
}) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(price);
  };

  const priceIncrease = recommendedPrice - currentTotalPrice;
  const increasePercent = ((priceIncrease / currentTotalPrice) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" dir="rtl">
      <Card className="w-full max-w-2xl bg-white shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                אזהרת רווחיות נמוכה
              </CardTitle>
              <p className="text-gray-600 mt-1">
                אחוז הרווח בהצעת המחיר נמוך מהמומלץ
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* מצב נוכחי */}
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-red-800">המצב הנוכחי:</h3>
              <Badge className="bg-red-100 text-red-800 border-red-300">
                רווח נמוך מדי
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">מחיר להצעה:</span>
                <div className="font-bold text-lg">{formatPrice(currentTotalPrice)}</div>
              </div>
              <div>
                <span className="text-gray-600">אחוז רווח נוכחי:</span>
                <div className="font-bold text-lg text-red-600">
                  {currentProfitPercent.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* המלצת המערכת */}
          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-green-800">המלצת המערכת:</h3>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                רווח {minimumProfitPercent}%
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">מחיר מומלץ:</span>
                <div className="font-bold text-lg text-green-600">{formatPrice(recommendedPrice)}</div>
              </div>
              <div>
                <span className="text-gray-600">הפרש מחיר:</span>
                <div className="font-bold text-lg">
                  +{formatPrice(priceIncrease)} ({increasePercent}%)
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <Calculator className="h-4 w-4" />
            <AlertDescription className="text-sm text-gray-600">
              <strong>הסבר:</strong> כדי להבטיח רווחיות מינימלית של {minimumProfitPercent}% על עבודה זו,
              מומלץ להעלות את מחיר ההצעה. אתה יכול לבחור לקבל את ההמלצה או להמשיך במחיר המקורי.
            </AlertDescription>
          </Alert>

          {/* כפתורי פעולה */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onAcceptRecommended}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <TrendingUp className="w-4 h-4 ml-2" />
              עדכן למחיר המומלץ ({formatPrice(recommendedPrice)})
            </Button>
            
            <Button
              onClick={onKeepOriginal}
              variant="outline"
              className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              המשך במחיר המקורי
            </Button>
            
            <Button
              onClick={onCancel}
              variant="outline"
              className="px-6"
            >
              ביטול
            </Button>
          </div>

          {/* הערה משפטית */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>הערה:</strong> המלצת המחיר מבוססת על חישוב אחוז רווח מינימלי. 
            ייתכן שתרצה לשקול גורמים נוספים כמו קשר עם הלקוח, מצב השוק, או השלמת לוח זמנים.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitGuard;