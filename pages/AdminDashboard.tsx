
import React, { useMemo } from 'react';
import { User, Attendance, Transaction, StudentProfile } from '../types';
import { 
  PhoneForwarded, 
  Zap, 
  Calendar,
  UserCheck,
  Receipt,
  Wallet,
  ArrowRight,
  Banknote
} from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM as any;

interface AdminDashboardProps {
  user: User;
  attendanceLogs: Attendance[];
  setAttendanceLogs: React.Dispatch<React.SetStateAction<Attendance[]>>;
  teachers: User[];
  transactions: Transaction[];
  studentProfiles: StudentProfile[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ attendanceLogs }) => {
  const getWIBDate = () => new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());

  const currentToday = getWIBDate();

  const followUpList = useMemo(() => {
    const statusMap: Record<string, any> = {};
    [...attendanceLogs]
      .filter(l => l.status === 'SESSION_LOG' || l.status === 'SUB_LOG')
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(log => {
        log.studentsAttended?.forEach(s => {
          const sKey = s.trim().toUpperCase();
          const cName = (log.className || 'UMUM').toUpperCase();
          const key = `${sKey}|||${cName}`;
          statusMap[key] = { 
            lastSess: log.studentSessions?.[s] || log.sessionNumber, 
            student: s, 
            lastDate: log.date, 
            fullClass: log.className 
          };
        });
      });

    return Object.values(statusMap).filter((s: any) => {
      const isSess5 = s.lastSess === 5;
      const isSess6Today = s.lastSess >= 6 && s.lastDate === currentToday;
      return isSess5 || isSess6Today;
    });
  }, [attendanceLogs, currentToday]);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-40 px-4 animate-in fade-in duration-500">
      <div className="bg-slate-900 p-10 md:p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-20"></div>
         <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-500 rounded-lg"><Zap size={14} className="text-white" /></div>
               <span className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Central Command Sanur</span>
            </div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Dashboard <span className="text-blue-500">Admin</span></h2>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest flex items-center gap-2">
              <Calendar size={12} /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Link to="/admin/finance" className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center justify-between group hover:border-blue-500 transition-all">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><Receipt size={28} /></div>
               <div><h4 className="font-black text-slate-800 uppercase italic text-[11px]">Ledger</h4><p className="text-[8px] font-black text-slate-400 uppercase mt-1">Kas Masuk/Keluar</p></div>
            </div>
            <ArrowRight size={20} className="text-slate-200 group-hover:text-blue-600 transition-all" />
         </Link>
         <Link to="/admin/finance" className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center justify-between group hover:border-orange-500 transition-all">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all"><Wallet size={28} /></div>
               <div><h4 className="font-black text-slate-800 uppercase italic text-[11px]">Gaji & Honor</h4><p className="text-[8px] font-black text-slate-400 uppercase mt-1">Klaim Guru</p></div>
            </div>
            <ArrowRight size={20} className="text-slate-200 group-hover:text-orange-600 transition-all" />
         </Link>
         <Link to="/admin/finance" className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center justify-between group hover:border-emerald-500 transition-all">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><Banknote size={28} /></div>
               <div><h4 className="font-black text-slate-800 uppercase italic text-[11px]">Verif SPP</h4><p className="text-[8px] font-black text-slate-400 uppercase mt-1">Antrean Siswa</p></div>
            </div>
            <ArrowRight size={20} className="text-slate-200 group-hover:text-emerald-600 transition-all" />
         </Link>
      </div>

      <div className="space-y-10">
         <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
               <div className="space-y-1">
                  <h3 className="font-black text-slate-800 flex items-center gap-3 italic uppercase text-lg"><PhoneForwarded size={20} className="text-orange-500" /> Follow-Up Belajar</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Siswa mendekati kelulusan paket 6 sesi (WIB)</p>
               </div>
               <div className="bg-orange-50 text-orange-600 px-5 py-2 rounded-2xl font-black text-[9px] uppercase border border-orange-100">{followUpList.length} SISWA</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {followUpList.length > 0 ? followUpList.map((s: any, i) => (
                  <div key={i} className={`p-8 rounded-[3rem] border-2 transition-all group ${s.lastSess >= 6 ? 'bg-slate-900 border-slate-800 text-white shadow-2xl' : 'bg-white border-orange-100 hover:border-orange-300 shadow-sm'}`}>
                     <div className="flex justify-between items-start mb-4">
                        <div className="min-w-0">
                           <h4 className="text-sm font-black uppercase italic leading-none truncate mb-1">{s.student}</h4>
                           <p className={`text-[8px] font-bold uppercase truncate text-slate-400`}>{s.fullClass.split(' - ')[0]}</p>
                        </div>
                     </div>
                     <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border ${s.lastSess >= 6 ? 'bg-white/10 border-white/20 text-white' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                        {s.lastSess >= 6 ? 'LULUS HARI INI ✨' : `PROG: SESI ${s.lastSess} / 6`}
                     </div>
                  </div>
               )) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20 text-center gap-4">
                     <UserCheck size={48} className="text-slate-300" />
                     <p className="font-black text-[11px] uppercase tracking-[0.4em]">Database Bersih. Belum ada antrean follow-up.</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
