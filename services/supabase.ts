import { createClient } from '@supabase/supabase-js';

// Ambil dari environment variables yang sudah di-set di Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wnnglcxgzywbznnlypyz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndubmdsY3hnenl3Ynpubmx5cHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODI0OTYsImV4cCI6MjA4MzE1ODQ5Nn0.9kcRkMEs0YXBNF6TXsqxY3P-_tjgyOzMtSdtbwJPhGQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🆕 FIX BUG "PAKET HILANG ABIS LOGIN / DATA JADI 0 ABIS CHROME DITUTUP":
// dipakai buat mastiin sesi Supabase Auth beneran udah "nempel" di client
// SEBELUM nembak query ke tabel yang dikunci RLS (student_payments,
// reports, dst). Kejadiannya: abis signInWithPassword() sukses ATAU abis
// Chrome ditutup-buka lagi (Supabase perlu validasi ulang refresh token ke
// server dulu), ada jeda sebelum sesi itu bener-bener aktif dipakai request
// berikutnya. Kalau query nembak pas jeda itu, RLS nganggep request-nya
// anonim -> BUKAN error, tapi balikin array KOSONG. Makanya kesannya "data
// ilang", padahal cuma race condition.
//
// v2: sebelumnya fungsi ini polling pakai delay TETAP (5x @ 200ms = nyerah
// abis ~1 detik apapun kondisinya). Itu cukup buat kasus "abis login biasa"
// tapi ketauan KURANG panjang buat kasus "abis Chrome ditutup total lalu
// dibuka lagi", karena di situ Supabase butuh network round-trip ke server
// buat validasi ulang token -> sering > 1 detik, apalagi koneksi agak
// lambat. Sekarang: dengerin event ASLI dari Supabase (onAuthStateChange)
// yang ngasih tau PERSIS kapan sesi confirmed aktif, jadi nggak nebak-nebak
// pake delay lagi. Timeout 8 detik cuma jaring pengaman kalau beneran ada
// masalah (misal offline), bukan patokan utama.
export const waitForActiveSession = async (timeoutMs = 8000): Promise<boolean> => {
  // Cek cepat dulu, siapa tau sesi udah aktif dari awal (kasus paling umum).
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;

  // Kalau belum, tunggu Supabase sendiri yang ngasih sinyal sesi udah
  // confirmed aktif, alih-alih polling pake delay tetap.
  return new Promise((resolve) => {
    let settled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled || !session) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        settled = true;
        sub.subscription.unsubscribe();
        resolve(true);
      }
    });

    // Jaring pengaman: kalau sampe 8 detik belum ada konfirmasi apa-apa,
    // baru nyerah (jauh lebih longgar dari ~1 detik sebelumnya).
    setTimeout(() => {
      if (settled) return;
      settled = true;
      sub.subscription.unsubscribe();
      resolve(false);
    }, timeoutMs);
  });
};

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
