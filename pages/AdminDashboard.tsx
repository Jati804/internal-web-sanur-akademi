
import React, { useMemo } from 'react';
import { User, Attendance, Transaction, StudentProfile } from '../types';
import { 
  PhoneForwarded, 
  Zap, 
  Calendar,
  UserCheck,
  Receipt,
  Wallet,
  CreditCard,
  ArrowRight,
  Clock
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
  studentProfiles: StudentProfile[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ attendanceLogs, studentAttendanceLogs }) => {
  const getWIBDate = () => new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());

  const currentToday = getWIBDate();
  
  const followUpList = useMemo(() => {
  const statusMap: Record<string, any> = {};
  
  // ✅ GANTI: Pakai studentAttendanceLogs!
  [...studentAttendanceLogs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach(log => {
      const sName = (log.studentName || log.studentname || '').trim().toUpperCase();
      const cName = (log.className || log.classname || 'UMUM').toUpperCase();
      const key = `${sName}|||${cName}`;
      
      const currentSess = log.sessionNumber || log.sessionnumber || 0;
      
      if (!statusMap[key] || (currentSess > statusMap[key].lastSess)) {
        statusMap[key] = { 
          lastSess: currentSess, 
          student: sName, 
          lastDate: log.date, 
          fullClass: cName 
        };
      }
    });

  return Object.values(statusMap).filter((s: any) => {
    const isSess5 = s.lastSess === 5;
    const isSess6Today = s.lastSess >= 6 && s.lastDate === currentToday;
    return isSess5 || isSess6Today;
  });
}, [studentAttendanceLogs, currentToday]); // ✅ Ganti dependency!

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
                  Siswa yang mencapai titik kritis (Sesi 5 atau Lulus)
               </p>
            </div>
            <div className="bg-orange-50 text-orange-600 px-8 py-3 rounded-full font-black text-[10px] uppercase border border-orange-100 shadow-sm">
               {followUpList.length} DATA ANTREAN
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
            {followUpList.length > 0 ? followUpList.map((s: any, i) => (
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
                       <><Zap size={14} className="text-yellow-400 fill-yellow-400"/> LULUS HARI INI ✨</>
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
