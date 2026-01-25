import React, { useState, useMemo, useEffect } from 'react';
import { User, Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  ClipboardCheck, Loader2, Clock, Send, Zap, HeartPulse,
  UserPlus, BookOpen, Home, Layers, Wallet, Hash,
  Timer, RotateCcw, Save, Sparkles, Users, Info, AlertTriangle, X, Check
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
  const [isDetecting, setIsDetecting] = useState(false);
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
  
  // STATE BARU: Modal blocking untuk slot yang sedang dipakai
  const [blockModal, setBlockModal] = useState<{
    ownerName: string;
    className: string;
    currentSession: number;
  } | null>(null);

  // State untuk autocomplete
const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
const [showTeacherSuggestions, setShowTeacherSuggestions] = useState(false);
const [studentInputValue, setStudentInputValue] = useState('');
const [teacherInputValue, setTeacherInputValue] = useState('');

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
      // Isi input autocomplete juga
setStudentInputValue(editData.studentsAttended?.[0] === 'REGULER' ? '' : (editData.studentsAttended?.[0] || ''));
setTeacherInputValue(editData.teacherId !== user.id ? (teachers.find(t => t.id === editData.teacherId)?.name || '') : '');
    }
  }, [editData, user.id]);

  // ✅ Auto scroll modal ke tengah viewport (body bebas scroll)
  useEffect(() => {
    const hasModal = !!blockModal;
    
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
  }, [blockModal]);

  const estimatedHonor = useMemo(() => {
    const hourlyRate = form.category === 'PRIVATE' ? (salaryConfig?.privateRate || 25000) : (salaryConfig?.regulerRate || 15000);
    return Math.round(hourlyRate * form.duration);
  }, [form.category, form.duration, salaryConfig]);

  // LOGIKA DETEKSI SESI OTOMATIS (FIXED: ENTRY TIME BASED)
  useEffect(() => {
    if (editData || !form.subject || !form.room || !Array.isArray(logs)) return;
    
    if (form.category === 'PRIVATE' && !form.studentName) {
      setForm(prev => ({ ...prev, sessionNumber: 1 }));
      setActivePackageId(null);
      setActiveOriginalTeacherId(null);
      return;
    }

    setIsDetecting(true);
    
    const fullClassName = `${form.subject} (${form.level}) - ${form.room}`.toUpperCase().trim();
    
    const timer = setTimeout(() => {
      // 1. Ambil semua riwayat pengajaran kelas ini
      const relevantLogs = logs.filter(l => {
        const dbClass = (l.className || '').toUpperCase().trim();
        const dbLevel = (l.level || '').toUpperCase().trim();
        const dbCategory = (l.sessionCategory || 'REGULER');
        
        const isSameClass = dbClass === fullClassName;
        const isSameLevel = dbLevel === form.level.toUpperCase();
        const isSameCategory = dbCategory === form.category;
        
        const isSameGrouping = form.category === 'PRIVATE' 
          ? (l.studentsAttended?.[0] || '').toUpperCase().trim() === form.studentName.toUpperCase().trim()
          : true;

        return isSameClass && isSameLevel && isSameCategory && isSameGrouping && 
               (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG');
      });

      // 2. URUTKAN BERDASARKAN ID (TIMESTAMP) TERBARU
      // Ini kunci utamanya: Sesi 1 yang baru diinput di siklus baru akan punya ID lebih besar 
      // dibanding Sesi 6 di siklus lama, meskipun nomor sesinya lebih kecil.
      const sortedByEntry = [...relevantLogs].sort((a, b) => b.id.localeCompare(a.id));
      
      const latestAction = sortedByEntry[0];
      
      if (latestAction) {
        const lastSessNum = Number(latestAction.sessionNumber) || 0;
        
        // Jika aktivitas terakhir belum mencapai 6, lanjutkan paket tersebut
        if (lastSessNum < 6) {
          setForm(prev => ({ ...prev, sessionNumber: lastSessNum + 1 }));
          setActivePackageId(latestAction.packageId || null);
          setActiveOriginalTeacherId(latestAction.originalTeacherId || null);
        } else {
          // Jika aktivitas terakhir adalah Sesi 6, maka siklus selesai, buka paket baru (Sesi 1)
          setForm(prev => ({ ...prev, sessionNumber: 1 }));
          setActivePackageId(null);
          setActiveOriginalTeacherId(null);
        }
      } else {
        // Jika tidak ada riwayat sama sekali
        setForm(prev => ({ ...prev, sessionNumber: 1 }));
        setActivePackageId(null);
        setActiveOriginalTeacherId(null);
      }
      setIsDetecting(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [logs, form.subject, form.level, form.room, form.category, form.studentName, editData]);

  const handleLaporPresensi = async () => {
    if (isDetecting) return;
    if (!form.subject || !form.room) return alert("Pilih Matpel & Ruangan dulu ya! ✨");
    if (form.category === 'PRIVATE' && !form.studentName) return alert("Pilih Nama Siswa dulu untuk kelas Private! ✨");
    
    // ⭐ VALIDASI OWNERSHIP SEBELUM SUBMIT!
    if (activePackageId && activeOriginalTeacherId && activeOriginalTeacherId !== user.id) {
      // Ini bukan siklus saya, cek apakah saya pernah substitusi di paket ini
      const mySubLogs = logs.filter(l => 
        l.packageId === activePackageId && 
        l.teacherId === user.id && 
        l.status === 'SUB_LOG'
      );
      
      if (mySubLogs.length === 0) {
        // BLOCK! Saya tidak punya akses ke siklus ini
        const owner = teachers.find(t => t.id === activeOriginalTeacherId);
        const fullClassName = `${form.subject} (${form.level}) - ${form.room}`;
        
        setBlockModal({
          ownerName: owner?.name || 'Guru Lain',
          className: fullClassName,
          currentSession: form.sessionNumber
        });
        return; // STOP SUBMIT!
      }
    }
    
    setLoading(true);
    try {
      const fullClassName = `${form.subject} (${form.level}) - ${form.room}`.toUpperCase();
      const targetTeacher = teachers.find(t => t.id === form.targetTeacherId);
      
      const groupSuffix = form.category === 'PRIVATE' ? `-${form.studentName.replace(/\s+/g, '-')}` : '-GROUP';
      // ID Paket ditentukan di sini: kalau Sesi 1 buat baru, kalau 2-6 pakai yang lama
      const finalPackageId = activePackageId || `PKG-${form.category}-${fullClassName.replace(/\s+/g, '-')}${groupSuffix}-${Date.now()}`;
      const finalOriginalTeacherId = activeOriginalTeacherId || user.id;

      const payload: any = {
        id: editData ? editData.id : `ATT-${Date.now()}`, // ID berisi timestamp untuk sorting
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
      navigate('/teacher/honor', { replace: true, state: { highlightId: finalPackageId } }); 

    } catch (e: any) {
      alert("Gagal: " + e.message);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
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

      <div className="max-w-4xl mx-auto space-y-12 pb-40 px-4 animate-in">
      {(loading || isDetecting) && (
        <div className="fixed inset-0 z-[200000] bg-slate-900/80 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-in fade-in">
           <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-xl mb-8 animate-bounce">
              <Loader2 className="animate-spin" size={48} />
           </div>
           <p className="text-[12px] font-black uppercase tracking-[0.4em] italic animate-pulse">
             {isDetecting ? 'Mencari Riwayat Sesi...' : 'Memproses Data Sanur...'}
           </p>
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
         <Link to="/teacher/honor" className="flex-1 py-4 px-8 rounded-[2rem] text-[10px] font-black uppercase transition-all text-center flex items-center justify-center gap-3 text-slate-400 hover:text-orange-600">
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
  <div className="md:col-span-2 space-y-4 animate-in slide-in-from-top-2 relative">
     <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest flex items-center gap-2">
       <Users size={14} className="text-blue-500"/> Nama Siswa <span className="text-rose-500 font-black">*WAJIB UNTUK PRIVATE</span>
     </label>
     
     <div className="relative">
       <input 
         type="text"
         placeholder="KETIK NAMA SISWA..."
         value={studentInputValue}
         onChange={(e) => {
           const val = e.target.value.toUpperCase();
           setStudentInputValue(val);
           setShowStudentSuggestions(true);
           
           // Cek apakah yang diketik ada di database
           const matchedStudent = studentAccounts.find(s => s.name.toUpperCase() === val);
           if (matchedStudent) {
             setForm({...form, studentName: matchedStudent.name});
           } else {
             setForm({...form, studentName: ''}); // Reset kalau nggak match
           }
         }}
         onFocus={() => setShowStudentSuggestions(true)}
         onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 200)}
         className="w-full px-8 py-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] font-black text-xs uppercase outline-none transition-all shadow-inner h-[72px]"
       />
       
       {/* Dropdown Suggestions */}
       {showStudentSuggestions && studentInputValue.trim() && (
         <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border-2 border-blue-100 max-h-60 overflow-y-auto">
           {studentAccounts
             .filter(s => s.name.toUpperCase().includes(studentInputValue.toUpperCase()))
             .slice(0, 8)
             .map(student => (
               <button
                 key={student.id}
                 type="button"
                 onMouseDown={(e) => {
                   e.preventDefault();
                   setStudentInputValue(student.name.toUpperCase());
                   setForm({...form, studentName: student.name});
                   setShowStudentSuggestions(false);
                 }}
                 className="w-full px-6 py-4 text-left text-[11px] font-black hover:bg-blue-50 transition-all text-slate-700 border-b last:border-0 uppercase"
               >
                 {student.name.toUpperCase()}
               </button>
             ))
           }
           {studentAccounts.filter(s => s.name.toUpperCase().includes(studentInputValue.toUpperCase())).length === 0 && (
             <div className="px-6 py-4 text-[10px] font-bold text-rose-500 uppercase italic text-center">
               ❌ Nama "{studentInputValue}" tidak ditemukan!
             </div>
           )}
         </div>
       )}
     </div>
     
     <p className="text-[8px] font-bold text-slate-400 uppercase ml-4 tracking-widest italic">Tiap siswa private punya kotak gaji terpisah ✨</p>
  </div>
)}

            <div className="md:col-span-2 space-y-6 pt-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2"><Hash size={14} className="text-blue-500"/> Sesi Terdeteksi Otomatis (1-6)</label>
               <div className="grid grid-cols-6 gap-3">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <div 
                      key={n} 
                      className={`py-5 rounded-2xl font-black text-lg transition-all border-2 text-center flex items-center justify-center cursor-default ${form.sessionNumber === n ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-slate-50 text-slate-300 border-slate-100 shadow-inner'} ${isDetecting ? 'animate-pulse opacity-50' : ''}`}
                    >
                      {n}
                    </div>
                  ))}
               </div>
               {activePackageId ? (
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-4 italic animate-pulse">✨ Melanjutkan Siklus Aktif ({form.category}) — Sesi {form.sessionNumber}/6 Terdeteksi</p>
               ) : (
                  <p className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest italic">🆕 Memulai Siklus 6 Sesi Baru (Sesi 1)</p>
               )}
               <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em] ml-4 italic">*Nomor sesi otomatis mengikuti riwayat mengajar Kakak.</p>
               
               <div className="mt-4 ml-4 bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-4 shadow-sm animate-in fade-in duration-700">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-md">
                     <Info size={16} />
                  </div>
                  <p className="text-[9px] font-bold text-blue-800 uppercase italic leading-relaxed tracking-wide">
                     "Jika nomor sesi tidak sesuai, mohon cek kembali: <span className="font-black underline">Mata Pelajaran</span>, <span className="font-black underline">Level Belajar</span>, <span className="font-black underline">Ruang Kelas</span>, <span className="font-black underline">Tipe Sesi</span>, dan <span className="font-black underline">Nama Siswa</span> (Khusus Private) agar sistem mendeteksi paket yang benar Kak! ✨"
                  </p>
               </div>
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
  <div className="mt-8 space-y-4 animate-in slide-in-from-top-4 relative">
     <label className="text-[9px] font-black text-rose-500 uppercase ml-4 tracking-widest flex items-center gap-2">
       <UserPlus size={12}/> Pilih Rekan Yang Menggantikan Kakak:
     </label>
     
     <div className="relative">
       <input 
         type="text"
         placeholder="KETIK NAMA TEMAN..."
         value={teacherInputValue}
         onChange={(e) => {
           const val = e.target.value.toUpperCase();
           setTeacherInputValue(val);
           setShowTeacherSuggestions(true);
           
           // Cek apakah yang diketik ada di database
           const matchedTeacher = teachers.find(t => t.name.toUpperCase() === val && t.id !== user.id && t.role === 'TEACHER');
           if (matchedTeacher) {
             setForm({...form, targetTeacherId: matchedTeacher.id});
           } else {
             setForm({...form, targetTeacherId: ''}); // Reset kalau nggak match
           }
         }}
         onFocus={() => setShowTeacherSuggestions(true)}
         onBlur={() => setTimeout(() => setShowTeacherSuggestions(false), 200)}
         className="w-full px-8 py-6 bg-white border-2 border-transparent focus:border-rose-500 rounded-[2rem] font-black text-[11px] uppercase outline-none shadow-sm transition-all h-[72px]"
       />
       
       {/* Dropdown Suggestions */}
       {showTeacherSuggestions && teacherInputValue.trim() && (
         <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border-2 border-rose-100 max-h-60 overflow-y-auto">
           {teachers
             .filter(t => t.id !== user.id && t.role === 'TEACHER' && t.name.toUpperCase().includes(teacherInputValue.toUpperCase()))
             .slice(0, 8)
             .map(teacher => (
               <button
                 key={teacher.id}
                 type="button"
                 onMouseDown={(e) => {
                   e.preventDefault();
                   setTeacherInputValue(teacher.name.toUpperCase());
                   setForm({...form, targetTeacherId: teacher.id});
                   setShowTeacherSuggestions(false);
                 }}
                 className="w-full px-6 py-4 text-left text-[11px] font-black hover:bg-rose-50 transition-all text-slate-700 border-b last:border-0 uppercase"
               >
                 {teacher.name.toUpperCase()}
               </button>
             ))
           }
           {teachers.filter(t => t.id !== user.id && t.role === 'TEACHER' && t.name.toUpperCase().includes(teacherInputValue.toUpperCase())).length === 0 && (
             <div className="px-6 py-4 text-[10px] font-bold text-rose-500 uppercase italic text-center">
               ❌ Nama "{teacherInputValue}" tidak ditemukan!
             </div>
           )}
         </div>
       )}
     </div>
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
           disabled={loading || isDetecting || !form.subject || !form.room} 
           className="w-full py-10 bg-blue-600 text-white rounded-[3rem] font-black text-[14px] uppercase tracking-[0.5em] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30 group"
         >
            {loading ? <Loader2 className="animate-spin" size={32} /> : isDetecting ? 'HARAP TUNGGU...' : (editData ? <><Save size={28}/> SIMPAN PERUBAHAN ✨</> : <><Send size={28} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> KIRIM PRESENSI SEKARANG ✨</>)}
         </button>
      </div>

      {/* MODAL BLOCKING SLOT OWNERSHIP */}
      {blockModal && (
        <div data-modal-container className="fixed inset-0 z-[300000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
          <div className="bg-white w-full max-w-md rounded-[4rem] p-12 text-center space-y-8 shadow-2xl relative border-t-8 border-rose-600 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
            <button 
              onClick={() => setBlockModal(null)} 
              className="absolute top-8 right-8 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"
            >
              <X size={20}/>
            </button>
            
            <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner animate-pulse border-4 border-rose-100">
              <AlertTriangle size={48} />
            </div>
            
            <div className="space-y-4">
              <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">
                Slot Sedang Digunakan! ⚠️
              </h4>
              
              <div className="p-6 bg-rose-50 rounded-[2rem] border-2 border-rose-100 space-y-3">
                <p className="text-[11px] font-bold text-rose-800 uppercase leading-relaxed">
                  Kelas <span className="font-black text-rose-600">"{blockModal.className}"</span> sedang berjalan oleh:
                </p>
                <div className="py-4 px-6 bg-white rounded-2xl shadow-sm border border-rose-100">
                  <p className="text-lg font-black text-slate-800 uppercase italic">
                    {blockModal.ownerName}
                  </p>
                </div>
                <p className="text-[10px] font-bold text-rose-700 italic">
                  Saat ini mereka di Sesi {blockModal.currentSession}/6
                </p>
              </div>
              
              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 text-left space-y-2">
                <div className="flex items-start gap-3">
                  <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                    <span className="font-black">Kakak bisa input kelas ini setelah:</span>
                  </p>
                </div>
                <ul className="ml-7 space-y-1.5 text-[9px] font-bold text-blue-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Beliau menyelesaikan <span className="font-black">Sesi 6</span>, atau</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Beliau <span className="font-black">mendelegasikan</span> sesi kepada Kakak, atau</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Hubungi <span className="font-black">Admin</span> untuk koordinasi tukar kelas</span>
                  </li>
                </ul>
              </div>
              
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic px-4 leading-relaxed">
                "Sistem ini mencegah bentrok data agar honor Kakak dan rekan tetap akurat! ✨"
              </p>
            </div>
            
            <button 
              onClick={() => setBlockModal(null)} 
              className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Check size={20}/> SAYA MENGERTI
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default TeacherDashboard;
