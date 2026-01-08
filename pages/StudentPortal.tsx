
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { User, Attendance, StudentPayment } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  BookOpen, Clock, Loader2, Sparkles, Check, X, Rocket, Trophy, Stars, 
  GraduationCap, BadgeCheck, FileText, Upload, Receipt, History, AlertCircle, 
  CreditCard, Eye, Trash2, Printer, Smile, Heart, Target, Edit3, Save, ChevronRight,
  ClipboardList, Download, ShieldCheck, PartyPopper, UserCog, AlertTriangle, Zap, Star, Quote,
  Layout, Info
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

const SESSION_COLORS = ['text-blue-500', 'text-emerald-500', 'text-orange-500', 'text-rose-500', 'text-purple-500', 'text-amber-500'];

const StudentPortal: React.FC<StudentPortalProps> = ({ 
  user, attendanceLogs, studentPayments, setStudentPayments, teachers, initialView, refreshAllData, classes, subjects, levels 
}) => {
  const isPaymentView = initialView === 'PAYMENTS';
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<string | null>(null);
  const [showDigitalSlip, setShowDigitalSlip] = useState<StudentPayment | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);

  const [confirmingAbsen, setConfirmingAbsen] = useState<{course: any, sessionNum: number} | null>(null);
  const [selectedAbsenDate, setSelectedAbsenDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()));
  const [requestingReportFor, setRequestingReportFor] = useState<any | null>(null);
  const [selectedTeacherForReport, setSelectedTeacherForReport] = useState('');

  const ASSETS = { LOGO: "https://raw.githubusercontent.com/user-attachments/assets/080a8f94-67f7-49d7-84a7-897b2521c761" };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ subject: '', level: 'BASIC', room: '', amount: 0, date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()), receiptData: '' });

  const normalizedUserName = (user?.name || '').toUpperCase().trim();
  const firstName = (user?.name || 'Siswa').split(' ')[0].toUpperCase();

  const formatDateToDMY = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const motivationalQuotes = [
    "Setiap langkah kecil belajarmu adalah pondasi kesuksesan di masa depan. Semangat! ✨",
    "Fokuslah pada proses, hasil yang luar biasa akan mengikuti usahamu. 💪",
    "Belajar mandiri melatih kemandirianmu untuk menjadi pribadi yang hebat. 🚀",
    "Jangan takut mencoba hal baru, ilmu adalah harta yang takkan pernah habis. 🌈",
    "Kesuksesan hari esok ditentukan oleh seberapa giat kamu belajar hari ini. ⭐",
    "Jadilah versi terbaik dirimu setiap hari melalui ilmu yang bermanfaat. 🔥",
    "Tidak ada kata terlambat untuk memulai hal yang hebat. Ayo lanjut! 🎯",
    "Pikiran yang terbuka adalah kunci untuk menyerap ilmu tanpa batas. 🧠",
    "Dedikasimu hari ini adalah hadiah untuk masa depanmu nanti. 🎁",
    "Tetap rendah hati saat berilmu, tetap semangat saat belajar. 🥰"
  ];

  useEffect(() => {
    const interval = setInterval(() => setQuoteIndex((p) => (p + 1) % 10), 60000); 
    return () => clearInterval(interval);
  }, []);

  const verifiedCourses = useMemo(() => {
    if (!Array.isArray(studentPayments)) return [];
    return [...studentPayments]
      .filter(p => (p.studentName || '').toUpperCase().trim() === normalizedUserName && p.status === 'VERIFIED')
      .sort((a, b) => {
        const dateDiff = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [studentPayments, normalizedUserName]);

  const myPayments = useMemo(() => {
    if (!Array.isArray(studentPayments)) return [];
    return [...studentPayments]
      .filter(p => (p.studentName || '').toUpperCase().trim() === normalizedUserName)
      .sort((a, b) => {
        const dateDiff = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [studentPayments, normalizedUserName]);

  const myLogs = useMemo(() => {
    if (!Array.isArray(attendanceLogs)) return [];
    return attendanceLogs.filter(l => 
      Array.isArray(l.studentsAttended) && 
      l.studentsAttended.some(s => (s || '').toUpperCase().trim() === normalizedUserName)
    );
  }, [attendanceLogs, normalizedUserName]);

  const handleLaporBayar = async () => {
    if (!payForm.subject || !payForm.room || !payForm.amount || !payForm.receiptData) return alert("Lengkapi semua data dan bukti transfer ya Kak! ✨");
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
  };

  const handleEditPending = (p: StudentPayment) => {
    setIsEditing(p.id);
    const match = p.className.match(/(.*) \((.*)\) - (.*)/);
    if (match) { setPayForm({ subject: match[1], level: match[2], room: match[3], amount: p.amount, date: p.date, receiptData: p.receiptData || '' }); }
    else { setPayForm({ ...payForm, subject: p.className, amount: p.amount, date: p.date, receiptData: p.receiptData || '' }); }
    setTimeout(() => { const formEl = document.getElementById('form-bayar'); if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
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
      await supabase.from('attendance').insert([payload]);
      if (refreshAllData) await refreshAllData();
      setRequestingReportFor(null);
      setSelectedTeacherForReport('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleDownloadPDFReport = async (course: any) => {
    setActiveDownloadId(course.id);
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const captureOptions = { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, height: 1123, logging: false };
      const capturePage = async (pageId: string) => {
        const el = document.getElementById(pageId);
        if (!el) return null;
        const canvas = await html2canvas(el, captureOptions);
        return canvas.toDataURL('image/png', 1.0);
      };
      const img1 = await capturePage(`cert-render-${course.id}`);
      if (img1) pdf.addImage(img1, 'PNG', 0, 0, 446, 631);
      pdf.addPage();
      const img2 = await capturePage(`transcript-render-${course.id}`);
      if (img2) pdf.addImage(img2, 'PNG', 0, 0, 446, 631);
      pdf.addPage();
      const img3 = await capturePage(`milestone-render-${course.id}`);
      if (img3) pdf.addImage(img3, 'PNG', 0, 0, 446, 631);
      pdf.save(`Rapot_Sanur_${user.name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { alert("Gagal memproses PDF."); } finally { setActiveDownloadId(null); }
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-40 px-4 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <header className="relative py-16 px-12 bg-emerald-600 rounded-[4rem] text-white shadow-2xl overflow-hidden group">
         <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-6 text-center md:text-left flex-1">
               <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30"><Stars size={18} className="text-yellow-300" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Sanur Student Portal</span></div>
               <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-normal leading-none">{isPaymentView ? "RIWAYAT BAYAR " : "RUANG BELAJAR "} <br/><span className="text-yellow-300">{firstName} ✨</span></h1>
               <div className="min-h-[60px] flex items-center justify-center md:justify-start"><p className="text-sm font-bold italic text-emerald-50 leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-1000">"{motivationalQuotes[quoteIndex]}"</p></div>
            </div>
            <div className="w-44 h-44 bg-white/10 backdrop-blur-xl rounded-[3.5rem] flex items-center justify-center shadow-2xl shrink-0 hover:scale-110 hover:rotate-12 transition-all duration-500 cursor-pointer group/icon">
               {isPaymentView ? <Rocket size={90} className="text-orange-400 group-hover/icon:animate-bounce" /> : <Trophy size={90} className="text-yellow-400 group-hover/icon:animate-pulse" />}
            </div>
         </div>
      </header>

      {/* BANNER REMINDER */}
      <div className="bg-orange-50 p-6 rounded-[2.5rem] border border-orange-100 flex items-center gap-4 animate-pulse shadow-sm max-w-4xl mx-auto">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm shrink-0 border border-orange-100"><Info size={24}/></div>
         <p className="text-[11px] font-black text-orange-800 uppercase italic leading-relaxed">"Segera amankan/unduh rapotmu ya Kak jika sudah keluar! Akun akan dihapus pengurus setelah satu tahun selesai kelas demi meringankan sistem. ✨"</p>
      </div>

      {isPaymentView ? (
        <section className="space-y-12">
           {/* FORM LAPOR BAYAR */}
           <div id="form-bayar" className="bg-white p-12 md:p-16 rounded-[4rem] border-2 border-slate-50 shadow-2xl space-y-12 relative overflow-hidden scroll-mt-32">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50"></div>
              <div className="flex items-center gap-8 relative z-10"><div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center shadow-inner shrink-0"><Receipt size={36} /></div><div><h3 className="text-3xl font-black text-slate-800 uppercase italic leading-none">{isEditing ? 'Update Laporan Bayar' : 'Lapor Pembayaran Baru'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">Pastikan data sudah benar sebelum dikirim ya Kak ✨</p></div>{isEditing && <button onClick={resetForm} className="ml-auto p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10"><div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><BookOpen size={12}/> Mata Pelajaran</label><select value={payForm.subject} onChange={e => setPayForm({...payForm, subject: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs uppercase italic outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner appearance-none h-[72px]"><option value="">-- PILIH MATPEL --</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Smile size={12}/> Level Belajar</label><select value={payForm.level} onChange={e => setPayForm({...payForm, level: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs uppercase italic outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner appearance-none h-[72px]">{levels.map(l => <option key={l} value={l}>{l}</option>)}</select></div><div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Target size={12}/> Ruangan / Tipe</label><select value={payForm.room} onChange={e => setPayForm({...payForm, room: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs uppercase italic outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner appearance-none h-[72px]"><option value="">-- PILIH RUANGAN --</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><CreditCard size={12}/> Nominal Transfer (Rp)</label><div className="relative h-[72px]"><span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-300 italic text-lg">Rp</span><input type="number" placeholder="CONTOH: 900000" value={payForm.amount || ''} onChange={e => setPayForm({...payForm, amount: Number(e.target.value)})} className="w-full h-full pl-16 pr-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xl italic outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner" /></div></div><div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Clock size={12}/> Tanggal Transfer</label><input type="date" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs italic outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner h-[72px]" /></div><div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Upload size={12}/> Bukti Transfer (Gambar)</label><div className="flex gap-2">{payForm.receiptData ? (<div className="flex-1 flex gap-2 h-[72px]"><button onClick={() => setPreviewModal(payForm.receiptData)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-[2rem] font-black text-[10px] uppercase border-2 border-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all shadow-sm"><Eye size={18}/> PREVIEW</button><button onClick={() => setPayForm({...payForm, receiptData: ''})} className="w-16 h-full bg-rose-50 text-rose-500 rounded-[1.5rem] border-2 border-rose-100 flex items-center justify-center hover:bg-rose-100 transition-all shadow-sm"><Trash2 size={20}/></button></div>) : (<><input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setPayForm({...payForm, receiptData: r.result as string}); r.readAsDataURL(f); } }} className="hidden" accept="image/*" /><button onClick={() => fileInputRef.current?.click()} className="w-full py-6 bg-orange-50 text-orange-600 rounded-[2rem] font-black text-[10px] uppercase shadow-inner flex items-center justify-center gap-3 border-2 border-dashed border-orange-200 hover:bg-orange-100 transition-all h-[72px]"><Upload size={18}/> UPLOAD BUKTI</button></>)}</div></div></div><button onClick={handleLaporBayar} disabled={loading} className="w-full py-8 bg-emerald-600 text-white rounded-[3rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 group">{loading ? <Loader2 size={24} className="animate-spin" /> : <><Rocket size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> {isEditing ? 'UPDATE LAPORAN PEMBAYARAN ✨' : 'KIRIM LAPORAN PEMBAYARAN ✨'}</>}</button>
           </div>
           {/* RIWAYAT TRANSAKSI */}
           <div className="space-y-8">
              <div className="flex items-center gap-4 px-6"><div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><History size={24}/></div><h3 className="text-2xl font-black text-slate-800 uppercase italic">Riwayat Pembayaran Anda</h3></div>
              <div className="grid grid-cols-1 gap-6">
                 {myPayments.map((p, i) => (
                    <div key={p.id || i} className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between group hover:border-emerald-500 transition-all gap-8">
                       <div className="flex-1 flex items-center gap-8 min-w-0"><div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-inner shrink-0 ${p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{p.status === 'VERIFIED' ? <BadgeCheck size={40} /> : <Clock size={40} />}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{formatDateToDMY(p.date)}</p><h4 className="font-black text-slate-800 text-lg md:text-xl uppercase italic leading-tight whitespace-normal break-words pr-4">{p.className}</h4><div className="flex items-center gap-4 mt-3"><span className={`px-5 py-2 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${p.status === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-[#EA580C] text-white'}`}>{p.status === 'VERIFIED' ? 'BERHASIL' : 'PENDING'}</span></div></div></div>
                       <div className="flex flex-col md:flex-row items-center gap-10"><div className="text-center md:text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">NOMINAL</p><p className={`text-2xl font-black italic ${p.status === 'VERIFIED' ? 'text-emerald-600' : 'text-slate-800'}`}>Rp {p.amount.toLocaleString()}</p></div><div className="flex gap-3"><button onClick={() => setPreviewModal(p.receiptData || null)} className="p-4 bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90"><Eye size={24}/></button>{p.status === 'PENDING' ? (<button onClick={() => handleEditPending(p)} className="p-4 bg-slate-50 text-slate-400 hover:text-orange-600 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90"><Edit3 size={24}/></button>) : (<button onClick={() => handleDownloadSlipDirect(p)} disabled={isDownloading && showDigitalSlip?.id === p.id} className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-emerald-600 transition-all active:scale-90 flex items-center justify-center gap-2">{isDownloading && showDigitalSlip?.id === p.id ? <Loader2 size={24} className="animate-spin" /> : <Printer size={24}/>}</button>)}</div></div>
                    </div>
                 ))}
              </div>
           </div>
        </section>
      ) : (
        <section className="space-y-10">
           {verifiedCourses.map((course, idx) => {
              const courseLogs = myLogs.filter(l => l.packageId === course.id);
              const completedSessions = courseLogs.filter(l => l.status === 'SESSION_LOG').map(l => ({ num: l.sessionNumber || 0, date: l.date }));
              const maxSess = new Set(completedSessions.map(s => s.num)).size;
              const reportLog = courseLogs.find(l => l.status === 'SESSION_LOG' && l.sessionNumber === 6 && (l.studentNarratives?.[normalizedUserName] || l.reportNarrative));
              const isReportPublished = !!reportLog;
              const isProcessing = courseLogs.some(l => l.status === 'REPORT_REQUEST' || l.status === 'REPORT_PROCESSING');
              const isRejected = courseLogs.some(l => l.status === 'REPORT_REJECTED') && !isProcessing && !isReportPublished;
              const progressPercent = Math.min((maxSess / 6) * 100, 100);
              const rawScoresData = reportLog ? reportLog.studentScores?.[normalizedUserName] : undefined;
              const scores: number[] = Array.isArray(rawScoresData) ? rawScoresData : (typeof rawScoresData === 'number' ? [rawScoresData] : Array(6).fill(90));
              const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / 6) : 0;
              const isPass = avg >= 80;

              return (
                <div key={course.id || idx} className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-2xl hover:border-emerald-500 transition-all duration-500 overflow-hidden">
                   <div className="p-8 md:p-12 flex flex-col lg:flex-row items-center gap-10">
                      {/* Bagian Kiri: Info Matpel */}
                      <div className="flex-1 space-y-6 text-center lg:text-left w-full lg:w-auto">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                           <div className={`w-16 h-16 mx-auto lg:mx-0 ${isReportPublished ? (isPass ? 'bg-emerald-600' : 'bg-orange-600') : isRejected ? 'bg-rose-600' : 'bg-blue-600'} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
                              {isReportPublished ? <BadgeCheck size={32} /> : isRejected ? <AlertTriangle size={32} /> : <BookOpen size={32} />}
                           </div>
                           <span className={`inline-flex px-5 py-1.5 mx-auto lg:mx-0 ${isReportPublished ? (isPass ? 'bg-emerald-600' : 'bg-orange-600') : isRejected ? 'bg-rose-600' : isProcessing ? 'bg-orange-500' : 'bg-blue-600'} text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-md`}>
                              {isReportPublished ? (isPass ? 'LULUS 🎓' : 'SELESAI ✨') : isRejected ? 'DITOLAK GURU' : isProcessing ? 'PROSES RAPOT' : 'PAKET AKTIF ✨'}
                           </span>
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight leading-tight">{course.className}</h3>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic mt-1">Lifetime Access Certificate</p>
                        </div>
                        <div className="space-y-2">
                           <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                              <div className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.4)]" style={{ width: `${progressPercent}%` }}></div>
                           </div>
                           <p className="text-[9px] font-black uppercase text-slate-400 text-center lg:text-left">{maxSess}/6 SESI SELESAI</p>
                        </div>
                      </div>

                      {/* Bagian Kanan: Kotak Absen & Rapot */}
                      <div className="flex-[1.5] w-full lg:w-auto">
                        {isReportPublished ? (
                          <div className={`${isPass ? 'bg-emerald-600' : 'bg-orange-600'} p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl`}>
                             <div className="flex items-center gap-5 text-left">
                                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0">{isPass ? <PartyPopper size={28}/> : <Star size={28}/>}</div>
                                <div>
                                   <h4 className="text-xl font-black uppercase italic leading-none">{isPass ? 'KAMU LULUS!' : 'PAKET SELESAI!'}</h4>
                                   <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 mt-1">Selamat atas pencapaianmu Kak! ✨</p>
                                </div>
                             </div>
                             <button onClick={() => handleDownloadPDFReport(course)} disabled={activeDownloadId === course.id} className={`px-8 py-4 bg-white ${isPass ? 'text-emerald-600' : 'text-orange-600'} rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all`}>
                                {activeDownloadId === course.id ? <Loader2 className="animate-spin" size={16} /> : <Download size={18}/>} UNDUH RAPOT ✨
                             </button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                             {isRejected && (
                                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-4 text-rose-600">
                                   <AlertCircle size={20} className="shrink-0"/>
                                   <p className="text-[9px] font-black uppercase italic leading-tight">"Permintaan rapotmu ditolak pengajar sebelumnya, silakan klaim lagi & pilih Guru Pembimbing lain ya! ✨"</p>
                                </div>
                             )}
                             <div className="grid grid-cols-6 gap-2 md:gap-3">
                                {[1, 2, 3, 4, 5, 6].map(sNum => {
                                   const doneLog = completedSessions.find(s => s.num === sNum);
                                   return (
                                     <button key={sNum} disabled={!!doneLog || (sNum !== maxSess + 1) || isProcessing} onClick={() => setConfirmingAbsen({course, sessionNum: sNum})} className={`p-2 md:p-3 h-20 md:h-24 rounded-2xl font-black transition-all border-2 flex flex-col items-center justify-center gap-1.5 ${!!doneLog ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-50 text-emerald-600' : (sNum === maxSess + 1 && !isProcessing) ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-md animate-pulse scale-105' : 'bg-slate-50 border-transparent text-slate-200 opacity-60'}`}>
                                        <div className="flex flex-col items-center gap-1">
                                           {!!doneLog ? (
                                              <>
                                                 <div className="w-6 h-6 md:w-8 md:h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md"><Check size={16} strokeWidth={4}/></div>
                                                 <p className="text-[7px] md:text-[8px] font-black text-slate-800 uppercase tracking-tighter">{formatDateToDMY(doneLog.date)}</p>
                                                 <span className="text-[6px] md:text-[7px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-widest mt-0.5">SELESAI</span>
                                              </>
                                           ) : (
                                              <>
                                                 <span className="text-sm md:text-xl text-slate-300">{sNum}</span>
                                                 <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">SESI {sNum}</p>
                                                 {(sNum === maxSess + 1 && !isProcessing) && <span className="text-[6px] md:text-[7px] font-black text-blue-500 animate-bounce">KLIK</span>}
                                              </>
                                           )}
                                        </div>
                                     </button>
                                   );
                                })}
                             </div>
                             {maxSess >= 6 && !isProcessing && !isReportPublished && (
                                <button onClick={() => setRequestingReportFor(course)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 animate-bounce">
                                   <GraduationCap size={20}/> {isRejected ? 'PILIH GURU LAIN ✨' : 'KLAIM RAPOT SEKARANG! 🎓'}
                                </button>
                             )}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              );
           })}
        </section>
      )}

      {showDigitalSlip && (
         <div className="fixed left-[-9999px] top-0 pointer-events-none">
            <div ref={slipRef} className="bg-white p-12 md:p-20 space-y-10 w-[700px] mx-auto overflow-hidden text-slate-900">
               <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10"><div className="min-w-0 text-left"><h1 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">SANUR</h1><p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mt-1 text-left">Akademi Inspirasi</p></div><div className="text-right flex flex-col items-end"><h2 className="text-xl font-black uppercase italic text-slate-800 leading-none">KUITANSI RESMI</h2><p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-2 whitespace-nowrap">ID: {showDigitalSlip.id}</p></div></div>
               <div className="grid grid-cols-12 gap-10"><div className="col-span-8 pr-6 border-r border-slate-50 text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Diterima Dari:</p><p className="text-lg font-black text-slate-900 uppercase italic leading-tight whitespace-normal text-left">{showDigitalSlip.studentName}</p></div><div className="col-span-4 text-right"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal Bayar:</p><p className="text-base font-black text-slate-800 uppercase italic leading-tight">{formatDateToDMY(showDigitalSlip.date)}</p></div></div>
               <div className="space-y-6"><div className="flex items-center gap-3 text-slate-400 border-b-2 border-slate-50 pb-2"><ClipboardList size={14} /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Rincian Paket Pembelajaran</p></div><div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col gap-6"><div className="text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Nama Program/Kelas:</p><p className="text-[13px] font-black text-slate-800 uppercase leading-tight whitespace-normal text-left">{showDigitalSlip.className}</p></div><div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200/60"><div className="text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Total Sesi Paket:</p><p className="text-[12px] font-black text-slate-800 uppercase tracking-tight text-left">6 Sesi</p></div><div className="text-right"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Durasi Sesi:</p><p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">2 Jam / 180 Menit</p></div></div></div></div>
               <div className="pt-8 border-t-2 border-slate-900"><div className="flex justify-between items-start h-[32px]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VERIFIKASI SISTEM:</p><div className="text-right flex flex-col items-end"><p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Terverifikasi Digital</p><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Status: LUNAS</p></div></div><p className="text-5xl font-black text-emerald-600 italic leading-none mt-4 text-left">Rp {showDigitalSlip.amount.toLocaleString()}</p></div>
               <div className="pt-10 border-t border-slate-100 flex justify-between items-end gap-10"><div className="max-w-xs text-left"><p className="text-[10px] font-bold text-slate-400 italic leading-relaxed text-left">"Terima kasih atas kepercayaannya bergabung di Sanur Akademi Inspirasi. Pembayaran ini sah diverifikasi sistem internal."</p></div><div className="text-center flex flex-col items-center shrink-0"><ShieldCheck size={44} className="text-slate-900 opacity-20 mb-2" /><p className="text-[13px] font-black uppercase text-slate-900 tracking-tight leading-none">Admin Sanur</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">Official Receipt</p></div></div>
            </div>
         </div>
      )}

      {previewModal && (<div className="fixed inset-0 z-[300000] flex flex-col items-center justify-center p-6 bg-slate-900/95 backdrop-blur-2xl" onClick={() => setPreviewModal(null)}><div className="relative max-w-4xl w-full max-h-[80vh] flex flex-col items-center"><button className="absolute -top-6 -right-6 p-4 bg-white text-rose-500 rounded-full shadow-2xl z-20" onClick={(e) => { e.stopPropagation(); setPreviewModal(null); }}><X size={24}/></button><img src={previewModal} className="max-w-full max-h-full rounded-[3rem] shadow-2xl border-4 border-white/20 object-contain animate-in zoom-in duration-300" /></div></div>)}
      {confirmingAbsen && (<div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in"><div className="bg-white w-full max-w-sm rounded-[4rem] p-12 shadow-2xl text-center space-y-8 relative overflow-hidden"><button onClick={() => setConfirmingAbsen(null)} className="absolute top-8 right-8 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button><div className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto animate-bounce relative z-10 shadow-xl"><Check size={40} strokeWidth={4} /></div><div className="space-y-2 relative z-10"><h4 className="text-2xl font-black text-slate-800 uppercase italic">Konfirmasi Sesi</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{confirmingAbsen.course.className} - SESI {confirmingAbsen.sessionNum}</p></div><div className="space-y-4 text-left relative z-10"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Kapan kamu belajarnya?</label><input type="date" value={selectedAbsenDate} onChange={e => setSelectedAbsenDate(e.target.value)} className="w-full px-8 py-5 bg-slate-50 rounded-[2rem] font-black text-[14px] outline-none border-2 border-emerald-500 shadow-inner" /></div><button onClick={handleConfirmAbsen} disabled={loading} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl relative z-10 active:scale-95 transition-all flex items-center justify-center gap-3">{loading ? <Loader2 size={20} className="animate-spin" /> : 'SAYA SUDAH BELAJAR! ✨'}</button></div></div>)}
      {requestingReportFor && (<div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in"><div className="bg-white w-full max-w-md rounded-[4rem] p-12 md:p-14 shadow-2xl text-center space-y-10 relative overflow-hidden"><button onClick={() => setRequestingReportFor(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button><div className="space-y-6 relative z-10"><div className="w-20 h-20 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-3"><GraduationCap size={40} /></div><div><h4 className="text-3xl font-black text-slate-800 uppercase italic leading-none">Klaim Rapot</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{requestingReportFor.className}</p></div></div><div className="bg-slate-50 p-8 rounded-[2.5rem] text-left space-y-6 border border-slate-100 relative z-10"><p className="text-[11px] font-bold text-slate-600 italic leading-relaxed">"Silakan pilih Guru Pembimbing Kakak di bawah ini untuk mengirim data belajarmu ke antrean Rapot & Sertifikat. ✨"</p><div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><UserCog size={12}/> Pilih Guru Pembimbing</label><select value={selectedTeacherForReport} onChange={e => setSelectedTeacherForReport(e.target.value)} className="w-full px-8 py-5 bg-white rounded-[1.8rem] font-black text-[12px] uppercase italic outline-none border-2 border-blue-50 shadow-sm h-[60px] appearance-none"><option value="">-- PILIH GURU PEMBIMBING --</option>{teachers.filter(t => t.role === 'TEACHER').map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}</select></div></div><button onClick={handleRequestReport} disabled={!selectedTeacherForReport || loading} className="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl relative z-10 active:scale-95 transition-all flex items-center justify-center gap-3">{loading ? <Loader2 size={20} className="animate-spin" /> : <><Sparkles size={20} /> AJUKAN PERMINTAAN SEKARANG ✨</>}</button></div></div>)}
    </div>
  );
};

export default StudentPortal;
