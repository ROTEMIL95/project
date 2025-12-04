import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Migration: Clean old localStorage from previous implementations
    const migrationKey = 'auth_migration_v1_completed';
    if (!localStorage.getItem(migrationKey)) {
      console.log('🧹 [AuthContext] Running auth migration: cleaning old localStorage...');

      // Remove old cookie auth flag
      localStorage.removeItem('cookie_auth_enabled');

      // Remove any old sb-* keys from previous auth attempts
      let removedCount = 0;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('cookie')) {
          console.log(`🧹 [AuthContext] Removing old key: ${key}`);
          localStorage.removeItem(key);
          removedCount++;
        }
      });

      localStorage.setItem(migrationKey, 'true');
      console.log(`✅ [AuthContext] Auth migration complete - removed ${removedCount} old keys`);
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    loading,
    signUp: async (email, password, metadata) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata, // Store full_name, phone, etc.
        },
      });
      return { data, error };
    },
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      return { error };
    },
    resetPassword: async (email) => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      return { data, error };
    },
    updateProfile: async (updates) => {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });
      return { data, error };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
