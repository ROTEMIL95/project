import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/lib/entities';
import { createPageUrl } from '@/utils';
import { useUser } from '@/components/utils/UserContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminUserEdit() {
  const navigate = useNavigate();
  const { user: currentUser, loading: userLoading } = useUser();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'user',
    isActive: true,
    notes: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (userLoading) return;

      if (!currentUser) {
        navigate(createPageUrl('Login'));
        return;
      }

      if (currentUser.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }

      try {
        // שליפת ID המשתמש מה-URL
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');

        if (!userId) {
          setError('לא צוין מזהה משתמש');
          setLoading(false);
          return;
        }

        // שליפת פרטי המשתמש
        const userData = await User.get ? await User.get(userId) : null;
        if (!userData) {
          setError('משתמש לא נמצא');
          setLoading(false);
          return;
        }

        setUser(userData);
        setFormData({
          full_name: userData.full_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          role: userData.role || 'user',
          isActive: userData.isActive !== false,
          notes: userData.notes || ''
        });

      } catch (err) {
        console.error('שגיאה בטעינת נתוני המשתמש:', err);
        setError('שגיאה בטעינת נתוני המשתמש');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser, userLoading, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    // וולידציות בסיסיות
    if (!formData.full_name.trim()) {
      alert('שם מלא הוא שדה חובה');
      return;
    }
    
    if (!formData.email.trim()) {
      alert('אימייל הוא שדה חובה');
      return;
    }

    // בדיקה שלא משנים את התפקיד של עצמנו
    if (currentUser && user.id === currentUser.id && formData.role !== currentUser.role) {
      alert('לא ניתן לשנות את התפקיד של החשבון שלך');
      return;
    }

    setSaving(true);
    try {
      await User.update(user.id, {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        isActive: formData.isActive,
        notes: formData.notes.trim()
      });

      // חזרה לפרופיל המשתמש
      navigate(createPageUrl(`AdminUserProfile?id=${user.id}`));
    } catch (err) {
      console.error('שגיאה בשמירת נתוני המשתמש:', err);
      alert('אירעה שגיאה בשמירת הנתונים. נסה שוב.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">טוען נתוני משתמש...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-red-600">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">שגיאה</h2>
        <p>{error || 'לא ניתן לטעון את נתוני המשתמש'}</p>
        <Button 
          onClick={() => navigate(createPageUrl('AdminUsers'))} 
          className="mt-4"
          variant="outline"
        >
          חזור לרשימת המשתמשים
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl(`AdminUserProfile?id=${user.id}`))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">עריכת משתמש: {user.full_name || user.email}</h1>
          <p className="text-gray-500">עדכון פרטי המשתמש והגדרותיו</p>
        </div>
      </div>

      {/* הזהרה אם מעריכים את עצמנו */}
      {currentUser && user.id === currentUser.id && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            אתה עורך את החשבון שלך. שים לב שלא ניתן לשנות את התפקיד או להשבית את החשבון שלך.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>פרטי המשתמש</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* שם מלא */}
          <div className="space-y-2">
            <Label htmlFor="full_name">שם מלא *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="הכנס שם מלא"
            />
          </div>

          {/* אימייל */}
          <div className="space-y-2">
            <Label htmlFor="email">כתובת אימייל *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="הכנס כתובת אימייל"
            />
            <p className="text-xs text-amber-600">
              ⚠️ שינוי כתובת האימייל עלול להשפיע על יכולת ההתחברות של המשתמש למערכת
            </p>
          </div>

          {/* טלפון */}
          <div className="space-y-2">
            <Label htmlFor="phone">מספר טלפון</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="הכנס מספר טלפון"
            />
          </div>

          {/* תפקיד */}
          <div className="space-y-2">
            <Label htmlFor="role">תפקיד במערכת</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => handleInputChange('role', value)}
              disabled={currentUser && user.id === currentUser.id}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">משתמש רגיל</SelectItem>
                <SelectItem value="admin">מנהל מערכת</SelectItem>
              </SelectContent>
            </Select>
            {currentUser && user.id === currentUser.id && (
              <p className="text-xs text-gray-500">לא ניתן לשנות את התפקיד של החשבון שלך</p>
            )}
          </div>

          {/* סטטוס פעיל */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="isActive">חשבון פעיל</Label>
              <p className="text-sm text-gray-500">
                משתמש לא פעיל לא יוכל להתחבר למערכת
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              disabled={currentUser && user.id === currentUser.id}
            />
          </div>
          {currentUser && user.id === currentUser.id && (
            <p className="text-xs text-gray-500">לא ניתן להשבית את החשבון שלך</p>
          )}

          {/* הערות ניהוליות */}
          <div className="space-y-2">
            <Label htmlFor="notes">הערות ניהוליות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="הערות פנימיות למנהלי המערכת..."
              rows={3}
            />
            <p className="text-xs text-gray-500">
              הערות אלו נראות רק למנהלי המערכת ולא למשתמש עצמו
            </p>
          </div>
        </CardContent>
      </Card>

      {/* כפתורי פעולה */}
      <div className="flex justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={() => navigate(createPageUrl(`AdminUserProfile?id=${user.id}`))}
          disabled={saving}
        >
          ביטול
        </Button>
        <Button 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></div>
              שומר...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 ml-2" />
              שמור שינויים
            </>
          )}
        </Button>
      </div>
    </div>
  );
}