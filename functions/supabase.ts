import { createClient } from "npm:@supabase/supabase-js@2";

const TABLES = {
  HOURS: "hours_table_46fcc8fd",
  STAFF: "staff_masterlist_46fcc8fd",
  SHIFTS: "roster_shifts_46fcc8fd",
  KV_STORE: "kv_store_46fcc8fd"
};

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!url || !key) {
    throw new Error("Supabase credentials not configured");
  }
  
  return createClient(url, key);
}

export default async function handler(request: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { action, table, filters, data, id } = body;
    
    const supabase = getSupabaseClient();
    const tableName = TABLES[table as keyof typeof TABLES] || table;

    let result;

    switch (action) {
      case "list": {
        let query = supabase.from(tableName).select("*");
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }
        const { data: rows, error } = await query;
        if (error) throw error;
        result = rows;
        break;
      }

      case "get": {
        const { data: row, error } = await supabase
          .from(tableName)
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        result = row;
        break;
      }

      case "create": {
        const { data: created, error } = await supabase
          .from(tableName)
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        result = created;
        break;
      }

      case "update": {
        const { data: updated, error } = await supabase
          .from(tableName)
          .update(data)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        result = updated;
        break;
      }

      case "delete": {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "filter": {
        let query = supabase.from(tableName).select("*");
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          }
        }
        const { data: rows, error } = await query;
        if (error) throw error;
        result = rows;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ ok: true, data: result }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("Supabase function error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
