import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68418f1537da8c5bda18d11b", 
  requiresAuth: true // Ensure authentication is required for all operations
});
