
import React, { useState, useMemo } from 'react';
import { User, Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  GraduationCap, Search, X, Loader2, Check, Sparkles,
  History, Trophy, Edit3, CheckCircle2, UserCheck, Layout, BookOpen, Printer,
  Quote, BadgeCheck, ClipboardList, Star, Calendar, Clock, AlertCircle, Trash2,
  FileEdit, ChevronRight, Zap, Info
} from 'lucide-react';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface TeacherReportsInboxProps {
  user: User;
  logs: Attendance[];
  studentAccounts: User[];
  refreshAllData: () => Promise<void>;
}

const SESSION_COLORS = ['text-blue-500', 'text-emerald-500', 'text-orange-500', 'text-rose-500', 'text-purple-500', 'text-amber-500'];

const formatDateToDMY = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const MilestoneView = ({ logs, studentName, packageId }: { logs: Attendance[], studentName: string, packageId: string }) => {
  const sNameNorm = studentName.toUpperCase().trim();
  const pkgIdNorm = packageId.toUpperCase().trim();

  const sortedLogs = [...logs]
    .filter(l => 
      l.status === 'SESSION_LOG' && 
      (l.packageId || '').toUpperCase().trim() === pkgIdNorm && 
      l.studentsAttended?.some(s => s.toUpperCase().trim() === sNameNorm)
    )
    .sort((a,b) => (a.sessionNumber || 0) - (b.sessionNumber || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-slate-400 border-b border-slate-100 pb-2">
        <ClipboardList size={16} />
        <p className="text-[10px] font-black uppercase tracking-widest">Milestone Pembelajaran Siswa</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1,2,3,4,5,6].map(num => {
          const log = sortedLogs.find(l => l.sessionNumber === num);
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

const TeacherReportsInbox: React.FC<TeacherReportsInboxProps> = ({ user, logs, studentAccounts, refreshAllData }) => {
  const [activeStep, setActiveStep] = useState<'ANTREAN' | 'WORKSPACE' | 'HISTORY'>('ANTREAN');
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [downloadStep, setDownloadStep] = useState('');
  const [showMilestoneFor, setShowMilestoneFor] = useState<any | null>(null);
  const [confirmReject, setConfirmReject] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [reportForm, setReportForm] = useState({ sessions: Array.from({ length: 6 }, (_, i) => ({ num: i + 1, material: '', score: 90 })), narrative: '' });
  const [loading, setLoading] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const ASSETS = { LOGO: "https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/SANUR%20Logo.png" };

  const reportRequests = useMemo(() => {
    const requests = logs.filter(l => (l.status === 'REPORT_REQUEST' || l.status === 'REPORT_PROCESSING') && l.teacherId === user.id);
    return requests.filter(req => {
        const studentNameInRequest = (req.studentsAttended?.[0] || '').toUpperCase().trim();
        return studentAccounts.some(acc => acc.name.toUpperCase().trim() === studentNameInRequest);
    });
  }, [logs, user.id, studentAccounts]);

  const publishedReports = useMemo(() => {
    const baseReports = logs.filter(l => l.status === 'SESSION_LOG' && l.sessionNumber === 6 && l.teacherId === user.id && (l.reportNarrative || l.studentNarratives?.[l.studentsAttended?.[0] || '']));
    
    const sorted = [...baseReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (!historySearchTerm.trim()) return sorted;

    const term = historySearchTerm.toLowerCase();
    return sorted.filter(req => {
        const sName = (req.studentsAttended?.[0] || '').toLowerCase();
        const cName = (req.className || '').toLowerCase();
        const dateStr = formatDateToDMY(req.date).toLowerCase();
        
        const rawScores = req.studentScores?.[req.studentsAttended?.[0] || ''];
        const scores = (Array.isArray(rawScores) ? rawScores : (typeof rawScores === 'number' ? [rawScores] : Array(6).fill(90))) as number[];
        const avg = Math.round(scores.reduce((a:number,b:number)=>a+b,0)/6);
        const statusText = avg >= 80 ? 'lulus' : 'remedial';

        return sName.includes(term) || 
               cName.includes(term) || 
               avg.toString().includes(term) || 
               statusText.includes(term) ||
               dateStr.includes(term);
    });
  }, [logs, user.id, historySearchTerm]);

  const handleOpenWorkspace = (req: any, isEdit: boolean = false) => {
    setSelectedPackage(req);
    setIsEditMode(isEdit);
    const sName = req.studentsAttended?.[0] || 'SISWA';
    if (isEdit) {
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
    setLoading(true);
    try {
      await supabase.from('attendance').update({ status: 'REPORT_PROCESSING' }).eq('id', req.id);
      await refreshAllData();
      handleOpenWorkspace(req, false);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleRejectRequest = async () => {
    if (!confirmReject) return;
    setLoading(true);
    try {
      await supabase.from('attendance').update({ status: 'REPORT_REJECTED' }).eq('id', confirmReject.id);
      await refreshAllData();
      setConfirmReject(null);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const avgScore = useMemo(() => {
    const total = reportForm.sessions.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
    return Math.round(total / 6);
  }, [reportForm.sessions]);

  const handlePublishReport = async () => {
    if (!reportForm.narrative || reportForm.sessions.some(s => !s.material)) return alert("Lengkapi data materi per sesi Kak! ✨");
    setLoading(true);
    try {
      const sName = selectedPackage.studentsAttended?.[0] || 'SISWA';
      const topics = reportForm.sessions.map(s => (s.material || '').toUpperCase());
      const scores = reportForm.sessions.map(s => Number(s.score) || 0);
      const payload = { status: 'SESSION_LOG', sessionnumber: 6, studenttopics: { [sName]: topics }, studentscores: { [sName]: scores }, studentnarratives: { [sName]: reportForm.narrative }, reportnarrative: reportForm.narrative, date: isEditMode ? selectedPackage.date : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()) };
      await supabase.from('attendance').update(payload).eq('id', selectedPackage.id);
      await refreshAllData();
      setSelectedPackage(null);
      setActiveStep('HISTORY');
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleDownloadPDF = async (req: any) => {
    setActiveDownloadId(req.id);
    setDownloadStep('Menyiapkan Dokumen Sah...');
    
    await new Promise(r => setTimeout(r, 600));
    setDownloadStep('Optimalisasi Visual Sertifikat...');
    await new Promise(r => setTimeout(r, 600));

    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4', hotfixes: ["px_rendering"] });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const captureOptions = { scale: 3, useCORS: true, backgroundColor: '#ffffff', width: 794, height: 1123, logging: false };
      
      const capturePage = async (pageId: string) => {
        const el = document.getElementById(pageId);
        if (!el) return null;
        const canvas = await html2canvas(el, captureOptions);
        return canvas.toDataURL('image/png', 1.0);
      };

      setDownloadStep('Merender Halaman Utama...');
      const img1 = await capturePage(`cert-render-${req.id}`);
      if (img1) pdf.addImage(img1, 'PNG', 0, 0, pw, ph, undefined, 'FAST');
      
      setDownloadStep('Menyusun Transkrip Akademik...');
      pdf.addPage('a4', 'p');
      const img2 = await capturePage(`transcript-render-${req.id}`);
      if (img2) pdf.addImage(img2, 'PNG', 0, 0, pw, ph, undefined, 'FAST');
      
      setDownloadStep('Merekam Milestone Belajar...');
      pdf.addPage('a4', 'p');
      const img3 = await capturePage(`milestone-render-${req.id}`);
      if (img3) pdf.addImage(img3, 'PNG', 0, 0, pw, ph, undefined, 'FAST');
      
      setDownloadStep('Finalisasi File PDF...');
      await new Promise(r => setTimeout(r, 500));
      
      pdf.save(`Rapot_Sanur_${req.studentsAttended?.[0]}.pdf`);
    } catch (e) { alert("Gagal proses PDF."); } finally { setActiveDownloadId(null); setDownloadStep(''); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 px-4 animate-in fade-in duration-700">
      {/* ATMOSPHERIC DOWNLOAD OVERLAY */}
      {activeDownloadId && (
        <div className="fixed inset-0 z-[200000] bg-slate-900/90 backdrop-blur-2xl flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
           <div className="w-32 h-32 bg-white/10 rounded-[3rem] border-2 border-white/20 flex items-center justify-center shadow-2xl mb-10 relative">
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-[3rem] border-t-transparent animate-spin"></div>
              <Printer size={56} className="text-white animate-pulse" />
           </div>
           <div className="text-center space-y-3">
              <p className="text-xl font-black uppercase italic tracking-widest">{downloadStep}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em] animate-pulse italic">SANUR HIGH-FIDELITY RENDER ✨</p>
           </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
        <div className="space-y-4">
           <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Portal <span className="text-orange-600">Rapot</span></h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Terbitkan Sertifikat & Rapot Digital Siswa ✨</p>
        </div>
      </header>

      <div className="bg-orange-50 p-6 rounded-[2.5rem] border border-orange-100 flex items-center gap-4 animate-pulse shadow-sm max-w-2xl mx-auto">
         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm shrink-0"><Info size={20}/></div>
         <p className="text-[10px] font-black text-orange-800 uppercase italic">"Info: Jika rapot siswa sudah keluar, ingatkan mereka segera mengamankan filenya ya Kak! Karena akun akan dihapus pengurus setelah satu tahun lulus untuk meringankan sistem. ✨"</p>
      </div>

      <div className="flex bg-slate-100 p-2 rounded-full w-full max-w-xl mx-auto shadow-inner border border-slate-100">
         <button onClick={() => setActiveStep('ANTREAN')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'ANTREAN' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-400'}`}>Antrean ({reportRequests.length})</button>
         <button onClick={() => setActiveStep('WORKSPACE')} disabled={!selectedPackage} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'WORKSPACE' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 disabled:opacity-30'}`}>Workspace</button>
         <button onClick={() => setActiveStep('HISTORY')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'HISTORY' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Histori</button>
      </div>

      {activeStep === 'HISTORY' && (
         <div className="relative max-w-xl mx-auto mt-8 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-top-4">
            <Search size={22} className="absolute left-8 top-1/2 -translate-y-1/2 text-emerald-500" />
            <input 
              type="text" 
              placeholder="CARI NAMA, MATPEL, NILAI, ATAU STATUS..." 
              value={historySearchTerm} 
              onChange={e => setHistorySearchTerm(e.target.value.toUpperCase())} 
              className="w-full pl-16 pr-8 py-6 bg-white border border-slate-100 rounded-full text-[12px] font-black uppercase outline-none shadow-sm focus:border-emerald-500 transition-all placeholder:text-slate-300" 
            />
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
                    <button onClick={() => handleAcceptRequest(req)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-black">TERIMA & ISI RAPOT ✍️</button>
                    <button onClick={() => setConfirmReject(req)} className="w-full py-5 bg-rose-50 text-rose-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-100">TOLAK PERMINTAAN</button>
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
               <button onClick={() => { setSelectedPackage(null); setIsEditMode(false); setActiveStep('ANTREAN'); }} className="p-4 bg-white/20 rounded-2xl hover:bg-white/40 transition-all"><X/></button>
            </div>
            <div className="p-8 md:p-14 space-y-16">
               <section className="space-y-4">
                  <div className="flex items-center gap-3 text-blue-600"><History size={20} /><h4 className="text-xs font-black uppercase tracking-widest">Langkah Pembelajaran (Milestone)</h4></div>
                  <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100"><MilestoneView logs={logs} studentName={selectedPackage.studentsAttended?.[0] || ''} packageId={selectedPackage.packageId} /></div>
               </section>
               <section className="flex flex-col items-center">
                  <div className="bg-slate-900 p-12 rounded-[4rem] text-white text-center shadow-2xl relative overflow-hidden w-full max-w-lg">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                     <p className="text-[10px] uppercase font-black text-slate-400 mb-2 relative z-10">Skor Rata-Rata Akhir</p>
                     <h4 className="text-8xl font-black italic text-emerald-400 relative z-10">{avgScore}</h4>
                     <p className="text-[11px] font-black uppercase tracking-widest mt-6 text-emerald-500 opacity-60 relative z-10">{avgScore >= 80 ? 'KOMPETENSI: LULUS ✨' : 'KOMPETENSI: REMEDIAL'}</p>
                  </div>
               </section>
               <section className="space-y-6">
                  <div className="flex items-center gap-3 text-blue-600"><BookOpen size={20} /><h4 className="text-xs font-black uppercase tracking-widest">Detail Materi & Nilai Tiap Sesi</h4></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {reportForm.sessions.map((s, i) => (
                        <div key={i} className="flex flex-col gap-4 bg-slate-50 p-8 rounded-[2.5rem] border-2 border-transparent focus-within:border-blue-500 transition-all shadow-inner">
                           <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                              <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 italic shadow-sm shrink-0">0{s.num}</span>
                              <div className="text-right"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Skor Sesi</label><input type="number" value={s.score} onChange={e => { const n = [...reportForm.sessions]; n[i].score = parseInt(e.target.value) || 0; setReportForm({...reportForm, sessions: n}); }} className="w-16 bg-transparent text-right font-black text-blue-600 text-2xl outline-none" /></div>
                           </div>
                           <div className="space-y-2">
                              <div className="flex justify-between items-center ml-2"><label className="text-[8px] font-black text-slate-400 uppercase Kalimat tracking-widest">Materi Pembelajaran</label><span className={`text-[7px] font-black ${s.material.length >= 35 ? 'text-rose-500' : 'text-slate-300'}`}>{s.material.length}/35</span></div>
                              <input type="text" placeholder="MISAL: PENGENALAN TOOLS..." value={s.material} maxLength={35} onChange={e => { const n = [...reportForm.sessions]; n[i].material = e.target.value; setReportForm({...reportForm, sessions: n}); }} className="w-full bg-white px-5 py-3 rounded-xl font-black uppercase text-[10px] outline-none border border-slate-200 focus:border-blue-500 transition-all" />
                           </div>
                        </div>
                     ))}
                  </div>
               </section>
               <section className="space-y-6">
                  <div className="flex items-center gap-3 text-blue-600"><Quote size={20} /><h4 className="text-xs font-black uppercase tracking-widest">Narasi Evaluasi</h4></div>
                  <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner space-y-4">
                     <div className="flex justify-end pr-8 mb-[-2rem] Kalimat relative z-10"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${reportForm.narrative.length >= 200 ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white shadow-md'}`}>{reportForm.narrative.length}/200</span></div>
                     <textarea placeholder="TULISKAN CATATAN PERKEMBANGAN SISWA... ✨" value={reportForm.narrative} maxLength={200} onChange={e => setReportForm({...reportForm, narrative: e.target.value})} rows={6} className="w-full p-10 bg-white rounded-[2rem] font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500 shadow-sm transition-all" />
                  </div>
               </section>
               <section className="pt-10">
                  <button onClick={handlePublishReport} disabled={loading} className="w-full py-10 bg-emerald-600 text-white rounded-[3rem] font-black text-[14px] uppercase tracking-[0.4em] shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-5">
                     {loading ? <Loader2 size={32} className="animate-spin" /> : <><Sparkles size={32} /> {isEditMode ? 'SIMPAN PERUBAHAN ✨' : 'TERBITKAN RAPOT ✨'}</>}
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
               return (
                  <div key={i} className="bg-white p-12 md:p-14 rounded-[4rem] shadow-xl border border-slate-100 flex flex-col hover:border-emerald-500 transition-all">
                     <div className="flex justify-between items-start mb-10">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner shrink-0 ${isPass ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{isPass ? <BadgeCheck size={40}/> : <AlertCircle size={40}/>}</div>
                        <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center ${isPass ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'}`}>{isPass ? 'LULUS' : 'REMEDIAL'}</span>
                     </div>
                     <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-1 truncate">{sName}</h4>
                     <p className="text-[11px] font-bold text-blue-600 uppercase mb-10 Kalimat leading-relaxed">{req.className}</p>
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] mb-10 flex justify-between items-center"><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rerata</p><p className={`text-3xl font-black italic ${isPass ? 'text-emerald-600' : 'text-orange-600'}`}>{avg}</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Terbit</p><p className="text-[11px] font-black text-slate-800 uppercase tracking-normal">{formatDateToDMY(req.date)}</p></div></div>
                     
                     <div className="space-y-4 mt-auto">
                        <button onClick={() => handleOpenWorkspace(req, true)} className="w-full py-5 bg-blue-50 text-blue-600 rounded-[2rem] font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                           <FileEdit size={18}/> EDIT DATA RAPOT
                        </button>
                        <button onClick={() => handleDownloadPDF(req)} disabled={activeDownloadId === req.id} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-xl">
                           {activeDownloadId === req.id ? <Loader2 className="animate-spin" /> : <Printer size={18}/>} CETAK PDF RAPOT
                        </button>
                     </div>
                  </div>
               );
            })}
            {publishedReports.length === 0 && (
               <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30">
                  <History size={64} className="mx-auto mb-6 text-slate-300" />
                  <p className="font-black text-[11px] uppercase tracking-[0.4em] italic leading-relaxed text-center">Belum ada histori rapot{historySearchTerm ? ' yang sesuai' : ''}. ✨</p>
               </div>
            )}
         </div>
      )}

      {/* RENDER PDF HIDDEN (PRECISE A4 - 794x1123) */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
         {publishedReports.map((req) => {
            const sName = (req.studentsAttended?.[0] || 'SISWA').toUpperCase();
            const rawScores = req.studentScores?.[req.studentsAttended?.[0] || ''];
            const scores: number[] = Array.isArray(rawScores) ? rawScores : (typeof rawScores === 'number' ? [rawScores] : Array(6).fill(90));
            const rawTopics = req.studentTopics?.[req.studentsAttended?.[0] || ''];
            const topics: string[] = Array.isArray(rawTopics) ? rawTopics : (typeof rawTopics === 'string' ? [rawTopics] : Array(6).fill("MATERI PEMBELAJARAN"));
            const nar = req.studentNarratives?.[req.studentsAttended?.[0] || ''] || req.reportNarrative || "";
            const avg = Math.round(scores.reduce((a:number,b:number)=>a+b,0)/6);
            const isPass = avg >= 80;
            const matpelMatch = req.className?.match(/(.*) \((.*)\) - (.*)/);
            const subject = matpelMatch ? matpelMatch[1] : req.className;
            const level = matpelMatch ? matpelMatch[2] : 'BASIC';
            const pkgLogs = logs.filter(l => l.packageId === req.packageId && l.status === 'SESSION_LOG' && l.studentsAttended?.some(s => s.toUpperCase().trim() === sName.toUpperCase().trim())).sort((a,b)=> (a.sessionNumber||0)-(b.sessionNumber||0));

            const themeColor = isPass ? 'text-blue-600' : 'text-orange-600';
            const themeBorder = isPass ? 'border-blue-900' : 'border-orange-600';
            const themeTitleColor = isPass ? 'text-blue-900' : 'text-orange-600';
            const certTitle = isPass ? 'Sertifikat Kelulusan' : 'Capaian Pembelajaran';

            return (
              <div key={req.id} id={`pdf-group-${req.id}`}>
                 <div id={`cert-render-${req.id}`} style={{ width: '794px', height: '1123px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', border: `25px double ${isPass ? '#1e3a8a' : '#ea580c'}`, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', border: '4px solid #f1f5f9', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative' }}>
                      
                      {/* HEADER - TETAP PADA POSISI KAKAK */}
                      <div style={{ height: '280px', paddingTop: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flexShrink: 0 }}>
                        <div style={{ backgroundColor: 'transparent', width: '220px', height: '80px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', padding: '10px' }}>
                           <img src={ASSETS.LOGO} style={{ maxWidth: '180px', maxHeight: '60px', width: 'auto', height: 'auto', objectFit: 'contain' }} />
                        </div>
                        <h1 style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '0.2em', color: '#1e293b', textTransform: 'uppercase', lineHeight: '1', margin: 0 }}>SANUR AKADEMI INSPIRASI</h1>
                        <div style={{ width: '350px', height: '2px', backgroundColor: '#e2e8f0', marginTop: '12px' }}></div>
                      </div>
                      
                      {/* MAIN CONTENT - TERKUNCI DI TENGAH DENGAN PADDING BOTTOM YANG LEBIH BESAR (320px) UNTUK MENAIKKAN POSISI */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', textAlign: 'center', padding: '0 60px 320px 60px' }}>
                        
                        <h2 style={{ fontSize: '46px', fontFamily: 'serif', fontStyle: 'italic', color: isPass ? '#1e3a8a' : '#ea580c', margin: '0 0 25px 0', lineHeight: '1' }}>{certTitle}</h2>
                        
                        <p style={{ fontSize: '18px', fontFamily: 'serif', fontStyle: 'italic', color: '#64748b', margin: '0 0 20px 0', letterSpacing: '0.05em' }}>Diberikan kepada:</p>
                        
                        <div style={{ marginBottom: '30px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '42px', fontWeight: '900', color: isPass ? '#2563eb' : '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, lineHeight: '1.1' }}>{sName}</h3>
                          <div style={{ width: '280px', height: '5px', backgroundColor: isPass ? '#dbeafe' : '#ffedd5', marginTop: '12px', borderRadius: '10px' }}></div>
                        </div>

                        <div style={{ padding: '0 40px', marginBottom: '40px' }}>
                          <p style={{ fontSize: '16px', fontFamily: 'serif', fontStyle: 'italic', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                            {isPass 
                              ? "Telah menunjukkan kompetensi luar biasa dan berhasil menyelesaikan seluruh kurikulum pelatihan intensif dengan hasil memuaskan pada program:"
                              : "Telah berpartisipasi aktif dan menyelesaikan modul pelatihan intensif dengan dedikasi tinggi guna meningkatkan kompetensi pada program:"
                            }
                          </p>
                        </div>

                        <div style={{ 
                           background: isPass ? 'linear-gradient(135deg, #1e3a8a, #0f172a)' : 'linear-gradient(135deg, #ea580c, #0f172a)',
                           width: '600px',
                           padding: '40px 25px',
                           borderRadius: '45px',
                           border: '4px solid white',
                           boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.15)',
                           display: 'flex',
                           flexDirection: 'column',
                           alignItems: 'center',
                           justifyContent: 'center'
                        }}>
                           <p style={{ fontSize: '26px', fontWeight: '900', color: 'white', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '0.08em', margin: 0, lineHeight: '1.2' }}>{subject}</p>
                           <p style={{ fontSize: '10px', fontWeight: '900', color: isPass ? '#93c5fd' : '#fed7aa', letterSpacing: '0.6em', textTransform: 'uppercase', marginTop: '15px' }}>LEVEL {level}</p>
                        </div>
                      </div>
                      
                      {/* FOOTER - TETAP PADA POSISI KAKAK (BOTTOM 160) */}
                      <div style={{ position: 'absolute', bottom: '160px', width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
                        <div style={{ padding: '0 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3em', fontStyle: 'italic', margin: '0 0 5px 0' }}>Tanggal Terbit:</p>
                            <p style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{formatDateToDMY(req.date)}</p>
                          </div>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', opacity: 0.1, color: isPass ? '#1e3a8a' : '#ea580c' }}>
                            <BookOpen size={60} />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                             <div style={{ padding: '6px', border: '3px solid #f1f5f9', borderRadius: '15px', backgroundColor: 'white' }}>
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFIKASI%20${isPass ? 'KELULUSAN' : 'CAPAIAN'}%20SANUR%0AID:%20${req.id.substring(0,8).toUpperCase()}%0ANAMA:%20${sName}%0APROGRAM:%20${subject}%0ASTATUS:%20TERVERIFIKASI%20RESMI`} style={{ width: '55px', height: '55px' }} />
                             </div>
                             <p style={{ fontSize: '7px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Verifikasi Digital Resmi Sanur</p>
                          </div>
                        </div>
                      </div>

                    </div>
                 </div>

                 {/* PAGES 2 & 3 (UNCHANGED) */}
                 <div id={`transcript-render-${req.id}`} className="w-[794px] h-[1123px] bg-white p-12 flex flex-col relative border-8 border-slate-100 box-border overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4"><div className={`w-14 h-14 ${isPass ? 'bg-blue-600' : 'bg-orange-600'} rounded-2xl flex items-center justify-center text-white shadow-lg`}><Layout size={28}/></div><div><h1 className={`text-3xl font-black italic ${themeColor} uppercase Kalimat leading-none tracking-tighter`}>SANUR</h1><p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] mt-1">Catatan Akademik Resmi</p></div></div>
                      <div className="text-right"><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Kode Referensi</p><p className="text-base font-black text-slate-800">SN/TR/{req.id.substring(0,8).toUpperCase()}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-200"><div className="border-r border-slate-300"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Siswa</p><p className="text-xl font-black text-slate-800 uppercase italic leading-none">{sName}</p></div><div className="pl-5"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Program Akademik</p><p className={`text-xl font-black ${themeColor} uppercase italic leading-tight`}>{subject}</p></div></div>
                    <div className="h-auto rounded-[2.5rem] border-2 border-slate-300 overflow-hidden mb-6 bg-white"><table className="w-full table-fixed border-collapse bg-white"><thead><tr className="bg-slate-900 text-white"><th className="p-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-white/10 w-24">Sesi</th><th className="p-4 text-left text-[10px] font-black uppercase tracking-widest">Materi & Modul Kurikulum</th><th className="p-4 text-center text-[10px] font-black uppercase tracking-widest w-32">Nilai</th></tr></thead><tbody className="bg-white">{[1,2,3,4,5,6].map((num, i) => (<tr key={i} className="bg-white border-b border-slate-100 last:border-none"><td className="w-24 border-r border-slate-200 p-0 h-[100px]"><div className="h-full flex items-center justify-center"><span className="font-black text-slate-200 text-3xl italic">0{num}</span></div></td><td className="p-0 h-[100px]"><div className="h-full flex items-center px-10"><span className="font-black text-slate-800 text-[18px] uppercase italic tracking-tight">{topics[i] || "MATERI PEMBELAJARAN"}</span></div></td><td className="w-32 p-0 h-[100px]"><div className="h-full flex items-center justify-center"><div className="flex items-baseline gap-1"><span className={`font-black ${themeColor} text-4xl italic`}>{scores[i] || 0}</span><span className="text-slate-300 font-bold text-sm uppercase">/100</span></div></div></td></tr>))}</tbody></table></div>
                    <div className="p-10 bg-slate-900 rounded-[3rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden mb-2"><div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div><div className="space-y-0 relative z-10 flex flex-col justify-center"><p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mb-0">Evaluasi Kumulatif</p><div className="flex items-baseline gap-4 -mt-14"><p className="text-[18px] font-black text-white/40 uppercase tracking-widest">RATA-RATA:</p><h4 className="text-7xl font-black italic tracking-tighter text-white leading-tight">{avg}</h4><span className="text-2xl text-white/30 font-black italic uppercase tracking-widest leading-none">/ 100</span></div></div><div className="bg-white/10 p-6 rounded-[1.8rem] border border-white/20 text-center backdrop-blur-md relative z-10 min-w-[200px] overflow-hidden"><p className="text-[10px] font-black uppercase mb-1.5 tracking-widest text-blue-300">Status Capaian</p><p className="text-xl font-black italic tracking-tighter uppercase text-white mb-2">{isPass ? 'KOMPETEN' : 'REMEDIAL'}</p><div className={`absolute bottom-0 left-0 h-1.5 ${isPass ? 'bg-emerald-500' : 'bg-orange-500'} w-full`}></div></div></div>
                 </div>

                 <div id={`milestone-render-${req.id}`} className="w-[794px] h-[1123px] bg-white p-20 pb-40 flex flex-col border relative overflow-hidden box-border">
                    <div className={`absolute top-0 left-0 w-[400px] h-[400px] ${isPass ? 'bg-blue-50' : 'bg-orange-50'} rounded-full -ml-48 -mt-48 opacity-50`}></div>
                    <div className="flex items-center gap-4 mb-10 relative z-10"><div className={`w-14 h-14 ${isPass ? 'bg-blue-900' : 'bg-orange-900'} text-white rounded-[1.2rem] flex items-center justify-center shadow-2xl rotate-6`}><Zap size={28}/></div><h1 className="text-4xl font-black italic text-slate-800 uppercase Kalimat tracking-tighter">Langkah <span className={themeColor}>Pembelajaran</span></h1></div>
                    <div className="space-y-8 mb-12 relative z-10"><div className={`flex items-center gap-5 ${themeColor} border-b-4 border-slate-50 pb-3`}><ClipboardList size={24}/><h3 className="text-base font-black uppercase tracking-[0.5em]">Log Pelaksanaan Sesi</h3></div><div className="space-y-4">{[1,2,3,4,5,6].map((num, idx) => { const l = pkgLogs.find(x => x.sessionNumber === num); return (<div key={idx} className="flex items-center gap-12 px-12 py-3 border-b border-slate-50 last:border-none group"><div className={`font-black text-xl uppercase italic w-24 shrink-0 ${SESSION_COLORS[idx] || 'text-slate-400'}`}>SESI {num}</div><div className="flex-1 flex items-center justify-between"><p className="text-[13px] font-black text-slate-400 uppercase tracking-widest">{l ? formatDateToDMY(l.date) : "—"}</p><p className="text-[14px] font-black text-slate-800 uppercase italic">Durasi: 2 JAM / 120 MENIT</p></div></div>); })}</div></div>
                    <div className="space-y-6 relative z-10 flex-1 flex flex-col mb-16">
                      <div className={`flex items-center gap-5 ${isPass ? 'text-blue-600' : 'text-orange-500'} border-b-4 border-slate-50 pb-3`}><Quote size={24}/><h3 className="text-base font-black uppercase tracking-[0.5em]">Ulasan Pengajar</h3></div>
                      <div className="flex-1 bg-gradient-to-br from-blue-50/50 to-white rounded-[3rem] border-4 border-slate-100 p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                         <p className="text-lg font-serif italic text-slate-700 Kalimat px-8 relative z-10 drop-shadow-sm break-words whitespace-normal overflow-wrap-anywhere max-w-full">"{nar}"</p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-col items-center pt-10 relative z-10 border-t-2 border-slate-100 opacity-60">
                      <p className="text-sm font-black uppercase tracking-[0.8em] text-slate-400 text-center">Sanur Akademi Inspirasi</p>
                    </div>
                    <div className="h-20 w-full shrink-0"></div>
                 </div>
              </div>
            );
         })}
      </div>

      {showMilestoneFor && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in">
           <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative overflow-hidden space-y-10">
              <button onClick={() => setShowMilestoneFor(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
              <div className="flex items-center gap-6"><div className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-3"><History size={32} /></div><div><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Milestone Belajar</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{showMilestoneFor.studentsAttended?.[0]}</p></div></div>
              <MilestoneView logs={logs} studentName={showMilestoneFor.studentsAttended?.[0] || ''} packageId={showMilestoneFor.packageId} />
              <button onClick={() => setShowMilestoneFor(null)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl">TUTUP MILESTONE ✨</button>
           </div>
        </div>
      )}

      {confirmReject && (
         <div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in">
            <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative">
               <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-pulse"><AlertCircle size={48} /></div>
               <div className="space-y-2"><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Tolak Permintaan?</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest Kalimat leading-relaxed px-4">Siswa akan diminta memilih pengajar lain untuk klaim rapot mereka.</p></div>
               <div className="flex gap-4"><button onClick={() => setConfirmReject(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button><button onClick={handleRejectRequest} disabled={loading} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">{loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18}/>} IYA, TOLAK</button></div>
            </div>
         </div>
      )}
    </div>
  );
};

export default TeacherReportsInbox;
