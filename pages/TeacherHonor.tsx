import React, { useState, useMemo, useEffect } from 'react';
import { User, Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  ShieldCheck, Calendar, UserCheck, Package, ArrowRight,
  ClipboardCheck, Wallet, Edit3, Repeat, Heart, Sparkles,
  ChevronDown, Filter, Search, X, Printer, Eye, Layers, Loader2,
  Zap, Info, Trash2, AlertTriangle, Check, CheckCircle2
} from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const { Link, useLocation, useNavigate } = ReactRouterDOM as any;

interface TeacherHonorProps {
  user: User;
  logs: Attendance[];
  refreshAllData?: () => Promise<void>;
}

const TeacherHonor: React.FC<TeacherHonorProps> = ({ user, logs, refreshAllData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedYear, setSelectedYear] = useState('2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [confirmDeletePkg, setConfirmDeletePkg] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessMsg, setShowSuccessMsg] = useState('');

  const years = Array.from({ length: 11 }, (_, i) => (2024 + i).toString());

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return dateStr.split('-').reverse().join('/');
  };

  const getFullMonthName = () => {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();
  };

  const generateProRef = (id: string) => {
    const cleanId = id.replace(/PKG-|SIMULASI-|-/g, '').toUpperCase();
    return `SN/PAY/${selectedYear}/${cleanId.slice(-6)}`;
  };

  const handleDownloadPdf = async (pkg: any) => {
    setIsDownloading(pkg.id);
    setTimeout(async () => {
      const element = document.getElementById(`hidden-slip-${pkg.id}`);
      if (!element) {
        setIsDownloading(null);
        return;
      }
      try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, width: 700 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'px', [700, 1000]);
        pdf.addImage(imgData, 'PNG', 0, 0, 700, 1000);
        pdf.save(`SLIP_HONOR_${user.name.toUpperCase().replace(/\s+/g, '_')}_${pkg.id.slice(-8)}.pdf`);
      } catch (e) {
        alert("Gagal memproses file PDF.");
      } finally {
        setIsDownloading(null);
      }
    }, 400);
  };

  const handleDeletePackage = async () => {
    if (!confirmDeletePkg) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('packageid', confirmDeletePkg.id);
      
      if (error) throw error;
      if (refreshAllData) await refreshAllData();
      
      setShowSuccessMsg("Kotak Honor Berhasil Dihapus! ✨");
      setConfirmDeletePkg(null);
      setTimeout(() => setShowSuccessMsg(''), 3000);
    } catch (e: any) {
      alert("Gagal menghapus: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const highlightId = location.state?.highlightId;
    if (highlightId) {
      setTimeout(() => {
        const element = document.getElementById(highlightId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-blue-500', 'ring-offset-4', 'scale-[1.02]', 'duration-700');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-4', 'scale-[1.02]');
          }, 4000);
        }
      }, 500);
    }
  }, [location.state]);

  const cycleGroups = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    const groups: Record<string, any> = {};
    
    const relevantLogs = logs.filter(l => 
      (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG') && 
      (l.teacherId === user.id || l.originalTeacherId === user.id) &&
      l.date.startsWith(selectedYear) &&
      (l.earnings || 0) > 0
    );

    relevantLogs.forEach(log => {
      const pkgId = log.packageId || 'UNKNOWN';
      if (!groups[pkgId]) {
        const fullCycle = logs.filter(l => 
          l.packageId === pkgId && 
          (l.earnings || 0) > 0
        ).sort((a,b) => (a.sessionNumber||0) - (b.sessionNumber||0));

        const myEarningsInThisCycle = fullCycle
          .filter(l => l.teacherId === user.id)
          .reduce((sum, curr) => sum + (curr.earnings || 0), 0);
        
        const studentName = log.studentsAttended?.[0] || 'REGULER';
        
        // CEK APAKAH USER ADALAH PEMILIK SIKLUS (GURU ASLI)
        const isCycleOwner = fullCycle.some(l => l.originalTeacherId === user.id);

        groups[pkgId] = {
          id: pkgId,
          className: log.className || 'SLOT UMUM',
          studentName: studentName === 'REGULER' ? 'GABUNGAN' : studentName,
          category: log.sessionCategory || 'REGULER',
          logs: fullCycle,
          myTotalPaid: myEarningsInThisCycle,
          lastUpdate: log.date,
          status: fullCycle.some(l => l.teacherId === user.id && l.paymentStatus === 'UNPAID') ? 'ANTREAN' : 'LUNAS',
          receiptData: fullCycle.find(l => l.teacherId === user.id && l.paymentStatus === 'PAID')?.receiptData || null,
          fullClassName: log.className,
          paidSessionsDetails: fullCycle.filter(l => l.teacherId === user.id),
          isCycleOwner: isCycleOwner // SIMPAN STATUS KEPEMILIKAN
        };
      } else if (new Date(log.date) > new Date(groups[pkgId].lastUpdate)) {
        groups[pkgId].lastUpdate = log.date;
      }
    });

    let results = Object.values(groups);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter((g: any) => 
        g.className.toLowerCase().includes(term) ||
        g.studentName.toLowerCase().includes(term) ||
        g.id.toLowerCase().includes(term) ||
        formatDate(g.lastUpdate).includes(term)
      );
    }
    return results.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
  }, [logs, user.id, selectedYear, searchTerm]);

  const unpaidTotal = useMemo(() => 
    logs.filter(l => 
      l.teacherId === user.id && 
      l.paymentStatus === 'UNPAID' && 
      l.date.startsWith(selectedYear) &&
      (l.earnings || 0) > 0
    ).reduce((acc, curr) => acc + (curr.earnings || 0), 0)
  , [logs, user.id, selectedYear]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 px-4 animate-in">
      {showSuccessMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200000] px-10 py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 border-4 border-white/20">
           <CheckCircle2 size={28} /> {showSuccessMsg}
        </div>
      )}

      <header className="relative py-14 px-10 bg-slate-900 rounded-[4rem] text-white shadow-2xl overflow-hidden group">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-40 -mt-40"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                  <Sparkles size={14} className="text-yellow-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-300">Sanur Wallet System</span>
               </div>
               <h2 className="text-4xl font-black uppercase italic leading-none">Dompet <span className="text-blue-500">Honor</span></h2>
               <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic">Pantau riwayat mengajar & honor Kakak ✨</p>
            </div>
            <div className="flex bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 items-center gap-6 min-w-[260px]">
               <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/40"><Wallet size={32}/></div>
               <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Belum Cair ({selectedYear}):</p>
                  <h4 className="text-3xl font-black text-emerald-400 italic">Rp {unpaidTotal.toLocaleString()}</h4>
               </div>
            </div>
         </div>
      </header>

      <div className="flex flex-col lg:flex-row items-start justify-center gap-10 px-4 relative">
        <div className="hidden lg:block lg:flex-1"></div>
        <div className="flex bg-white p-2 rounded-[2.5rem] border border-slate-100 shadow-xl w-full lg:w-[400px] shrink-0">
           <Link to="/teacher" className="flex-1 py-4 px-8 rounded-[2rem] text-[10px] font-black uppercase transition-all text-center flex items-center justify-center gap-3 text-slate-400 hover:text-blue-600"><ClipboardCheck size={16}/> Presensi</Link>
           <Link to="/teacher/honor" className="flex-1 py-4 px-8 rounded-[2rem] text-[10px] font-black uppercase transition-all text-center flex items-center justify-center gap-3 bg-blue-600 text-white shadow-lg shadow-blue-200"><Wallet size={16}/> Honor</Link>
        </div>
        <div className="flex flex-col gap-4 w-full lg:w-72 lg:flex-1 items-center lg:items-end">
           <div className="w-full lg:w-48 relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500"><Filter size={18} /></div>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="pl-14 pr-12 py-4 bg-white border-2 border-slate-100 rounded-3xl font-black text-[10px] uppercase tracking-widest outline-none focus:border-blue-500 transition-all shadow-xl appearance-none cursor-pointer w-full">
                 {years.map(y => <option key={y} value={y}>TAHUN {y}</option>)}
              </select>
           </div>
           <div className="w-full lg:w-64 relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"><Search size={18} /></div>
              <input type="text" placeholder="CARI APAPUN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} className="w-full pl-14 pr-8 py-4 bg-white border-2 border-slate-100 rounded-3xl font-black text-[10px] uppercase outline-none focus:border-blue-500 transition-all shadow-xl" />
           </div>
        </div>
      </div>

      <div className="space-y-10">
         {cycleGroups.length > 0 ? cycleGroups.map((pkg) => (
            <div id={pkg.id} key={pkg.id} className="bg-white rounded-[4rem] border-2 border-slate-50 shadow-2xl overflow-hidden group hover:border-blue-200 transition-all duration-500 relative">
               
               {/* UPDATE: TOMBOL HAPUS (X) HANYA UNTUK PEMILIK SIKLUS ASLI (GURU ASLI) */}
               {pkg.status === 'ANTREAN' && pkg.isCycleOwner && (
                  <button 
                    onClick={() => setConfirmDeletePkg(pkg)}
                    className="absolute top-6 right-6 md:top-8 md:right-8 p-3 md:p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm z-30 active:scale-90"
                    title="Hapus Seluruh Kotak Honor Ini"
                  >
                    <X size={20} className="md:w-6 md:h-6" />
                  </button>
               )}

               <div className="p-8 md:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                  <div className="flex items-center gap-6 md:gap-8 flex-1 min-w-0">
                     <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${pkg.category === 'PRIVATE' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}><Package size={32} /></div>
                     <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                           <h4 className="text-lg md:text-2xl font-black text-slate-800 uppercase italic leading-tight">{pkg.className}</h4>
                           <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${pkg.category === 'PRIVATE' ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}>{pkg.category}</span>
                        </div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2 italic">Siswa: {pkg.studentName}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                           <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12}/> Update: {formatDate(pkg.lastUpdate)}</span>
                           <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${pkg.status === 'LUNAS' ? 'bg-emerald-600 text-white' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>{pkg.status}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 min-w-[180px] md:min-w-[200px] text-center shadow-inner">
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-1 italic">Diterima</p>
                     <p className="text-2xl md:text-3xl font-black italic tracking-tighter text-blue-600 whitespace-nowrap">Rp {pkg.myTotalPaid.toLocaleString()}</p>
                  </div>
               </div>
               
               <div className="px-6 md:px-10 pb-6">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sesi Anda</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-600 rounded-full ml-2"></div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Anda Gantikan Teman</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 p-6 md:p-8 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-inner">
                     {[1,2,3,4,5,6].map((num) => {
                        const log = pkg.logs.find((l: any) => l.sessionNumber === num);
                        const isCycleOwner = log && log.originalTeacherId === user.id;
                        const isMeTeaching = log && log.teacherId === user.id;
                        const isMeSubstituting = log && log.teacherId === user.id && log.originalTeacherId && log.originalTeacherId !== user.id;
                        const isMeDelegated = log && log.originalTeacherId === user.id && log.teacherId !== user.id;
                        
                        // UPDATE: TOMBOL EDIT HANYA UNTUK PEMILIK SIKLUS (GURU ASLI)
                        const canEdit = isCycleOwner && log.paymentStatus === 'UNPAID';
                        
                        let bgColor = "bg-white text-slate-200 border-dashed border-2 border-slate-100";
                        let label = "BELUM ADA";
                        let subInfo = "";
                        let dateText = "";
                        if (log) dateText = formatDate(log.date);

                        if (isMeTeaching && !isMeSubstituting) { 
                           bgColor = "bg-blue-600 text-white shadow-lg ring-4 ring-blue-50"; 
                           label = "SESI ANDA"; 
                        } else if (isMeSubstituting) { 
                           // Warna Orange Kereng tetap terjaga
                           bgColor = "bg-orange-600 text-white shadow-lg ring-4 ring-orange-100"; 
                           label = "MENGGANTIKAN"; 
                           subInfo = `Ganti: ${log.substituteFor?.split(' ')[0] || 'TEMAN'}`; 
                        } else if (isMeDelegated) { 
                           bgColor = "bg-slate-300 text-slate-500 shadow-sm border-slate-400"; 
                           label = "DIGANTIKAN"; 
                           subInfo = `Oleh: ${log.teacherName?.split(' ')[0]}`; 
                        } else if (log) { 
                           bgColor = "bg-slate-200 text-slate-400 opacity-50"; 
                           label = "GURU LAIN"; 
                        }

                        return (
                          <div key={num} className={`relative p-4 md:p-5 py-6 md:py-8 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-2 transition-all ${bgColor}`}>
                             {canEdit && (
                               <button 
                                 onClick={() => navigate('/teacher', { state: { editLog: log } })} 
                                 className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-8 h-8 md:w-10 md:h-10 bg-white text-slate-800 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-slate-100 z-20"
                               >
                                 <Edit3 size={14} />
                               </button>
                             )}
                             <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60">Sesi {num}</p>
                             <div className="transform scale-75 md:scale-100">
                                {isMeTeaching && !isMeSubstituting ? <UserCheck size={24}/> : isMeSubstituting ? <Repeat size={24}/> : isMeDelegated ? <Heart size={24}/> : <Zap size={24}/>}
                             </div>
                             <p className="text-[6px] md:text-[7px] font-black uppercase tracking-widest leading-none mt-1">{label}</p>
                             {subInfo && <p className="text-[5px] md:text-[6px] font-black uppercase opacity-90 mt-1">{subInfo}</p>}
                             {dateText && <div className="mt-2 pt-2 border-t border-white/20 w-full"><p className="text-[7px] md:text-[8px] font-black tracking-widest opacity-80">{dateText}</p></div>}
                          </div>
                        );
                     })}
                  </div>
               </div>

               {pkg.status === 'LUNAS' && (
                  <div className="px-6 md:px-10 pb-10 flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in">
                     <button onClick={() => setShowProofModal(pkg.receiptData)} className="px-8 md:px-10 py-4 md:py-5 bg-emerald-50 text-emerald-600 rounded-[1.8rem] font-black text-[10px] md:text-[11px] uppercase flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all border-2 border-emerald-100 shadow-sm">
                        <Eye size={22}/> LIHAT BUKTI BAYAR
                     </button>
                     <button onClick={() => handleDownloadPdf(pkg)} disabled={isDownloading === pkg.id} className="px-8 md:px-10 py-4 md:py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-[10px] md:text-[11px] uppercase flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50">
                        {isDownloading === pkg.id ? <><Loader2 size={22} className="animate-spin"/> PROSES...</> : <><Printer size={22}/> DOWNLOAD SLIP GAJI</>}
                     </button>
                  </div>
               )}
            </div>
         )) : (
            <div className="py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30">
               <ClipboardCheck size={64} className="mx-auto mb-6 text-slate-300" />
               <p className="font-black text-[11px] uppercase tracking-[0.4em] italic leading-relaxed text-center">Belum ada riwayat honor di tahun {selectedYear}. ✨</p>
            </div>
         )}
      </div>

      {/* MODAL KONFIRMASI HAPUS PAKET */}
      {confirmDeletePkg && (
        <div className="fixed inset-0 z-[110000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative border-t-8 border-rose-500">
              <button onClick={() => setConfirmDeletePkg(null)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <AlertTriangle size={48} />
              </div>
              <div className="space-y-2">
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Hapus Kotak Honor?</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">
                    Seluruh sesi dalam kelas <span className="text-slate-800 font-black underline">{confirmDeletePkg.className}</span> ini akan dihapus permanen Kak.
                 </p>
              </div>
              <div className="flex gap-4">
                 <button 
                   onClick={() => setConfirmDeletePkg(null)} 
                   className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                 >
                    BATAL
                 </button>
                 <button 
                   onClick={handleDeletePackage} 
                   disabled={isDeleting}
                   className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} IYA, HAPUS
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* HIDDEN SLIP GENERATOR */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
         {cycleGroups.map((pkg) => (
            <div id={`hidden-slip-${pkg.id}`} key={`hidden-${pkg.id}`} className="bg-white p-12 md:p-20 space-y-8 w-[700px] mx-auto overflow-hidden text-slate-900">
               <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10">
                 <div className="min-w-0">
                   <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">SANUR</h1>
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mt-1">Akademi Inspirasi</p>
                 </div>
                 <div className="text-right flex flex-col items-end">
                   <h2 className="text-xl font-black uppercase italic text-slate-800 leading-none">SLIP HONOR DIGITAL</h2>
                   <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-2 whitespace-nowrap">REF: {generateProRef(pkg.id)}</p>
                 </div>
               </div>
               <div className="grid grid-cols-12 gap-8">
                 <div className="col-span-4 pr-6 border-r border-slate-50">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Pengajar:</p>
                   <p className="text-[13px] font-black text-slate-900 uppercase italic leading-tight">{user.name}</p>
                 </div>
                 <div className="col-span-5 pr-6 border-r border-slate-50">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ruangan Kelas:</p>
                   <p className="text-[13px] font-bold text-slate-800 uppercase leading-tight">{pkg.fullClassName}</p>
                   
                   {/* Nama Siswa Private di Slip */}
                   {pkg.category === 'PRIVATE' && (
                     <div className="mt-2">
                        <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest">Siswa Private:</p>
                        <p className="text-[11px] font-black text-blue-600 uppercase italic leading-none">{pkg.studentName}</p>
                     </div>
                   )}
                 </div>
                 <div className="col-span-3 text-right">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Bulan Terbit:</p>
                   <p className="text-[13px] font-black text-blue-600 uppercase italic leading-tight">{getFullMonthName()}</p>
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="flex items-center gap-3 text-slate-400 border-b-2 border-slate-50 pb-2"><Layers size={14} /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Rincian Per Sesi</p></div>
                 <table className="w-full text-left table-fixed"><tbody className="divide-y divide-slate-50">{pkg.paidSessionsDetails.map((s: any, idx: number) => (<tr key={idx} className="align-middle"><td className="py-4 text-center font-black text-slate-400 text-[11px] w-12">{s.sessionNumber}</td><td className="py-4 px-4"><p className="font-black text-slate-800 text-[13px] uppercase leading-tight">{formatDate(s.date)}</p></td><td className="py-4 text-center w-24"><span className="text-blue-600 font-black text-[11px] uppercase tracking-wide">{s.duration || 2} JAM</span></td><td className="py-4 text-right font-black text-slate-900 text-[13px]">Rp {s.earnings?.toLocaleString()}</td></tr>))}</tbody></table>
               </div>
               <div className="pt-8 border-t-2 border-slate-900">
                 <div className="flex justify-between items-start h-[32px]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOTAL TERAKUMULASI:</p><div className="text-right flex flex-col items-end"><p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Terverifikasi Sistem</p><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Status: LUNAS</p></div></div>
                 <p className="text-5xl font-black text-emerald-600 italic leading-none mt-4 text-left">Rp {pkg.myTotalPaid.toLocaleString()}</p>
               </div>
               <div className="pt-10 border-t border-slate-100 flex justify-between items-end gap-10"><div className="max-w-xs"><p className="text-[10px] font-bold text-slate-400 italic leading-relaxed">"Slip ini adalah bukti pembayaran sah dari sistem internal Sanur Akademi Inspirasi. Pajak ditanggung lembaga."</p></div><div className="text-center flex flex-col items-center shrink-0"><ShieldCheck size={44} className="text-slate-900 opacity-20 mb-2" /><p className="text-[13px] font-black uppercase text-slate-900 tracking-tight leading-none">Finance Sanur</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">Official Digital Slip</p></div></div>
            </div>
         ))}
      </div>

      {showProofModal && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-6" onClick={() => setShowProofModal(null)}>
           <div className="relative max-w-2xl w-full">
              <button className="absolute -top-12 right-0 p-4 text-white hover:text-rose-500 transition-colors" onClick={() => setShowProofModal(null)}><X size={32}/></button>
              <img src={showProofModal} className="w-full h-auto rounded-[3rem] shadow-2xl border-4 border-white/10" alt="Bukti Transfer" />
              <div className="mt-8 text-center"><p className="text-[10px] font-black text-white/50 uppercase tracking-[0.5em] italic">Bukti Transfer Sah dari Pengurus Sanur ✨</p></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeacherHonor;
