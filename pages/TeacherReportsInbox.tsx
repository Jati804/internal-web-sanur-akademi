import React, { useState, useMemo, useEffect } from 'react';
import { User, Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import ReportTemplate, { formatDateToDMY } from '../ReportTemplate.tsx';
import { 
  GraduationCap, Search, X, Loader2, Check, Sparkles,
  History, Trophy, Edit3, CheckCircle2, UserCheck, Layout, BookOpen, Printer,
  Quote, BadgeCheck, ClipboardList, Star, Calendar, Clock, AlertCircle, Trash2,
  FileEdit, ChevronRight, Zap, Info, Send, SendHorizonal, Save, AlertTriangle, FileDown, FileCheck,
  Filter, Layers // ✅ TAMBAH INI
} from 'lucide-react';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface TeacherReportsInboxProps {
  user: User;
  logs: Attendance[];
  studentAttendanceLogs: any[];
  studentAccounts: User[];
  refreshAllData: () => Promise<void>;
}

const MilestoneView = ({ studentAttendanceLogs, studentName, packageId, periode }: { studentAttendanceLogs: any[], studentName: string, packageId: string, periode: number }) => {
  const sNameNorm = studentName.toUpperCase().trim();
  const pkgIdNorm = packageId.toUpperCase().trim();

  // Hitung range sesi berdasarkan periode
  const startSession = (periode - 1) * 6 + 1;
  const endSession = periode * 6;
  const sessionNumbers = Array.from({ length: 6 }, (_, i) => startSession + i);

  const sortedLogs = [...(studentAttendanceLogs || [])]
    .filter(l => 
      (l.packageid || '').toUpperCase().trim() === pkgIdNorm && 
      (l.studentname || '').toUpperCase().trim() === sNameNorm
    )
    .sort((a,b) => (a.sessionnumber || 0) - (b.sessionnumber || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-slate-400 border-b border-slate-100 pb-2">
        <ClipboardList size={16} />
        <p className="text-[10px] font-black uppercase tracking-widest">Milestone Pembelajaran Siswa - Periode {periode}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {sessionNumbers.map(num => {
          const log = sortedLogs.find(l => l.sessionnumber === num);
          return (
            <div key={num} className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${log ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-transparent opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic text-[10px] ${log ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>{num < 10 ? `0${num}` : num}</div>
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
  
  // ✅ TAMBAH STATE PERIODE
  const [selectedPeriode, setSelectedPeriode] = useState(1);
  
  const [reportForm, setReportForm] = useState({ sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: '', score: 90 })), narrative: '' });
  
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  
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

  useEffect(() => {
    const hasModal = !!(
      activeDownloadId || 
      showMilestoneFor || 
      confirmReject
    );
    
    if (hasModal) {
      const timer = setTimeout(() => {
        const modalElement = document.querySelector('[data-modal-container]');
        if (modalElement) {
          modalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [activeDownloadId, showMilestoneFor, confirmReject]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => l.status === 'PENDING_REPORT_ASSIGNMENT' && l.selectedTeacherId === user.id);
  }, [logs, user.id]);

  const publishedReports = useMemo(() => {
    const published = logs.filter(l => (l.status === 'REPORT_READY' || l.status === 'REPORT_SENT') && l.selectedTeacherId === user.id);
    if (historySearchTerm.trim() === '') return published;
    const term = historySearchTerm.toLowerCase();
    return published.filter(r => {
      const sName = (r.studentsAttended?.[0] || '').toLowerCase();
      const cName = (r.className || '').toLowerCase();
      return sName.includes(term) || cName.includes(term);
    });
  }, [logs, user.id, historySearchTerm]);

  const handleOpenWorkspace = (pkg: any, isEdit = false) => {
    setSelectedPackage(pkg);
    setIsEditMode(isEdit);
    setShowErrors(false);
    
    // ✅ LOAD PERIODE DARI DATABASE JIKA ADA
    const savedPeriode = pkg.periode || 1;
    setSelectedPeriode(savedPeriode);

    if (isEdit && pkg.studentTopics && pkg.studentScores && pkg.studentNarratives) {
      const studentKey = pkg.studentsAttended?.[0] || '';
      const topicsData = pkg.studentTopics?.[studentKey] || [];
      const scoresData = pkg.studentScores?.[studentKey] || [];
      const narrative = pkg.studentNarratives?.[studentKey] || pkg.reportNarrative || '';

      setReportForm({
        sessions: Array.from({ length: 6 }, (_, i) => ({
          num: i + 1,
          material: topicsData[i] || '',
          score: scoresData[i] || 90
        })),
        narrative
      });
    } else {
      setReportForm({
        sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: '', score: 90 })),
        narrative: ''
      });
    }
    setActiveStep('WORKSPACE');
  };

  const handleBack = () => {
    setSelectedPackage(null);
    setActiveStep('ANTREAN');
    setReportForm({ sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: '', score: 90 })), narrative: '' });
    setIsEditMode(false);
    setShowErrors(false);
    setSelectedPeriode(1); // ✅ RESET PERIODE
  };

  const handleSaveReport = async () => {
    const hasEmptyFields = reportForm.sessions.some(s => !s.material.trim()) || !reportForm.narrative.trim();
    if (hasEmptyFields) {
      setShowErrors(true);
      return;
    }

    setActionLoadingId(selectedPackage.id);
    try {
      const studentName = selectedPackage.studentsAttended?.[0] || '';
      const topics = reportForm.sessions.map(s => s.material);
      const scores = reportForm.sessions.map(s => s.score);

      const { error } = await supabase
        .from('attendance')
        .update({ 
          status: 'REPORT_READY',
          studentTopics: { [studentName]: topics },
          studentScores: { [studentName]: scores },
          studentNarratives: { [studentName]: reportForm.narrative },
          periode: selectedPeriode // ✅ SIMPAN PERIODE KE DATABASE
        })
        .eq('id', selectedPackage.id);

      if (error) throw error;

      await refreshAllData();
      setLastActionedId(selectedPackage.id);
      setSelectedPackage(null);
      setActiveStep('HISTORY');
      setReportForm({ sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: '', score: 90 })), narrative: '' });
      setIsEditMode(false);
      setShowErrors(false);
      setSelectedPeriode(1); // ✅ RESET PERIODE
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan rapot.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!confirmReject) return;
    setActionLoadingId(confirmReject.id);
    try {
      const { error } = await supabase.from('attendance').delete().eq('id', confirmReject.id);
      if (error) throw error;
      await refreshAllData();
      setConfirmReject(null);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menolak permintaan.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendReportToStudent = async (reportLog: any) => {
    setActionLoadingId(reportLog.id);
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ status: 'REPORT_SENT', date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()) })
        .eq('id', reportLog.id);
      if (error) throw error;
      await refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengirim rapot.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadPDF = async (reportLog: any) => {
    setActiveDownloadId(reportLog.id);
    setDownloadProgress(0);
    try {
      const certElement = document.getElementById(`cert-render-${reportLog.id}`);
      const transcriptElement = document.getElementById(`transcript-render-${reportLog.id}`);
      const milestoneElement = document.getElementById(`milestone-render-${reportLog.id}`);

      if (!certElement || !transcriptElement || !milestoneElement) {
        throw new Error('Template tidak ditemukan di DOM');
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [794, 1123] });

      setDownloadProgress(25);
      const certCanvas = await html2canvas(certElement, { scale: 2, useCORS: true, logging: false });
      pdf.addImage(certCanvas.toDataURL('image/png'), 'PNG', 0, 0, 794, 1123);

      setDownloadProgress(50);
      pdf.addPage([794, 1123]);
      const transcriptCanvas = await html2canvas(transcriptElement, { scale: 2, useCORS: true, logging: false });
      pdf.addImage(transcriptCanvas.toDataURL('image/png'), 'PNG', 0, 0, 794, 1123);

      setDownloadProgress(75);
      pdf.addPage([794, 1123]);
      const milestoneCanvas = await html2canvas(milestoneElement, { scale: 2, useCORS: true, logging: false });
      pdf.addImage(milestoneCanvas.toDataURL('image/png'), 'PNG', 0, 0, 794, 1123);

      setDownloadProgress(95);
      const sName = reportLog.studentsAttended?.[0] || 'SISWA';
      const fileName = `RAPOT_${sName.toUpperCase()}_${reportLog.className?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      pdf.save(fileName);

      setDownloadProgress(100);
      setTimeout(() => {
        setActiveDownloadId(null);
        setDownloadProgress(0);
      }, 800);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengunduh PDF.');
      setActiveDownloadId(null);
      setDownloadProgress(0);
    }
  };

  return (
    <>
    <style>{`
      @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes modalZoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    `}</style>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="bg-white p-10 md:p-14 rounded-[4rem] shadow-2xl border-2 border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 opacity-5 rounded-full blur-3xl -mr-48 -mt-48"></div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-6">
              <GraduationCap size={40}/>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-800 uppercase italic leading-none">Ruang Guru</h1>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mt-1">Kelola Rapot & Sertifikat ✨</p>
            </div>
          </div>
          
          <div className="flex gap-3 relative z-10">
            <button onClick={() => setActiveStep('ANTREAN')} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-md ${activeStep === 'ANTREAN' ? 'bg-blue-600 text-white scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
              ANTREAN ({filteredLogs.length})
            </button>
            <button onClick={() => setActiveStep('HISTORY')} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-md ${activeStep === 'HISTORY' ? 'bg-emerald-600 text-white scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
              HISTORI ({publishedReports.length})
            </button>
          </div>
        </div>

        {activeStep === 'ANTREAN' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredLogs.map((req, i) => {
              const studentName = req.studentsAttended?.[0] || 'SISWA';
              return (
                <div key={i} className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-100 hover:border-blue-500 hover:shadow-2xl transition-all flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg mb-6 rotate-3 relative z-10">
                    <Trophy size={28}/>
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-1 truncate relative z-10">{studentName}</h4>
                  <p className="text-[11px] font-bold text-blue-600 uppercase mb-8 Kalimat leading-relaxed relative z-10">{req.className}</p>
                  <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 relative z-10">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal Ajuan</p>
                    <p className="text-[12px] font-black text-slate-800 uppercase">{formatDateToDMY(req.date)}</p>
                  </div>
                  <div className="flex gap-3 mt-auto relative z-10">
                    <button onClick={() => setShowMilestoneFor(req)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                      <History size={16}/> LIHAT
                    </button>
                    <button onClick={() => handleOpenWorkspace(req)} className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-xl">
                      <Edit3 size={16}/> KERJAKAN
                    </button>
                  </div>
                  <button onClick={() => setConfirmReject(req)} className="mt-3 py-3 bg-rose-50 text-rose-500 rounded-xl font-black text-[8px] uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 relative z-10">
                    <X size={14}/> TOLAK
                  </button>
                </div>
              );
            })}
            {filteredLogs.length === 0 && (
              <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30">
                <ClipboardList size={64} className="mx-auto mb-6 text-slate-300" />
                <p className="font-black text-[11px] uppercase tracking-[0.4em] italic leading-relaxed text-center">Tidak ada permintaan rapot. ✨</p>
              </div>
            )}
          </div>
        )}

      {activeStep === 'WORKSPACE' && selectedPackage && (
         <div className="bg-white p-10 md:p-16 rounded-[4rem] shadow-2xl border-2 border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-600 opacity-5 rounded-full blur-3xl -ml-48 -mt-48"></div>
            
            <button onClick={handleBack} className="mb-10 px-6 py-3 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-slate-100 transition-all shadow-sm relative z-10">
              <X size={16}/> KEMBALI
            </button>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-6">
                  <FileEdit size={32}/>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 uppercase italic leading-none">{selectedPackage.studentsAttended?.[0]}</h3>
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mt-1 Kalimat">{selectedPackage.className}</p>
                </div>
              </div>
              
              {/* ✅ DROPDOWN PERIODE */}
              <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-[2rem] border-2 border-blue-100 shadow-lg">
                <div className="flex items-center gap-2">
                  <Layers size={20} className="text-blue-600" />
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Periode:</label>
                </div>
                <select 
                  value={selectedPeriode} 
                  onChange={(e) => setSelectedPeriode(Number(e.target.value))}
                  className="px-6 py-3 bg-white rounded-xl font-black text-[11px] uppercase text-slate-800 border-2 border-blue-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>
                      PERIODE {num} (Sesi {(num - 1) * 6 + 1}-{num * 6})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <section>
                 <div className="flex items-center gap-3 text-emerald-600 border-b-2 border-emerald-50 pb-3 mb-8">
                    <BookOpen size={22}/>
                    <h4 className="text-[13px] font-black uppercase tracking-[0.3em]">Input Materi & Nilai - Periode {selectedPeriode}</h4>
                 </div>
                 <div className="space-y-6">
                    {reportForm.sessions.map((session, i) => {
                      const actualSessionNum = (selectedPeriode - 1) * 6 + session.num;
                      return (
                        <div key={i} className={`p-8 rounded-[2.5rem] border-2 transition-all ${showErrors && !session.material.trim() ? 'bg-rose-50 border-rose-200 animate-pulse' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-[11px] shadow-md">
                              {actualSessionNum < 10 ? `0${actualSessionNum}` : actualSessionNum}
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesi {actualSessionNum}</p>
                          </div>
                          <div className="grid md:grid-cols-[1fr,180px] gap-4">
                            <div>
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Materi Pembelajaran</label>
                              <input type="text" value={session.material} onChange={e => setReportForm(prev => ({ ...prev, sessions: prev.sessions.map((s, idx) => idx === i ? { ...s, material: e.target.value } : s) }))} placeholder="Contoh: Pengenalan Interface & Toolbar" className="w-full px-6 py-4 bg-white rounded-2xl font-bold text-[11px] outline-none border-2 border-slate-100 focus:border-emerald-500 shadow-inner transition-all" />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Nilai (0-100)</label>
                              <input type="number" min="0" max="100" value={session.score} onChange={e => setReportForm(prev => ({ ...prev, sessions: prev.sessions.map((s, idx) => idx === i ? { ...s, score: Math.min(100, Math.max(0, Number(e.target.value))) } : s) }))} className="w-full px-6 py-4 bg-white rounded-2xl font-black text-[13px] text-center outline-none border-2 border-slate-100 focus:border-emerald-500 shadow-inner transition-all" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </section>

              <section>
                 <div className="flex items-center gap-3 text-blue-600 border-b-2 border-blue-50 pb-3 mb-8">
                    <Quote size={22}/>
                    <h4 className="text-[13px] font-black uppercase tracking-[0.3em]">Ulasan Pengajar</h4>
                 </div>
                 <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${showErrors && !reportForm.narrative.trim() ? 'bg-rose-50 border-rose-200 animate-pulse' : 'bg-slate-50 border-slate-100'}`}>
                    <textarea value={reportForm.narrative} onChange={e => setReportForm(prev => ({ ...prev, narrative: e.target.value }))} placeholder="Tulis ulasan singkat tentang perkembangan dan pencapaian siswa selama program berlangsung..." rows={6} className="w-full px-6 py-5 bg-white rounded-2xl font-bold text-[11px] outline-none border-2 border-slate-100 focus:border-blue-500 shadow-inner resize-none leading-relaxed transition-all" />
                 </div>
              </section>

              {showErrors && (
                 <div className="p-8 bg-rose-50 border-2 border-rose-200 rounded-[2.5rem] flex items-start gap-4 animate-pulse">
                    <AlertTriangle size={24} className="text-rose-600 shrink-0 mt-1"/>
                    <div>
                       <p className="text-[11px] font-black text-rose-800 uppercase leading-relaxed">Ada field yang masih kosong! Pastikan semua materi pembelajaran dan ulasan pengajar sudah terisi.</p>
                    </div>
                 </div>
              )}

              <section className="flex gap-4">
                 <button onClick={handleBack} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-100 transition-all shadow-md">
                    BATAL
                 </button>
                 <button onClick={handleSaveReport} disabled={!!actionLoadingId} className="flex-[2] py-6 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-100 hover:shadow-emerald-200 transition-all flex items-center justify-center gap-3 group disabled:opacity-50">
                    {actionLoadingId ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} className="group-hover:scale-110 transition-transform"/> {isEditMode ? 'PERBARUI' : 'SIMPAN'} RAPOT ✨</>}
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

      <div className="fixed left-[-9999px] top-0 pointer-events-none">
   {publishedReports.map((req) => (
      <ReportTemplate 
        key={req.id} 
        reportLog={req} 
        allLogs={logs}
        studentAttendanceLogs={studentAttendanceLogs}
        studentName={req.studentsAttended?.[0] || 'SISWA'} 
      />
   ))}
</div>

      {showMilestoneFor && (
        <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative overflow-hidden space-y-10 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setShowMilestoneFor(null)} className="absolute top-10 right-10 p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
              <div className="flex items-center gap-6"><div className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-3"><History size={32} /></div><div><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Milestone Belajar</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{showMilestoneFor.studentsAttended?.[0]}</p></div></div>
              <MilestoneView 
                studentAttendanceLogs={studentAttendanceLogs} 
                studentName={showMilestoneFor.studentsAttended?.[0] || ''} 
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
    </div>
    </>
  );
};

export default TeacherReportsInbox;
