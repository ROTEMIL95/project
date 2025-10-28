
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import useSafeUser from '@/components/utils/useSafeUser';

const UserContext = createContext({ user: null, loading: true, error: null, isOnline: true, refresh: () => {} });

export const UserProvider = ({ children }) => {
  const { user, loading, error, isOnline, refresh } = useSafeUser({ enableCache: true });

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
