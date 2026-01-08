
import React, { useState, useMemo } from 'react';
import { User, Attendance } from '../types';
import { 
  FileBadge, 
  Search, 
  Calendar,
  Activity,
  Star,
  ShieldCheck,
  History,
  Info
} from 'lucide-react';

interface AdminReportsProps {
  studentAccounts: User[];
  logs: Attendance[];
}

const AdminReports: React.FC<AdminReportsProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const reportMonitoring = useMemo(() => {
    const monitoringData: Record<string, any> = {};
    
    logs.forEach(log => {
      const attended = log.studentsAttended || [];
      const packageId = log.packageId || 'UNASSIGNED';
      
      attended.forEach(sName => {
        const studentName = (sName || '').trim().toUpperCase();
        if (!studentName) return;
        const key = `${studentName}||${packageId}`;

        if (!monitoringData[key]) {
          const rawCN = (log.className || 'UMUM');
          const cleanCN = rawCN.replace(/\s(REGULER|PRIVATE)\s\d+$/i, ' $1');
          monitoringData[key] = {
            studentName,
            className: cleanCN,
            type: cleanCN.toUpperCase().includes('PRIVATE') ? 'PRIVATE' : 'REGULER',
            packageId,
            sessions: [],
            maxSessionReached: 0,
            lastDate: log.date,
            teacherName: log.teacherName || 'GURU',
            publishedDate: null
          };
        }

        const m = monitoringData[key];
        const sNum = log.studentSessions?.[studentName] || log.sessionNumber || 0;
        const hasNarrative = log.studentNarratives?.[studentName] || log.reportNarrative;
        
        m.sessions.push(log);
        if (sNum > m.maxSessionReached) {
           m.maxSessionReached = sNum;
           m.lastDate = log.date;
           m.teacherName = log.teacherName || 'GURU';
        }
        
        if (sNum === 6 && hasNarrative) {
          m.publishedDate = log.date;
        }
      });
    });

    const term = searchTerm.toLowerCase();
    return Object.values(monitoringData)
      .filter((m: any) => 
        m.studentName.toLowerCase().includes(term) || 
        m.className.toLowerCase().includes(term)
      )
      .sort((a: any, b: any) => {
        if (a.maxSessionReached === 6 && b.maxSessionReached !== 6) return -1;
        if (a.maxSessionReached !== 6 && b.maxSessionReached === 6) return 1;
        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      });
  }, [logs, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-40 px-4 animate-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg"><FileBadge size={18} /></div>
              <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Read-Only Academic Monitoring</span>
           </div>
           <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Pantauan <span className="text-emerald-600">Rapot</span></h2>
           <p className="text-slate-500 font-medium text-sm max-w-lg leading-relaxed italic">Admin hanya berwenang memantau kelulusan siswa. Ulasan & evaluasi sepenuhnya dikelola oleh Guru.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white px-8 py-4 border-2 border-slate-100 rounded-[2rem] w-full lg:w-96 shadow-sm focus-within:border-emerald-500 transition-all">
           <Search size={20} className="text-slate-300" />
           <input 
             type="text" 
             placeholder="CARI NAMA SISWA / KELAS..." 
             value={searchTerm} 
             onChange={e => setSearchTerm(e.target.value)} 
             className="bg-transparent outline-none text-[11px] font-black uppercase w-full" 
           />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-sm">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shrink-0"><Info size={24} /></div>
         <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wide leading-relaxed">
            Admin memantau progres Sesi 1-6. Status <span className="text-emerald-600 font-black">RAPOT TERBIT</span> akan muncul otomatis jika Guru sudah menyelesaikan sesi 6 & ulasan.
         </p>
      </div>

      {/* WRAPPER GULIR (SCROLLABLE GRID) */}
      <div className="max-h-[850px] overflow-y-auto pr-4 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
           {reportMonitoring.length > 0 ? reportMonitoring.map((m: any, idx: number) => {
              const isCompleted = m.maxSessionReached >= 6 && m.publishedDate;
              return (
                <div key={idx} className={`bg-white rounded-[3.5rem] p-10 border-2 transition-all relative overflow-hidden group flex flex-col justify-between ${isCompleted ? 'border-emerald-50 shadow-emerald-50 shadow-2xl' : 'border-slate-50 shadow-xl hover:border-blue-300'}`}>
                   <div>
                      {isCompleted && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white px-8 py-3 rounded-bl-[2rem] font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                           <Star size={14} fill="white" /> RAPOT TERBIT ✨
                        </div>
                      )}
                      
                      <div className="flex items-start gap-6 mb-8">
                         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isCompleted ? <ShieldCheck size={32} /> : <Activity size={32} />}
                         </div>
                         <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-black text-slate-800 uppercase italic leading-tight truncate">{m.studentName}</h3>
                            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${m.type === 'PRIVATE' ? 'bg-blue-900 text-white' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                               {m.type}
                            </span>
                         </div>
                      </div>

                      <div className="mb-8 px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight leading-relaxed">{m.className}</p>
                      </div>
                   </div>

                   <div>
                      <div className="space-y-4 mb-8">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className={isCompleted ? 'text-emerald-600' : 'text-slate-400'}>{isCompleted ? 'KELULUSAN BERHASIL' : 'PROGRES PAKET'}</span>
                            <span className={isCompleted ? 'text-emerald-600' : 'text-blue-600'}>{m.maxSessionReached} / 6 SESI</span>
                         </div>
                         <div className="flex gap-2 h-4">
                            {[1, 2, 3, 4, 5, 6].map(step => (
                               <div key={step} className={`flex-1 rounded-full transition-all duration-700 ${step <= m.maxSessionReached ? (isCompleted ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.2)]') : 'bg-slate-100'}`} />
                            ))}
                         </div>
                      </div>

                      <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                         <div className="flex flex-col gap-1">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">REF ID: <span className="text-slate-500">{(m.packageId || '').substring(0,10)}...</span></p>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter flex items-center gap-2">
                               <Calendar size={12} className="text-blue-400"/> {isCompleted ? `TERBIT: ${m.publishedDate}` : `AKSI: ${m.lastDate}`}
                            </p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter italic">Kak {(m.teacherName || 'GURU').split(' ')[0]}</p>
                         </div>
                      </div>
                   </div>
                </div>
              );
           }) : (
              <div className="col-span-full py-40 text-center bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 opacity-20">
                 <History size={64} className="mx-auto mb-6 text-slate-300" />
                 <p className="font-black text-[11px] uppercase tracking-[0.4em] italic">Belum ada log belajar terdeteksi.</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
