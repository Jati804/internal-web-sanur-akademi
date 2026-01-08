
import React, { useState } from 'react';
import { User, Attendance } from '../types';
import { 
  History, 
  Heart,
  Smile
} from 'lucide-react';

interface TeacherHistoryProps {
  user: User;
  logs: Attendance[];
}

const TeacherHistory: React.FC<TeacherHistoryProps> = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-40 relative">
      
      {/* KIYOWO DECORATIVE ELEMENTS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-10">
         <div className="absolute top-[10%] left-[2%] animate-bounce duration-[4000ms] text-orange-300">
            <Smile size={80} strokeWidth={1.5} />
         </div>
         <div className="absolute bottom-[10%] left-[3%] animate-bounce duration-[5000ms] text-rose-300 rotate-12">
            <Heart size={70} fill="currentColor" />
         </div>
      </div>

      {/* HEADER SECTION */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="flex -space-x-1">
                <Smile size={18} className="text-orange-500" />
                <Heart size={18} className="text-rose-500" />
             </div>
             <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]">Jejak Langkah Sanur</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight italic leading-none">
            Histori <span className="text-blue-600">Guru</span>
          </h2>
          <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-md italic">
            Halaman Jejak Cinta sedang dalam masa pembersihan. Pantau Honor Kakak di halaman Honor Saya ya! ✨
          </p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-12">
          <div className="text-center py-48 bg-white/50 rounded-[4rem] border-2 border-dashed border-slate-100 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center gap-8">
             <div className="w-24 h-24 bg-blue-50 text-blue-300 rounded-[2rem] flex items-center justify-center shadow-inner animate-pulse">
               <History size={48} />
             </div>
             <div className="space-y-2">
                <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.4em] italic">Log Histori Kosong</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ruang hati sedang beristirahat sejenak. ✨</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherHistory;
