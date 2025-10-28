# User.me() Migration Guide

## Overview
Since we migrated from custom backend JWT authentication to **Supabase Auth**, the `User.me()` function is no longer available. All components need to use the `useUser()` hook from `UserContext` instead.

## Migration Pattern

### Before (❌ Old Way):
```javascript
import { User } from '@/api/entities';

export default function MyComponent() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await User.me();  // ❌ This will fail
      setUser(userData);
    };
    loadUser();
  }, []);

  // Rest of component...
}
```

### After (✅ New Way):
```javascript
import { User } from '@/api/entities';
import { useUser } from '@/components/utils/UserContext';

export default function MyComponent() {
  const { user, loading } = useUser();  // ✅ Use the hook

  // Optional: handle loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Rest of component uses `user` directly
}
```

## Step-by-Step Migration

### Step 1: Add Import
```javascript
import { useUser } from '@/components/utils/UserContext';
```

### Step 2: Replace State with Hook
```javascript
// OLD:
const [user, setUser] = useState(null);

// NEW:
const { user, loading } = useUser();
```

### Step 3: Remove User.me() Calls
Remove any `useEffect` or functions that call `User.me()`:

```javascript
// OLD - REMOVE THIS:
useEffect(() => {
  const loadUser = async () => {
    const userData = await User.me();
    setUser(userData);
  };
  loadUser();
}, []);

// NEW - Just use the hook, no need for useEffect
```

### Step 4: Update Dependencies
If you had `useEffect` that depended on user data, update dependencies:

```javascript
// OLD:
useEffect(() => {
  if (user) {
    // do something
  }
}, []); // ❌ Missing dependency

// NEW:
useEffect(() => {
  if (user) {
    // do something
  }
}, [user]); // ✅ Include user in dependencies
```

## Files That Need Migration

The following files still use `User.me()` and need to be updated:

### Pages:
- ✅ `PricebookSettings.jsx` - FIXED
- ✅ `ContractorPricing.jsx` - FIXED
- ❌ `AdminCategories.jsx`
- ❌ `AdminUserEdit.jsx`
- ❌ `AdminUsers.jsx`
- ❌ `AdminDashboard.jsx`
- ❌ `Catalog.jsx` (multiple instances)
- ❌ `AdminCustomerInquiries.jsx`
- ❌ `AdminUserProfile.jsx`
- ❌ `ContractAgreement.jsx`
- ❌ `PaintCalculator.jsx`
- ❌ `QuoteCreateNew.jsx`
- ❌ `QuoteCreate.jsx` (multiple instances)
- ❌ `CostCalculator.jsx`
- ❌ `PaintSettings.jsx`
- ❌ `DemolitionCalculator.jsx`
- ❌ `Finance.jsx`
- ❌ `Support.jsx`
- ❌ `QuoteView.jsx`
- ❌ `SentQuotes.jsx`

### Components:
- ❌ `ElectricalSubcontractorManager.jsx`
- ❌ `ConstructionSubcontractorManager.jsx`
- ❌ `PlumbingSubcontractorManager.jsx`
- ❌ `TilingForm.jsx`
- ❌ `RoomEstimatesSettings.jsx`
- ❌ Various QuoteBuilder components

## Common Patterns

### Pattern 1: Simple User Data Access
```javascript
// OLD:
const [user, setUser] = useState(null);
useEffect(() => {
  (async () => {
    const u = await User.me();
    setUser(u);
  })();
}, []);

// NEW:
const { user } = useUser();
```

### Pattern 2: With Loading State
```javascript
// OLD:
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  (async () => {
    setLoading(true);
    const u = await User.me();
    setUser(u);
    setLoading(false);
  })();
}, []);

// NEW:
const { user, loading } = useUser();
```

### Pattern 3: Conditional User Loading
```javascript
// OLD:
const [user, setUser] = useState(null);
const loadUser = async () => {
  const u = await User.me();
  setUser(u);
};

// NEW:
const { user, refresh } = useUser();
// Call refresh() if you need to reload user data
```

## User Object Structure

The user object from `useUser()` has the following structure (from Supabase Auth):

```javascript
{
  id: string,                    // Supabase user ID
  email: string,                 // User email
  full_name: string,            // From user_metadata
  phone: string,                // From user_metadata
  role: string,                 // From user_metadata (default: 'user')
  isActive: boolean,            // From user_metadata (default: true)
  created_at: string,           // Timestamp
  // Plus any other custom fields from user_metadata
}
```

## Testing After Migration

After migrating a component, test:

1. **Component loads correctly** - No errors in console
2. **User data is displayed** - Check that user name, email, etc. show correctly
3. **Loading state works** - Component doesn't break while loading
4. **No User.me errors** - No "User.me is not a function" errors

## Notes

- The `UserContext` is already wrapped around the app in `main.jsx`
- User data is cached and automatically refreshed
- The hook handles offline scenarios gracefully
- User data comes from Supabase Auth, not the backend API
