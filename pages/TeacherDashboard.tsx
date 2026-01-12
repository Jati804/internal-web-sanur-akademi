import React, { useState, useMemo, useEffect } from 'react';
import { User, Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  ClipboardCheck, Loader2, Clock, Send, Zap, HeartPulse,
  UserPlus, BookOpen, Home, Layers, Wallet, Hash,
  Timer, RotateCcw, Save, Sparkles, Users, AlertTriangle, X
} from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useLocation, useNavigate } = ReactRouterDOM as any;

interface TeacherDashboardProps { 
  user: User; 
  logs: Attendance[];
  studentAccounts: User[];
  subjects: string[];
  levels: string[];
  classes: string[];
  salaryConfig: { regulerRate: number, privateRate: number };
  teachers: User[];
  refreshAllData: () => Promise<void>;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  user, logs, studentAccounts, subjects, classes, levels, salaryConfig, teachers, refreshAllData
}) => {
  const [loading, setLoading] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const editData = location.state?.editLog as Attendance | undefined;

  const [form, setForm] = useState({
    subject: '',
    level: 'BASIC',
    room: '',
    category: 'REGULER' as 'REGULER' | 'PRIVATE',
    studentName: '',
    targetTeacherId: '', 
    sessionNumber: 1, 
    duration: 2, 
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  });

  const [activePackageId, setActivePackageId] = useState<string | null>(null);
  const [activeOriginalTeacherId, setActiveOriginalTeacherId] = useState<string | null>(null);
  const [showLockAlert, setShowLockAlert] = useState<{ ownerName: string } | null>(null);

  // Pre-fill jika mode Edit
  useEffect(() => {
    if (editData) {
      const match = editData.className?.match(/(.*) \((.*)\) - (.*)/);
      setForm({
        subject: match ? match[1] : (editData.className || ''),
        level: editData.level || (match ? match[2] : 'BASIC'),
        room: match ? match[3] : '',
        category: editData.sessionCategory || 'REGULER',
        studentName: editData.studentsAttended?.[0] === 'REGULER' ? '' : (editData.studentsAttended?.[0] || ''),
        targetTeacherId: editData.teacherId !== user.id ? editData.teacherId : '',
        sessionNumber: editData.sessionNumber || 1,
        duration: editData.duration || 2,
        date: editData.date
      });
      setIsDelegating(editData.teacherId !== user.id);
      setActivePackageId(editData.packageId || null);
      setActiveOriginalTeacherId(editData.originalTeacherId || null);
    }
  }, [editData, user.id]);

  const estimatedHonor = useMemo(() => {
    const hourlyRate = form.category === 'PRIVATE' ? salaryConfig.privateRate : salaryConfig.regulerRate;
    return Math.round(hourlyRate * form.duration);
  }, [form.category, form.duration, salaryConfig]);

  // LOGIKA DETEKSI SIKLUS & PROTEKSI SLOT
  useEffect(() => {
    if (editData || !form.subject || !form.room) return;
    
    if (form.category === 'PRIVATE' && !form.studentName) {
      setForm(prev => ({ ...prev, sessionNumber: 1 }));
      setActivePackageId(null);
      setActiveOriginalTeacherId(null);
      return;
    }

    const fullClassName = `${form.subject} (${form.level}) - ${form.room}`.toUpperCase();
    
    const relevantLogs = logs.filter(l => {
      const isSameClass = (l.className || '').toUpperCase() === fullClassName;
      const isSameLevel = (l.level || '').toUpperCase() === form.level.toUpperCase();
      const isSameCategory = (l.sessionCategory || 'REGULER') === form.category;
      
      const isSameGrouping = form.category === 'PRIVATE' 
        ? (l.studentsAttended?.[0] || '').toUpperCase() === form.studentName.toUpperCase()
        : true;

      return isSameClass && isSameLevel && isSameCategory && isSameGrouping && 
             (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG');
    }).sort((a,b) => (b.sessionNumber || 0) - (a.sessionNumber || 0));

    const latestLog = relevantLogs[0];
    const lastSess = latestLog?.sessionNumber || 0;

    if (lastSess > 0 && lastSess < 6) {
      setForm(prev => ({ ...prev, sessionNumber: lastSess + 1 }));
      setActivePackageId(latestLog.packageId || null);
      setActiveOriginalTeacherId(latestLog.originalTeacherId || null);
    } else {
      setForm(prev => ({ ...prev, sessionNumber: 1 }));
      setActivePackageId(null);
      setActiveOriginalTeacherId(null);
    }
  }, [logs, form.subject, form.level, form.room, form.category, form.studentName, editData]);

  const handleLaporPresensi = async () => {
    if (!form.subject || !form.room) return alert("Pilih Matpel & Ruangan dulu ya! ✨");
    if (form.category === 'PRIVATE' && !form.studentName) return alert("Pilih Nama Siswa dulu untuk kelas Private! ✨");

    // --- VALIDASI PROTEKSI SLOT (KECUALI JIKA DELEGASI AKTIF) ---
    if (activeOriginalTeacherId && activeOriginalTeacherId !== user.id && !isDelegating && !editData) {
      const owner = teachers.find(t => t.id === activeOriginalTeacherId);
      setShowLockAlert({ ownerName: owner?.name || 'GURU LAIN' });
      return;
    }
    
    setLoading(true);
    try {
      const fullClassName = `${form.subject} (${form.level}) - ${form.room}`.toUpperCase();
      const targetTeacher = teachers.find(t => t.id === form.targetTeacherId);
      
      const groupSuffix = form.category === 'PRIVATE' ? `-${form.studentName.replace(/\s+/g, '-')}` : '-GROUP';
      const finalPackageId = activePackageId || `PKG-${form.category}-${fullClassName.replace(/\s+/g, '-')}${groupSuffix}-${Date.now()}`;
      const finalOriginalTeacherId = activeOriginalTeacherId || user.id;

      const payload: any = {
        id: editData ? editData.id : `ATT-${Date.now()}`,
        teacherid: isDelegating ? (targetTeacher?.id || user.id) : user.id,
        teachername: isDelegating ? (targetTeacher?.name.toUpperCase() || user.name.toUpperCase()) : user.name.toUpperCase(),
        date: form.date,
        clockin: editData ? editData.clockIn : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date()),
        status: isDelegating ? 'SUB_LOG' : 'SESSION_LOG',
        classname: fullClassName,
        level: form.level,
        sessioncategory: form.category,
        packageid: finalPackageId,
        sessionnumber: form.sessionNumber, 
        studentsattended: form.category === 'PRIVATE' ? [form.studentName.toUpperCase()] : ['REGULER'],
        earnings: estimatedHonor,
        paymentstatus: 'UNPAID',
        duration: form.duration,
        substitutefor: isDelegating ? user.name.toUpperCase() : (editData?.substituteFor || null),
        originalteacherid: finalOriginalTeacherId 
      };

      const { error } = await supabase.from('attendance').upsert([payload]);
      if (error) throw error;

      if (refreshAllData) await refreshAllData();
      setLoading(false);
      navigate('/teacher/honor', { replace: true }); 

    } catch (e: any) {
      alert("Gagal: " + e.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-40 px-4 animate-in">
      {loading && (
        <div className="fixed inset-0 z-[200000] bg-slate-900/80 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-in fade-in">
           <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-xl mb-8 animate-bounce">
              <Loader2 className="animate-spin" size={48} />
           </div>
           <p className="text-[12px] font-black uppercase tracking-[0.4em] italic animate-pulse">Memproses Data Sanur...</p>
        </div>
      )}

      <header className="relative py-14 px-10 bg-slate-900 rounded-[4rem] text-white shadow-2xl overflow-hidden group">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-40 -mt-40"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                  <Sparkles size={14} className="text-yellow-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{editData ? 'Mode KOREKSI DATA' : 'SANUR PRESENCE CORE'}</span>
               </div>
               <h2 className="text-4xl font-black uppercase italic leading-none">{editData ? 'Edit' : 'Lapor'} <span className="text-blue-500">Presensi</span></h2>
               <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic">Halo Kak {user.name.split(' ')[0]}! Semangat mengajar ✨</p>
            </div>
            <div className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-inner border border-white/10 rotate-3 group-hover:rotate-6 transition-all duration-500">
               {editData ? <RotateCcw size={48} className="text-orange-500" /> : <ClipboardCheck size={48} className="text-blue-500" />}
            </div>
         </div>
      </header>

      <div className="flex bg-white p-2 rounded-[2.5rem] border border-slate-100 shadow-xl max-w-sm mx-auto">
         <Link to="/teacher" className="flex-1 py-4 px-8 rounded-[2rem] text-[10px] font-black uppercase transition-all text-center flex items-center justify-center gap-3 bg-blue-600 text-white shadow-lg shadow-blue-200">
            <ClipboardCheck size={16}/> Presensi
         </Link>
         <Link to="/teacher/honor" className="flex-1 py-4 px-8 rounded-[2rem] text-[10px] font-black uppercase transition-all text-center flex items-center justify-center gap-3 text-slate-400 hover:text-blue-600">
            <Wallet size={16}/> Honor
         </Link>
      </div>

      <div className="bg-white p-10 md:p-14 rounded-[4rem] shadow-2xl border border-slate-100 space-y-12 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50"></div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><BookOpen size={14} className="text-blue-500"/> Mata Pelajaran</label>
               <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] font-black text-xs uppercase outline-none transition-all shadow-inner h-[72px]">
                  <option value="">-- PILIH MATPEL --</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Layers size={14} className="text-blue-500"/> Level Belajar</label>
               <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] font-black text-xs uppercase outline-none transition-all shadow-inner h-[72px]">
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
               </select>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Home size={14} className="text-blue-500"/> Ruang Kelas</label>
               <select value={form.room} onChange={e => setForm({...form, room: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] font-black text-xs uppercase outline-none transition-all shadow-inner h-[72px]">
                  <option value="">-- PILIH RUANGAN --</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Zap size={14} className="text-blue-500"/> Tipe Sesi</label>
               <div className="flex gap-4 p-1.5 bg-slate-100 rounded-[2rem] h-[72px]">
                  <button onClick={() => setForm({...form, category: 'REGULER', studentName: ''})} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${form.category === 'REGULER' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-600'}`}>Reguler</button>
                  <button onClick={() => setForm({...form, category: 'PRIVATE'})} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${form.category === 'PRIVATE' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-600'}`}>Private</button>
               </div>
            </div>

            {form.category === 'PRIVATE' && (
              <div className="md:col-span-2 space-y-4 animate-in slide-in-from-top-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Users size={14} className="text-blue-500"/> Nama Siswa <span className="text-rose-500 font-black">*WAJIB UNTUK PRIVATE</span></label>
                 <select value={form.studentName} onChange={e => setForm({...form, studentName: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] font-black text-xs uppercase outline-none transition-all shadow-inner h-[72px]">
                    <option value="">-- PILIH NAMA SISWA --</option>
                    {studentAccounts.map(s => <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>)}
                 </select>
                 <p className="text-[8px] font-bold text-slate-400 uppercase ml-4 tracking-widest italic">Tiap siswa private punya kotak gaji terpisah ✨</p>
              </div>
            )}

            <div className="md:col-span-2 space-y-6 pt-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2"><Hash size={14} className="text-blue-500"/> Sesi Ke-Berapa? (1-6)</label>
               <div className="grid grid-cols-6 gap-3">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <button key={n} onClick={() => setForm({...form, sessionNumber: n})} className={`py-5 rounded-2xl font-black text-lg transition-all border-2 ${form.sessionNumber === n ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 shadow-sm'}`}>{n}</button>
                  ))}
               </div>
               {activePackageId ? (
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-4 italic animate-pulse">✨ Melanjutkan Siklus Aktif ({form.category}) — Sesi {form.sessionNumber}/6</p>
               ) : (
                  <p className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest italic">🆕 Memulai Siklus 6 Sesi Baru</p>
               )}
            </div>

            <div className="space-y-6">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2"><Timer size={14} className="text-blue-500"/> Durasi Mengajar (Jam)</label>
               <div className="grid grid-cols-3 gap-4 h-[72px]">
                  {[1, 2, 3].map(h => (
                    <button key={h} onClick={() => setForm({...form, duration: h})} className={`rounded-[2rem] font-black text-sm transition-all border-2 ${form.duration === h ? 'bg-orange-600 text-white border-orange-600 shadow-xl scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-400 shadow-sm'}`}>{h} JAM</button>
                  ))}
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2"><Clock size={14} className="text-blue-500"/> Tanggal Pelaksanaan</label>
               <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all shadow-inner h-[72px]" />
            </div>

            <div className={`md:col-span-2 p-8 rounded-[3.5rem] border-2 transition-all duration-500 ${isDelegating ? 'bg-rose-50 border-rose-200 shadow-xl' : 'bg-slate-50 border-transparent'}`}>
               <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isDelegating ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                        <HeartPulse size={28}/>
                     </div>
                     <div>
                        <h4 className={`text-sm font-black uppercase italic ${isDelegating ? 'text-rose-600' : 'text-slate-500'}`}>Saya Berhalangan Mengajar?</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gunakan ini jika teman menggantikan sesi Kakak ✨</p>
                     </div>
                  </div>
                  <button onClick={() => setIsDelegating(!isDelegating)} className={`w-16 h-8 rounded-full p-1.5 transition-all duration-500 flex ${isDelegating ? 'bg-rose-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                     <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                  </button>
               </div>

               {isDelegating && (
                  <div className="mt-8 space-y-4 animate-in slide-in-from-top-4">
                     <label className="text-[9px] font-black text-rose-500 uppercase ml-4 tracking-widest flex items-center gap-2"><UserPlus size={12}/> Pilih Rekan Yang Menggantikan Kakak:</label>
                     <select value={form.targetTeacherId} onChange={e => setForm({...form, targetTeacherId: e.target.value})} className="w-full px-8 py-6 bg-white border-2 border-transparent focus:border-rose-500 rounded-[2rem] font-black text-[11px] uppercase outline-none shadow-sm transition-all h-[72px] appearance-none">
                        <option value="">-- PILIH NAMA TEMAN --</option>
                        {teachers.filter(t => t.id !== user.id && t.role === 'TEACHER').map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                     </select>
                  </div>
               )}
            </div>
         </div>

         <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex items-center justify-between shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-[40px] -ml-20 -mt-20"></div>
            <div className="flex items-center gap-4 relative z-10">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400 border border-white/10 shadow-inner"><Wallet size={24} /></div>
               <div>
                  <p className="text-[8px] font-black uppercase text-blue-300 tracking-[0.2em]">Estimasi Honor Sesi:</p>
                  <h3 className="text-2xl font-black italic text-emerald-400">Rp {estimatedHonor.toLocaleString()}</h3>
               </div>
            </div>
            <div className="text-right relative z-10 pr-4">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Penerima Honor:</p>
               <h3 className={`text-xs font-black uppercase italic ${isDelegating ? 'text-orange-400 animate-pulse' : 'text-blue-400'}`}>
                  {isDelegating ? (teachers.find(t=>t.id===form.targetTeacherId)?.name || 'PILIH TEMAN') : 'SAYA SENDIRI'}
               </h3>
            </div>
         </div>

         <button 
           onClick={handleLaporPresensi} 
           disabled={loading || !form.subject || !form.room} 
           className="w-full py-10 bg-blue-600 text-white rounded-[3rem] font-black text-[14px] uppercase tracking-[0.5em] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30 group"
         >
            {loading ? <Loader2 className="animate-spin" size={32} /> : (editData ? <><Save size={28}/> SIMPAN PERUBAHAN ✨</> : <><Send size={28} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> KIRIM PRESENSI SEKARANG ✨</>)}
         </button>
      </div>

      {/* MODAL PROTEKSI SLOT (LOCK ALERT) */}
      {showLockAlert && (
        <div className="fixed inset-0 z-[250000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative border-t-8 border-orange-500">
              <div className="w-24 h-24 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-pulse">
                <AlertTriangle size={48} />
              </div>
              <div className="space-y-4">
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Slot Terkunci!</h4>
                 <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed px-4">
                    Maaf Kak! Kelas ini sedang digunakan oleh <span className="text-orange-600 font-black underline">Kak {showLockAlert.ownerName.split(' ')[0]}</span> dan siklus belajarnya belum selesai (Sesi 6).
                 </p>
                 <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-[9px] font-black text-slate-400 uppercase leading-relaxed">
                    Jika Kakak hanya menggantikan beliau hari ini, silakan centang tombol <span className="text-blue-600">"SAYA MENGGANTIKAN TEMAN"</span> di form presensi.
                 </div>
              </div>
              <button 
                onClick={() => setShowLockAlert(null)} 
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                MENGERTI, SAYA CEK LAGI ✨
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
