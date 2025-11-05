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

// Entity type definitions
export class Category {
  static fromJSON(json) {
    return json;
  }

  static async list() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }
      
      // Convert snake_case keys to camelCase for frontend
      return (data || []).map(category => convertKeysToCamelCase(category));
    } catch (error) {
      console.error("Category.list error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching category:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Category.getById error:", error);
      return null;
    }
  }

  static async create(categoryData) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseData = convertKeysToSnakeCase(categoryData);
      
      const { data, error } = await supabase
        .from('categories')
        .insert([snakeCaseData])
        .select()
        .single();

      if (error) {
        console.error("Error creating category:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Category.create error:", error);
      throw error;
    }
  }

  static async update(id, updates) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseUpdates = convertKeysToSnakeCase(updates);
      
      const { data, error } = await supabase
        .from('categories')
        .update(snakeCaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating category:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Category.update error:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting category:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Category.delete error:", error);
      return false;
    }
  }
}

export class CatalogItem {
  static fromJSON(json) {
    return json;
  }
}

export class PriceRange {
  static fromJSON(json) {
    return json;
  }
}

export class Client {
  static fromJSON(json) {
    return json;
  }
}

export class Quote {
  static fromJSON(json) {
    return json;
  }

  static async filter(filters = {}) {
    try {
      let query = supabase
        .from('quotes')
        .select('*');

      // Apply filters (using correct field names from database)
      if (filters.created_by || filters.user_id) {
        // Support both field names for backwards compatibility
        const userId = filters.user_id || filters.created_by;
        query = query.eq('user_id', userId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      // Order by created_at descending (correct field name)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching quotes:", error);
        throw error;
      }

      // Convert snake_case keys back to camelCase for frontend
      return (data || []).map(quote => convertKeysToCamelCase(quote));
    } catch (error) {
      console.error("Quote.filter error:", error);
      return [];
    }
  }

  static async getById(id, userId = null) {
    try {
      console.log('[Quote.getById] Fetching quote:', { id, userId });
      
      let query = supabase
        .from('quotes')
        .select('*')
        .eq('id', id);
      
      // Add user_id filter if provided (helps with RLS and ownership checks)
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.single();

      if (error) {
        console.error("[Quote.getById] Supabase error:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('[Quote.getById] Raw data from Supabase:', data);
      
      // Convert snake_case keys back to camelCase for frontend
      const converted = data ? convertKeysToCamelCase(data) : null;
      console.log('[Quote.getById] Converted data:', converted);
      
      return converted;
    } catch (error) {
      console.error("[Quote.getById] Exception:", error);
      return null;
    }
  }

  static async create(quoteData) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseData = convertKeysToSnakeCase(quoteData);
      
      const { data, error } = await supabase
        .from('quotes')
        .insert([snakeCaseData])
        .select()
        .single();

      if (error) {
        console.error("Error creating quote:", error);
        throw error;
      }

      // Convert snake_case keys back to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Quote.create error:", error);
      throw error;
    }
  }

  static async update(id, updates) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseUpdates = convertKeysToSnakeCase(updates);
      
      const { data, error } = await supabase
        .from('quotes')
        .update(snakeCaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating quote:", error);
        throw error;
      }

      // Convert snake_case keys back to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Quote.update error:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting quote:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Quote.delete error:", error);
      return false;
    }
  }
}

export class QuoteItem {
  static fromJSON(json) {
    return json;
  }
}

export class Project {
  static fromJSON(json) {
    return json;
  }

  static async filter(filters = {}) {
    try {
      let query = supabase
        .from('projects')
        .select('*');

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching projects:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return (data || []).map(project => convertKeysToCamelCase(project));
    } catch (error) {
      console.error("Project.filter error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching project:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Project.getById error:", error);
      return null;
    }
  }

  static async create(projectData) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseData = convertKeysToSnakeCase(projectData);
      
      const { data, error } = await supabase
        .from('projects')
        .insert([snakeCaseData])
        .select()
        .single();

      if (error) {
        console.error("Error creating project:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Project.create error:", error);
      throw error;
    }
  }

  static async update(id, updates) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseUpdates = convertKeysToSnakeCase(updates);
      
      const { data, error } = await supabase
        .from('projects')
        .update(snakeCaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating project:", error);
        throw error;
      }

      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Project.update error:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting project:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Project.delete error:", error);
      return false;
    }
  }
}

export class QuoteTemplate {
  static fromJSON(json) {
    return json;
  }
}

export class TemplateItem {
  static fromJSON(json) {
    return json;
  }
}

export class ContractorPricing {
  static fromJSON(json) {
    return json;
  }
}

export class ProjectCosts {
  static fromJSON(json) {
    return json;
  }
}

export class FinancialTransaction {
  static fromJSON(json) {
    return json;
  }

  static async filter(filters = {}) {
    try {
      let query = supabase
        .from('financial_transactions')
        .select('*');

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.quote_id) {
        query = query.eq('quote_id', filters.quote_id);
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }

      // Order by transaction_date descending
      query = query.order('transaction_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching financial transactions:", error);
        throw error;
      }

      // Convert snake_case keys back to camelCase for frontend
      return (data || []).map(transaction => convertKeysToCamelCase(transaction));
    } catch (error) {
      console.error("FinancialTransaction.filter error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching financial transaction:", error);
        throw error;
      }

      // Convert snake_case keys back to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("FinancialTransaction.getById error:", error);
      return null;
    }
  }

  static async create(transactionData) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseData = convertKeysToSnakeCase(transactionData);
      
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert([snakeCaseData])
        .select()
        .single();

      if (error) {
        console.error("Error creating financial transaction:", error);
        throw error;
      }

      // Convert snake_case keys back to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("FinancialTransaction.create error:", error);
      throw error;
    }
  }

  static async update(id, updates) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseUpdates = convertKeysToSnakeCase(updates);
      
      const { data, error } = await supabase
        .from('financial_transactions')
        .update(snakeCaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating financial transaction:", error);
        throw error;
      }

      // Convert snake_case keys back to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("FinancialTransaction.update error:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting financial transaction:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("FinancialTransaction.delete error:", error);
      return false;
    }
  }
}

export class CustomerInquiry {
  static fromJSON(json) {
    return json;
  }
}

export { User } from './user';
