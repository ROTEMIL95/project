import React from 'react';
import { supabase } from '@/lib/supabase';

// פונקציה שבודקת אם המשתמש פעיל לפני כל פעולה
export const checkUserActiveStatus = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    if (!user) throw new Error('No user found');
    
    // Check if user is active (from user_profiles table)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_active')
      .eq('auth_user_id', user.id)
      .single();
    
    if (profileError) throw profileError;
    
    if (profile?.is_active === false) {
      alert('החשבון שלך הושבת. אנא צור קשר עם מנהל המערכת.');
      
      // נתק ונווט החוצה
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Logout error:', error);
      }
      
      // ניתוב כפוי
      window.location.href = '/';
      throw new Error('User account is disabled');
    }
    
    return user;
  } catch (error) {
    // אם יש שגיאה בבדיקת המשתמש, תן לפלטפורמה לטפל
    throw error;
  }
};

// HOC (Higher Order Component) שעוטף קומפוננטים ובודק סטטוס
export const withUserGuard = (Component) => {
  return function GuardedComponent(props) {
    const [isChecking, setIsChecking] = React.useState(true);
    const [isAuthorized, setIsAuthorized] = React.useState(false);
    
    React.useEffect(() => {
      checkUserActiveStatus()
        .then(() => {
          setIsAuthorized(true);
        })
        .catch(() => {
          setIsAuthorized(false);
        })
        .finally(() => {
          setIsChecking(false);
        });
    }, []);
    
    if (isChecking) {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      );
    }
    
    if (!isAuthorized) {
      return null; // או הודעת שגיאה
    }
    
    return <Component {...props} />;
  };
};