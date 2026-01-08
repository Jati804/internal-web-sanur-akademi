
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

  const ASSETS = { 
    LOGO: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASoAAACdCAYAAAADgjVWAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAANOiSURBVHhe7P15sGxXlt6H/dba55zMvNMbME8FVBdq6uquodlNVlPdpEiJGkiZskhLpFpjy5RMDTQlk6YVtBxiKCzbkmxJpkQxzAjJsmhZITlo2SGZVJN0NOceeuiaUUAVZuABeHjDHTPznLP3Wv5j7ZP3voehCngoPKAKC5G47+bNPHlyD2uv4VvfEnfnA/mRFwXS6cOTO1vgc3c/5273uJc7nfIgXu50fBv3LXcWiO3iPgcEcBBHfAApjpjgGdcB8RNB1yC9iKwQWao0z4mkZ0X0OsgRsBaRJUgGSn1YXPcD+VEW+UBR/UhKB37O3e7F7UHz/DG38qhbuRu3eww772b3OTZ3kxlYK4KCgdjN17pBROSG37/X+nL3gjejqI8Yq9R0z6PtSyr6okh6SUSfF0mXEL2M6EuCXAP6m6/zgfxwyweK6odb2moV3eFuD+DlQ2b5E275E+7lfvNyL+7nSsm7YJ2IKGeUjYicPtQxy9W4qcbTTT9jKTlxmZv//vpydv2ZnX6mhxSQPiVdijcnheYV0eaJpM3XVNM3RfQyyCEwfGB5/fDKB4rqh0sEfNfdHnAvH7Yyft7K8Jli+cfx4R7ctkVEb7Z6TuXUWjq7LjavF6+v0df96S6AIZJe5+83Wluvt+6kvm6Ss69xAaPZPOfuRbW9BumZJnW/ptp8I6XuKyDPh/Iin7nUB/I+lw8U1ftbGvAdd7vXLP+0+fhZK+NPmo0fEfKFUmxXpDQSEnpGPHb92Z83yI0Kxr1s/vLGCi7EzG6wxl4rNyqityqOYPWy7g4e13OXAtKLpgOR5pVG26+qNl9VbR8TSY+LyDWQkw+U1/tXPlBU7z8R8PNm5afMxp/J1v9mz8OnSx4/lBpvAUS8buvp36E4zCaL6WaLKMTd6+t183P6u4hEaPtN5PUU1VmFVd7EBaR+/rQeX0/ReY2Pba5Nqn8Jd3Hz9VwxM0fTiUrznKTu7zTN7O+IpK8CJ/WVH8j7RD5QVO89EWAb93uKjR8vpf97PI8/nxkfpZQtEe9SEzvXLLPx0tTDaPJyZvNPG/tGiY3/+q7bWYtKXUOJYTUYpBsLR90wW4WCFAVJ4A0m0/vA9bXK56xMCuhmZTX9bpQzCvRU3AR3R/Xs9zt9jbs73gyqzaHL0CtdLd/lLu23USCC+wlC9x2xSb8tdOSQRmxPbOXJKkV6JxhQvZAhJPXg9d4A0++dDt+J/35Vx+W0oHsNFaVMb8Vo/5LF0W8n3X+nz1/NZ/T8rr+++u6iy/7gX/p8X8/0r0M0MZQJFUrvQQ==" 
  };

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
    if (!payForm.subject || !payForm.room || !payForm.amount || !payForm.receiptData) return alert("Lengkapi semua data dan bukti transfer ya! ✨");
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      
      const capturePage = async (pageId: string) => {
        const el = document.getElementById(pageId);
        if (!el) return null;
        
        const canvas = await html2canvas(el, {
          scale: 2, 
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedEl = clonedDoc.getElementById(pageId);
            if (clonedEl) {
              clonedEl.style.width = '794px';
              clonedEl.style.height = '1123px';
              clonedEl.style.display = 'flex';
            }
          }
        });
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
    } catch (e) { 
      console.error('PDF Error:', e);
      alert("Gagal memproses PDF."); 
    } finally { 
      setActiveDownloadId(null); 
    }
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
    <div className="max-w-7xl mx-auto space-y-8 pb-40 px-4 animate-in fade-in duration-700">
      <header className="relative py-20 px-14 bg-emerald-600 rounded-[4.5rem] text-white shadow-2xl overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="space-y-8 text-center md:text-left flex-1">
               <div className="inline-flex items-center gap-4 px-8 py-3 bg-white/20 backdrop-blur-md rounded-full border border-white/30"><Stars size={22} className="text-yellow-300" /><span className="text-[11px] font-black uppercase tracking-[0.3em]">Sanur Student Command Center</span></div>
               <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-normal leading-[0.9]">{isPaymentView ? "RIWAYAT BAYAR " : "RUANG BELAJAR "} <br/><span className="text-yellow-300">{firstName} ✨</span></h1>
               <div className="min-h-[70px] flex items-center justify-center md:justify-start"><p className="text-base font-bold italic text-emerald-50 leading-relaxed max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-1000">"{motivationalQuotes[quoteIndex]}"</p></div>
            </div>
            <div className="w-56 h-56 bg-white/10 backdrop-blur-xl rounded-[4rem] flex items-center justify-center shadow-2xl shrink-0 hover:scale-110 hover:rotate-12 transition-all duration-500 cursor-pointer group/icon">
               {isPaymentView ? <Rocket size={120} className="text-orange-400 group-hover/icon:animate-bounce" /> : <Trophy size={120} className="text-yellow-400 group-hover/icon:animate-pulse" />}
            </div>
         </div>
      </header>

      <div className="bg-orange-50 p-8 rounded-[3rem] border-2 border-orange-100 flex items-center gap-6 animate-pulse shadow-sm max-w-5xl mx-auto">
         <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center text-orange-600 shadow-sm shrink-0 border border-orange-100"><Info size={32}/></div>
         <p className="text-xs font-black text-orange-800 uppercase italic leading-relaxed">"Halo! Jika rapotmu sudah keluar, segera amankan/unduh rapotmu ya! Akun akan dihapus pengurus setelah satu tahun selesai kelas demi meringankan performa sistem. ✨"</p>
      </div>

      {isPaymentView ? (
        <section className="space-y-12">
           <div id="form-bayar" className="bg-white p-14 md:p-20 rounded-[5rem] border-2 border-slate-50 shadow-2xl space-y-14 relative overflow-hidden scroll-mt-32 max-w-6xl mx-auto">
              <div className="absolute top-0 right-0 w-80 h-80 bg-orange-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50"></div>
              <div className="flex items-center gap-10 relative z-10"><div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center shadow-inner shrink-0"><Receipt size={44} /></div><div><h3 className="text-4xl font-black text-slate-800 uppercase italic leading-none">{isEditing ? 'Update Laporan Bayar' : 'Lapor Pembayaran Baru'}</h3><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-3 italic">Pastikan data sudah benar sebelum dikirim ya ✨</p></div>{isEditing && <button onClick={resetForm} className="ml-auto p-5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={24}/></button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10"><div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><BookOpen size={14}/> Mata Pelajaran</label><select value={payForm.subject} onChange={e => setPayForm({...payForm, subject: e.target.value})} className="w-full px-8 py-7 bg-slate-50 rounded-[2.5rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner appearance-none h-[80px]"><option value="">-- PILIH MATPEL --</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Smile size={14}/> Level Belajar</label><select value={payForm.level} onChange={e => setPayForm({...payForm, level: e.target.value})} className="w-full px-8 py-7 bg-slate-50 rounded-[2.5rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner appearance-none h-[80px]">{levels.map(l => <option key={l} value={l}>{l}</option>)}</select></div><div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Target size={14}/> Ruangan / Tipe</label><select value={payForm.room} onChange={e => setPayForm({...payForm, room: e.target.value})} className="w-full px-8 py-7 bg-slate-50 rounded-[2.5rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner appearance-none h-[80px]"><option value="">-- PILIH RUANGAN --</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><CreditCard size={14}/> Nominal Transfer (Rp)</label><div className="relative h-[80px]"><span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-300 italic text-2xl">Rp</span><input type="number" placeholder="CONTOH: 900000" value={payForm.amount || ''} onChange={e => setPayForm({...payForm, amount: Number(e.target.value)})} className="w-full h-full pl-18 pr-8 py-7 bg-slate-50 rounded-[2.5rem] font-black text-2xl outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner" /></div></div><div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Clock size={14}/> Tanggal Transfer</label><input type="date" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className="w-full px-8 py-7 bg-slate-50 rounded-[2.5rem] font-black text-sm outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner h-[80px]" /></div><div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Upload size={14}/> Bukti Transfer (Gambar)</label><div className="flex gap-3">{payForm.receiptData ? (<div className="flex-1 flex gap-3 h-[80px]"><button onClick={() => setPreviewModal(payForm.receiptData)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-[2.5rem] font-black text-[11px] uppercase border-2 border-emerald-100 flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all shadow-sm"><Eye size={22}/> PREVIEW</button><button onClick={() => setPayForm({...payForm, receiptData: ''})} className="w-20 h-full bg-rose-50 text-rose-500 rounded-[1.8rem] border-2 border-rose-100 flex items-center justify-center hover:bg-rose-100 transition-all shadow-sm"><Trash2 size={26}/></button></div>) : (<><input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setPayForm({...payForm, receiptData: r.result as string}); r.readAsDataURL(f); } }} className="hidden" accept="image/*" /><button onClick={() => fileInputRef.current?.click()} className="w-full py-6 bg-orange-50 text-orange-600 rounded-[2.5rem] font-black text-[11px] uppercase shadow-inner flex items-center justify-center gap-4 border-2 border-dashed border-orange-200 hover:bg-orange-100 transition-all h-[80px]"><Upload size={22}/> UPLOAD BUKTI</button></>)}</div></div></div><button onClick={handleLaporBayar} disabled={loading} className="w-full py-10 bg-emerald-600 text-white rounded-[3.5rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-6 group">{loading ? <Loader2 size={32} className="animate-spin" /> : <><Rocket size={32} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> {isEditing ? 'UPDATE LAPORAN PEMBAYARAN ✨' : 'KIRIM LAPORAN PEMBAYARAN ✨'}</>}</button>
           </div>
           <div className="space-y-10 max-w-6xl mx-auto">
              <div className="flex items-center gap-5 px-8"><div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl shadow-sm"><History size={32}/></div><h3 className="text-3xl font-black text-slate-800 uppercase italic">Riwayat Pembayaran</h3></div>
              <div className="grid grid-cols-1 gap-8">
                 {myPayments.map((p, i) => (
                    <div key={p.id || i} className="bg-white p-10 md:p-14 rounded-[4.5rem] border border-slate-100 shadow-2xl flex flex-col md:flex-row items-center justify-between group hover:border-emerald-500 transition-all gap-10">
                       <div className="flex-1 flex items-center gap-10 min-w-0"><div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-inner shrink-0 ${p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{p.status === 'VERIFIED' ? <BadgeCheck size={48} /> : <Clock size={48} />}</div><div className="min-w-0 flex-1"><p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-2">{formatDateToDMY(p.date)}</p><h4 className="font-black text-slate-800 text-2xl md:text-3xl uppercase italic leading-tight whitespace-normal break-words pr-6 tracking-tight">{p.className}</h4><div className="flex items-center gap-6 mt-5"><span className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md ${p.status === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-[#EA580C] text-white'}`}>{p.status === 'VERIFIED' ? 'BERHASIL' : 'PENDING'}</span></div></div></div>
                       <div className="flex flex-col md:flex-row items-center gap-12"><div className="text-center md:text-right"><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">NOMINAL TRANSAKSI</p><p className={`text-4xl font-black italic tracking-tighter ${p.status === 'VERIFIED' ? 'text-emerald-600' : 'text-slate-800'}`}>Rp {p.amount.toLocaleString()}</p></div><div className="flex gap-4"><button onClick={() => setPreviewModal(p.receiptData || null)} className="p-5 bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-3xl shadow-sm border border-slate-100 transition-all active:scale-90"><Eye size={28}/></button>{p.status === 'PENDING' ? (<button onClick={() => handleEditPending(p)} className="p-5 bg-slate-50 text-slate-400 hover:text-orange-600 rounded-3xl shadow-sm border border-slate-100 transition-all active:scale-90"><Edit3 size={28}/></button>) : (<button onClick={() => handleDownloadSlipDirect(p)} disabled={isDownloading && showDigitalSlip?.id === p.id} className="p-6 bg-slate-900 text-white rounded-3xl shadow-2xl hover:bg-emerald-600 transition-all active:scale-90 flex items-center justify-center gap-3">{isDownloading && showDigitalSlip?.id === p.id ? <Loader2 size={28} className="animate-spin" /> : <Printer size={28}/>}</button>)}</div></div>
                    </div>
                 ))}
              </div>
           </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
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
                <div key={course.id || idx} className="bg-white rounded-[4.5rem] border-2 border-slate-50 shadow-2xl flex flex-col hover:border-emerald-500 transition-all duration-500 overflow-hidden min-h-[700px]">
                   <div className="p-12 md:p-16 flex flex-col flex-1 space-y-12"><div className="flex justify-between items-start"><div className={`w-24 h-24 ${isReportPublished ? (isPass ? 'bg-emerald-600' : 'bg-orange-600') : isRejected ? 'bg-rose-600' : 'bg-blue-600'} text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-3`}>{isReportPublished ? <BadgeCheck size={48} /> : isRejected ? <AlertTriangle size={48} /> : <BookOpen size={48} />}</div><span className={`px-8 py-3.5 ${isReportPublished ? (isPass ? 'bg-emerald-600' : 'bg-orange-600') : isRejected ? 'bg-rose-600' : isProcessing ? 'bg-orange-500' : 'bg-blue-600'} text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center`}>{isReportPublished ? (isPass ? 'LULUS 🎓' : 'SELESAI ✨') : isRejected ? 'DITOLAK GURU' : isProcessing ? 'PROSES RAPOT' : 'PAKET AKTIF ✨'}</span></div><div className="space-y-3"><h3 className="text-4xl font-black text-slate-800 uppercase italic tracking-tight leading-tight">{course.className}</h3><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">Official Certification Program</p></div>{isReportPublished ? (<div className={`${isPass ? 'bg-emerald-600' : 'bg-orange-600'} p-12 rounded-[4rem] text-white flex flex-col items-center text-center space-y-8 shadow-2xl animate-in zoom-in duration-500`}><div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center animate-bounce">{isPass ? <PartyPopper size={48}/> : <Star size={48}/>}</div><h4 className="text-4xl font-black uppercase italic">{isPass ? 'KAMU LULUS! 🎓' : 'PAKET SELESAI! ✨'}</h4><div className="bg-white/10 p-8 rounded-3xl border border-white/20"><p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">✨ Kami bangga dengan pencapaianmu! Teruslah berkarya and raih mimpi-mimpimu ya! ✨</p></div><button onClick={() => handleDownloadPDFReport(course)} disabled={activeDownloadId === course.id} className={`w-full py-8 bg-white ${isPass ? 'text-emerald-600' : 'text-orange-600'} rounded-[3rem] font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-6 active:scale-95 transition-all`}>{activeDownloadId === course.id ? <Loader2 className="animate-spin" /> : <Download size={32}/>} UNDUH RAPOT DIGITAL ✨</button><p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">TERBIT PADA: {formatDateToDMY(reportLog.date)}</p></div>) : (<>{isRejected && (<div className="bg-rose-50 p-8 rounded-3xl border border-rose-100 space-y-4 animate-in fade-in"><div className="flex items-center gap-4 text-rose-600"><AlertCircle size={24}/><p className="text-[11px] font-black uppercase tracking-widest">Permintaan Sebelumnya Ditolak</p></div><p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed italic">"Permintaan rapotmu belum bisa diproses oleh pengajar tersebut. Silakan klik tombol klaim lagi and pilih Guru Pembimbing lain ya! ✨"</p></div>)}<div className="grid grid-cols-2 gap-6">{[1, 2, 3, 4, 5, 6].map(sNum => { const doneLog = completedSessions.find(s => s.num === sNum); return (<button key={sNum} disabled={!!doneLog || (sNum !== maxSess + 1) || isProcessing} onClick={() => setConfirmingAbsen({course, sessionNum: sNum})} className={`p-8 md:p-10 rounded-[2.5rem] font-black transition-all border-4 flex flex-col items-center justify-center gap-3 ${!!doneLog ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-2xl' : (sNum === maxSess + 1 && !isProcessing) ? 'bg-white border-emerald-500 text-emerald-600 shadow-xl scale-105' : 'bg-slate-50 border-transparent text-slate-200'}`}><span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{doneLog ? formatDateToDMY(doneLog.date) : `SESI ${sNum}`}</span>{!!doneLog ? <div className="flex flex-col items-center gap-2"><div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg"><Check size={24} strokeWidth={4}/></div><span className="text-[11px] font-black">LENGKAP</span></div> : <span className="text-4xl italic tracking-tighter opacity-30">{sNum}</span>}</button>); })}</div><div className="space-y-5 pt-4"><div className="h-5 bg-slate-100 rounded-full overflow-hidden p-1.5 shadow-inner"><div className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.5)]" style={{ width: `${progressPercent}%` }}></div></div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center animate-pulse">{maxSess < 6 ? `TINGGAL ${6 - maxSess} SESI LAGI MENUJU RAPOTMU ✨` : 'Yeay! Sesi lengkap, silakan klaim rapotmu 🎓'}</p></div>{maxSess >= 6 && !isProcessing && !isReportPublished && (<button onClick={() => setRequestingReportFor(course)} className="w-full py-10 bg-slate-900 text-white rounded-[3.5rem] mt-8 font-black text-[14px] uppercase tracking-[0.5em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-6 active:scale-95 animate-bounce"><GraduationCap size={36}/> {isRejected ? 'PILIH GURU LAIN ✨' : 'KLAIM RAPOT SEKARANG! 🎓'}</button>)}</>)}</div>
                   
                   {isReportPublished && (
                     <div className="fixed left-[-9999px] top-0 pointer-events-none" style={{ width: '794px' }}>
                        {(() => {
                           const req = reportLog;
                           const sName = normalizedUserName;
                           const rawScoresRender = req.studentScores?.[sName];
                           const scores: number[] = Array.isArray(rawScoresRender) ? rawScoresRender : (typeof rawScoresRender === 'number' ? [rawScoresRender] : Array(6).fill(90));
                           const rawTopicsRender = req.studentTopics?.[sName];
                           const topics: string[] = Array.isArray(rawTopicsRender) ? rawTopicsRender : (typeof rawTopicsRender === 'string' ? [rawTopicsRender] : Array(6).fill("PEMBELAJARAN"));
                           const nar = req.studentNarratives?.[sName] || req.reportNarrative || "";
                           const avg = Math.round(scores.reduce((a:number,b:number)=>a+b,0)/6);
                           const isPass = avg >= 80;
                           const matpelMatch = course.className?.match(/(.*) \((.*)\) - (.*)/);
                           const subject = matpelMatch ? matpelMatch[1] : course.className;
                           const level = matpelMatch ? matpelMatch[2] : 'BASIC';
                           const pkgLogs = attendanceLogs.filter(l => l.packageId === course.id && l.status === 'SESSION_LOG' && l.studentsAttended?.some(s => s.toUpperCase().trim() === normalizedUserName.toUpperCase().trim())).sort((a,b)=> (a.sessionNumber||0)-(b.sessionNumber||0));

                           if (isPass) {
                             return (
                               <div id={`pdf-group-${course.id}`}>
                                 <div id={`cert-render-${course.id}`} className="w-[794px] h-[1123px] bg-white flex flex-col border-[25px] border-double border-blue-900 box-border p-12 relative overflow-hidden"><div className="w-full h-full border-4 border-slate-100 flex flex-col items-center py-12 box-border relative z-10"><div className="flex flex-col items-center justify-start pt-14 mb-8"><div className="bg-white px-10 py-5 mb-6 flex items-center justify-center border border-slate-50 shadow-sm rounded-2xl"><img src={ASSETS.LOGO} className="h-20 w-auto object-contain" /></div><h1 className="text-2xl font-black tracking-[0.25em] text-blue-900 uppercase leading-none">SANUR AKADEMI INSPIRASI</h1><div className="w-56 h-0.5 bg-gradient-to-r from-transparent via-blue-900/10 to-transparent mt-3"></div></div><div className="flex flex-col items-center text-center w-full px-12 flex-1 justify-center -mt-32"><h2 className="text-5xl font-serif italic text-blue-900 mb-8 leading-tight tracking-wide">Sertifikat Kelulusan</h2><p className="text-xl font-serif italic text-slate-500 mb-8 tracking-wider">Dengan bangga diberikan kepada:</p><div className="relative mb-12 w-full"><h3 className="text-5xl font-black text-blue-600 uppercase tracking-[0.08em] text-center px-6 leading-none drop-shadow-sm">{sName}</h3><div className="w-full h-1.5 bg-blue-100 mt-6 rounded-full mx-auto max-w-[60%]"></div></div><p className="text-lg font-serif italic text-slate-600 px-20 leading-relaxed mb-10 tracking-wide">Telah menunjukkan kompetensi luar biasa and berhasil menyelesaikan kurikulum pelatihan intensif dengan hasil memuaskan pada program:</p><div className="bg-gradient-to-br from-blue-900 to-slate-900 px-16 py-8 rounded-[3rem] border-4 border-white shadow-2xl flex flex-col items-center justify-center min-w-[520px]"><p className="text-2xl font-black text-white uppercase italic tracking-[0.1em] text-center leading-tight">{subject}</p><p className="text-blue-300 text-[10px] font-black tracking-[0.7em] uppercase mt-3">LEVEL {level}</p></div></div><div className="w-full flex flex-col items-center relative z-20"><div className="w-full px-20 absolute bottom-[22px] left-0 flex justify-between items-center z-10 gap-10"><div className="flex-1 flex flex-col items-center text-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Tanggal Terbit:</p><p className="text-base font-black text-slate-900 uppercase tracking-tighter">{formatDateToDMY(req.date)}</p></div><div className="flex-1 flex flex-col items-center justify-center text-blue-900/10 opacity-40 shrink-0"><BookOpen size={60} /><div className="flex gap-1.5 mt-1"><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/></div></div><div className="flex-1 flex flex-col items-center text-center"><div className="p-3 border-4 border-slate-100 rounded-3xl bg-white shadow-sm flex items-center justify-center mx-auto"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFIKASI%20SERTIFIKAT%20SANUR%0AID:%20${req.id.substring(0,8).toUpperCase()}%0ANAMA:%20${sName}%0APROGRAM:%20${subject}%0ASTATUS:%20TERVERIFIKASI%20RESMI`} className="w-16 h-16" alt="QR" /></div><div className="w-full text-center mt-1.5"><p className="text-[7px] font-black text-slate-400 uppercase tracking-widest text-center">Verifikasi Sertifikat</p><p className="text-[5px] font-bold text-slate-300 uppercase -mt-0.5 leading-none text-center">Catatan Resmi Sanur</p></div></div></div></div></div></div>
                                 <div id={`transcript-render-${course.id}`} className="w-[794px] h-[1123px] bg-white p-12 flex flex-col relative border-8 border-slate-100 box-border overflow-hidden"><div className="flex justify-between items-start mb-6"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Layout size={28}/></div><div><h1 className="text-3xl font-black italic text-blue-600 uppercase leading-none tracking-tighter">SANUR</h1><p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] mt-1">Catatan Akademik Resmi</p></div></div><div className="text-right"><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Kode Referensi</p><p className="text-base font-black text-slate-800">SN/TR/{req.id.substring(0,8).toUpperCase()}</p></div></div><div className="grid grid-cols-2 gap-6 mb-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-200"><div className="border-r border-slate-300"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Siswa</p><p className="text-xl font-black text-slate-800 uppercase italic leading-none">{sName}</p></div><div className="pl-5"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Program Akademik</p><p className="text-xl font-black text-blue-600 uppercase italic leading-tight">{subject}</p></div></div><div className="h-auto rounded-[2.5rem] border-2 border-slate-300 overflow-hidden mb-6 bg-white"><table className="w-full table-fixed border-collapse bg-white"><thead><tr className="bg-slate-900 text-white"><th className="p-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-white/10 w-24">Sesi</th><th className="p-4 text-left text-[10px] font-black uppercase tracking-widest">Materi & Modul Kurikulum</th><th className="p-4 text-center text-[10px] font-black uppercase tracking-widest w-32">Nilai</th></tr></thead><tbody className="bg-white">{[1,2,3,4,5,6].map((num, i) => (<tr key={i} className="bg-white border-b border-slate-100 last:border-none"><td className="w-24 border-r border-slate-200 p-0 h-[100px]"><div className="h-full flex items-center justify-center"><span className="font-black text-slate-200 text-3xl italic">0{num}</span></div></td><td className="p-0 h-[100px]"><div className="h-full flex items-center px-10"><span className="font-black text-slate-800 text-[18px] uppercase italic tracking-tight">{topics[i] || "MATERI PEMBELAJARAN"}</span></div></td><td className="w-32 p-0 h-[100px]"><div className="h-full flex items-center justify-center"><div className="flex items-baseline gap-1"><span className="font-black text-blue-600 text-4xl italic">{scores[i] || 0}</span><span className="text-slate-300 font-bold text-sm uppercase">/100</span></div></div></td></tr>))}</tbody></table></div><div className="p-10 bg-slate-900 rounded-[3rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden mb-2"><div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div><div className="space-y-0 relative z-10 flex flex-col justify-center"><p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mb-0">Evaluasi Kumulatif</p><div className="flex items-baseline gap-4 -mt-14"><p className="text-[18px] font-black text-white/40 uppercase tracking-widest">RATA-RATA:</p><h4 className="text-7xl font-black italic tracking-tighter text-white leading-tight">{avg}</h4><span className="text-2xl text-white/30 font-black italic uppercase tracking-widest leading-none">/ 100</span></div></div><div className="bg-white/10 p-6 rounded-[1.8rem] border border-white/20 text-center backdrop-blur-md relative z-10 min-w-[200px] overflow-hidden"><p className="text-[10px] font-black uppercase mb-1.5 tracking-widest text-blue-300">Status Capaian</p><p className="text-xl font-black italic tracking-tighter uppercase text-white mb-2">KOMPETEN ✨</p><div className="absolute bottom-0 left-0 h-1.5 bg-emerald-500 w-full shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div></div></div></div>
                                 <div id={`milestone-render-${course.id}`} className="w-[794px] h-[1123px] bg-white p-20 pb-40 flex flex-col border relative overflow-hidden box-border"><div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-50 rounded-full -ml-48 -mt-48 opacity-50"></div><div className="flex items-center gap-4 mb-10 relative z-10"><div className="w-14 h-14 bg-blue-900 text-white rounded-[1.2rem] flex items-center justify-center shadow-2xl rotate-6"><Zap size={28}/></div><h1 className="text-4xl font-black italic text-slate-800 uppercase leading-none tracking-tighter">Langkah <span className="text-blue-600">Pembelajaran</span></h1></div><div className="space-y-8 mb-12 relative z-10"><div className="flex items-center gap-5 text-blue-600 border-b-4 border-blue-50 pb-3"><ClipboardList size={24}/><h3 className="text-base font-black uppercase tracking-[0.5em]">Log Pelaksanaan Sesi</h3></div><div className="space-y-4">{[1,2,3,4,5,6].map((num, i) => { const l = pkgLogs.find(x => x.sessionNumber === num); return (<div key={i} className="flex items-center gap-12 px-12 py-3 border-b border-slate-50 last:border-none group"><div className={`font-black text-xl uppercase italic w-24 shrink-0 ${SESSION_COLORS[i] || 'text-slate-400'}`}>SESI {num}</div><div className="flex-1 flex items-center justify-between"><p className="text-[13px] font-black text-slate-400 uppercase tracking-widest">{l ? formatDateToDMY(l.date) : "—"}</p><p className="text-[14px] font-black text-slate-800 uppercase italic">Durasi: 2 JAM / 120 MENIT</p></div></div>); })}</div></div><div className="space-y-6 relative z-10 flex-1 flex flex-col mb-16"><div className="flex items-center gap-5 text-orange-500 border-b-4 border-orange-50 pb-3"><Quote size={24}/><h3 className="text-base font-black uppercase tracking-[0.5em]">Ulasan Pengajar</h3></div><div className="flex-1 bg-gradient-to-br from-blue-50/50 to-white rounded-[3rem] border-4 border-slate-100 p-10 flex flex-col items-center justify-center text-center relative overflow-hidden"><div className="absolute top-10 left-10 text-blue-100 opacity-60"><Star size={40} fill="currentColor"/></div><div className="absolute bottom-10 right-10 text-orange-100 opacity-60 animate-pulse"><Star size={40} fill="currentColor"/></div><p className="text-lg font-serif italic text-slate-700 leading-relaxed px-8 relative z-10 drop-shadow-sm break-words whitespace-normal overflow-wrap-anywhere max-w-full">"{nar}"</p></div></div><div className="mt-auto flex flex-col items-center opacity-30 pt-10 relative z-10 border-t-2 border-slate-100 pb-28"><div className="w-14 h-14 bg-blue-900 text-white rounded-[1rem] flex items-center justify-center mb-3"><BadgeCheck size={28}/></div><p className="text-sm font-black uppercase tracking-[0.8em] text-slate-400">Dokumen Resmi Sanur Akademi</p></div></div>
                               </div>
                             );
                           } else {
                             const themeColor = 'text-orange-600';
                             const themeBorder = 'border-orange-600';
                             const themeGradient = 'from-orange-600 to-slate-900';
                             const certTitle = 'Laporan Capaian Belajar';
                             return (
                               <div id={`pdf-group-${course.id}`}>
                                 <div id={`cert-render-${course.id}`} className={`w-[794px] h-[1123px] bg-white flex flex-col border-[25px] border-double ${themeBorder} box-border p-12 relative overflow-hidden`}><div className="w-full h-full border-4 border-slate-100 flex flex-col items-center py-12 box-border relative z-10"><div className="flex flex-col items-center justify-start pt-14 mb-8"><div className="bg-white px-10 py-5 mb-6 flex items-center justify-center border border-slate-50 shadow-sm rounded-2xl"><img src={ASSETS.LOGO} className="h-20 w-auto object-contain" /></div><h1 className="text-2xl font-black tracking-[0.25em] text-orange-900 uppercase leading-none">SANUR AKADEMI INSPIRASI</h1><div className="w-56 h-0.5 bg-gradient-to-r from-transparent via-orange-900/10 to-transparent mt-3"></div></div><div className="flex flex-col items-center text-center w-full px-12 flex-1 justify-center -mt-32"><h2 className="text-5xl font-serif italic text-orange-900 mb-8 leading-tight tracking-wide">{certTitle}</h2><p className="text-xl font-serif italic text-slate-500 mb-8 tracking-wider">Diberikan kepada:</p><div className="relative mb-12 w-full"><h3 className={`text-5xl font-black ${themeColor} uppercase tracking-[0.08em] text-center px-6 leading-none drop-shadow-sm`}>{sName}</h3><div className="w-full h-1.5 bg-orange-100 mt-6 rounded-full mx-auto max-w-[60%]"></div></div><p className="text-lg font-serif italic text-slate-600 px-20 leading-relaxed mb-10 tracking-wide">Telah berpartisipasi aktif and menyelesaikan seluruh modul kurikulum pelatihan intensif dengan dedikasi tinggi pada program:</p><div className={`bg-gradient-to-br ${themeGradient} px-16 py-8 rounded-[3rem] border-4 border-white shadow-2xl flex flex-col items-center justify-center min-w-[520px]`}><p className="text-2xl font-black text-white uppercase italic tracking-[0.1em] text-center leading-tight">{subject}</p><p className="text-orange-200 text-[10px] font-black tracking-[0.7em] uppercase mt-3">LEVEL {level}</p></div></div><div className="w-full flex flex-col items-center relative z-20"><div className="w-full px-20 absolute bottom-[22px] left-0 flex justify-between items-center z-10 gap-10"><div className="flex-1 flex flex-col items-center text-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Tanggal Terbit:</p><p className="text-base font-black text-slate-900 uppercase tracking-tighter">{formatDateToDMY(req.date)}</p></div><div className="flex-1 flex flex-col items-center justify-center text-orange-900/10 opacity-40 shrink-0"><BookOpen size={60} /><div className="flex gap-1.5 mt-1"><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/><Star size={10} fill="currentColor"/></div></div><div className="flex-1 flex flex-col items-center text-center"><div className="p-3 border-4 border-slate-100 rounded-3xl bg-white shadow-sm flex items-center justify-center mx-auto"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFIKASI%20SERTIFIKAT%20SANUR%0AID:%20${req.id.substring(0,8).toUpperCase()}%0ANAMA:%20${sName}%0APROGRAM:%20${subject}%0ASTATUS:%20KETERANGAN%20BELAJAR`} className="w-16 h-16" alt="QR" /></div><div className="w-full text-center mt-1.5"><p className="text-[7px] font-black text-slate-400 uppercase tracking-widest text-center">Verifikasi Sertifikat</p><p className="text-[5px] font-bold text-slate-300 uppercase -mt-0.5 leading-none text-center">Catatan Resmi Sanur</p></div></div></div></div></div></div>
                                 <div id={`transcript-render-${course.id}`} className="w-[794px] h-[1123px] bg-white p-12 flex flex-col relative border-8 border-slate-100 box-border overflow-hidden"><div className="flex justify-between items-start mb-6"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Layout size={28}/></div><div><h1 className="text-3xl font-black italic text-orange-600 uppercase leading-none tracking-tighter">SANUR</h1><p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] mt-1">Catatan Akademik Resmi</p></div></div><div className="text-right"><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Kode Referensi</p><p className="text-base font-black text-slate-800">SN/TR/{req.id.substring(0,8).toUpperCase()}</p></div></div><div className="grid grid-cols-2 gap-6 mb-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-200"><div className="border-r border-slate-300"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Siswa</p><p className="text-xl font-black text-slate-800 uppercase italic leading-none">{sName}</p></div><div className="pl-5"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Program Akademik</p><p className={`text-xl font-black ${themeColor} uppercase italic leading-tight`}>{subject}</p></div></div><div className="h-auto rounded-[2.5rem] border-2 border-slate-300 overflow-hidden mb-6 bg-white"><table className="w-full table-fixed border-collapse bg-white"><thead><tr className="bg-slate-900 text-white"><th className="p-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-white/10 w-24">Sesi</th><th className="p-4 text-left text-[10px] font-black uppercase tracking-widest">Materi & Modul Kurikulum</th><th className="p-4 text-center text-[10px] font-black uppercase tracking-widest w-32">Nilai</th></tr></thead><tbody className="bg-white">{[1,2,3,4,5,6].map((num, idx) => (<tr key={idx} className="bg-white border-b border-slate-100 last:border-none"><td className="w-24 border-r border-slate-200 p-0 h-[100px]"><div className="h-full flex items-center justify-center"><span className="font-black text-slate-200 text-3xl italic">0{num}</span></div></td><td className="p-0 h-[100px]"><div className="h-full flex items-center px-10"><span className="font-black text-slate-800 text-[18px] uppercase italic tracking-tight">{topics[idx] || "MATERI PEMBELAJARAN"}</span></div></td><td className="w-32 p-0 h-[100px]"><div className="h-full flex items-center justify-center"><div className="flex items-baseline gap-1"><span className="font-black text-orange-600 text-4xl italic">{scores[idx] || 0}</span><span className="text-slate-300 font-bold text-sm uppercase">/100</span></div></div></td></tr>))}</tbody></table></div><div className="p-10 bg-slate-900 rounded-[3rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden mb-2"><div className="space-y-0 relative z-10 flex flex-col justify-center"><p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.5em] mb-0">Evaluasi Kumulatif</p><div className="flex items-baseline gap-4 -mt-14"><p className="text-[18px] font-black text-white/40 uppercase tracking-widest">RATA-RATA:</p><h4 className="text-7xl font-black italic tracking-tighter text-white leading-tight">{avg}</h4><span className="text-2xl text-white/30 font-black italic uppercase tracking-widest leading-none">/ 100</span></div></div><div className="bg-white/10 p-6 rounded-[1.8rem] border border-white/20 text-center backdrop-blur-md relative z-10 min-w-[200px] overflow-hidden"><p className="text-[10px] font-black uppercase mb-1.5 tracking-widest text-orange-300">Status Capaian</p><p className="text-xl font-black italic tracking-tighter uppercase text-white mb-2">REMEDIAL</p><div className="absolute bottom-0 left-0 h-1.5 bg-orange-500 w-full shadow-[0_0_12px_rgba(249,115,22,0.8)]"></div></div></div></div>
                                 <div id={`milestone-render-${course.id}`} className="w-[794px] h-[1123px] bg-white p-20 pb-40 flex flex-col border relative overflow-hidden box-border"><div className="absolute top-0 left-0 w-[400px] h-[400px] bg-orange-50 rounded-full -ml-48 -mt-48 opacity-50"></div><div className="flex items-center gap-4 mb-10 relative z-10"><div className="w-14 h-14 bg-orange-900 text-white rounded-[1.2rem] flex items-center justify-center shadow-2xl rotate-6"><Zap size={28}/></div><h1 className="text-4xl font-black italic text-slate-800 uppercase leading-none tracking-tighter">Langkah <span className={themeColor}>Pembelajaran</span></h1></div><div className="space-y-8 mb-12 relative z-10"><div className={`flex items-center gap-5 ${themeColor} border-b-4 border-orange-50 pb-3`}><ClipboardList size={24}/><h3 className="text-base font-black uppercase tracking-[0.5em]">Log Pelaksanaan Sesi</h3></div><div className="space-y-4">{[1,2,3,4,5,6].map((num, idx) => { const l = pkgLogs.find(x => x.sessionNumber === num); return (<div key={idx} className="flex items-center gap-12 px-12 py-3 border-b border-slate-50 last:border-none group"><div className="font-black text-xl uppercase italic w-24 shrink-0 text-slate-400">SESI {num}</div><div className="flex-1 flex items-center justify-between"><p className="text-[13px] font-black text-slate-400 uppercase tracking-widest">{l ? formatDateToDMY(l.date) : "—"}</p><p className="text-[14px] font-black text-slate-800 uppercase italic">Durasi: 2 JAM / 120 MENIT</p></div></div>); })}</div></div><div className="space-y-6 relative z-10 flex-1 flex flex-col mb-16"><div className={`flex items-center gap-5 ${themeColor} border-b-4 border-orange-50 pb-3`}><Quote size={24}/><h3 className="text-base font-black uppercase tracking-[0.5em]">Ulasan Pengajar</h3></div><div className="flex-1 bg-gradient-to-br from-orange-50/50 to-white rounded-[3rem] border-4 border-slate-100 p-10 flex flex-col items-center justify-center text-center relative overflow-hidden"><p className="text-lg font-serif italic text-slate-700 leading-relaxed px-8 relative z-10 drop-shadow-sm break-words whitespace-normal overflow-wrap-anywhere max-w-full">"{nar}"</p></div></div><div className="mt-auto flex flex-col items-center opacity-30 pt-10 relative z-10 border-t-2 border-slate-100 pb-28"><div className={`w-14 h-14 ${isPass ? 'bg-blue-900' : 'bg-orange-900'} text-white rounded-[1rem] flex items-center justify-center mb-3`}><BadgeCheck size={28}/></div><p className="text-sm font-black uppercase tracking-widest text-slate-400">DOKUMEN RESMI SANUR AKADEMI</p></div></div>
                               </div>
                             );
                           }
                        })()}
                     </div>
                   )}
                </div>
              );
           })}
           {verifiedCourses.length === 0 && (
              <div className="col-span-full py-48 text-center bg-white rounded-[5rem] border-2 border-dashed border-slate-100 opacity-20">
                 <div className="flex flex-col items-center gap-8">
                    <BookOpen size={80} className="text-slate-300" />
                    <p className="font-black text-[13px] uppercase tracking-[0.5em] italic leading-relaxed text-center px-10">Belum ada kelas aktif. Segera lapor bayar ya! ✨</p>
                 </div>
              </div>
           )}
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
      {confirmingAbsen && (<div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in"><div className="bg-white w-full max-w-sm rounded-[4rem] p-12 shadow-2xl text-center space-y-8 relative overflow-hidden"><button onClick={() => setConfirmingAbsen(null)} className="absolute top-8 right-8 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button><div className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto animate-bounce relative z-10 shadow-xl"><Check size={40} strokeWidth={4} /></div><div className="space-y-2 relative z-10"><h4 className="text-2xl font-black text-slate-800 uppercase italic">Konfirmasi Sesi</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{confirmingAbsen.course.className} - SESI {confirmingAbsen.sessionNum}</p></div><div className="space-y-4 text-left relative z-10"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Kapan kamu belajarnya?</label><input type="date" value={selectedAbsenDate} onChange={e => setSelectedAbsenDate(e.target.value)} className="w-full px-8 py-5 bg-slate-50 rounded-[2rem] font-black text-[14px] outline-none border-2 border-emerald-500 shadow-inner" /></div><button onClick={handleConfirmAbsen} disabled={loading} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl relative z-10 active:scale-95 transition-all">SAYA SUDAH BELAJAR! ✨</button></div></div>)}
      {requestingReportFor && (<div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in"><div className="bg-white w-full max-w-md rounded-[4rem] p-12 md:p-14 shadow-2xl text-center space-y-10 relative overflow-hidden"><button onClick={() => setRequestingReportFor(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button><div className="space-y-6 relative z-10"><div className="w-20 h-20 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-3"><GraduationCap size={40} /></div><div><h4 className="text-3xl font-black text-slate-800 uppercase italic leading-none">Klaim Rapot</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{requestingReportFor.className}</p></div></div><div className="bg-slate-50 p-8 rounded-[2.5rem] text-left space-y-6 border border-slate-100 relative z-10"><p className="text-[11px] font-bold text-slate-600 italic leading-relaxed">"Silakan pilih Guru Pembimbing di bawah ini untuk mengirim data belajarmu ke antrean Rapot & Sertifikat. ✨"</p><div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><UserCog size={12}/> Pilih Guru Pembimbing</label><select value={selectedTeacherForReport} onChange={e => setSelectedTeacherForReport(e.target.value)} className="w-full px-8 py-5 bg-white rounded-[1.8rem] font-black text-[12px] uppercase outline-none border-2 border-blue-50 shadow-sm h-[60px] appearance-none"><option value="">-- PILIH GURU PEMBIMBING --</option>{teachers.filter(t => t.role === 'TEACHER').map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}</select></div></div><button onClick={handleRequestReport} disabled={!selectedTeacherForReport || loading} className="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl relative z-10 active:scale-95 transition-all flex items-center justify-center gap-3">{loading ? <Loader2 size={20} className="animate-spin" /> : <><Sparkles size={20} /> AJUKAN PERMINTAAN SEKARANG ✨</>}</button></div></div>)}
    </div>
  );
};

export default StudentPortal;

