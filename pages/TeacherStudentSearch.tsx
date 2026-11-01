import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, TeacherStudentPin } from '../types';
import { supabase, waitForActiveSession } from '../services/supabase.ts';
import { Search, Pin, Zap, Check, CheckCircle2, Loader2, Info, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================================
// 🔍 CARI SISWA (khusus guru) — HANYA LIHAT, tidak mengubah absen apa pun.
// Progres sesi diambil dari absen MANDIRI siswa (student_attendance), dengan
// aturan yang sama persis dengan "Kelas Saya" di StudentPortal.
// Pin menempel ke SISWA + MATA PELAJARAN (tabel teacher_student_pins).
// ============================================================================

interface Props {
  user: User;
  studentAccounts: any[];
  studentPayments: any[];
  studentAttendanceLogs: any[];
  reports: any[];
}

// ---------- helper murni (di luar komponen supaya gampang diuji) ----------

const norm = (s: any) => String(s ?? '').toUpperCase().trim();

// "PELATIHAN MICROSOFT WORD (BASIC) - REGULER 2" -> { subject, level, room }
export const parseClassName = (className: any) => {
  const raw = norm(className);
  const m = raw.match(/^(.*?)\s*\((.*?)\)\s*-\s*(.*)$/);
  return m
    ? { subject: m[1].trim(), level: m[2].trim(), room: m[3].trim() }
    : { subject: raw, level: '', room: '' };
};

// 'YYYY-MM-DD' -> '5 Okt' (hari + nama bulan, supaya tidak ambigu seperti 05/10)
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const fmtShortDate = (d?: string) => {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const mon = MONTHS_ID[Number(m[2]) - 1];
  return mon ? `${Number(m[3])} ${mon}` : '';
};

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' (untuk keterangan saat kotak sesi di-hover)
export const fmtFullDate = (d?: string) => {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

const stripPelatihan = (s: string) => s.replace(/^PELATIHAN\s+/i, '');

// Satu aturan "ruang private" yang sama dengan TeacherDashboard / ScheduleModal
const isPrivateRoom = (room: string) => /PRIVATE|PRIVAT|HOME TUTORING/i.test(room || '');

// Label kelas untuk chip filter: "CANVA - PRIVATE 1"
const classLabel = (subject: string, room: string) => [stripPelatihan(subject), room].filter(Boolean).join(' - ');

const LEVEL_ORDER = ['BASIC', 'INTERMEDIATE', 'ADVANCED'];
const levelRank = (lvl: string) => {
  const i = LEVEL_ORDER.indexOf(lvl);
  return i === -1 ? 99 : i;
};

export type CourseInfo = {
  paymentId: string;
  className: string;
  subject: string;
  level: string;
  room: string;
  displayDone: number;            // 0..6 (sama seperti progres di portal siswa)
  dates: Record<number, string>;  // nomor sesi -> tanggal absen mandiri
  lastDate?: string;              // tanggal absen mandiri TERBARU (untuk "terakhir absen")
  published: boolean;             // rapot sudah terkirim ke siswa
  waitingRelease: boolean;
  requesting: boolean;
  rejected: boolean;
};

export const buildIndexes = (studentPayments: any[], studentAttendanceLogs: any[], reports: any[]) => {
  const paymentsByStudent = new Map<string, any[]>();
  for (const p of studentPayments || []) {
    if (p.status !== 'VERIFIED') continue;
    const key = norm(p.studentName ?? p.studentname);
    const arr = paymentsByStudent.get(key);
    if (arr) arr.push(p); else paymentsByStudent.set(key, [p]);
  }

  const attendance = new Map<string, any[]>();
  for (const l of studentAttendanceLogs || []) {
    const key = `${norm(l.packageid ?? l.packageId)}|${norm(l.studentname ?? l.studentName)}`;
    const arr = attendance.get(key);
    if (arr) arr.push(l); else attendance.set(key, [l]);
  }

  const reportsByPkg = new Map<string, any[]>();
  for (const r of reports || []) {
    const key = norm(r.packageId ?? r.packageid);
    if (!key) continue;
    const arr = reportsByPkg.get(key);
    if (arr) arr.push(r); else reportsByPkg.set(key, [r]);
  }

  return { paymentsByStudent, attendance, reportsByPkg };
};

export type Indexes = ReturnType<typeof buildIndexes>;

// Kelas yang MASIH BERJALAN milik seorang siswa (pembayaran VERIFIED yang rapotnya belum terkirim)
export const getRunningCourses = (idx: Indexes, studentName: string): CourseInfo[] => {
  const name = norm(studentName);
  const payments = [...(idx.paymentsByStudent.get(name) || [])].sort((a, b) => {
    const da = new Date(a.date || 0).getTime();
    const db = new Date(b.date || 0).getTime();
    if (db !== da) return db - da;
    return String(b.id).localeCompare(String(a.id));
  });

  const result: CourseInfo[] = [];
  for (const p of payments) {
    const pkg = norm(p.id);

    // --- progres: sama dengan completedSessions + maxSess di StudentPortal ---
    const done = idx.attendance.get(`${pkg}|${name}`) || [];
    const nums = done.map(l => Number(l.sessionnumber ?? l.sessionNumber) || 0);
    const maxSess = new Set(nums).size;
    const dates: Record<number, string> = {};
    done.forEach((l, i) => {
      const n = nums[i];
      if (n >= 1 && n <= 6 && l.date && (!dates[n] || String(l.date) < dates[n])) dates[n] = String(l.date);
    });

    // --- status rapot: sama dengan findOfficialReportLog + isReportPublished di StudentPortal ---
    const courseReports = (idx.reportsByPkg.get(pkg) || []).filter(
      r => Array.isArray(r.studentsAttended) && r.studentsAttended.some((s: any) => norm(s) === name)
    );
    const official = courseReports
      .filter(r =>
        (r.status === 'SESSION_LOG' || r.status === 'REPORT_READY') &&
        Number(r.sessionNumber) === 6 &&
        r.studentScores && Object.keys(r.studentScores).length > 0
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const published = !!official && official.status === 'SESSION_LOG';
    const waitingRelease = !!official && official.status === 'REPORT_READY';
    // Kelas selesai -> tidak ditampilkan lagi. Ada 2 jalur selesai setelah 6/6:
    //  1) rapot sudah terkirim ke siswa (SESSION_LOG), atau
    //  2) guru memutuskan "Lanjut Kelas" (NEXT_CLASS) = paket ini ditutup TANPA rapot, siswa lanjut beli paket berikutnya.
    const nextClass = courseReports.some(r => r.status === 'NEXT_CLASS');
    if (published || nextClass) continue;

    const parsed = parseClassName(p.className);
    result.push({
      paymentId: String(p.id),
      className: norm(p.className),
      subject: parsed.subject,
      level: parsed.level,
      room: parsed.room,
      displayDone: Math.min(waitingRelease ? 6 : maxSess, 6),
      dates,
      lastDate: Object.values(dates).sort().pop(),
      published,
      waitingRelease,
      requesting: courseReports.some(r => r.status === 'REQ'),
      rejected: courseReports.some(r => r.status === 'REPORT_REJECTED'),
    });
  }
  return result;
};

// Pin yang "tidur": siswa tidak punya kelas berjalan untuk mata pelajaran itu DAN aktivitas terakhirnya
// (absen / rapot / pembayaran di mata pelajaran itu) sudah lebih dari 90 hari lalu.
// Aman: pin hanya dianggap tidur kalau aktivitas lama BENAR-BENAR ditemukan. Akun tidak ketemu /
// tidak ada riwayat sama sekali -> tidak dihapus (data mungkin belum lengkap termuat).
export const findStalePins = (
  pins: TeacherStudentPin[],
  studentAccounts: any[],
  studentPayments: any[],
  studentAttendanceLogs: any[],
  reports: any[],
  nowMs: number,
  staleDays = 90
): TeacherStudentPin[] => {
  const idx = buildIndexes(studentPayments, studentAttendanceLogs, reports);
  const accounts = new Map<string, any>();
  (studentAccounts || []).forEach((a: any) => accounts.set(String(a.id), a));
  const limit = staleDays * 24 * 60 * 60 * 1000;
  const toMs = (d: any) => { const t = new Date(d).getTime(); return isNaN(t) ? 0 : t; };

  const stale: TeacherStudentPin[] = [];
  for (const pin of pins || []) {
    const acc = accounts.get(String(pin.studentid));
    if (!acc) continue;
    const subject = norm(pin.subject);
    const name = norm(acc.name);
    if (getRunningCourses(idx, acc.name).some(c => c.subject === subject)) continue; // masih ada kelas berjalan

    let last = 0;
    for (const l of studentAttendanceLogs || []) {
      if (norm(l.studentName ?? l.studentname) !== name) continue;
      if (parseClassName(l.className ?? l.classname).subject !== subject) continue;
      last = Math.max(last, toMs(l.date));
    }
    for (const r of reports || []) {
      if (!Array.isArray(r.studentsAttended) || !r.studentsAttended.some((n: any) => norm(n) === name)) continue;
      if (parseClassName(r.className ?? r.classname).subject !== subject) continue;
      last = Math.max(last, toMs(r.date));
    }
    for (const p of studentPayments || []) { // pembayaran apa pun, termasuk yang menunggu verifikasi
      if (norm(p.studentName ?? p.studentname) !== name) continue;
      if (parseClassName(p.className).subject !== subject) continue;
      const created = Number(String(p.id ?? '').replace(/\D/g, '')); // ID = "PAY-<waktu dibuat, ms>"
      last = Math.max(last, created > 1e12 ? created : toMs(p.date));
    }
    if (last > 0 && nowMs - last > limit) stale.push(pin);
  }
  return stale;
};

type Tone = 'blue' | 'amber' | 'orange' | 'rose' | 'emerald';

export const getStatus = (c: CourseInfo): { text: string; tone: Tone; bolt?: boolean } | null => {
  if (c.waitingRelease) return { text: 'Rapot siap, menunggu rilis', tone: 'amber' };
  if (c.requesting) return { text: 'Sudah klaim rapot', tone: 'orange' };
  if (c.rejected) return { text: 'Klaim rapot ditolak · Klaim ulang', tone: 'emerald' };
  if (c.displayDone >= 6) return { text: 'Selesai 6/6 · belum klaim rapot', tone: 'emerald' };
  if (c.displayDone === 5) return { text: 'Berikutnya: EVALUASI', tone: 'blue', bolt: true };
  return null;
};

const TONE_CLASS: Record<Tone, string> = {
  blue: 'bg-blue-600 text-white',
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  rose: 'bg-rose-100 text-rose-700',
  emerald: 'bg-emerald-100 text-emerald-700',
};

// ---------- potongan tampilan ----------

const StatusBadge: React.FC<{ c: CourseInfo }> = ({ c }) => {
  const s = getStatus(c);
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${TONE_CLASS[s.tone]}`}>
      {s.bolt && <Zap size={10} className="fill-current" />}
      {s.text}
    </span>
  );
};

const SessionChips: React.FC<{ c: CourseInfo }> = ({ c }) => (
  <div className="flex flex-wrap xl:flex-nowrap xl:shrink-0 gap-2">
    {[1, 2, 3, 4, 5, 6].map(n => {
      const d = c.dates[n];
      return (
        <div
          key={n}
          title={d ? `Sesi ${n}: ${fmtFullDate(d)}` : undefined}
          className={`w-11 h-10 rounded-xl flex items-center justify-center gap-0.5 text-[11px] font-black border ${d ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-dashed border-slate-200 text-slate-300'}`}
        >
          {n}
          {d && <Check size={11} strokeWidth={3} />}
        </div>
      );
    })}
  </div>
);

// "Sesi 3/6 · terakhir absen 15 Okt" + lencana status
const ProgressLine: React.FC<{ c: CourseInfo }> = ({ c }) => (
  <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
    <span className="text-[10px] font-black text-blue-600">Sesi {c.displayDone}/6</span>
    <span className="text-[10px] font-bold text-slate-400">
      {c.lastDate ? `· terakhir absen ${fmtShortDate(c.lastDate)}` : '· belum ada absen'}
    </span>
    <StatusBadge c={c} />
  </div>
);

const PinButton: React.FC<{ pinned: boolean; busy: boolean; onClick: () => void; className?: string }> = ({ pinned, busy, onClick, className = '' }) => (
  <button
    onClick={onClick}
    disabled={busy}
    title={pinned ? 'Lepas pantauan' : 'Pantau siswa ini'}
    aria-label={pinned ? 'Lepas pantauan' : 'Pantau siswa ini'}
    className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 ${pinned ? 'bg-orange-500 text-white shadow-md hover:bg-orange-600' : 'bg-slate-100 text-slate-400 hover:bg-orange-50 hover:text-orange-600'} ${className}`}
  >
    {busy ? <Loader2 size={16} className="animate-spin" /> : <Pin size={16} className={pinned ? 'fill-current' : ''} />}
  </button>
);

// Baris pil yang bisa digeser: scrollbar bawaan disembunyikan, diganti pudar di tepi + tombol panah bulat
const ChipScroller: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdge(prev => (prev.left === left && prev.right === right ? prev : { left, right }));
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  const scrollByDir = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const arrowCls = 'absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-100 shadow-md flex items-center justify-center text-slate-500 hover:text-blue-600 active:scale-95 transition-all';

  return (
    <div className="relative">
      {edge.left && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-[5] bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent" />
          <button type="button" aria-label="Geser ke kiri" onClick={() => scrollByDir(-1)} className={`${arrowCls} left-0`}>
            <ChevronLeft size={16} strokeWidth={3} />
          </button>
        </>
      )}
      <div
        ref={ref}
        onScroll={update}
        style={{ scrollbarWidth: 'none' }}
        className="flex gap-2 overflow-x-auto py-1 px-1 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {edge.right && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-[5] bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent" />
          <button type="button" aria-label="Geser ke kanan" onClick={() => scrollByDir(1)} className={`${arrowCls} right-0`}>
            <ChevronRight size={16} strokeWidth={3} />
          </button>
        </>
      )}
    </div>
  );
};

// ---------- halaman ----------

const TeacherStudentSearch: React.FC<Props> = ({ user, studentAccounts, studentPayments, studentAttendanceLogs, reports }) => {
  const [query, setQuery] = useState('');
  const [pins, setPins] = useState<TeacherStudentPin[]>([]);
  const [loadingPins, setLoadingPins] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('SEMUA');

  // Muat daftar pin milik guru ini
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await waitForActiveSession();
        const { data, error } = await supabase.from('teacher_student_pins').select('*').eq('teacherid', user.id);
        if (error) throw error;
        if (!cancelled) setPins((data || []) as TeacherStudentPin[]);
      } catch (e: any) {
        console.error('Gagal memuat pin siswa:', e);
        if (!cancelled) setLoadError('Daftar pantauan belum bisa dimuat. Coba muat ulang halaman ya.');
      } finally {
        if (!cancelled) setLoadingPins(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  // Bersihkan pin yang tidur > 90 hari (sekali per kunjungan, setelah pin & data lengkap termuat)
  const cleanedRef = useRef(false);
  useEffect(() => {
    if (cleanedRef.current || loadingPins || loadError || pins.length === 0) return;
    if (!studentAccounts?.length || !studentPayments?.length || !studentAttendanceLogs?.length) return; // data belum lengkap
    cleanedRef.current = true;
    const stale = findStalePins(pins, studentAccounts, studentPayments, studentAttendanceLogs, reports, Date.now());
    if (stale.length === 0) return;
    (async () => {
      try {
        for (const pin of stale) {
          const { error } = await supabase
            .from('teacher_student_pins').delete()
            .eq('teacherid', user.id).eq('studentid', pin.studentid).eq('subject', pin.subject);
          if (error) throw error;
        }
        setPins(prev => prev.filter(p => !stale.some(x => x.studentid === p.studentid && norm(x.subject) === norm(p.subject))));
      } catch (e) {
        console.error('Gagal membersihkan pin lama:', e); // tidak mengganggu guru; dicoba lagi saat halaman dibuka berikutnya
      }
    })();
  }, [loadingPins, loadError, pins, studentAccounts, studentPayments, studentAttendanceLogs, reports]);

  const idx = useMemo(
    () => buildIndexes(studentPayments, studentAttendanceLogs, reports),
    [studentPayments, studentAttendanceLogs, reports]
  );

  const accountsById = useMemo(() => {
    const m = new Map<string, any>();
    (studentAccounts || []).forEach((a: any) => m.set(String(a.id), a));
    return m;
  }, [studentAccounts]);

  const pinnedSet = useMemo(() => new Set(pins.map(p => `${p.studentid}|${norm(p.subject)}`)), [pins]);
  const isPinned = (studentId: string, subject: string) => pinnedSet.has(`${studentId}|${norm(subject)}`);

  const togglePin = async (studentId: string, subject: string) => {
    if (busyKey) return;
    const subj = norm(subject);
    const key = `${studentId}|${subj}`;
    setBusyKey(key);
    try {
      if (isPinned(studentId, subj)) {
        const { error } = await supabase
          .from('teacher_student_pins').delete()
          .eq('teacherid', user.id).eq('studentid', studentId).eq('subject', subj);
        if (error) throw error;
        setPins(prev => prev.filter(p => !(p.studentid === studentId && norm(p.subject) === subj)));
      } else {
        const { data, error } = await supabase
          .from('teacher_student_pins')
          .insert({ teacherid: user.id, studentid: studentId, subject: subj })
          .select().single();
        if (error && (error as any).code !== '23505') throw error; // 23505 = sudah ada, anggap berhasil
        setPins(prev => prev.some(p => p.studentid === studentId && norm(p.subject) === subj)
          ? prev
          : [...prev, (data as TeacherStudentPin) || { teacherid: user.id, studentid: studentId, subject: subj }]);
      }
    } catch (e: any) {
      console.error('Gagal mengubah pin:', e);
      alert('Waduh, pantauan gagal disimpan. Coba lagi ya ✨');
    } finally {
      setBusyKey(null);
    }
  };

  // ---------- hasil pencarian ----------
  const { results, totalMatches } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { results: [] as { account: any; courses: CourseInfo[] }[], totalMatches: 0 };
    const matches = (studentAccounts || [])
      .filter((a: any) => String(a.name || '').toLowerCase().includes(q))
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    return {
      totalMatches: matches.length,
      results: matches.slice(0, 8).map((a: any) => ({ account: a, courses: getRunningCourses(idx, a.name) })),
    };
  }, [query, studentAccounts, idx]);

  // ---------- daftar pantauan: mata pelajaran + ruang (mis. CANVA - PRIVATE 1) -> siswa (level, lalu progres tertinggi) ----------
  const watch = useMemo(() => {
    type Item = { studentId: string; studentName: string; course: CourseInfo };
    const items: Item[] = [];
    for (const pin of pins) {
      const acc = accountsById.get(String(pin.studentid));
      if (!acc) continue;
      getRunningCourses(idx, acc.name)
        .filter(c => c.subject === norm(pin.subject))
        // Sudah klaim / rapot siap menunggu rilis -> sudah terlihat di menu "Rapot Siswa", jadi tidak perlu tampil di pantauan
        .filter(c => !c.requesting && !c.waitingRelease)
        .forEach(c => items.push({ studentId: String(acc.id), studentName: String(acc.name), course: c }));
    }

    const byClass = new Map<string, { key: string; subject: string; room: string; items: Item[] }>();
    for (const it of items) {
      const key = `${it.course.subject}||${it.course.room}`;
      const g = byClass.get(key) || { key, subject: it.course.subject, room: it.course.room, items: [] };
      g.items.push(it);
      byClass.set(key, g);
    }

    const groups = Array.from(byClass.values())
      .sort((a, b) => a.subject.localeCompare(b.subject) || a.room.localeCompare(b.room))
      .map(g => ({
        ...g,
        items: [...g.items].sort((a, b) =>
          levelRank(a.course.level) - levelRank(b.course.level) ||
          b.course.displayDone - a.course.displayDone ||
          a.studentName.localeCompare(b.studentName)),
      }));
    return { groups, total: items.length };
  }, [pins, accountsById, idx]);

  // Kalau kelas yang sedang difilter sudah tidak ada (pin terakhirnya dilepas), otomatis balik ke "Semua"
  const activeFilter = watch.groups.some(g => g.key === subjectFilter) ? subjectFilter : 'SEMUA';
  const visibleGroups = activeFilter === 'SEMUA' ? watch.groups : watch.groups.filter(g => g.key === activeFilter);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-40 px-4">
      <header className="space-y-4 px-2">
        <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Pantau <span className="text-orange-600">Siswa</span></h2>
      </header>

      <div className="flex items-start gap-3 px-2">
        <Eye size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
          Progres di sini diambil dari absen mandiri siswa, sebagai patokan kapan siswa masuk sesi evaluasi. Halaman ini hanya untuk dilihat dan tidak mengubah absen siswa. Cari nama siswa yang Anda ajar, lalu tekan ikon pin 📌 di sebelah kanan kartu siswa untuk memantau progres mereka.
        </p>
      </div>

      {/* KOTAK CARI */}
      <section className="space-y-5">
        <div className="relative">
          <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari nama siswa..."
            autoComplete="off"
            className="w-full pl-16 pr-6 py-5 bg-white rounded-full font-black text-sm outline-none border-2 border-slate-100 focus:border-blue-500 shadow-sm transition-all"
          />
        </div>

        {query.trim().length === 1 && (
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ketik minimal 2 huruf ya ✨</p>
        )}

        {query.trim().length >= 2 && results.length === 0 && (
          <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-10 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Siswa dengan nama itu tidak ditemukan</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-5">
            {results.map(({ account, courses }) => (
              <div key={account.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm p-6 md:p-8 space-y-4">
                <p className="text-lg font-black text-slate-800 uppercase italic tracking-tight leading-tight">{account.name}</p>
                {courses.length === 0 ? (
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Belum ada kelas yang sedang berjalan</p>
                ) : (
                  <div className="space-y-3">
                    {courses.map(c => {
                      const key = `${account.id}|${c.subject}`;
                      return (
                        <div key={c.paymentId} className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-[2rem] px-6 py-5">
                          <div className="min-w-0 space-y-2 pr-14 xl:pr-0 xl:flex-1">
                            <p className="text-[11px] font-black text-slate-800 uppercase italic leading-tight">{stripPelatihan(c.className)}</p>
                            <ProgressLine c={c} />
                          </div>
                          <SessionChips c={c} />
                          <PinButton
                            pinned={isPinned(String(account.id), c.subject)}
                            busy={busyKey === key}
                            onClick={() => togglePin(String(account.id), c.subject)}
                            className="absolute top-4 right-4 xl:static"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {totalMatches > results.length && (
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                Menampilkan {results.length} dari {totalMatches} siswa — ketik nama lebih lengkap untuk mempersempit.
              </p>
            )}
          </div>
        )}
      </section>

      {/* DAFTAR PANTAUAN */}
      <section className="space-y-6">
        {loadingPins ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-300">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest italic">Memuat pantauan...</p>
          </div>
        ) : loadError ? (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-3xl px-6 py-4">
            <Info size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-rose-700 leading-relaxed">{loadError}</p>
          </div>
        ) : pins.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-12 text-center space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Belum ada siswa yang dipantau</p>
          </div>
        ) : watch.total === 0 ? (
          <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-12 text-center space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-emerald-400" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Tidak ada siswa yang sedang belajar saat ini</p>
            <p className="text-[10px] font-bold text-slate-300">Yang sudah klaim rapot ada di menu Rapot Siswa. Kalau mereka membeli kelas lagi, otomatis muncul di sini.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {watch.groups.length > 1 && (
              <ChipScroller>
                {[{ key: 'SEMUA', label: 'Semua', room: '' }, ...watch.groups.map(g => ({ key: g.key, label: classLabel(g.subject, g.room), room: g.room }))].map(c => {
                  const priv = isPrivateRoom(c.room);
                  const active = activeFilter === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={e => { setSubjectFilter(c.key); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                      className={`shrink-0 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                        active
                          ? (priv ? 'bg-orange-500 text-white shadow-md' : 'bg-blue-600 text-white shadow-md')
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </ChipScroller>
            )}
            {visibleGroups.map(g => (
              <div key={g.key} className="space-y-3">
                <h4 className="px-2 text-sm font-black text-slate-800 uppercase italic tracking-wide">
                  {stripPelatihan(g.subject)}
                  {g.room && <span className={isPrivateRoom(g.room) ? 'text-orange-500' : 'text-blue-900'}> - {g.room}</span>}
                </h4>
                {g.items.map(it => {
                  const key = `${it.studentId}|${it.course.subject}`;
                  return (
                    <div key={`${it.studentId}|${it.course.paymentId}`} className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white border-2 border-slate-100 shadow-sm rounded-[2rem] px-6 py-5">
                      <div className="min-w-0 space-y-2 pr-14 xl:pr-0 xl:flex-1">
                        <p className="text-[12px] font-black text-slate-800 uppercase italic leading-tight">
                          {it.studentName}
                          {it.course.level && <span className="text-slate-400"> - {it.course.level}</span>}
                        </p>
                        <ProgressLine c={it.course} />
                      </div>
                      <SessionChips c={it.course} />
                      <PinButton
                        pinned
                        busy={busyKey === key}
                        onClick={() => togglePin(it.studentId, it.course.subject)}
                        className="absolute top-4 right-4 xl:static"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TeacherStudentSearch;
