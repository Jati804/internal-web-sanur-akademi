import React, { useState, useRef } from 'react';
import { Receipt, ShieldCheck, ClipboardList, Loader2, Download, AlertCircle, CheckCircle2, Sparkles, Plus, Trash2, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const formatDateToDMY = (date: string) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const generateReceiptId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `RCP-${timestamp}-${random}`.toUpperCase();
};

interface PaymentItem {
  id: string;
  description: string;
  amount: string;
}

const AdminReceipts: React.FC = () => {
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<any | null>(null);
  
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
      id: generateReceiptId(),
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
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    setTimeout(() => {
      const previewElement = document.getElementById('receipt-preview');
      if (previewElement) {
        previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
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

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`KUITANSI_${generatedReceipt.id}_${generatedReceipt.receivedFrom.replace(/\s+/g, '_')}.pdf`);
      
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
            <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mt-2">Generate Bukti/Nota Pembayaran</p>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <div className="fixed top-8 right-8 z-[100000] bg-emerald-600 text-white px-8 py-6 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-bounce">
          <CheckCircle2 size={28} strokeWidth={3} />
          <div>
            <p className="font-black text-sm uppercase">Kuitansi Berhasil Dibuat! ✨</p>
            <p className="text-[10px] font-bold opacity-90 mt-1">Scroll ke bawah untuk lihat & download</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Form Input */}
        <div className="bg-white rounded-[4rem] shadow-2xl border-2 border-slate-100 p-12 space-y-8">
          <div className="flex items-center gap-4 pb-6 border-b-2 border-slate-100">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <ClipboardList size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase italic">Data Kuitansi</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Diterima Dari */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                Diterima Dari *
              </label>
              <input
                type="text"
                value={form.receivedFrom}
                onChange={(e) => setForm({...form, receivedFrom: e.target.value})}
                placeholder="Nama Pembayar"
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
                Tanggal Pembayaran *
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
                Item Pembayaran *
              </label>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[9px] uppercase hover:bg-blue-100 transition-all"
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
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-6 border-2 border-emerald-100">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Pembayaran:</p>
                <p className="text-3xl font-black text-emerald-600 italic">
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
                <p className="text-[11px] font-bold text-rose-600 mt-1">Mohon isi nama pembayar dan minimal 1 item pembayaran dengan nominal yang valid.</p>
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
              className="flex-[2] py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-wide shadow-2xl hover:shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={20} />
              Generate Kuitansi
            </button>
          </div>
        </div>

        {/* Preview Section */}
        {generatedReceipt && (
          <div id="receipt-preview" className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase italic">Preview Kuitansi</h2>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Siap untuk di-download ✨</p>
                </div>
              </div>
              
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-wide shadow-xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
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
            </div>

            {/* Rendered Receipt */}
            <div className="flex justify-center">
              <div 
                ref={slipRef}
                className="bg-white p-12 md:p-20 space-y-10 w-full max-w-[700px] overflow-hidden text-slate-900 border-8 border-double border-slate-100 shadow-2xl"
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10">
                  <div className="min-w-0 text-left">
                    <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">SANUR</h1>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mt-1 text-left">Akademi Inspirasi</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <h2 className="text-xl font-black uppercase italic text-slate-800 leading-none">KUITANSI RESMI</h2>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-2 whitespace-nowrap">ID: {generatedReceipt.id}</p>
                  </div>
                </div>

                {/* Info Section */}
                <div className="grid grid-cols-12 gap-10">
                  <div className="col-span-8 pr-6 border-r border-slate-50 text-left">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Diterima Dari:</p>
                    <p className="text-lg font-black text-slate-900 uppercase italic text-left">{generatedReceipt.receivedFrom}</p>
                  </div>
                  <div className="col-span-4 text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal:</p>
                    <p className="text-base font-black text-slate-800 uppercase italic">{formatDateToDMY(generatedReceipt.date)}</p>
                  </div>
                </div>

                {/* Payment Details - NOTA STYLE */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-slate-400 border-b-2 border-slate-50 pb-2">
                    <ClipboardList size={14} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Rincian Pembayaran</p>
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
                      <div className="grid grid-cols-12 gap-4 p-6 bg-emerald-100">
                        <div className="col-span-8 text-left">
                          <p className="text-[13px] font-black text-emerald-700 uppercase tracking-wide">TOTAL</p>
                        </div>
                        <div className="col-span-4 text-right">
                          <p className="text-[14px] font-black text-emerald-700">Rp {generatedReceipt.total.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Payment Method */}
                    <div className="px-6 py-4 border-t border-slate-200/60">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Metode Pembayaran:</p>
                      <p className="text-[11px] font-black text-blue-600 uppercase text-left">{generatedReceipt.paymentMethod}</p>
                    </div>
                  </div>
                </div>

                {/* Amount Section */}
                <div className="pt-8 border-t-2 border-slate-900">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VERIFIKASI SISTEM:</p>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Terverifikasi Digital</p>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Status: LUNAS</p>
                    </div>
                  </div>
                  <p className="text-5xl font-black text-emerald-600 italic leading-none text-left">
                    Rp {generatedReceipt.total.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Footer */}
                <div className="pt-10 border-t border-slate-100 flex justify-between items-end gap-10">
                  <div className="max-w-xs text-left">
                    <p className="text-[10px] font-bold text-slate-400 italic text-left">
                      "Kuitansi ini sah sebagai bukti pembayaran resmi dari SANUR Akademi Inspirasi dan telah terverifikasi sistem internal."
                    </p>
                  </div>
                  <div className="text-center flex flex-col items-center shrink-0">
                    <ShieldCheck size={44} className="text-slate-900 opacity-20 mb-2" />
                    <p className="text-[13px] font-black uppercase text-slate-900 tracking-tight leading-none">Admin Sanur</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">Official Receipt</p>
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
