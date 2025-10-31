import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const CACHE_KEY = "b44_user_cache_v1";

/**
 * useSafeUser
 * - טוען את המשתמש עם מנגנון נסיונות חוזרים (retry)
 * - מזהה אופליין ומציג cache (אם קיים) במקום להפיל את האפליקציה
 * - לא "זורק" שגיאות החוצה – מחזיר error state בלבד
 * - משתמש ב-Supabase Auth במקום User.me()
 */
export default function useSafeUser(options = {}) {
  const {
    maxRetries = 3,
    retryDelayMs = 1000,
    enableCache = true,
    suppressConsole = false,
  } = options;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const abortRef = useRef(false);

  const loadFromCache = () => {
    if (!enableCache) return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const saveToCache = (u) => {
    if (!enableCache) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(u || null));
    } catch {}
  };

  const fetchUser = async () => {
    setLoading(true);
    setError(null);
    setAttempts(0);

    // אם אופליין – נסה cache ורק אז עצור
    if (!navigator.onLine) {
      const cached = loadFromCache();
      if (cached) {
        setUser(cached);
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    for (let i = 0; i < maxRetries && !abortRef.current; i++) {
      setAttempts(i + 1);
      try {
        // Use Supabase to get current user
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (abortRef.current) return;

        // Load user profile data from database
        let profileData = null;
        if (supabaseUser) {
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('auth_user_id', supabaseUser.id)
              .single();

            profileData = profile;
          } catch (profileError) {
            // If profile doesn't exist yet, continue with null profileData
            if (!suppressConsole) {
              console.warn('useSafeUser: Could not load user profile, continuing with auth data only');
            }
          }
        }

        // Transform Supabase user to our app's user format
        const u = supabaseUser ? {
          id: supabaseUser.id,
          email: supabaseUser.email,
          full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email,
          phone: supabaseUser.user_metadata?.phone || '',
          role: supabaseUser.user_metadata?.role || 'user',
          isActive: supabaseUser.user_metadata?.isActive !== false,
          created_at: supabaseUser.created_at,
          // Add user_metadata from user_profiles table
          user_metadata: {
            paintItems: profileData?.paint_items || [],
            tilingItems: profileData?.tiling_items || [],
            roomEstimates: profileData?.room_estimates || [],
            paintUserDefaults: profileData?.paint_user_defaults || {},
            tilingUserDefaults: profileData?.tiling_user_defaults || {},
            customPaintTypes: profileData?.custom_paint_types || null,
            customPlasterTypes: profileData?.custom_plaster_types || null,
            // Construction category data
            constructionDefaults: profileData?.construction_defaults || {},
            constructionSubcontractorItems: profileData?.construction_subcontractor_items || [],
            // Electrical category data
            electricalDefaults: profileData?.electrical_defaults || {},
            electricalSubcontractorItems: profileData?.electrical_subcontractor_items || [],
            // Plumbing category data
            plumbingDefaults: profileData?.plumbing_defaults || {},
            plumbingSubcontractorItems: profileData?.plumbing_subcontractor_items || [],
          }
        } : null;

        setUser(u);
        setError(null);
        saveToCache(u);
        setLoading(false);
        return;
      } catch (err) {
        const msg = (err && (err.message || err.toString())) || "Unknown error";
        const isNetwork = msg.toLowerCase().includes("network");
        // אם זו לא שגיאת רשת אלא "לא מחובר" – אל תנסה שוב, פשוט החזר null
        const looksLikeUnauth = msg.toLowerCase().includes("not logged") || msg.toLowerCase().includes("unauth") || msg.toLowerCase().includes("session");
        if (!suppressConsole) {
          console.warn(`useSafeUser: attempt ${i + 1}/${maxRetries} failed: ${msg}`);
        }
        if (looksLikeUnauth) {
          setUser(null);
          setError(null); // לא מציגים כשגיאה כדי לא להפחיד משתמש
          setLoading(false);
          saveToCache(null);
          return;
        }
        if (i < maxRetries - 1 && isNetwork) {
          await sleep(retryDelayMs * (i + 1)); // backoff
          continue;
        } else {
          // ניסיון אחרון נכשל
          const cached = loadFromCache();
          if (cached) {
            setUser(cached);
            setError(null); // יש cache – לא מציגים error
          } else {
            setUser(null);
            setError({ message: msg });
          }
          setLoading(false);
          return;
        }
      }
    }
  };

  // טעינה ראשונית
  useEffect(() => {
    abortRef.current = false;
    fetchUser();
    return () => {
      abortRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // מאזיני אופליין/אונליין
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      // אם היינו בשגיאה/אופליין – ננסה לרענן אוטומטית
      fetchUser();
    };
    const onOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // רענון ידני
  const refresh = () => fetchUser();

  return { user, loading, error, isOnline, attempts, refresh };
}

export { useSafeUser as namedUseSafeUser };