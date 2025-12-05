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
   * Clean up user metadata if JWT token is too large
   * This fixes corrupted tokens by removing all metadata and keeping only essentials
   */
  const cleanupUserMetadata = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.log('[Auth] No session found for cleanup');
        return;
      }

      const tokenSize = session.access_token.length;
      console.log('[Auth] Current token size:', tokenSize, 'chars');

      // If token is larger than 4KB, clean it up
      if (tokenSize > 4096) {
        console.warn('[Auth] 🧹 Token is too large, cleaning up user metadata...');

        // Keep only essential metadata
        const currentUser = session.user;
        const essentialMetadata = {
          full_name: currentUser.user_metadata?.full_name || '',
          phone: currentUser.user_metadata?.phone || '',
          email: currentUser.email,
        };

        console.log('[Auth] Updating user with essential metadata only:', essentialMetadata);

        // Update user with clean metadata
        const { error } = await supabase.auth.updateUser({
          data: essentialMetadata
        });

        if (error) {
          console.error('[Auth] Failed to cleanup metadata:', error);
          return;
        }

        console.log('[Auth] ✅ Metadata cleaned successfully');

        // Refresh session to get new clean token
        console.log('[Auth] Refreshing session to get new token...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('[Auth] Failed to refresh session:', refreshError);
          return;
        }

        if (refreshData?.session) {
          const newTokenSize = refreshData.session.access_token.length;
          console.log('[Auth] ✅ New token size after cleanup:', newTokenSize, 'chars');

          if (newTokenSize < tokenSize) {
            console.log('[Auth] 🎉 Successfully reduced token size by', tokenSize - newTokenSize, 'chars');
          } else {
            console.warn('[Auth] ⚠️ Token size did not decrease. The issue may be in app_metadata (requires Supabase admin access)');
          }
        }
      } else {
        console.log('[Auth] ✅ Token size is acceptable, no cleanup needed');
      }
    } catch (error) {
      console.error('[Auth] Error during metadata cleanup:', error);
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

        // Automatically clean up metadata if token is too large
        console.log('[Auth] User signed in, checking token size...');
        setTimeout(() => {
          cleanupUserMetadata();
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
