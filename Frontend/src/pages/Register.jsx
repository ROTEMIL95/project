import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name) {
      newErrors.full_name = 'נא להזין שם מלא';
    }

    if (!formData.email) {
      newErrors.email = 'נא להזין כתובת אימייל';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    if (!formData.phone) {
      newErrors.phone = 'נא להזין מספר טלפון';
    } else if (!/^0\d{1,2}-?\d{7}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }

    if (!formData.password) {
      newErrors.password = 'נא להזין סיסמה';
    } else if (formData.password.length < 8) {
      newErrors.password = 'הסיסמה חייבת להכיל לפחות 8 תווים';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'נא לאשר את הסיסמה';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'הסיסמאות אינן תואמות';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        {
          full_name: formData.full_name,
          phone: formData.phone
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        // Email confirmation required
        toast.success('נרשמת בהצלחה! נא לאשר את כתובת האימייל שלך.');
        navigate('/login');
        return;
      }

      toast.success('נרשמת בהצלחה! ברוך הבא למערכת.');

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'שגיאה ברישום. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">הרשמה למערכת</CardTitle>
          <CardDescription className="text-right">
            צור חשבון חדש כדי להתחיל להשתמש במערכת
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-right block">שם מלא</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="ישראל ישראלי"
                value={formData.full_name}
                onChange={handleChange}
                className={errors.full_name ? 'border-red-500' : ''}
                disabled={loading}
                dir="rtl"
              />
              {errors.full_name && (
                <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                  <span>{errors.full_name}</span>
                  <AlertCircle className="w-4 h-4" />
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-right block">אימייל</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'border-red-500' : ''}
                disabled={loading}
                dir="ltr"
              />
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                  <span>{errors.email}</span>
                  <AlertCircle className="w-4 h-4" />
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-right block">טלפון</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="050-1234567"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? 'border-red-500' : ''}
                disabled={loading}
                dir="ltr"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                  <span>{errors.phone}</span>
                  <AlertCircle className="w-4 h-4" />
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-right block">סיסמה</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="לפחות 8 תווים"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'border-red-500' : ''}
                disabled={loading}
                dir="rtl"
              />
              {errors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                  <span>{errors.password}</span>
                  <AlertCircle className="w-4 h-4" />
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-right block">אימות סיסמה</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="הזן את הסיסמה שוב"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'border-red-500' : ''}
                disabled={loading}
                dir="rtl"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 flex items-center gap-1 justify-end">
                  <span>{errors.confirmPassword}</span>
                  <AlertCircle className="w-4 h-4" />
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span>נרשם...</span>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                </>
              ) : (
                <>
                  <span>הירשם</span>
                  <UserPlus className="w-4 h-4 mr-2" />
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              כבר יש לך חשבון?{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                התחבר כאן
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Register;
