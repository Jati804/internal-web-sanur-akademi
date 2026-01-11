import { createClient } from '@supabase/supabase-js';

// Ambil dari environment variables yang sudah di-set di Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wnnglcxgzywbznnlypyz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndubmdsY3hnenl3Ynpubmx5cHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODI0OTYsImV4cCI6MjA4MzE1ODQ5Nn0.9kcRkMEs0YXBNF6TXsqxY3P-_tjgyOzMtSdtbwJPhGQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const syncToSupabase = async (tableName: string, data: any) => {
  try {
    const { error } = await supabase.from(tableName).upsert(data);
    if (error) throw error;
  } catch (error) {
    console.error(`Error syncing to ${tableName}:`, error);
  }
};

export const deleteFromSupabase = async (tableName: string, id: string) => {
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting from ${tableName}:`, error);
  }
};
