import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Attendance, StudentPayment } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  Database, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  ImageIcon,
  Eye,
  Activity,
  AlertTriangle,
  X,
  Check,
  RotateCcw,
  Download,
  Upload,
  Zap,
  Calendar,
  ShieldAlert,
  FileCheck,
  Lock,
  Unlock,
  ClipboardList,
  FileCode,
  Eraser,
  Key,
  ShieldCheck,
  Maximize2,
  Terminal,
  ShieldX
} from 'lucide-react';

interface AdminMaintenanceProps {
  attendanceLogs: Attendance[];
  setAttendanceLogs: React.Dispatch<React.SetStateAction<Attendance[]>>;
  studentPayments: StudentPayment[];
  setStudentPayments: React.Dispatch<React.SetStateAction<StudentPayment[]>>;
  refreshAllData?: () => Promise<void>;
}

const AdminMaintenance: React.FC<AdminMaintenanceProps> = ({ 
  attendanceLogs, 
  studentPayments,
  refreshAllData
}) => {
  // Security Gate State (Halaman Utama)
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Security Gate Khusus Tombol Reset (Dangerous Action)
  const [isResetGateOpen, setIsResetGateOpen] = useState(false);
  const [resetGatePin, setResetGatePin] = useState('');
  const [resetGateError, setResetGateError] = useState(false);

  const [processingStatus, setProcessingStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE');
  const [loadingText, setLoadingText] = useState('');
  const [successText, setSuccessText] = useState('');
  
  const [showPreviewList, setShowPreviewList] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any[] | null>(null);
  const [isMaintMode, setIsMaintMode] = useState(false);
  
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [skipPhotos, setSkipPhotos] = useState(true); 
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [confirmDeleteMedia, setConfirmDeleteMedia] = useState<any | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [showHardResetModal, setShowHardResetModal] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [isFetchingGallery, setIsFetchingGallery] = useState(false);
  
  const [mediaStats, setMediaStats] = useState({ count: 0, limit: 150 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // REF UNTUK AUTO SCROLL MODAL ✨
  const importResultsRef = useRef<HTMLDivElement>(null);
  const pasteModalRef = useRef<HTMLDivElement>(null);
  const resetGateRef = useRef<HTMLDivElement>(null);
  const purgeModalRef = useRef<HTMLDivElement>(null);
  const hardResetModalRef = useRef<HTMLDivElement>(null);
  const deleteMediaModalRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLDivElement>(null);
  const loadingOverlayRef = useRef<HTMLDivElement>(null);

  const DB_COLUMNS: Record<string, string[]> = {
    settings: ['key', 'value'],
    teachers: ['id', 'name', 'role', 'username', 'pin'],
    student_accounts: ['id', 'name', 'role', 'username', 'pin'],
    student_profiles: ['id', 'name', 'dob', 'institution', 'personalphone', 'parentphone', 'enrolledclass', 'notes'],
    transactions: ['id', 'type', 'category', 'amount', 'date', 'description'],
    attendance: ['id', 'teacherid', 'teachername', 'date', 'clockin', 'status', 'classname', 'level', 'sessioncategory', 'duration', 'packageid', 'sessionnumber', 'studentsattended', 'studentsessions', 'studentscores', 'studenttopics', 'studentnarratives', 'earnings', 'paymentstatus', 'reportnarrative', 'receiptdata', 'substitutefor', 'originalteacherid'],
    student_payments: ['id', 'studentname', 'classname', 'amount', 'date', 'status', 'note', 'receiptdata'],
    sales_contacts: ['id', 'institution_name', 'contact_person', 'job_title', 'phone', 'email', 'last_contact_date', 'next_followup_date', 'deal_status', 'meeting_notes'],
    student_attendance: ['id', 'packageid', 'studentname', 'sessionnumber', 'date', 'clockin', 'duration', 'classname', 'level', 'sessioncategory', 'studentscores', 'studenttopics', 'studentnarratives', 'reportnarrative'],
    maintenance_notes: ['id', 'content', 'last_modified']
  };

  const fetchMediaCount = async () => {
    try {
      const { count: attCount } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).not('receiptdata', 'is', null);
      const { count: payCount } = await supabase.from('student_payments').select('*', { count: 'exact', head: true }).not('receiptdata', 'is', null);
      setMediaStats(prev => ({ ...prev, count: (attCount || 0) + (payCount || 0) }));
    } catch (e) {}
  };

  useEffect(() => {
  const init = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').eq('key', 'system_status').single();
      if (data?.value?.maintenance) setIsMaintMode(true);
      fetchMediaCount();
    } catch (e) {}
  };
  init();
}, []);

// AUTO SCROLL KE MODAL IMPORT RESULTS ✨
useEffect(() => {
  if (importResults && importResultsRef.current) {
    setTimeout(() => {
      importResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}, [importResults]);

// AUTO SCROLL KE MODAL PASTE ✨
useEffect(() => {
  if (showPasteModal && pasteModalRef.current) {
    setTimeout(() => {
      pasteModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}, [showPasteModal]);

// AUTO SCROLL KE MODAL RESET GATE ✨
useEffect(() => {
  if (isResetGateOpen && resetGateRef.current) {
    setTimeout(() => {
      resetGateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}, [isResetGateOpen]);

// AUTO SCROLL KE MODAL PURGE ✨
useEffect(() => {
  if (confirmPurge && purgeModalRef.current) {
    setTimeout(() => {
      purgeModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}, [confirmPurge]);

// AUTO SCROLL KE MODAL HARD RESET ✨
useEffect(() => {
  if (showHardResetModal && hardResetModalRef.current) {
    setTimeout(() => {
      hardResetModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}, [showHardResetModal]);

// AUTO SCROLL KE MODAL DELETE MEDIA ✨
useEffect(() => {
  if (confirmDeleteMedia && deleteMediaModalRef.current) {
    setTimeout(() => {
      deleteMediaModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}, [confirmDeleteMedia]);

// AUTO SCROLL KE MODAL PREVIEW IMAGE ✨
useEffect(() => {
  if (previewImg && previewImgRef.current) {
    setTimeout(() => {
      previewImgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}, [previewImg]);

// AUTO SCROLL KE LOADING OVERLAY ✨
useEffect(() => {
  if (processingStatus !== 'IDLE' && loadingOverlayRef.current) {
    setTimeout(() => {
      loadingOverlayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}, [processingStatus]);

  const handleVerifyGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityPin === '201261') {
      setIsAuthorized(true);
    } else {
      setPinError(true);
      setSecurityPin('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  // Verifikasi PIN untuk membuka Reset
  const handleVerifyResetGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetGatePin === '201261') {
      setIsResetGateOpen(false);
      setResetGatePin('');
      setShowHardResetModal(true);
    } else {
      setResetGateError(true);
      setResetGatePin('');
      setTimeout(() => setResetGateError(false), 2000);
    }
  };

  const triggerSuccessOverlay = (msg: string) => {
    setProcessingStatus('SUCCESS');
    setSuccessText(msg);
    setTimeout(() => {
      setProcessingStatus('IDLE');
      setSuccessText('');
    }, 1500); 
  };

  const handleAutoPurgeMedia = async () => {
    setProcessingStatus('LOADING');
    setLoadingText("MEMINDAI SELURUH MEDIA LAMA...");
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const limitDate = threeDaysAgo.toISOString().split('T')[0];

      const { error: err1 } = await supabase
        .from('attendance')
        .update({ receiptdata: null })
        .lte('date', limitDate)
        .not('receiptdata', 'is', null);
      
      if (err1) throw err1;
      
      const { error: err2 } = await supabase
        .from('student_payments')
        .update({ receiptdata: null })
        .lte('date', limitDate)
        .not('receiptdata', 'is', null);

      if (err2) throw err2;

      fetchMediaCount();
      if (refreshAllData) await refreshAllData();
      setConfirmPurge(false);
      triggerSuccessOverlay("SELURUH MEDIA LAMA BERSIH! 🧹✨");
    } catch (e: any) {
      alert(e.message);
      setProcessingStatus('IDLE');
    }
  };

  const startRestoreEngine = async (tables: any) => {
    setProcessingStatus('LOADING');
    setLoadingText("MEMULIHKAN CLOUD...");
    setImportProgress(0);
    const resultsSummary: any[] = [];
    const tableOrder = ['settings', 'teachers', 'student_accounts', 'student_profiles', 'transactions', 'attendance', 'student_payments', 'sales_contacts', 'student_attendance', 'maintenance_notes'];

    try {
      for (let i = 0; i < tableOrder.length; i++) {
        const tableName = tableOrder[i];
        const rawRows = tables[tableName] || [];
        
        if (!Array.isArray(rawRows) || rawRows.length === 0) {
          resultsSummary.push({ name: tableName, status: 'SKIPPED', count: 0 });
          continue;
        }

        setLoadingText(`TABEL: ${tableName.toUpperCase()}`);
        let successCount = 0;
        let failCount = 0;
        const batchSize = 5; 
        const totalBatches = Math.ceil(rawRows.length / batchSize);

        for (let b = 0; b < totalBatches; b++) {
          const start = b * batchSize;
          const end = Math.min(start + batchSize, rawRows.length);
          const currentBatch = rawRows.slice(start, end);

          const batchPromises = currentBatch.map(async (row) => {
            if (!row || typeof row !== 'object') return false;
            const validCols = DB_COLUMNS[tableName] || [];
            const cleanedRow: any = {};
            
            Object.keys(row).forEach(key => {
              const lowKey = key.toLowerCase().trim();
              if (validCols.includes(lowKey)) {
                let val = row[key];
                if (skipPhotos && lowKey === 'receiptdata') val = null;
                if (tableName === 'attendance' && ['studentsattended', 'studentsessions', 'studentscores', 'studenttopics', 'studentnarratives'].includes(lowKey)) {
                  if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                    try { val = JSON.parse(val); } catch(e) {}
                  }
                }
                cleanedRow[lowKey] = val;
              }
            });

            const conflictCol = tableName === 'settings' ? 'key' : 'id';
            const { error } = await supabase.from(tableName).upsert([cleanedRow], { onConflict: conflictCol });
            return !error;
          });

          const results = await Promise.all(batchPromises);
          results.forEach(res => res ? successCount++ : failCount++);
          const globalBase = (i / tableOrder.length) * 100;
          const tablePortion = (b / totalBatches) * (100 / tableOrder.length);
          setImportProgress(Math.round(globalBase + tablePortion));
          await new Promise(r => setTimeout(r, 100));
        }
        resultsSummary.push({ name: tableName, count: successCount, status: failCount > 0 ? (successCount > 0 ? 'PARTIAL' : 'ERROR') : 'SUCCESS' });
      }
      setImportProgress(100);
      setImportResults(resultsSummary);
      fetchMediaCount();
      if (refreshAllData) await refreshAllData();
      setProcessingStatus('IDLE');
    } catch (e: any) {
      alert("SISTEM MACET: " + e.message);
      setProcessingStatus('IDLE');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingStatus('LOADING');
    setLoadingText('MEMBACA FILE...');
    setImportProgress(2);
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          if (!content) throw new Error("File kosong.");
          setLoadingText('MENGURAI DATA...');
          const json = JSON.parse(content.trim().replace(/^\uFEFF/, ''));
          const tables = json.tables || json; 
          await startRestoreEngine(tables);
        } catch (err: any) { 
          alert("GAGAL: Pastikan ini file JSON Backup Sanur. " + err.message); 
          setProcessingStatus('IDLE');
        } finally {
          if (e.target) e.target.value = '';
        }
      };
      reader.readAsText(file);
    }, 300);
  };

  const handleImportPaste = async () => {
    const rawText = textareaRef.current?.value || '';
    if (!rawText.trim()) return alert("Tempel dulu datanya Kak! ✨");
    setProcessingStatus('LOADING');
    setLoadingText('MENGURAI TEKS...');
    setTimeout(async () => {
      try {
        const json = JSON.parse(rawText.trim().replace(/^\uFEFF/, ''));
        const tables = json.tables || json;
        setShowPasteModal(false);
        await startRestoreEngine(tables);
      } catch (e: any) { 
        alert("Gagal mengurai teks JSON."); 
        setProcessingStatus('IDLE');
      }
    }, 500);
  };

  const handleExportDatabase = async () => {
    setProcessingStatus('LOADING');
    setLoadingText('MEMBUAT SNAPSHOT...');
    try {
      const tablesToExport = ['settings', 'teachers', 'student_accounts', 'student_profiles', 'transactions', 'attendance', 'student_payments', 'sales_contacts', 'student_attendance', 'maintenance_notes'];
      const tablesData: Record<string, any> = {};
      for(let i = 0; i < tablesToExport.length; i++) {
        const tName = tablesToExport[i];
        setImportProgress(Math.round((i / tablesToExport.length) * 100));
        const { data, error } = await supabase.from(tName).select('*');
        if (error) throw error;
        tablesData[tName] = data || [];
      }
      const blob = new Blob([JSON.stringify({ meta: { timestamp: new Date().toISOString() }, tables: tablesData })], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SANUR_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      triggerSuccessOverlay("BACKUP SIAP! ✨");
    } catch (e: any) { alert("Export Gagal: " + e.message); setProcessingStatus('IDLE'); } 
  };

  const toggleMaintenance = async () => {
    const nextState = !isMaintMode;
    setProcessingStatus('LOADING');
    setLoadingText("MENGUBAH STATUS...");
    try {
      await supabase.from('settings').upsert({
        key: 'system_status',
        value: { maintenance: nextState, updatedAt: new Date().toISOString() }
      });
      setIsMaintMode(nextState);
      triggerSuccessOverlay(nextState ? "SISTEM TERKUNCI! 🔒" : "SISTEM ONLINE! 🌐");
    } catch (e) {
      alert("Gagal update status sistem.");
      setProcessingStatus('IDLE');
    }
  };

  const fetchGalleryMedia = async () => {
    setIsFetchingGallery(true);
    try {
      const { data: attData } = await supabase.from('attendance').select('id, teachername, date, receiptdata').not('receiptdata', 'is', null).order('date', { ascending: false }).limit(40);
      const { data: payData } = await supabase.from('student_payments').select('id, studentname, date, receiptdata').not('receiptdata', 'is', null).order('date', { ascending: false }).limit(40);
      const attItems = (attData || []).map(l => ({ id: l.id, date: l.date, type: 'SESI', name: l.teachername, img: l.receiptdata }));
      const payItems = (payData || []).map(p => ({ id: p.id, date: p.date, type: 'SPP', name: p.studentname, img: p.receiptdata }));
      setGalleryItems([...attItems, ...payItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      fetchMediaCount();
    } catch (e) { console.error(e); } finally { setIsFetchingGallery(false); }
  };

  const handleToggleGallery = () => {
    const nextState = !showPreviewList;
    setShowPreviewList(nextState);
    if (nextState) fetchGalleryMedia();
  };

  const executeHardResetAttendance = async () => {
    setProcessingStatus('LOADING');
    setLoadingText("MEMBERSIHKAN DATA...");
    try {
      await Promise.all([
        supabase.from('attendance').delete().not('id', 'is', null),
        supabase.from('student_payments').delete().not('id', 'is', null),
        supabase.from('transactions').delete().not('id', 'is', null)
      ]);
      fetchMediaCount();
      if (refreshAllData) await refreshAllData();
      setShowHardResetModal(false);
      triggerSuccessOverlay("DATA BERSIH! ✨");
    } catch (e: any) { alert(e.message); setProcessingStatus('IDLE'); }
  };

  const executeDeleteMedia = async () => {
    if (!confirmDeleteMedia) return;
    setProcessingStatus('LOADING');
    setLoadingText("MENGHAPUS FOTO...");
    try {
      const table = confirmDeleteMedia.type === 'SESI' ? 'attendance' : 'student_payments';
      await supabase.from(table).update({ receiptdata: null }).eq('id', confirmDeleteMedia.id);
      if (refreshAllData) await refreshAllData();
      setConfirmDeleteMedia(null);
      fetchGalleryMedia();
      triggerSuccessOverlay("FOTO TERHAPUS! ✨");
    } catch (e: any) { alert(e.message); setProcessingStatus('IDLE'); }
  };

  const handleCloseImportResults = async () => {
    setProcessingStatus('LOADING');
    setLoadingText("FINALISASI...");
    if (refreshAllData) await refreshAllData();
    setImportResults(null);
    setProcessingStatus('IDLE');
  };

  const mediaUsagePercent = Math.min((mediaStats.count / mediaStats.limit) * 100, 100);
  const isStorageCritical = mediaUsagePercent > 80;

  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-[4rem] p-10 md:p-14 shadow-2xl border-4 border-slate-900 text-center space-y-10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
           
           <div className="space-y-6 relative z-10">
              <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <AlertTriangle size={56} />
              </div>
              <div>
                 <h2 className="text-3xl font-black text-slate-800 uppercase italic leading-none tracking-tighter">AREA <span className="text-rose-600">BERBAHAYA</span></h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">Sistem Engine Hanya Untuk Pembuat Website</p>
              </div>
           </div>

           <form onSubmit={handleVerifyGate} className="space-y-6 relative z-10">
              <div className={`space-y-3 transition-all ${pinError ? 'animate-shake' : ''}`}>
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Key size={12} className="text-blue-500" /> Masukkan PIN Rahasia:
                 </label>
                 <input 
                    autoFocus
                    type="password" 
                    value={securityPin}
                    maxLength={6}
                    onChange={e => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                    className={`w-full py-5 bg-slate-50 rounded-[1.8rem] text-center font-black text-3xl tracking-[0.6em] outline-none border-4 transition-all ${pinError ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-transparent focus:border-blue-600 focus:bg-white'}`}
                    placeholder="******"
                 />
              </div>
              <button 
                 type="submit"
                 className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                 <ShieldCheck size={18} /> KONFIRMASI AKSES
              </button>
           </form>

           <div className="pt-6 border-t border-slate-100">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">"Akses ini dibatasi untuk melindungi integritas data Sanur."</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 px-4 animate-in">
      {processingStatus !== 'IDLE' && (
  <div className="fixed inset-0 z-[200000] bg-slate-900/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 overflow-y-auto">
     {processingStatus === 'LOADING' ? (
       <div className="my-auto" ref={loadingOverlayRef}>
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl flex flex-col items-center gap-8 w-full max-w-sm">
              <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-xl animate-bounce">
                  <Loader2 className="animate-spin text-white" size={48} />
              </div>
              <div className="text-center space-y-4 w-full">
                  <p className="text-[12px] font-black uppercase tracking-[0.4em] italic text-blue-600">{loadingText}</p>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{importProgress}% PROGRESS</p>
              </div>
           </div>
        </div>
     ) : (
       <div className="my-auto" ref={loadingOverlayRef}>
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl flex flex-col items-center gap-8 w-full max-w-sm border-b-8 border-emerald-500">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-inner">
                  <CheckCircle2 size={72} className="fill-emerald-500 text-white" />
              </div>
              <div className="text-center">
                  <h3 className="text-2xl font-black text-slate-800 uppercase italic leading-none mb-3">BERHASIL!</h3>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">{successText}</p>
              </div>
           </div>
        </div>
     )}
  </div>
)}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-4">
           <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <Activity size={20} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Engine Control</span>
           </div>
           <h2 className="text-4xl font-black text-slate-800 italic uppercase leading-none">Pusat <span className="text-blue-600">Sistem</span></h2>
        </div>
        
        {/* BUTTON RESET DENGAN WRAPPER KEAMANAN */}
        <button 
          onClick={() => setIsResetGateOpen(true)} 
          className="px-10 py-5 bg-rose-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-rose-700 transition-all flex items-center gap-3 active:scale-95 ring-4 ring-rose-500/40"
        >
          <ShieldAlert size={20} /> RESET SELURUH DATA
        </button>
      </div>

      <div className={`p-10 rounded-[4rem] border-2 transition-all duration-700 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10 ${isMaintMode ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white border-slate-100'}`}>
         <div className="flex items-center gap-8 relative z-10">
            <div className={`w-20 h-20 rounded-[2.2rem] flex items-center justify-center shadow-xl rotate-3 transition-colors ${isMaintMode ? 'bg-white text-orange-600' : 'bg-orange-50 text-orange-600'}`}><Lock size={40} /></div>
            <div className="text-center md:text-left">
               <h3 className={`text-2xl font-black uppercase italic leading-none ${isMaintMode ? 'text-white' : 'text-slate-800'}`}>Mode Perbaikan</h3>
               <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isMaintMode ? 'text-orange-100' : 'text-slate-400'}`}>{isMaintMode ? "HANYA ADMIN YANG BISA LOGIN" : "LOGIN NORMAL (ONLINE)"}</p>
            </div>
         </div>
         <button onClick={toggleMaintenance} className={`px-10 py-6 rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-3 border-4 ${isMaintMode ? 'bg-white text-orange-600 border-orange-400' : 'bg-slate-900 text-white border-slate-800'}`}>
           {isMaintMode ? <><Unlock size={18}/> BUKA AKSES LOGIN</> : <><Lock size={18}/> AKTIFKAN MAINTENANCE</>}
         </button>
      </div>

      <div className="bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 shadow-2xl space-y-10 mx-2 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50"></div>
         <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl"><Database size={32} /></div>
            <div>
               <h3 className="text-2xl font-black text-slate-800 uppercase italic">Sinkronisasi Cloud</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gunakan opsi "Import Ringan" jika file backup Kakak sudah berukuran mega-byte. ✨</p>
            </div>
         </div>

         <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${skipPhotos ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{skipPhotos ? <Zap size={20}/> : <ImageIcon size={20}/>}</div>
                <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 italic">Mode Import Ringan (Anti-Pusing)</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Abaikan data Foto Bukti Bayar agar browser tidak hang saat membaca file raksasa.</p>
                </div>
            </div>
            <button onClick={() => setSkipPhotos(!skipPhotos)} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase transition-all shadow-sm ${skipPhotos ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {skipPhotos ? 'AKTIF: TANPA FOTO ✅' : 'NONAKTIF: TERMASUK FOTO ⚠️'}
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <button onClick={handleExportDatabase} className="p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] hover:bg-white hover:border-emerald-500 transition-all text-center space-y-4">
               <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-emerald-600"><Download size={32}/></div>
               <h4 className="font-black text-slate-800 uppercase italic">Export Snapshot</h4>
            </button>
            <button onClick={() => setShowPasteModal(true)} className="p-10 bg-blue-50/30 border-2 border-dashed border-blue-200 rounded-[3rem] hover:bg-white hover:border-blue-600 transition-all text-center space-y-4">
               <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-blue-600"><ClipboardList size={32}/></div>
               <h4 className="font-black text-slate-800 uppercase italic">Import Box (Paste)</h4>
            </button>
            <div className="relative">
               <input key={Date.now()} type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json,application/json" />
               <button onClick={() => fileInputRef.current?.click()} className="w-full p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] hover:bg-white hover:border-emerald-600 transition-all text-center space-y-4 group">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-emerald-600"><Upload size={32}/></div>
                  <h4 className="font-black text-slate-800 uppercase italic">Upload File JSON</h4>
               </button>
            </div>
         </div>
      </div>

      <div className="mx-2 bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col xl:flex-row items-center gap-12">
          <div className="flex-1 space-y-8 text-center xl:text-left">
            <div className="flex items-center gap-4 justify-center xl:justify-start">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl"><ImageIcon size={32} /></div>
                <h3 className="text-2xl font-black text-slate-800 uppercase italic">Galeri & Optimasi Media</h3>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4 max-w-md mx-auto xl:mx-0">
               <div className="flex justify-between items-center px-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isStorageCritical ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>Kapasitas Memori Cloud</span>
                  <span className="text-[11px] font-black text-slate-800 italic">{mediaStats.count} / {mediaStats.limit} FOTO</span>
               </div>
               <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden p-1 shadow-inner border border-slate-300">
                  <div className={`h-full rounded-full transition-all duration-1000 ${isStorageCritical ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-blue-600'}`} style={{ width: `${mediaUsagePercent}%` }}></div>
               </div>
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic text-center">Hapus foto lama untuk menjaga sistem tetap kencang! ⚡</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center xl:justify-start">
               <button onClick={handleToggleGallery} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95">
                  {isFetchingGallery ? <Loader2 className="animate-spin" size={18} /> : <Eye size={18} />} {showPreviewList ? 'Tutup Galeri' : 'Buka Galeri Foto'}
               </button>
               
               <button onClick={() => setConfirmPurge(true)} className="px-10 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ring-4 ring-rose-500/20">
                  <Eraser size={18} /> PURGE MEDIA &gt; 3 HARI ✨
               </button>
            </div>
          </div>
      </div>

      {showPreviewList && galleryItems.length > 0 && (
        <div className="mx-2 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8 max-h-[700px] overflow-y-auto custom-scrollbar">
              {galleryItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-[2.5rem] border border-transparent hover:border-blue-200 transition-all group flex flex-col h-full shadow-sm">
                    <div className="aspect-square bg-white rounded-[1.8rem] mb-5 overflow-hidden border border-slate-200 relative cursor-pointer" onClick={() => setPreviewImg(item.img)}>
                        <img src={item.img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Receipt" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Eye size={32} className="text-white" /></div>
                    </div>
                    <div className="px-2 mb-6 space-y-2">
                       <p className="text-[11px] font-black text-slate-800 uppercase italic truncate">{item.name}</p>
                       <div className="flex items-center gap-2 text-blue-600"><Calendar size={12} /><p className="text-[10px] font-black tracking-widest">{item.date}</p></div>
                    </div>
                    <div className="flex gap-2 mt-auto">
                        <button onClick={() => { const link = document.createElement('a'); link.href = item.img; link.download = `SANUR_${item.name}.png`; link.click(); }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"><Download size={14} /> UNDUH</button>
                        <button onClick={() => setConfirmDeleteMedia(item)} className="flex-1 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 border border-rose-100 active:scale-95"><Trash2 size={14} /> HAPUS</button>
                    </div>
                  </div>
              ))}
            </div>
        </div>
      )}

      {importResults && (
  <div className="fixed inset-0 z-[300000] bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto">
     <div className="my-auto" ref={importResultsRef}>
        <div className="bg-white w-full max-w-lg rounded-[4rem] p-10 md:p-14 shadow-2xl relative overflow-hidden flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2.2rem] flex items-center justify-center mb-8 shadow-inner"><FileCheck size={40}/></div>
              <h3 className="text-3xl font-black text-slate-800 uppercase italic mb-2 leading-none text-center">Sinkron Selesai</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10 text-center">Data Berhasil Dipulihkan:</p>
              <div className="w-full space-y-3 mb-10 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                 {importResults.map((res, i) => (
                    <div key={i} className={`p-5 rounded-3xl border ${res.status.includes('ERROR') ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                       <div className="flex items-center justify-between">
                          <p className="text-[11px] font-black uppercase text-slate-800">{res.name}</p>
                          <span className="text-[9px] font-black uppercase text-emerald-600">{res.count} Baris Aman</span>
                       </div>
                    </div>
                 ))}
              </div>
              <button onClick={handleCloseImportResults} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.3em] hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"><CheckCircle2 size={20}/> SELESAIKAN & TUTUP ✨</button>
           </div>
        </div>
    </div>
      )}

      {showPasteModal && (
  <div className="fixed inset-0 z-[100000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
     <div className="my-auto" ref={pasteModalRef}>
        <div className="bg-white w-full max-w-2xl rounded-[4rem] p-10 md:p-12 shadow-2xl relative overflow-hidden flex flex-col">
              <button onClick={() => setShowPasteModal(false)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
              <div className="flex items-center gap-4 mb-8">
                 <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl"><FileCode size={28}/></div>
                 <div>
                    <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Import Box v6.5</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">Tempel data backup Kakak di sini. {skipPhotos ? '✨ (Foto akan diabaikan)' : '⚠️ (Hati-hati data besar)'}</p>
                 </div>
              </div>
              <textarea ref={textareaRef} placeholder="TEMPEL ISI FILE JSON DI SINI..." className="w-full h-80 p-8 bg-slate-50 rounded-[2.5rem] font-mono text-[10px] border-2 border-transparent focus:border-blue-600 outline-none transition-all shadow-inner resize-none custom-scrollbar" />
              <div className="flex gap-4 mt-8">
                 <button onClick={() => setShowPasteModal(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-3xl font-black text-[11px] uppercase tracking-widest">BATAL</button>
                 <button onClick={handleImportPaste} className="flex-[2] py-6 bg-blue-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 flex items-center justify-center gap-3 transition-all active:scale-95"><CheckCircle2 size={20}/> KONFIRMASI & RESTORE ✨</button>
              </div>
           </div>
        </div>
    </div> 
      )}

      {isResetGateOpen && (
  <div className="fixed inset-0 z-[250000] bg-[#0F172A]/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto">
     <div className="my-auto" ref={resetGateRef}>
        <div className="bg-white w-full max-w-[360px] rounded-[4rem] p-10 md:p-14 shadow-2xl border-4 border-rose-600 text-center space-y-8 relative overflow-hidden">
              <button onClick={() => setIsResetGateOpen(false)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
              
              <div className="space-y-4">
                 <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner animate-pulse">
                    <ShieldX size={48} />
                 </div>
                 <h2 className="text-2xl font-black text-slate-800 uppercase italic leading-none tracking-tighter">Buka Kunci <br/><span className="text-rose-600">Pelindung</span></h2>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Masukkan password untuk membuka akses reset massal! ✨</p>
              </div>

              <form onSubmit={handleVerifyResetGate} className="space-y-6">
                 <div className={resetGateError ? 'animate-shake' : ''}>
                    <input 
                       autoFocus
                       type="password" 
                       value={resetGatePin}
                       maxLength={6}
                       onChange={e => setResetGatePin(e.target.value.replace(/\D/g, ''))}
                       className={`w-full py-5 bg-slate-50 rounded-[1.8rem] text-center font-black text-3xl tracking-[0.4em] outline-none border-4 transition-all ${resetGateError ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-transparent focus:border-rose-600 focus:bg-white'}`}
                       placeholder="******"
                    />
                 </div>
                 <button 
                    type="submit"
                    className="w-full py-5 bg-rose-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    <Unlock size={18} /> BUKA PELINDUNG
                 </button>
              </form>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-center gap-2 opacity-30">
                 <Terminal size={12}/>
                 <p className="text-[7px] font-black uppercase tracking-widest">RESET_AUTH_REQUIRED_V2</p>
              </div>
           </div>
        </div>
    </div>
      )}

      {confirmPurge && (
  <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
     <div className="my-auto" ref={purgeModalRef}>
        <div className="bg-white w-full max-w-[340px] rounded-[3rem] p-10 text-center space-y-8 shadow-2xl relative border-t-8 border-rose-600">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner animate-pulse"><Eraser size={40} /></div>
              <div className="space-y-2">
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Purge Media?</h4>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed px-4 italic">
                    "Semua foto (Base64) di tabel <span className="font-black text-rose-600">PRESENSI/HONOR</span> & <span className="font-black text-rose-600">SPP</span> yang sudah lebih dari <span className="text-rose-600 font-black">3 HARI</span> akan dihapus permanen untuk membersihkan memori. ✨"
                 </p>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setConfirmPurge(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button>
                 <button onClick={handleAutoPurgeMedia} className="flex-[2] py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 flex items-center justify-center gap-2">
                    <Check size={18}/> IYA, BERSIHKAN! ✨
                 </button>
              </div>
           </div>
        </div>
    </div>
      )}

      {showHardResetModal && (
  <div className="fixed inset-0 z-[260000] bg-[#0F172A]/90 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
     <div className="my-auto" ref={hardResetModalRef}>
        <div className="bg-white w-full max-w-[380px] rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative border-t-8 border-rose-600">
              <button onClick={() => setShowHardResetModal(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-bounce"><RotateCcw size={40} /></div>
              <div className="space-y-3">
                 <h4 className="text-2xl font-black text-rose-600 uppercase italic leading-none">KONFIRMASI FINAL</h4>
                 <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-relaxed px-2">
                   PERINGATAN: Histori Presensi, SPP, dan Buku Kas akan dikosongkan total. Aksi ini tidak bisa dibatalkan Kak! ✨
                 </p>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowHardResetModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">BATAL</button>
                 <button onClick={executeHardResetAttendance} className="flex-[1.5] py-5 bg-rose-600 text-white rounded-3xl font-black text-[10px] uppercase shadow-xl hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                   <ShieldAlert size={18}/> IYA, KOSONGKAN SEKARANG
                 </button>
              </div>
           </div>
        </div>
    </div>
      )}

      {confirmDeleteMedia && (
  <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
     <div className="my-auto" ref={deleteMediaModalRef}>
        <div className="bg-white w-full max-w-[340px] rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative border-t-8 border-rose-500">
              <button onClick={() => setConfirmDeleteMedia(null)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20}/></button>
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm"><Trash2 size={32} /></div>
              <div className="space-y-1"><h4 className="text-xl font-black text-slate-800 uppercase italic leading-none text-rose-600">HAPUS FOTO?</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">Bukti milik <span className="text-slate-800 font-black">{confirmDeleteMedia.name}</span> akan dihapus from memory cloud. ✨</p></div>
              <div className="flex gap-3"><button onClick={() => setConfirmDeleteMedia(null)} className="flex-1 py-4 bg-slate-400 text-white rounded-xl font-black text-[9px] uppercase">BATAL</button><button onClick={executeDeleteMedia} className="flex-[1.5] py-4 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg flex items-center justify-center gap-2"><Check size={16}/> IYA, HAPUS</button></div>
           </div>
        </div>
    </div>
      )}

      {previewImg && (
  <div className="fixed inset-0 z-[300000] bg-slate-900/95 flex items-center justify-center p-6 overflow-y-auto" onClick={() => setPreviewImg(null)}>
     <div className="my-auto" ref={previewImgRef}>
        <div className="relative max-w-4xl w-full flex flex-col items-center">
              <button className="absolute -top-14 right-0 p-4 text-white hover:text-rose-500 transition-colors" onClick={() => setPreviewImg(null)}><X size={40}/></button>
              <img src={previewImg} className="max-w-full max-h-[75vh] rounded-[3rem] shadow-2xl border-4 border-white/10 object-contain animate-in zoom-in" alt="Preview" />
           </div>
        </div>
    </div>
      )}

      <MaintenanceNotes />
    </div>
  );
};

const MaintenanceNotes: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [tempNotes, setTempNotes] = useState('');
  const [lastModified, setLastModified] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_notes')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      
      if (error) throw error;
      
      if (data) {
        setNotes(data.content || '');
        if (data.last_modified) {
          const date = new Date(data.last_modified);
          setLastModified(date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching notes:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setTempNotes(notes);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempNotes('');
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('maintenance_notes')
        .update({ 
          content: tempNotes,
          last_modified: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');
      
      if (error) throw error;
      
      await fetchNotes();
      setIsEditing(false);
    } catch (error: any) {
      alert('Gagal menyimpan catatan: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-2 bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 shadow-2xl space-y-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl">
            <ClipboardList size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 uppercase italic">Catatan Maintenance</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PR perbaikan web, tanggal perpanjangan domain, dll. ✨</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {!isEditing ? (
            <button 
              onClick={handleEdit}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl flex items-center gap-3 active:scale-95"
            >
              <FileCode size={18} /> EDIT
            </button>
          ) : (
            <>
              <button 
                onClick={handleCancel}
                className="px-8 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all flex items-center gap-3 active:scale-95"
              >
                <X size={18} /> BATAL
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl flex items-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {isSaving ? 'MENYIMPAN...' : 'SIMPAN'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`relative z-10 bg-slate-50 border-2 rounded-[2.5rem] p-6 transition-all ${isEditing ? 'border-blue-600 bg-white' : 'border-slate-200'}`}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
            <Loader2 size={48} className="mb-4 opacity-30 animate-spin" />
            <p className="text-[11px] font-bold uppercase tracking-widest italic">
              Memuat catatan... ✨
            </p>
          </div>
        ) : !isEditing ? (
          <div className="min-h-[300px]">
            {notes ? (
              <p className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">
                {notes}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                <ClipboardList size={48} className="mb-4 opacity-30" />
                <p className="text-[11px] font-bold uppercase tracking-widest italic">
                  Belum ada catatan. Klik "EDIT" untuk menambahkan. ✨
                </p>
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={tempNotes}
            onChange={(e) => setTempNotes(e.target.value)}
            placeholder="Tulis catatan di sini...&#10;&#10;Contoh:&#10;- Perpanjangan domain: 15 Februari 2026&#10;- Fix bug di halaman login&#10;- Update library ke versi terbaru&#10;- Backup database mingguan"
            className="w-full min-h-[300px] bg-transparent outline-none resize-none text-[15px] leading-relaxed text-slate-700 font-medium"
            autoFocus
          />
        )}
      </div>

      {lastModified && (
        <div className="text-right relative z-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Terakhir diubah: {lastModified}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminMaintenance;
