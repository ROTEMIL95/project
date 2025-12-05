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
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  /**
   * Check JWT token size and warn user if it's too large
   * Large tokens (>4KB) cannot be cleaned automatically due to CORS/header size limits
   */
  const checkTokenSize = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.log('[Auth] No session found for token check');
        return;
      }

      const tokenSize = session.access_token.length;
      console.log('[Auth] Current token size:', tokenSize, 'chars');

      // If token is larger than 4KB, it needs manual cleanup
      if (tokenSize > 4096) {
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('❌ JWT TOKEN IS TOO LARGE - MANUAL FIX REQUIRED');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error(`Current token size: ${tokenSize} chars (normal: ~1,400 chars)`);
        console.error(`This is ${Math.round(tokenSize / 1400)}x larger than normal!`);
        console.error('');
        console.error('OPTION 1: Manual cleanup via Supabase Dashboard (recommended)');
        console.error('-----------------------------------------------------------');
        console.error('1. Go to: https://app.supabase.com/project/tmyrplrwblqnusgctebp/auth/users');
        console.error('2. Find your user by email');
        console.error('3. Click on user → Edit user → Raw User Meta Data');
        console.error('4. Delete unnecessary data, keep only: full_name, phone, email');
        console.error('5. Save and log in again');
        console.error('');
        console.error('OPTION 2: Contact support');
        console.error('-------------------------');
        console.error(`Email: support@example.com`);
        console.error(`Include: User email + Token size (${tokenSize} chars)`);
        console.error('');
        console.error('⚠️ TEMPORARY: System will allow access but may have issues');
        console.error('═══════════════════════════════════════════════════════════════');
      } else {
        console.log('[Auth] ✅ Token size is acceptable');
      }
    } catch (error) {
      console.error('[Auth] Error during token size check:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Set justLoggedIn flag when user signs in
      if (event === 'SIGNED_IN') {
        setJustLoggedIn(true);
        // Store in sessionStorage so api.js can access it
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('justLoggedIn', Date.now().toString());
        }
        // Clear the flag after 10 seconds
        setTimeout(() => {
          setJustLoggedIn(false);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('justLoggedIn');
          }
        }, 10000);

        // Check token size after login
        console.log('[Auth] User signed in, checking token size...');
        setTimeout(() => {
          checkTokenSize();
        }, 1000); // Wait 1 second for session to stabilize
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    loading,
    justLoggedIn,
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
