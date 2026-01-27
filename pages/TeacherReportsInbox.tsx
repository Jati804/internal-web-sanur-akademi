import React, { useState, useMemo, useEffect } from 'react';
import { User, Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import ReportTemplate, { formatDateToDMY } from '../ReportTemplate.tsx';
import { 
  GraduationCap, Search, X, Loader2, Check, Sparkles,
  History, Trophy, Edit3, CheckCircle2, UserCheck, Layout, BookOpen, Printer,
  Quote, BadgeCheck, ClipboardList, Star, Calendar, Clock, AlertCircle, Trash2,
  FileEdit, ChevronRight, Zap, Info, Send, SendHorizonal, Save, AlertTriangle, FileDown, FileCheck,
  Filter
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

const MilestoneView = ({ studentAttendanceLogs, studentName, packageId, periode = 1 }: { studentAttendanceLogs: any[], studentName: string, packageId: string, periode?: number }) => {
  const sNameNorm = studentName.toUpperCase().trim();
  const pkgIdNorm = packageId.toUpperCase().trim();

  // ✅ HITUNG SESSION NUMBERS BERDASARKAN PERIODE
  const startSession = (periode - 1) * 6 + 1;
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
        {sessionNumbers.map(sessionNum => {
          const log = sortedLogs.find(l => l.sessionnumber === sessionNum);
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
  const [reportForm, setReportForm] = useState({ sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: '', score: 90 })), narrative: '' });
  
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedPeriode, setSelectedPeriode] = useState(1); // ✅ STATE PERIODE
  
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

  // ✅ FILTER YANG BENAR - ANTREAN HANYA YANG BELUM DIKERJAKAN
  const pendingRequests = logs.filter(l => 
    l.teacherName === user.fullName &&
    l.status === 'REPORTED' // ✅ HANYA STATUS REPORTED
  );

  // ✅ WORKSPACE - YANG SEDANG DIKERJAKAN (REPORT_READY)
  const workspaceReports = logs.filter(l => 
    l.teacherName === user.fullName &&
    l.status === 'REPORT_READY' // ✅ YANG BELUM PUBLISHED
  );

  // ✅ HISTORY - YANG SUDAH SELESAI (PUBLISHED)
  const publishedReports = useMemo(() => {
    return logs
      .filter(l => 
        l.teacherName === user.fullName &&
        l.status === 'PUBLISHED' // ✅ HANYA YANG SUDAH PUBLISHED
      )
      .filter(r => {
        const yearMatch = r.date?.startsWith(selectedYear);
        const searchTerm = historySearchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
          (r.studentsAttended?.[0]?.toLowerCase().includes(searchTerm)) ||
          (r.className?.toLowerCase().includes(searchTerm));
        return yearMatch && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, user.fullName, selectedYear, historySearchTerm]);

  const handleRejectRequest = async () => {
    if (!confirmReject) return;
    
    setActionLoadingId(confirmReject.id);
    try {
      const { error } = await supabase
        .from('reportrequests')
        .update({ status: 'OPEN', teacherName: null })
        .eq('id', confirmReject.id);
        
      if (error) throw error;
      
      await refreshAllData();
      setConfirmReject(null);
    } catch (e) {
      console.error('Reject error:', e);
      alert('Gagal menolak permintaan');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (log: any) => {
    setActionLoadingId(log.id);
    try {
      const { error } = await supabase
        .from('reportrequests')
        .update({ status: 'ACCEPTED' })
        .eq('id', log.id);
        
      if (error) throw error;
      
      await refreshAllData();
      handleOpenWorkspace(log, false);
    } catch (e) {
      console.error('Accept error:', e);
      alert('Gagal menerima permintaan');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenWorkspace = (pkg: any, isEditMode: boolean) => {
    setSelectedPackage(pkg);
    setIsEditMode(isEditMode);
    
    // ✅ SET PERIODE DARI DATABASE
    const periode = pkg.periode || 1;
    setSelectedPeriode(periode);
    
    // ✅ HITUNG SESSION NUMBERS BERDASARKAN PERIODE
    const startSession = (periode - 1) * 6 + 1;
    
    if (isEditMode && pkg.studentTopics && pkg.studentScores) {
      const getDirectValue = (dataObj: any, defaultValue: any) => {
        if (!dataObj || typeof dataObj !== 'object') return defaultValue;
        const keys = Object.keys(dataObj);
        if (keys.length === 0) return defaultValue;
        return dataObj[keys[0]] || defaultValue;
      };
      
      const rawTopics = getDirectValue(pkg.studentTopics, Array(6).fill(''));
      const rawScores = getDirectValue(pkg.studentScores, Array(6).fill(90));
      const topics = Array.isArray(rawTopics) ? rawTopics : Array(6).fill('');
      const scores = Array.isArray(rawScores) ? rawScores : Array(6).fill(90);
      
      // ✅ UPDATE SESSION NUMBERS SESUAI PERIODE
      setReportForm({
        sessions: scores.map((score, i) => ({
          num: startSession + i, // ✅ DINAMIS SESUAI PERIODE
          material: topics[i] || '',
          score: score || 90
        })),
        narrative: pkg.reportNarrative || ''
      });
    } else {
      // ✅ RESET FORM DENGAN SESSION NUMBERS YANG BENAR
      setReportForm({
        sessions: Array.from({ length: 6 }, (_, i) => ({
          num: startSession + i, // ✅ DINAMIS SESUAI PERIODE
          material: '',
          score: 90
        })),
        narrative: ''
      });
    }
    
    setShowErrors(false);
    setActiveStep('WORKSPACE');
  };

  const handleSaveReport = async () => {
    const hasEmptyMaterial = reportForm.sessions.some(s => !s.material.trim());
    const hasEmptyNarrative = !reportForm.narrative.trim();
    
    if (hasEmptyMaterial || hasEmptyNarrative) {
      setShowErrors(true);
      return;
    }
    
    if (!selectedPackage) return;
    
    setActionLoadingId(selectedPackage.id);
    try {
      const teacherKey = selectedPackage.teacherName || user.fullName;
      
      const { error } = await supabase
        .from('reportrequests')
        .update({ 
          studentTopics: { [teacherKey]: reportForm.sessions.map(s => s.material) },
          studentScores: { [teacherKey]: reportForm.sessions.map(s => s.score) },
          reportNarrative: reportForm.narrative,
          status: 'REPORT_READY',
          periode: selectedPeriode // ✅ SIMPAN PERIODE
        })
        .eq('id', selectedPackage.id);
        
      if (error) throw error;
      
      await refreshAllData();
      setLastActionedId(selectedPackage.id);
      setSelectedPackage(null);
      setActiveStep('HISTORY');
    } catch (e) {
      console.error('Save error:', e);
      alert('Gagal menyimpan rapot');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendReportToStudent = async (log: any) => {
    setActionLoadingId(log.id);
    try {
      const { error } = await supabase
        .from('reportrequests')
        .update({ status: 'PUBLISHED' })
        .eq('id', log.id);
        
      if (error) throw error;
      
      await refreshAllData();
      setLastActionedId(log.id);
    } catch (e) {
      console.error('Send error:', e);
      alert('Gagal mengirim rapot');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadPDF = async (reportLog: any) => {
    setActiveDownloadId(reportLog.id);
    setDownloadProgress(0);

    try {
      const containerElement = document.getElementById(`report-pabrik-${reportLog.id}`);
      if (!containerElement) throw new Error("Container not found");

      const pages = [
        { id: `cert-render-${reportLog.id}`, w: 1123, h: 794 },
        { id: `transcript-render-${reportLog.id}`, w: 794, h: 1123 },
        { id: `milestone-render-${reportLog.id}`, w: 794, h: 1123 }
      ];

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1123, 794] });
      let isFirstPage = true;

      for (const page of pages) {
        const element = document.getElementById(page.id);
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');

        if (!isFirstPage) {
          pdf.addPage([page.w, page.h], page.w > page.h ? 'landscape' : 'portrait');
        }
        isFirstPage = false;

        pdf.addImage(imgData, 'PNG', 0, 0, page.w, page.h, '', 'FAST');
      }

      const studentName = reportLog.studentsAttended?.[0] || 'Student';
      const fileName = `RAPOT_${studentName.replace(/\s+/g, '_')}_${reportLog.date}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Gagal membuat PDF');
    } finally {
      setActiveDownloadId(null);
      setDownloadProgress(0);
    }
  };

  // ✅ HANDLER UNTUK GANTI PERIODE
  const handlePeriodeChange = (newPeriode: number) => {
    setSelectedPeriode(newPeriode);
    
    // ✅ UPDATE SESSION NUMBERS
    const startSession = (newPeriode - 1) * 6 + 1;
    setReportForm(prev => ({
      ...prev,
      sessions: prev.sessions.map((s, i) => ({
        ...s,
        num: startSession + i
      }))
    }));
  };

  console.log('📊 DEBUG PUBLISHED REPORTS - START', {
    totalLogs: logs.length,
    teacherName: user.fullName,
    allStatuses: [...new Set(logs.map(l => l.status))],
  });

  publishedReports.forEach((req, i) => {
    const rawScores = req.studentScores?.[req.teacherName || user.fullName];
    console.log(`REPORT ${i + 1}:`, {
      id: req.id,
      studentName: req.studentsAttended?.[0],
      periode: req.periode,
      status: req.status,
      rawScores,
      studentTopics: req.studentTopics?.[req.teacherName || user.fullName]
    });
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 p-6 md:p-12 font-sans">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-14">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-200 rotate-3">
                <GraduationCap size={44} />
              </div>
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-800 uppercase italic leading-none mb-2">
                  Rapot <span className="text-blue-600">Siswa</span>
                </h2>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Panel Pengajar Sanur</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {(['ANTREAN', 'WORKSPACE', 'HISTORY'] as const).map(step => (
              <button
                key={step}
                onClick={() => setActiveStep(step)}
                className={`px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-lg flex items-center gap-3 ${
                  activeStep === step
                    ? 'bg-slate-900 text-white scale-105 shadow-2xl shadow-slate-200'
                    : 'bg-white text-slate-300 hover:text-blue-600 hover:border-blue-600'
                }`}
              >
                {step === 'ANTREAN' && <Star className={activeStep === step ? 'animate-spin' : ''} size={18} />}
                {step === 'WORKSPACE' && <Edit3 size={18} />}
                {step === 'HISTORY' && <History size={18} />}
                {step}
                {step === 'ANTREAN' && pendingRequests.length > 0 && (
                  <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[9px] font-black animate-pulse">{pendingRequests.length}</span>
                )}
                {step === 'WORKSPACE' && workspaceReports.length > 0 && (
                  <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black">{workspaceReports.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeStep === 'ANTREAN' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {pendingRequests.map((req, i) => {
              const sName = req.studentsAttended?.[0] || 'Siswa';
              const matchedStudent = studentAccounts.find(s => s.fullName === sName);
              const avatarUrl = matchedStudent?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sName}`;
              
              return (
                <div key={i} className="bg-white p-10 md:p-12 rounded-[4rem] shadow-xl border-2 border-slate-100 hover:border-blue-500 transition-all flex flex-col">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-5">
                      <img src={avatarUrl} className="w-16 h-16 rounded-[1.5rem] shadow-lg border-4 border-slate-50"/>
                      <div>
                        <h4 className="text-xl font-black text-slate-800 uppercase italic leading-none">{sName}</h4>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mt-1">{req.className}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-[2.5rem] mb-8 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Package ID</p>
                      <p className="text-[10px] font-black text-slate-800 uppercase">{req.packageId}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Permintaan</p>
                      <p className="text-[10px] font-black text-slate-800 uppercase">{formatDateToDMY(req.date)}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto">
                    <button 
                      onClick={() => handleAcceptRequest(req)}
                      disabled={!!actionLoadingId}
                      className="flex-1 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      {actionLoadingId === req.id ? <Loader2 className="animate-spin" size={18}/> : <><Check size={18}/> TERIMA</>}
                    </button>
                    <button 
                      onClick={() => setConfirmReject(req)}
                      className="px-6 py-5 bg-rose-50 text-rose-600 rounded-[2rem] font-black hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                    >
                      <X size={18}/>
                    </button>
                  </div>
                </div>
              );
            })}
            {pendingRequests.length === 0 && (
              <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30">
                <Star size={64} className="mx-auto mb-6 text-slate-300" />
                <p className="font-black text-[11px] uppercase tracking-[0.4em] italic text-slate-300">Tidak ada permintaan baru. ✨</p>
              </div>
            )}
          </div>
        )}

        {activeStep === 'WORKSPACE' && selectedPackage && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-[4rem] shadow-2xl border-2 border-slate-100 p-12 md:p-16 space-y-12">
              
              {/* ✅ HEADER DENGAN INFO PERIODE */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-10 border-b-2 border-slate-100">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 uppercase italic mb-2">{selectedPackage.studentsAttended?.[0]}</h3>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedPackage.className}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Package: {selectedPackage.packageId}</p>
                </div>
                
                {/* ✅ DROPDOWN PERIODE */}
                <div className="flex flex-col items-end gap-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pilih Periode</label>
                  <select
                    value={selectedPeriode}
                    onChange={(e) => handlePeriodeChange(Number(e.target.value))}
                    className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-black text-[11px] uppercase cursor-pointer shadow-lg hover:bg-purple-700 transition-all"
                  >
                    {[1, 2, 3, 4, 5, 6].map(p => (
                      <option key={p} value={p}>PERIODE {p}</option>
                    ))}
                  </select>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">
                    SESI {((selectedPeriode - 1) * 6 + 1)} - {(selectedPeriode * 6)}
                  </p>
                </div>
              </div>

              {/* INFO SESI */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-[3rem] border-2 border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="text-purple-600" size={20} />
                  <h4 className="text-[11px] font-black text-purple-800 uppercase tracking-widest">Info Periode</h4>
                </div>
                <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                  Anda sedang mengisi <span className="text-purple-600 font-black">PERIODE {selectedPeriode}</span> dengan sesi {((selectedPeriode - 1) * 6 + 1)} sampai {(selectedPeriode * 6)}. Pastikan materi dan nilai yang diisi sesuai dengan sesi pembelajaran periode ini.
                </p>
              </div>

              {/* SESSION FORMS */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-400 border-b border-slate-100 pb-3">
                  <BookOpen size={18}/>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em]">Materi & Nilai Per Sesi</h4>
                </div>

                {reportForm.sessions.map((session, idx) => (
                  <div key={idx} className="bg-slate-50 p-8 rounded-[2.5rem] space-y-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl flex items-center justify-center font-black text-[12px] italic shadow-lg">
                        {session.num < 10 ? `0${session.num}` : session.num}
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SESI {session.num}</p>
                    </div>
                    
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Materi Pembelajaran</label>
                      <input
                        type="text"
                        placeholder="Contoh: Pengenalan Interface Microsoft Word"
                        value={session.material}
                        onChange={(e) => {
                          const newSessions = [...reportForm.sessions];
                          newSessions[idx].material = e.target.value;
                          setReportForm({ ...reportForm, sessions: newSessions });
                        }}
                        className={`w-full px-6 py-4 rounded-2xl border-2 font-bold text-[11px] uppercase ${showErrors && !session.material.trim() ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white'}`}
                      />
                      {showErrors && !session.material.trim() && (
                        <p className="text-[9px] font-bold text-rose-600 mt-2 flex items-center gap-2"><AlertTriangle size={12}/> Materi wajib diisi</p>
                      )}
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Nilai (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={session.score}
                        onChange={(e) => {
                          const newSessions = [...reportForm.sessions];
                          newSessions[idx].score = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                          setReportForm({ ...reportForm, sessions: newSessions });
                        }}
                        className="w-full px-6 py-4 rounded-2xl border-2 border-slate-200 bg-white font-black text-[14px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* NARRATIVE */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-400 border-b border-slate-100 pb-3">
                  <Quote size={18}/>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em]">Ulasan Pengajar</h4>
                </div>
                <textarea
                  placeholder="Tuliskan ulasan Anda tentang performa siswa selama pembelajaran..."
                  value={reportForm.narrative}
                  onChange={(e) => setReportForm({ ...reportForm, narrative: e.target.value })}
                  rows={6}
                  className={`w-full px-8 py-6 rounded-[2.5rem] border-2 font-serif italic text-[13px] leading-relaxed ${showErrors && !reportForm.narrative.trim() ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white'}`}
                />
                {showErrors && !reportForm.narrative.trim() && (
                  <p className="text-[9px] font-bold text-rose-600 flex items-center gap-2"><AlertTriangle size={12}/> Ulasan wajib diisi</p>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-4 pt-8">
                <button
                  onClick={() => {
                    setSelectedPackage(null);
                    setActiveStep('ANTREAN');
                  }}
                  className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-200 transition-all"
                >
                  BATAL
                </button>
                <button
                  onClick={handleSaveReport}
                  disabled={!!actionLoadingId}
                  className="flex-1 py-6 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-emerald-100 hover:scale-105 transition-all flex items-center justify-center gap-3 group"
                >
                  {actionLoadingId ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20} className="group-hover:scale-110 transition-transform"/> SIMPAN RAPOT ✨</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeStep === 'WORKSPACE' && !selectedPackage && (
          <div className="max-w-5xl mx-auto py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30">
            <Edit3 size={64} className="mx-auto mb-6 text-slate-300" />
            <p className="font-black text-[11px] uppercase tracking-[0.4em] italic text-slate-300">Pilih rapot dari antrean untuk mulai mengisi. ✨</p>
          </div>
        )}

        {activeStep === 'HISTORY' && (
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                <input
                  type="text"
                  placeholder="Cari nama siswa atau kelas..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 rounded-[2rem] border-2 border-slate-200 font-bold text-[11px] uppercase bg-white"
                />
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-8 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase cursor-pointer shadow-lg"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {publishedReports.map((req, i) => {
               const sName = req.studentsAttended?.[0] || 'Siswa';
               const teacherKey = req.teacherName || user.fullName;
               const rawScores = req.studentScores?.[teacherKey];
               const scores = Array.isArray(rawScores) ? rawScores : (rawScores && typeof rawScores === 'object' ? Object.values(rawScores) : Array(6).fill(0));
               const avg = Math.round(scores.reduce((a:number,b:number)=>a+b,0)/6);
               const isPass = avg >= 80;
               const isReadyToSend = req.status === 'REPORT_READY';
               const isNewlyActioned = req.id === lastActionedId;
               const periode = req.periode || 1;

               return (
                  <div 
                    key={i} 
                    id={`history-card-${req.id}`}
                    className={`bg-white p-12 md:p-14 rounded-[4rem] shadow-xl border-2 transition-all flex flex-col relative ${isNewlyActioned ? 'border-blue-500 shadow-blue-100' : isReadyToSend ? 'border-amber-400 bg-amber-50/10' : 'border-slate-100 hover:border-emerald-500'}`}
                  >
                     <div className="absolute -top-3 -right-3 flex flex-col gap-2 items-end z-20">
                        {isNewlyActioned && (
                           <div className="px-6 py-2 bg-blue-600 text-white rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl animate-bounce">
                              TERBARU ✨
                           </div>
                        )}
                        <div className="px-5 py-2 bg-purple-600 text-white rounded-full font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                           <Calendar size={12} strokeWidth={3} />
                           PERIODE {periode}
                        </div>
                     </div>
                     
                     {/* ✅ KOTAK INFO DENGAN PERIODE DI TENGAH */}
                     <div className="flex justify-between items-start mb-10">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner shrink-0 ${isPass ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{isPass ? <BadgeCheck size={40}/> : <AlertCircle size={40}/>}</div>
                        <div className="flex flex-col items-end gap-2">
                           <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center ${isPass ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'}`}>{isPass ? 'LULUS' : 'REMEDIAL'}</span>
                           {isReadyToSend && <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest animate-pulse italic">SIAP DIKIRIM ✨</span>}
                        </div>
                     </div>
                     
                     <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-1 truncate">{sName}</h4>
                     <p className="text-[11px] font-bold text-blue-600 uppercase mb-10 leading-relaxed">{req.className}</p>
                     
                     {/* ✅ KOTAK DENGAN INFO PERIODE DI TENGAH */}
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] mb-10">
                        <div className="grid grid-cols-3 gap-4 items-center">
                           {/* NILAI */}
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rerata</p>
                              <p className={`text-3xl font-black italic ${isPass ? 'text-emerald-600' : 'text-orange-600'}`}>{avg}</p>
                           </div>
                           
                           {/* ✅ PERIODE DI TENGAH */}
                           <div className="text-center border-x-2 border-slate-200 px-2">
                              <p className="text-[8px] font-black text-purple-600 uppercase tracking-wider mb-1">Periode</p>
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
                              <div className="grid grid-cols-3 gap-3">
                                 <button 
                                    onClick={() => setShowMilestoneFor(req)} 
                                    className="py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                 >
                                    <History size={16}/> MILESTONE
                                 </button>
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

      {/* RENDER PDF HIDDEN */}
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
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-3"><History size={32} /></div>
                 <div>
                    <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Milestone Belajar</h4>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{showMilestoneFor.studentsAttended?.[0]}</p>
                 </div>
              </div>
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
               <div className="space-y-2"><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Tolak Permintaan?</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">Siswa akan diminta memilih pengajar lain untuk klaim rapot mereka.</p></div>
               <div className="flex gap-4"><button onClick={() => setConfirmReject(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button><button onClick={handleRejectRequest} disabled={!!actionLoadingId} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">{actionLoadingId === confirmReject.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18}/>} IYA, TOLAK</button></div>
            </div>
         </div>
      )}
    </div>
  );
};

export default TeacherReportsInbox;
