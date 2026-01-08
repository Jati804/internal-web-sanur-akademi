
import React from 'react';
import { User, Attendance } from '../types';
import { BookOpen } from 'lucide-react';

interface StudentReportsProps {
  user: User;
  logs: Attendance[];
}

const StudentReports: React.FC<StudentReportsProps> = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-40 px-4 animate-in fade-in duration-1000">
      <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30">
         <div className="flex flex-col items-center gap-6">
            <BookOpen size={64} className="text-slate-300" />
            <p className="text-[11px] font-black uppercase tracking-[0.5em] italic leading-relaxed text-center">Silakan unduh rapot melalui tombol di Portal Belajar. ✨</p>
         </div>
      </div>
    </div>
  );
};

export default StudentReports;
