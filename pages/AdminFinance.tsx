import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Attendance, Transaction, StudentPayment } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  X, Search, Banknote, Loader2, ArrowUpCircle, ArrowDownCircle, Upload, CheckCircle2, 
  ChevronLeft, ChevronRight, History, Eye, Check, BadgeCheck,
  Trash2, Download, FileSpreadsheet, Edit3, AlertTriangle, 
  Plus, Info, AlertCircle, Package, UserCheck, Repeat, Heart, Calendar, Clock, ImageIcon, FileText, Users, ClipboardList, ChevronRight, Maximize2,
  Zap, ShieldCheck, AlertOctagon
} from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useLocation } = ReactRouterDOM as any;

interface AdminFinanceProps {
  attendanceLogs: Attendance[];
  transactions: Transaction[];
  studentPayments: StudentPayment[];
  refreshAllData?: () => Promise<void>;
}

const AdminFinance: React.FC<AdminFinanceProps> = ({ 
  transactions, 
  studentPayments,
  refreshAllData,
  attendanceLogs,
}) => {
  const location = useLocation();
  const getWIBDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'PAYROLL' | 'STUDENT_ACC'>(() => {
    return location?.state?.tab || 'LEDGER';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [highlightTx, setHighlightTx] = useState<{ id: string; type: 'INCOME' | 'EXPENSE' } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  const fileInputPayoutRef = useRef<HTMLInputElement>(null);
  
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [confirmingSpp, setConfirmingSpp] = useState<StudentPayment | null>(null);
  const [payForm, setPayForm] = useState({ receiptData: '' });
  
  const [payrollSearch, setPayrollSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  // 🆕 State untuk pagination & server-side data
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // 50 transaksi per halaman
  const [totalCount, setTotalCount] = useState(0);
  const [serverLedger, setServerLedger] = useState<Transaction[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [sppSearch, setSppSearch] = useState('');
  // 🆕 State untuk filter ledger
const [ledgerFilters, setLedgerFilters] = useState({
  period: 'ALL',
  category: 'ALL',
  type: 'ALL',
  customYear: new Date().getFullYear(),
  customMonth: null // ✅ Pakai null, bukan 'ALL'
});
const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<Transaction | null>(null);
  // Semua useState dulu
const [previewImg, setPreviewImg] = useState<string | null>(null);

const [addForm, setAddForm] = useState({
  type: 'INCOME' as 'INCOME' | 'EXPENSE',
  category: 'UMUM',
  amount: 0,
  date: getWIBDate(),
  description: ''
});

// ✅ Auto scroll modal ke tengah viewport (body bebas scroll)
useEffect(() => {
  const hasModal = !!(
    selectedPayout || 
    confirmingSpp || 
    showAddModal || 
    editingTransaction || 
    confirmDeleteTx || 
    showImportModal || 
    previewImg
  );
  
  if (hasModal) {
    // Tunggu dikit biar DOM modal udah ada, baru scroll
    const timer = setTimeout(() => {
      const modalElement = document.querySelector('[data-modal-container]');
      if (modalElement) {
        modalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    
    return () => clearTimeout(timer);
  }
}, [selectedPayout, confirmingSpp, showAddModal, editingTransaction, confirmDeleteTx, showImportModal, previewImg]);

// LOGIKA AUTO-SCROLL & GLOW SETELAH AKSI
useEffect(() => {
  if (highlightTx) {
    // Tunggu render selesai baru scroll
    const timer = setTimeout(() => {
      const element = document.getElementById(`tx-row-${highlightTx.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 600);

    // Hilangkan efek glow setelah 8 detik
    const glowTimer = setTimeout(() => setHighlightTx(null), 8000);
    return () => {
      clearTimeout(timer);
      clearTimeout(glowTimer);
    };
  }
}, [highlightTx]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800; 
          if (width > height) { if (width > maxDim) { height *= maxDim / width; width = maxDim; } }
          else { if (height > maxDim) { width *= maxDim / height; height = maxDim; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); 
        };
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // 🔥 Fungsi fetch data dari Supabase (server-side)
const fetchLedgerData = async () => {
  setIsLoadingLedger(true);

console.log('🔍 Filter aktif:', ledgerFilters);
  
  try {
let query = supabase
  .from('transactions')
  .select('*', { count: 'exact' })
  .order('date', { ascending: false })  // ✅ Sort by TANGGAL dulu
  .order('id', { ascending: false });   // ✅ Kalau tanggal sama, baru sort by ID
    
    // Search filter
    if (ledgerSearch.trim()) {
      const searchTerm = `%${ledgerSearch.trim()}%`;
      query = query.or(`description.ilike.${searchTerm},category.ilike.${searchTerm}`);
    }
    
    // Period filters
if (ledgerFilters.period !== 'ALL') {
  const today = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(today);
  
  if (ledgerFilters.period === 'THIS_WEEK') {
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    const weekAgoStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(weekAgo);
    query = query.gte('date', weekAgoStr).lte('date', todayStr); // ✅ TAMBAHIN .lte()
  }
  
  if (ledgerFilters.period === 'THIS_MONTH') {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstDayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(firstDay);
    query = query.gte('date', firstDayStr).lte('date', todayStr); // ✅ TAMBAHIN .lte()
  }
  
  if (ledgerFilters.period === 'THIS_YEAR') {
    const firstDay = new Date(today.getFullYear(), 0, 1);
    const firstDayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(firstDay);
    query = query.gte('date', firstDayStr).lte('date', todayStr); // ✅ TAMBAHIN .lte()
  }
  
  // Filter CUSTOM tetap sama (udah bener)
  if (ledgerFilters.period === 'CUSTOM') {
    const year = ledgerFilters.customYear;
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const startStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(yearStart);
    const endStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(yearEnd);
    
    query = query.gte('date', startStr).lte('date', endStr);
    
    if (ledgerFilters.customMonth !== null) {
      const monthNum = parseInt(ledgerFilters.customMonth);
      const monthStart = new Date(year, monthNum, 1);
      const monthEnd = new Date(year, monthNum + 1, 0);
      const startStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(monthStart);
      const endStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(monthEnd);
      
      query = query.gte('date', startStr).lte('date', endStr);
    }
  }
}
    
    // Category filter
    if (ledgerFilters.category !== 'ALL') {
      query = query.eq('category', ledgerFilters.category.toUpperCase());
    }
    
    // Type filter
    if (ledgerFilters.type !== 'ALL') {
      query = query.eq('type', ledgerFilters.type.toUpperCase());
    }
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;
    query = query.range(startIndex, endIndex);
    
    const { data, error, count } = await query;

    console.log('📊 Data dari server:', data); // ✅ Cek data yang balik
    console.log('📈 Total count:', count); // ✅ Cek jumlah total
    
    if (error) throw error;
    
    setServerLedger(data || []);
    setTotalCount(count || 0);
    
  } catch (error) {
    console.error('Error fetching ledger:', error);
    alert('Gagal memuat data transaksi. Coba lagi ya Kak! ✨');
  } finally {
    setIsLoadingLedger(false);
  }
};
  
  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  // 🆕 Pakai data dari server (udah ter-filter & ter-paginate)
const filteredLedger = serverLedger;

  // 🆕 Stats khusus untuk hasil filter (PINDAH KE SINI!)
  const filteredStats = useMemo(() => {
  const income = filteredLedger.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
  const expense = filteredLedger.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
  return { 
    income, 
    expense, 
    balance: income - expense, 
    count: totalCount // 🔥 Pakai totalCount dari server, bukan filteredLedger.length
  };
}, [filteredLedger, totalCount]); // 🔥 Tambahin totalCount di dependency

  const payrollQueue = useMemo(() => {
    const items: Record<string, any> = {};
    attendanceLogs.filter(l => (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG') && l.paymentStatus === 'UNPAID' && l.teacherId !== 'SISWA_MANDIRI' && (l.earnings || 0) > 0).forEach(log => {
      const key = `${log.packageId}-${log.teacherId}`;
      if (!items[key]) {
        const packageContextLogs = attendanceLogs.filter(all => all.packageId === log.packageId && (all.status === 'SESSION_LOG' || all.status === 'SUB_LOG'));
        items[key] = {
          id: key, packageId: log.packageId, teacherId: log.teacherId, teacherName: log.teacherName.toUpperCase(),
          className: log.className, amount: 0, sessionCount: 0, packageContextLogs,
          category: log.sessionCategory || 'REGULER',
          studentName: log.sessionCategory === 'REGULER' ? 'GABUNGAN' : (log.studentsAttended?.[0] || 'UMUM'),
          lastUpdate: log.date
        };
      }
      items[key].amount += (log.earnings || 0);
      items[key].sessionCount += 1;
      if (new Date(log.date) > new Date(items[key].lastUpdate)) items[key].lastUpdate = log.date;
    });
    let result = Object.values(items);
    if (payrollSearch.trim()) {
      const q = payrollSearch.toLowerCase();
      result = result.filter((it: any) => it.teacherName.toLowerCase().includes(q) || it.className.toLowerCase().includes(q) || it.studentName.toLowerCase().includes(q) || it.category.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
  }, [attendanceLogs, payrollSearch]);

  const filteredSpp = useMemo(() => {
    let result = studentPayments.filter(p => p.status === 'PENDING');
    if (sppSearch.trim()) {
      const q = sppSearch.toLowerCase();
      result = result.filter(p => p.studentName.toLowerCase().includes(q) || p.className.toLowerCase().includes(q) || p.amount.toString().includes(q) || p.date.includes(q));
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [studentPayments, sppSearch]);

useEffect(() => {
  fetchLedgerData();
}, [ledgerSearch, ledgerFilters, currentPage, itemsPerPage]);
  
  const handleOpenConfirmSpp = async (p: StudentPayment) => {
    setActionLoadingId(p.id);
    try {
      const { data, error } = await supabase.from('student_payments').select('receiptdata').eq('id', p.id).single();
      if (error) throw error;
      setConfirmingSpp({ ...p, receiptData: data?.receiptdata });
    } catch (e: any) { alert("Gagal mengambil bukti bayar: " + e.message); } finally { setActionLoadingId(null); }
  };

  const handleQuickPreviewSpp = async (p: StudentPayment) => {
    setActionLoadingId(p.id);
    try {
      const { data, error } = await supabase.from('student_payments').select('receiptdata').eq('id', p.id).single();
      if (error) throw error;
      if (data?.receiptdata) setPreviewImg(data.receiptdata);
      else alert("Siswa belum mengunggah foto bukti bayar Kak! ✨");
    } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
  };

  const handleVerifySPP = async (p: StudentPayment) => {
    setActionLoadingId(p.id);
    const txId = `TX-INC-${Date.now()}`;
    try {
      await supabase.from('student_payments').update({ status: 'VERIFIED' }).eq('id', p.id);
      await supabase.from('transactions').insert({ id: txId, type: 'INCOME', category: 'SPP_SISWA', amount: p.amount, date: getWIBDate(), description: `SPP MASUK: ${p.studentName} | ${p.className}`.toUpperCase() });
      if (refreshAllData) await refreshAllData();
      
      setHighlightTx({ id: txId, type: 'INCOME' });
      setActiveTab('LEDGER');
      setConfirmingSpp(null);
    } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.description || !addForm.amount) return;
    setIsLoading(true);
    const txId = `TX-${Date.now()}`;
    try {
      const { error } = await supabase.from('transactions').insert({ id: txId, ...addForm, description: addForm.description.toUpperCase(), category: addForm.category.toUpperCase() });
      if (error) throw error;
      if (refreshAllData) await refreshAllData();
      setShowAddModal(false);
      setAddForm({ type: 'INCOME', category: 'UMUM', amount: 0, date: getWIBDate(), description: '' });
      
      setHighlightTx({ id: txId, type: addForm.type });
      setActiveTab('LEDGER');
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleUpdateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('transactions').update({ 
        type: editingTransaction.type, 
        amount: editingTransaction.amount, 
        description: editingTransaction.description.toUpperCase(), 
        category: editingTransaction.category.toUpperCase(), 
        date: editingTransaction.date 
      }).eq('id', editingTransaction.id);
      
      if (error) throw error;
if (refreshAllData) await refreshAllData();
await fetchLedgerData();  // ✅ TAMBAHIN INI! Refresh data ledger
setHighlightTx({ id: editingTransaction.id, type: editingTransaction.type });
setEditingTransaction(null);
} catch (e: any) { 
  console.error('❌ Error update:', e);  // ✅ Log ke console
  alert('Gagal update: ' + e.message); 
} finally { 
  setIsLoading(false); 
}
  };

// 🆕 TAMBAHKAN FUNGSI INI DI SINI (PERSIS DI ATAS handleImportCSV)
  const normalizeDate = (dateStr: string): string => {
    let parts: string[];
    
    // 1. Deteksi separator (/ atau -)
    if (dateStr.includes('/')) {
      parts = dateStr.split('/');
    } else if (dateStr.includes('-')) {
      parts = dateStr.split('-');
    } else {
      return dateStr;
    }
    
    let year: string, month: string, day: string;
    
    // 2. Deteksi format berdasarkan panjang angka pertama
    if (parts[0].length === 4) {
      // Format: YYYY-MM-DD atau YYYY/MM/DD
      [year, month, day] = parts;
    } else {
      // Format: MM/DD/YYYY atau DD/MM/YYYY
      [month, day, year] = parts;
    }
    
    // 3. Handle tahun 2 digit
    if (year.length === 2) {
      year = '20' + year;
    }
    
    // 4. Return format YYYY-MM-DD
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };


  const handleImportCSV = async () => {
    if (!importText.trim()) return;
    setIsLoading(true);
    try {
      const lines = importText.trim().split(/\r?\n/);
      const payload = lines.map(line => {
        if (!line.trim()) return null;
        let delimiter = ',';
        if (line.includes('\t')) delimiter = '\t'; else if (line.includes(';')) delimiter = ';';
        const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length < 5) return null;
        const [date, desc, cat, type, amt] = parts;
const cleanAmount = parseInt(amt.replace(/[^\d]/g, '')) || 0;
return { 
  id: `TX-IMP-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
  date: normalizeDate(date.trim()),
description: desc.trim().toUpperCase(), category: (cat.trim() || 'UMUM').toUpperCase(), type: (type.trim().toUpperCase().includes('INCOME') || type.trim().toUpperCase().includes('MASUK')) ? 'INCOME' : 'EXPENSE', amount: cleanAmount };
      }).filter(x => x !== null);
      if (payload.length === 0) throw new Error("Format data tidak terbaca.");
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
      if (refreshAllData) await refreshAllData();
      setShowImportModal(false); setImportText(''); alert(`Berhasil impor ${payload.length} transaksi! ✨`);
    } catch (e: any) { alert("Gagal: " + e.message); } finally { setIsLoading(false); }
  };

const handleDeleteTx = async () => {
  if (!confirmDeleteTx) return;
  setIsLoading(true);
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', confirmDeleteTx.id);
    if (error) throw error;
    if (refreshAllData) await refreshAllData();
    await fetchLedgerData();  // ✅ TAMBAHIN INI! Refresh data ledger
    setConfirmDeleteTx(null);
  } catch (e: any) { 
    console.error('❌ Error delete:', e);  // ✅ Log error
    alert('Gagal hapus: ' + e.message); 
  } finally { 
    setIsLoading(false); 
  }
};

const handleExportExcel = () => {
  const headers = "TANGGAL,DESKRIPSI,KATEGORI,TIPE,NOMINAL\n";
  const rows = filteredLedger.map(t => {
    // ✅ Konversi YYYY-MM-DD jadi MM/DD/YYYY
    const [year, month, day] = t.date.split('-');
    const americanDate = `${month}/${day}/${year}`;
    
    return `"${americanDate}","${t.description}","${t.category}","${t.type}","${t.amount}"`;
  }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `LAPORAN_KAS_SANUR_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const compressedBase64 = await compressImage(file);
      setPayForm({ ...payForm, receiptData: compressedBase64 });
    } catch (err) { alert("Gagal proses gambar! ✨"); } finally { setIsLoading(false); }
  };

  const executePayTeacher = async () => {
    if (!selectedPayout || !payForm.receiptData) return alert("Upload bukti transfer dulu! ✨");
    setIsLoading(true);
    const txId = `TX-PAY-${Date.now()}`;
    try {
      const { packageId, teacherId } = selectedPayout;
      await supabase.from('attendance').update({ paymentstatus: 'PAID', receiptdata: payForm.receiptData }).eq('packageid', packageId).eq('teacherid', teacherId).eq('paymentstatus', 'UNPAID');
      await supabase.from('transactions').insert({ id: txId, type: 'EXPENSE', category: 'HONOR_GURU', amount: selectedPayout.amount, date: getWIBDate(), description: `HONOR CAIR: ${selectedPayout.teacherName} | ${selectedPayout.className}`.toUpperCase() });
      if (refreshAllData) await refreshAllData();
      
      setSelectedPayout(null); setPayForm({ receiptData: '' }); 
      setHighlightTx({ id: txId, type: 'EXPENSE' }); 
      setActiveTab('LEDGER'); 
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const formatDate = (dateStr: string) => dateStr.split('-').reverse().join('/');

  return (
    <>
      <style>{`
      /* Scroll bar cantik */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #3b82f6;
  border-radius: 10px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #2563eb;
}
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalZoomIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      
    <div className="space-y-12 animate-in pb-40 px-2">
      <div className="bg-[#0F172A] p-12 md:p-16 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-20"></div>
        <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-12 relative z-10">KAS <span className="text-blue-500">SANUR</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full relative z-10 max-w-5xl">
          <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 text-center flex flex-col justify-center min-h-[180px]">
             <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.4em] mb-3">Kas Bersih</p>
             <p className="text-[17px] font-black italic tracking-tighter leading-none">Rp {stats.balance.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50/10 p-10 rounded-[3rem] border border-emerald-500/20 text-center flex flex-col justify-center min-h-[180px]">
             <div className="flex items-center gap-3 text-emerald-400 mb-4 justify-center"><ArrowUpCircle size={16}/><p className="text-[10px] font-black uppercase">Masuk</p></div>
             <p className="text-[17px] font-black italic tracking-tighter leading-none">Rp {stats.income.toLocaleString()}</p>
          </div>
          <div className="bg-rose-50/10 p-10 rounded-[3rem] border border-rose-500/20 text-center flex flex-col justify-center min-h-[180px]">
             <div className="flex items-center gap-3 text-rose-400 mb-4 justify-center"><ArrowDownCircle size={16}/><p className="text-[10px] font-black uppercase">Keluar</p></div>
             <p className="text-[17px] font-black italic tracking-tighter leading-none">Rp {stats.expense.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-100 p-2 rounded-full w-full max-w-xl mx-auto shadow-inner border border-slate-100">
         <button onClick={() => setActiveTab('LEDGER')} className={`flex-1 py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'LEDGER' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>1. Buku Kas</button>
         <button onClick={() => setActiveTab('PAYROLL')} className={`flex-1 py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'PAYROLL' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>2. Gaji Guru {payrollQueue.length > 0 && <span className="absolute top-3 right-3 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>}</button>
         <button onClick={() => setActiveTab('STUDENT_ACC')} className={`flex-1 py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'STUDENT_ACC' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>3. Verif SPP {studentPayments.filter(p=>p.status==='PENDING').length > 0 && <span className="absolute top-3 right-3 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>}</button>
      </div>

      {activeTab === 'LEDGER' && (
         <div className="space-y-10 mx-4 animate-in fade-in">
            {/* BANNER PENGINGAT EXPORT */}
            <div className="bg-blue-50 border-2 border-dashed border-blue-200 p-8 rounded-[3rem] flex flex-col md:flex-row items-center gap-6 shadow-sm">
               <div className="w-14 h-14 bg-white text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-blue-100 animate-pulse">
                  <AlertOctagon size={28} />
               </div>
               <div className="text-center md:text-left flex-1">
                  <p className="text-[11px] font-black text-blue-800 uppercase tracking-widest leading-relaxed">
                     "Tolong <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">EXPORT EXCEL</span> sebulan sekali ya Kak! Biar kalau sistem engine error, kita punya cadangan data keuangan yang aman! ✨"
                  </p>
               </div>
            </div>

            <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden">
               <div className="p-10 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-center gap-6">
                  <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-3"><History size={20}/> BUKU KAS BESAR</h3>
                  <div className="flex flex-wrap gap-3">
                     <button onClick={() => setShowAddModal(true)} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"><Plus size={14}/> TAMBAH</button>
                     <button onClick={() => setShowImportModal(true)} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-xl"><Upload size={14}/> IMPORT</button>
                     <button onClick={handleExportExcel} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"><FileSpreadsheet size={14}/> EXPORT EXCEL</button>
                  </div>
               </div>
               {/* 🔍 SEARCH BOX */}
<div className="p-8 border-b border-slate-100 relative group">
  <Search size={22} className="absolute left-14 top-1/2 -translate-y-1/2 text-blue-500 group-focus-within:scale-110 transition-transform" />
  <input 
  type="text" 
  placeholder="CARI APAPUN..." 
  value={ledgerSearch} 
  onChange={e => {
    setLedgerSearch(e.target.value.toUpperCase());
    setCurrentPage(1); // 🔥 Reset ke halaman 1
  }}
    className="w-full pl-16 pr-8 py-6 bg-slate-50 rounded-[2rem] text-[11px] font-black uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" />
</div>

{/* 🎯 QUICK FILTER PILLS */}
<div className="px-8 py-6 bg-slate-50 border-b border-slate-100">
  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">⚡ Quick Filter:</p>
  <div className="flex flex-wrap gap-3">
  <button 
    onClick={() => {
      setLedgerFilters({...ledgerFilters, period: 'THIS_WEEK'});
      setCurrentPage(1);
    }}
    className={`px-5 py-3 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${ledgerFilters.period === 'THIS_WEEK' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
  >
    📅 Minggu Ini
  </button>
  
  <button 
    onClick={() => {
      setLedgerFilters({...ledgerFilters, period: 'THIS_MONTH'});
      setCurrentPage(1);
    }}
    className={`px-5 py-3 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${ledgerFilters.period === 'THIS_MONTH' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
  >
    📅 Bulan Ini
  </button>
  
  <button 
    onClick={() => {
      setLedgerFilters({...ledgerFilters, period: 'THIS_YEAR'});
      setCurrentPage(1);
    }}
    className={`px-5 py-3 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${ledgerFilters.period === 'THIS_YEAR' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
  >
    📅 Tahun Ini
  </button>
  
  <button 
    onClick={() => {
      setLedgerFilters({period: 'ALL', category: 'ALL', type: 'ALL', customYear: new Date().getFullYear(), customMonth: null});
      setCurrentPage(1);
    }}
    className="px-5 py-3 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
  >
    🔄 Reset Filter
  </button>
  
  <button 
    onClick={() => setShowAdvancedFilter(!showAdvancedFilter)} 
    className="px-5 py-3 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition-all ml-auto"
  >
    {showAdvancedFilter ? '▲ Sembunyikan' : '▼ Filter Lanjut'}
  </button>
</div>
  
  {/* 🎨 ADVANCED FILTER (Tersembunyi) */}
{showAdvancedFilter && (
  <div className="mt-6 p-6 bg-white rounded-3xl border border-slate-200 space-y-4 animate-in fade-in">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Filter Tipe */}
      <div>
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block">💸 Tipe Transaksi:</label>
        <select value={ledgerFilters.type} onChange={(e) => {
     setLedgerFilters({...ledgerFilters, type: e.target.value});
     setCurrentPage(1);
   }}
        className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-blue-500 transition-all">
          <option value="ALL">SEMUA TIPE</option>
          <option value="INCOME">⬆️ MASUK</option>
          <option value="EXPENSE">⬇️ KELUAR</option>
        </select>
      </div>
      
      {/* Filter Kategori */}
      <div>
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block">🏷️ Kategori:</label>
        <select value={ledgerFilters.category} onChange={(e) => {
     setLedgerFilters({...ledgerFilters, category: e.target.value});
     setCurrentPage(1);
   }}
        className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-blue-500 transition-all">
          <option value="ALL">SEMUA KATEGORI</option>
          <option value="SPP_SISWA">💰 SPP SISWA</option>
          <option value="HONOR_GURU">👨‍🏫 HONOR GURU</option>
          <option value="UMUM">📦 UMUM</option>
        </select>
      </div>
    </div>
    
    {/* 🆕 Custom Year & Month Filter (PINDAH KE SINI - DI DALAM showAdvancedFilter!) */}
    <div className="pt-4 border-t border-slate-200">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">📆 Filter Custom (Pilih Tahun & Bulan):</p>
      <div className="grid grid-cols-2 gap-4">
        {/* Pilih Tahun */}
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tahun:</label>
          <select 
            value={ledgerFilters.customYear} 
            onChange={(e) => {
     setLedgerFilters({...ledgerFilters, period: 'CUSTOM', customYear: parseInt(e.target.value)});
     setCurrentPage(1);
   }}
            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-blue-500 transition-all"
          >
            {[2034, 2033, 2032, 2031, 2030, 2029, 2028, 2027, 2026, 2025, 2024].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        {/* Pilih Bulan */}
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Bulan:</label>
          <select 
            value={ledgerFilters.customMonth} 
            onChange={(e) => {
  setLedgerFilters({
    ...ledgerFilters, 
    period: 'CUSTOM', 
    customMonth: e.target.value === '' ? null : parseInt(e.target.value) // ✅ null kalau kosong
  });
  setCurrentPage(1);
}}
            className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-blue-500 transition-all"
          >
            <option value="">SEMUA BULAN</option>
            <option value="0">JANUARI</option>
            <option value="1">FEBRUARI</option>
            <option value="2">MARET</option>
            <option value="3">APRIL</option>
            <option value="4">MEI</option>
            <option value="5">JUNI</option>
            <option value="6">JULI</option>
            <option value="7">AGUSTUS</option>
            <option value="8">SEPTEMBER</option>
            <option value="9">OKTOBER</option>
            <option value="10">NOVEMBER</option>
            <option value="11">DESEMBER</option>
          </select>
        </div>
      </div>
    </div>
  </div>
)}
</div>             
              
{/* 📊 STATS BANNER HASIL FILTER */}
{(ledgerFilters.period !== 'ALL' || ledgerFilters.category !== 'ALL' || ledgerFilters.type !== 'ALL') && (
  <div className="mx-8 mt-6 mb-6 p-6 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-3xl border-2 border-blue-200 shadow-lg">
    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-4 text-center">📊 HASIL FILTER ({filteredStats.count} TRANSAKSI)</p>
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Masuk</p>
        <p className="text-lg font-black text-emerald-600 italic">Rp {filteredStats.income.toLocaleString()}</p>
      </div>
      <div className="text-center">
        <p className="text-[8px] font-black text-rose-600 uppercase mb-1">Keluar</p>
        <p className="text-lg font-black text-rose-600 italic">Rp {filteredStats.expense.toLocaleString()}</p>
      </div>
      <div className="text-center">
        <p className="text-[8px] font-black text-blue-600 uppercase mb-1">Balance</p>
        <p className="text-lg font-black text-blue-600 italic">Rp {filteredStats.balance.toLocaleString()}</p>
      </div>
    </div>
  </div>
)}

{/* 🆕 TARUH LOADING INDICATOR DI SINI (STEP 7) */}
{isLoadingLedger && (
  <div className="p-20 text-center">
    <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-600" />
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
      Memuat Data Transaksi...
    </p>
  </div>
)}

            {!isLoadingLedger && (
              <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
                  <table className="w-full text-left">
                     <thead className="bg-white sticky top-0 z-10 shadow-sm"><tr><th className="px-12 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaksi</th><th className="px-12 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Nominal</th><th className="px-12 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th></tr></thead>
                     <tbody className="divide-y divide-slate-50">
                        {filteredLedger.map(t => {
                           const isHighlighted = highlightTx?.id === t.id;
                           // GLOW SCHEME: INCOME = Emerald (Green), EXPENSE = Rose (Red)
                           const highlightColor = t.type === 'INCOME' 
                             ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                             : 'bg-rose-50 border-rose-500 ring-4 ring-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.3)]';
                           return (
                              <tr 
                                key={t.id} 
                                id={`tx-row-${t.id}`}
                                className={`hover:bg-slate-50 transition-all group ${isHighlighted ? `${highlightColor} border-l-8 animate-pulse z-50 relative` : 'border-l-8 border-transparent'}`}
                              >
                                 <td className="px-12 py-8 min-w-[300px]">
                                    <p className="text-[9px] font-black text-slate-300 uppercase mb-1">{formatDate(t.date)}</p>
                                    <p className="text-[14px] font-black text-slate-800 uppercase italic leading-tight">{t.description}</p>
                                    <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-widest mt-3 italic">{t.category || 'UMUM'}</span>
                                 </td>
                                 <td className="px-12 py-8 text-right min-w-[200px]"><div className={`flex items-baseline justify-end gap-1.5 font-black italic whitespace-nowrap flex-nowrap ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}><span className="text-xs md:text-sm">{t.type === 'INCOME' ? '+' : '-'} Rp</span><span className="text-2xl md:text-3xl tracking-tighter leading-none">{t.amount.toLocaleString()}</span></div></td>
                                 <td className="px-12 py-8 text-center min-w-[150px]"><div className="flex justify-center gap-2"><button onClick={() => setEditingTransaction(t)} className="p-3 bg-white text-slate-300 hover:text-blue-600 rounded-xl transition-all shadow-sm border border-slate-50"><Edit3 size={16}/></button><button onClick={() => setConfirmDeleteTx(t)} className="p-3 bg-white text-slate-300 hover:text-rose-500 rounded-xl transition-all shadow-sm border border-slate-50"><Trash2 size={16}/></button></div></td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
              )} {/* 🔥 PASTIKAN KURUNG TUTUP INI ADA! */}
              
              {/* 📄 Pagination Controls */}
{!isLoadingLedger && totalCount > itemsPerPage && (
  <div className="p-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
    {/* Tombol Previous */}
    <button
      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      className="px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
    >
      <ChevronLeft size={16} /> SEBELUMNYA
    </button>
    
    {/* Info Halaman */}
    <div className="flex flex-col md:flex-row items-center gap-4">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Halaman {currentPage} dari {Math.ceil(totalCount / itemsPerPage)}
      </span>
      <span className="px-5 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
        Menampilkan {filteredLedger.length} dari {totalCount} transaksi
      </span>
    </div>
    
    {/* Tombol Next */}
    <button
      onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))}
      disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
      className="px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
    >
      SELANJUTNYA <ChevronRight size={16} />
    </button>
  </div>
)}
            </div>
         </div>
      )}

      {activeTab === 'PAYROLL' && (
         <div className="space-y-12 px-4 animate-in fade-in max-w-6xl mx-auto">
            <div className="bg-white rounded-full border border-slate-100 shadow-xl p-4 flex items-center gap-6 group focus-within:border-blue-500 transition-all max-w-2xl mx-auto">
               <Search size={22} className="text-blue-500 ml-4 group-focus-within:scale-110 transition-transform" />
               <input type="text" placeholder="CARI GURU, KELAS, ATAU SISWA..." value={payrollSearch} onChange={e => setPayrollSearch(e.target.value.toUpperCase())} className="flex-1 bg-transparent outline-none text-[11px] font-black uppercase tracking-widest placeholder:text-slate-300" />
            </div>
            {payrollQueue.map((it) => (
              <div key={it.id} className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl p-10 md:p-14 space-y-12 group hover:border-blue-200 transition-all duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner shrink-0 transition-all duration-700 ${it.category === 'PRIVATE' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'} group-hover:bg-orange-600 group-hover:text-white`}><Package size={32}/></div>
                    <div className="space-y-2">
                      <h4 className="text-2xl md:text-3xl font-black text-slate-800 uppercase italic leading-none">{it.className}</h4>
                      <div className="flex flex-wrap gap-4 items-center"><span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-md ${it.category === 'PRIVATE' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>{it.category}</span><div className="flex items-center gap-1.5 text-blue-600 font-black text-[9px] uppercase italic"><Users size={12}/> SISWA: {it.studentName}</div></div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">PENERIMA: {it.teacherName}</p>
                      <div className="flex items-center gap-2 pt-1"><Calendar size={12} className="text-slate-300"/><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Update: {formatDate(it.lastUpdate)}</p></div>
                    </div>
                  </div>
                  <div className="bg-slate-50/80 backdrop-blur-sm p-8 rounded-[3rem] border border-slate-100 min-w-[240px] text-center space-y-6 shadow-sm"><div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic">TOTAL CAIRKAN</p><h4 className="text-3xl font-black italic tracking-tighter text-blue-600 leading-none">Rp {it.amount.toLocaleString()}</h4></div><button onClick={() => setSelectedPayout(it)} className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-3 group">BAYAR SEKARANG <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/></button></div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-6 px-2"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sesi Asli Guru Tersebut</p></div><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-600"></div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Guru Tersebut Menggantikan</p></div><div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ml-auto animate-pulse ${it.category === 'PRIVATE' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>SIAP CAIR ({it.sessionCount} SESI)</div></div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 p-6 md:p-8 bg-slate-50/50 rounded-[3rem] border border-slate-50 shadow-inner">
                    {[1,2,3,4,5,6].map(num => {
                      const log = it.packageContextLogs.find((l: any) => l.sessionNumber === num);
                      const isMe = log && log.teacherId === it.teacherId;
                      const isOriginal = log && log.originalTeacherId === it.teacherId;
                      const isSubstitute = isMe && !isOriginal;
                      let style = "bg-white/50 border-2 border-dashed border-slate-100 opacity-40"; let icon = <Zap size={18} className="text-slate-200"/>; let label = "KOSONG"; let dateStr = "";
                      if (isMe) {
                        if (isSubstitute) { style = "bg-orange-600 text-white shadow-lg ring-4 ring-orange-50"; icon = <Repeat size={20}/>; label = "MENGGANTIKAN"; }
                        else { style = "bg-blue-600 text-white shadow-lg ring-4 ring-blue-50"; icon = <UserCheck size={20}/>; label = "SESI ASLI"; }
                        dateStr = formatDate(log.date);
                      } else if (log) { style = "bg-slate-200 text-slate-400 opacity-60"; icon = <Clock size={18} className="text-slate-400"/>; label = `LAIN: ${log.teacherName.split(' ')[0]}`; dateStr = formatDate(log.date); }
                      return (<div key={num} className={`h-32 md:h-36 rounded-[2rem] flex flex-col items-center justify-center text-center gap-1.5 transition-all duration-700 ${style}`}><p className="text-[8px] font-black uppercase tracking-widest opacity-60">Sesi {num}</p>{icon}<p className="text-[6px] font-black uppercase tracking-tighter leading-none px-1 line-clamp-1">{label}</p>{dateStr && <p className="text-[7px] font-black opacity-80 mt-1">{dateStr}</p>}</div>);
                    })}
                  </div>
                </div>
              </div>
            ))}
            {payrollQueue.length === 0 && (<div className="py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-20"><ShieldCheck size={64} className="mx-auto mb-6 text-slate-300"/><p className="text-[12px] font-black uppercase tracking-[0.4em] italic leading-relaxed">Antrean Honor Sudah Lunas Semua! ✨</p></div>)}
         </div>
      )}

      {activeTab === 'STUDENT_ACC' && (
        <div className="space-y-12 px-4 max-w-6xl mx-auto">
           <div className="bg-white rounded-full border border-slate-100 shadow-xl p-4 flex items-center gap-6 group focus-within:border-emerald-500 transition-all max-w-2xl mx-auto">
               <Search size={22} className="text-emerald-500 ml-4 group-focus-within:scale-110 transition-transform" />
               <input type="text" placeholder="CARI SISWA ATAU KELAS..." value={sppSearch} onChange={e => setSppSearch(e.target.value.toUpperCase())} className="flex-1 bg-transparent outline-none text-[11px] font-black uppercase tracking-widest placeholder:text-slate-300" />
            </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {filteredSpp.map((p) => (
                 <div key={p.id} className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col justify-between hover:border-emerald-500 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-12 -mt-12 opacity-50"></div>
                    <div className="relative z-10">
                       <div className="flex justify-between items-start mb-8">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500"><Banknote size={36}/></div>
                          <div className="flex flex-col items-end gap-2">
                             <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[8px] font-black uppercase tracking-widest">Antrean SPP</span>
                          </div>
                       </div>
                       <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{formatDate(p.date)}</p>
                       <h4 className="text-xl font-black text-slate-800 uppercase italic leading-tight mb-2 truncate">{p.studentName}</h4>
                       <p className="text-[10px] font-black text-blue-600 uppercase mb-8">{p.className}</p>
                       <div className="bg-slate-50 p-6 rounded-3xl mb-10 text-center border border-slate-100 shadow-inner group-hover:bg-white group-hover:border-emerald-100 transition-all"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Nominal</p><p className="text-3xl font-black text-emerald-600 italic tracking-tighter">Rp {p.amount.toLocaleString()}</p></div>
                    </div>
                    <div className="space-y-4 relative z-10">
                       <button onClick={() => handleOpenConfirmSpp(p)} disabled={!!actionLoadingId} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                          {actionLoadingId === p.id ? <Loader2 size={16} className="animate-spin"/> : <><Check size={16}/> KONFIRMASI PEMBAYARAN ✨</>}
                       </button>
                    </div>
                 </div>
              ))}
              {filteredSpp.length === 0 && (<div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-20"><ShieldCheck size={64} className="mx-auto mb-6 text-slate-300"/><p className="text-[12px] font-black uppercase tracking-[0.5em] italic text-center">Semua SPP Sudah Terverifikasi! ✨</p></div>)}
           </div>
        </div>
      )}

      {selectedPayout && (
  <div data-modal-container className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
     <div className="bg-white w-full max-w-sm rounded-[4rem] p-12 shadow-2xl relative overflow-hidden flex flex-col items-center opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => { setSelectedPayout(null); setPayForm({ receiptData: '' }); }} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
              <div className={`w-20 h-20 ${selectedPayout.category === 'PRIVATE' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'} rounded-[2rem] flex items-center justify-center mb-8 shadow-inner rotate-3`}><Banknote size={40}/></div>
              <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-2 leading-none text-center">Cairkan Honor</h4>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-10 text-center">{selectedPayout.teacherName}</p>
              <div className="w-full space-y-6">
                 <div className="bg-slate-50 p-6 rounded-3xl space-y-3 border border-slate-100">
                    <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest"><p>Detail:</p><p className={selectedPayout.category === 'PRIVATE' ? 'text-orange-600' : 'text-blue-600'}>{selectedPayout.category} | {selectedPayout.sessionCount} SESI</p></div>
                    <div className="text-center border-t border-slate-100 pt-3"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Nominal Transfer</p><p className={`text-2xl font-black ${selectedPayout.category === 'PRIVATE' ? 'text-orange-600' : 'text-blue-600'} italic`}>Rp {selectedPayout.amount.toLocaleString()}</p></div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Bukti Transfer (Wajib)</label>
                    {payForm.receiptData ? (
                       <div className="relative group cursor-pointer" onClick={() => setPreviewImg(payForm.receiptData)}>
                          <img src={payForm.receiptData} className="w-full h-48 object-cover rounded-[2rem] shadow-lg border-4 border-emerald-500" alt="Proof" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all rounded-[1.8rem]"><Maximize2 size={32} className="mb-2"/><p className="text-[8px] font-black uppercase">KLIK PREVIEW</p></div>
                          <button onClick={(e) => { e.stopPropagation(); setPayForm({ receiptData: '' }); }} className="absolute top-4 right-4 p-3 bg-rose-600 text-white rounded-full shadow-xl hover:bg-rose-700 transition-all"><Trash2 size={16}/></button>
                       </div>
                    ) : (
                       <div className="relative"><input type="file" ref={fileInputPayoutRef} onChange={handleUploadProof} className="hidden" accept="image/*" /><button onClick={() => fileInputPayoutRef.current?.click()} className={`w-full py-12 bg-slate-50 rounded-[2.5rem] border-2 border-dashed ${selectedPayout.category === 'PRIVATE' ? 'border-orange-200 text-orange-600' : 'border-blue-200 text-blue-600'} font-black text-[10px] uppercase hover:bg-white transition-all flex flex-col items-center gap-3`}>{isLoading ? <Loader2 className="animate-spin" size={24} /> : <><ImageIcon size={32}/><p>UPLOAD BUKTI TRANSFER</p></>}</button></div>
                    )}
                 </div>
                 <button onClick={executePayTeacher} disabled={isLoading || !payForm.receiptData} className={`w-full py-6 ${selectedPayout.category === 'PRIVATE' ? 'bg-[#0F172A]' : 'bg-blue-600'} text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30`}>{isLoading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18}/> SELESAIKAN PEMBAYARAN ✨</>}</button>
              </div>
           </div>
        </div>
      )}

      {confirmingSpp && (
  <div data-modal-container className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
     <div className="bg-white w-full max-w-sm rounded-[4rem] p-10 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setConfirmingSpp(null)} className="absolute top-8 right-8 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner rotate-3"><CheckCircle2 size={40}/></div>
              <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-1 leading-none text-center">Verifikasi SPP</h4>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-8 text-center">{confirmingSpp.studentName}</p>
              <div className="w-full space-y-6">
                 <div className="bg-slate-50 p-6 rounded-3xl space-y-3 border border-slate-100 text-center shadow-inner">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{confirmingSpp.className}</p>
                    <div className="pt-3 border-t border-slate-200"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Nominal Diterima</p><p className="text-3xl font-black text-emerald-600 italic tracking-tighter">Rp {confirmingSpp.amount.toLocaleString()}</p></div>
                 </div>
                 {confirmingSpp.receiptData && (
                   <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Bukti Dari Siswa:</p>
                     <div className="relative group cursor-pointer" onClick={() => setPreviewImg(confirmingSpp.receiptData!)}>
                        <img src={confirmingSpp.receiptData} className="w-full h-40 object-cover rounded-[2rem] shadow-lg border-4 border-emerald-100" alt="Receipt" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all rounded-[1.8rem]"><Maximize2 size={24} className="mb-2"/><p className="text-[7px] font-black uppercase">PREVIEW BUKTI</p></div>
                     </div>
                   </div>
                 )}
                 <div className="flex gap-4">
                    <button onClick={() => setConfirmingSpp(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">BATAL</button>
                    <button onClick={() => handleVerifySPP(confirmingSpp)} disabled={!!actionLoadingId} className="flex-[2] py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2">{actionLoadingId === confirmingSpp.id ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18}/> KONFIRMASI ✨</>}</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showAddModal && (
  <div data-modal-container className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
     <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 md:p-12 shadow-2xl relative overflow-hidden opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
               <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
               <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-8 tracking-tighter">Input <span className="text-blue-600">Manual</span></h4>
               <form onSubmit={handleAddTransaction} className="space-y-6">
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl"><button type="button" onClick={() => setAddForm({...addForm, type: 'INCOME'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${addForm.type === 'INCOME' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Masuk</button><button type="button" onClick={() => setAddForm({...addForm, type: 'EXPENSE'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${addForm.type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-400'}`}>Keluar</button></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Deskripsi Transaksi</label><input type="text" placeholder="MISAL: BAYAR LISTRIK..." value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" /></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Kategori</label><input type="text" placeholder="MISAL: LISTRIK, GAJI, DLL..." value={addForm.category} onChange={e => setAddForm({...addForm, category: e.target.value.toUpperCase()})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" /></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Nominal (Rp)</label><input type="number" placeholder="0" value={addForm.amount || ''} onChange={e => setAddForm({...addForm, amount: parseInt(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-lg outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" /></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Tanggal</label><input type="date" value={addForm.date} onChange={e => setAddForm({...addForm, date: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" /></div>
                  <button type="submit" disabled={isLoading} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">{isLoading ? <Loader2 size={18} className="animate-spin"/> : 'SIMPAN TRANSAKSI ✨'}</button>
               </form>
            </div>
         </div>
      )}

      {editingTransaction && (
  <div data-modal-container className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
     <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 md:p-12 shadow-2xl relative overflow-hidden opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
               <button onClick={() => setEditingTransaction(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
               <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-8 tracking-tighter">Edit <span className="text-blue-600">Transaksi</span></h4>
               <form onSubmit={handleUpdateTx} className="space-y-6">
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    <button type="button" onClick={() => setEditingTransaction({...editingTransaction, type: 'INCOME'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${editingTransaction.type === 'INCOME' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Masuk</button>
                    <button type="button" onClick={() => setEditingTransaction({...editingTransaction, type: 'EXPENSE'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${editingTransaction.type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-400'}`}>Keluar</button>
                  </div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Deskripsi Transaksi</label><input type="text" placeholder="MISAL: BAYAR LISTRIK..." value={editingTransaction.description} onChange={e => setEditingTransaction({...editingTransaction, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" /></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Kategori</label><input type="text" placeholder="MISAL: LISTRIK, GAJI, DLL..." value={editingTransaction.category} onChange={e => setEditingTransaction({...editingTransaction, category: e.target.value.toUpperCase()})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" /></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Nominal (Rp)</label><input type="number" placeholder="0" value={editingTransaction.amount || ''} onChange={e => setEditingTransaction({...editingTransaction, amount: parseInt(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-lg outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" /></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Tanggal</label><input type="date" value={editingTransaction.date} onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" /></div>
                  <button type="submit" disabled={isLoading} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">{isLoading ? <Loader2 size={18} className="animate-spin"/> : 'SIMPAN PERUBAHAN ✨'}</button>
               </form>
            </div>
         </div>
      )}

      {confirmDeleteTx && (
  <div data-modal-container className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
     <div className="bg-white w-full max-w-[340px] rounded-[3rem] p-10 text-center space-y-8 shadow-2xl relative border-t-8 border-rose-600 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
               <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner animate-pulse"><Trash2 size={40} /></div>
               <div className="space-y-2">
                  <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Hapus Transaksi?</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed px-4 italic">
                     Data "<span className="font-black text-rose-600">{confirmDeleteTx.description}</span>" senilai <span className="text-rose-600 font-black">Rp {confirmDeleteTx.amount.toLocaleString()}</span> akan dihapus permanen dari buku kas. ✨
                  </p>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => setConfirmDeleteTx(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button>
                  <button onClick={handleDeleteTx} disabled={isLoading} className="flex-[2] py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 flex items-center justify-center gap-2">
                     {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18}/> IYA, HAPUS</>}
                  </button>
               </div>
            </div>
         </div>
      )}

      {showImportModal && (
  <div data-modal-container className="fixed inset-0 z-[100000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
     <div className="bg-white w-full max-w-lg rounded-[4rem] p-10 md:p-12 shadow-2xl relative overflow-hidden opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
               <button onClick={() => setShowImportModal(false)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
               <div className="flex items-center gap-4 mb-8"><div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl"><ClipboardList size={24}/></div><div><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Smart Import Box</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">Format: TGL, DESKRIPSI, KATEGORI, TIPE, NOMINAL ✨</p></div></div>
               <div className="space-y-6"><div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100"><p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3 text-center">Urutan Kolom Harus Sesuai:</p><code className="text-[9px] font-mono font-bold text-slate-500 block bg-white p-4 rounded-xl border border-blue-50 leading-relaxed text-center uppercase">TANGGAL, DESKRIPSI, KATEGORI, TIPE, NOMINAL</code></div><textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="TEMPEL DATA DARI EXCEL DI SINI (COPY SELURUH TABEL)..." rows={8} className="w-full p-8 bg-slate-50 rounded-[2rem] font-mono text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all shadow-inner" /><div className="flex items-center gap-3 bg-orange-50 p-4 rounded-2xl border border-orange-100"><Zap size={16} className="text-orange-500 shrink-0" /><p className="text-[8px] font-bold text-orange-800 uppercase italic">Tips: Tipe bisa berisi "INCOME" atau "EXPENSE" ✨</p></div><button onClick={handleImportCSV} disabled={isLoading || !importText.trim()} className="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">{isLoading ? <Loader2 size={24} className="animate-spin"/> : <><Check size={20}/> PROSES IMPORT MASSAL ✨</>}</button></div>
            </div>
         </div>
      )}

      {previewImg && (
  <div data-modal-container className="fixed inset-0 z-[300000] bg-slate-900/95 flex flex-col items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}} onClick={() => setPreviewImg(null)}>
     <div className="relative max-w-4xl w-full flex flex-col items-center opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
        <button className="absolute -top-14 right-0 p-4 text-white hover:text-rose-500 transition-colors" onClick={() => setPreviewImg(null)}><X size={40}/></button>
        <img src={previewImg} className="max-w-full max-h-[75vh] rounded-[3rem] shadow-2xl border-4 border-white/10 object-contain" alt="Preview" />
              <div className="mt-8 text-center"><p className="text-[10px] font-black text-white/40 uppercase tracking-[0.8em] italic">Sanur Payment Verification ✨</p></div>
           </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdminFinance;
