import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sybbwgxcgfkqqhriebxh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmJ3Z3hjZ2ZrcXFocmllYnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTk4MTEsImV4cCI6MjA4NTE3NTgxMX0.RfYEVezwVH-Una1CfV1LI8dNOupiRqWa_duXBRvKxCM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const TABLES = {
  HOURS: "hours_table_46fcc8fd",
  STAFF: "staff_masterlist_46fcc8fd",
  SHIFTS: "roster_shifts_46fcc8fd",
  KV_STORE: "kv_store_46fcc8fd"
};

async function queryTable(tableName, action, options = {}) {
  try {
    let query;
    
    switch (action) {
      case 'list': {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        return data || [];
      }
      
      case 'get': {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', options.id).single();
        if (error) throw error;
        return data;
      }
      
      case 'filter': {
        query = supabase.from(tableName).select('*');
        if (options.filters) {
          for (const [key, value] of Object.entries(options.filters)) {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          }
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }
      
      case 'create': {
        const { data, error } = await supabase.from(tableName).insert(options.data).select().single();
        if (error) throw error;
        return data;
      }
      
      case 'update': {
        const { data, error } = await supabase.from(tableName).update(options.data).eq('id', options.id).select().single();
        if (error) throw error;
        return data;
      }
      
      case 'delete': {
        const { error } = await supabase.from(tableName).delete().eq('id', options.id);
        if (error) throw error;
        return { success: true };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    console.error(`Supabase ${action} error on ${tableName}:`, err);
    throw err;
  }
}

export const SupabaseShiftCode = {
  async list() {
    return queryTable(TABLES.HOURS, 'list');
  },
  async get(id) {
    return queryTable(TABLES.HOURS, 'get', { id });
  },
  async create(data) {
    return queryTable(TABLES.HOURS, 'create', { data });
  },
  async update(id, data) {
    return queryTable(TABLES.HOURS, 'update', { id, data });
  },
  async delete(id) {
    return queryTable(TABLES.HOURS, 'delete', { id });
  },
  async filter(filters) {
    return queryTable(TABLES.HOURS, 'filter', { filters });
  }
};

export const SupabaseEmployee = {
  async list() {
    return queryTable(TABLES.STAFF, 'list');
  },
  async get(id) {
    return queryTable(TABLES.STAFF, 'get', { id });
  },
  async create(data) {
    return queryTable(TABLES.STAFF, 'create', { data });
  },
  async update(id, data) {
    return queryTable(TABLES.STAFF, 'update', { id, data });
  },
  async delete(id) {
    return queryTable(TABLES.STAFF, 'delete', { id });
  },
  async filter(filters) {
    return queryTable(TABLES.STAFF, 'filter', { filters });
  }
};

export const SupabaseShift = {
  async list() {
    return queryTable(TABLES.SHIFTS, 'list');
  },
  async get(id) {
    return queryTable(TABLES.SHIFTS, 'get', { id });
  },
  async create(data) {
    return queryTable(TABLES.SHIFTS, 'create', { data });
  },
  async update(id, data) {
    return queryTable(TABLES.SHIFTS, 'update', { id, data });
  },
  async delete(id) {
    return queryTable(TABLES.SHIFTS, 'delete', { id });
  },
  async filter(filters) {
    return queryTable(TABLES.SHIFTS, 'filter', { filters });
  }
};

export const SupabaseKV = {
  async get(key) {
    const results = await queryTable(TABLES.KV_STORE, 'filter', { filters: { key } });
    return results?.[0]?.value || null;
  },
  async set(key, value) {
    const existing = await queryTable(TABLES.KV_STORE, 'filter', { filters: { key } });
    if (existing?.length > 0) {
      return queryTable(TABLES.KV_STORE, 'update', { id: existing[0].id, data: { value } });
    }
    return queryTable(TABLES.KV_STORE, 'create', { data: { key, value } });
  }
};
