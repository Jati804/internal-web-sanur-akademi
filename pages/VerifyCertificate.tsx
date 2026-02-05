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
          .from('reports')
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

  // ðŸŽ¨ THEME COLORS - BLUE-CYAN untuk lulus, Orange untuk tidak lulus
  const themeColors = isPass ? {
    primary: 'blue',
    bgLight: 'bg-blue-50',
    bgMedium: 'bg-blue-100',
    bgDark: 'bg-blue-600',
    text: 'text-blue-600',
    textDark: 'text-blue-700',
    ring: 'ring-blue-100',
    cyan: 'text-cyan-400',
    cyanBg: 'bg-cyan-500',
    cyanLight: 'bg-cyan-50',
    gradient: 'bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-500'
  } : {
    primary: 'orange',
    bgLight: 'bg-orange-50',
    bgMedium: 'bg-orange-100',
    bgDark: 'bg-orange-600',
    text: 'text-orange-600',
    textDark: 'text-orange-500',
    ring: 'ring-orange-50',
    cyan: 'text-orange-500',
    cyanBg: 'bg-orange-600',
    cyanLight: 'bg-orange-50',
    gradient: 'bg-orange-600'
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-4 md:p-6 py-12 md:py-6 relative overflow-hidden">
      {/* Background Ornaments - Enhanced for Cyan Theme */}
      {isPass ? (
        <>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-100 via-blue-50 to-cyan-50 rounded-full blur-[120px] -ml-48 -mt-48 opacity-60 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-100 via-cyan-50 to-blue-50 rounded-full blur-[120px] -mr-48 -mb-48 opacity-60 animate-pulse"></div>
          {/* Cyan sparkles effect */}
          <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-cyan-300 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
        </>
      ) : (
        <>
          <div className="absolute top-0 left-0 w-80 h-80 bg-orange-50 rounded-full blur-[100px] -ml-40 -mt-40 opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-orange-50 rounded-full blur-[100px] -mr-40 -mb-40 opacity-50"></div>
        </>
      )}

      <div className={`max-w-xl w-full bg-white rounded-[2rem] md:rounded-[4rem] shadow-2xl p-6 md:p-16 border-2 ${isPass ? 'border-cyan-100' : 'border-slate-50'} text-center relative z-10 animate-in fade-in`}>
         
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
           </div>
         ) : (
           <>
              {/* MAIN BADGE - Enhanced Cyan Design for Pass */}
              {isPass ? (
                <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-6 md:mb-10">
                  {/* Cyan glow ring */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-[2.5rem] blur-xl opacity-40 animate-pulse"></div>
                  {/* Main badge */}
                  <div className="relative w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl ring-4 md:ring-8 ring-cyan-100">
                    {/* Inner glow */}
                    <div className="absolute inset-2 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-[2rem]"></div>
                    <ShieldCheck size={48} className="relative z-10 text-cyan-300 drop-shadow-lg md:w-16 md:h-16" />
                    {/* Cyan accent dot */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full shadow-lg animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-lg ring-8 ${themeColors.bgMedium} ${themeColors.text} ${themeColors.ring}`}>
                  <ShieldCheck size={56} />
                </div>
              )}
              
              <div className="space-y-4 mb-12">
                {/* Verified Authentic Badge */}
                <div className={`flex items-center justify-center gap-2 mb-2 ${isPass ? 'text-cyan-500' : themeColors.text}`}>
                   <Stars size={20} fill="currentColor" className={isPass ? 'animate-pulse' : ''} />
                   <span className="text-[10px] font-black uppercase tracking-[0.5em]">
                     {isPass ? 'Certified Authentic' : 'Verified Authentic'}
                   </span>
                   <Stars size={20} fill="currentColor" className={isPass ? 'animate-pulse' : ''} />
                </div>
                
                {/* Title - FIXED: No text overflow */}
                <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight uppercase italic leading-tight md:leading-none px-2 md:px-4">
                   Sertifikat <span className={isPass ? 'text-blue-600' : themeColors.text}>Tervalidasi</span>
                </h1>
                
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest px-4">
                   Dokumen ini adalah asli dan tercatat secara resmi di database Sanur Akademi Inspirasi
                </p>
              </div>

              {/* CONTENT CARD */}
              <div className={`${isPass ? 'bg-gradient-to-br from-slate-50 to-blue-50/30' : 'bg-slate-50'} rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 mb-6 md:mb-10 border-2 ${isPass ? 'border-cyan-100' : 'border-dashed border-slate-200'} text-left space-y-8 relative overflow-hidden`}>
                 
                 {/* Cyan corner decoration for pass */}
                 {isPass && (
                   <>
                     <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-bl-[3rem]"></div>
                     <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-400/10 to-transparent rounded-tr-[3rem]"></div>
                   </>
                 )}
                 
                 {/* Student Name */}
                 <div className="flex items-center gap-5 relative z-10">
                    <div className={`w-10 h-10 md:w-12 md:h-12 ${isPass ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-white'} rounded-2xl flex items-center justify-center ${isPass ? 'text-cyan-300' : themeColors.text} shadow-lg shrink-0`}>
                      <User size={24} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nama Siswa</p>
                      <p className="text-xl font-black text-slate-800 uppercase italic leading-tight">{studentName}</p>
                    </div>
                 </div>

                 {/* Program & Level */}
                 <div className="flex items-center gap-5 relative z-10">
                    <div className={`w-10 h-10 md:w-12 md:h-12 ${isPass ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-white'} rounded-2xl flex items-center justify-center ${isPass ? 'text-cyan-300' : themeColors.text} shadow-lg shrink-0`}>
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Program & Level</p>
                      <p className="text-sm font-black text-slate-800 uppercase italic leading-tight">{reportData.className}</p>
<div className="flex items-center gap-2 mt-1.5">
   <span className={`px-3 py-0.5 ${isPass ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : themeColors.bgDark} text-white rounded-full text-[7px] font-black uppercase tracking-widest shadow-md`}>
     {reportData.sessionCategory}
   </span>
</div>
                    </div>
                 </div>

                 {/* Date & ID Grid */}
                 <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className={`w-10 h-10 md:w-12 md:h-12 ${isPass ? 'bg-blue-100' : 'bg-white'} rounded-xl flex items-center justify-center ${isPass ? 'text-blue-600' : 'text-slate-400'} shadow-sm shrink-0`}>
                          <Calendar size={24} />
                        </div>
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Tgl Terbit</p>
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{formatDateToDMY(reportData.date)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className={`w-10 h-10 md:w-12 md:h-12 ${isPass ? 'bg-cyan-100' : 'bg-white'} rounded-xl flex items-center justify-center ${isPass ? 'text-cyan-600' : 'text-slate-400'} shadow-sm shrink-0`}>
                          <Award size={24} />
                        </div>
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Ref ID</p>
                          <p className="text-[8px] font-black text-slate-800 uppercase leading-none">{reportData.id.toUpperCase()}</p>
                        </div>
                    </div>
                 </div>

                 <div className={`h-px ${isPass ? 'bg-gradient-to-r from-transparent via-slate-200 to-transparent' : 'bg-slate-200'} w-full`}></div>
                 
                 {/* Status Badge - Enhanced for Pass */}
                 <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                       <Zap size={20} className={isPass ? 'text-cyan-500' : themeColors.textDark} />
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {isPass ? 'Status Kelulusan' : 'Status Partisipasi'}
                       </p>
                    </div>
                    
                    {isPass ? (
                      <div className="relative">
                        {/* Cyan glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full blur-md opacity-40"></div>
                        {/* Badge */}
                        <div className="relative px-6 py-2 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 text-white">
                           <CheckCircle2 size={14} className="text-cyan-200" /> LULUS & KOMPETEN ✨
                        </div>
                      </div>
                    ) : (
                      <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 ${themeColors.bgDark} text-white`}>
                         <CheckCircle2 size={14} /> PESERTA PELATIHAN
                      </div>
                    )}
                 </div>
              </div>

              {/* Footer - Copyright Only, No Button */}
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] mt-8">© SANUR AKADEMI INSPIRASI</p>
           </>
         )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
