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
  reports: any[]; 
  studentAttendanceLogs: any[]; // ✅ TAMBAHAN BARU
  studentAccounts: User[];
  refreshAllData: () => Promise<void>;
}

const MilestoneView = ({ studentAttendanceLogs, studentName, packageId, periode = 1 }: { studentAttendanceLogs: any[], studentName: string, packageId: string, periode?: number }) => {
  const sNameNorm = studentName.toUpperCase().trim();
  const pkgIdNorm = packageId.toUpperCase().trim();

  const sortedLogs = [...(studentAttendanceLogs || [])]
    .filter(l => 
      (l.packageid || '').toUpperCase().trim() === pkgIdNorm && 
      (l.studentname || '').toUpperCase().trim() === sNameNorm
    )
    .sort((a,b) => (a.sessionnumber || 0) - (b.sessionnumber || 0));

  // ✅ HITUNG SESSION NUMBERS DINAMIS SESUAI TINGKAT
  const startSession = (periode - 1) * 6 + 1;
  const sessionNumbers = Array.from({ length: 6 }, (_, i) => startSession + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-slate-400 border-b border-slate-100 pb-2">
        <ClipboardList size={16} />
        <p className="text-[10px] font-black uppercase tracking-widest">Milestone Pembelajaran Siswa - Tingkat {periode}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {sessionNumbers.map((sessionNum, idx) => {
          const log = sortedLogs.find(l => l.sessionnumber === (idx + 1)); // ✅ TETAP CARI DI 1-6
          return (
            <div key={sessionNum} className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${log ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-transparent opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic text-[10px] ${log ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>{sessionNum < 10 ? `0${sessionNum}` : sessionNum}</div>
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-800 uppercase italic leading-none">Sesi {sessionNum}</p>
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

const TeacherReportsInbox: React.FC<TeacherReportsInboxProps> = ({ user, logs, reports, studentAttendanceLogs, studentAccounts, refreshAllData }) => {
  
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
  const [selectedTingkat, setSelectedTingkat] = useState(1);
  
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

  // ✅ FIXED: Filter requests dengan benar
  const incomingRequests = useMemo(() => {
    const requests = reports.filter(r => 
      (r.status === 'REQ' || r.status === 'REPORT_PROCESSING') &&
      r.teacherid === user.id &&
      r.teacherid !== 'SISWA_MANDIRI' // ✅ FILTER ABSEN SISWA MANDIRI
    );
    return requests.filter(req => {
      const sn = req.studentsattended?.[0] || '';
      const cn = req.classname || '';
      return sn.toLowerCase().includes(historySearchTerm.toLowerCase()) || 
             cn.toLowerCase().includes(historySearchTerm.toLowerCase());
    });
  }, [reports, user.id, historySearchTerm]);

  // ✅ FIXED: Filter published reports dengan benar
  const publishedReports = useMemo(() => {
    const published = reports.filter(r => 
      r.status === 'SESSION_LOG' && 
      r.teacherid === user.id &&
      r.teacherid !== 'SISWA_MANDIRI' // ✅ FILTER ABSEN SISWA MANDIRI
    );
    
    // ✅ FILTER BERDASARKAN TAHUN
    const yearFiltered = published.filter(r => {
      const yearFromDate = r.date?.split('-')?.[0] || '2026';
      return yearFromDate === selectedYear;
    });

    // ✅ FILTER BERDASARKAN TINGKAT
    const tingkatFiltered = yearFiltered.filter(r => {
      const periode = r.periode || 1;
      return periode === selectedTingkat;
    });
    
    // ✅ FILTER BERDASARKAN SEARCH
    return tingkatFiltered.filter(req => {
      const sn = req.studentsattended?.[0] || '';
      const cn = req.classname || '';
      return sn.toLowerCase().includes(historySearchTerm.toLowerCase()) || 
             cn.toLowerCase().includes(historySearchTerm.toLowerCase());
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, user.id, selectedYear, selectedTingkat, historySearchTerm]);

  const handleOpenWorkspace = (req: any, editMode: boolean = false) => {
    setSelectedPackage(req);
    setIsEditMode(editMode);
    setShowErrors(false);
    
    if (editMode) {
      const scoresObj = req.studentscores || {};
      const topicsObj = req.studenttopics || {};
      const sn = req.studentsattended?.[0] || '';
      const studentScores = scoresObj[sn] || [];
      const studentTopics = topicsObj[sn] || [];
      
      setReportForm({
        sessions: Array.from({ length: 6 }, (_, i) => ({
          num: i + 1,
          material: studentTopics[i] || '',
          score: studentScores[i] || 90
        })),
        narrative: req.reportnarrative || ''
      });
    } else {
      setReportForm({
        sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: '', score: 90 })),
        narrative: ''
      });
    }
    
    setActiveStep('WORKSPACE');
  };

  const handleBackToQueue = () => {
    setActiveStep('ANTREAN');
    setSelectedPackage(null);
    setIsEditMode(false);
    setShowErrors(false);
  };

  const handleSaveReport = async () => {
    const allFilled = reportForm.sessions.every(s => s.material.trim() !== '' && s.score >= 0 && s.score <= 100);
    if (!allFilled || reportForm.narrative.trim() === '') {
      setShowErrors(true);
      return;
    }
    
    if (!selectedPackage) return;
    
    setActionLoadingId(selectedPackage.id);
    
    const sn = selectedPackage.studentsattended?.[0] || '';
    const newScores = { [sn]: reportForm.sessions.map(s => s.score) };
    const newTopics = { [sn]: reportForm.sessions.map(s => s.material) };
    
    const { error } = await supabase
      .from('reports')
      .update({
        studentscores: newScores,
        studenttopics: newTopics,
        reportnarrative: reportForm.narrative,
        status: 'REPORT_PROCESSING'
      })
      .eq('id', selectedPackage.id);
    
    setActionLoadingId(null);
    
    if (!error) {
      await refreshAllData();
      setActiveStep('ANTREAN');
      setSelectedPackage(null);
      setIsEditMode(false);
      setShowErrors(false);
    } else {
      alert('Gagal menyimpan rapot: ' + error.message);
    }
  };

  const handleSendReportToStudent = async (req: any) => {
    setActionLoadingId(req.id);
    
    const { error } = await supabase
      .from('reports')
      .update({ status: 'SESSION_LOG', date: new Date().toISOString().split('T')[0] })
      .eq('id', req.id);
    
    setActionLoadingId(null);
    
    if (!error) {
      setLastActionedId(req.id);
      await refreshAllData();
      setActiveStep('HISTORY');
    } else {
      alert('Gagal mengirim rapot: ' + error.message);
    }
  };

  const handleRejectRequest = async () => {
    if (!confirmReject) return;
    setActionLoadingId(confirmReject.id);
    
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', confirmReject.id);
    
    setActionLoadingId(null);
    
    if (!error) {
      await refreshAllData();
      setConfirmReject(null);
    } else {
      alert('Gagal menolak request: ' + error.message);
    }
  };

  const handleDownloadPDF = async (req: any) => {
    setActiveDownloadId(req.id);
    setDownloadProgress(0);
    
    setTimeout(() => setDownloadProgress(30), 200);
    
    const element = document.getElementById(`pdf-${req.id}`);
    if (!element) {
      setActiveDownloadId(null);
      alert('Template rapot tidak ditemukan!');
      return;
    }
    
    setTimeout(() => setDownloadProgress(50), 600);
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      setTimeout(() => setDownloadProgress(80), 1000);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const sn = req.studentsattended?.[0] || 'SISWA';
      const fileName = `RAPOT_${sn.replace(/\s+/g, '_')}_${formatDateToDMY(req.date).replace(/\//g, '-')}.pdf`;
      
      setTimeout(() => setDownloadProgress(100), 1400);
      
      setTimeout(() => {
        pdf.save(fileName);
        setActiveDownloadId(null);
        setDownloadProgress(0);
      }, 1800);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal membuat PDF. Silakan coba lagi.');
      setActiveDownloadId(null);
      setDownloadProgress(0);
    }
  };

  // ✅ HITUNG TAHUN-TAHUN UNIK DARI REPORTS
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    reports.forEach(r => {
      if (r.status === 'SESSION_LOG' && r.teacherid === user.id) {
        const year = r.date?.split('-')?.[0];
        if (year) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [reports, user.id]);

  // ✅ HITUNG TINGKAT UNIK DARI REPORTS (UNTUK TAHUN TERPILIH)
  const availableTingkat = useMemo(() => {
    const tingkatSet = new Set<number>();
    reports.forEach(r => {
      if (r.status === 'SESSION_LOG' && r.teacherid === user.id) {
        const year = r.date?.split('-')?.[0];
        if (year === selectedYear) {
          const periode = r.periode || 1;
          tingkatSet.add(periode);
        }
      }
    });
    return Array.from(tingkatSet).sort((a, b) => a - b);
  }, [reports, user.id, selectedYear]);

  return (
    <>
    <style>{`
      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modalZoomIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 p-4 md:p-10 space-y-8 relative overflow-y-auto">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-2xl rotate-3 shrink-0">
            <GraduationCap size={42} className="text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-800 uppercase italic leading-none">Inbox Rapot</h1>
            <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em]">Kelola Permintaan Nilai Siswa</p>
          </div>
        </div>
        
        <div className="flex gap-3 bg-white p-2 rounded-[2rem] shadow-xl border-2 border-slate-100">
          <button onClick={() => setActiveStep('ANTREAN')} className={`px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeStep === 'ANTREAN' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-blue-600'}`}>
            <ClipboardList size={18}/> ANTREAN {incomingRequests.length > 0 && <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[8px] font-black animate-pulse">{incomingRequests.length}</span>}
          </button>
          <button onClick={() => setActiveStep('HISTORY')} className={`px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeStep === 'HISTORY' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-400 hover:text-emerald-600'}`}>
            <History size={18}/> HISTORI
          </button>
        </div>
      </div>

      {activeStep === 'ANTREAN' && (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-6 rounded-[3rem] shadow-xl border-2 border-slate-100">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
              <input 
                type="text" 
                placeholder="Cari siswa atau kelas..." 
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="w-full pl-16 pr-6 py-5 bg-slate-50 rounded-[2rem] font-bold text-[11px] uppercase tracking-widest text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all"
              />
            </div>
            {historySearchTerm && (
              <button onClick={() => setHistorySearchTerm('')} className="px-6 py-5 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                <X size={16}/> RESET
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {incomingRequests.map(req => {
              const sn = req.studentsattended?.[0] || 'SISWA';
              const isPending = req.status === 'REQ';
              const isProcessing = req.status === 'REPORT_PROCESSING';
              const periode = req.periode || 1;
              
              return (
                <div key={req.id} className="bg-white rounded-[4rem] p-10 shadow-2xl border-2 border-slate-100 hover:scale-[1.02] transition-all space-y-8 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-inner shrink-0 ${isPending ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                      {isPending ? <AlertCircle size={40}/> : <Sparkles size={40}/>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md ${isPending ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                        {isPending ? 'BARU MASUK' : 'SEDANG DIKERJAKAN'}
                      </span>
                      {/* ✅ BADGE TINGKAT */}
                      <span className="px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-purple-100 text-purple-600">
                        TINGKAT {periode}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-1 truncate">{sn}</h4>
                    <p className="text-[11px] font-bold text-blue-600 uppercase mb-2 leading-relaxed">{req.classname}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Diminta: {formatDateToDMY(req.date)}</p>
                  </div>
                  
                  <div className="space-y-3 mt-auto">
                    <button 
                      onClick={() => handleOpenWorkspace(req, isProcessing)} 
                      className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 group"
                    >
                      {isProcessing ? <><FileEdit size={20}/> LANJUTKAN PENGERJAAN</> : <><Zap size={20} className="group-hover:rotate-12 transition-transform"/> KERJAKAN SEKARANG</>}
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setShowMilestoneFor(req)} className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-purple-600 hover:text-white transition-all shadow-sm">
                        <History size={16}/> MILESTONE
                      </button>
                      <button onClick={() => setConfirmReject(req)} className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                        <X size={16}/> TOLAK
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {incomingRequests.length === 0 && (
              <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30">
                <ClipboardList size={64} className="mx-auto mb-6 text-slate-300" />
                <p className="font-black text-[11px] uppercase tracking-[0.4em] italic leading-relaxed text-center">
                  {historySearchTerm ? 'Tidak ada hasil pencarian. ✨' : 'Belum ada permintaan rapot. ✨'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeStep === 'WORKSPACE' && selectedPackage && (
        <div className="space-y-10">
          <button onClick={handleBackToQueue} className="flex items-center gap-3 text-slate-400 hover:text-blue-600 transition-all group">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
              <ChevronRight size={20} className="rotate-180"/>
            </div>
            <span className="font-black text-[11px] uppercase tracking-[0.3em]">KEMBALI KE ANTREAN</span>
          </button>

          <div className="bg-white rounded-[4rem] p-12 shadow-2xl border-2 border-slate-100 space-y-10">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl rotate-3 shrink-0">
                  <Trophy size={42} className="text-white"/>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-800 uppercase italic leading-none">{selectedPackage.studentsattended?.[0] || 'SISWA'}</h2>
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">{selectedPackage.classname}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TINGKAT {selectedPackage.periode || 1} • SESI {((selectedPackage.periode || 1) - 1) * 6 + 1}-{(selectedPackage.periode || 1) * 6}</p>
                </div>
              </div>
              {isEditMode && (
                <span className="px-6 py-3 bg-amber-50 text-amber-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm flex items-center gap-2">
                  <Edit3 size={16}/> MODE EDIT
                </span>
              )}
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-3 text-slate-400 border-b-2 border-slate-100 pb-3">
                <BookOpen size={18}/>
                <h3 className="font-black text-[11px] uppercase tracking-[0.3em]">Penilaian Per Sesi</h3>
              </div>
              
              {reportForm.sessions.map((session, idx) => (
                <div key={session.num} className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 border-2 border-transparent hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-lg">{session.num}</div>
                    <h4 className="font-black text-[11px] uppercase tracking-[0.3em] text-slate-800">Sesi {session.num}</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block font-black text-[9px] uppercase tracking-[0.3em] text-slate-400 mb-3">MATERI YANG DIPELAJARI</label>
                      <input 
                        type="text" 
                        value={session.material}
                        onChange={(e) => {
                          const newSessions = [...reportForm.sessions];
                          newSessions[idx].material = e.target.value;
                          setReportForm({ ...reportForm, sessions: newSessions });
                        }}
                        placeholder="Contoh: Pengenalan Microsoft Word & Interface Dasar"
                        className={`w-full px-6 py-5 bg-white rounded-2xl font-bold text-[11px] uppercase text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all ${showErrors && !session.material.trim() ? 'ring-4 ring-rose-500/50 border-2 border-rose-500' : 'focus:ring-4 focus:ring-blue-500/30 border-2 border-slate-100'}`}
                      />
                    </div>
                    
                    <div>
                      <label className="block font-black text-[9px] uppercase tracking-[0.3em] text-slate-400 mb-3">NILAI (0-100)</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100"
                        value={session.score}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const newSessions = [...reportForm.sessions];
                          newSessions[idx].score = Math.max(0, Math.min(100, val));
                          setReportForm({ ...reportForm, sessions: newSessions });
                        }}
                        className={`w-full px-6 py-5 bg-white rounded-2xl font-black text-2xl text-slate-800 focus:outline-none transition-all ${showErrors && (session.score < 0 || session.score > 100) ? 'ring-4 ring-rose-500/50 border-2 border-rose-500' : 'focus:ring-4 focus:ring-blue-500/30 border-2 border-slate-100'}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 text-slate-400 border-b-2 border-slate-100 pb-3">
                <Quote size={18}/>
                <h3 className="font-black text-[11px] uppercase tracking-[0.3em]">Catatan Guru</h3>
              </div>
              <textarea 
                value={reportForm.narrative}
                onChange={(e) => setReportForm({ ...reportForm, narrative: e.target.value })}
                placeholder="Tulis catatan perkembangan siswa, kekuatan, area yang perlu ditingkatkan, dan rekomendasi..."
                rows={6}
                className={`w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-bold text-[11px] leading-relaxed text-slate-800 placeholder:text-slate-300 focus:outline-none transition-all resize-none ${showErrors && !reportForm.narrative.trim() ? 'ring-4 ring-rose-500/50 border-2 border-rose-500' : 'focus:ring-4 focus:ring-blue-500/30 border-2 border-slate-100'}`}
              />
            </div>

            {showErrors && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-[2rem] p-6 flex items-start gap-4">
                <AlertTriangle className="text-rose-600 shrink-0" size={24}/>
                <div className="space-y-2">
                  <p className="font-black text-[11px] uppercase tracking-[0.2em] text-rose-800">HARAP LENGKAPI DATA!</p>
                  <p className="text-[10px] font-bold text-rose-600 leading-relaxed">Pastikan semua materi, nilai, dan catatan guru sudah terisi dengan benar.</p>
                </div>
              </div>
            )}

            <button 
              onClick={handleSaveReport} 
              disabled={!!actionLoadingId}
              className="w-full py-7 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-[3rem] font-black text-[13px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:shadow-2xl transition-all shadow-xl active:scale-95 group"
            >
              {actionLoadingId === selectedPackage.id ? (
                <Loader2 size={24} className="animate-spin"/>
              ) : (
                <>
                  <Save size={24} className="group-hover:scale-110 transition-transform"/>
                  {isEditMode ? 'PERBARUI PENILAIAN ✨' : 'SIMPAN PENILAIAN ✨'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeStep === 'HISTORY' && (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-6 rounded-[3rem] shadow-xl border-2 border-slate-100">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
              <input 
                type="text" 
                placeholder="Cari siswa atau kelas..." 
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="w-full pl-16 pr-6 py-5 bg-slate-50 rounded-[2rem] font-bold text-[11px] uppercase tracking-widest text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all"
              />
            </div>
            
            {/* ✅ FILTER TAHUN */}
            <div className="flex items-center gap-2">
              <Calendar className="text-slate-400" size={18}/>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-6 py-5 bg-slate-50 rounded-2xl font-black text-[10px] uppercase text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all cursor-pointer"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* ✅ FILTER TINGKAT */}
            <div className="flex items-center gap-2">
              <Trophy className="text-purple-600" size={18}/>
              <select 
                value={selectedTingkat}
                onChange={(e) => setSelectedTingkat(parseInt(e.target.value))}
                className="px-6 py-5 bg-purple-50 rounded-2xl font-black text-[10px] uppercase text-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-500/30 transition-all cursor-pointer"
              >
                {availableTingkat.map(t => (
                  <option key={t} value={t}>TINGKAT {t}</option>
                ))}
              </select>
            </div>
            
            {historySearchTerm && (
              <button onClick={() => setHistorySearchTerm('')} className="px-6 py-5 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                <X size={16}/> RESET
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publishedReports.map(req => {
              const sn = req.studentsattended?.[0] || 'SISWA';
              const scoresObj = req.studentscores || {};
              const studentScores = scoresObj[sn] || [];
              const avg = studentScores.length > 0 ? Math.round(studentScores.reduce((a: number, b: number) => a + b, 0) / studentScores.length) : 0;
              const isPass = avg >= 75;
              const isReadyToSend = req.status === 'REPORT_PROCESSING';
              const periode = req.periode || 1;
              
              return (
                <div id={`history-card-${req.id}`} key={req.id} className="bg-white rounded-[4rem] p-10 shadow-2xl border-2 border-slate-100 hover:scale-[1.02] transition-all space-y-8 flex flex-col">
                   
                   <div className="flex justify-between items-start mb-10">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner shrink-0 ${isPass ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{isPass ? <BadgeCheck size={40}/> : <AlertCircle size={40}/>}</div>
                      <div className="flex flex-col items-end gap-2">
                         <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center ${isPass ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'}`}>{isPass ? 'LULUS' : 'REMEDIAL'}</span>
                         {isReadyToSend && <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest animate-pulse italic">SIAP DIKIRIM ✨</span>}
                      </div>
                   </div>
                   <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-1 truncate">{sName}</h4>
                   <p className="text-[11px] font-bold text-blue-600 uppercase mb-10 leading-relaxed">{req.classname}</p>
                   
                   {/* ✅ INFO BOX DENGAN PERIODE DI TENGAH */}
                   <div className="bg-slate-50 p-8 rounded-[2.5rem] mb-10">
                      <div className="grid grid-cols-3 gap-4 items-center">
                         {/* NILAI */}
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rerata</p>
                            <p className={`text-3xl font-black italic ${isPass ? 'text-emerald-600' : 'text-orange-600'}`}>{avg}</p>
                         </div>
                         
                          {/* ✅ TINGKAT DI TENGAH */}
                          <div className="text-center border-x-2 border-slate-200 px-2">
                             <p className="text-[8px] font-black text-purple-600 uppercase tracking-wider mb-1">Tingkat</p>
                             <p className="text-2xl font-black text-purple-600 italic">{periode}</p>
                             <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">
                                Sesi {((periode - 1) * 6 + 1)}-{(periode * 6)}
                             </p>
                          </div>
                         
                         {/* TANGGAL */}
                         <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{isReadyToSend ? 'Selesai' : 'Terkirim'}</p>
                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-normal">{formatDateToDMY(req.date)}</p>
                         </div>
                      </div>
                   </div>
                   
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
      studentName={req.studentsattended?.[0] || 'SISWA'} 
    />
 ))}
</div>

    {showMilestoneFor && (
      <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
         <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative overflow-hidden space-y-10 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
            <button onClick={() => setShowMilestoneFor(null)} className="absolute top-10 right-10 p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
            <div className="flex items-center gap-6"><div className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-3"><History size={32} /></div><div><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Milestone Belajar</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{showMilestoneFor.studentsattended?.[0]}</p></div></div>
            <MilestoneView 
              studentAttendanceLogs={studentAttendanceLogs} 
              studentName={showMilestoneFor.studentsattended?.[0] || ''} 
              packageId={showMilestoneFor.packageId}
              periode={showMilestoneFor.periode || 1}
            />
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
