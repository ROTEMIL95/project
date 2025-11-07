# Auth Token Issue Fix - 404 Error on /api/auth/me

## Problem Summary
The frontend was calling `/api/auth/me` before the Supabase session/access_token was ready, resulting in:
- **404 "User not found"** errors in console
- API calls failing with "No active session" errors
- Inconsistent user experience on page load

## Root Causes

### 1. Race Condition in Token Availability
- `useSafeUser.jsx` was calling `supabase.auth.getUser()` which returns user data
- But then immediately calling `userAPI.me()` which needs `supabase.auth.getSession()` 
- The session might not be initialized yet when `getUser()` succeeds
- This caused the API call to be made without a valid access_token

### 2. Missing Profile Auto-Provisioning
- Backend threw 404 when user profile didn't exist in `user_profiles` table
- Users authenticated in Supabase Auth but not yet in `user_profiles` would fail
- No automatic profile creation for authenticated users

### 3. No Auth State Change Listener
- The hook didn't react to login/logout events
- Manual refresh required after authentication state changes

## Solutions Implemented

### Frontend Changes

#### 1. **useSafeUser.jsx** - Wait for Valid Session
```javascript
// Before: Called getUser() directly
const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

// After: Get session first to ensure we have access_token
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (!session || !session.access_token) {
  // Gracefully handle no session - user not logged in
  setUser(null);
  return;
}

const supabaseUser = session.user;
```

**Why this works:**
- `getSession()` ensures we have both user AND valid access_token
- We check for `session.access_token` before making API calls
- Prevents API calls without authentication

#### 2. **useSafeUser.jsx** - Auth State Change Listener
```javascript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      fetchUser(); // Reload user profile
    }
    else if (event === 'SIGNED_OUT') {
      setUser(null);
      saveToCache(null);
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

**Benefits:**
- Automatically refreshes user data when user logs in
- Clears user data on logout
- Handles token refresh events

#### 3. **api.js** - Better Error Messages
```javascript
// Changed from console.error to console.warn for no-token scenario
if (!headers['Authorization']) {
  console.warn('[API] No authorization token available for:', endpoint);
  throw new Error('No active session - please log in');
}
```

**Why:**
- More appropriate log level for expected scenarios
- Clearer error message for users

### Backend Changes

#### 1. **auth_service.py** - Auto-Provisioning
```python
async def get_user_by_id(user_id: str, auto_create: bool = False) -> dict:
    """Get user by ID - optionally auto-create if missing"""
    
    response = supabase.table("user_profiles").select("*").eq("auth_user_id", user_id).execute()
    
    if not response.data and auto_create:
        # Get email from Supabase Auth
        auth_user = supabase.auth.admin.get_user_by_id(user_id)
        email = auth_user.user.email
        
        # Create basic profile
        user_profile = {
            "auth_user_id": user_id,
            "email": email,
            "full_name": email.split('@')[0],
            "phone": "",
            "role": "admin" if email in ADMIN_EMAILS else "user",
            # ... other default fields
        }
        
        profile_response = supabase.table("user_profiles").insert(user_profile).execute()
        return profile_response.data[0]
    
    return response.data[0]
```

**Benefits:**
- Automatically creates profiles for authenticated users
- No more 404 for valid Supabase Auth users
- Seamless onboarding experience

#### 2. **auth.py** - Enable Auto-Create for /me Endpoint
```python
@router.get("/me", response_model=dict)
async def get_current_user_profile(user_id: str = Depends(get_current_user)):
    """Get current user profile - auto-creates profile if it doesn't exist"""
    return await auth_service.get_user_by_id(user_id, auto_create=True)
```

**Why:**
- The `/me` endpoint is safe for auto-creation (it's for current user only)
- Other endpoints (like admin views) still require explicit profiles

## Expected Behavior After Fix

### Before
1. User logs in → Supabase Auth succeeds
2. `useSafeUser` immediately calls API → No token ready → 404 error
3. A few seconds later, session is ready and retry works
4. Console shows errors even though everything eventually works

### After
1. User logs in → Supabase Auth succeeds
2. `useSafeUser` waits for session with valid `access_token`
3. API call includes proper Authorization header
4. Backend auto-creates profile if needed
5. Clean success, no errors in console

## Testing Checklist

- [ ] Fresh login - no 404 errors in console
- [ ] Page refresh while logged in - user loads correctly
- [ ] Logout - user cleared properly
- [ ] Login again - user reloaded via auth state change
- [ ] New user registration - profile auto-created
- [ ] Network offline → online - retry mechanism works
- [ ] Token refresh - handled gracefully

## Technical Details

### Token Flow
1. **Frontend Login:** `supabase.auth.signInWithPassword()` → Supabase returns session
2. **Frontend Storage:** Session stored in localStorage by Supabase client
3. **API Call:** `api.js` calls `supabase.auth.getSession()` → retrieves access_token
4. **Backend Auth:** `auth_middleware.py` validates JWT token from Supabase
5. **Profile Check:** Backend checks/creates profile in `user_profiles`

### Key Timing Points
- ✅ **Session Check:** Always check `session.access_token` exists before API calls
- ✅ **Auth Events:** Listen to `onAuthStateChange` for login/logout/refresh
- ✅ **Auto-Create:** Backend creates profiles automatically for authenticated users
- ✅ **Retry Logic:** Existing retry mechanism handles network issues

## Files Modified
- `Frontend/src/components/utils/useSafeUser.jsx` - Session check & auth listener
- `Frontend/src/lib/api.js` - Better error handling
- `Backend/app/services/auth_service.py` - Auto-provisioning logic
- `Backend/app/routers/auth.py` - Enable auto-create for /me endpoint

## Migration Notes

**No database changes required** - this is purely a code fix.

**No breaking changes** - all existing functionality preserved, just more robust.

**Backwards compatible** - existing users continue to work as before.

