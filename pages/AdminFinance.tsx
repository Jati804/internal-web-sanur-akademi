
import React, { useState, useMemo, useRef } from 'react';
import { Attendance, Transaction, StudentPayment } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  X, Search, Banknote, Loader2, ArrowUpCircle, ArrowDownCircle, Upload, CheckCircle2, 
  Crown, Zap, History, ShieldCheck, Eye, Check, BadgeCheck,
  Trash2, Download, FileSpreadsheet, Edit3, AlertTriangle, 
  Plus, Info, AlertCircle, Package, UserCheck, Repeat, Heart, Calendar, Clock, ImageIcon, FileText
} from 'lucide-react';

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
  const getWIBDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  const [activeTab, setActiveTab] = useState<'LEDGER' | 'PAYROLL' | 'STUDENT_ACC'>('LEDGER');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputPayoutRef = useRef<HTMLInputElement>(null);
  
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({ receiptData: '' });
  const [payrollSearch, setPayrollSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  
  // States for Ledger Actions
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<Transaction | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    category: 'UMUM',
    amount: 0,
    date: getWIBDate(),
    description: ''
  });

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const filteredLedger = useMemo(() => {
    let results = [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      results = results.filter(t => 
        t.description.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        t.amount.toString().includes(q) ||
        t.date.includes(q)
      );
    }
    return results;
  }, [transactions, ledgerSearch]);

  const payrollQueue = useMemo(() => {
    const items: Record<string, any> = {};
    
    // FILTER: Hanya sesi mengajar asli (SESSION_LOG / SUB_LOG) 
    // DAN bukan laporan mandiri siswa
    // DAN yang memiliki nominal penghasilan (earnings > 0)
    attendanceLogs.filter(l => 
      (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG') && 
      l.paymentStatus === 'UNPAID' && 
      l.teacherId !== 'SISWA_MANDIRI' &&
      (l.earnings || 0) > 0
    ).forEach(log => {
      const key = `${log.packageId}-${log.teacherId}`;
      if (!items[key]) {
        items[key] = {
          id: key, 
          packageId: log.packageId, 
          teacherId: log.teacherId, 
          teacherName: log.teacherName.toUpperCase(),
          className: log.className, 
          amount: 0, 
          sessionCount: 0, 
          // Ambil full log paket yang HANYA dari laporan guru saja untuk visualisasi dompet
          fullPackageLogs: attendanceLogs.filter(all => 
            all.packageId === log.packageId && 
            all.teacherId !== 'SISWA_MANDIRI' && 
            (all.earnings || 0) > 0
          ).sort((a,b) => (a.sessionNumber||0)-(b.sessionNumber||0)),
          category: log.sessionCategory || 'REGULER',
          studentName: log.studentsAttended?.[0] || 'UMUM'
        };
      }
      items[key].amount += (log.earnings || 0);
      items[key].sessionCount += 1;
    });

    let result = Object.values(items);
    if (payrollSearch.trim()) {
      const q = payrollSearch.toLowerCase();
      result = result.filter((it: any) => it.teacherName.toLowerCase().includes(q) || it.className.toLowerCase().includes(q) || it.packageId.toLowerCase().includes(q));
    }
    return result.sort((a, b) => b.amount - a.amount);
  }, [attendanceLogs, payrollSearch]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.description || !addForm.amount) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        id: `TX-${Date.now()}`,
        ...addForm,
        description: addForm.description.toUpperCase(),
        category: addForm.category.toUpperCase()
      });
      if (error) throw error;
      if (refreshAllData) await refreshAllData();
      setShowAddModal(false);
      setAddForm({ type: 'INCOME', category: 'UMUM', amount: 0, date: getWIBDate(), description: '' });
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
      setEditingTransaction(null);
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleImportCSV = async () => {
    if (!importText.trim()) return;
    setIsLoading(true);
    try {
      const lines = importText.trim().split('\n');
      const payload = lines.map(line => {
        const parts = line.split(',');
        if (parts.length < 5) return null;
        const [date, description, category, type, amount] = parts;
        return {
          id: `TX-IMP-${Math.random().toString(36).substring(7)}`,
          date: date.trim(),
          description: description.trim().toUpperCase(),
          category: category.trim().toUpperCase(),
          type: (type.trim().toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE') as 'INCOME' | 'EXPENSE',
          amount: parseInt(amount.replace(/\D/g, '')) || 0
        };
      }).filter(x => x !== null);

      if (payload.length === 0) throw new Error("Format teks tidak dikenali.");

      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
      if (refreshAllData) await refreshAllData();
      setShowImportModal(false);
      setImportText('');
      alert(`Berhasil mengimpor ${payload.length} transaksi! ✨`);
    } catch (e: any) { alert("Format salah: Pastikan gunakan koma.\nContoh: 2026-01-20,BAYAR LISTRIK,UTILITAS,EXPENSE,50000"); }
    finally { setIsLoading(false); }
  };

  const handleDeleteTx = async () => {
    if (!confirmDeleteTx) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', confirmDeleteTx.id);
      if (error) throw error;
      if (refreshAllData) await refreshAllData();
      setConfirmDeleteTx(null);
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleExportExcel = () => {
    const headers = ["TANGGAL", "DESKRIPSI", "KATEGORI", "TIPE", "NOMINAL"];
    const rows = filteredLedger.map(t => [t.date, t.description, t.category, t.type, t.amount]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `LAPORAN_KAS_SANUR_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleVerifySPP = async (p: StudentPayment) => {
    setIsLoading(true);
    try {
      await supabase.from('student_payments').update({ status: 'VERIFIED' }).eq('id', p.id);
      await supabase.from('transactions').insert({
        id: `TX-INC-${Date.now()}`,
        type: 'INCOME',
        category: 'SPP_SISWA',
        amount: p.amount,
        date: getWIBDate(),
        description: `SPP MASUK: ${p.studentName} | ${p.className}`.toUpperCase()
      });
      if (refreshAllData) await refreshAllData();
      alert("Pembayaran Berhasil Diverifikasi! ✨");
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleUploadProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPayForm({ ...payForm, receiptData: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const executePayTeacher = async () => {
    if (!selectedPayout || !payForm.receiptData) return alert("Upload bukti transfer dulu ya Kak! ✨");
    setIsLoading(true);
    try {
      const { packageId, teacherId } = selectedPayout;
      await supabase.from('attendance').update({ paymentstatus: 'PAID', receiptdata: payForm.receiptData }).eq('packageid', packageId).eq('teacherid', teacherId).eq('paymentstatus', 'UNPAID');
      await supabase.from('transactions').insert({
        id: `TX-PAY-${Date.now()}`,
        type: 'EXPENSE',
        category: 'HONOR_GURU',
        amount: selectedPayout.amount,
        date: getWIBDate(),
        description: `HONOR CAIR: ${selectedPayout.teacherName} | ${selectedPayout.className}`.toUpperCase()
      });
      if (refreshAllData) await refreshAllData();
      
      const successTeacher = selectedPayout.teacherName;
      setSelectedPayout(null);
      setPayForm({ receiptData: '' });
      setActiveTab('LEDGER'); 
      alert(`Berhasil! Honor ${successTeacher} sudah cair dan tercatat di Buku Kas. ✨`);
    } catch (e: any) { alert("Gagal: " + e.message); } finally { setIsLoading(false); }
  };

  const formatDate = (dateStr: string) => dateStr.split('-').reverse().join('/');

  return (
    <div className="space-y-12 animate-in pb-40 px-2">
      {/* STATS HEADER */}
      <div className="bg-[#0F172A] p-12 md:p-16 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col items-center">
        <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-12 relative z-10">KAS <span className="text-blue-500">SANUR</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full relative z-10 max-w-5xl">
          <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 text-center"><p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.4em] mb-2">Kas Bersih</p><p className="text-5xl font-black italic tracking-tighter">Rp {stats.balance.toLocaleString()}</p></div>
          <div className="bg-emerald-50/10 p-10 rounded-[3rem] border border-emerald-500/20 text-center"><div className="flex items-center gap-3 text-emerald-400 mb-4 justify-center"><ArrowUpCircle size={16}/><p className="text-[10px] font-black uppercase">Masuk</p></div><p className="text-3xl font-black italic">Rp {stats.income.toLocaleString()}</p></div>
          <div className="bg-rose-50/10 p-10 rounded-[3rem] border border-rose-500/20 text-center"><div className="flex items-center gap-3 text-rose-400 mb-4 justify-center"><ArrowDownCircle size={16}/><p className="text-[10px] font-black uppercase">Keluar</p></div><p className="text-3xl font-black italic">Rp {stats.expense.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="flex bg-slate-100 p-2 rounded-full w-full max-w-xl mx-auto shadow-inner border border-slate-100">
         <button onClick={() => setActiveTab('LEDGER')} className={`flex-1 py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'LEDGER' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>1. Buku Kas</button>
         <button onClick={() => setActiveTab('PAYROLL')} className={`flex-1 py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'PAYROLL' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>2. Gaji Guru {payrollQueue.length > 0 && <span className="absolute top-3 right-3 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>}</button>
         <button onClick={() => setActiveTab('STUDENT_ACC')} className={`flex-1 py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'STUDENT_ACC' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>3. Verif SPP {studentPayments.filter(p=>p.status==='PENDING').length > 0 && <span className="absolute top-3 right-3 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>}</button>
      </div>

      {activeTab === 'LEDGER' && (
         <div className="space-y-10 mx-4 animate-in fade-in">
            <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-[2.5rem] flex items-center gap-4 animate-pulse shadow-sm max-w-2xl mx-auto">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0"><Info size={20}/></div>
               <p className="text-[10px] font-black text-blue-800 uppercase italic">"Mencatat pengeluaran operasional di sini agar kas lembaga tetap seimbang Kak! ✨"</p>
            </div>

            <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden">
               <div className="p-10 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-center gap-6">
                  <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-3"><History size={20}/> BUKU KAS BESAR</h3>
                  <div className="flex flex-wrap gap-3">
                     <button onClick={() => setShowAddModal(true)} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"><Plus size={14}/> Tambah</button>
                     <button onClick={() => setShowImportModal(true)} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-xl"><Upload size={14}/> Import</button>
                     <button onClick={handleExportExcel} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"><FileSpreadsheet size={14}/> Export Excel</button>
                  </div>
               </div>
               <div className="p-8 border-b border-slate-100 relative group">
                  <Search size={22} className="absolute left-14 top-1/2 -translate-y-1/2 text-blue-500 group-focus-within:scale-110 transition-transform" />
                  <input type="text" placeholder="CARI APAPUN..." value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value.toUpperCase())} className="w-full pl-16 pr-8 py-6 bg-slate-50 rounded-[2rem] text-[11px] font-black uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" />
               </div>
               <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                     <thead className="bg-white sticky top-0 z-10 shadow-sm"><tr><th className="px-12 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaksi</th><th className="px-12 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Nominal</th><th className="px-12 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th></tr></thead>
                     <tbody className="divide-y divide-slate-50">
                        {filteredLedger.map(t => (
                           <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                              <td className="px-12 py-8 min-w-[300px]">
                                 <p className="text-[9px] font-black text-slate-300 uppercase mb-1">{formatDate(t.date)}</p>
                                 <p className="text-[14px] font-black text-slate-800 uppercase italic leading-tight">{t.description}</p>
                                 <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-widest mt-3 inline-block">{t.category || 'UMUM'}</span>
                              </td>
                              <td className="px-12 py-8 text-right min-w-[200px]">
                                 <div className={`flex items-baseline justify-end gap-1.5 font-black italic whitespace-nowrap flex-nowrap ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    <span className="text-xs md:text-sm">{t.type === 'INCOME' ? '+' : '-'} Rp</span>
                                    <span className="text-2xl md:text-3xl tracking-tighter leading-none">{t.amount.toLocaleString()}</span>
                                 </div>
                              </td>
                              <td className="px-12 py-8 text-center min-w-[150px]">
                                 <div className="flex justify-center gap-2">
                                    <button onClick={() => setEditingTransaction(t)} className="p-3 bg-white text-slate-300 hover:text-blue-600 rounded-xl transition-all shadow-sm border border-slate-50"><Edit3 size={16}/></button>
                                    <button onClick={() => setConfirmDeleteTx(t)} className="p-3 bg-white text-slate-300 hover:text-rose-500 rounded-xl transition-all shadow-sm border border-slate-50"><Trash2 size={16}/></button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

      {activeTab === 'PAYROLL' && (
        <div className="space-y-12 px-4 animate-in fade-in slide-in-from-top-4">
           <div className="relative max-w-2xl mx-auto shadow-2xl shadow-slate-200/50">
              <Search size={22} className="absolute left-8 top-1/2 -translate-y-1/2 text-blue-500" />
              <input type="text" placeholder="CARI NAMA GURU ATAU KELAS..." value={payrollSearch} onChange={e => setPayrollSearch(e.target.value.toUpperCase())} className="w-full pl-16 pr-8 py-6 bg-white border border-slate-100 rounded-full text-[12px] font-black uppercase outline-none shadow-sm focus:border-blue-500 transition-all placeholder:text-slate-300" />
           </div>

           <div className="space-y-10">
              {payrollQueue.length > 0 ? payrollQueue.map((item: any) => (
                 <div key={item.id} className="bg-white rounded-[4rem] border-2 border-slate-50 shadow-2xl overflow-hidden group hover:border-blue-200 transition-all duration-500">
                    <div className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                       <div className="flex items-center gap-8 flex-1 min-w-0">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${item.category === 'PRIVATE' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}><Package size={32} /></div>
                          <div className="min-w-0 flex-1">
                             <div className="flex flex-wrap items-center gap-3">
                                <h4 className="text-xl md:text-2xl font-black text-slate-800 uppercase italic leading-tight">{item.className}</h4>
                                <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${item.category === 'PRIVATE' ? 'bg-orange-500 text-white' : 'bg-blue-900 text-white'}`}>{item.category}</span>
                             </div>
                             <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2 italic">Guru Penerima: {item.teacherName}</p>
                             <div className="flex items-center gap-4 mt-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12}/> Update: {formatDate(item.fullPackageLogs[item.fullPackageLogs.length-1]?.date || '')}</span>
                                <span className="px-4 py-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-full text-[8px] font-black uppercase tracking-widest">SIAP CAIR ({item.sessionCount} SESI)</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-8 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                          <div className="text-right pr-6 border-r border-slate-200 min-w-[140px]">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-1 italic">Total Cairkan</p>
                             <p className="text-3xl font-black italic tracking-tighter text-blue-600 whitespace-nowrap">Rp {item.amount.toLocaleString()}</p>
                          </div>
                          <button onClick={() => setSelectedPayout(item)} className="px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-600 active:scale-95 transition-all">BAYAR SEKARANG</button>
                       </div>
                    </div>
                    
                    <div className="px-10 pb-10">
                       <div className="mb-4 flex items-center gap-2">
                         <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sesi Asli Guru Tersebut</p>
                         <div className="w-3 h-3 bg-orange-500 rounded-full ml-4"></div>
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Guru Tersebut Menggantikan</p>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-8 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-inner">
                          {[1,2,3,4,5,6].map((num) => {
                             const log = item.fullPackageLogs.find((l: any) => l.sessionNumber === num);
                             const isMeTeaching = log && log.teacherId === item.teacherId;
                             const isOriginalOwner = log && log.originalTeacherId === item.teacherId;
                             
                             let bgColor = "bg-white text-slate-200 border-dashed border-2 border-slate-100";
                             let label = "KOSONG";
                             let subInfo = "";

                             if (isMeTeaching && isOriginalOwner) { 
                                bgColor = "bg-blue-600 text-white shadow-lg ring-4 ring-blue-50"; 
                                label = "SESI ASLI"; 
                             } else if (isMeTeaching && !isOriginalOwner) { 
                                bgColor = "bg-orange-50 text-white shadow-lg ring-4 ring-orange-50"; 
                                label = "MENGGANTIKAN"; 
                                subInfo = `Ganti: ${log.substituteFor?.split(' ')[0] || 'TEMAN'}`; 
                             } else if (log) { 
                                bgColor = "bg-slate-200 text-slate-400 opacity-50"; 
                                label = "GURU LAIN"; 
                             }

                             return (
                               <div key={num} className={`relative p-5 py-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-2 transition-all ${bgColor}`}>
                                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Sesi {num}</p>
                                  {isMeTeaching && isOriginalOwner ? <UserCheck size={24}/> : (isMeTeaching && !isOriginalOwner) ? <Repeat size={24}/> : <Zap size={24}/>}
                                  <p className="text-[7px] font-black uppercase tracking-widest leading-none mt-1">{label}</p>
                                  {subInfo && <p className="text-[6px] font-black uppercase opacity-90 mt-1">{subInfo}</p>}
                                  {log && (
                                     <div className="mt-2 pt-2 border-t border-white/20 w-full">
                                        <p className="text-[8px] font-black tracking-widest opacity-80">{formatDate(log.date)}</p>
                                     </div>
                                  )}
                               </div>
                             );
                          })}
                       </div>
                    </div>
                 </div>
              )) : (
                 <div className="py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30 mx-4">
                    <CheckCircle2 size={64} className="mx-auto mb-6 text-slate-300" />
                    <p className="font-black text-[11px] uppercase tracking-[0.4em] italic leading-relaxed text-center">Antrean Honor Bersih. ✨</p>
                 </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'STUDENT_ACC' && (
        <div className="space-y-12 px-4">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {studentPayments.filter(p => p.status === 'PENDING').map((p) => (
                 <div key={p.id} className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col justify-between hover:border-emerald-500 transition-all group">
                    <div>
                       <div className="flex justify-between items-start mb-8">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500"><Banknote size={36}/></div>
                          <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[8px] font-black uppercase tracking-widest">Antrean SPP</span>
                       </div>
                       <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{formatDate(p.date)}</p>
                       <h4 className="text-xl font-black text-slate-800 uppercase italic leading-tight mb-2 truncate">{p.studentName}</h4>
                       <p className="text-[10px] font-black text-blue-600 uppercase mb-8">{p.className}</p>
                       <div className="bg-slate-50 p-6 rounded-3xl mb-10 text-center border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Nominal</p>
                          <p className="text-3xl font-black text-emerald-600 italic tracking-tighter">Rp {p.amount.toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <button onClick={() => setPreviewImg(p.receiptData || null)} className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all border border-transparent"><Eye size={16}/> LIHAT BUKTI</button>
                       <button onClick={() => handleVerifySPP(p)} disabled={isLoading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                          {isLoading ? <Loader2 size={16} className="animate-spin"/> : <><Check size={16}/> KONFIRMASI & MASUK KAS ✨</>}
                       </button>
                    </div>
                 </div>
              ))}
              {studentPayments.filter(p => p.status === 'PENDING').length === 0 && (
                 <div className="col-span-full py-40 text-center opacity-20"><ShieldCheck size={64} className="mx-auto mb-6"/><p className="text-[12px] font-black uppercase italic leading-relaxed text-center">Semua SPP Sudah Terverifikasi! ✨</p></div>
              )}
           </div>
        </div>
      )}

      {/* MODAL TAMBAH TRANSAKSI MANUAL */}
      {showAddModal && (
         <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
            <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 md:p-12 shadow-2xl relative overflow-hidden">
               <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
               <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-8 tracking-tighter">Input <span className="text-blue-600">Manual</span></h4>
               <form onSubmit={handleAddTransaction} className="space-y-6">
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                     <button type="button" onClick={() => setAddForm({...addForm, type: 'INCOME'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${addForm.type === 'INCOME' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Masuk</button>
                     <button type="button" onClick={() => setAddForm({...addForm, type: 'EXPENSE'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${addForm.type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-400'}`}>Keluar</button>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Deskripsi Transaksi</label>
                     <input type="text" placeholder="MISAL: BAYAR LISTRIK..." value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Kategori</label>
                     <input type="text" placeholder="MISAL: LISTRIK, GAJI, DLL..." value={addForm.category} onChange={e => setAddForm({...addForm, category: e.target.value.toUpperCase()})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Nominal (Rp)</label>
                     <input type="number" placeholder="0" value={addForm.amount || ''} onChange={e => setAddForm({...addForm, amount: parseInt(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-lg outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Tanggal</label>
                     <input type="date" value={addForm.date} onChange={e => setAddForm({...addForm, date: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                     {isLoading ? <Loader2 size={18} className="animate-spin"/> : 'SIMPAN TRANSAKSI ✨'}
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* MODAL IMPORT BOX */}
      {showImportModal && (
         <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
            <div className="bg-white w-full max-w-lg rounded-[4rem] p-10 md:p-12 shadow-2xl relative overflow-hidden">
               <button onClick={() => setShowImportModal(false)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
               <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl"><FileText size={24}/></div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Import Box</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">Format: tgl,deskripsi,kategori,tipe,nominal</p>
                  </div>
               </div>
               <div className="space-y-6">
                  <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3">Contoh Format Satu Baris:</p>
                    <code className="text-[10px] font-mono font-bold text-slate-500 block bg-white p-3 rounded-xl border border-blue-50">2026-01-20,BAYAR LISTRIK,UTILITAS,EXPENSE,50000</code>
                  </div>
                  <textarea 
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="TEMPEL DATA DISINI (KOMPAS BERBARIS BARU)..."
                    rows={8}
                    className="w-full p-8 bg-slate-50 rounded-[2rem] font-mono text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all shadow-inner"
                  />
                  <button onClick={handleImportCSV} disabled={isLoading || !importText.trim()} className="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl flex items-center justify-center gap-3">
                     {isLoading ? <Loader2 size={24} className="animate-spin"/> : <><Zap size={20}/> PROSES IMPORT MASSAL ✨</>}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* MODAL EDIT TRANSAKSI */}
      {editingTransaction && (
         <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
            <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 md:p-12 shadow-2xl relative overflow-hidden">
               <button onClick={() => setEditingTransaction(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
               <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-8 tracking-tighter">Edit <span className="text-blue-600">Transaksi</span></h4>
               <form onSubmit={handleUpdateTx} className="space-y-6">
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                     <button type="button" onClick={() => setEditingTransaction({...editingTransaction, type: 'INCOME'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${editingTransaction.type === 'INCOME' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Masuk</button>
                     <button type="button" onClick={() => setEditingTransaction({...editingTransaction, type: 'EXPENSE'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${editingTransaction.type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-400'}`}>Keluar</button>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Deskripsi</label>
                     <input type="text" value={editingTransaction.description} onChange={e => setEditingTransaction({...editingTransaction, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Kategori</label>
                     <input type="text" value={editingTransaction.category} onChange={e => setEditingTransaction({...editingTransaction, category: e.target.value.toUpperCase()})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Nominal (Rp)</label>
                     <input type="number" value={editingTransaction.amount} onChange={e => setEditingTransaction({...editingTransaction, amount: parseInt(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-lg outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Tanggal</label>
                     <input type="date" value={editingTransaction.date} onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">
                     {isLoading ? <Loader2 size={18} className="animate-spin"/> : 'UPDATE DATA ✨'}
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {confirmDeleteTx && (
         <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
            <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl">
               <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-pulse"><AlertTriangle size={48} /></div>
               <div className="space-y-2"><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Hapus Transaksi?</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Data yang sudah dihapus tidak bisa dikembalikan lagi Kak.</p></div>
               <div className="flex gap-4"><button onClick={() => setConfirmDeleteTx(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button><button onClick={handleDeleteTx} disabled={isLoading} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">{isLoading ? <Loader2 size={18} className="animate-spin"/> : <Check size={18}/>} IYA, HAPUS</button></div>
            </div>
         </div>
      )}

      {/* MODAL PEMBAYARAN HONOR GURU */}
      {selectedPayout && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <button onClick={() => setSelectedPayout(null)} className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-500 hover:text-white transition-all z-20"><X size={20}/></button>
              
              <div className="text-center mb-8 relative z-10">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3"><Banknote size={40} /></div>
                 <h4 className="text-xl font-black text-slate-800 uppercase italic leading-tight">Konfirmasi Bayar Honor</h4>
                 <p className="text-[10px] font-bold text-blue-600 uppercase mt-2">{selectedPayout.teacherName}</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl mb-8 space-y-4 border border-slate-100 relative z-10">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                    <span>Sesi Terakumulasi:</span>
                    <span className="text-slate-800">{selectedPayout.sessionCount} Sesi</span>
                 </div>
                 <div className="flex justify-between items-baseline pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] font-black uppercase text-slate-400">Nominal:</span>
                    <div className="flex items-baseline gap-1.5 whitespace-nowrap flex-nowrap">
                       <span className="text-sm font-black italic text-emerald-600">Rp</span>
                       <span className="text-4xl font-black italic text-emerald-600 tracking-tighter leading-none">{selectedPayout.amount.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-6 relative z-10">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 flex items-center gap-2">
                       <Upload size={14} className="text-blue-500" /> Bukti Bayar (Gambar)
                    </label>
                    
                    {!payForm.receiptData ? (
                       <>
                          <input type="file" ref={fileInputPayoutRef} onChange={handleUploadProof} className="hidden" accept="image/*" />
                          <button 
                            onClick={() => fileInputPayoutRef.current?.click()}
                            className="w-full py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-white transition-all group"
                          >
                             <ImageIcon size={32} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-blue-600">Klik / Upload Bukti Bayar</span>
                          </button>
                       </>
                    ) : (
                       <div className="flex gap-2">
                          <button 
                             onClick={() => setPreviewImg(payForm.receiptData)}
                             className="flex-1 py-6 bg-emerald-50 text-emerald-600 rounded-[2rem] border-2 border-emerald-100 font-black text-[10px] uppercase flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all shadow-sm"
                          >
                             <Eye size={20}/> PREVIEW
                          </button>
                          <button 
                             onClick={() => setPayForm({...payForm, receiptData: ''})}
                             className="w-20 py-6 bg-rose-50 text-rose-500 rounded-[2rem] border-2 border-rose-100 flex items-center justify-center hover:bg-rose-100 transition-all shadow-sm"
                          >
                             <Trash2 size={24}/>
                          </button>
                       </div>
                    )}
                 </div>

                 <button onClick={executePayTeacher} disabled={isLoading || !payForm.receiptData} className="w-full py-7 bg-slate-900 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-emerald-600 disabled:opacity-30 transition-all flex items-center justify-center gap-3 active:scale-95">
                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : <><CheckCircle2 size={24}/> KONFIRMASI BAYAR HONOR ✨</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* GLOBAL PREVIEW IMAGE */}
      {previewImg && (
        <div className="fixed inset-0 z-[300000] bg-slate-900/95 flex flex-col items-center justify-center p-6" onClick={() => setPreviewImg(null)}>
           <div className="relative max-w-4xl w-full flex flex-col items-center">
              <button className="absolute -top-14 right-0 p-4 text-white hover:text-rose-500 transition-colors" onClick={() => setPreviewImg(null)}><X size={40}/></button>
              <img src={previewImg} className="max-w-full max-h-[75vh] rounded-[3rem] shadow-2xl border-4 border-white/10 object-contain animate-in zoom-in" alt="Preview" />
              <div className="mt-8 text-center"><p className="text-[10px] font-black text-white/40 uppercase tracking-[0.8em] italic">Sanur Payment Verification ✨</p></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinance;
