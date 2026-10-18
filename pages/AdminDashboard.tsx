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
  Rocket
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
//  1) SESI_5     : paket TERBARU siswa baru sampai sesi 5 (sebentar lagi evaluasi / tagih kelas lanjutan)
//  2) LULUS      : paket TERBARU sudah sesi 6, maksimal 7 hari sejak sesi 6 diabsen
//  3) NEXT_CLASS : guru memutuskan "Lanjut Kelas" tapi belum ada laporan bayar paket baru
//                  (admin sering lupa membuka kelas baru). Maksimal 30 hari dari tanggal klaim.
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

export type FollowUpItem = {
  kind: 'NEXT_CLASS' | 'SESI_5' | 'LULUS';
  student: string;
  fullClass: string;
  lastSess: number;
  lastDate: string;
};

export const computeFollowUps = (
  studentAttendanceLogs: any[],
  reports: any[],
  studentPayments: any[],
  today: string
): FollowUpItem[] => {
  // Paket yang sudah diputuskan "Lanjut Kelas" diwakili kartu ungu, jadi tidak ikut kartu "LULUS"
  const nextClassPkg = new Set<string>();
  for (const r of reports || []) {
    if (r.status !== 'NEXT_CLASS') continue;
    const pkg = norm(r.packageId ?? r.packageid);
    (Array.isArray(r.studentsAttended) ? r.studentsAttended : []).forEach((n: any) => nextClassPkg.add(`${pkg}|${norm(n)}`));
  }

  // ---- 1 & 2: kartu SESI_5 / LULUS ----
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

    if (lastSess === 5) {
      progress.push({ kind: 'SESI_5', student: g.student, fullClass: g.fullClass, lastSess, lastDate });
    } else if (lastSess >= 6 && daysBetween(today, lastDate) <= 7 && !nextClassPkg.has(`${pkgId}|${g.student}`)) {
      progress.push({ kind: 'LULUS', student: g.student, fullClass: g.fullClass, lastSess, lastDate });
    }
  });

  // ---- 3: kartu NEXT_CLASS (Lanjut Kelas, belum lapor bayar paket baru) ----
  const payById = new Map<string, any>();
  const livePaymentsByStudent = new Map<string, any[]>(); // pembayaran yang BUKAN REJECTED
  for (const p of studentPayments || []) {
    payById.set(norm(p.id), p);
    if (p.status === 'REJECTED') continue;
    const key = norm(p.studentName ?? p.studentname);
    const arr = livePaymentsByStudent.get(key);
    if (arr) arr.push(p); else livePaymentsByStudent.set(key, [p]);
  }

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
      if (r.date && daysBetween(today, r.date) > 30) continue;

      // Sudah dilapor bayar paket baru? = pembayaran lebih baru (ID lebih besar), mata pelajaran sama, bukan REJECTED
      const hasNewPayment = (livePaymentsByStudent.get(student) || []).some(
        p => subjectOf(p.className) === subject && pkgTime(p.id) > pkgTime(pkg)
      );
      if (hasNewPayment) continue;

      next.push({ kind: 'NEXT_CLASS', student, fullClass: className || 'UMUM', lastSess: 6, lastDate: String(r.date || today) });
    }
  }
  next.sort((a, b) => a.lastDate.localeCompare(b.lastDate)); // yang paling lama menunggu di atas

  return [...next, ...progress]; // kartu "Lanjut Kelas" paling atas karena butuh tindakan admin
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
                  Siswa yang mencapai titik kritis (Sesi 5, Lulus, atau Lanjut Kelas)
               </p>
            </div>
            <div className="bg-orange-50 text-orange-600 px-8 py-3 rounded-full font-black text-[10px] uppercase border border-orange-100 shadow-sm">
               {followUpList.length} DATA ANTREAN
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
            {followUpList.length > 0 ? followUpList.map((s: any, i) => s.kind === 'NEXT_CLASS' ? (
               <div key={`next-${i}`} className="p-10 rounded-[3.5rem] border-2 border-purple-200 bg-purple-50 hover:border-purple-400 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between min-h-[280px]">
                  <div className="flex justify-between items-start mb-6">
                     <div className="min-w-0">
                        <h4 className="text-xl font-black uppercase italic leading-tight truncate mb-2 text-slate-800">
                           {s.student}
                        </h4>
                        <p className="text-[10px] font-bold uppercase truncate tracking-widest text-slate-400">
                           {s.fullClass.split(' - ')[0]}
                        </p>
                     </div>
                  </div>

                  <div className="flex items-center gap-3 px-6 py-2 rounded-full border bg-purple-100 border-purple-200 shadow-sm">
   <Rocket size={14} className="text-purple-700 shrink-0" />
   <div className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">
         LANJUT KELAS
      </span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
         Belum lapor bayar
      </span>
   </div>
</div>
               </div>
            ) : (
               <div key={i} className={`p-10 rounded-[3.5rem] border-2 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[280px] ${s.lastSess >= 6 ? 'bg-slate-900 border-slate-800 text-white shadow-2xl' : 'bg-white border-orange-100 hover:border-orange-300 shadow-sm hover:shadow-xl'}`}>
                  {s.lastSess >= 6 && <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>}
                  
                  <div className="flex justify-between items-start mb-6">
                     <div className="min-w-0">
                        <h4 className={`text-xl font-black uppercase italic leading-tight truncate mb-2 ${s.lastSess >= 6 ? 'text-white' : 'text-slate-800'}`}>
                           {s.student}
                        </h4>
                        <p className={`text-[10px] font-bold uppercase truncate tracking-widest ${s.lastSess >= 6 ? 'text-slate-400' : 'text-slate-400'}`}>
                           {s.fullClass.split(' - ')[0]}
                        </p>
                     </div>
                  </div>

                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${s.lastSess >= 6 ? 'bg-white/10 border-white/20 text-white shadow-lg' : 'bg-orange-50 border-orange-100 text-orange-600 shadow-sm'}`}>
                     {s.lastSess >= 6 ? (
                       <><Zap size={14} className="text-yellow-400 fill-yellow-400"/> SUDAH LULUS ✨</>
                     ) : (
                       <><Clock size={14} /> PROGRES: SESI 5 / 6</>
                     )}
                  </div>
               </div>
            )) : (
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
