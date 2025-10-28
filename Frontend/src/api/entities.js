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

export class User {
  static fromJSON(json) {
    return {
      ...json,
      isAdmin: json.role === 'admin'
    };
  }
  
  static getCurrentUser() {
    // Implement your user authentication logic here
    return null;
  }
}