
import React, { useMemo, useState } from 'react';
import { StudentProfile } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  Search, Trash2, X, UserPlus, BookOpen, Edit3, 
  Cake, Building2, Users, Sparkles, Loader2, AlertTriangle, Check,
  Phone, GraduationCap, Info
} from 'lucide-react';

interface AdminMarketingProps {
  studentProfiles: StudentProfile[];
  setStudentProfiles: React.Dispatch<React.SetStateAction<StudentProfile[]>>;
}

const AdminMarketing: React.FC<AdminMarketingProps> = ({ studentProfiles, setStudentProfiles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState<'ADD' | 'EDIT' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<StudentProfile | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<StudentProfile & { status: string }>>({
    name: '', dob: '', institution: '', personalPhone: '', parentPhone: '', enrolledClass: '', notes: '', status: 'SISWA_SANUR'
  });

  const todayDate = new Date();
  const todayDay = todayDate.getDate();
  const todayMonthName = todayDate.toLocaleString('id-ID', { month: 'long' }).toUpperCase();
  
  // Format pembanding: "12 JANUARI"
  const todayStrShort = `${todayDay} ${todayMonthName}`;

  const monthBirthdays = useMemo(() => {
    return studentProfiles.filter(p => (p.dob || '').toUpperCase().includes(todayMonthName));
  }, [studentProfiles, todayMonthName]);

  const filteredProfiles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return studentProfiles.filter(p => {
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
  }, [studentProfiles, searchTerm]);

  const handleOpenEdit = (profile: StudentProfile) => {
    setEditingId(profile.id);
    const isSiswa = profile.notes?.includes('[SISWA SANUR]');
    setFormData({
      name: profile.name, dob: profile.dob, institution: profile.institution,
      personalPhone: profile.personalPhone, parentPhone: profile.parentPhone,
      enrolledClass: profile.enrolledClass, 
      notes: profile.notes?.replace(/\[.*?\]/g, '').trim(),
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
        setStudentProfiles([{ ...payload, id, personalPhone: payload.personalphone, parentPhone: payload.parentphone, enrolledClass: payload.enrolledclass } as any, ...studentProfiles]);
      } else {
        await supabase.from('student_profiles').update(payload).eq('id', editingId);
        setStudentProfiles(studentProfiles.map(p => p.id === editingId ? { ...p, ...payload, personalPhone: payload.personalphone, parentPhone: payload.parentphone, enrolledClass: payload.enrolledclass } : p) as any);
      }
      setShowModal(null);
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const executeDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsLoading(true);
    try {
      await supabase.from('student_profiles').delete().eq('id', showDeleteConfirm.id);
      setStudentProfiles(prev => prev.filter(x => x.id !== showDeleteConfirm.id));
      setShowDeleteConfirm(null);
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-12 animate-in pb-40 px-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 px-4">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><BookOpen size={18} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">SANUR MASTER DATABASE</span>
           </div>
           <h2 className="text-5xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">BUKU INDUK <span className="text-blue-600">& DATABASE</span></h2>
        </div>
        <button onClick={() => { setFormData({ status: 'SISWA_SANUR', name: '', dob: '', institution: '', personalPhone: '', parentPhone: '', enrolledClass: '', notes: '' }); setShowModal('ADD'); }} className="px-12 py-6 bg-blue-600 text-white rounded-[2.5rem] text-[10px] font-black uppercase shadow-2xl hover:bg-blue-700 flex items-center justify-center gap-3 transition-all active:scale-95"><UserPlus size={20} /> TAMBAH SISWA BARU</button>
      </div>

      {monthBirthdays.length > 0 && (
        <div className="mx-4 p-8 bg-pink-500 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-pink-200 animate-in zoom-in">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg shrink-0"><Cake size={36} /></div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-100 mb-1">Momen Bahagia {todayMonthName} ✨</p>
                 <h3 className="text-xl font-black italic uppercase leading-none tracking-tight">
                    {monthBirthdays.slice(0, 5).map(p => p.name.split(' ')[0]).join(', ')}
                    {monthBirthdays.length > 5 ? ` + ${monthBirthdays.length - 5} Siswa Lainnya` : ''} sedang berulang tahun bulan ini! 🎂✨
                 </h3>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl flex items-center gap-8 group">
           <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all"><Sparkles size={32} /></div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SISWA SANUR</p><h4 className="text-3xl font-black italic">{studentProfiles.filter(p => p.notes?.includes('[SISWA SANUR]')).length}</h4></div>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl flex items-center gap-8 group">
           <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all"><Users size={32} /></div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PROSPEK MARKETING</p><h4 className="text-3xl font-black italic">{studentProfiles.filter(p => !p.notes?.includes('[SISWA SANUR]')).length}</h4></div>
        </div>
        <div className="bg-[#0F172A] p-10 rounded-[3rem] text-white shadow-2xl flex items-center gap-8">
           <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white"><Users size={32} /></div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL DATABASE</p><h4 className="text-3xl font-black italic">{studentProfiles.length}</h4></div>
        </div>
      </div>

      <div className="px-4">
         <div className="relative w-full shadow-2xl shadow-slate-200/50">
            <Search size={22} className="absolute left-8 top-1/2 -translate-y-1/2 text-blue-500" />
            <input type="text" placeholder="CARI..." value={searchTerm} onChange={e => setSearchTerm(e.target.value.toUpperCase())} className="w-full pl-16 pr-8 py-6 bg-white border border-slate-50 rounded-full text-[12px] font-black uppercase outline-none shadow-sm focus:border-blue-500 transition-all placeholder:text-slate-300" />
         </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden mx-4">
         <div className="max-h-[750px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead className="bg-white sticky top-0 z-20 border-b">
                  <tr>
                     <th className="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">PROFIL SISWA</th>
                     <th className="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">TANGGAL LAHIR</th>
                     <th className="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">KONTAK</th>
                     <th className="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">INSTANSI / CATATAN</th>
                     <th className="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">AKSI</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {filteredProfiles.map(p => {
                     const isSiswa = p.notes?.includes('[SISWA SANUR]');
                     const isBirthdayToday = (p.dob || '').toUpperCase().includes(todayStrShort);
                     
                     return (
                       <tr key={p.id} className={`transition-all group border-l-8 ${ (isBirthdayToday && isSiswa) ? 'bg-pink-50/70 border-pink-400 shadow-inner' : 'hover:bg-slate-50 border-transparent'}`}>
                          <td className="px-12 py-10">
                             <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-all ${isSiswa ? (isBirthdayToday ? 'bg-pink-500 text-white' : 'bg-emerald-50 text-emerald-600') : 'bg-blue-50 text-blue-600'}`}>
                                   {isSiswa ? (isBirthdayToday ? <Cake size={24} /> : <GraduationCap size={28} />) : <Users size={28} />}
                                </div>
                                <div className="min-w-0">
                                   <p className={`text-base font-black uppercase italic leading-none truncate ${ (isBirthdayToday && isSiswa) ? 'text-pink-600' : 'text-slate-800'}`}>
                                      {p.name}
                                   </p>
                                   <span className={`inline-block mt-3 px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${isSiswa ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>{isSiswa ? 'SISWA AKTIF' : 'PROSPEK'}</span>
                                </div>
                             </div>
                          </td>
                          <td className="px-12 py-10">
                             <div className="relative pt-6">
                                { (isBirthdayToday && isSiswa) && (
                                   <div className="absolute -top-1 left-0 right-0 flex justify-center gap-1.5 animate-bounce">
                                      <span className="text-[14px]">🎉</span>
                                      <span className="text-[14px]">✨</span>
                                   </div>
                                )}
                                <div className={`w-36 py-3 border rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all ${ (isBirthdayToday && isSiswa) ? 'bg-white border-pink-400 shadow-pink-100 ring-2 ring-pink-50' : 'bg-slate-50 text-slate-500 border-slate-100 group-hover:bg-white'}`}>
                                   <p className={`text-[10px] font-black text-center uppercase tracking-tighter italic ${ (isBirthdayToday && isSiswa) ? 'text-pink-600' : ''}`}>{p.dob}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-12 py-10">
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
                          <td className="px-12 py-10">
                             <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center shrink-0"><Building2 size={12} className="text-slate-400"/></div>
                                <p className="text-xs font-black text-slate-800 uppercase italic truncate max-w-[200px]">{p.institution || '-'}</p>
                             </div>
                             <div className="flex items-start gap-2">
                                <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center shrink-0"><Info size={12} className="text-slate-300"/></div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed max-w-[200px] line-clamp-2">{p.notes?.replace(/\[.*?\]/g, '').trim() || 'TANPA CATATAN.'}</p>
                             </div>
                          </td>
                          <td className="px-12 py-10">
                             <div className="flex justify-center gap-3">
                                <button onClick={() => handleOpenEdit(p)} className="p-4 bg-white text-slate-300 hover:text-blue-600 rounded-2xl shadow-sm border border-slate-50 transition-all active:scale-90"><Edit3 size={18}/></button>
                                <button onClick={() => setShowDeleteConfirm(p)} className="p-4 bg-white text-slate-300 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90"><Trash2 size={18}/></button>
                             </div>
                          </td>
                       </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in">
           <div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl relative border border-white/20">
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
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Hp Pribadi</label>
                       <input type="text" placeholder="08..." value={formData.personalPhone} onChange={e => setFormData({...formData, personalPhone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Hp Ortu / Wali</label>
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-pulse">
                <AlertTriangle size={48} />
              </div>
              <div className="space-y-2">
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Hapus Siswa?</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">
                    Data milik <span className="text-slate-800 font-black underline">{showDeleteConfirm.name}</span> akan dihapus permanen.
                 </p>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">BATAL</button>
                 <button onClick={executeDelete} disabled={isLoading} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18}/>} IYA, HAPUS
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminMarketing;
