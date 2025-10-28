import { supabase } from '@/lib/supabase';

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

      const { data, error: updateError } = await supabase.auth.updateUser({
        data: updates
      });

      if (updateError) {
        throw updateError;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error updating user data:', error);
      return { data: null, error };
    }
  }
}
