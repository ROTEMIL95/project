import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * סקירת סטטוס פרויקט "לחשב חכם"
 * 
 * מטרת המערכת:
 * מערכת לניהול הצעות מחיר לקבלני שיפוצים, המאפשרת יצירת הצעות מחיר מקצועיות במהירות וביעילות,
 * ניהול קטלוג מוצרים ושירותים, ומעקב אחר פרויקטים.
 */

export default function ProjectStatus() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">סקירת סטטוס פרויקט "לחשב חכם"</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>מודולים שהושלמו</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>דף בית (Dashboard)</strong> ✅
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>תצוגת נתונים סטטיסטיים על הצעות מחיר ופרויקטים</li>
                <li>גרפים ותרשימים להצגת מידע</li>
                <li>קישורים מהירים לפעולות נפוצות</li>
              </ul>
            </li>
            <li>
              <strong>תבניות הצעות מחיר</strong> ✅
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>הצגת רשימת תבניות</li>
                <li>אפשרות חיפוש וסינון</li>
                <li>קישור לייבוא תבניות</li>
              </ul>
            </li>
            <li>
              <strong>ייבוא מאקסל</strong> ✅
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>ממשק להעלאת קבצי אקסל</li>
                <li>הצגת סטטוס הייבוא</li>
                <li>הנחיות למבנה הקובץ הנדרש</li>
              </ul>
            </li>
            <li>
              <strong>קטלוג מוצרים ושירותים</strong> ✅
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>רשימת קטגוריות ופריטים</li>
                <li>אפשרויות חיפוס וסינון</li>
                <li>מידע על עלויות ורווחיות</li>
              </ul>
            </li>
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>מודולים בפיתוח</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>עריכת פריט בקטלוג</strong> ⚠️
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>המסך קיים אך לא הושלם</li>
                <li>נדרשת השלמה של פונקציונליות העריכה</li>
              </ul>
            </li>
            <li>
              <strong>עריכת תבנית הצעת מחיר</strong> ⚠️
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>טרם הושלם</li>
                <li>נדרש לבנות את ממשק העריכה המלא</li>
              </ul>
            </li>
            <li>
              <strong>יצירת הצעות מחיר</strong> ⚠️
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>קיים מסך בסיסי</li>
                <li>חסר מימוש של בחירת פריטים מהקטלוג</li>
                <li>חסר מימוש של חישובי מחירים וכמויות</li>
              </ul>
            </li>
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>מודולים שטרם פותחו</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>ניהול לקוחות</strong> ❌
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>טרם נבנה מסך ניהול לקוחות</li>
                <li>נדרש ממשק להוספה, עריכה וחיפוש לקוחות</li>
              </ul>
            </li>
            <li>
              <strong>ניהול פרויקטים</strong> ❌
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>טרם נבנה מסך לניהול הפרויקטים</li>
                <li>נדרש ממשק למעקב אחר סטטוס פרויקטים</li>
                <li>דרושה יכולת לעדכן התקדמות והוצאות</li>
              </ul>
            </li>
            <li>
              <strong>הרשאות והגדרות משתמשים</strong> ❌
              <ul className="list-disc list-inside ml-5 text-sm text-gray-600">
                <li>טרם מומש מסך הרשאות וניהול משתמשים</li>
                <li>דרוש ניהול פרופילים והגדרות שונות</li>
              </ul>
            </li>
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>הערות ותובנות</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            <li>המערכת במצב עובד אך עם נתונים מדומים - נדרש לחבר למסד נתונים אמיתי</li>
            <li>חסר מימוש של לוגיקת החישובים העסקיים (הנחות, רווחיות, כמויות וכו')</li>
            <li>הוסר תפריט הצד לפי בקשה - יש לשקול הוספת תפריט עליון לניווט</li>
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>צעדים להמשך</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            <li>להשלים את המסכים החסרים לפי סדר העדיפויות</li>
            <li>לחבר את המערכת למסד נתונים</li>
            <li>לממש את לוגיקת החישובים העסקיים</li>
            <li>לשפר את הניווט במערכת</li>
            <li>להוסיף יכולות ייצוא ושיתוף של הצעות המחיר</li>
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>מסכים לפיתוח בעדיפות גבוהה</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>עריכת תבנית הצעות מחיר</strong> - להשלים את המסך כדי לאפשר יצירת תבניות מותאמות אישית</li>
            <li><strong>השלמת מסך יצירת הצעות מחיר</strong> - להשלים את הלוגיקה של בחירת פריטים וחישוב מחירים</li>
            <li><strong>מסך ניהול לקוחות</strong> - לאפשר ניהול מאגר הלקוחות</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}