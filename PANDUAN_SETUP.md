
# 📜 Gabungan SQL Final SANUR (Update 25 Jan 2026 - TERAKHIR)

Gunakan kode di bawah ini di **SQL Editor Supabase** (Klik "New Query", paste, lalu "Run").


-- ========================================
-- SANUR AKADEMI - DATABASE SETUP
-- VERSION: 2.2 (+ Transactions Sample Data)
-- ========================================

-- [1] BERSIHKAN DATABASE
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS student_attendance CASCADE;
DROP TABLE IF EXISTS student_payments CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS student_accounts CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS sales_contacts CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS maintenance_notes CASCADE;

-- [2] TABEL AKSES USER
CREATE TABLE teachers (
  id TEXT PRIMARY KEY, 
  name TEXT, 
  role TEXT DEFAULT 'TEACHER', 
  username TEXT UNIQUE, 
  pin TEXT DEFAULT '4488'
);

CREATE TABLE student_accounts (
  id TEXT PRIMARY KEY, 
  name TEXT, 
  role TEXT DEFAULT 'STUDENT', 
  username TEXT UNIQUE, 
  pin TEXT DEFAULT '1234'
);

-- [3] TABEL BUKU INDUK
CREATE TABLE student_profiles (
  id TEXT PRIMARY KEY, 
  name TEXT, 
  dob TEXT, 
  institution TEXT, 
  personalphone TEXT, 
  parentphone TEXT, 
  enrolledclass TEXT, 
  notes TEXT
);

-- [3B] ✅ TABEL SALES B2B (NARAHUBUNG INSTANSI)
CREATE TABLE sales_contacts (
  id TEXT PRIMARY KEY,
  institution_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  job_title TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  last_contact_date TEXT NOT NULL,
  next_followup_date TEXT NOT NULL,
  deal_status TEXT DEFAULT 'WARM',
  meeting_notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk performance
CREATE INDEX idx_sales_institution ON sales_contacts(institution_name);
CREATE INDEX idx_sales_status ON sales_contacts(deal_status);
CREATE INDEX idx_sales_followup ON sales_contacts(next_followup_date);

-- [4] TABEL ABSENSI & LOG SESI GURU (KHUSUS GURU!)
CREATE TABLE attendance (
  id TEXT PRIMARY KEY, 
  teacherid TEXT DEFAULT 'SELF', 
  teachername TEXT DEFAULT 'MANDIRI', 
  date TEXT, 
  clockin TEXT, 
  status TEXT DEFAULT 'SESSION_LOG', 
  classname TEXT, 
  level TEXT,
  sessioncategory TEXT DEFAULT 'REGULER',
  duration INT DEFAULT 2,
  packageid TEXT, 
  sessionnumber INT DEFAULT 1, 
  studentsattended JSONB DEFAULT '[]'::JSONB, 
  studentsessions JSONB DEFAULT '{}'::JSONB, 
  studentscores JSONB DEFAULT '{}'::JSONB, 
  studenttopics JSONB DEFAULT '{}'::JSONB,
  studentnarratives JSONB DEFAULT '{}'::JSONB, 
  earnings INT DEFAULT 0, 
  paymentstatus TEXT DEFAULT 'UNPAID', 
  reportnarrative TEXT DEFAULT '', 
  receiptdata TEXT DEFAULT NULL,
  substitutefor TEXT DEFAULT NULL,
  originalteacherid TEXT DEFAULT NULL
);

-- [4B] ✅ TABEL PRESENSI SISWA MANDIRI
CREATE TABLE student_attendance (
  id TEXT PRIMARY KEY,
  packageid TEXT NOT NULL,
  studentname TEXT NOT NULL,
  sessionnumber INTEGER,
  date TEXT NOT NULL,
  clockin TEXT,
  duration INTEGER DEFAULT 2,
  classname TEXT,
  level TEXT,
  sessioncategory TEXT DEFAULT 'REGULER',
  studentscores JSONB DEFAULT '{}'::JSONB,
  studenttopics JSONB DEFAULT '{}'::JSONB,
  studentnarratives JSONB DEFAULT '{}'::JSONB,
  reportnarrative TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk performance
CREATE INDEX idx_student_att_pkg ON student_attendance(packageid);
CREATE INDEX idx_student_att_date ON student_attendance(date);
CREATE INDEX idx_student_att_student ON student_attendance(studentname);

-- [5] TABEL BUKU KAS & SPP
CREATE TABLE transactions (
  id TEXT PRIMARY KEY, 
  type TEXT, 
  category TEXT, 
  amount INT, 
  date TEXT, 
  description TEXT
);

CREATE TABLE student_payments (
  id TEXT PRIMARY KEY, 
  studentname TEXT, 
  classname TEXT, 
  amount INT, 
  date TEXT, 
  status TEXT DEFAULT 'PENDING', 
  note TEXT, 
  receiptdata TEXT DEFAULT NULL 
);

-- [6] PENGATURAN SISTEM
CREATE TABLE settings (
  key TEXT PRIMARY KEY, 
  value JSONB
);

-- [7] TABEL CATATAN MAINTENANCE
CREATE TABLE maintenance_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- [8] INPUT DATA AWAL (USER)
INSERT INTO teachers (id, name, role, username, pin) VALUES 
('admin-1', 'PENGURUS SANUR', 'ADMIN', 'pengurus_sanur2024', '4488'),
('guru-1', 'SRI ISTI UNTARI', 'TEACHER', 'guru_sri', '4488'),
('guru-2', 'ANITA RAHMAWATI', 'TEACHER', 'guru_anita', '4488');

INSERT INTO student_accounts (id, name, role, username, pin) VALUES 
('stud-1', 'BUDI SANTOSO', 'STUDENT', 'budi_sanur', '1234');

-- [9] INPUT KONFIGURASI
INSERT INTO settings (key, value) VALUES 
('academic_config', '{"subjects": ["Pelatihan Microsoft Word", "Pelatihan Microsoft Excel", "Desain Grafis Canva"], "levels": ["BASIC", "INTERMEDIATE"], "classes": ["Reguler 1", "Private 1"]}'::JSONB),
('salary_config', '{"regulerRate": 90000, "privateRate": 75000}'::JSONB);

-- [10] INSERT ROW PERTAMA MAINTENANCE NOTES
INSERT INTO maintenance_notes (id, content) 
VALUES ('00000000-0000-0000-0000-000000000001', '');

-- [11] SIMULASI DATA: KASUS GURU PENGGANTI (PENTING!)
-- Paket Belajar WORD BASIC - Reguler 1 (Paket ID: PKG-SIMULASI-01)
-- Sesi 1, 3, 4: Diajar oleh SRI (Biru)
-- Sesi 2: SRI berhalangan, diganti oleh ANITA (ANITA jadi Orange, SRI jadi Abu Hati)

INSERT INTO attendance (id, teacherid, teachername, date, clockin, status, classname, level, sessioncategory, duration, packageid, sessionnumber, studentsattended, earnings, paymentstatus, substitutefor, originalteacherid) VALUES 
('SIM-1', 'guru-1', 'SRI ISTI UNTARI', '2026-01-01', '08:00', 'SESSION_LOG', 'Pelatihan Microsoft Word (BASIC) - Reguler 1', 'BASIC', 'REGULER', 2, 'PKG-SIMULASI-01', 1, '["REGULER"]', 180000, 'UNPAID', NULL, 'guru-1'),
('SIM-2', 'guru-2', 'ANITA RAHMAWATI', '2026-01-02', '08:00', 'SUB_LOG', 'Pelatihan Microsoft Word (BASIC) - Reguler 1', 'BASIC', 'REGULER', 2, 'PKG-SIMULASI-01', 2, '["REGULER"]', 180000, 'UNPAID', 'SRI ISTI UNTARI', 'guru-1'),
('SIM-3', 'guru-1', 'SRI ISTI UNTARI', '2026-01-03', '08:00', 'SESSION_LOG', 'Pelatihan Microsoft Word (BASIC) - Reguler 1', 'BASIC', 'REGULER', 2, 'PKG-SIMULASI-01', 3, '["REGULER"]', 180000, 'UNPAID', NULL, 'guru-1'),
('SIM-4', 'guru-1', 'SRI ISTI UNTARI', '2026-01-04', '08:00', 'SESSION_LOG', 'Pelatihan Microsoft Word (BASIC) - Reguler 1', 'BASIC', 'REGULER', 2, 'PKG-SIMULASI-01', 4, '["REGULER"]', 180000, 'UNPAID', NULL, 'guru-1');

-- [12] ✅ SIMULASI DATA SISWA MANDIRI
-- Contoh: Siswa BUDI SANTOSO absen mandiri untuk paket PKG-STUDENT-01

INSERT INTO student_attendance (id, packageid, studentname, sessionnumber, date, clockin, duration, classname, level, sessioncategory, studentscores, studenttopics, studentnarratives, reportnarrative) VALUES
('STU-1', 'PKG-STUDENT-01', 'BUDI SANTOSO', 1, '2026-01-05', '09:00', 2, 'Pelatihan Microsoft Excel (BASIC) - Reguler 4', 'BASIC', 'REGULER', '{"BUDI SANTOSO": [85, 90, 88, 92, 87, 91]}'::JSONB, '{"BUDI SANTOSO": ["Pengenalan Interface Excel", "Formula Dasar", "Formatting Cell", "Chart & Grafik", "Filter & Sort", "Pivot Table Intro"]}'::JSONB, '{"BUDI SANTOSO": "Budi menunjukkan progress yang sangat baik!"}'::JSONB, 'Siswa aktif dan konsisten belajar.'),
('STU-2', 'PKG-STUDENT-01', 'BUDI SANTOSO', 2, '2026-01-12', '09:00', 2, 'Pelatihan Microsoft Excel (BASIC) - Reguler 4', 'BASIC', 'REGULER', '{}'::JSONB, '{}'::JSONB, '{}'::JSONB, ''),
('STU-3', 'PKG-STUDENT-01', 'BUDI SANTOSO', 3, '2026-01-19', '09:00', 2, 'Pelatihan Microsoft Excel (BASIC) - Reguler 4', 'BASIC', 'REGULER', '{}'::JSONB, '{}'::JSONB, '{}'::JSONB, '');

-- [13] ✅ SIMULASI DATA SALES B2B
INSERT INTO sales_contacts (id, institution_name, contact_person, job_title, phone, email, last_contact_date, next_followup_date, deal_status, meeting_notes) VALUES
('sc-1738123456789', 'SD NEGERI 01 DENPASAR', 'PAK BUDI SANTOSO', 'KEPALA SEKOLAH', '081234567890', 'budi@sdnegeri01.sch.id', '2026-01-15', '2026-01-22', 'HOT', 'Meeting pertama sangat positif. Pak Budi minat paket pelatihan Excel Basic untuk 20 siswa kelas 5. Menunggu approval dari yayasan, estimasi 1 minggu. Follow-up: Kirim proposal formal via email.'),
('sc-1738123456790', 'SMP MUHAMMADIYAH 2 SANUR', 'BU ANI RAHMAWATI', 'WAKA KURIKULUM', '081234567891', NULL, '2026-01-10', '2026-01-20', 'WARM', 'Sudah kirim proposal paket Word & Excel untuk ekstrakurikuler. Bu Ani tertarik tapi masih koordinasi dengan kepala sekolah. Belum ada respon 5 hari. Plan: Follow-up via WA hari Senin.'),
('sc-1738123456791', 'PT TEKNOLOGI DIGITAL BALI', 'PAK CANDRA WIJAYA', 'HRD MANAGER', '081234567892', 'candra@teknodigital.co.id', '2025-12-20', '2026-01-27', 'COLD', 'Meeting pertama bulan lalu, Pak Candra minat training karyawan baru (Canva & Excel). Namun budget sedang ketat. Sudah tidak ada respon 1 bulan lebih. Plan: Coba kontak ulang akhir Januari dengan penawaran diskon.');

-- [14] 🆕✅ SAMPLE DATA TRANSAKSI (TESTING FILTER LENGKAP!)
INSERT INTO transactions (id, type, category, amount, date, description) VALUES
-- ✅ Transaksi Tahun 2026 (Minggu Ini & Bulan Ini)
('TX-2026-01', 'INCOME', 'SPP_SISWA', 500000, '2026-01-20', 'SPP MASUK: BUDI SANTOSO | EXCEL BASIC - REGULER 4 | 01/20/2026'),
('TX-2026-02', 'EXPENSE', 'HONOR_GURU', 720000, '2026-01-21', 'HONOR CAIR: SRI ISTI UNTARI | WORD BASIC - REGULER 1 | 01/21/2026'),
('TX-2026-03', 'EXPENSE', 'LISTRIK', 150000, '2026-01-22', 'BAYAR LISTRIK KANTOR JANUARI 2026 | 01/22/2026'),
('TX-2026-04', 'INCOME', 'SPP_SISWA', 350000, '2026-01-18', 'SPP MASUK: SITI AISYAH | CANVA - PRIVATE 2 | 01/18/2026'),
('TX-2026-05', 'EXPENSE', 'GAJI', 2000000, '2026-01-25', 'GAJI STAFF ADMINISTRASI JANUARI 2026 | 01/25/2026'),
('TX-2026-06', 'EXPENSE', 'OPERASIONAL', 300000, '2026-01-19', 'BELI ATK & KERTAS FOTOCOPY | 01/19/2026'),
('TX-2026-07', 'INCOME', 'UMUM', 1000000, '2026-01-15', 'DONASI DARI ALUMNI | 01/15/2026'),
('TX-2026-08', 'EXPENSE', 'HONOR_GURU', 300000, '2026-01-23', 'HONOR CAIR: ANITA RAHMAWATI | EXCEL - REGULER 2 | 01/23/2026'),

-- ✅ Transaksi Tahun 2025 (Testing Filter Tahun Lalu)
('TX-2025-01', 'INCOME', 'SPP_SISWA', 450000, '2025-12-15', 'SPP MASUK: AHMAD RIZKI | WORD BASIC | 12/15/2025'),
('TX-2025-02', 'EXPENSE', 'HONOR_GURU', 600000, '2025-12-20', 'HONOR CAIR: SRI ISTI UNTARI | WORD BASIC | 12/20/2025'),
('TX-2025-03', 'EXPENSE', 'LISTRIK', 200000, '2025-12-10', 'BAYAR LISTRIK KANTOR DESEMBER 2025 | 12/10/2025'),
('TX-2025-04', 'EXPENSE', 'GAJI', 1800000, '2025-12-25', 'GAJI STAFF ADMINISTRASI DESEMBER 2025 | 12/25/2025'),
('TX-2025-05', 'EXPENSE', 'OPERASIONAL', 400000, '2025-11-20', 'BELI PRINTER CANON G3010 | 11/20/2025'),
('TX-2025-06', 'INCOME', 'UMUM', 500000, '2025-11-15', 'DONASI DARI KOMITE SEKOLAH | 11/15/2025'),
('TX-2025-07', 'INCOME', 'SPP_SISWA', 400000, '2025-10-10', 'SPP MASUK: RINA WIJAYA | EXCEL INTERMEDIATE | 10/10/2025'),
('TX-2025-08', 'EXPENSE', 'LISTRIK', 180000, '2025-10-08', 'BAYAR LISTRIK KANTOR OKTOBER 2025 | 10/08/2025'),
('TX-2025-09', 'EXPENSE', 'GAJI', 1800000, '2025-09-25', 'GAJI STAFF ADMINISTRASI SEPTEMBER 2025 | 09/25/2025'),
('TX-2025-10', 'EXPENSE', 'OPERASIONAL', 250000, '2025-09-15', 'SERVIS AC KANTOR | 09/15/2025'),

-- ✅ Transaksi Tahun 2024 (Testing Filter Tahun Lebih Lama)
('TX-2024-01', 'INCOME', 'SPP_SISWA', 400000, '2024-12-20', 'SPP MASUK: DEDI GUNAWAN | CANVA BASIC | 12/20/2024'),
('TX-2024-02', 'EXPENSE', 'HONOR_GURU', 550000, '2024-12-22', 'HONOR CAIR: ANITA RAHMAWATI | CANVA BASIC | 12/22/2024'),
('TX-2024-03', 'EXPENSE', 'LISTRIK', 190000, '2024-12-08', 'BAYAR LISTRIK KANTOR DESEMBER 2024 | 12/08/2024'),
('TX-2024-04', 'EXPENSE', 'GAJI', 1700000, '2024-12-25', 'GAJI STAFF ADMINISTRASI DESEMBER 2024 | 12/25/2024'),
('TX-2024-05', 'EXPENSE', 'OPERASIONAL', 500000, '2024-11-10', 'BELI KURSI KANTOR 2 UNIT | 11/10/2024'),
('TX-2024-06', 'INCOME', 'UMUM', 2000000, '2024-11-05', 'HIBAH DARI YAYASAN PENDIDIKAN | 11/05/2024'),
('TX-2024-07', 'EXPENSE', 'LISTRIK', 170000, '2024-10-05', 'BAYAR LISTRIK KANTOR OKTOBER 2024 | 10/05/2024');

-- [15] MATIKAN RLS (ROW LEVEL SECURITY)
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_notes DISABLE ROW LEVEL SECURITY;

-- ========================================
-- ✅ VERIFICATION QUERIES (Optional)
-- ========================================

-- Cek total guru:
-- SELECT COUNT(*) as total_teachers FROM teachers;

-- Cek total attendance guru:
-- SELECT COUNT(*) as total_teacher_sessions FROM attendance;

-- Cek total attendance siswa:
-- SELECT COUNT(*) as total_student_sessions FROM student_attendance;

-- Cek total sales contacts:
-- SELECT COUNT(*) as total_sales_contacts FROM sales_contacts;

-- Cek total transaksi:
-- SELECT COUNT(*) as total_transactions FROM transactions;

-- Lihat semua transaksi per kategori:
-- SELECT category, COUNT(*) as total, SUM(amount) as total_amount
-- FROM transactions
-- GROUP BY category
-- ORDER BY category;

-- Lihat transaksi minggu ini:
-- SELECT * FROM transactions
-- WHERE date >= (CURRENT_DATE - INTERVAL '7 days')::TEXT
-- ORDER BY date DESC;

-- Lihat semua sales contacts:
-- SELECT * FROM sales_contacts ORDER BY next_followup_date ASC;

-- Lihat sales contacts yang urgent (>7 hari):
-- SELECT institution_name, contact_person, last_contact_date 
-- FROM sales_contacts 
-- WHERE (CURRENT_DATE - last_contact_date::DATE) > 7
-- ORDER BY last_contact_date ASC;
