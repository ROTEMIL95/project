import React from 'react';
import { User } from '@/api/entities';

// פונקציה שבודקת אם המשתמש פעיל לפני כל פעולה
export const checkUserActiveStatus = async () => {
  try {
    const userData = await User.me();
    
    if (userData.isActive === false) {
      alert('החשבון שלך הושבת. אנא צור קשר עם מנהל המערכת.');
      
      // נתק ונווט החוצה
      try {
        await User.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
      
      // ניתוב כפוי
      window.location.href = '/';
      throw new Error('User account is disabled');
    }
    
    return userData;
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