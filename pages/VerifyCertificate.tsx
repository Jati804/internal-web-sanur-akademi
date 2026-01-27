import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, BookOpen, Stars, Loader2, XCircle, User, Calendar, Award, Zap } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import { supabase } from '../services/supabase.ts';
import { Attendance } from '../types';
import { formatDateToDMY } from '../ReportTemplate.tsx';

const { Link, useSearchParams } = ReactRouterDOM as any;

const VerifyCertificate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('id');
  const [loading, setLoading] = useState(!!reportId);
  const [reportData, setReportData] = useState<Attendance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerifiedData = async () => {
      if (!reportId) return;
      try {
        const { data, error: sbError } = await supabase
          .from('attendance')
          .select('*')
          .eq('id', reportId)
          .single();

        if (sbError || !data) throw new Error("Data sertifikat tidak ditemukan di database.");

        setReportData({
            ...data,
            teacherId: data.teacherid,
            teacherName: data.teachername,
            clockIn: data.clockin,
            className: data.classname,
            sessionCategory: data.sessioncategory,
            studentsAttended: data.studentsattended,
            studentScores: data.studentscores,
            paymentStatus: data.paymentstatus
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVerifiedData();
  }, [reportId]);

  // Helper untuk ambil value pertama dari JSON object
  const getFirstValue = (obj: any) => {
    if (!obj || typeof obj !== 'object') return null;
    const keys = Object.keys(obj);
    return keys.length > 0 ? obj[keys[0]] : null;
  };

  const scores = reportData ? (getFirstValue(reportData.studentScores) as number[] || []) : [];
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / 6) : 0;
  const isPass = avg >= 80;
  
  const studentName = reportData?.studentsAttended?.[0] || "SISWA";

  // 🎨 THEME COLORS - Hijau kalau lulus, Oren kalau tidak lulus
  const themeColors = isPass ? {
    primary: 'emerald',
    bgLight: 'bg-emerald-50',
    bgMedium: 'bg-emerald-100',
    bgDark: 'bg-emerald-600',
    text: 'text-emerald-600',
    textDark: 'text-emerald-500',
    ring: 'ring-emerald-50'
  } : {
    primary: 'orange',
    bgLight: 'bg-orange-50',
    bgMedium: 'bg-orange-100',
    bgDark: 'bg-orange-600',
    text: 'text-orange-600',
    textDark: 'text-orange-500',
    ring: 'ring-orange-50'
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className={`absolute top-0 left-0 w-80 h-80 ${isPass ? 'bg-emerald-50' : 'bg-orange-50'} rounded-full blur-[100px] -ml-40 -mt-40 opacity-50`}></div>
      <div className={`absolute bottom-0 right-0 w-80 h-80 ${isPass ? 'bg-emerald-50' : 'bg-orange-50'} rounded-full blur-[100px] -mr-40 -mb-40 opacity-50`}></div>

      <div className="max-w-xl w-full bg-white rounded-[4rem] shadow-2xl p-10 md:p-16 border border-slate-50 text-center relative z-10 animate-in fade-in">
         
         {loading ? (
           <div className="py-20 flex flex-col items-center gap-6">
              <Loader2 className="animate-spin text-blue-600" size={64} />
              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Mencocokkan Database...</p>
           </div>
         ) : error || !reportData ? (
           <div className="py-10 space-y-10">
              <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-lg">
                <XCircle size={56} />
              </div>
              <div className="space-y-4">
                 <h1 className="text-3xl font-black text-slate-800 uppercase italic leading-none">Validasi <span className="text-rose-600">Gagal</span></h1>
                 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest px-8 leading-relaxed">
                   {error || "ID Sertifikat tidak valid atau sudah dihapus dari sistem kami."}
                 </p>
              </div>
              <Link to="/" className="inline-block w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase shadow-2xl">KEMBALI KE PORTAL</Link>
           </div>
         ) : (
           <>
              <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-lg ring-8 ${themeColors.bgMedium} ${themeColors.text} ${themeColors.ring}`}>
                <ShieldCheck size={56} />
              </div>
              
              <div className="space-y-4 mb-12">
                <div className={`flex items-center justify-center gap-2 ${themeColors.text} mb-2`}>
                   <Stars size={20} fill="currentColor" />
                   <span className="text-[10px] font-black uppercase tracking-[0.5em]">Verified Authentic</span>
                   <Stars size={20} fill="currentColor" />
                </div>
                <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">
                   Sertifikat <span className={themeColors.text}>{isPass ? 'Tervalidasi' : 'Tervalidasi'}</span>
                </h1>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest px-4">
                   Dokumen ini adalah asli dan tercatat secara resmi di database Sanur Akademi Inspirasi.
                </p>
              </div>

              <div className="bg-slate-50 rounded-[3rem] p-8 md:p-10 mb-10 border-2 border-dashed border-slate-200 text-left space-y-8">
                 <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center ${themeColors.text} shadow-sm shrink-0`}><User size={24} /></div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nama Siswa</p>
                      <p className="text-xl font-black text-slate-800 uppercase italic leading-tight">{studentName}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center ${themeColors.text} shadow-sm shrink-0`}><BookOpen size={24} /></div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Program & Level</p>
                      <p className="text-sm font-black text-slate-800 uppercase italic leading-tight">{reportData.className}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                         <span className={`px-3 py-0.5 ${themeColors.bgDark} text-white rounded-full text-[7px] font-black uppercase tracking-widest`}>{reportData.sessionCategory}</span>
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">6 Sesi Selesai</span>
                      </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm shrink-0"><Calendar size={20} /></div>
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Tgl Terbit</p>
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{formatDateToDMY(reportData.date)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm shrink-0"><Award size={20} /></div>
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Ref ID</p>
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{reportData.id.substring(0,8).toUpperCase()}</p>
                        </div>
                    </div>
                 </div>

                 <div className="h-px bg-slate-200 w-full"></div>
                 
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Zap size={20} className={themeColors.textDark} />
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Kelulusan</p>
                    </div>
                    <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 ${themeColors.bgDark} text-white`}>
                       <CheckCircle2 size={14} /> {isPass ? "LULUS & KOMPETEN ✨" : "PESERTA PELATIHAN"}
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-4">
                 <Link to="/" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">KEMBALI KE PORTAL</Link>
                 <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">© SANUR AKADEMI INSPIRASI</p>
              </div>
           </>
         )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
