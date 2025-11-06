import { supabase } from '@/lib/supabase';
import { userProfileAPI } from '@/lib/api';

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
      const data = await userProfileAPI.list();
      // Backend orders by created_at descending by default
      // Client-side sorting can be added if needed for different orderBy values
      return (data || []).map(user => convertKeysToCamelCase(user));
    } catch (error) {
      console.error("User.list error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const data = await userProfileAPI.get(id);
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
      const data = await userProfileAPI.update(userId, snakeCaseUpdates);
      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("User.update error:", error);
      throw error;
    }
  }

  static async delete(userId) {
    try {
      await userProfileAPI.delete(userId);
      return true;
    } catch (error) {
      console.error("User.delete error:", error);
      return false;
    }
  }

  static async updateMyUserData(updates) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseUpdates = convertKeysToSnakeCase(updates);
      
      // Update user_profiles table via backend API
      const data = await userProfileAPI.updateMe(snakeCaseUpdates);

      // Trigger UserContext refresh to reload updated data
      window.dispatchEvent(new CustomEvent('user-data-updated'));

      return { data, error: null };
    } catch (error) {
      console.error('Error updating user data:', error);
      return { data: null, error };
    }
  }
}
