import { supabase } from '@/lib/supabase';

// Helper function to convert camelCase to snake_case
const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Helper function to convert object keys from camelCase to snake_case
const convertKeysToSnakeCase = (obj) => {
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    converted[toSnakeCase(key)] = value;
  }
  return converted;
};

export class User {
  static fromJSON(json) {
    return {
      ...json,
      isAdmin: json.role === 'admin'
    };
  }
  
  static getCurrentUser() {
    return supabase.auth.getUser();
  }

  static async updateMyUserData(updates) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user) {
        throw new Error('No user logged in');
      }

      // Convert camelCase keys to snake_case for database
      const snakeCaseUpdates = convertKeysToSnakeCase(updates);

      // Update user_profiles table
      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(snakeCaseUpdates)
        .eq('auth_user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Trigger UserContext refresh to reload updated data
      window.dispatchEvent(new CustomEvent('user-data-updated'));

      return { data, error: null };
    } catch (error) {
      console.error('Error updating user data:', error);
      return { data: null, error };
    }
  }
}
