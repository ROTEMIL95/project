import { supabase } from '@/lib/supabase';

// Entity type definitions
export class Category {
  static fromJSON(json) {
    return json;
  }

  static async list() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
    
    return data || [];
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

      return data || [];
    } catch (error) {
      console.error("Quote.filter error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching quote:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Quote.getById error:", error);
      return null;
    }
  }

  static async create(quoteData) {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .insert([quoteData])
        .select()
        .single();

      if (error) {
        console.error("Error creating quote:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Quote.create error:", error);
      throw error;
    }
  }

  static async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating quote:", error);
        throw error;
      }

      return data;
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
}

export class CustomerInquiry {
  static fromJSON(json) {
    return json;
  }
}

export { User } from './user';
