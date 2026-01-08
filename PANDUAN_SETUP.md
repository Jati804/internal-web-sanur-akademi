
# 📜 Gabungan SQL Final SANUR (Update Jan 2026 - Versi Transparansi Gaji)

Gunakan kode di bawah ini di **SQL Editor Supabase** (Klik "New Query", paste, lalu "Run"). Script ini akan menghapus tabel lama dan membangun struktur baru yang mendukung fitur "Vibe Orange" untuk guru pengganti.

```sql
-- [1] BERSIHKAN DATABASE
drop table if exists attendance cascade;
drop table if exists student_payments cascade;
drop table if exists transactions cascade;
drop table if exists teachers cascade;
drop table if exists student_accounts cascade;
drop table if exists student_profiles cascade;
drop table if exists audit_logs cascade;
drop table if exists settings cascade;

-- [2] TABEL AKSES USER
create table teachers (
  id text primary key, 
  name text, 
  role text default 'TEACHER', 
  username text unique, 
  pin text default '4488'
);

create table student_accounts (
  id text primary key, 
  name text, 
  role text default 'STUDENT', 
  username text unique, 
  pin text default '1234'
);

-- [3] TABEL BUKU INDUK
create table student_profiles (
  id text primary key, 
  name text, 
  dob text, 
  institution text, 
  personalphone text, 
  parentphone text, 
  enrolledclass text, 
  notes text
);

-- [4] TABEL ABSENSI & LOG SESI (VERSI FINAL TRANSPARANSI)
create table attendance (
  id text primary key, 
  teacherid text default 'SELF', 
  teachername text default 'MANDIRI', 
  date text, 
  clockin text, 
  status text default 'SESSION_LOG', 
  classname text, 
  level text,
  sessioncategory text default 'REGULER',
  duration int default 2,
  packageid text, 
  sessionnumber int default 1, 
  studentsattended jsonb default '[]'::jsonb, 
  studentsessions jsonb default '{}'::jsonb, 
  studentscores jsonb default '{}'::jsonb, 
  studenttopics jsonb default '{}'::jsonb,
  studentnarratives jsonb default '{}'::jsonb, 
  earnings int default 0, 
  paymentstatus text default 'UNPAID', 
  reportnarrative text default '', 
  receiptdata text default null,
  substitutefor text default null, -- Nama guru yang dibantu
  originalteacherid text default null -- ID Guru pemilik paket asli
);

-- [5] TABEL BUKU KAS & SPP
create table transactions (
  id text primary key, 
  type text, 
  category text, 
  amount int, 
  date text, 
  description text
);

create table student_payments (
  id text primary key, 
  studentname text, 
  classname text, 
  amount int, 
  date text, 
  status text default 'PENDING', 
  note text, 
  receiptdata text default null 
);

-- [6] PENGATURAN SISTEM
create table settings (
  key text primary key, 
  value jsonb
);

-- [7] INPUT DATA AWAL (USER)
insert into teachers (id, name, role, username, pin) values 
('admin-1', 'PENGURUS SANUR', 'ADMIN', 'pengurus_sanur2024', '4488'),
('guru-1', 'SRI ISTI UNTARI', 'TEACHER', 'guru_sri', '4488'),
('guru-2', 'ANITA RAHMAWATI', 'TEACHER', 'guru_anita', '4488');

insert into student_accounts (id, name, role, username, pin) values 
('stud-1', 'BUDI SANTOSO', 'STUDENT', 'budi_sanur', '1234');

-- [8] INPUT KONFIGURASI
insert into settings (key, value) values 
('academic_config', '{"subjects": ["Pelatihan Microsoft Word", "Pelatihan Microsoft Excel", "Desain Grafis Canva"], "levels": ["BASIC", "INTERMEDIATE"], "classes": ["Reguler 1", "Private 1"]}'::jsonb),
('salary_config', '{"regulerRate": 90000, "privateRate": 75000}'::jsonb);

-- [9] SIMULASI DATA: KASUS GURU PENGGANTI (PENTING!)
-- Paket Belajar WORD BASIC - Reguler 1 (Paket ID: PKG-SIMULASI-01)
-- Sesi 1, 3, 4: Diajar oleh SRI (Biru)
-- Sesi 2: SRI berhalangan, diganti oleh ANITA (ANITA jadi Orange, SRI jadi Abu Hati)

insert into attendance (id, teacherid, teachername, date, clockin, status, classname, level, sessioncategory, duration, packageid, sessionnumber, studentsattended, earnings, paymentstatus, substitutefor, originalteacherid) values 
('SIM-1', 'guru-1', 'SRI ISTI UNTARI', '2026-01-01', '08:00', 'SESSION_LOG', 'Pelatihan Microsoft Word (BASIC) - Reguler 1', 'BASIC', 'REGULER', 2, 'PKG-SIMULASI-01', 1, '["REGULER"]', 180000, 'UNPAID', null, 'guru-1'),
('SIM-2', 'guru-2', 'ANITA RAHMAWATI', '2026-01-02', '08:00', 'SUB_LOG', 'Pelatihan Microsoft Word (BASIC) - Reguler 1', 'BASIC', 'REGULER', 2, 'PKG-SIMULASI-01', 2, '["REGULER"]', 180000, 'UNPAID', 'SRI ISTI UNTARI', 'guru-1'),
('SIM-3', 'guru-1', 'SRI ISTI UNTARI', '2026-01-03', '08:00', 'SESSION_LOG', 'Pelatihan Microsoft Word (BASIC) - Reguler 1', 'BASIC', 'REGULER', 2, 'PKG-SIMULASI-01', 3, '["REGULER"]', 180000, 'UNPAID', null, 'guru-1'),
('SIM-4', 'guru-1', 'SRI ISTI UNTARI', '2026-01-04', '08:00', 'SESSION_LOG', 'Pelatihan Microsoft Word (BASIC) - Reguler 1', 'BASIC', 'REGULER', 2, 'PKG-SIMULASI-01', 4, '["REGULER"]', 180000, 'UNPAID', null, 'guru-1');

-- [10] MATIKAN RLS
alter table attendance disable row level security;
alter table student_payments disable row level security;
alter table transactions disable row level security;
alter table teachers disable row level security;
alter table student_accounts disable row level security;
alter table student_profiles disable row level security;
alter table settings disable row level security;
```
