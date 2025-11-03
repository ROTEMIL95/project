import { supabase } from '@/lib/supabase';

// Helper function to convert camelCase to snake_case
const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Helper function to convert snake_case to camelCase
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

// Helper function to convert object keys from camelCase to snake_case
const convertKeysToSnakeCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => convertKeysToSnakeCase(item));
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    converted[snakeKey] = typeof value === 'object' && value !== null && !Array.isArray(value)
      ? convertKeysToSnakeCase(value)
      : value;
  }
  return converted;
};

// Helper function to convert object keys from snake_case to camelCase
const convertKeysToCamelCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => convertKeysToCamelCase(item));
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    converted[camelKey] = typeof value === 'object' && value !== null && !Array.isArray(value)
      ? convertKeysToCamelCase(value)
      : value;
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

  static async list(orderBy = '-created_at') {
    try {
      let query = supabase
        .from('user_profiles')
        .select('*');

      // Parse orderBy parameter
      if (orderBy) {
        const isDescending = orderBy.startsWith('-');
        const field = isDescending ? orderBy.substring(1) : orderBy;
        query = query.order(field, { ascending: !isDescending });
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return (data || []).map(user => convertKeysToCamelCase(user));
    } catch (error) {
      console.error("User.list error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', id)
        .single();

      if (error) {
        console.error("Error fetching user:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("User.getById error:", error);
      return null;
    }
  }

  static async update(userId, updates) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseUpdates = convertKeysToSnakeCase(updates);

      const { data, error } = await supabase
        .from('user_profiles')
        .update(snakeCaseUpdates)
        .eq('auth_user_id', userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating user:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("User.update error:", error);
      throw error;
    }
  }

  static async delete(userId) {
    try {
      // Delete from user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('auth_user_id', userId);

      if (profileError) {
        console.error("Error deleting user profile:", profileError);
        throw profileError;
      }

      // Note: Deleting from auth.users requires admin privileges
      // This should be done via a Supabase Edge Function or backend API
      // For now, we'll just delete the profile

      return true;
    } catch (error) {
      console.error("User.delete error:", error);
      return false;
    }
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
