import React, { useMemo } from 'react';
import { User, Attendance, Transaction } from '../types';
import { 
  PhoneForwarded, 
  Zap, 
  Calendar,
  UserCheck,
  Receipt,
  Wallet,
  CreditCard,
  ArrowRight,
  Clock,
  Rocket,
  Info
} from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM as any;

interface AdminDashboardProps {
  user: User;
  attendanceLogs: Attendance[];
  studentAttendanceLogs: any[];
  setAttendanceLogs: React.Dispatch<React.SetStateAction<Attendance[]>>;
  teachers: User[];
  transactions: Transaction[];
  reports?: any[];
  studentPayments?: any[];
}

// ============================================================================
// 📋 LOGIKA FOLLOW-UP (fungsi murni, di luar komponen supaya gampang diuji)
// Tiga jenis kartu:
//  1) SESI_5     : paket TERBARU siswa baru sampai sesi 5 (sebentar lagi evaluasi), maksimal 30 hari sejak sesi 5 diabsen.
//  2) SELESAI    : paket TERBARU sudah sesi 6 (6/6), maksimal 30 hari sejak sesi 6 diabsen.
//                  Hilang lebih cepat kalau kelas lanjutan sudah dibuka (pembayaran baru TERVERIFIKASI
//                  untuk mata pelajaran yang sama) atau guru memutuskan "Lanjut Kelas".
//  3) NEXT_CLASS : guru memutuskan "Lanjut Kelas" tapi kelas barunya belum dibuka (belum lapor bayar /
//                  menunggu verifikasi). Hilang saat pembayaran baru TERVERIFIKASI. Maksimal 30 hari dari tanggal klaim.
// ============================================================================
const norm = (s: any) => String(s ?? '').trim().toUpperCase();
// ID pembayaran = "PAY-<waktu dibuat, ms>" -> angkanya dipakai untuk membandingkan mana yang lebih baru
const pkgTime = (id: any) => Number(String(id ?? '').replace(/\D/g, '')) || 0;
// "PELATIHAN MICROSOFT WORD (BASIC) - REGULER 2" -> "PELATIHAN MICROSOFT WORD"
const subjectOf = (className: any) => {
  const m = norm(className).match(/^(.*?)\s*\((.*?)\)\s*-\s*(.*)$/);
  return m ? m[1].trim() : norm(className);
};
const daysBetween = (today: string, date: string) =>
  (new Date(today).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);

// Berapa lama siswa bertahan di daftar follow-up. Lewat ini dianggap berhenti dan hilang dari daftar.
const FOLLOW_UP_WINDOW_DAYS = 30;
// "hilang N hari lagi" baru ditampilkan di sekian hari terakhir
const EXPIRY_WARN_DAYS = 7;
// Rapot yang menunggu guru >= sekian hari diberi warna peringatan
const RAPOT_TELAT_HARI = 3;
// Umur dalam hari bulat (tanggal kosong / di masa depan dianggap 0)
const ageOf = (today: string, date: string) => {
  const d = Math.floor(daysBetween(today, date));
  return Number.isFinite(d) ? Math.max(0, d) : 0;
};

export type RapotStatus = 'BELUM_KLAIM' | 'DITOLAK' | 'MENUNGGU_GURU' | 'SIAP_KIRIM' | 'TERBIT';

export type FollowUpItem = {
  kind: 'NEXT_CLASS' | 'SESI_5' | 'SELESAI';
  student: string;
  fullClass: string;
  lastSess: number;
  lastDate: string;
  daysAgo: number;         // umur data: sejak sesi terakhir (SESI_5/SELESAI) atau sejak tanggal klaim (NEXT_CLASS)
  daysLeft: number;        // sisa hari sebelum hilang dari daftar
  pendingVerify?: boolean; // khusus NEXT_CLASS: sudah ada laporan bayar baru, tinggal diverifikasi
  rapot?: RapotStatus;     // khusus SELESAI: posisi rapot siswa
  rapotDays?: number;      // khusus MENUNGGU_GURU: sudah berapa hari sejak siswa klaim
};

export const computeFollowUps = (
  studentAttendanceLogs: any[],
  reports: any[],
  studentPayments: any[],
  today: string
): FollowUpItem[] => {
  // Paket yang sudah diputuskan "Lanjut Kelas" diwakili kartu ungu, jadi tidak ikut kartu "SELESAI"
  const nextClassPkg = new Set<string>();
  for (const r of reports || []) {
    if (r.status !== 'NEXT_CLASS') continue;
    const pkg = norm(r.packageId ?? r.packageid);
    (Array.isArray(r.studentsAttended) ? r.studentsAttended : []).forEach((n: any) => nextClassPkg.add(`${pkg}|${norm(n)}`));
  }

  // Pembayaran (selain REJECTED) per siswa, untuk mengecek "kelas lanjutan sudah dilaporkan / dibuka?"
  const payById = new Map<string, any>();
  const livePaymentsByStudent = new Map<string, any[]>();
  for (const p of studentPayments || []) {
    payById.set(norm(p.id), p);
    if (p.status === 'REJECTED') continue;
    const key = norm(p.studentName ?? p.studentname);
    const arr = livePaymentsByStudent.get(key);
    if (arr) arr.push(p); else livePaymentsByStudent.set(key, [p]);
  }
  // Pembayaran BARU = ID lebih besar dari paket yang bersangkutan (ID = waktu dibuat) dan mata pelajaran sama
  const newerPayments = (student: string, subject: string, pkg: string) =>
    (livePaymentsByStudent.get(student) || []).filter(p => subjectOf(p.className) === subject && pkgTime(p.id) > pkgTime(pkg));

  // Status rapot per paket+siswa (khusus baris SELESAI). NEXT_CLASS tidak dihitung: itu jalur tanpa rapot.
  // Kalau ada beberapa baris untuk kunci yang sama, ambil yang paling maju.
  const RAPOT_RANK: Record<string, number> = { REPORT_REJECTED: 1, REQ: 2, REPORT_READY: 3, SESSION_LOG: 4 };
  const rapotByKey = new Map<string, any>();
  for (const r of reports || []) {
    const rank = RAPOT_RANK[r.status];
    if (!rank) continue;
    const pkg = norm(r.packageId ?? r.packageid);
    const names = (Array.isArray(r.studentsAttended) && r.studentsAttended.length ? r.studentsAttended : [payById.get(pkg)?.studentName]).filter(Boolean);
    for (const n of names) {
      const k = `${pkg}|${norm(n)}`;
      const cur = rapotByKey.get(k);
      if (!cur || RAPOT_RANK[cur.status] < rank) rapotByKey.set(k, r);
    }
  }

  // ---- 1 & 2: baris SESI_5 / SELESAI ----
  // Per siswa + nama kelas, ambil PAKET TERBARU (ID pembayaran terbesar). Kalau siswa sudah
  // beli paket baru dengan nama kelas yang sama, paket lamanya tidak dihitung lagi.
  // Status ditentukan oleh NOMOR SESI TERTINGGI di paket itu (bukan tanggal, karena tanggal
  // dipilih siswa sendiri dan bisa acak). Tanggal hanya dipakai untuk menghitung "berapa hari lalu".
  const groups = new Map<string, { student: string; fullClass: string; pkgs: Map<string, any[]> }>();
  for (const log of studentAttendanceLogs || []) {
    const student = norm(log.studentName || log.studentname);
    const fullClass = String(log.className || log.classname || 'UMUM').toUpperCase();
    const key = `${student}|||${fullClass}`;
    const pkg = norm(log.packageId ?? log.packageid);
    let g = groups.get(key);
    if (!g) { g = { student, fullClass, pkgs: new Map() }; groups.set(key, g); }
    const arr = g.pkgs.get(pkg);
    if (arr) arr.push(log); else g.pkgs.set(pkg, [log]);
  }

  const progress: FollowUpItem[] = [];
  groups.forEach(g => {
    const maxDate = (logs: any[]) => logs.reduce((m, l) => (String(l.date) > m ? String(l.date) : m), '');
    const [pkgId, logs] = Array.from(g.pkgs.entries()).sort(
      (a, b) => pkgTime(b[0]) - pkgTime(a[0]) || maxDate(b[1]).localeCompare(maxDate(a[1]))
    )[0];

    const sessOf = (l: any) => Number(l.sessionNumber || l.sessionnumber || 0);
    const lastSess = logs.reduce((m, l) => Math.max(m, sessOf(l)), 0);
    const lastDate = maxDate(logs.filter(l => sessOf(l) === lastSess));

    const daysAgo = ageOf(today, lastDate);
    const daysLeft = FOLLOW_UP_WINDOW_DAYS - daysAgo;

    if (lastSess === 5) {
      if (daysAgo <= FOLLOW_UP_WINDOW_DAYS) {
        progress.push({ kind: 'SESI_5', student: g.student, fullClass: g.fullClass, lastSess, lastDate, daysAgo, daysLeft });
      }
    } else if (lastSess >= 6 && daysAgo <= FOLLOW_UP_WINDOW_DAYS && !nextClassPkg.has(`${pkgId}|${g.student}`)) {
      // Kelas lanjutan sudah dibuka (pembayaran baru TERVERIFIKASI, mata pelajaran sama) -> tidak perlu diingatkan lagi
      const opened = pkgTime(pkgId) > 0 &&
        newerPayments(g.student, subjectOf(g.fullClass), pkgId).some(p => p.status === 'VERIFIED');
      if (!opened) {
        const rep = rapotByKey.get(`${pkgId}|${g.student}`);
        const rapot: RapotStatus = !rep ? 'BELUM_KLAIM'
          : rep.status === 'SESSION_LOG' ? 'TERBIT'
          : rep.status === 'REPORT_READY' ? 'SIAP_KIRIM'
          : rep.status === 'REQ' ? 'MENUNGGU_GURU'
          : 'DITOLAK';
        const rapotDays = rep?.status === 'REQ' && rep.date ? ageOf(today, rep.date) : undefined;
        progress.push({ kind: 'SELESAI', student: g.student, fullClass: g.fullClass, lastSess, lastDate, daysAgo, daysLeft, rapot, rapotDays });
      }
    }
  });

  // ---- 3: kartu NEXT_CLASS (Lanjut Kelas, kelas baru belum dibuka) ----
  const next: FollowUpItem[] = [];
  const seen = new Set<string>();
  for (const r of reports || []) {
    if (r.status !== 'NEXT_CLASS') continue;
    const pkg = norm(r.packageId ?? r.packageid);
    const pay = payById.get(pkg);
    const className = norm(pay?.className ?? r.className ?? r.classname ?? '');
    const subject = subjectOf(className);
    const names = (Array.isArray(r.studentsAttended) && r.studentsAttended.length ? r.studentsAttended : [pay?.studentName]).filter(Boolean);

    for (const n of names) {
      const student = norm(n);
      const dedup = `${pkg}|${student}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);

      // Tanggal keputusan tidak disimpan sistem, jadi batas 30 hari dihitung dari tanggal klaim siswa
      const daysAgo = r.date ? ageOf(today, r.date) : 0;
      if (daysAgo > FOLLOW_UP_WINDOW_DAYS) continue;

      // Kartu bertahan sampai kelas barunya TERVERIFIKASI. Kalau sudah ada laporan bayar tapi
      // belum diverifikasi, kartu tetap tampil dengan keterangan "Menunggu verifikasi".
      const newer = newerPayments(student, subject, pkg);
      if (newer.some(p => p.status === 'VERIFIED')) continue;

      next.push({ kind: 'NEXT_CLASS', student, fullClass: className || 'UMUM', lastSess: 6, lastDate: String(r.date || today), daysAgo, daysLeft: FOLLOW_UP_WINDOW_DAYS - daysAgo, pendingVerify: newer.length > 0 });
    }
  }
  next.sort((a, b) => a.lastDate.localeCompare(b.lastDate)); // yang paling lama menunggu di atas

  progress.sort((a, b) => a.lastDate.localeCompare(b.lastDate)); // paling lama di atas = paling dekat hilang

  return [...next, ...progress]; // "Lanjut Kelas" paling atas karena butuh tindakan admin (tampilan memisahkan per kelompok)
};

// Kelompok di daftar follow-up: judul + satu kalimat keterangan (ditulis sekali per kelompok, bukan per siswa)
const FOLLOW_UP_SECTIONS: { kind: FollowUpItem['kind']; title: string; hint: string; Icon: React.ElementType; bar: string; iconBox: string }[] = [
  { kind: 'NEXT_CLASS', title: 'Guru memutuskan lanjut kelas', hint: 'Siswa bayar kalau bersedia lanjut. Admin tinggal menagih atau memverifikasi.', Icon: Rocket, bar: 'bg-purple-400', iconBox: 'bg-purple-100 text-purple-700' },
  { kind: 'SELESAI', title: 'Selesai 6/6', hint: 'Rapot masih berjalan, atau guru belum memutuskan lanjut kelas.', Icon: Zap, bar: 'bg-slate-800', iconBox: 'bg-slate-900 text-yellow-400' },
  { kind: 'SESI_5', title: 'Sesi 5 dari 6', hint: 'Tinggal 1 lagi, memasuki evaluasi.', Icon: Clock, bar: 'bg-orange-400', iconBox: 'bg-orange-100 text-orange-600' }
];

const agoText = (d: number) => (d <= 0 ? 'hari ini' : `${d} hari lalu`);
const leftText = (d: number) => (d <= 0 ? 'hilang hari ini' : `hilang ${d} hari lagi`);
const shortDate = (d: string) => {
  const t = new Date(d);
  return isNaN(t.getTime()) ? '-' : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const rapotLine = (s: FollowUpItem): { text: string; warn: boolean } | null => {
  switch (s.rapot) {
    case 'BELUM_KLAIM': return { text: 'Rapot: belum klaim', warn: false };
    case 'DITOLAK': return { text: 'Rapot: ditolak guru, siswa belum klaim ulang', warn: true };
    case 'MENUNGGU_GURU': {
      const d = s.rapotDays ?? 0;
      return { text: d > 0 ? `Rapot: menunggu guru mengisi, sudah ${d} hari` : 'Rapot: menunggu guru mengisi, klaim hari ini', warn: d >= RAPOT_TELAT_HARI };
    }
    case 'SIAP_KIRIM': return { text: 'Rapot: sudah diisi, belum dikirim guru', warn: false };
    case 'TERBIT': return { text: 'Rapot: sudah terbit', warn: false };
    default: return null;
  }
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ attendanceLogs, studentAttendanceLogs, reports = [], studentPayments = [] }) => {
  const getWIBDate = () => new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());

  const currentToday = getWIBDate();
  
  const followUpList = useMemo(
    () => computeFollowUps(studentAttendanceLogs, reports, studentPayments, currentToday),
    [studentAttendanceLogs, reports, studentPayments, currentToday]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-40 px-4 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 p-10 md:p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-20"></div>
         <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20"><Zap size={14} className="text-white" /></div>
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Central Command Sanur</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Dashboard <span className="text-blue-500">Admin</span></h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Calendar size={12} /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
         </div>
         <div className="relative z-10 flex gap-4">
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-[3rem] border border-white/10 text-center min-w-[160px] shadow-inner">
               <p className="text-[9px] font-black uppercase text-orange-400 mb-2 tracking-widest flex items-center justify-center gap-2 animate-pulse"><Clock size={12}/> Butuh Follow-Up</p>
               <h4 className="text-4xl font-black italic">{followUpList.length} <span className="text-sm font-bold text-slate-500">SISWA</span></h4>
            </div>
         </div>
      </div>

      {/* SHORTCUT GRID (3 COLUMNS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Link to="/admin/finance" state={{ tab: 'LEDGER' }} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-between group hover:border-blue-500 hover:shadow-2xl transition-all h-[180px]">
            <div className="flex items-center justify-between">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner"><Receipt size={32} /></div>
               <ArrowRight size={24} className="text-slate-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
               <h4 className="font-black text-slate-800 uppercase italic text-sm">Keuangan</h4>
               <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Buku Kas & Ledger</p>
            </div>
         </Link>

         <Link to="/admin/finance" state={{ tab: 'PAYROLL' }} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-between group hover:border-orange-500 hover:shadow-2xl transition-all h-[180px]">
            <div className="flex items-center justify-between">
               <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all shadow-inner"><Wallet size={32} /></div>
               <ArrowRight size={24} className="text-slate-200 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
               <h4 className="font-black text-slate-800 uppercase italic text-sm">Gaji & Honor</h4>
               <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Pembayaran Guru</p>
            </div>
         </Link>

         <Link to="/admin/finance" state={{ tab: 'STUDENT_ACC' }} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-between group hover:border-emerald-500 hover:shadow-2xl transition-all h-[180px]">
            <div className="flex items-center justify-between">
               <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner"><CreditCard size={32} /></div>
               <ArrowRight size={24} className="text-slate-200 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
               <h4 className="font-black text-slate-800 uppercase italic text-sm">Verifikasi SPP</h4>
               <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Aktivasi Paket Siswa</p>
            </div>
         </Link>
      </div>

      {/* FOLLOW-UP SECTION (MAIN CONTENT) */}
      <div className="bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col min-h-[450px] relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-orange-50 rounded-full blur-[100px] -mr-40 -mt-40 opacity-40"></div>
         
         <div className="flex justify-between items-center mb-10 relative z-10">
            <div className="space-y-2">
               <h3 className="font-black text-slate-800 flex items-center gap-3 italic uppercase text-2xl">
                  <PhoneForwarded size={28} className="text-orange-500 animate-bounce" /> 
                  Follow-Up Belajar
               </h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">
                  Siswa yang mencapai titik kritis (Sesi 5, Selesai 6/6, atau Lanjut Kelas)
               </p>
            </div>
            <div className="bg-orange-50 text-orange-600 px-8 py-3 rounded-full font-black text-[10px] uppercase border border-orange-100 shadow-sm">
               {followUpList.length} DATA ANTREAN
            </div>
         </div>

         <div className="relative z-10">
            {followUpList.length > 0 ? (
               <>
                  <div className="flex items-start gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 mb-10 max-w-3xl">
                     <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                     <div className="text-sm text-slate-600 leading-relaxed space-y-1">
                        <p>Setelah siswa <b className="text-slate-800">bayar kelas lanjutan dan terverifikasi</b>, namanya hilang dari daftar ini.</p>
                        <p>Kalau <b className="text-slate-800">30 hari</b> tidak ada kelanjutan (belum bayar atau tidak ada sesi baru), dianggap berhenti dan ikut hilang.</p>
                     </div>
                  </div>

                  <div className="space-y-10">
                     {FOLLOW_UP_SECTIONS.map(sec => {
                        const rows = followUpList.filter(i => i.kind === sec.kind);
                        if (rows.length === 0) return null;
                        return (
                           <section key={sec.kind}>
                              <div className="relative overflow-hidden flex items-center gap-4 rounded-2xl bg-slate-50 border border-slate-100 pl-6 pr-5 py-4">
                                 <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${sec.bar}`} />
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sec.iconBox}`}>
                                    <sec.Icon size={20} />
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <h4 className="text-lg font-black text-slate-800 leading-tight">{sec.title}</h4>
                                    <p className="text-sm text-slate-500">{sec.hint}</p>
                                 </div>
                                 <span className="shrink-0 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-full px-3 py-1">{rows.length} siswa</span>
                              </div>

                              <ul className="mt-1 px-2 divide-y divide-slate-100 border-b border-slate-100">
                                 {rows.map((s, i) => {
                                    const rapot = rapotLine(s);
                                    const soon = s.daysLeft <= EXPIRY_WARN_DAYS;
                                    // NEXT_CLASS: tanggal keputusan guru tidak disimpan, jadi N hari dihitung dari tanggal siswa klaim rapot (selisihnya biasanya kecil)
                                    const prefix = s.kind === 'NEXT_CLASS' ? 'Lanjut kelas ' : '';
                                    const statusText = s.kind === 'NEXT_CLASS'
                                       ? (s.pendingVerify ? 'Menunggu verifikasi' : 'Belum lapor bayar')
                                       : `Sesi ${s.lastSess} pada ${shortDate(s.lastDate)}`;
                                    return (
                                       <li key={`${s.kind}-${s.student}-${s.fullClass}-${i}`} className="flex items-center justify-between gap-6 py-4">
                                          <div className="min-w-0">
                                             <p className="font-bold text-slate-800 truncate">{s.student}</p>
                                             <p className="text-sm text-slate-500 truncate">{s.fullClass.split(' - ')[0]}</p>
                                             {rapot && <p className={`text-sm ${rapot.warn ? 'text-amber-700' : 'text-slate-500'}`}>{rapot.text}</p>}
                                          </div>
                                          <div className="text-right shrink-0">
                                             <p className="text-sm text-slate-800">{statusText}</p>
                                             <p className={`text-sm ${soon ? 'text-red-600' : 'text-slate-500'}`}>
                                                {prefix}{agoText(s.daysAgo)}{soon ? ` · ${leftText(s.daysLeft)}` : ''}
                                             </p>
                                          </div>
                                       </li>
                                    );
                                 })}
                              </ul>
                           </section>
                        );
                     })}
                  </div>
               </>
            ) : (
               <div className="col-span-full py-24 flex flex-col items-center justify-center opacity-20 text-center gap-6">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
                     <UserCheck size={64} className="text-slate-300" />
                  </div>
                  <div className="space-y-2">
                     <p className="font-black text-[12px] uppercase tracking-[0.5em]">Semua Beres! ✨</p>
                     <p className="font-bold text-[9px] uppercase tracking-widest">Belum ada antrean follow-up untuk saat ini.</p>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
