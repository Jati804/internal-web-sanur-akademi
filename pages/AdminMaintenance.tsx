
import React, { useMemo, useState } from 'react';
import { Attendance, StudentPayment } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  Database, 
  Trash2, 
  Cloud, 
  Loader2, 
  CheckCircle,
  Calendar,
  Image as ImageIcon,
  HardDrive,
  Eye,
  Info,
  Activity,
  AlertTriangle,
  X,
  Check,
  RotateCcw
} from 'lucide-react';

interface AdminMaintenanceProps {
  attendanceLogs: Attendance[];
  setAttendanceLogs: React.Dispatch<React.SetStateAction<Attendance[]>>;
  studentPayments: StudentPayment[];
  setStudentPayments: React.Dispatch<React.SetStateAction<StudentPayment[]>>;
}

const AdminMaintenance: React.FC<AdminMaintenanceProps> = ({ 
  attendanceLogs, 
  setAttendanceLogs, 
  studentPayments, 
  setStudentPayments 
}) => {
  const [successMsg, setSuccessMsg] = useState('');
  const [showPreviewList, setShowPreviewList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<any | null>(null);
  const [showHardResetModal, setShowHardResetModal] = useState(false);

  const cloudMediaItems = useMemo(() => {
    const attItems = attendanceLogs
      .filter(l => l.receiptData && l.receiptData.length > 50)
      .map(l => ({ id: l.id, date: l.date, type: 'SESI', name: l.teacherName, img: l.receiptData }));
      
    const payItems = studentPayments
      .filter(p => p.receiptData && p.receiptData.length > 50)
      .map(p => ({ id: p.id, date: p.date, type: 'SPP', name: p.studentName, img: p.receiptData }));
    
    return [...attItems, ...payItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceLogs, studentPayments]);

  const totalReceiptsCount = cloudMediaItems.length;
  const storageLimit = 1000; 
  const storageUsagePercent = Math.min((totalReceiptsCount / storageLimit) * 100, 100);

  const executeDeleteMedia = async () => {
    if (!confirmDeleteModal) return;
    const item = confirmDeleteModal;
    setDeletingId(item.id);
    setConfirmDeleteModal(null);

    try {
      const tableName = item.type === 'SESI' ? 'attendance' : 'student_payments';
      await supabase.from(tableName).update({ receiptdata: null }).eq('id', item.id);
      
      if (item.type === 'SESI') {
        setAttendanceLogs(prev => prev.map(l => l.id === item.id ? { ...l, receiptData: '' } : l));
      } else {
        setStudentPayments(prev => prev.map(p => p.id === item.id ? { ...p, receiptData: '' } : p));
      }

      setSuccessMsg(`Media ${item.name} berhasil dibersihkan! ✨`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      alert("GAGAL MENGHAPUS: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const executeHardResetAttendance = async () => {
    setIsLoading(true);
    try {
      // Hapus SEMUA baris di tabel attendance
      const { error } = await supabase.from('attendance').delete().neq('id', '0'); // Hack untuk delete all
      if (error) throw error;

      setAttendanceLogs([]);
      setShowHardResetModal(false);
      setSuccessMsg("Semua Log Presensi Berhasil Dihapus! Database Bersih ✨");
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      alert("Reset Gagal: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 px-4 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-4">
           <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <Activity size={20} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Maintenance Zone</span>
           </div>
           <h2 className="text-4xl font-black text-slate-800 italic uppercase">Dashboard <span className="text-blue-600">Pemeliharaan</span></h2>
        </div>
        
        <button 
          onClick={() => setShowHardResetModal(true)}
          className="px-10 py-5 bg-rose-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-rose-700 transition-all flex items-center gap-3 active:scale-95"
        >
          <RotateCcw size={18} /> RESET SEMUA PRESENSI
        </button>
      </div>

      {successMsg && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] flex items-center gap-4 text-emerald-700 animate-in zoom-in duration-300 shadow-lg mx-2">
           <CheckCircle size={24} />
           <p className="font-black text-xs uppercase tracking-widest">{successMsg}</p>
        </div>
      )}

      {/* STORAGE CARD */}
      <div className="bg-white p-10 md:p-12 rounded-[4rem] border border-slate-100 shadow-2xl space-y-8 relative overflow-hidden mx-2">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full blur-[100px] -mr-40 -mt-40 opacity-30"></div>
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl"><HardDrive size={32} /></div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase italic">Kapasitas Media Cloud</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Estimasi jumlah gambar bukti bayar di database</p>
               </div>
            </div>
            <div className="text-right">
               <span className="text-3xl font-black italic text-slate-800">{totalReceiptsCount}</span>
               <span className="text-slate-300 font-black text-xl ml-2">/ {storageLimit} File</span>
            </div>
         </div>
         
         <div className="space-y-4 relative z-10">
            <div className="h-6 bg-slate-100 rounded-full overflow-hidden p-1.5 border border-slate-50 shadow-inner">
               <div 
                  className={`h-full rounded-full transition-all duration-1000 ${storageUsagePercent > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${storageUsagePercent}%` }}
               />
            </div>
         </div>
      </div>

      {/* GALERI MEDIA */}
      <div className="mx-2 bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col xl:flex-row items-center gap-12">
          <div className="flex-1 space-y-6 text-center xl:text-left">
            <div className="flex items-center gap-4 justify-center xl:justify-start">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl"><ImageIcon size={32} /></div>
                <h3 className="text-2xl font-black text-slate-800 uppercase italic">Galeri Media Terpilih</h3>
            </div>
            <button 
              onClick={() => setShowPreviewList(!showPreviewList)} 
              className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-3 active:scale-95 mx-auto xl:mx-0"
            >
              <Eye size={18} /> {showPreviewList ? 'Sembunyikan Galeri' : 'Buka Galeri Media Cloud'}
            </button>
          </div>
      </div>

      {showPreviewList && cloudMediaItems.length > 0 && (
        <div className="mx-2 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8 max-h-[700px] overflow-y-auto custom-scrollbar">
              {cloudMediaItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-[2.5rem] border border-transparent hover:border-blue-200 transition-all group flex flex-col h-full">
                    <div className="aspect-square bg-white rounded-[1.8rem] mb-5 overflow-hidden border border-slate-200 relative">
                        <img src={item.img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Receipt" />
                    </div>
                    <button 
                      onClick={() => setConfirmDeleteModal(item)}
                      className="w-full py-4 bg-white border border-slate-200 text-rose-500 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Trash2 size={14} /> HAPUS MEDIA
                    </button>
                  </div>
              ))}
            </div>
        </div>
      )}

      {/* MODAL RESET (HARD RESET) */}
      {showHardResetModal && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 text-center space-y-8 shadow-2xl relative border-4 border-rose-500">
              <button onClick={() => setShowHardResetModal(false)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <RotateCcw size={48} />
              </div>
              <div className="space-y-2">
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none text-rose-600">Reset Presensi?</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">
                    Tindakan ini akan **MENGHAPUS PERMANEN** semua log presensi, laporan, dan riwayat honor dari database. <br/><br/>
                    Gunakan ini hanya untuk **BERSIH-BERSIH** testing Kak! ✨
                 </p>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowHardResetModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button>
                 <button onClick={executeHardResetAttendance} disabled={isLoading} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18}/>} IYA, RESET
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL HAPUS MEDIA SATUAN */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative">
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-pulse"><AlertTriangle size={48} /></div>
              <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Hapus Media?</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Gambar milik {confirmDeleteModal.name} akan dihapus, tapi data laporan tetap ada.</p>
              <div className="flex gap-4">
                 <button onClick={() => setConfirmDeleteModal(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button>
                 <button onClick={executeDeleteMedia} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2"><Check size={18}/> HAPUS</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminMaintenance;
