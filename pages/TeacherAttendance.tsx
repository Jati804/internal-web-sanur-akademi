
import React from 'react';
import { User, Attendance } from '../types';
import { MOCK_ATTENDANCE } from '../constants';
import { 
  CalendarDays, 
  ChevronRight, 
  History, 
  LayoutGrid, 
  Clock, 
  CheckCircle2,
  Calendar as CalendarIcon
} from 'lucide-react';

interface TeacherAttendanceProps {
  user: User;
}

const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({ user }) => {
  // Mock data for tracker
  const daysInMonth = 31;
  const sessionsThisMonth = MOCK_ATTENDANCE.map(a => parseInt(a.date.split('-')[2]));

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Presensi & <span className="text-blue-600">Produktivitas</span></h2>
          <p className="text-slate-500 font-bold mt-2">Monitor jadwal dan keaktifan mengajar Anda setiap bulannya.</p>
        </div>
      </div>

      {/* Monthly Tracker Visualization */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
             <CalendarIcon size={24} className="text-orange-500" /> Tracker Sesi: Oktober 2023
           </h3>
           <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div><span className="text-[10px] font-black text-slate-400 uppercase">Mengajar</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-100"></div><span className="text-[10px] font-black text-slate-400 uppercase">Libur</span></div>
           </div>
        </div>
        
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-16 gap-3">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const hasSession = sessionsThisMonth.includes(dayNum);
            return (
              <div 
                key={i} 
                className={`aspect-square rounded-2xl flex items-center justify-center text-[10px] font-black transition-all ${
                  hasSession 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-110' 
                  : 'bg-slate-50 text-slate-300'
                }`}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
        
        <div className="mt-10 p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex flex-wrap gap-8 items-center">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm font-black text-xl">
                 {sessionsThisMonth.length}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">Sesi Berhasil<br/>Dilaporkan</p>
           </div>
           <div className="w-px h-10 bg-blue-200 hidden sm:block"></div>
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm font-black text-xl">
                 {sessionsThisMonth.length * 2}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">Estimasi Jam<br/>Terakumulasi</p>
           </div>
        </div>
      </div>

      {/* Attendance Logs */}
      <div className="space-y-6">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 px-2">
          <History size={24} className="text-blue-600" /> Riwayat Absensi Detil
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_ATTENDANCE.map(log => (
            <div key={log.id} className="bg-white p-8 rounded-[3rem] border border-slate-50 shadow-lg hover:shadow-2xl transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:bg-blue-100 transition-colors" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                    <Clock size={20} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.date}</span>
                </div>
                <h4 className="font-black text-slate-900 mb-2">{log.className}</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{log.duration} Jam • {log.status}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                     <p className="text-sm font-black text-blue-600">Rp {log.earnings?.toLocaleString()}</p>
                     <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendance;
