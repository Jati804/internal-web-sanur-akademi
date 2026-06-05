import React, { useState, useRef } from 'react';
import { Receipt, ShieldCheck, ClipboardList, Loader2, Download, AlertCircle, CheckCircle2, Sparkles, Plus, Trash2, X, TrendingUp, TrendingDown, Database } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../services/supabase.ts';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM as any;

const formatDateToDMY = (date: string) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const generateReceiptId = (type: 'income' | 'expense') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  const prefix = type === 'income' ? 'IN' : 'OUT';
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

interface PaymentItem {
  id: string;
  description: string;
  amount: string;
}

const AdminReceipts: React.FC = () => {
  const navigate = useNavigate();
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [savingToLedger, setSavingToLedger] = useState(false);
  const [savedTransactionId, setSavedTransactionId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    receivedFrom: '',
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
    paymentMethod: 'TRANSFER'
  });

  const [items, setItems] = useState<PaymentItem[]>([
    { id: '1', description: '', amount: '' }
  ]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', amount: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: 'description' | 'amount', value: string) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, [field]: field === 'amount' ? value.replace(/[.,]/g, '') : value }
        : item
    ));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const isFormValid = () => {
    const hasReceivedFrom = form.receivedFrom.trim().length > 0;
    const hasValidItems = items.some(item => item.description.trim() && parseFloat(item.amount) > 0);
    const total = calculateTotal();
    return hasReceivedFrom && hasValidItems && total > 0;
  };

  const handleGenerate = () => {
    if (!isFormValid()) {
      setShowErrors(true);
      setTimeout(() => setShowErrors(false), 3000);
      return;
    }

    const validItems = items.filter(item => item.description.trim() && parseFloat(item.amount) > 0);
    
    const receipt = {
      id: generateReceiptId(activeTab),
      type: activeTab,
      receivedFrom: form.receivedFrom.trim(),
      items: validItems.map(item => ({
        description: item.description.trim(),
        amount: parseFloat(item.amount)
      })),
      total: calculateTotal(),
      date: form.date,
      paymentMethod: form.paymentMethod,
      generatedAt: new Date().toISOString()
    };

    setGeneratedReceipt(receipt);
    setSavedTransactionId(null); // Reset status saved
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    setTimeout(() => {
      const previewElement = document.getElementById('receipt-preview');
      if (previewElement) {
        previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const handleSaveToLedger = async () => {
    if (!generatedReceipt) return;
    
    setSavingToLedger(true);
    try {
      // Generate ID dengan format TX-IMP-timestamp-random
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 7);
      const generatedId = `TX-IMP-${timestamp}-${random}`;
      
      // Gabungkan semua item jadi satu deskripsi
      const itemDescriptions = generatedReceipt.items
        .map((item: any) => item.description)
        .join(', ');
      
      const fullDescription = `${generatedReceipt.receivedFrom} - ${itemDescriptions}`;
      
      // Siapkan data sesuai format database
      const ledgerData = {
        id: generatedId, // ✅ Tambahin ID manual
        type: generatedReceipt.type.toUpperCase(), // 'INCOME' atau 'EXPENSE'
        category: 'UMUM',
        amount: generatedReceipt.total,
        date: generatedReceipt.date,
        description: fullDescription
      };

      console.log('📤 Data yang akan disave:', ledgerData);

      // Insert ke database
      const { data, error } = await supabase
        .from('transactions')
        .insert([ledgerData])
        .select()
        .single();

      console.log('📥 Response dari Supabase:', { data, error });

      if (error) {
        console.error('❌ Error detail:', error);
        throw error;
      }

      // Simpan ID transaksi yang baru dibuat
      setSavedTransactionId(data.id);
      
      // Tampilkan notif sukses sebentar
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Redirect ke Finance dengan highlight
      navigate('/admin/finance', { 
        state: { 
          tab: 'LEDGER',
          highlightTx: {
            id: data.id,
            type: generatedReceipt.type.toUpperCase()
          }
        } 
      });
      
    } catch (error) {
      console.error('💥 Catch error:', error);
      alert('Gagal save ke ledger. Coba lagi ya!');
    } finally {
      setSavingToLedger(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!slipRef.current || !generatedReceipt) return;
    
    setDownloading(true);
    try {
      const canvas = await html2canvas(slipRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

const pageWidth = 210;
const pageHeight = 297;
const imgWidth = pageWidth;
const imgHeight = (canvas.height * imgWidth) / canvas.width;

if (imgHeight <= pageHeight) {
  // Konten muat di 1 halaman, langsung masuk
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
} else {
  // Konten terlalu panjang, scale down supaya pas di 1 halaman
  const scaledWidth = (pageHeight * canvas.width) / canvas.height;
  const xOffset = (pageWidth - scaledWidth) / 2;
  pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, pageHeight);
}
      const docType = generatedReceipt.type === 'income' ? 'KUITANSI' : 'BON';
      pdf.save(`${docType}_${generatedReceipt.id}_${generatedReceipt.receivedFrom.replace(/\s+/g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF. Silakan coba lagi.');
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setForm({
      receivedFrom: '',
      date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
      paymentMethod: 'TRANSFER'
    });
    setItems([{ id: '1', description: '', amount: '' }]);
    setGeneratedReceipt(null);
    setShowErrors(false);
    setSavedTransactionId(null);
  };

  const handleTabChange = (tab: 'income' | 'expense') => {
    setActiveTab(tab);
    handleReset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex items-center gap-6 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-3">
            <Receipt size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 uppercase italic leading-none">Workspace Kuitansi</h1>
            <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mt-2">Generate Bukti Pembayaran</p>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <div className="fixed top-8 right-8 z-[100000] bg-emerald-600 text-white px-8 py-6 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-bounce">
          <CheckCircle2 size={28} strokeWidth={3} />
          <div>
            <p className="font-black text-sm uppercase">
              {activeTab === 'income' ? 'Kuitansi' : 'Bon'} Berhasil Dibuat! ✨
            </p>
            <p className="text-[10px] font-bold opacity-90 mt-1">Scroll ke bawah untuk lihat & download</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Tab Switcher */}
        <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-slate-100 p-3 flex gap-3">
          <button
            onClick={() => handleTabChange('income')}
            className={`flex-1 py-6 rounded-[2rem] font-black text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-3 ${
              activeTab === 'income'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-xl'
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <TrendingUp size={20} />
            Pemasukan
          </button>
          <button
            onClick={() => handleTabChange('expense')}
            className={`flex-1 py-6 rounded-[2rem] font-black text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-3 ${
              activeTab === 'expense'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xl'
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <TrendingDown size={20} />
            Pengeluaran
          </button>
        </div>

        {/* Form Input */}
        <div className="bg-white rounded-[4rem] shadow-2xl border-2 border-slate-100 p-12 space-y-8">
          <div className="flex items-center gap-4 pb-6 border-b-2 border-slate-100">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              activeTab === 'income' 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'bg-rose-50 text-rose-600'
            }`}>
              <ClipboardList size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase italic">
              Data {activeTab === 'income' ? 'Kuitansi' : 'Bon Pengeluaran'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Diterima Dari / Dibayar Kepada */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                {activeTab === 'income' ? 'Diterima Dari *' : 'Dibayar Kepada *'}
              </label>
              <input
                type="text"
                value={form.receivedFrom}
                onChange={(e) => setForm({...form, receivedFrom: e.target.value})}
                placeholder={activeTab === 'income' ? 'Nama Pembayar' : 'Nama Penerima/Vendor'}
                className={`w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 transition-all ${
                  showErrors && !form.receivedFrom.trim() 
                    ? 'border-rose-300 bg-rose-50' 
                    : 'border-transparent focus:border-blue-200 focus:bg-white'
                }`}
              />
            </div>

            {/* Tanggal */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                Tanggal {activeTab === 'income' ? 'Pembayaran' : 'Pengeluaran'} *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({...form, date: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-200 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                Item {activeTab === 'income' ? 'Pembayaran' : 'Pengeluaran'} *
              </label>
              <button
                onClick={addItem}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase transition-all ${
                  activeTab === 'income'
                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                }`}
              >
                <Plus size={14} /> Tambah Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Nama item / keterangan"
                      className={`w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 transition-all ${
                        showErrors && !item.description.trim() 
                          ? 'border-rose-300 bg-rose-50' 
                          : 'border-transparent focus:border-blue-200 focus:bg-white'
                      }`}
                    />
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                      placeholder="Nominal (Rp)"
                      min="0"
                      className={`w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 transition-all ${
                        showErrors && (!item.amount || parseFloat(item.amount) <= 0) 
                          ? 'border-rose-300 bg-rose-50' 
                          : 'border-transparent focus:border-blue-200 focus:bg-white'
                      }`}
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Total Display */}
            <div className={`rounded-2xl p-6 border-2 ${
              activeTab === 'income'
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
                : 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-100'
            }`}>
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Total {activeTab === 'income' ? 'Pemasukan' : 'Pengeluaran'}:
                </p>
                <p className={`text-3xl font-black italic ${
                  activeTab === 'income' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  Rp {calculateTotal().toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                Metode Pembayaran
              </label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({...form, paymentMethod: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-200 focus:bg-white transition-all appearance-none"
              >
                <option value="TRANSFER">Transfer Bank</option>
                <option value="CASH">Tunai / Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="E-WALLET">E-Wallet</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {showErrors && !isFormValid() && (
            <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-6 flex items-start gap-4">
              <AlertCircle size={24} className="text-rose-600 shrink-0 mt-1" />
              <div>
                <p className="text-sm font-black text-rose-800 uppercase">Data Belum Lengkap!</p>
                <p className="text-[11px] font-bold text-rose-600 mt-1">
                  Mohon isi nama {activeTab === 'income' ? 'pembayar' : 'penerima'} dan minimal 1 item dengan nominal yang valid.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              onClick={handleReset}
              className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-wide hover:bg-slate-100 active:scale-95 transition-all"
            >
              Reset Form
            </button>
            <button
              onClick={handleGenerate}
              disabled={!isFormValid()}
              className={`flex-[2] py-5 rounded-2xl font-black text-[11px] uppercase tracking-wide shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'income'
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-emerald-200'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 text-white hover:shadow-rose-200'
              }`}
            >
              <Sparkles size={20} />
              Generate {activeTab === 'income' ? 'Kuitansi' : 'Bon'}
            </button>
          </div>
        </div>

        {/* Preview Section */}
        {generatedReceipt && (
          <div id="receipt-preview" className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  generatedReceipt.type === 'income'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase italic">
                    Preview {generatedReceipt.type === 'income' ? 'Kuitansi' : 'Bon'}
                  </h2>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
                    generatedReceipt.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {savedTransactionId ? 'Tersimpan di Ledger ✨' : 'Siap untuk di-download'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-wide shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  {downloading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Download PDF
                    </>
                  )}
                </button>

                {!savedTransactionId && (
                  <button
                    onClick={handleSaveToLedger}
                    disabled={savingToLedger}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wide shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    {savingToLedger ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Database size={18} />
                        Save to Ledger
                      </>
                    )}
                  </button>
                )}

                {savedTransactionId && (
                  <div className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wide shadow-xl flex items-center gap-3">
                    <CheckCircle2 size={18} />
                    Tersimpan! ✨
                  </div>
                )}
              </div>
            </div>

            {/* Rendered Receipt */}
<div className="flex justify-center">
  <div
    style={{
      width: '210mm',
      minHeight: '297mm',
      boxSizing: 'border-box',
      position: 'relative',
    }}
    ref={slipRef}
    className="bg-white p-12 md:p-20 overflow-hidden text-slate-900 border-8 border-double border-slate-100 shadow-2xl"
  >
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10">
                  <div className="min-w-0 text-left">
                    <img src="https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/SANUR%20Logo.png" style={{ maxHeight: '90px', width: 'auto', objectFit: 'contain' }} />
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <h2 className={`text-xl font-black uppercase leading-none ${
                      generatedReceipt.type === 'income' ? 'text-blue-700' : 'text-orange-600'
                    }`}>
                      {generatedReceipt.type === 'income' ? 'KUITANSI RESMI' : 'BON PENGELUARAN'}
                    </h2>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-2 whitespace-nowrap">ID: {generatedReceipt.id}</p>
                  </div>
                </div>

                {/* Info Section */}
                <div className="grid grid-cols-12 gap-10">
                  <div className="col-span-8 pr-6 border-r border-slate-50 text-left">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">
                      {generatedReceipt.type === 'income' ? 'Diterima Dari:' : 'Dibayar Kepada:'}
                    </p>
                    <p className="text-lg font-black text-slate-900 uppercase text-left">{generatedReceipt.receivedFrom}</p>
                  </div>
                  <div className="col-span-4 text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal:</p>
                    <p className="text-base font-black text-slate-800 uppercase">{formatDateToDMY(generatedReceipt.date)}</p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-slate-400 border-b-2 border-slate-50 pb-2">
                    <ClipboardList size={14} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                      Rincian {generatedReceipt.type === 'income' ? 'Pembayaran' : 'Pengeluaran'}
                    </p>
                  </div>
                  
                  {/* Items Table */}
                  <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
                    <div className="divide-y divide-slate-200/60">
                      {generatedReceipt.items.map((item: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 p-6">
                          <div className="col-span-8 text-left">
                            <p className="text-[12px] font-black text-slate-800 uppercase">{item.description}</p>
                          </div>
                          <div className="col-span-4 text-right">
                            <p className="text-[12px] font-black text-slate-800">Rp {item.amount.toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Total Row */}
                      <div className={`grid grid-cols-12 gap-4 p-6 ${
                        generatedReceipt.type === 'income' ? 'bg-blue-100' : 'bg-orange-100'
                      }`}>
                        <div className="col-span-8 text-left">
                          <p className={`text-[13px] font-black uppercase tracking-wide ${
                            generatedReceipt.type === 'income' ? 'text-blue-700' : 'text-orange-600'
                          }`}>
                            TOTAL
                          </p>
                        </div>
                        <div className="col-span-4 text-right">
                          <p className={`text-[14px] font-black ${
                            generatedReceipt.type === 'income' ? 'text-blue-700' : 'text-orange-600'
                          }`}>
                            Rp {generatedReceipt.total.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
{/* Payment Method + Status sejajar */}
                    <div className="px-6 py-4 border-t border-slate-200/60 flex justify-between items-center">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Metode Pembayaran:</p>
                        <p className={`text-[11px] font-black uppercase ${
                          generatedReceipt.type === 'income' ? 'text-blue-600' : 'text-orange-500'
                        }`}>
                          {generatedReceipt.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status:</p>
                        <p className={`text-[11px] font-black uppercase ${
                          generatedReceipt.type === 'income' ? 'text-blue-600' : 'text-orange-500'
                        }`}>
                          {generatedReceipt.type === 'income' ? '✓ LUNAS' : '✓ TERBAYAR'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

{/* Footer */}
                <div
                  style={{ position: 'absolute', bottom: '2rem', left: '5rem', right: '5rem' }}
                  className="space-y-4"
                >
                  {/* Legal + Admin */}
                  <div className="border-t border-slate-200 pt-5 flex justify-between items-start">
                    <p className="text-[9px] font-bold text-slate-400 italic max-w-xs">
                      "{generatedReceipt.type === 'income'
                        ? 'Kuitansi ini sah sebagai bukti pembayaran resmi dari SANUR Akademi Inspirasi dan telah terverifikasi sistem internal.'
                        : 'Bon ini sah sebagai bukti pengeluaran resmi dari SANUR Akademi Inspirasi dan telah terverifikasi sistem internal.'
                      }"
                    </p>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <ShieldCheck size={18} className="text-slate-400" />
                      <p className="text-[10px] font-black uppercase text-slate-700 leading-none">Admin Sanur</p>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Official Receipt</p>
                    </div>
                  </div>
                  {/* Identitas Institusi */}
                  <div className="border-t border-slate-100 pt-3 text-center">
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                      Jl. H. Iming No.107, Beji, Kota Depok, Jawa Barat 16421&nbsp;&nbsp;|&nbsp;&nbsp;+62 813-1548-8000&nbsp;&nbsp;|&nbsp;&nbsp;sanurakademi.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReceipts;
