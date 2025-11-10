
import React, { createContext, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

const UserContext = createContext({ user: null, loading: true, error: null, isOnline: true, refresh: () => {} });

export const UserProvider = ({ children }) => {
  // Use Zustand store instead of useSafeUser hook
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const error = useUserStore((state) => state.error);
  const isOnline = useUserStore((state) => state.isOnline);
  const refresh = useUserStore((state) => state.refresh);

  // Listen for user data updates and refresh
  useEffect(() => {
    const handleUserDataUpdate = () => {
      refresh(); // Reload user data from database
    };

    window.addEventListener('user-data-updated', handleUserDataUpdate);
    return () => window.removeEventListener('user-data-updated', handleUserDataUpdate);
  }, [refresh]);

  // Ensure disabled accounts are blocked when we have connectivity/user data
  useEffect(() => {
    if (!loading && user && user.isActive === false) {
      alert('החשבון שלך הושבת. אנא צור קשר עם מנהל המערכת.');
      supabase.auth.signOut().finally(() => {
        window.location.href = '/login';
      });
    }
  }, [loading, user]);

  return (
    <UserContext.Provider value={{ user, loading, error, isOnline, refresh }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
