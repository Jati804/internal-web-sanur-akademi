
import React, { useState, useMemo, useEffect } from 'react';
import { User, Attendance, StudentPayment } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  UserPlus, Trash2, Search, X, GraduationCap, 
  Edit3, CheckCircle2, Lock, Loader2, UserCircle,
  ShieldAlert, BadgeCheck, AlertTriangle, Key, Check, Plus, Info, AlertCircle, Zap
} from 'lucide-react';

interface AdminStaffProps {
  user: User; 
  teachers: User[];
  setTeachers: React.Dispatch<React.SetStateAction<User[]>>;
  studentAccounts: User[];
  setStudentAccounts: React.Dispatch<React.SetStateAction<User[]>>;
  refreshAllData?: () => Promise<void>;
}

const AdminStaff: React.FC<AdminStaffProps> = ({ 
  teachers, setTeachers, studentAccounts, setStudentAccounts, refreshAllData
}) => {
  const [activeTab, setActiveTab] = useState<'ADMINS' | 'TEACHERS' | 'STUDENTS'>('TEACHERS');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState<'ADD' | 'EDIT' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', username: '', pin: '224488' });
  const [isLocalSyncing, setIsLocalSyncing] = useState(false);

  // ✅ Auto scroll modal ke tengah viewport (body bebas scroll)
useEffect(() => {
  const hasModal = !!(
    showModal || 
    showDeleteConfirm
  );
  
  if (hasModal) {
    const timer = setTimeout(() => {
      const modalElement = document.querySelector('[data-modal-container]');
      if (modalElement) {
        modalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    
    return () => clearTimeout(timer);
  }
}, [showModal, showDeleteConfirm]);

  const roleTheme = {
    ADMINS: { text: "text-blue-600", bg: "bg-blue-600", light: "bg-blue-50", border: "border-blue-100", label: "PENGURUS" },
    TEACHERS: { text: "text-orange-600", bg: "bg-orange-500", textValue: "orange", light: "bg-orange-50", border: "border-orange-100", label: "PENGAJAR" },
    STUDENTS: { text: "text-emerald-600", bg: "bg-emerald-600", textValue: "emerald", light: "bg-emerald-50", border: "border-emerald-100", label: "SISWA" }
  }[activeTab];

  const adminCount = teachers.filter(u => u.role === 'ADMIN').length;
  const teacherCount = teachers.filter(u => u.role === 'TEACHER').length;
  const studentCount = studentAccounts.length;

  const currentList = useMemo(() => {
    let list: User[] = [];
    if (activeTab === 'ADMINS') list = teachers.filter(u => u.role === 'ADMIN');
    else if (activeTab === 'TEACHERS') list = teachers.filter(u => u.role === 'TEACHER');
    else list = studentAccounts;
    
    // Sort by ID descending (yang baru di atas)
    return list.sort((a, b) => {
      const idA = a.id.split('-')[1] || '0';
      const idB = b.id.split('-')[1] || '0';
      return parseInt(idB) - parseInt(idA);
    });
  }, [activeTab, teachers, studentAccounts]);

  const filteredData = useMemo(() => {
    return currentList.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentList, searchTerm]);

  const handleOpenAdd = () => {
    const defaultPin = activeTab === 'STUDENTS' ? '051020' : '224488';
    setFormData({ name: '', username: '', pin: defaultPin });
    setShowModal('ADD');
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setFormData({ 
      name: u.name, 
      username: u.username.toUpperCase(), 
      pin: u.pin || (activeTab === 'STUDENTS' ? '051020' : '224488') 
    });
    setShowModal('EDIT');
  };

  const performCascadingUpdate = async (oldName: string, newName: string, userId: string, isStudent: boolean) => {
    const oldNameNorm = oldName.toUpperCase().trim();
    const newNameNorm = newName.toUpperCase().trim();
    const oldNameSlug = oldNameNorm.replace(/\s+/g, '-');
    const newNameSlug = newNameNorm.replace(/\s+/g, '-');
    
    if (oldNameNorm === newNameNorm) return;

    if (!isStudent) {
      await supabase.from('attendance').update({ teachername: newNameNorm }).eq('teacherid', userId);
      await supabase.from('attendance').update({ substitutefor: newNameNorm }).ilike('substitutefor', oldNameNorm);
    } else {
      await supabase.from('student_payments').update({ studentname: newNameNorm }).ilike('studentname', oldNameNorm);
      const { data: affectedLogs } = await supabase.from('attendance').select('*');
      if (affectedLogs && affectedLogs.length > 0) {
        for (const log of affectedLogs) {
          const attended = (log.studentsattended as string[]) || [];
          const hasOldName = attended.some(n => n.toUpperCase().trim() === oldNameNorm);
          if (hasOldName) {
            const newAttended = attended.map(n => n.toUpperCase().trim() === oldNameNorm ? newNameNorm : n);
            const renameJsonKey = (obj: any) => {
              if (!obj || typeof obj !== 'object') return obj;
              const newObj = { ...obj };
              const existingKey = Object.keys(newObj).find(k => k.toUpperCase().trim() === oldNameNorm);
              if (existingKey) {
                newObj[newNameNorm] = newObj[existingKey];
                if (existingKey !== newNameNorm) delete newObj[existingKey];
              }
              return newObj;
            };
            const currentPkgId = log.packageid || '';
            const newPkgId = currentPkgId.includes(oldNameSlug) ? currentPkgId.replace(oldNameSlug, newNameSlug) : currentPkgId;
            const updatePayload = {
              packageid: newPkgId,
              studentsattended: newAttended,
              studentsessions: renameJsonKey(log.studentsessions),
              studentscores: renameJsonKey(log.studentscores),
              studenttopics: renameJsonKey(log.studenttopics),
              studentnarratives: renameJsonKey(log.studentnarratives)
            };
            await supabase.from('attendance').update(updatePayload).eq('id', log.id);
          }
        }
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.username) return;
    setIsLocalSyncing(true);
    try {
      const isStudent = activeTab === 'STUDENTS';
      const tableName = isStudent ? 'student_accounts' : 'teachers';
      const finalRole = activeTab === 'ADMINS' ? 'ADMIN' : activeTab === 'TEACHERS' ? 'TEACHER' : 'STUDENT';
      const payload: any = { 
        name: formData.name.toUpperCase().trim(), 
        username: formData.username.toUpperCase().trim(), 
        pin: formData.pin, 
        role: finalRole 
      };
      if (showModal === 'ADD') {
        const id = `${activeTab.substring(0,3)}-${Date.now()}`;
        const { error } = await supabase.from(tableName).insert({ ...payload, id });
        if (error) throw error;
      } else if (editingUser) {
        if (editingUser.name.toUpperCase().trim() !== payload.name) {
          await performCascadingUpdate(editingUser.name, payload.name, editingUser.id, isStudent);
        }
        const { error } = await supabase.from(tableName).update(payload).eq('id', editingUser.id);
        if (error) throw error;
      }
      if (refreshAllData) await refreshAllData();
      setShowModal(null);
      alert("Akses & Histori Berhasil Disinkronkan! ✨");
    } catch (e: any) { alert("Terjadi Kendala: " + e.message); } finally { setIsLocalSyncing(false); }
  };

  const executeDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsLocalSyncing(true);
    try {
      const isStudent = activeTab === 'STUDENTS';
      const tableName = isStudent ? 'student_accounts' : 'teachers';
      const { error } = await supabase.from(tableName).delete().eq('id', showDeleteConfirm.id);
      if (error) throw error;
      if (refreshAllData) await refreshAllData();
      setShowDeleteConfirm(null);
    } catch (e: any) { alert("Gagal menghapus: " + e.message); } finally { setIsLocalSyncing(false); }
  };

  return (
  <>
    <style>{`
      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
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

    <div className="max-w-6xl mx-auto space-y-12 pb-40 px-4 animate-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><BadgeCheck size={18} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">SANUR ACCESS CONTROL</span>
           </div>
           <h2 className="text-5xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">USER & <span className="text-blue-600">ACCOUNTS</span></h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
           <div className="relative">
              <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
              <input type="text" placeholder="CARI..." value={searchTerm} onChange={e => setSearchTerm(e.target.value.toUpperCase())} className="w-full pl-14 pr-8 py-5 bg-white border border-slate-100 rounded-full text-[10px] font-black uppercase shadow-xl outline-none focus:border-blue-500" />
           </div>
           {activeTab !== 'ADMINS' && (
             <button onClick={handleOpenAdd} className={`px-10 py-5 ${roleTheme.bg} text-white rounded-full text-[10px] font-black uppercase shadow-xl hover:opacity-90 flex items-center justify-center gap-3 transition-all active:scale-95`}>
                <Plus size={18}/> TAMBAH {activeTab === 'TEACHERS' ? 'GURU' : 'SISWA'}
             </button>
           )}
        </div>
      </div>

      <div className="flex bg-slate-100/50 backdrop-blur-md p-2 rounded-[2.5rem] w-full max-w-2xl mx-auto shadow-inner border border-slate-100">
         <button onClick={() => setActiveTab('ADMINS')} className={`flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'ADMINS' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}><Lock size={16}/> Pengurus ({adminCount})</button>
         <button onClick={() => setActiveTab('TEACHERS')} className={`flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'TEACHERS' ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-400'}`}><UserPlus size={16}/> Pengajar ({teacherCount})</button>
         <button onClick={() => setActiveTab('STUDENTS')} className={`flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'STUDENTS' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400'}`}><GraduationCap size={16}/> Siswa ({studentCount})</button>
      </div>

      {/* INFO DASHBOARD (DI BAWAH NAV TAB) */}
      <div className={`${roleTheme.light} p-8 rounded-[3rem] border-2 border-dashed ${roleTheme.border} flex flex-col md:flex-row items-center gap-8 max-w-4xl mx-auto shadow-sm animate-in slide-in-from-top-4`}>
         <div className={`w-14 h-14 bg-white ${roleTheme.text} rounded-2xl flex items-center justify-center shadow-sm shrink-0 border ${roleTheme.border}`}>
            <Info size={32} />
         </div>
         <div className="space-y-2 text-center md:text-left flex-1">
            <h4 className={`text-xs font-black uppercase tracking-widest ${roleTheme.text}`}>Informasi Akses {roleTheme.label}</h4>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-wide italic">
               "Fitur edit <span className="text-slate-800 font-black">NAMA, USERNAME, & PIN</span> bisa dilakukan di sini. Sistem akan otomatis menyinkronkan nama baru ke seluruh riwayat & histori sesi tanpa menghapus data lama. ✨"
            </p>
            {activeTab === 'STUDENTS' && (
              <p className="text-[10px] font-black text-rose-600 uppercase italic pt-1 flex items-center justify-center md:justify-start gap-2">
                 <Zap size={14} /> Khusus Siswa: Disarankan hapus manual akun user setelah 3 bulan lulus dari kelas terakhir agar sistem tetap ringan!
              </p>
            )}
         </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden p-10 md:p-14 space-y-8">
         <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {filteredData.map(u => (
              <div key={u.id} className="p-8 bg-white border border-slate-50 rounded-[2.5rem] hover:bg-slate-50 transition-all grid grid-cols-[280px_1fr_1fr_auto] gap-6 items-center group shadow-sm hover:shadow-xl mb-2">
                 <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 ${roleTheme.bg} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-all shrink-0`}>
                       {activeTab === 'STUDENTS' ? <GraduationCap size={28}/> : <UserCircle size={28}/>}
                    </div>
                    <div className="min-w-0">
   <p 
      className="text-base font-black text-slate-800 uppercase italic leading-none truncate cursor-help" 
      title={u.name}
   >
      {u.name}
   </p>
   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{activeTab === 'ADMINS' ? 'PENGURUS SANUR' : activeTab === 'TEACHERS' ? 'PENGAJAR SANUR' : 'SISWA SANUR'}</p>
</div>
                 </div>
                 <div className="flex flex-col items-center gap-2 justify-center">
                    <div 
   className={`${roleTheme.light} px-8 py-3 rounded-full border ${roleTheme.border} ${roleTheme.text} flex items-center gap-3 shadow-sm max-w-[200px] cursor-help`}
   title={u.username.toUpperCase()}
>
   <CheckCircle2 size={14} className="shrink-0" />
   <span className="text-[11px] font-black uppercase tracking-widest truncate">{u.username.toUpperCase()}</span>
</div>
                    <div 
   className="bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2 max-w-[200px] cursor-help"
   title={`PIN: ${u.pin || '******'}`}
>
   <Key size={10} className="text-slate-400 shrink-0"/>
   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest truncate">PIN: <span className={roleTheme.text}>{u.pin || '******'}</span></span>
</div>
                 </div>
                 <div className="flex justify-end gap-3">
                    <button onClick={() => handleOpenEdit(u)} className={`p-4 ${roleTheme.light} ${roleTheme.text} rounded-2xl hover:${roleTheme.bg} hover:text-white transition-all shadow-sm`}><Edit3 size={20}/></button>
                    {activeTab !== 'ADMINS' && (
                      <button onClick={() => setShowDeleteConfirm(u)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 size={20}/></button>
                    )}
                 </div>
              </div>
            ))}
         </div>
      </div>

    {showModal && (
      <div data-modal-container className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
   <div className="bg-white w-full max-w-sm rounded-[4rem] p-12 shadow-2xl relative border border-white/20 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setShowModal(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
              <h4 className={`text-3xl font-black italic mb-10 tracking-tighter leading-none ${roleTheme.text}`}>USER & <span className="text-slate-800">ACCESS</span></h4>
              
              <div className="space-y-6">
                 <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nama Lengkap</label>
                    <input type="text" placeholder="MISAL: BUDI SANTOSO" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                 </div>
                 <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Username Login</label>
                    <input type="text" placeholder="MISAL: BUDI_SANUR" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toUpperCase()})} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                 </div>
                 <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">PIN 6 DIGIT KEAMANAN</label>
                    <input type="text" placeholder="MISAL: 051020" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} maxLength={6} className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 shadow-inner" />
                 </div>
                 <button onClick={handleSave} disabled={isLocalSyncing} className={`w-full py-6 ${roleTheme.bg} text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3`}>
                    {isLocalSyncing ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18}/>} {showModal === 'ADD' ? 'BUAT AKSES BARU ✨' : 'UPDATE AKSES & HISTORI ✨'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {showDeleteConfirm && (
       <div data-modal-container className="fixed inset-0 z-[110000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
   <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setShowDeleteConfirm(null)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={24}/></button>
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-pulse"><AlertTriangle size={48} /></div>
              <div className="space-y-2">
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Hapus Akun?</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">
                    Akses milik <span className="text-slate-800 font-black underline">{showDeleteConfirm.name}</span> akan dihapus. Perhatikan: Menghapus akun tidak akan menghapus riwayat mereka di database utama (Presensi/SPP).
                 </p>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">BATAL</button>
                 <button onClick={executeDelete} disabled={isLocalSyncing} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2">{isLocalSyncing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} IYA, HAPUS</button>
              </div>
           </div>
        </div>
      )}
    </div>
  </>
  );
};

export default AdminStaff;
