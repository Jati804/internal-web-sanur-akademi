import { createClient } from '@supabase/supabase-js';

// URL Supabase Kakak sudah terpasang di sini
const supabaseUrl = 'https://wnnglcxgzywbznnlypyz.supabase.co'; 

// Anon Key yang Kakak berikan sudah saya pasangkan di bawah ini.
// Sekarang aplikasi sudah bisa terhubung ke database Supabase Kakak!
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndubmdsY3hnenl3Ynpubmx5cHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODI0OTYsImV4cCI6MjA4MzE1ODQ5Nn0.9kcRkMEs0YXBNF6TXsqxY3P-_tjgyOzMtSdtbwJPhGQ'; 

// Fungsi pengecekan apakah Kakak sudah mengisi Key dengan benar
export const isSupabaseConfigured = () => {
  return supabaseUrl && 
         supabaseAnonKey !== 'your-anon-key' && 
         supabaseAnonKey !== 'GANTI_DENGAN_ANON_KEY_KAKAK' &&
         supabaseAnonKey.length > 20;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper untuk sinkronisasi data ke Supabase (Upsert)
 */
export const syncToSupabase = async (tableName: string, data: any) => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase
      .from(tableName)
      .upsert(data);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error syncing to ${tableName}:`, error);
  }
};

export const deleteFromSupabase = async (tableName: string, id: string) => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting from ${tableName}:`, error);
  }
};
