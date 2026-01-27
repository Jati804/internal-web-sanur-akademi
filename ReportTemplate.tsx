import React, { useState, useMemo, useEffect } from 'react';
import { User, Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import ReportTemplate, { formatDateToDMY } from '../ReportTemplate.tsx';
import { 
  GraduationCap, Search, X, Loader2, Check, Sparkles,
  History, Trophy, Edit3, CheckCircle2, UserCheck, Layout, BookOpen, Printer,
  Quote, BadgeCheck, ClipboardList, Star, Calendar, Clock, AlertCircle, Trash2,
  FileEdit, ChevronRight, Zap, Info, Send, SendHorizonal, Save, AlertTriangle, FileDown, FileCheck,
  Filter // ✅ TAMBAH INI KALAU BELUM ADA
} from 'lucide-react';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface TeacherReportsInboxProps {
  user: User;
  logs: Attendance[];
  studentAttendanceLogs: any[]; // ✅ TAMBAHAN BARU
  studentAccounts: User[];
  refreshAllData: () => Promise<void>;
}

const MilestoneView = ({ studentAttendanceLogs, studentName, packageId }: { studentAttendanceLogs: any[], studentName: string, packageId: string }) => {
  const sNameNorm = studentName.toUpperCase().trim();
  const pkgIdNorm = packageId.toUpperCase().trim();

  const sortedLogs = [...(studentAttendanceLogs || [])] // ✅ TAMBAH FALLBACK [] KALO UNDEFINED
    .filter(l => 
      (l.packageid || '').toUpperCase().trim() === pkgIdNorm && 
      (l.studentname || '').toUpperCase().trim() === sNameNorm
    )
    .sort((a,b) => (a.sessionnumber || 0) - (b.sessionnumber || 0)); // ✅ HAPUS TITIK KOMA KEDUA

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-slate-400 border-b border-slate-100 pb-2">
        <ClipboardList size={16} />
        <p className="text-[10px] font-black uppercase tracking-widest">Milestone Pembelajaran Siswa</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1,2,3,4,5,6].map(num => {
          const log = sortedLogs.find(l => l.sessionnumber === num); // ✅ LOWERCASE
          return (
            <div key={num} className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${log ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-transparent opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic text-[10px] ${log ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>0{num}</div>
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-800 uppercase italic leading-none">Sesi {num}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{log ? formatDateToDMY(log.date) : 'Kosong'}</p>
              </div>
              {log && <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm"><Check size={12} strokeWidth={4}/></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TeacherReportsInbox: React.FC<TeacherReportsInboxProps> = ({ user, logs, studentAttendanceLogs, studentAccounts, refreshAllData }) => {
  
  // ✅ TAMBAH INI DI BARIS PALING ATAS
  console.log('🔍 CHECK DATA MASUK:', {
    studentAttendanceLogs,
    isArray: Array.isArray(studentAttendanceLogs),
    length: studentAttendanceLogs?.length
  });

  const [activeStep, setActiveStep] = useState<'ANTREAN' | 'WORKSPACE' | 'HISTORY'>('ANTREAN');
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [lastActionedId, setLastActionedId] = useState<string | null>(null);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showMilestoneFor, setShowMilestoneFor] = useState<any | null>(null);
  const [confirmReject, setConfirmReject] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [reportForm, setReportForm] = useState({ sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: '', score: 90 })), narrative: '' });
  
  // FIXED: Menggunakan state ID agar loading tidak terjadi secara massal
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026'); // ✅ TAMBAH INI
  const [selectedPeriode, setSelectedPeriode] = useState(1); // ✅ TAMBAH STATE PERIODE
  const [historyPeriodeFilter, setHistoryPeriodeFilter] = useState<number | 'all'>('all'); // ✅ FILTER PERIODE UNTUK HISTORY
  
  // Efek Highlight untuk kartu yang baru saja dikerjakan
  useEffect(() => {
    if (activeStep === 'HISTORY' && lastActionedId) {
      setTimeout(() => {
        const element = document.getElementById(`history-card-${lastActionedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-blue-500', 'ring-offset-8', 'scale-[1.03]', 'z-50');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-8', 'scale-[1.03]');
          }, 4000);
        }
      }, 400);
    }
  }, [activeStep, lastActionedId]);

  // ✅ Auto scroll modal ke tengah viewport (body bebas scroll)
  useEffect(() => {
    const hasModal = !!(
      activeDownloadId || 
      showMilestoneFor || 
      confirmReject
    );
    
    if (hasModal) {
      // Tunggu dikit biar DOM modal udah ada, baru scroll
      const timer = setTimeout(() => {
        const modalElement = document.querySelector('[data-modal-container]');
        if (modalElement) {
          modalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [activeDownloadId, showMilestoneFor, confirmReject]);

  const reportRequests = useMemo(() => {
  const requests = logs.filter(l => 
    (l.status === 'REPORT_REQUEST' || l.status === 'REPORT_PROCESSING') && 
    l.teacherId === user.id &&
    l.teacherId !== 'SISWA_MANDIRI' // ✅ FILTER ABSEN SISWA MANDIRI
  );
  return requests.filter(req => {
      const studentNameInRequest = (req.studentsAttended?.[0] || '').toUpperCase().trim();
      return studentAccounts.some(acc => acc.name.toUpperCase().trim() === studentNameInRequest);
  });
}, [logs, user.id, studentAccounts]);

  const publishedReports = useMemo(() => {
  const baseReports = logs.filter(l => 
    (l.status === 'SESSION_LOG' || l.status === 'REPORT_READY') && 
    l.sessionNumber === 6 && 
    l.teacherId === user.id &&
    l.teacherId !== 'SISWA_MANDIRI' &&
    (l.packageId || '').startsWith('PAY-') &&
    l.date.startsWith(selectedYear) // ✅ FILTER TAHUN
  );
  
  // ✅ FILTER BERDASARKAN PERIODE
  const filteredByPeriode = historyPeriodeFilter === 'all' 
    ? baseReports 
    : baseReports.filter(l => (l.periode || 1) === historyPeriodeFilter);
    
  // LOGIKA SORTING (sama kayak sebelumnya)
  const sorted = [...filteredByPeriode].sort((a, b) => {
      if (a.id === lastActionedId) return -1;
      if (b.id === lastActionedId) return 1;
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id);
  });

  if (!historySearchTerm.trim()) return sorted;

  const term = historySearchTerm.toLowerCase();
  return sorted.filter(req => {
      const sName = (req.studentsAttended?.[0] || '').toLowerCase();
      const cName = (req.className || '').toLowerCase();
      return sName.includes(term) || cName.includes(term);
  });
}, [logs, user.id, historySearchTerm, lastActionedId, selectedYear, historyPeriodeFilter]); // ✅ TAMBAH historyPeriodeFilter DI DEPENDENCY

  const handleOpenWorkspace = (req: any, isEdit: boolean = false) => {
    setSelectedPackage(req);
    setIsEditMode(isEdit);
    setShowErrors(false);
    
    // ✅ LOAD PERIODE DARI DATABASE
    const savedPeriode = req.periode || 1;
    setSelectedPeriode(savedPeriode);
    
    const sName = req.studentsAttended?.[0] || 'SISWA';
    if (isEdit || req.status === 'REPORT_READY') {
      const existingTopics = (req.studentTopics?.[sName] || Array(6).fill('')) as string[];
      const existingScores = (req.studentScores?.[sName] || Array(6).fill(90)) as number[];
      const existingNarrative = req.studentNarratives?.[sName] || req.reportNarrative || '';
      setReportForm({ sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: existingTopics[i] || '', score: existingScores[i] || 90 })), narrative: existingNarrative });
    } else {
      setReportForm({ sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: '', score: 90 })), narrative: '' });
    }
    setActiveStep('WORKSPACE');
  };

  const handleAcceptRequest = async (req: any) => {
    setActionLoadingId(req.id);
    try {
      await supabase.from('attendance').update({ status: 'REPORT_PROCESSING' }).eq('id', req.id);
      await refreshAllData();
      handleOpenWorkspace(req, false);
    } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
  };

  const handleRejectRequest = async () => {
    if (!confirmReject) return;
    setActionLoadingId(confirmReject.id);
    try {
      await supabase.from('attendance').update({ status: 'REPORT_REJECTED' }).eq('id', confirmReject.id);
      await refreshAllData();
      setConfirmReject(null);
    } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
  };

  const avgScore = useMemo(() => {
    const total = reportForm.sessions.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
    return Math.round(total / 6);
  }, [reportForm.sessions]);

  const handleSaveReportToReady = async () => {
    const isMaterialEmpty = reportForm.sessions.some(s => !s.material.trim());
    const isNarrativeEmpty = !reportForm.narrative.trim();

    if (isMaterialEmpty || isNarrativeEmpty) {
      setShowErrors(true);
      const errEl = document.getElementById('error-notif-required');
      if (errEl) errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return alert("Waduh Kak! Materi sesi dan Narasi Evaluasi wajib diisi yaa agar rapot siswa sempurna ✨");
    }

    setActionLoadingId(selectedPackage.id);
    try {
      const sName = selectedPackage.studentsAttended?.[0] || 'SISWA';
      const topics = reportForm.sessions.map(s => (s.material || '').toUpperCase());
      const scores = reportForm.sessions.map(s => Number(s.score) || 0);
      const payload = { 
        status: 'REPORT_READY', 
        sessionnumber: 6, 
        studenttopics: { [sName]: topics }, 
        studentscores: { [sName]: scores }, 
        studentnarratives: { [sName]: reportForm.narrative }, 
        reportnarrative: reportForm.narrative, 
        periode: selectedPeriode, // ✅ SIMPAN PERIODE
        date: isEditMode ? selectedPackage.date : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()) 
      };
      await supabase.from('attendance').update(payload).eq('id', selectedPackage.id);
      await refreshAllData();
      
      setLastActionedId(selectedPackage.id);
      setSelectedPackage(null);
      setSelectedPeriode(1); // ✅ RESET PERIODE
      setActiveStep('HISTORY');
    } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
  };

  const handleSendReportToStudent = async (req: any) => {
    setActionLoadingId(req.id);
    try {
      await supabase.from('attendance').update({ status: 'SESSION_LOG' }).eq('id', req.id);
      await refreshAllData();
      setLastActionedId(req.id); // Set sebagai yang terakhir diaksi agar loncat ke depan
      alert("Rapot Berhasil Dikirim ke Siswa! ✨");
    } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
  };

  const handleDownloadPDF = async (req: any) => {
    setDownloadProgress(5);
    setActiveDownloadId(req.id);
    
    try {
      // 🎯 HALAMAN 1: LANDSCAPE (Sertifikat Horizontal)
      const pdf = new jsPDF({ orientation: 'l', unit: 'px', format: 'a4', hotfixes: ["px_rendering"] });
      const pw1 = pdf.internal.pageSize.getWidth();
      const ph1 = pdf.internal.pageSize.getHeight();
      const captureOptionsLandscape = { scale: 3, useCORS: true, backgroundColor: '#ffffff', width: 1123, height: 794, logging: false };

      setDownloadProgress(20);
      const el1 = document.getElementById(`cert-render-${req.id}`);
      if (el1) {
        const canvas1 = await html2canvas(el1, captureOptionsLandscape);
        const img1 = canvas1.toDataURL('image/png', 1.0);
        pdf.addImage(img1, 'PNG', 0, 0, pw1, ph1, undefined, 'FAST');
      }
      setDownloadProgress(45);
      
      // 🎯 HALAMAN 2: PORTRAIT (Transkrip Nilai)
      pdf.addPage('a4', 'p');
      const pw2 = pdf.internal.pageSize.getWidth();
      const ph2 = pdf.internal.pageSize.getHeight();
      const captureOptionsPortrait = { scale: 3, useCORS: true, backgroundColor: '#ffffff', width: 794, height: 1123, logging: false };
      
      const el2 = document.getElementById(`transcript-render-${req.id}`);
      if (el2) {
        const canvas2 = await html2canvas(el2, captureOptionsPortrait);
        const img2 = canvas2.toDataURL('image/png', 1.0);
        pdf.addImage(img2, 'PNG', 0, 0, pw2, ph2, undefined, 'FAST');
      }
      setDownloadProgress(75);
      
      // 🎯 HALAMAN 3: PORTRAIT (Milestone)
      pdf.addPage('a4', 'p');
      const el3 = document.getElementById(`milestone-render-${req.id}`);
      if (el3) {
        const canvas3 = await html2canvas(el3, captureOptionsPortrait);
        const img3 = canvas3.toDataURL('image/png', 1.0);
        pdf.addImage(img3, 'PNG', 0, 0, pw2, ph2, undefined, 'FAST');
      }
      setDownloadProgress(95);
      
      pdf.save(`Rapot_Sanur_${req.studentsAttended?.[0]}.pdf`);
      setDownloadProgress(100);
      
      await new Promise(r => setTimeout(r, 500));
    } catch (e) { 
      alert("Gagal proses PDF."); 
    } finally { 
      setActiveDownloadId(null); 
      setDownloadProgress(0);
    }
  };

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalZoomIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-12 pb-40 px-4 animate-in fade-in duration-700">
      {/* LOADING MODAL TENGAH - DENGAN REAL PROGRESS BAR */}
      {activeDownloadId && (
        <div data-modal-container className="fixed inset-0 z-[300000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl flex flex-col items-center text-center space-y-8 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <div className="w-20 h-20 bg-blue-600 text-white rounded-[2.2rem] flex items-center justify-center shadow-xl animate-bounce">
                <FileDown size={40} />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Memproses PDF</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed px-4">Mengonversi sertifikat & transkrip... ✨</p>
              </div>
              
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center px-1">
                   <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Progress</span>
                   <span className="text-[11px] font-black text-blue-600 italic">{downloadProgress}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                   <div 
                     className="h-full bg-blue-600 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
                     style={{ width: `${downloadProgress}%` }}
                   ></div>
                </div>
              </div>
           </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
        <div className="space-y-4">
           <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Portal <span className="text-orange-600">Rapot</span></h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Terbitkan Sertifikat & Rapot Digital Siswa ✨</p>
        </div>
      </header>

      <div className="flex bg-slate-100 p-2 rounded-full w-full max-w-xl mx-auto shadow-inner border border-slate-100">
         <button onClick={() => setActiveStep('ANTREAN')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'ANTREAN' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-400'}`}>Antrean ({reportRequests.length})</button>
         <button onClick={() => setActiveStep('WORKSPACE')} disabled={!selectedPackage} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'WORKSPACE' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 disabled:opacity-30'}`}>Workspace</button>
         <button onClick={() => setActiveStep('HISTORY')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'HISTORY' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Histori</button>
      </div>

      {activeStep === 'HISTORY' && (
  <div className="max-w-5xl mx-auto">
     <div className="flex items-center gap-3 bg-white border-2 border-slate-100 rounded-3xl shadow-xl p-2 pr-3">
        {/* Search Input */}
        <div className="flex-1 relative">
           <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500"><Search size={18} /></div>
           <input 
              type="text" 
              placeholder="CARI SISWA / KELAS..." 
              value={historySearchTerm} 
              onChange={(e) => setHistorySearchTerm(e.target.value.toUpperCase())} 
              className="w-full pl-14 pr-4 py-4 bg-transparent font-black text-[10px] uppercase outline-none" 
           />
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200"></div>

        {/* Filter Tahun - Integrated */}
        <div className="relative group shrink-0">
           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"><Filter size={14} /></div>
           <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)} 
              className="pl-9 pr-3 py-3 bg-transparent font-black text-[10px] uppercase outline-none appearance-none cursor-pointer min-w-[100px] text-center"
           >
              {Array.from({ length: 11 }, (_, i) => (2024 + i).toString()).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
           </select>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200"></div>

        {/* ✅ FILTER PERIODE BARU - Integrated */}
        <div className="relative group shrink-0">
           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"><Calendar size={14} /></div>
           <select 
              value={historyPeriodeFilter} 
              onChange={(e) => setHistoryPeriodeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} 
              className="pl-9 pr-3 py-3 bg-transparent font-black text-[10px] uppercase outline-none appearance-none cursor-pointer min-w-[130px] text-center"
           >
              <option value="all">SEMUA PERIODE</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>
                  PERIODE {num}
                </option>
              ))}
           </select>
        </div>
     </div>
  </div>
)}

      {activeStep === 'ANTREAN' && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {reportRequests.map((req, i) => (
              <div key={i} className="bg-white p-12 md:p-14 rounded-[4rem] shadow-xl border border-slate-100 flex flex-col justify-between hover:border-orange-500 transition-all">
                 <div>
                   <div className="flex justify-between items-start mb-10">
                      <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center shadow-inner"><GraduationCap size={40}/></div>
                      <span className="px-6 py-2 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">KLAIM BARU</span>
                   </div>
                   <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-2 Kalimat leading-tight">{req.studentsAttended?.[0]}</h4>
                   <p className="text-[11px] font-bold text-blue-600 uppercase mb-10 Kalimat leading-relaxed">{req.className}</p>
                   <button onClick={() => setShowMilestoneFor(req)} className="w-full py-5 mb-5 bg-slate-50 text-slate-500 rounded-3xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all border border-transparent shadow-sm"><History size={18}/> LIHAT MILESTONE</button>
                 </div>
                 <div className="space-y-4">
                    <button 
                      onClick={() => handleAcceptRequest(req)} 
                      disabled={!!actionLoadingId}
                      className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-black flex items-center justify-center gap-3"
                    >
                      {actionLoadingId === req.id ? <Loader2 className="animate-spin" size={20} /> : 'TERIMA & ISI RAPOT ✍️'}
                    </button>
                    <button 
                      onClick={() => setConfirmReject(req)} 
                      disabled={!!actionLoadingId}
                      className="w-full py-5 bg-rose-50 text-rose-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                    >
                      TOLAK PERMINTAAN
                    </button>
                 </div>
              </div>
            ))}
         </div>
      )}
      
      {activeStep === 'WORKSPACE' && selectedPackage && (
         <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-blue-600 overflow-hidden animate-in zoom-in space-y-0">
            <div className="p-10 bg-blue-600 text-white flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner shrink-0 rotate-3"><GraduationCap size={32} /></div>
                  <div className="text-center md:text-left"><h3 className="text-2xl font-black uppercase italic leading-none">{isEditMode ? 'Edit Rapot Siswa' : 'Ruang Kerja Penilaian'}</h3><p className="text-[11px] font-black uppercase tracking-widest mt-2 opacity-80">{selectedPackage.studentsAttended?.[0]} — {selectedPackage.className}</p></div>
               </div>
               <div className="flex items-center gap-4">
                  {/* ✅ DROPDOWN PERIODE */}
                  <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3 border border-white/30">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Periode:</label>
                     <select 
                        value={selectedPeriode} 
                        onChange={(e) => setSelectedPeriode(Number(e.target.value))}
                        className="bg-white text-blue-600 px-4 py-2 rounded-xl font-black text-[11px] uppercase outline-none cursor-pointer shadow-inner"
                     >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                           <option key={num} value={num}>
                              {num} (Sesi {(num - 1) * 6 + 1}-{num * 6})
                           </option>
                        ))}
                     </select>
                  </div>
                  <button onClick={() => { setSelectedPackage(null); setIsEditMode(false); setActiveStep('ANTREAN'); setShowErrors(false); setSelectedPeriode(1); }} className="p-4 bg-white/20 rounded-2xl hover:bg-white/40 transition-all"><X/></button>
               </div>
            </div>
            <div className="p-8 md:p-14 space-y-16">
               <section className="space-y-4">
   <div className="flex items-center gap-3 text-blue-600"><History size={20} /><h4 className="text-xs font-black uppercase tracking-widest">Langkah Pembelajaran (Milestone)</h4></div>
   <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100">
      {/* ✅ TAMBAH PENGECEKAN INI */}
      {studentAttendanceLogs && Array.isArray(studentAttendanceLogs) ? (
         <MilestoneView 
            studentAttendanceLogs={studentAttendanceLogs} 
            studentName={selectedPackage.studentsAttended?.[0] || ''} 
            packageId={selectedPackage.packageId} 
         />
      ) : (
         <div className="text-center py-8">
            <p className="text-slate-400 text-sm font-bold">Loading milestone data...</p>
         </div>
      )}
   </div>
</section>
               <section className="flex flex-col items-center">
                  <div className="bg-slate-900 p-12 rounded-[4rem] text-white text-center shadow-2xl relative overflow-hidden w-full max-w-lg">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                     <p className="text-[10px] uppercase font-black text-slate-400 mb-2 relative z-10">Skor Rata-Rata Akhir</p>
                     <h4 className="text-8xl font-black italic text-emerald-400 relative z-10">{avgScore}</h4>
                     <p className="text-[11px] font-black uppercase tracking-widest mt-6 text-emerald-500 opacity-60 relative z-10">{avgScore >= 80 ? 'KOMPETENSI: LULUS' : 'KOMPETENSI: REMEDIAL'}</p>
                  </div>
               </section>
               <section className="space-y-6">
                  <div className="flex items-center gap-3 text-blue-600"><BookOpen size={20} /><h4 className="text-xs font-black uppercase tracking-widest">Detail Materi & Nilai Tiap Sesi - Periode {selectedPeriode}</h4></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {reportForm.sessions.map((s, i) => {
                        const actualSessionNum = (selectedPeriode - 1) * 6 + s.num;
                        return (
                        <div key={i} className={`flex flex-col gap-4 p-8 rounded-[2.5rem] border-2 transition-all shadow-inner ${showErrors && !s.material.trim() ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-200' : 'border-transparent bg-slate-50 focus-within:border-blue-500'}`}>
                           <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                              <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 italic shadow-sm shrink-0">{actualSessionNum < 10 ? `0${actualSessionNum}` : actualSessionNum}</span>
                              <div className="text-right"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Skor Sesi</label><input type="number" value={s.score} onChange={e => { const n = [...reportForm.sessions]; n[i].score = parseInt(e.target.value) || 0; setReportForm({...reportForm, sessions: n}); }} className="w-16 bg-transparent text-right font-black text-blue-600 text-2xl outline-none" /></div>
                           </div>
                           <div className="space-y-2">
                              <div className="flex justify-between items-center ml-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase Kalimat tracking-widest flex items-center gap-1">
                                  Materi Pembelajaran 
                                  <span className={`font-black px-1.5 py-0.5 rounded-md text-[6px] border ${showErrors && !s.material.trim() ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>WAJIB DIISI ✨</span>
                                </label>
                                <span className={`text-[7px] font-black ${s.material.length >= 35 ? 'text-rose-500' : 'text-slate-300'}`}>{s.material.length}/35</span>
                              </div>
                              <input 
                                type="text" 
                                placeholder="MISAL: PENGENALAN TOOLS..." 
                                value={s.material} 
                                maxLength={35} 
                                onChange={e => { 
                                  const n = [...reportForm.sessions]; 
                                  n[i].material = e.target.value; 
                                  setReportForm({...reportForm, sessions: n}); 
                                }} 
                                className={`w-full px-5 py-3 rounded-xl font-black uppercase text-[10px] outline-none transition-all border ${showErrors && !s.material.trim() ? 'bg-rose-50 border-rose-500 placeholder:text-rose-300' : 'bg-white border-slate-200 focus:border-blue-500'}`} 
                              />
                           </div>
                        </div>
                     )})}
                  </div>
               </section>
               <section className="space-y-6">
                  <div className="flex items-center gap-3 text-blue-600">
                    <Quote size={20} />
                    <h4 className="text-xs font-black uppercase tracking-widest">Narasi Evaluasi</h4>
                    <span className={`font-black px-2 py-0.5 rounded-full text-[7px] border uppercase tracking-widest ${showErrors && !reportForm.narrative.trim() ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>WAJIB DIISI KAK! ✨</span>
                  </div>
                  <div className={`p-10 rounded-[3rem] border-2 transition-all shadow-inner space-y-4 ${showErrors && !reportForm.narrative.trim() ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-200' : 'border-slate-100 bg-slate-50'}`}>
                     <div className="flex justify-end pr-8 mb-[-2rem] Kalimat relative z-10"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${reportForm.narrative.length >= 200 ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white shadow-md'}`}>{reportForm.narrative.length}/200</span></div>
                     <textarea 
                        placeholder="TULISKAN CATATAN PERKEMBANGAN SISWA... ✨" 
                        value={reportForm.narrative} 
                        maxLength={200} 
                        onChange={e => setReportForm({...reportForm, narrative: e.target.value})} 
                        rows={6} 
                        className={`w-full p-10 bg-white rounded-[2rem] font-bold text-sm outline-none border-2 transition-all ${showErrors && !reportForm.narrative.trim() ? 'border-rose-500 shadow-rose-100' : 'border-transparent focus:border-blue-500 shadow-sm'}`} 
                     />
                  </div>
               </section>
               <section className="pt-10">
                  <button 
                    id="error-notif-required" 
                    onClick={handleSaveReportToReady} 
                    disabled={!!actionLoadingId} 
                    className="w-full py-10 bg-blue-600 text-white rounded-[3rem] font-black text-[14px] uppercase tracking-[0.4em] shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-5"
                  >
                     {actionLoadingId === selectedPackage.id ? <Loader2 size={32} className="animate-spin" /> : <><Save size={32} /> SIMPAN HASIL PENILAIAN ✨</>}
                  </button>
               </section>
            </div>
         </div>
      )}

      {activeStep === 'HISTORY' && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {publishedReports.map((req, i) => {
               const sName = req.studentsAttended?.[0] || 'SISWA';
               const scores = (Array.isArray(req.studentScores?.[sName]) ? req.studentScores?.[sName] : Array(6).fill(90)) as number[];
               const avg = Math.round(scores.reduce((a:number,b:number)=>a+b,0)/6);
               const isPass = avg >= 80;
               const isReadyToSend = req.status === 'REPORT_READY';
               const isNewlyActioned = req.id === lastActionedId;

               return (
                  <div 
                    key={i} 
                    id={`history-card-${req.id}`}
                    className={`bg-white p-12 md:p-14 rounded-[4rem] shadow-xl border-2 transition-all flex flex-col relative ${isNewlyActioned ? 'border-blue-500 shadow-blue-100' : isReadyToSend ? 'border-amber-400 bg-amber-50/10' : 'border-slate-100 hover:border-emerald-500'}`}
                  >
                     {isNewlyActioned && (
                        <div className="absolute -top-3 -right-3 px-6 py-2 bg-blue-600 text-white rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl animate-bounce z-20">
                           TERBARU ✨
                        </div>
                     )}
                     <div className="flex justify-between items-start mb-10">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner shrink-0 ${isPass ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{isPass ? <BadgeCheck size={40}/> : <AlertCircle size={40}/>}</div>
                        <div className="flex flex-col items-end gap-2">
                           <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center ${isPass ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'}`}>{isPass ? 'LULUS' : 'REMEDIAL'}</span>
                           {isReadyToSend && <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest animate-pulse italic">SIAP DIKIRIM ✨</span>}
                        </div>
                     </div>
                     <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-1 truncate">{sName}</h4>
                     <p className="text-[11px] font-bold text-blue-600 uppercase mb-10 Kalimat leading-relaxed">{req.className}</p>
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] mb-10 flex justify-between items-center"><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rerata</p><p className={`text-3xl font-black italic ${isPass ? 'text-emerald-600' : 'text-orange-600'}`}>{avg}</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isReadyToSend ? 'Selesai Nilai' : 'Terkirim'}</p><p className="text-[11px] font-black text-slate-800 uppercase tracking-normal">{formatDateToDMY(req.date)}</p></div></div>
                     
                     <div className="space-y-4 mt-auto">
                        {isReadyToSend ? (
                           <>
                              <button 
                                onClick={() => handleSendReportToStudent(req)} 
                                disabled={!!actionLoadingId} 
                                className="w-full py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 group"
                              >
                                 {actionLoadingId === req.id ? <Loader2 size={20} className="animate-spin" /> : <><SendHorizonal size={20} className="group-hover:translate-x-2 transition-transform"/> KIRIM RAPOT KE SISWA ✨</>}
                              </button>
                              <button onClick={() => handleOpenWorkspace(req, true)} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-[2rem] font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-500 transition-all">
                                 <FileEdit size={16}/> EDIT PENILAIAN
                              </button>
                           </>
                        ) : (
                           <>
                              <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-[2rem] font-black text-[10px] uppercase flex items-center justify-center gap-3 border-2 border-emerald-100 shadow-sm mb-2">
                                 <CheckCircle2 size={18}/> SUDAH DITERIMA SISWA ✨
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                 <button onClick={() => handleOpenWorkspace(req, true)} className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                    <FileEdit size={16}/> EDIT
                                 </button>
                                 <button onClick={() => handleDownloadPDF(req)} disabled={activeDownloadId === req.id} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-xl">
                                    {activeDownloadId === req.id ? <Loader2 className="animate-spin" size={16}/> : <Printer size={16}/>} CETAK
                                 </button>
                              </div>
                           </>
                        )}
                     </div>
                  </div>
               );
            })}
            {publishedReports.length === 0 && (
               <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30">
                  <History size={64} className="mx-auto mb-6 text-slate-300" />
                  <p className="font-black text-[11px] uppercase tracking-[0.4em] italic leading-relaxed text-center">Belum ada histori rapot. ✨</p>
               </div>
            )}
         </div>
      )}

      {/* RENDER PDF HIDDEN MENGGUNAKAN MASTER TEMPLATE */}
<div className="fixed left-[-9999px] top-0 pointer-events-none">
   {publishedReports.map((req) => (
      <ReportTemplate 
        key={req.id} 
        reportLog={req} 
        allLogs={logs}
        studentAttendanceLogs={studentAttendanceLogs} // ✅ INI HARUS ADA!
        studentName={req.studentsAttended?.[0] || 'SISWA'} 
      />
   ))}
</div>

      {showMilestoneFor && (
        <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative overflow-hidden space-y-10 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setShowMilestoneFor(null)} className="absolute top-10 right-10 p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
              <div className="flex items-center gap-6"><div className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-3"><History size={32} /></div><div><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Milestone Belajar</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{showMilestoneFor.studentsAttended?.[0]}</p></div></div>
              <MilestoneView studentAttendanceLogs={studentAttendanceLogs} studentName={showMilestoneFor.studentsAttended?.[0] || ''} packageId={showMilestoneFor.packageId} />
              <button onClick={() => setShowMilestoneFor(null)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl">TUTUP MILESTONE ✨</button>
           </div>
        </div>
      )}

      {confirmReject && (
         <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
            <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
               <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-pulse"><AlertCircle size={48} /></div>
               <div className="space-y-2"><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Tolak Permintaan?</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest Kalimat leading-relaxed px-4">Siswa akan diminta memilih pengajar lain untuk klaim rapot mereka.</p></div>
               <div className="flex gap-4"><button onClick={() => setConfirmReject(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button><button onClick={handleRejectRequest} disabled={!!actionLoadingId} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">{actionLoadingId === confirmReject.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18}/>} IYA, TOLAK</button></div>
            </div>
         </div>
      )}
    </div>
    </>
  );
};

export default TeacherReportsInbox;
