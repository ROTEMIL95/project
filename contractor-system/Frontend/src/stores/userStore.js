import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { userAPI } from '@/lib/api';

const CACHE_KEY = "b44_user_cache_v1";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const loadFromCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveToCache = (user) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(user || null));
  } catch {
    // Ignore cache errors
  }
};

export const useUserStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  attempts: 0,
  initialized: false,

  // Actions
  setUser: (user) => {
    set({ user });
    saveToCache(user);
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setAttempts: (attempts) => set({ attempts }),

  // Clear user data (on logout)
  clearUser: () => {
    set({
      user: null,
      error: null,
      loading: false
    });
    saveToCache(null);
  },

  // Fetch user from backend
  fetchUser: async () => {
    const state = get();
    set({ loading: true, error: null, attempts: 0 });

    // If offline, try to load from cache
    if (!navigator.onLine) {
      const cached = loadFromCache();
      if (cached) {
        set({ user: cached, loading: false });
      } else {
        set({ user: null, loading: false });
      }
      return;
    }

    // Retry logic
    for (let i = 0; i < MAX_RETRIES; i++) {
      set({ attempts: i + 1 });

      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        // If no session, user is not logged in
        if (!session || !session.access_token) {
          set({
            user: null,
            error: null,
            loading: false,
            initialized: true
          });
          saveToCache(null);
          return;
        }

        const supabaseUser = session.user;

        // Load user profile from backend API
        let profileData = null;
        if (supabaseUser) {
          try {
            profileData = await userAPI.me();

            if (!profileData) {
              console.warn('[userStore] Profile is NULL from backend API', supabaseUser.id);
            }
          } catch (profileError) {
            console.error('[userStore] Failed to load profile:', profileError.message || profileError);
          }
        }

        // Transform to app user format
        const user = supabaseUser ? {
          id: supabaseUser.id,
          email: supabaseUser.email,
          full_name: profileData?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email,
          phone: profileData?.phone || supabaseUser.user_metadata?.phone || '',
          role: profileData?.role || 'user',
          isActive: profileData?.is_active !== false,
          created_at: supabaseUser.created_at,
          user_metadata: {
            paintItems: profileData?.paint_items || [],
            tilingItems: profileData?.tiling_items || [],
            roomEstimates: profileData?.room_estimates || [],
            paintUserDefaults: profileData?.paint_user_defaults || {},
            tilingUserDefaults: profileData?.tiling_user_defaults || {},
            customPaintTypes: profileData?.custom_paint_types || null,
            customPlasterTypes: profileData?.custom_plaster_types || null,
            constructionDefaults: profileData?.construction_defaults || {},
            constructionSubcontractorItems: profileData?.construction_subcontractor_items || [],
            electricalDefaults: profileData?.electrical_defaults || {},
            electricalSubcontractorItems: profileData?.electrical_subcontractor_items || [],
            plumbingDefaults: profileData?.plumbing_defaults || {},
            plumbingSubcontractorItems: profileData?.plumbing_subcontractor_items || [],
            demolitionItems: profileData?.demolition_items || [],
            demolitionDefaults: profileData?.demolition_defaults || {},
            // ✅ ADD: Missing commitment and company data for quotes
            contractorCommitments: profileData?.contractor_commitments || '',
            clientCommitments: profileData?.client_commitments || '',
            companyInfo: profileData?.company_info || {},
            categoryCommitments: profileData?.category_commitments || {},
            categoryActiveMap: profileData?.category_active_map || {},
            tilingWorkTypes: profileData?.tiling_work_types || [],
            defaultPaymentTerms: profileData?.default_payment_terms || []
          }
        } : null;

        set({
          user,
          error: null,
          loading: false,
          initialized: true
        });
        saveToCache(user);
        return;

      } catch (err) {
        const msg = (err && (err.message || err.toString())) || "Unknown error";
        const isNetwork = msg.toLowerCase().includes("network");
        const looksLikeUnauth = msg.toLowerCase().includes("not logged") ||
                                msg.toLowerCase().includes("unauth") ||
                                msg.toLowerCase().includes("session");

        if (looksLikeUnauth) {
          set({
            user: null,
            error: null,
            loading: false,
            initialized: true
          });
          saveToCache(null);
          return;
        }

        if (i < MAX_RETRIES - 1 && isNetwork) {
          await sleep(RETRY_DELAY_MS * (i + 1));
          continue;
        } else {
          // Last attempt failed
          const cached = loadFromCache();
          if (cached) {
            set({ user: cached, error: null, loading: false, initialized: true });
          } else {
            set({ user: null, error: { message: msg }, loading: false, initialized: true });
          }
          return;
        }
      }
    }
  },

  // Initialize the store
  initialize: () => {
    const state = get();
    if (state.initialized) return;

    // Initial fetch
    get().fetchUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only fetch on actual sign in, not on token refresh
      if (event === 'SIGNED_IN' && !get().user) {
        // Only fetch if we don't have a user yet (initial sign in)
        get().fetchUser();
      } else if (event === 'SIGNED_OUT') {
        get().clearUser();
      }
      // Ignore TOKEN_REFRESHED and other events to prevent unnecessary refetches
    });

    // Listen for online/offline events
    const onOnline = () => {
      set({ isOnline: true });
      // Don't auto-fetch - user can manually refresh if needed
    };

    const onOffline = () => {
      set({ isOnline: false });
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Cleanup function (not used in Zustand but good practice)
    set({ initialized: true });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  },

  // Manual refresh
  refresh: () => {
    get().fetchUser();
  },
}));

// Auto-initialize on first import
useUserStore.getState().initialize();
