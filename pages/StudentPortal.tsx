
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { User, Attendance, StudentPayment } from '../types';
import { supabase } from '../services/supabase.ts';
import ReportTemplate, { formatDateToDMY } from '../ReportTemplate.tsx';
import { 
  BookOpen, Clock, Loader2, Sparkles, Check, X, Rocket, Trophy, Stars, 
  GraduationCap, BadgeCheck, FileText, Upload, Receipt, History, AlertCircle, 
  CreditCard, Eye, Trash2, Printer, Smile, Heart, Target, Edit3, Save, ChevronRight,
  ClipboardList, Download, ShieldCheck, PartyPopper, UserCog, AlertTriangle, Zap, Star, Quote,
  Layout, Info, FileDown, FileCheck, ImageIcon
} from 'lucide-react';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface StudentPortalProps {
  user: User;
  attendanceLogs: Attendance[];
  studentPayments: StudentPayment[];
  setStudentPayments: React.Dispatch<React.SetStateAction<StudentPayment[]>>;
  subjects: string[];
  levels: string[];
  classes: string[];
  teachers: User[];
  initialView?: 'PROGRESS' | 'PAYMENTS';
  refreshAllData?: () => Promise<void>;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ 
  user, attendanceLogs, studentPayments, setStudentPayments, teachers, initialView, refreshAllData, classes, subjects, levels 
}) => {
  const isPaymentView = initialView === 'PAYMENTS';
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [previewModal, setPreviewModal] = useState<string | null>(null);
  const [showDigitalSlip, setShowDigitalSlip] = useState<StudentPayment | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);

  const [confirmingAbsen, setConfirmingAbsen] = useState<{course: any, sessionNum: number} | null>(null);
  const [selectedAbsenDate, setSelectedAbsenDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()));
  const [requestingReportFor, setRequestingReportFor] = useState<any | null>(null);
  const [selectedTeacherForReport, setSelectedTeacherForReport] = useState('');
  
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<StudentPayment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [payForm, setPayForm] = useState({ subject: '', level: 'BASIC', room: '', amount: 0, date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()), receiptData: '' });

  const normalizedUserName = (user?.name || '').toUpperCase().trim();
  const firstName = (user?.name || 'Siswa').split(' ')[0].toUpperCase();

  const motivationalQuotes = [
    "Setiap langkah kecil belajarmu adalah pondasi kesuksesan di masa depan. Semangat! ✨",
    "Belajar mandiri melatih kemandirianmu untuk menjadi pribadi yang hebat. 🚀",
    "Kesuksesan hari esok ditentukan oleh seberapa giat kamu belajar hari ini. ⭐",
    "Jadilah versi terbaik dirimu setiap hari melalui ilmu yang bermanfaat. 🔥",
    "Tidak ada kata terlambat untuk memulai hal yang hebat. Ayo lanjut! 🎯"
  ];

  useEffect(() => {
    const interval = setInterval(() => setQuoteIndex((p) => (p + 1) % 5), 60000); 
    return () => clearInterval(interval);
  }, []);

  const verifiedCourses = useMemo(() => {
    if (!Array.isArray(studentPayments)) return [];
    return [...studentPayments]
      .filter(p => (p.studentName || '').toUpperCase().trim() === normalizedUserName && p.status === 'VERIFIED')
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [studentPayments, normalizedUserName]);

  const myPayments = useMemo(() => {
    if (!Array.isArray(studentPayments)) return [];
    return [...studentPayments]
      .filter(p => (p.studentName || '').toUpperCase().trim() === normalizedUserName)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [studentPayments, normalizedUserName]);

  const myLogs = useMemo(() => {
    if (!Array.isArray(attendanceLogs)) return [];
    return attendanceLogs.filter(l => 
      Array.isArray(l.studentsAttended) && 
      l.studentsAttended.some(s => (s || '').toUpperCase().trim() === normalizedUserName)
    );
  }, [attendanceLogs, normalizedUserName]);

  const findOfficialReportLog = (courseId: string) => {
    const courseLogs = myLogs.filter(l => l.packageId === courseId);
    const possibleReports = [...courseLogs].filter(l => 
      (l.status === 'SESSION_LOG' || l.status === 'REPORT_READY') && 
      l.sessionNumber === 6 &&
      l.teacherId !== 'SISWA_MANDIRI' && 
      l.studentScores && 
      Object.keys(l.studentScores).length > 0
    );
    return possibleReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  const handleLaporBayar = async () => {
    if (!payForm.subject || !payForm.room || !payForm.amount || !payForm.receiptData) {
      setShowErrors(true);
      return alert("Waduh Kak! Tolong lengkapi kolom yang warna merah dulu yaa ✨");
    }

    setLoading(true);
    try {
      const fullClassName = `${payForm.subject} (${payForm.level}) - ${payForm.room}`.toUpperCase();
      const payload = { studentname: normalizedUserName, classname: fullClassName, amount: Number(payForm.amount), date: payForm.date, status: 'PENDING', receiptdata: payForm.receiptData };
      if (isEditing) { await supabase.from('student_payments').update(payload).eq('id', isEditing); }
      else { await supabase.from('student_payments').insert([{ ...payload, id: `PAY-${Date.now()}` }]); }
      if (refreshAllData) await refreshAllData();
      resetForm();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setPayForm({ subject: '', level: 'BASIC', room: '', amount: 0, date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()), receiptData: '' });
    setIsEditing(null);
    setShowErrors(false);
  };

  const handleEditPending = (p: StudentPayment) => {
    setIsEditing(p.id);
    setShowErrors(false);
    const match = p.className.match(/(.*) \((.*)\) - (.*)/);
    if (match) { setPayForm({ subject: match[1], level: match[2], room: match[3], amount: p.amount, date: p.date, receiptData: p.receiptData || '' }); }
    else { setPayForm({ ...payForm, subject: p.className, amount: p.amount, date: p.date, receiptData: p.receiptData || '' }); }
    setTimeout(() => { const formEl = document.getElementById('form-bayar'); if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
  };

  const executeDeletePayment = async () => {
    if (!confirmDeletePayment) return;
    setLoading(true);
    try {
      await supabase.from('student_payments').delete().eq('id', confirmDeletePayment.id);
      if (refreshAllData) await refreshAllData();
      setConfirmDeletePayment(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e: any) { alert("Gagal menghapus laporan: " + e.message); } finally { setLoading(false); }
  };

  const handleConfirmAbsen = async () => {
    if (!confirmingAbsen) return;
    setLoading(true);
    try {
      const payload = { id: `LOG-${Date.now()}`, teacherid: 'SISWA_MANDIRI', teachername: 'BELAJAR MANDIRI', date: selectedAbsenDate, clockin: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date()), status: 'SESSION_LOG', classname: confirmingAbsen.course.className.toUpperCase(), packageid: confirmingAbsen.course.id, sessionnumber: confirmingAbsen.sessionNum, studentsattended: [normalizedUserName], studentsessions: { [normalizedUserName]: confirmingAbsen.sessionNum }, paymentstatus: 'PAID' };
      await supabase.from('attendance').insert([payload]);
      if (refreshAllData) await refreshAllData();
      setConfirmingAbsen(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleRequestReport = async () => {
    if (!selectedTeacherForReport || !requestingReportFor) return alert("Pilih Guru Pembimbing dulu ya! ✨");
    setLoading(true);
    try {
      const teacher = teachers.find(t => t.id === selectedTeacherForReport);
      const payload = { id: `REQ-${Date.now()}`, teacherid: selectedTeacherForReport, teachername: (teacher?.name || 'GURU').toUpperCase(), date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()), status: 'REPORT_REQUEST', classname: requestingReportFor.className.toUpperCase(), packageid: requestingReportFor.id, studentsattended: [normalizedUserName], paymentstatus: 'PAID' };
      
      // Hapus jika ada permintaan lama (misal dari status REJECTED)
      await supabase.from('attendance').delete().eq('packageid', requestingReportFor.id).eq('status', 'REPORT_REJECTED');
      
      await supabase.from('attendance').insert([payload]);
      if (refreshAllData) await refreshAllData();
      setRequestingReportFor(null);
      setSelectedTeacherForReport('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleDownloadPDFReport = async (course: any) => {
    const reportLog = findOfficialReportLog(course.id);
    if (!reportLog) return alert("Rapot belum siap diunduh Kak! Tunggu Guru selesai input nilai ya. ✨");
    setDownloadProgress(5);
    setActiveDownloadId(course.id);
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
      setDownloadProgress(20);
      const img1 = await capturePage(`cert-render-${reportLog.id}`);
      if (img1) pdf.addImage(img1, 'PNG', 0, 0, pw, ph, undefined, 'FAST');
      setDownloadProgress(45);
      pdf.addPage('a4', 'p');
      const img2 = await capturePage(`transcript-render-${reportLog.id}`);
      if (img2) pdf.addImage(img2, 'PNG', 0, 0, pw, ph, undefined, 'FAST');
      setDownloadProgress(75);
      pdf.addPage('a4', 'p');
      const img3 = await capturePage(`milestone-render-${reportLog.id}`);
      if (img3) pdf.addImage(img3, 'PNG', 0, 0, pw, ph, undefined, 'FAST');
      setDownloadProgress(95);
      pdf.save(`Rapot_Sanur_${user.name.toUpperCase().replace(/\s+/g, '_')}.pdf`);
      setDownloadProgress(100);
      await new Promise(r => setTimeout(r, 500));
    } catch (e) { alert("Gagal memproses PDF."); } finally { setActiveDownloadId(null); setDownloadProgress(0); }
  };

  const handleDownloadSlipDirect = async (p: StudentPayment) => {
    setShowDigitalSlip(p);
    setIsDownloading(true);
    setTimeout(async () => {
      if (!slipRef.current) { setIsDownloading(false); setShowDigitalSlip(null); return; }
      try {
        const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true, logging: false, width: 700 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'px', [700, 1000]);
        pdf.addImage(imgData, 'PNG', 0, 0, 700, 1000);
        pdf.save(`Kuitansi_Sanur_${p.studentName.replace(/\s+/g, '_')}_${p.id.substring(0,8)}.pdf`);
      } catch (e) { alert("Gagal download PDF"); } finally { setIsDownloading(false); setShowDigitalSlip(null); }
    }, 500);
  };

  const getDisplayAmount = (amt: number) => {
    return amt > 0 ? `Rp ${amt}` : 'Rp ';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-40 px-4 animate-in fade-in duration-700">
      {/* GLOBAL LOADING / PROGRESS */}
      {(activeDownloadId || loading) && (
        <div className="fixed inset-0 z-[300000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-600 text-white rounded-[2.2rem] flex items-center justify-center shadow-xl animate-bounce">
                {activeDownloadId ? <FileDown size={40} /> : <Loader2 size={40} className="animate-spin" />}
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">{activeDownloadId ? 'Memproses Rapot' : 'Memproses Data'}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed px-4">Tunggu sebentar ya Kak... ✨</p>
              </div>
              {activeDownloadId && (
                <div className="w-full space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Progress</span>
                    <span className="text-[11px] font-black text-emerald-600 italic">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${downloadProgress}%` }}></div>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      <header className="relative py-16 px-12 bg-emerald-600 rounded-[4rem] text-white shadow-2xl overflow-hidden group">
         <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-6 text-center md:text-left flex-1">
               <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30"><Stars size={18} className="text-yellow-300" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Sanur Student Portal</span></div>
               <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-normal Kalimat leading-none">{isPaymentView ? "RIWAYAT BAYAR " : "RUANG BELAJAR "} <br/><span className="text-yellow-300">{firstName} ✨</span></h1>
               <div className="min-h-[60px] flex items-center justify-center md:justify-start"><p className="text-sm font-bold italic text-emerald-50 Kalimat leading-relaxed max-w-xl">"{motivationalQuotes[quoteIndex]}"</p></div>
            </div>
            {/* ICON HEADER DENGAN ANIMASI INTERAKTIF */}
            <div className="w-44 h-44 bg-white/10 backdrop-blur-xl rounded-[3.5rem] flex items-center justify-center shadow-2xl shrink-0 group/icon cursor-pointer active:scale-90 transition-all duration-300">
               {isPaymentView ? (
                 <Rocket size={90} className="text-orange-400 group-hover/icon:-translate-y-4 group-hover/icon:translate-x-4 group-hover/icon:scale-125 group-hover/icon:rotate-12 transition-all duration-500" />
               ) : (
                 <Trophy size={90} className="text-yellow-400 group-hover/icon:scale-125 group-hover/icon:rotate-[360deg] transition-all duration-1000" />
               )}
            </div>
         </div>
      </header>

      {/* PENGUMUMAN HALAMAN KELAS SAYA */}
      {!isPaymentView && (
        <div className="mx-2 bg-emerald-50/60 backdrop-blur-sm border-2 border-dashed border-emerald-200/60 rounded-[3rem] p-8 shadow-sm flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 group">
           <div className="w-14 h-14 bg-white text-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-emerald-100 animate-pulse transition-all">
              <Info size={28} />
           </div>
           <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                 <Sparkles size={14} className="text-emerald-400" />
                 <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest leading-relaxed">
                    "Sertif & Rapot segera disimpan ya Kak! Setelah <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg">1 tahun lulus</span> akun akan dihapus pengurus demi kelancaran sistem."
                 </p>
              </div>
           </div>
        </div>
      )}

      {/* PENGUMUMAN PANDUAN HALAMAN PEMBAYARAN */}
      {isPaymentView && (
        <div className="mx-2 bg-orange-50/60 backdrop-blur-sm border-2 border-dashed border-orange-200/60 rounded-[3rem] p-8 shadow-sm flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 group">
           <div className="w-14 h-14 bg-white text-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-orange-100 animate-pulse transition-all">
              <Zap size={28} />
           </div>
           <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                 <Sparkles size={14} className="text-orange-400" />
                 <p className="text-[11px] font-black text-orange-800 uppercase tracking-widest leading-relaxed">
                    "Lapor bayar di sini ya Kak! ✨ Setelah kirim, status akan <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded-lg">PENDING</span> (sedang dicek Admin). Jika sudah <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg">BERHASIL</span>, silakan unduh Kuitansi resmi dan kelas Kakak otomatis aktif di menu Kelas Saya! 🚀"
                 </p>
              </div>
           </div>
        </div>
      )}

      {isPaymentView ? (
        <section className="space-y-12">
           <div id="form-bayar" className="bg-white p-12 md:p-16 rounded-[4rem] border-2 border-slate-50 shadow-2xl space-y-12 relative overflow-hidden scroll-mt-32">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50"></div>
              <div className="flex items-center gap-8 relative z-10"><div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center shadow-inner shrink-0"><Receipt size={36} /></div><div><h3 className="text-3xl font-black text-slate-800 uppercase italic leading-none">{isEditing ? 'Update Laporan' : 'Lapor Bayar'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Pastikan bukti transfer jelas ya Kak ✨</p></div>{isEditing && <button onClick={resetForm} className="ml-auto p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Mata Pelajaran</label>
                  <select 
                    value={payForm.subject} 
                    onChange={e => { setPayForm({...payForm, subject: e.target.value}); setShowErrors(false); }} 
                    className={`w-full px-8 py-6 rounded-[2rem] font-black text-xs uppercase outline-none transition-all shadow-inner h-[72px] border-2 ${showErrors && !payForm.subject ? 'border-rose-500 bg-rose-50' : 'border-transparent bg-slate-50 focus:bg-white focus:border-orange-500'}`}
                  >
                    <option value="">-- PILIH MATPEL --</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Level Belajar</label>
                  <select value={payForm.level} onChange={e => setPayForm({...payForm, level: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 h-[72px]">{levels.map(l => <option key={l} value={l}>{l}</option>)}</select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Ruangan</label>
                  <select 
                    value={payForm.room} 
                    onChange={e => { setPayForm({...payForm, room: e.target.value}); setShowErrors(false); }} 
                    className={`w-full px-8 py-6 rounded-[2rem] font-black text-xs uppercase outline-none transition-all shadow-inner h-[72px] border-2 ${showErrors && !payForm.room ? 'border-rose-500 bg-rose-50' : 'border-transparent bg-slate-50 focus:bg-white focus:border-orange-500'}`}
                  >
                    <option value="">-- PILIH RUANGAN --</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nominal Transfer (Rp)</label>
                  <input 
                    type="text" 
                    placeholder="Rp 720000" 
                    value={getDisplayAmount(payForm.amount)} 
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, ''); 
                      setPayForm({...payForm, amount: parseInt(raw) || 0});
                      setShowErrors(false);
                    }} 
                    className={`w-full h-[72px] px-8 py-6 rounded-[2rem] font-black text-xl italic outline-none transition-all shadow-inner border-2 ${showErrors && !payForm.amount ? 'border-rose-500 bg-rose-50' : 'border-transparent bg-slate-50 focus:bg-white focus:border-orange-500'}`} 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Tanggal</label>
                  <input type="date" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs outline-none h-[72px]" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Bukti Transfer</label>
                  <div className="flex gap-2">
                    {payForm.receiptData ? (
                      <div className="flex-1 flex gap-2 h-[72px]">
                        <button onClick={() => setPreviewModal(payForm.receiptData)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-[2rem] font-black text-[10px] uppercase border-2 border-emerald-100 flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all shadow-sm">
                          <Eye size={18}/> PREVIEW
                        </button>
                        <button onClick={() => setPayForm({...payForm, receiptData: ''})} className="w-16 h-full bg-rose-50 text-rose-500 rounded-[1.5rem] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                          <Trash2 size={20}/>
                        </button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => { setPayForm({...payForm, receiptData: r.result as string}); setShowErrors(false); }; r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className={`w-full py-6 rounded-[2rem] font-black text-[10px] uppercase shadow-inner border-2 border-dashed h-[72px] transition-all ${showErrors && !payForm.receiptData ? 'border-rose-500 bg-rose-50' : 'border-orange-200 bg-orange-50 text-orange-600'}`}
                        >
                          UPLOAD BUKTI
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={handleLaporBayar} disabled={loading} className="w-full py-8 bg-emerald-600 text-white rounded-[3rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">{loading ? <Loader2 size={24} className="animate-spin" /> : <><Rocket size={24} /> {isEditing ? 'UPDATE LAPORAN ✨' : 'KIRIM LAPORAN ✨'}</>}</button>
           </div>

           <div className="space-y-8">
              <div className="flex items-center gap-4 px-6"><div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><History size={24}/></div><h3 className="text-2xl font-black text-slate-800 uppercase italic">Riwayat Pembayaran</h3></div>
              <div className="grid grid-cols-1 gap-6">
                 {myPayments.map((p, i) => (
                    <div key={p.id || i} className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between group hover:border-emerald-500 transition-all gap-8 relative overflow-hidden">
                       
                       {/* TOMBOL X MERAH DI POJOK MATI (TIDAK NABRAK IKON BAWAH) */}
                       {p.status === 'PENDING' && (
                         <button 
                           onClick={() => setConfirmDeletePayment(p)}
                           className="absolute top-0 right-0 p-5 md:p-6 bg-rose-600 text-white rounded-bl-[2.5rem] hover:bg-rose-700 transition-all shadow-xl z-20 flex items-center justify-center group/del"
                           title="Hapus Laporan"
                         >
                           <X size={22} strokeWidth={4} className="group-hover/del:scale-125 transition-transform" />
                         </button>
                       )}

                       <div className="flex-1 flex items-center gap-8 min-w-0">
                         <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-inner shrink-0 ${p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FFF5F2] text-[#FF4500]'}`}>
                           {p.status === 'VERIFIED' ? <BadgeCheck size={40} /> : <Clock size={40} />}
                         </div>
                         <div className="min-w-0 flex-1">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{formatDateToDMY(p.date)}</p>
                           <h4 className="font-black text-slate-800 text-lg uppercase italic leading-tight pr-14 md:pr-0">{p.className}</h4>
                           <div className="flex items-center gap-4 mt-3">
                             <span className={`px-5 py-2 rounded-full text-[8px] font-black uppercase tracking-widest shadow-md ${p.status === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-[#FF4500] text-white'}`}>
                               {p.status === 'VERIFIED' ? 'BERHASIL' : 'PENDING'}
                             </span>
                           </div>
                         </div>
                       </div>

                       <div className="flex flex-col md:flex-row items-center gap-10">
                         <div className="text-center md:text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NOMINAL</p>
                           <p className={`text-2xl font-black italic ${p.status === 'VERIFIED' ? 'text-emerald-600' : 'text-slate-800'}`}>Rp {p.amount.toLocaleString()}</p>
                         </div>
                         <div className="flex gap-3">
                           <button onClick={() => setPreviewModal(p.receiptData || null)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Eye size={24}/></button>
                           {p.status === 'PENDING' ? (
                             <button onClick={() => handleEditPending(p)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-orange-500 hover:text-white transition-all"><Edit3 size={24}/></button>
                           ) : (
                             <button onClick={() => handleDownloadSlipDirect(p)} className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-emerald-600 transition-all"><Printer size={24}/></button>
                           )}
                         </div>
                       </div>
                    </div>
                 ))}
                 {myPayments.length === 0 && (
                   <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 opacity-20"><History size={48} className="mx-auto mb-4" /><p className="text-[11px] font-black uppercase tracking-[0.3em]">Belum ada riwayat pembayaran.</p></div>
                 )}
              </div>
           </div>
        </section>
      ) : (
        <section className="space-y-10">
           {verifiedCourses.map((course, idx) => {
              const courseLogs = myLogs.filter(l => l.packageId === course.id);
              const completedSessions = courseLogs.filter(l => (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG')).map(l => ({ num: l.sessionNumber || 0, date: l.date }));
              const maxSess = new Set(completedSessions.map(s => s.num)).size;
              const reportLog = findOfficialReportLog(course.id);
              const scoresRaw = reportLog?.studentScores ? Object.values(reportLog.studentScores)[0] : [];
              const scoresArr = Array.isArray(scoresRaw) ? scoresRaw : [];
              const avg = scoresArr.length > 0 ? Math.round(scoresArr.reduce((a, b) => a + b, 0) / 6) : 0;
              const isRemedial = !!reportLog && avg < 80;
              const isReportPublished = !!reportLog && reportLog.status === 'SESSION_LOG';
              const isWaitingRelease = !!reportLog && reportLog.status === 'REPORT_READY';
              
              const isRequesting = courseLogs.some(l => l.status === 'REPORT_REQUEST');
              const isProcessing = courseLogs.some(l => l.status === 'REPORT_PROCESSING');
              const isRejected = courseLogs.some(l => l.status === 'REPORT_REJECTED');

              const progressPercent = Math.min((maxSess / 6) * 100, 100);
              return (
                <div key={course.id || idx} className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-2xl hover:border-emerald-500 transition-all duration-500 overflow-hidden">
                   <div className="p-8 md:p-12 flex flex-col lg:flex-row items-center gap-10">
                      <div className="flex-1 space-y-6 text-center lg:text-left w-full lg:w-auto">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                           <div className={`w-16 h-16 mx-auto lg:mx-0 ${isReportPublished ? (isRemedial ? 'bg-orange-500' : 'bg-emerald-600') : isWaitingRelease ? 'bg-amber-500' : isProcessing ? 'bg-orange-500' : isRequesting ? 'bg-amber-500' : isRejected ? 'bg-rose-500' : 'bg-blue-600'} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
                              {isReportPublished ? (isRemedial ? <Zap size={32} /> : <BadgeCheck size={32} />) : isWaitingRelease ? <Clock size={32} /> : isRequesting ? <Clock size={32} /> : isProcessing ? <Edit3 size={32} /> : isRejected ? <AlertTriangle size={32} /> : <BookOpen size={32} />}
                           </div>
                           <span className={`inline-flex px-5 py-1.5 mx-auto lg:mx-0 ${isReportPublished ? (isRemedial ? 'bg-orange-500' : 'bg-emerald-600') : isWaitingRelease ? 'bg-amber-500' : isProcessing ? 'bg-orange-500' : isRequesting ? 'bg-amber-500' : isRejected ? 'bg-rose-500' : 'bg-blue-600'} text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-md`}>
                              {isReportPublished ? (isRemedial ? 'REMEDIAL ⚡' : 'LULUS 🎓') : isWaitingRelease ? 'SIAP TERBIT' : isProcessing ? 'SEDANG DI PROSES' : isRequesting ? 'MENUNGGU PERSETUJUAN' : isRejected ? 'DI TOLAK' : 'PAKET AKTIF ✨'}
                           </span>
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight leading-tight">{course.className}</h3>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Life-long Certificate Access</p>
                        </div>
                        <div className="space-y-2">
                           <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                              <div className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.4)]" style={{ width: `${progressPercent}%` }}></div>
                           </div>
                           <p className="text-[9px] font-black uppercase text-slate-400 text-center lg:text-left">{maxSess}/6 SESI</p>
                        </div>
                      </div>
                      <div className="flex-[1.5] w-full lg:w-auto">
                        {isReportPublished ? (
                          <div className={`${isRemedial ? 'bg-orange-500' : 'bg-emerald-600'} p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl`}>
                             <div className="flex items-center gap-5 text-left">
                                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                                   {isRemedial ? <Zap size={28}/> : <PartyPopper size={28}/>}
                                </div>
                                <div>
                                   <h4 className="text-xl font-black uppercase italic leading-none">{isRemedial ? 'PENILAIAN SELESAI!' : 'KAMU LULUS!'}</h4>
                                   <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 mt-1">{isRemedial ? 'Evaluasi sudah terbit Kak! ✨' : 'Selamat Kak! ✨'}</p>
                                </div>
                             </div>
                             <button onClick={() => handleDownloadPDFReport(course)} disabled={!!activeDownloadId} className={`px-8 py-4 bg-white ${isRemedial ? 'text-orange-600' : 'text-emerald-600'} rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all`}>
                                {activeDownloadId === course.id ? <Loader2 className="animate-spin" size={16} /> : <Download size={18}/>} UNDUH RAPOT
                             </button>
                          </div>
                        ) : isWaitingRelease ? (
                           <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex flex-col items-center justify-center text-center gap-4 animate-pulse">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600"><Zap size={24}/></div>
                              <div><p className="text-[11px] font-black text-amber-800 uppercase italic">Penilaian Selesai!</p><p className="text-[9px] font-bold text-amber-600 uppercase mt-2">Tunggu Guru Mengirimkan Rapotmu Ke Sini ✨</p></div>
                           </div>
                        ) : isRequesting ? (
                           <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex flex-col items-center justify-center text-center gap-4 animate-pulse">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600"><Clock size={24}/></div>
                              <div><p className="text-[11px] font-black text-amber-800 uppercase italic leading-none">Sedang Meminta Persetujuan Guru</p><p className="text-[9px] font-bold text-amber-600 uppercase mt-2">Tunggu Guru Menerima Permintaanmu Ya ✨</p></div>
                           </div>
                        ) : isProcessing ? (
                           <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100 flex flex-col items-center justify-center text-center gap-4 animate-pulse">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600"><Edit3 size={24}/></div>
                              <div><p className="text-[11px] font-black text-orange-800 uppercase italic leading-none">Sedang Di Proses</p><p className="text-[9px] font-bold text-orange-600 uppercase mt-2">Sertifikat & Rapotmu Sedang Diisi Oleh Guru ✨</p></div>
                           </div>
                        ) : isRejected ? (
                           <div className="space-y-6">
                              <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex items-center gap-4 shadow-sm animate-in shake">
                                 <AlertCircle className="text-rose-600" size={24}/>
                                 <p className="text-[10px] font-black text-rose-800 uppercase italic leading-relaxed">
                                    "Di tolak, pilih guru lain ya Kak! ✨ Permintaanmu ditolak guru tersebut, silakan ajukan ke pembimbing lainnya."
                                 </p>
                              </div>
                              <button onClick={() => setRequestingReportFor(course)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                 <GraduationCap size={20}/> KLAIM ULANG RAPOT 🎓
                              </button>
                           </div>
                        ) : (
                          <div className="space-y-6">
                             <div className="grid grid-cols-6 gap-2">
                                {[1, 2, 3, 4, 5, 6].map(sNum => {
                                   const doneLog = completedSessions.find(s => s.num === sNum);
                                   return (
                                     <button key={sNum} disabled={!!doneLog || (sNum !== maxSess + 1)} className={`p-2 h-20 md:h-24 rounded-2xl font-black transition-all border-2 flex flex-col items-center justify-center gap-1.5 ${!!doneLog ? 'bg-white border-emerald-500 text-emerald-600' : (sNum === maxSess + 1) ? 'bg-blue-50 border-blue-500 text-blue-600 animate-pulse' : 'bg-slate-50 border-transparent text-slate-200 opacity-60'}`}>
                                        {!!doneLog ? (
                                           <>
                                              <p className="text-[7px] font-black text-emerald-500 mb-1 leading-none">{formatDateToDMY(doneLog.date)}</p>
                                              <Check size={16} strokeWidth={4}/>
                                           </>
                                        ) : (
                                           <span className="text-xl">{sNum}</span>
                                        )}
                                        <p className="text-[6px] md:text-[7px] font-black uppercase">{doneLog ? 'DONE' : `SESI ${sNum}`}</p>
                                     </button>
                                   );
                                })}
                             </div>
                             {maxSess >= 6 && (
                                <button onClick={() => setRequestingReportFor(course)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl animate-bounce flex items-center justify-center gap-3">
                                   <GraduationCap size={20}/> KLAIM RAPOT SEKARANG! 🎓
                                </button>
                             )}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              );
           })}
           {verifiedCourses.length === 0 && (
             <div className="py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-20">
               <BookOpen size={64} className="mx-auto mb-6 text-slate-300" />
               <p className="font-black text-[11px] uppercase tracking-[0.4em] italic leading-relaxed text-center">Belum ada paket aktif. ✨</p>
             </div>
           )}
        </section>
      )}

      {/* RENDER MODAL-MODAL */}
      {confirmDeletePayment && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative border-t-8 border-rose-500">
              <button onClick={() => setConfirmDeletePayment(null)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <AlertTriangle size={48} />
              </div>
              <div className="space-y-2">
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Hapus Laporan?</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">
                    Data laporan bayar <span className="text-slate-800 font-black underline">{confirmDeletePayment.className}</span> akan dihapus permanen.
                 </p>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setConfirmDeletePayment(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all">BATAL</button>
                 <button onClick={executeDeletePayment} disabled={loading} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} IYA, HAPUS
                 </button>
              </div>
           </div>
        </div>
      )}

      {previewModal && (<div className="fixed inset-0 z-[300000] flex items-center justify-center p-6 bg-slate-900/95" onClick={() => setPreviewModal(null)}><div className="relative max-w-4xl w-full flex flex-col items-center"><button className="absolute -top-14 right-0 p-4 text-white hover:text-rose-500 transition-colors" onClick={() => setPreviewModal(null)}><X size={40}/></button><img src={previewModal} className="max-w-full max-h-[75vh] rounded-[3rem] shadow-2xl border-4 border-white/20 object-contain animate-in zoom-in" alt="Preview" /><div className="mt-8 text-center"><p className="text-[10px] font-black text-white/40 uppercase tracking-[0.8em] italic">Sanur Payment Verification ✨</p></div></div></div>)}
      {confirmingAbsen && (<div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in"><div className="bg-white w-full max-sm rounded-[4rem] p-12 shadow-2xl text-center space-y-8 relative overflow-hidden"><button onClick={() => setConfirmingAbsen(null)} className="absolute top-8 right-8 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button><div className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto animate-bounce relative z-10 shadow-xl"><Check size={40} strokeWidth={4} /></div><div className="space-y-2 relative z-10"><h4 className="text-2xl font-black text-slate-800 uppercase italic">Konfirmasi Sesi</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{confirmingAbsen.course.className} - SESI {confirmingAbsen.sessionNum}</p></div><div className="space-y-4 text-left relative z-10"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Kapan kamu belajarnya?</label><input type="date" value={selectedAbsenDate} onChange={e => setSelectedAbsenDate(e.target.value)} className="w-full px-8 py-5 bg-slate-50 rounded-[2rem] font-black text-[14px] outline-none border-2 border-emerald-50 shadow-inner" /></div><button onClick={handleConfirmAbsen} disabled={loading} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl relative z-10 active:scale-95 transition-all flex items-center justify-center gap-3">{loading ? <Loader2 size={20} className="animate-spin" /> : 'SAYA SUDAH BELAJAR! ✨'}</button></div></div>)}
      {requestingReportFor && (<div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in"><div className="bg-white w-full max-w-md rounded-[4rem] p-12 md:p-14 shadow-2xl text-center space-y-10 relative overflow-hidden"><button onClick={() => setRequestingReportFor(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button><div className="space-y-6 relative z-10"><div className="w-20 h-20 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-3"><GraduationCap size={40} /></div><div><h4 className="text-3xl font-black text-slate-800 uppercase italic leading-none">Klaim Rapot</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{requestingReportFor.className}</p></div></div><div className="bg-slate-50 p-8 rounded-[2.5rem] text-left space-y-6 border border-slate-100 relative z-10"><p className="text-[11px] font-bold text-slate-600 Kalimat Kalimat">"Silakan pilih Guru Pembimbing Kakak di bawah ini untuk mengirim data belajarmu ke antrean Rapot & Sertifikat. ✨"</p><div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><UserCog size={12}/> Pilih Guru Pembimbing</label><select value={selectedTeacherForReport} onChange={e => setSelectedTeacherForReport(e.target.value)} className="w-full px-8 py-5 bg-white rounded-[1.8rem] font-black text-[12px] uppercase italic outline-none border-2 border-blue-50 shadow-sm h-[60px] appearance-none"><option value="">-- PILIH GURU PEMBIMBING --</option>{teachers.filter(t => t.role === 'TEACHER').map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}</select></div></div><button onClick={handleRequestReport} disabled={!selectedTeacherForReport || loading} className="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl relative Kalimat active:scale-95 transition-all flex items-center justify-center gap-3">{loading ? <Loader2 size={20} className="animate-spin" /> : <><Sparkles size={20} /> AJUKAN PERMINTAAN SEKARANG ✨</>}</button></div></div>)}
      
      {/* HIDDEN SLIP GENERATOR (DENGAN DESAIN RESMI) */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
         {myPayments.map((p) => (
            <div id={`slip-digital-${p.id}`} ref={p.id === showDigitalSlip?.id ? slipRef : null} key={p.id} className="bg-white p-12 md:p-20 space-y-10 w-[700px] mx-auto overflow-hidden text-slate-900 border-8 border-double border-slate-100">
               
               {/* HEADER - Logo & Judul */}
               <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10">
                  <div className="min-w-0 text-left">
                     <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">SANUR</h1>
                     <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mt-1 text-left">Akademi Inspirasi</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                     <h2 className="text-xl font-black uppercase italic text-slate-800 leading-none">KUITANSI RESMI</h2>
                     <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-2 whitespace-nowrap">ID: {p.id.toUpperCase()}</p>
                  </div>
               </div>

               {/* INFO SISWA & TANGGAL */}
               <div className="grid grid-cols-12 gap-10">
                  <div className="col-span-8 pr-6 border-r border-slate-50 text-left">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Diterima Dari:</p>
                     <p className="text-lg font-black text-slate-900 uppercase italic Kalimat text-left">{p.studentName}</p>
                  </div>
                  <div className="col-span-4 text-right">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal Bayar:</p>
                     <p className="text-base font-black text-slate-800 uppercase italic Kalimat">{formatDateToDMY(p.date)}</p>
                  </div>
               </div>

               {/* RINCIAN PAKET */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3 text-slate-400 border-b-2 border-slate-50 pb-2">
                     <ClipboardList size={14} />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em]">Rincian Paket Pembelajaran</p>
                  </div>
                  
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col gap-6">
                     <div className="text-left">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Nama Program/Kelas:</p>
                        <p className="text-[13px] font-black text-slate-800 uppercase Kalimat text-left">{p.className}</p>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200/60">
                        <div className="text-left">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Total Sesi Paket:</p>
                           <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight text-left">6 Sesi</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Durasi Sesi:</p>
                           <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">2 Jam / 120 Menit</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* NOMINAL PEMBAYARAN */}
               <div className="pt-8 border-t-2 border-slate-900">
                  <div className="flex justify-between items-start h-[32px]">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VERIFIKASI SISTEM:</p>
                     <div className="text-right flex flex-col items-end">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Terverifikasi Digital</p>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Status: LUNAS</p>
                     </div>
                  </div>
                  <p className="text-5xl font-black text-emerald-600 italic leading-none mt-4 text-left">Rp {p.amount.toLocaleString()}</p>
               </div>

               {/* FOOTER */}
               <div className="pt-10 border-t border-slate-100 flex justify-between items-end gap-10">
                  <div className="max-w-xs text-left">
                     <p className="text-[10px] font-bold text-slate-400 italic Kalimat text-left">"Terima kasih atas kepercayaannya bergabung di Sanur Akademi Inspirasi. Pembayaran ini sah diverifikasi sistem internal."</p>
                  </div>
                  <div className="text-center flex flex-col items-center shrink-0">
                     <ShieldCheck size={44} className="text-slate-900 opacity-20 mb-2" />
                     <p className="text-[13px] font-black uppercase text-slate-900 tracking-tight leading-none">Admin Sanur</p>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">Official Receipt</p>
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default StudentPortal;
