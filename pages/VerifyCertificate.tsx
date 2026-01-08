import React from 'react';
import { ShieldCheck, CheckCircle2, BookOpen, Stars } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM as any;

const VerifyCertificate: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="max-w-xl w-full bg-white rounded-[4rem] shadow-2xl p-12 md:p-16 border border-slate-50 text-center relative z-10 animate-in fade-in">
         <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-lg ring-8 ring-emerald-50">
            <ShieldCheck size={56} />
         </div>
         
         <div className="space-y-4 mb-12">
            <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
               <Stars size={20} fill="currentColor" />
               <span className="text-[10px] font-black uppercase tracking-[0.5em]">{"Verified Authentic"}</span>
               <Stars size={20} fill="currentColor" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">
               {"Validasi "} <span className="text-emerald-600">{"Sertifikat"}</span>
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest px-4">
               {"Dokumen ini adalah asli dan diterbitkan secara resmi oleh sistem Sanur Akademi."}
            </p>
         </div>

         <div className="bg-slate-50 rounded-[3rem] p-10 mb-12 border-2 border-dashed border-slate-200">
            <div className="space-y-8">
               <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><BookOpen size={24} /></div>
                  <h2 className="text-xl font-black text-slate-900 uppercase italic">{"SANUR AKADEMI"}</h2>
               </div>
               <div className="h-px bg-slate-200 w-full"></div>
               <p className="text-lg font-bold text-slate-700 italic leading-relaxed">
                  {"\"Data sertifikat telah diverifikasi sesuai dengan catatan resmi di database kami.\""}
               </p>
               <div className="inline-flex items-center gap-3 bg-emerald-500 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase shadow-xl">
                  <CheckCircle2 size={18} /> {"TERVERIFIKASI SISTEM"}
               </div>
            </div>
         </div>

         <div className="flex flex-col gap-4">
            <Link to="/" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase shadow-2xl">{"KEMBALI KE PORTAL"}</Link>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">{"© SANUR AKADEMI INSPIRASI"}</p>
         </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;