import React, { useMemo, useState, useRef, useEffect } from 'react';
import { StudentProfile } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  Search, Trash2, X, UserPlus, BookOpen, Edit3, 
  Cake, Building2, Users, Sparkles, Loader2, AlertTriangle, Check,
  Info, Download, Upload, Zap, FileText, ClipboardList, Phone, Mail, Calendar, Briefcase, Clock
} from 'lucide-react';

interface AdminMarketingProps {
  studentProfiles: StudentProfile[];
  setStudentProfiles: React.Dispatch<React.SetStateAction<StudentProfile[]>>;
  salesContacts: any[];
  setSalesContacts: React.Dispatch<React.SetStateAction<any[]>>;
  refreshAllData?: () => Promise<void>;
}

const AdminMarketing: React.FC<AdminMarketingProps> = ({ studentProfiles, setStudentProfiles, salesContacts, setSalesContacts, refreshAllData }) => {
  
  // ✅ TAMBAHIN INI DI BARIS PERTAMA
  console.log('AdminMarketing props:', { 
    studentProfiles: studentProfiles?.length, 
    salesContacts: salesContacts?.length 
  });
  const [activeTab, setActiveTab] = useState<'SISWA' | 'SALES'>('SISWA');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState<'ADD' | 'EDIT' | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<StudentProfile | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<StudentProfile & { status: string }>>({
    name: '', dob: '', institution: '', personalPhone: '', parentPhone: '', enrolledClass: '', notes: '', status: 'SISWA_SANUR'
  });

  // Sales B2B States
  const [searchTermSales, setSearchTermSales] = useState('');
  const [showModalSales, setShowModalSales] = useState<'ADD' | 'EDIT' | null>(null);
  const [showDeleteConfirmSales, setShowDeleteConfirmSales] = useState<any | null>(null);
  const [editingSalesId, setEditingSalesId] = useState<string | null>(null);
  const [salesFormData, setSalesFormData] = useState({
    institutionName: '', contactPerson: '', jobTitle: '', phone: '', email: '', 
    lastContactDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
    nextFollowupDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    dealStatus: 'WARM', meetingNotes: ''
  });

  // ✨ FUNGSI HELPER BUAT TUTUP SEMUA MODAL DULU
  const resetAllModals = () => {
    setShowModal(null);
    setShowModalSales(null);
    setShowDeleteConfirm(null);
    setShowDeleteConfirmSales(null);
    setShowImportModal(false);
  };
  
  useEffect(() => {
  const hasModal = !!(showImportModal || showModal || showDeleteConfirm || showModalSales || showDeleteConfirmSales);
  
  if (hasModal) {
    document.body.style.overflow = 'hidden';
    
    // ✨ PAKSA SCROLL LANGSUNG KE MODAL
    requestAnimationFrame(() => {
      const modalElement = document.querySelector('[data-modal-container]');
      if (modalElement) {
        modalElement.scrollIntoView({ behavior: 'instant', block: 'center' });
        // ✨ PAKSA FOCUS KE MODAL BIAR KELIATAN
        (modalElement as HTMLElement).focus();
      }
    });
    
  } else {
    document.body.style.overflow = '';
  }
  
  return () => {
    document.body.style.overflow = '';
  };
}, [showImportModal, showModal, showDeleteConfirm, showModalSales, showDeleteConfirmSales, activeTab]); // ✨ TAMBAHIN activeTab!

  const todayDate = new Date();
  const todayMonthName = todayDate.toLocaleString('id-ID', { month: 'long' }).toUpperCase();
  const todayDay = todayDate.getDate();
  const todayStrShort = `${todayDay} ${todayMonthName}`;

  const monthBirthdays = useMemo(() => {
    return studentProfiles.filter(p => 
      p.notes?.includes('[SISWA SANUR]') && 
      (p.dob || '').toUpperCase().includes(todayMonthName)
    );
  }, [studentProfiles, todayMonthName]);

  const filteredProfiles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = studentProfiles.filter(p => {
      const isSiswa = p.notes?.includes('[SISWA SANUR]');
      const statusLabel = isSiswa ? 'siswa aktif' : 'prospek marketing';
      return (
        (p.name || '').toLowerCase().includes(term) ||
        (p.institution || '').toLowerCase().includes(term) ||
        (p.personalPhone || '').toLowerCase().includes(term) ||
        (p.parentPhone || '').toLowerCase().includes(term) ||
        (p.dob || '').toLowerCase().includes(term) ||
        (p.notes || '').toLowerCase().includes(term) ||
        statusLabel.includes(term)
      );
    });
    return filtered.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: 'base' }));
  }, [studentProfiles, searchTerm]);

  const filteredSalesContacts = useMemo(() => {
    const term = searchTermSales.toLowerCase();
    const filtered = salesContacts.filter(s => {
      return (
        (s.institutionName || '').toLowerCase().includes(term) ||
        (s.contactPerson || '').toLowerCase().includes(term) ||
        (s.jobTitle || '').toLowerCase().includes(term) ||
        (s.phone || '').toLowerCase().includes(term) ||
        (s.email || '').toLowerCase().includes(term) ||
        (s.dealStatus || '').toLowerCase().includes(term) ||
        (s.meetingNotes || '').toLowerCase().includes(term)
      );
    });
    return filtered.sort((a, b) => {
      const dateA = new Date(a.nextFollowupDate).getTime();
      const dateB = new Date(b.nextFollowupDate).getTime();
      return dateA - dateB;
    });
  }, [salesContacts, searchTermSales]);

  const urgentSalesContacts = useMemo(() => {
    const today = new Date();
    return salesContacts.filter(s => {
      const lastContact = new Date(s.lastContactDate);
      const diffDays = Math.floor((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 7;
    });
  }, [salesContacts]);

  const handleOpenEdit = (profile: any) => {
    setEditingId(profile.id);
    const isSiswa = (profile.notes || '').includes('[SISWA SANUR]');
    setFormData({
      name: profile.name, 
      dob: profile.dob, 
      institution: profile.institution,
      personalPhone: profile.personalPhone || profile.personalphone || '-', 
      parentPhone: profile.parentPhone || profile.parentphone || '-',
      enrolledClass: profile.enrolledClass || profile.enrolledclass || '-', 
      notes: (profile.notes || '').replace(/\[.*?\]/g, '').trim(),
      status: isSiswa ? 'SISWA_SANUR' : 'PROSPEK'
    });
    setShowModal('EDIT');
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setIsLoading(true);
    const processedNotes = `${formData.status === 'SISWA_SANUR' ? '[SISWA SANUR]' : '[PROSPEK MARKETING]'} ${formData.notes || ''}`;
    const payload = { 
      name: formData.name!.toUpperCase(), 
      dob: (formData.dob || '').toUpperCase(),
      institution: (formData.institution || '').toUpperCase(),
      personalphone: formData.personalPhone || '-',
      parentphone: formData.parentPhone || '-',
      enrolledclass: formData.enrolledClass?.toUpperCase() || '-',
      notes: processedNotes.toUpperCase() 
    };
    try {
      if (showModal === 'ADD') {
        const id = `p-${Date.now()}`;
        await supabase.from('student_profiles').insert({ ...payload, id });
      } else {
        await supabase.from('student_profiles').update(payload).eq('id', editingId);
      }
      if (refreshAllData) await refreshAllData();
      setShowModal(null);
    } catch (e: any) { 
      alert(e.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleOpenEditSales = (sales: any) => {
  resetAllModals(); // ✨ TUTUP SEMUA MODAL DULU!
  setEditingSalesId(sales.id);
  setSalesFormData({
    institutionName: sales.institutionName || '',
    contactPerson: sales.contactPerson || '',
    jobTitle: sales.jobTitle || '',
    phone: sales.phone || '',
    email: sales.email || '',
    lastContactDate: sales.lastContactDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
    nextFollowupDate: sales.nextFollowupDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
    dealStatus: sales.dealStatus || 'WARM',
    meetingNotes: sales.meetingNotes || ''
  });
  setTimeout(() => setShowModalSales('EDIT'), 50); // ✨ BUKA MODAL BARU SETELAH RESET
};

  const handleSaveSales = async () => {
    if (!salesFormData.institutionName || !salesFormData.contactPerson || !salesFormData.jobTitle || !salesFormData.phone) {
      return alert("Nama Instansi, Narahubung, Jabatan, dan HP wajib diisi Kak! ✨");
    }
    setIsLoading(true);
    const payload = {
      institution_name: salesFormData.institutionName.toUpperCase(),
      contact_person: salesFormData.contactPerson.toUpperCase(),
      job_title: salesFormData.jobTitle.toUpperCase(),
      phone: salesFormData.phone,
      email: salesFormData.email || null,
      last_contact_date: salesFormData.lastContactDate,
      next_followup_date: salesFormData.nextFollowupDate,
      deal_status: salesFormData.dealStatus,
      meeting_notes: salesFormData.meetingNotes.toUpperCase()
    };
    try {
      if (showModalSales === 'ADD') {
        const id = `sc-${Date.now()}`;
        await supabase.from('sales_contacts').insert({ ...payload, id });
      } else {
        await supabase.from('sales_contacts').update(payload).eq('id', editingSalesId);
      }
      if (refreshAllData) await refreshAllData();
      setShowModalSales(null);
      setSalesFormData({
        institutionName: '', contactPerson: '', jobTitle: '', phone: '', email: '',
        lastContactDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
        nextFollowupDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        dealStatus: 'WARM', meetingNotes: ''
      });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsLoading(true);
    try {
      await supabase.from('student_profiles').delete().eq('id', showDeleteConfirm.id);
      if (refreshAllData) await refreshAllData();
      setShowDeleteConfirm(null);
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const executeDeleteSales = async () => {
    if (!showDeleteConfirmSales) return;
    setIsLoading(true);
    try {
      await supabase.from('sales_contacts').delete().eq('id', showDeleteConfirmSales.id);
      if (refreshAllData) await refreshAllData();
      setShowDeleteConfirmSales(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (studentProfiles.length === 0) {
      alert("Tidak ada data untuk dieksport Kak! ✨");
      return;
    }
    const headers = "NAMA,TANGGAL LAHIR,HP SISWA,HP ORTU,INSTANSI,CATATAN,STATUS\n";
    const rows = studentProfiles.map(p => {
      const isSiswa = p.notes?.includes('[SISWA SANUR]');
      const cleanNotes = p.notes?.replace(/\[.*?\]/g, '').trim() || '-';
      return `"${p.name}","${p.dob}","${p.personalPhone}","${p.parentPhone}","${p.institution}","${cleanNotes}","${isSiswa ? 'SISWA' : 'PROSPEK'}"`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().split('T')[0];
    link.download = `DB_SISWA_SANUR_${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleProcessImportBox = async () => {
    if (!importText.trim()) return;
    setIsLoading(true);
    try {
      const lines = importText.trim().split(/\r?\n/);
      const payload = lines.map((line, index) => {
        if (!line.trim()) return null;
        let delimiter = ',';
        if (line.includes('\t')) delimiter = '\t';
        else if (line.includes(';')) delimiter = ';';
        const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, '') || '-');
        if (parts.length < 1 || parts[0] === '-') return null;
        const name = parts[0] || '-';
        const dob = parts[1] || '-';
        const hpS = parts[2] || '-';
        const hpO = parts[3] || '-';
        const inst = parts[4] || '-';
        const nts = parts[5] || '';
        const stat = parts[6] || 'SISWA';
        const isSiswa = (stat || '').toUpperCase().includes('SISWA');
        const finalNotes = `${isSiswa ? '[SISWA SANUR]' : '[PROSPEK MARKETING]'} ${nts === '-' ? '' : nts}`.toUpperCase();
        return {
          id: `p-imp-${Date.now()}-${index}`,
          name: name.toUpperCase(),
          dob: dob.toUpperCase(),
          institution: inst.toUpperCase(),
          personalphone: hpS,
          parentphone: hpO,
          enrolledclass: '-',
          notes: finalNotes
        };
      }).filter(x => x !== null);
      if (payload.length === 0) throw new Error("Format teks tidak terbaca. Pastikan data tidak kosong.");
      const { error } = await supabase.from('student_profiles').upsert(payload);
      if (error) throw error;
      if (refreshAllData) await refreshAllData();
      setShowImportModal(false);
      setImportText('');
      alert(`Berhasil mengimpor ${payload.length} data siswa! ✨`);
    } catch (e: any) {
      alert("Gagal Impor: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateToDMY = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysSinceLastContact = (dateStr: string) => {
    const today = new Date();
    const lastContact = new Date(dateStr);
    return Math.floor((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    if (status === 'HOT') return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', badge: 'bg-rose-600' };
    if (status === 'WARM') return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', badge: 'bg-amber-500' };
    return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', badge: 'bg-blue-500' };
  };

  return (
  <>
    <style>{`
      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modalZoomIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>

    <div className="space-y-12 animate-in pb-40 px-2">
      {isLoading && (
        <div data-modal-container className="fixed inset-0 z-[200000] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sedang Memproses Data...</p>
        </div>
      )}

      <div className="mx-4 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><BookOpen size={18} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">SANUR MASTER DATABASE</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">BUKU INDUK <span className="text-blue-600">& DATABASE</span></h2>
            
            <div className="flex gap-3 p-2 bg-slate-100 rounded-[2rem] w-fit">
              <button 
                onClick={() => setActiveTab('SISWA')}
                className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SISWA' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}
              >
                👥 Buku Induk Siswa
              </button>
              <button 
                onClick={() => setActiveTab('SALES')}
                className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SALES' ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-400'}`}
              >
                🏢 Sales B2B
              </button>
            </div>
          </div>

          {activeTab === 'SISWA' && (
            <div className="flex flex-col items-stretch sm:items-end gap-3 w-full lg:w-auto">
              <div className="flex gap-3 w-full lg:w-auto">
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="flex-1 lg:flex-none h-[56px] px-6 bg-[#0F172A] text-white rounded-[1.8rem] text-[9px] font-black uppercase shadow-lg hover:opacity-90 flex items-center justify-center gap-3 transition-all active:scale-95 shrink-0"
                >
                  <Upload size={16} /> IMPORT BOX
                </button>
                <button 
                  onClick={handleExportExcel}
                  className="flex-1 lg:flex-none h-[56px] px-6 bg-emerald-600 text-white rounded-[1.8rem] text-[9px] font-black uppercase shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-3 transition-all active:scale-95 shrink-0"
                >
                  <FileText size={16} /> EXPORT EXCEL
                </button>
              </div>
              <button 
                onClick={() => { setFormData({ status: 'SISWA_SANUR', name: '', dob: '', institution: '', personalPhone: '', parentPhone: '', enrolledClass: '', notes: '' }); setShowModal('ADD'); }} 
                className="h-[64px] px-10 bg-blue-600 text-white rounded-[2rem] text-[10px] font-black uppercase shadow-2xl hover:bg-blue-700 flex items-center justify-center gap-3 transition-all active:scale-95 w-full lg:w-auto"
              >
                <UserPlus size={20} /> TAMBAH SISWA BARU
              </button>
            </div>
          )}

          {activeTab === 'SALES' && (
            <button 
              onClick={() => { 
  resetAllModals(); // ✨ TUTUP DULU!
  setSalesFormData({
    institutionName: '', contactPerson: '', jobTitle: '', phone: '', email: '',
    lastContactDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
    nextFollowupDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    dealStatus: 'WARM', meetingNotes: ''
  }); 
  setTimeout(() => setShowModalSales('ADD'), 50); // ✨ BUKA SETELAH RESET
}}
              className="h-[64px] px-10 bg-orange-600 text-white rounded-[2rem] text-[10px] font-black uppercase shadow-2xl hover:bg-orange-700 flex items-center justify-center gap-3 transition-all active:scale-95 w-full lg:w-auto"
            >
              <UserPlus size={20} /> TAMBAH KONTAK B2B
            </button>
          )}
        </div>
      </div>

      {activeTab === 'SISWA' && (
        <>
          {monthBirthdays.length > 0 && (
            <div className="mx-4 p-8 bg-pink-500 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-pink-200 animate-in zoom-in">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg shrink-0"><Cake size={36} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-100 mb-1">Momen Bahagia {todayMonthName} ✨</p>
                  <h3 className="text-xl font-black italic uppercase leading-none tracking-tight">
                    {monthBirthdays.slice(0, 5).map(p => p.name.split(' ')[0]).join(', ')} sedang berulang tahun bulan ini! 🎂✨
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mx-4">
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl flex items-center gap-8 group">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all"><Sparkles size={32} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SISWA SANUR</p><h4 className="text-3xl font-black italic">{studentProfiles.filter(p => (p.notes || '').includes('[SISWA SANUR]')).length}</h4></div>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl flex items-center gap-8 group">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all"><Users size={32} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PROSPEK MARKETING</p><h4 className="text-3xl font-black italic">{studentProfiles.filter(p => !(p.notes || '').includes('[SISWA SANUR]')).length}</h4></div>
            </div>
            <div className="bg-[#0F172A] p-10 rounded-[3rem] text-white shadow-2xl flex items-center gap-8">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white"><Users size={32} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL DATABASE</p><h4 className="text-3xl font-black italic">{studentProfiles.length}</h4></div>
            </div>
          </div>

              {/* ✨ INFO BOX BARU - TARUH DI SINI! */}
    <div className="mx-4 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-[3rem] border-2 border-orange-100 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
          <Info size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-black text-slate-800 uppercase italic mb-4 leading-none">PANDUAN STATUS DEAL ✨</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border-2 border-rose-100 shadow-sm">
              <p className="text-xs font-black text-rose-600 uppercase mb-2">🔥 HOT (PANAS)</p>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">Prospek sangat tertarik & siap deal! Follow-up intensif 1-2 hari sekali.</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border-2 border-amber-100 shadow-sm">
              <p className="text-xs font-black text-amber-600 uppercase mb-2">🌤️ WARM (HANGAT)</p>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">Prospek tertarik, butuh follow-up rutin 3-5 hari sekali untuk closing.</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border-2 border-blue-100 shadow-sm">
              <p className="text-xs font-black text-blue-600 uppercase mb-2">❄️ COLD (DINGIN)</p>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">Prospek kurang minat saat ini, follow-up berkala 1-2 minggu sekali.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
          
          <div className="mx-4">
            <div className="relative w-full shadow-2xl shadow-slate-200/50">
              <Search size={22} className="absolute left-8 top-1/2 -translate-y-1/2 text-blue-500" />
              <input type="text" placeholder="CARI SISWA, SEKOLAH, ATAU HP..." value={searchTerm} onChange={e => setSearchTerm(e.target.value.toUpperCase())} className="w-full pl-16 pr-8 py-6 bg-white border border-slate-50 rounded-full text-[12px] font-black uppercase outline-none shadow-sm focus:border-blue-500 transition-all placeholder:text-slate-300" />
            </div>
          </div>

          <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden mx-4">
            <div className="max-h-[750px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-20 border-b">
                  <tr>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">PROFIL & TGL LAHIR</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">KONTAK KELUARGA</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">INSTANSI / CATATAN</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProfiles.map(p => {
                    const isSiswa = (p.notes || '').includes('[SISWA SANUR]');
                    const isBirthdayToday = (p.dob || '').toUpperCase().includes(todayStrShort);
                    const dobParts = (p.dob || '').split(' ');
                    const day = dobParts[0] || '-';
                    const month = dobParts[1] || '';
                    const year = dobParts[2] || '';
                    return (
                      <tr key={p.id} className={`transition-all group border-l-8 ${ (isBirthdayToday && isSiswa) ? 'bg-pink-50/70 border-pink-400 shadow-inner' : 'hover:bg-slate-50 border-transparent'}`}>
                        <td className="px-8 py-10">
                          <div className="flex items-center gap-6">
                            <div className={`w-16 h-20 rounded-[1.5rem] flex flex-col items-center justify-center shrink-0 shadow-lg border-2 transition-all relative overflow-hidden ${isSiswa ? (isBirthdayToday ? 'bg-pink-500 text-white border-pink-400 ring-4 ring-pink-100' : 'bg-white text-slate-800 border-slate-100 group-hover:border-emerald-200') : 'bg-white text-blue-600 border-slate-100'}`}>
                              {isBirthdayToday && isSiswa && (
                                <div className="absolute top-1 text-[8px] animate-pulse">🎉✨</div>
                                   )}
                                   <p className={`text-xl font-black italic leading-none ${isBirthdayToday && isSiswa ? 'mt-2' : ''}`}>{day}</p>
                                   <p className="text-[7px] font-black uppercase tracking-widest mt-1 opacity-80">{month}</p>
                                   <p className="text-[7px] font-black mt-0.5 opacity-40">{year}</p>
                                </div>
                                
                                <div className="min-w-0">
                                   <p className={`text-base font-black uppercase italic leading-none truncate ${ (isBirthdayToday && isSiswa) ? 'text-pink-600' : 'text-slate-800'}`}>
                                      {p.name}
                                   </p>
                                   <span className={`inline-block mt-3 px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${isSiswa ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>{isSiswa ? 'SISWA AKTIF' : 'PROSPEK'}</span>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-10">
                             <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                   <span className="text-base" title="HP Siswa">👸</span>
                                   <p className="text-xs font-black text-slate-800">{p.personalPhone || '-'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                   <span className="text-base" title="HP Orang Tua">👥</span>
                                   <p className="text-[11px] font-black text-blue-600 italic leading-none">{p.parentPhone || '-'}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-10">
                             <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center shrink-0"><Building2 size={12} className="text-slate-400"/></div>
                                <p className="text-xs font-black text-slate-800 uppercase italic truncate max-w-[180px]">{p.institution || '-'}</p>
                             </div>
                             <div className="flex items-start gap-2">
                                <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center shrink-0"><Info size={12} className="text-slate-300"/></div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed max-w-[180px] line-clamp-2">{(p.notes || '').replace(/\[.*?\]/g, '').trim() || 'TANPA CATATAN.'}</p>
                             </div>
                          </td>
                          <td className="px-8 py-10">
                             <div className="flex justify-center gap-2">
                                <button onClick={() => handleOpenEdit(p)} className="p-3.5 bg-white text-slate-300 hover:text-blue-600 rounded-2xl shadow-sm border border-slate-50 transition-all active:scale-90"><Edit3 size={18}/></button>
                                <button onClick={() => setShowDeleteConfirm(p)} className="p-3.5 bg-white text-slate-300 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90"><Trash2 size={18}/></button>
                             </div>
                          </td>
                       </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {showImportModal && (
   <div data-modal-container tabIndex={-1} className="fixed inset-0 z-[100000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
   <div className="bg-white w-full max-w-lg rounded-[4rem] p-10 md:p-12 shadow-2xl relative overflow-hidden opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
               <button onClick={() => setShowImportModal(false)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
               <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl"><ClipboardList size={24}/></div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Import Box (v2.2)</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">Format: NAMA, LAHIR, HP SISWA, HP ORTU, INSTANSI, CATATAN, STATUS ✨</p>
                  </div>
               </div>
               <div className="space-y-6">
                  <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3 text-center">Urutan Kolom Harus Sesuai:</p>
                    <code className="text-[8px] font-mono font-bold text-slate-500 block bg-white p-4 rounded-xl border border-blue-50 leading-relaxed text-center">
                      NAMA, TGL LAHIR, HP SISWA, HP ORTU, INSTANSI, CATATAN, STATUS
                    </code>
                  </div>
                  <textarea 
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="TEMPEL DATA DARI EXCEL DI SINI..."
                    rows={8}
                    className="w-full p-8 bg-slate-50 rounded-[2rem] font-mono text-xs border-2 border-transparent focus:border-blue-500 outline-none transition-all shadow-inner"
                  />
                  <div className="flex items-center gap-3 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <Zap size={16} className="text-orange-500 shrink-0" />
                    <p className="text-[8px] font-bold text-orange-800 uppercase italic">Tips: Format file Export sama dengan format Import ini! ✨</p>
                  </div>
                  <button onClick={handleProcessImportBox} disabled={isLoading || !importText.trim()} className="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                     {isLoading ? <Loader2 size={24} className="animate-spin"/> : <><Check size={20}/> PROSES IMPORT MASSAL ✨</>}
                  </button>
               </div>
            </div>
         </div>
      )}

      {showModal && (
  <div data-modal-container tabIndex={-1} className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
  <div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl relative border border-white/20 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setShowModal(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
              <h4 className="text-3xl font-black text-slate-800 uppercase italic mb-10 tracking-tighter leading-none text-center">DATA <span className="text-blue-600">SISWA</span></h4>
              <div className="space-y-6">
                 <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    <button onClick={() => setFormData({...formData, status: 'SISWA_SANUR'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${formData.status === 'SISWA_SANUR' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Siswa Aktif</button>
                    <button onClick={() => setFormData({...formData, status: 'PROSPEK'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${formData.status === 'PROSPEK' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>Prospek</button>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nama Lengkap Siswa</label>
                    <input type="text" placeholder="MISAL: BUDI SANTOSO" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Tgl Lahir (Contoh: 12 Januari 2012)</label>
                    <input type="text" placeholder="12 JANUARI 2012" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value.toUpperCase()})} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Sekolah / Instansi</label>
                    <input type="text" placeholder="MISAL: SD NEGERI 01" value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value.toUpperCase()})} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Catatan Khusus</label>
                <textarea placeholder="MISAL: MINAT KELAS PRIVATE..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value.toUpperCase()})} rows={3} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-bold text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Hp Siswa</label>
                  <input type="text" placeholder="08..." value={formData.personalPhone} onChange={e => setFormData({...formData, personalPhone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Hp Ortu</label>
                  <input type="text" placeholder="08..." value={formData.parentPhone} onChange={e => setFormData({...formData, parentPhone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                </div>
              </div>
              <button onClick={handleSave} disabled={isLoading} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center">
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'SIMPAN DATA INDUK ✨'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE SISWA */}
      {showDeleteConfirm && (
  <div data-modal-container tabIndex={-1} className="fixed inset-0 z-[110000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
          <div className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
            <button onClick={() => setShowDeleteConfirm(null)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20}/></button>
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-800 uppercase italic leading-none">Hapus Siswa?</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-2">
                Data milik <span className="text-slate-800 font-black underline">{showDeleteConfirm.name}</span> akan dihapus permanen.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">BATAL</button>
              <button onClick={executeDelete} disabled={isLoading} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14}/>} IYA, HAPUS
              </button>
            </div>
          </div>
        </div>
      )}
        
        </>  
      )}

{activeTab === 'SALES' && (
        <>
          {urgentSalesContacts.length > 0 && (
            <div className="mx-4 p-8 bg-rose-50 rounded-[3rem] border-2 border-rose-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl animate-in zoom-in">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0 animate-pulse"><AlertTriangle size={36} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-600 mb-1">⚠️ BUTUH FOLLOW-UP SEGERA!</p>
                  <h3 className="text-xl font-black italic uppercase leading-none tracking-tight text-slate-800">
                    {urgentSalesContacts.length} kontak belum di-follow-up lebih dari 7 hari! 🔥
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mx-4">
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl flex items-center gap-8 group">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-all"><Zap size={32} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HOT DEALS</p><h4 className="text-3xl font-black italic">{salesContacts.filter(s => s.dealStatus === 'HOT').length}</h4></div>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl flex items-center gap-8 group">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-all"><Clock size={32} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WARM DEALS</p><h4 className="text-3xl font-black italic">{salesContacts.filter(s => s.dealStatus === 'WARM').length}</h4></div>
            </div>
            <div className="bg-[#0F172A] p-10 rounded-[3rem] text-white shadow-2xl flex items-center gap-8">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white"><Building2 size={32} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL KONTAK</p><h4 className="text-3xl font-black italic">{salesContacts.length}</h4></div>
            </div>
          </div>

          <div className="mx-4">
            <div className="relative w-full shadow-2xl shadow-slate-200/50">
              <Search size={22} className="absolute left-8 top-1/2 -translate-y-1/2 text-orange-500" />
              <input type="text" placeholder="CARI INSTANSI, NARAHUBUNG, ATAU HP..." value={searchTermSales} onChange={e => setSearchTermSales(e.target.value.toUpperCase())} className="w-full pl-16 pr-8 py-6 bg-white border border-slate-50 rounded-full text-[12px] font-black uppercase outline-none shadow-sm focus:border-orange-500 transition-all placeholder:text-slate-300" />
            </div>
          </div>

          <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden mx-4">
            <div className="max-h-[750px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-20 border-b">
                  <tr>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">INSTANSI & NARAHUBUNG</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">KONTAK</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">FOLLOW-UP</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">STATUS</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSalesContacts.map(s => {
                    const daysSince = getDaysSinceLastContact(s.lastContactDate);
                    const isUrgent = daysSince > 7;
                    const colors = getStatusColor(s.dealStatus);
                    return (
                      <tr key={s.id} className={`transition-all group border-l-8 ${isUrgent ? 'bg-rose-50/50 border-rose-400' : 'hover:bg-slate-50 border-transparent'}`}>
                        <td className="px-8 py-10">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Building2 size={16} className="text-orange-500 shrink-0" />
                              <p className="text-base font-black uppercase italic leading-none text-slate-800">{s.institutionName}</p>
                            </div>
                            <div className="flex items-center gap-3 ml-6">
                              <Briefcase size={14} className="text-slate-400 shrink-0" />
                              <p className="text-xs font-black text-slate-600">{s.contactPerson}</p>
                            </div>
                            <div className="ml-6">
                              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[8px] font-black uppercase tracking-widest">{s.jobTitle}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-10">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Phone size={14} className="text-orange-500" />
                              <p className="text-xs font-black text-slate-800">{s.phone}</p>
                            </div>
                            {s.email && (
                              <div className="flex items-center gap-3">
                                <Mail size={14} className="text-blue-500" />
                                <p className="text-[10px] font-bold text-blue-600 italic">{s.email}</p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-10">
                          <div className="space-y-3">
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Contact:</p>
                              <p className={`text-xs font-black ${isUrgent ? 'text-rose-600' : 'text-slate-700'}`}>{formatDateToDMY(s.lastContactDate)}</p>
                              <p className={`text-[9px] font-bold mt-1 ${isUrgent ? 'text-rose-500' : 'text-slate-400'}`}>({daysSince} hari lalu)</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Next F/U:</p>
                              <p className="text-xs font-black text-orange-600">{formatDateToDMY(s.nextFollowupDate)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-10">
                          <div className={`px-4 py-3 rounded-2xl ${colors.bg} border-2 ${colors.border} text-center`}>
                            <p className={`text-xs font-black uppercase ${colors.text}`}>
                              {s.dealStatus === 'HOT' && '🔥 HOT'}
                              {s.dealStatus === 'WARM' && '🌤️ WARM'}
                              {s.dealStatus === 'COLD' && '❄️ COLD'}
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-10">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleOpenEditSales(s)} className="p-3.5 bg-white text-slate-300 hover:text-orange-600 rounded-2xl shadow-sm border border-slate-50 transition-all active:scale-90"><Edit3 size={18}/></button>
                            <button onClick={() => { resetAllModals(); setTimeout(() => setShowDeleteConfirmSales(s), 50); }} className="p-3.5 bg-white text-slate-300 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90"><Trash2 size={18}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSalesContacts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-20">
                          <Building2 size={48} className="text-slate-300" />
                          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Belum ada kontak B2B.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
       {/* MODAL ADD/EDIT SALES B2B */}
      {showModalSales && (
  <div data-modal-container tabIndex={-1} className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
          <div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl relative border border-white/20 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
            <button onClick={() => setShowModalSales(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
            <h4 className="text-3xl font-black text-slate-800 uppercase italic mb-10 tracking-tighter leading-none text-center">DATA <span className="text-orange-600">SALES B2B</span></h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nama Instansi *</label>
                <input type="text" placeholder="MISAL: SD NEGERI 01 DENPASAR" value={salesFormData.institutionName} onChange={e => setSalesFormData({...salesFormData, institutionName: e.target.value.toUpperCase()})} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nama Narahubung *</label>
                <input type="text" placeholder="MISAL: PAK BUDI SANTOSO" value={salesFormData.contactPerson} onChange={e => setSalesFormData({...salesFormData, contactPerson: e.target.value.toUpperCase()})} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Jabatan *</label>
<input type="text" placeholder="MISAL: KEPALA SEKOLAH" value={salesFormData.jobTitle} onChange={e => setSalesFormData({...salesFormData, jobTitle: e.target.value.toUpperCase()})} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 shadow-inner" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nomor HP *</label>
                  <input type="text" placeholder="08..." value={salesFormData.phone} onChange={e => setSalesFormData({...salesFormData, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email (Opsional)</label>
                  <input type="email" placeholder="email@..." value={salesFormData.email} onChange={e => setSalesFormData({...salesFormData, email: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 shadow-inner" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Last Contact</label>
                  <input type="date" value={salesFormData.lastContactDate} onChange={e => setSalesFormData({...salesFormData, lastContactDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Next Follow-Up</label>
                  <input type="date" value={salesFormData.nextFollowupDate} onChange={e => setSalesFormData({...salesFormData, nextFollowupDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 shadow-inner" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Status Deal</label>
                <select value={salesFormData.dealStatus} onChange={e => setSalesFormData({...salesFormData, dealStatus: e.target.value})} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 shadow-inner">
                  <option value="HOT">🔥 HOT (PANAS)</option>
                  <option value="WARM">🌤️ WARM (HANGAT)</option>
                  <option value="COLD">❄️ COLD (DINGIN)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Meeting Notes</label>
                <textarea placeholder="MISAL: MEETING PERTAMA, MINAT PAKET 20 SISWA..." value={salesFormData.meetingNotes} onChange={e => setSalesFormData({...salesFormData, meetingNotes: e.target.value.toUpperCase()})} rows={4} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-bold text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 shadow-inner" />
              </div>

              <button onClick={handleSaveSales} disabled={isLoading} className="w-full py-6 bg-orange-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center">
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'SIMPAN DATA B2B ✨'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE SALES B2B */}
      {showDeleteConfirmSales && (
        <div data-modal-container tabIndex={-1} className="fixed inset-0 z-[110000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
          <div className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
            <button onClick={() => setShowDeleteConfirmSales(null)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20}/></button>
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-800 uppercase italic leading-none">Hapus Kontak?</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-2">
                Data kontak <span className="text-slate-800 font-black underline">{showDeleteConfirmSales?.institutionName}</span> akan dihapus permanen.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirmSales(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">BATAL</button>
              <button onClick={executeDeleteSales} disabled={isLoading} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14}/>} IYA, HAPUS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
};

export default AdminMarketing;
