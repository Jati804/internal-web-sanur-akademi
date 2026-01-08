
import React, { useMemo, useState, useRef } from 'react';
import { Attendance, StudentPayment, Transaction, User, StudentProfile } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  Database, 
  Trash2, 
  Cloud, 
  Loader2, 
  CheckCircle,
  ImageIcon,
  HardDrive,
  Eye,
  Info,
  Activity,
  AlertTriangle,
  X,
  Check,
  RotateCcw,
  Download,
  Upload,
  Zap,
  AlertCircle
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportDatabase = async () => {
    setIsLoading(true);
    try {
      const [att, pays, txs, profs, teach, sets, studs] = await Promise.all([
        supabase.from('attendance').select('*'),
        supabase.from('student_payments').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('student_profiles').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('student_accounts').select('*')
      ]);

      const fullData = {
        timestamp: new Date().toISOString(),
        version: "2.0",
        tables: {
          attendance: att.data,
          student_payments: pays.data,
          transactions: txs.data,
          student_profiles: profs.data,
          teachers: teach.data,
          settings: sets.data,
          student_accounts: studs.data
        }
      };

      const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BACKUP_SANUR_${new Date().toLocaleDateString('en-CA')}.json`;
      link.click();
      setSuccessMsg("Export Database Berhasil! ✨");
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      alert("Export Gagal: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.tables) throw new Error("Format file backup tidak valid!");
        
        if (!window.confirm("PERINGATAN: Mengimpor database akan menimpa data yang sudah ada (Upsert). Lanjutkan?")) return;
        
        setIsLoading(true);
        const { tables } = json;
        
        for (const [tableName, rows] of Object.entries(tables)) {
          if (Array.isArray(rows) && rows.length > 0) {
             const { error } = await supabase.from(tableName).upsert(rows);
             if (error) console.error(`Error importing ${tableName}:`, error);
          }
        }
        
        alert("Import Database Selesai! ✨ Silakan refresh halaman untuk memuat data baru.");
        window.location.reload();
      } catch (err: any) {
        alert("Import Gagal: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const executeHardResetAttendance = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        supabase.from('attendance').delete().neq('id', '0'),
        supabase.from('student_payments').delete().neq('id', '0'),
        supabase.from('transactions').delete().neq('id', '0')
      ]);

      setAttendanceLogs([]);
      setStudentPayments([]);
      setShowHardResetModal(false);
      setSuccessMsg("Sistem Berhasil Dikosongkan! (Presensi, Rapot, Pembayaran, Kas) ✨");
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
        
        <div className="flex gap-3">
           <button 
             onClick={() => setShowHardResetModal(true)}
             className="px-8 py-5 bg-rose-600 text-white rounded-[2rem] font-black text-[9px] uppercase tracking-widest shadow-xl hover:bg-rose-700 transition-all flex items-center gap-3 active:scale-95"
           >
             <RotateCcw size={16} /> RESET SEMUA DATA
           </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] flex items-center gap-4 text-emerald-700 animate-in zoom-in duration-300 shadow-lg mx-2">
           <CheckCircle size={24} />
           <p className="font-black text-xs uppercase tracking-widest">{successMsg}</p>
        </div>
      )}

      {/* [1] STORAGE CARD (TETAP DI ATAS) */}
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
            <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4">
              <Info size={18} className="text-blue-600 shrink-0"/>
              <p className="text-[10px] font-black text-blue-800 uppercase italic">"Tolong hapus foto yang sudah lama untuk meringankan memori sistem ya Kak! ✨"</p>
            </div>
         </div>
      </div>

      {/* [2] GALERI MEDIA (PINDAH KE TENGAH) */}
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

      {/* [3] DATABASE TRANSFER SECTION (PINDAH KE BAWAH) */}
      <div className="bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 shadow-2xl space-y-10 mx-2 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50"></div>
         <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl"><Database size={32} /></div>
            <div>
               <h3 className="text-2xl font-black text-slate-800 uppercase italic">Pindah Domain & Backup</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Simpan data lokal atau migrasi ke domain Sanur baru ✨</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <button 
              onClick={handleExportDatabase} 
              disabled={isLoading}
              className="p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] hover:bg-white hover:border-emerald-500 hover:shadow-2xl transition-all group text-center space-y-4"
            >
               <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Download size={32}/></div>
               <div>
                  <h4 className="font-black text-slate-800 uppercase italic">Export Database</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Unduh semua data dalam file JSON (Backup)</p>
               </div>
            </button>

            <div className="relative">
               <input type="file" ref={fileInputRef} onChange={handleImportDatabase} className="hidden" accept=".json" />
               <button 
                 onClick={() => fileInputRef.current?.click()} 
                 disabled={isLoading}
                 className="w-full p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] hover:bg-white hover:border-blue-500 hover:shadow-2xl transition-all group text-center space-y-4"
               >
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Upload size={32}/></div>
                  <div>
                     <h4 className="font-black text-slate-800 uppercase italic">Import Database</h4>
                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Unggah file JSON (Migrasi/Restore)</p>
                  </div>
               </button>
            </div>
         </div>
      </div>

      {/* MODALS */}
      {showHardResetModal && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 text-center space-y-8 shadow-2xl relative border-4 border-rose-500">
              <button onClick={() => setShowHardResetModal(false)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <RotateCcw size={48} />
              </div>
              <div className="space-y-2">
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none text-rose-600">RESET SEMUA DATA?</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">
                    Tindakan ini akan **MENGHAPUS PERMANEN**:<br/>
                    1. Semua Log Presensi & Histori Rapot<br/>
                    2. Histori Pembayaran SPP Siswa<br/>
                    3. Histori Buku Kas Ledger<br/><br/>
                    Gunakan ini hanya untuk **BERSIH-BERSIH** testing Kak! ✨
                 </p>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowHardResetModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button>
                 <button onClick={executeHardResetAttendance} disabled={isLoading} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18}/>} IYA, KOSONGKAN
                 </button>
              </div>
           </div>
        </div>
      )}

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
