import { quotesAPI, categoriesAPI, projectsAPI, financialAPI } from '@/lib/api';  // Import backend API clients
import { toEnglishStatus, toHebrewStatus } from '@/lib/statusMapping';  // Import status translation helpers

// Helper function to convert camelCase to snake_case
const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Helper function to convert snake_case to camelCase
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

// Helper function to convert object keys from camelCase to snake_case
// JSONB fields that should NOT be recursively converted when SAVING
const JSONB_FIELDS_SAVE = ['projectComplexities', 'project_complexities', 'items', 'paymentTerms', 'payment_terms'];

const convertKeysToSnakeCase = (obj, parentKey = null) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => convertKeysToSnakeCase(item, parentKey));

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);

    // Check if this is a JSONB field that should not be recursively converted
    const isJSONBField = JSONB_FIELDS_SAVE.includes(key) || JSONB_FIELDS_SAVE.includes(snakeKey);

    if (isJSONBField) {
      // Keep JSONB fields as-is (don't convert nested keys)
      converted[snakeKey] = value;
    } else {
      // Recursively convert other fields (including categoryTimings)
      converted[snakeKey] = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? convertKeysToSnakeCase(value, key)
        : value;
    }
  }
  return converted;
};

// Helper function to convert object keys from snake_case to camelCase
const convertKeysToCamelCase = (obj, debugKey = null) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => convertKeysToCamelCase(item, debugKey));

  const converted = {};
  const processedKeys = new Set(); // Track which camelCase keys we've already set

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);

    // Skip this key if we've already processed its camelCase equivalent
    // This prevents empty camelCase columns from overwriting converted snake_case data
    if (processedKeys.has(camelKey)) {
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const convertedValue = convertKeysToCamelCase(value, key);
      converted[camelKey] = convertedValue;
      processedKeys.add(camelKey);
    } else {
      converted[camelKey] = value;
      processedKeys.add(camelKey);
    }
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
      const data = await categoriesAPI.list();
      // Convert snake_case keys to camelCase for frontend
      return (data || []).map(category => convertKeysToCamelCase(category));
    } catch (error) {
      console.error("Category.list error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const data = await categoriesAPI.get(id);
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
      const data = await categoriesAPI.create(snakeCaseData);
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
      const data = await categoriesAPI.update(id, snakeCaseUpdates);
      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Category.update error:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await categoriesAPI.delete(id);
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
      const params = {};

      if (filters.status) {
        // Translate Hebrew status to English for API call
        params.status_filter = toEnglishStatus(filters.status);
      }
      if (filters.client_id) {
        params.client_id = filters.client_id;
      }
      if (filters.skip !== undefined) {
        params.skip = filters.skip;
      }
      if (filters.limit !== undefined) {
        params.limit = filters.limit;
      }

      const response = await quotesAPI.list(params);

      // Backend returns {quotes: [...], total: N}
      const quotes = response.quotes || response || [];

      // Convert snake_case keys to camelCase for frontend
      const converted = quotes.map(quote => {
        const convertedQuote = convertKeysToCamelCase(quote);

        // ✅ FIX: Manually convert room_breakdown and detailed_breakdown back to camelCase in items
        // These fields are not converted automatically because 'items' is in JSONB_FIELDS_SAVE
        if (convertedQuote.items && convertedQuote.items.length > 0) {
          convertedQuote.items = convertedQuote.items.map(item => {
            const convertedItem = { ...item };

            // Convert room_breakdown to roomBreakdown
            if (item.room_breakdown !== undefined) {
              convertedItem.roomBreakdown = item.room_breakdown;
              delete convertedItem.room_breakdown;
            }

            // Convert detailed_breakdown to detailedBreakdown
            if (item.detailed_breakdown !== undefined) {
              convertedItem.detailedBreakdown = item.detailed_breakdown;
              delete convertedItem.detailed_breakdown;
            }

            return convertedItem;
          });
        }

        return convertedQuote;
      });

      return converted;
    } catch (error) {
      console.error("Quote.filter error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const data = await quotesAPI.get(id);

      if (!data) return null;

      // Convert snake_case keys to camelCase for frontend
      const converted = convertKeysToCamelCase(data);

      // ✅ FIX: Manually convert room_breakdown and detailed_breakdown back to camelCase in items
      // These fields are not converted automatically because 'items' is in JSONB_FIELDS_SAVE
      if (converted.items && converted.items.length > 0) {
        converted.items = converted.items.map(item => {
          const convertedItem = { ...item };

          // Convert room_breakdown to roomBreakdown
          if (item.room_breakdown !== undefined) {
            convertedItem.roomBreakdown = item.room_breakdown;
            delete convertedItem.room_breakdown;
          }

          // Convert detailed_breakdown to detailedBreakdown
          if (item.detailed_breakdown !== undefined) {
            convertedItem.detailedBreakdown = item.detailed_breakdown;
            delete convertedItem.detailed_breakdown;
          }

          return convertedItem;
        });
      }

      return converted;
    } catch (error) {
      console.error("Quote.getById error:", error);
      return null;
    }
  }

  static async create(quoteData) {
    try {
      // Convert camelCase keys to snake_case for database
      const snakeCaseData = convertKeysToSnakeCase(quoteData);

      // ✅ FIX: Manually convert roomBreakdown and detailedBreakdown in items
      // These fields are not converted automatically because 'items' is in JSONB_FIELDS_SAVE
      if (snakeCaseData.items && snakeCaseData.items.length > 0) {
        snakeCaseData.items = snakeCaseData.items.map(item => {
          const convertedItem = { ...item };

          // Convert roomBreakdown to room_breakdown
          if (item.roomBreakdown !== undefined) {
            convertedItem.room_breakdown = item.roomBreakdown;
            delete convertedItem.roomBreakdown;
          }

          // Convert detailedBreakdown to detailed_breakdown
          if (item.detailedBreakdown !== undefined) {
            convertedItem.detailed_breakdown = item.detailedBreakdown;
            delete convertedItem.detailedBreakdown;
          }

          return convertedItem;
        });
      }

      const data = await quotesAPI.create(snakeCaseData);
      // Convert snake_case keys to camelCase for frontend
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

      // ✅ FIX: Manually convert roomBreakdown and detailedBreakdown in items
      // These fields are not converted automatically because 'items' is in JSONB_FIELDS_SAVE
      if (snakeCaseUpdates.items && snakeCaseUpdates.items.length > 0) {
        snakeCaseUpdates.items = snakeCaseUpdates.items.map(item => {
          const convertedItem = { ...item };

          // Convert roomBreakdown to room_breakdown
          if (item.roomBreakdown !== undefined) {
            convertedItem.room_breakdown = item.roomBreakdown;
            delete convertedItem.roomBreakdown;
          }

          // Convert detailedBreakdown to detailed_breakdown
          if (item.detailedBreakdown !== undefined) {
            convertedItem.detailed_breakdown = item.detailedBreakdown;
            delete convertedItem.detailedBreakdown;
          }

          return convertedItem;
        });
      }

      const data = await quotesAPI.update(id, snakeCaseUpdates);
      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Quote.update error:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await quotesAPI.delete(id);
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
      const params = {};

      if (filters.status) {
        // Translate Hebrew status to English for API call
        params.status_filter = toEnglishStatus(filters.status);
      }
      if (filters.client_id) {
        params.client_id = filters.client_id;
      }
      if (filters.skip !== undefined) {
        params.skip = filters.skip;
      }
      if (filters.limit !== undefined) {
        params.limit = filters.limit;
      }

      const response = await projectsAPI.list(params);

      // Backend returns {projects: [...], total: N}
      const projects = response.projects || response || [];

      // Convert snake_case keys to camelCase for frontend
      return projects.map(project => convertKeysToCamelCase(project));
    } catch (error) {
      console.error("Project.filter error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const data = await projectsAPI.get(id);
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
      const data = await projectsAPI.create(snakeCaseData);
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
      const data = await projectsAPI.update(id, snakeCaseUpdates);
      // Convert snake_case keys to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("Project.update error:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await projectsAPI.delete(id);
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
      const params = {};

      if (filters.type) {
        params.type_filter = filters.type;
      }
      if (filters.category) {
        params.category = filters.category;
      }
      if (filters.skip !== undefined) {
        params.skip = filters.skip;
      }
      if (filters.limit !== undefined) {
        params.limit = filters.limit;
      }

      const response = await financialAPI.list(params);
      
      // Backend returns {transactions: [...], total: N}
      const transactions = response.transactions || response || [];

      // Convert snake_case keys back to camelCase for frontend
      return transactions.map(transaction => convertKeysToCamelCase(transaction));
    } catch (error) {
      console.error("FinancialTransaction.filter error:", error);
      return [];
    }
  }

  static async getById(id) {
    try {
      const data = await financialAPI.get(id);
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
      const data = await financialAPI.create(snakeCaseData);
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
      const data = await financialAPI.update(id, snakeCaseUpdates);
      // Convert snake_case keys back to camelCase for frontend
      return data ? convertKeysToCamelCase(data) : null;
    } catch (error) {
      console.error("FinancialTransaction.update error:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await financialAPI.delete(id);
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
