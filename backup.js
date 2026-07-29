// api/backup.js
//
// Backup harian: ambil data dari tabel-tabel penting di Supabase,
// terus commit ke repo GitHub PRIVATE terpisah (misal: sanur-akademi-backup).
//
// Dipicu otomatis tiap hari oleh Vercel Cron (lihat vercel.json),
// tapi juga bisa dites manual (lihat catatan "Cara tes manual" di bawah).
//
// Kenapa aman ditaro di /api:
// - Semua secret (service role key, GitHub token) diambil dari
//   Environment Variables Vercel, TIDAK di-hardcode di sini.
// - Endpoint ini dikunci pakai CRON_SECRET, jadi orang luar yang
//   nemu URL-nya nggak bisa asal trigger backup / boroskan resource.

import { createClient } from '@supabase/supabase-js';

// ── Daftar tabel yang mau di-backup ──────────────────────────────────
// Tinggal tambah/kurangi nama tabel di sini kalau kebutuhannya berubah.
const TABLES_TO_BACKUP = [
  'transactions',        // Keuangan (income/expense)
  'student_payments',    // Pembayaran siswa
  'student_profiles',    // Buku induk siswa
  'attendance',          // Log kehadiran guru + data payroll
  'teachers',            // Data akun guru/admin (TANPA kolom PIN mentah, lihat catatan di bawah)
  'student_accounts',    // Data akun siswa
  'settings',            // Pengaturan sistem (misal status maintenance)
];

// Kolom yang SENGAJA di-exclude dari backup karena sensitif dan
// nggak perlu ikut ke-commit ke Git history (PIN, dsb).
// Kalau nama kolom PIN di tabel kamu beda, sesuaikan di sini.
const SENSITIVE_COLUMNS = ['pin'];

function stripSensitiveColumns(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    const clean = { ...row };
    for (const col of SENSITIVE_COLUMNS) {
      if (col in clean) delete clean[col];
    }
    return clean;
  });
}

async function fetchTable(supabase, tableName) {
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    throw new Error(`Gagal fetch tabel "${tableName}": ${error.message}`);
  }
  return stripSensitiveColumns(data);
}

// ── Commit file ke GitHub lewat Contents API ─────────────────────────
// Strategi: 1 file per tabel, di-overwrite tiap hari (path tetap sama).
// Histori tiap hari otomatis kesimpen lewat git commit history repo-nya,
// jadi nggak perlu bikin folder per-tanggal secara manual.
async function upsertFileToGitHub({ owner, repo, path, content, token }) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Cek dulu apakah file-nya udah ada (buat dapetin `sha`, wajib buat update).
  let sha;
  const existing = await fetch(apiUrl, { headers });
  if (existing.status === 200) {
    const existingJson = await existing.json();
    sha = existingJson.sha;
  } else if (existing.status !== 404) {
    const errText = await existing.text();
    throw new Error(`Gagal cek file "${path}" (status ${existing.status}): ${errText}`);
  }

  const body = {
    message: `backup: update ${path} — ${new Date().toISOString()}`,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal commit file "${path}" (status ${res.status}): ${errText}`);
  }

  return res.json();
}

export default async function handler(req, res) {
  // ── Keamanan: cuma boleh dipanggil sama Vercel Cron ────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const GITHUB_TOKEN = process.env.BACKUP_GITHUB_TOKEN;
  const GITHUB_REPO = process.env.BACKUP_GITHUB_REPO; // format: "owner/repo"

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GITHUB_TOKEN || !GITHUB_REPO) {
    return res.status(500).json({
      ok: false,
      error: 'Environment variable belum lengkap. Cek SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKUP_GITHUB_TOKEN, BACKUP_GITHUB_REPO.',
    });
  }

  const [owner, repo] = GITHUB_REPO.split('/');
  if (!owner || !repo) {
    return res.status(500).json({ ok: false, error: 'BACKUP_GITHUB_REPO harus format "owner/repo".' });
  }

  // Service role key = akses penuh, bypass RLS. Cuma dipakai di server (di sini), nggak pernah dikirim ke browser.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const results = [];
  const errors = [];

  for (const tableName of TABLES_TO_BACKUP) {
    try {
      const rows = await fetchTable(supabase, tableName);
      const jsonContent = JSON.stringify(
        {
          table: tableName,
          exportedAt: new Date().toISOString(),
          rowCount: Array.isArray(rows) ? rows.length : 0,
          data: rows,
        },
        null,
        2
      );

      await upsertFileToGitHub({
        owner,
        repo,
        path: `backups/${tableName}.json`,
        content: jsonContent,
        token: GITHUB_TOKEN,
      });

      results.push({ table: tableName, rowCount: Array.isArray(rows) ? rows.length : 0 });
    } catch (err) {
      // Kalau satu tabel gagal, lanjut ke tabel lain (jangan bikin
      // seluruh proses backup berhenti gara-gara 1 tabel bermasalah).
      errors.push({ table: tableName, error: err.message });
    }
  }

  const status = errors.length === 0 ? 200 : 207; // 207 = partial success
  return res.status(status).json({
    ok: errors.length === 0,
    timestamp: new Date().toISOString(),
    results,
    errors,
  });
}
