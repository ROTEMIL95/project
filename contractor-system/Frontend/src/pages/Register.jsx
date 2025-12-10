import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, UserPlus, Loader2, Hammer, CheckCircle, Shield, Zap, BarChart, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    <div className="min-h-screen flex" dir="rtl">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-[size:40px_40px]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]" />
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <div className="mb-8">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl">
              <Hammer className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-center mb-4">התחל עכשיו בחינם</h1>
            <p className="text-xl text-center text-blue-100">הצטרף לאלפי קבלנים שמנהלים את העסק בצורה חכמה</p>
          </div>

          {/* Benefits */}
          <div className="mt-12 space-y-8 max-w-md">
            {[
              {
                icon: Zap,
                title: 'התחל תוך דקות',
                text: 'הגדר את המערכת ויצירת הצעת המחיר הראשונה תוך פחות מ-5 דקות'
              },
              {
                icon: Shield,
                title: 'בטוח ומאובטח',
                text: 'הנתונים שלך מוצפנים ומוגנים ברמה הגבוהה ביותר'
              },
              {
                icon: BarChart,
                title: 'דוחות מתקדמים',
                text: 'עקוב אחר הביצועים שלך עם דוחות ואנליטיקות בזמן אמת'
              }
            ].map((benefit, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-blue-200" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-white/80 text-sm">{benefit.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="mt-12 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-100">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">למעלה מ-500 קבלנים כבר משתמשים במערכת</span>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/5 rounded-full" />
      </div>

      {/* Left Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo/Brand - Mobile Only */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
              <Hammer className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">מערכת ניהול קבלנים</h1>
          </div>

          <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-3xl font-bold text-gray-900 text-center">
                צור חשבון חדש
              </CardTitle>
              <CardDescription className="text-center text-base text-gray-600">
                הצטרף אלינו והתחל לנהל את העסק שלך בצורה מקצועית
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                    שם מלא
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="ישראל ישראלי"
                    value={formData.full_name}
                    onChange={handleChange}
                    className={`h-11 pr-4 text-base transition-all ${
                      errors.full_name
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    disabled={loading}
                    dir="rtl"
                  />
                  {errors.full_name && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5 justify-end animate-shake">
                      <span>{errors.full_name}</span>
                      <AlertCircle className="w-4 h-4" />
                    </p>
                  )}
                </div>

                {/* Email & Phone - Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      אימייל
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={`h-11 pr-4 text-base transition-all ${
                        errors.email
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                      disabled={loading}
                      dir="ltr"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 flex items-center gap-1.5 justify-end animate-shake">
                        <span>{errors.email}</span>
                        <AlertCircle className="w-4 h-4" />
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      טלפון
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="050-1234567"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`h-11 pr-4 text-base transition-all ${
                        errors.phone
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                      disabled={loading}
                      dir="ltr"
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600 flex items-center gap-1.5 justify-end animate-shake">
                        <span>{errors.phone}</span>
                        <AlertCircle className="w-4 h-4" />
                      </p>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    סיסמה
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="לפחות 8 תווים"
                      value={formData.password}
                      onChange={handleChange}
                      className={`h-11 pr-4 pl-12 text-base transition-all ${
                        errors.password
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                      disabled={loading}
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5 justify-end animate-shake">
                      <span>{errors.password}</span>
                      <AlertCircle className="w-4 h-4" />
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    אימות סיסמה
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="הזן את הסיסמה שוב"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`h-11 pr-4 pl-12 text-base transition-all ${
                        errors.confirmPassword
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                      disabled={loading}
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5 justify-end animate-shake">
                      <span>{errors.confirmPassword}</span>
                      <AlertCircle className="w-4 h-4" />
                    </p>
                  )}
                </div>

                {/* Terms */}
                <p className="text-xs text-gray-600 text-center pt-2">
                  בהרשמה אתה מסכים ל
                  <Link to="/terms" className="text-indigo-600 hover:underline mx-1">תנאי השימוש</Link>
                  ול
                  <Link to="/privacy" className="text-indigo-600 hover:underline mx-1">מדיניות הפרטיות</Link>
                </p>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      <span>נרשם...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 ml-2" />
                      <span>הירשם עכשיו</span>
                    </>
                  )}
                </Button>

                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">
                      כבר יש לך חשבון?
                    </span>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="w-full"
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-base font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  >
                    התחבר לחשבון קיים
                  </Button>
                </Link>
              </CardFooter>
            </form>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600 mt-8">
            © 2024 מערכת ניהול קבלנים. כל הזכויות שמורות.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        .bg-grid-slate-100 {
          background-image: linear-gradient(to right, rgb(241 245 249 / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(241 245 249 / 0.3) 1px, transparent 1px);
        }

        .bg-grid-white\/\[0\.05\] {
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        }
      `}</style>
    </div>
  );
};

export default Register;
