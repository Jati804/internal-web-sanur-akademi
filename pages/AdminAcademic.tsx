
import React, { useState } from 'react';
import { 
  BookOpen, 
  Settings, 
  Plus, 
  Trash2, 
  Home, 
  Trash,
  X,
  Save,
  Clock,
  Layout,
  Cloud,
  Edit3,
  Layers,
  ArrowRight,
  Info,
  Banknote,
  DollarSign,
  Check,
  Loader2
} from 'lucide-react';
import { supabase } from '../services/supabase.ts';

interface AdminAcademicProps {
  subjects: string[];
  setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
  classes: string[];
  setClasses: React.Dispatch<React.SetStateAction<string[]>>;
  levels: string[];
  setLevels: React.Dispatch<React.SetStateAction<string[]>>;
  scheduleData: Record<string, string>;
  setScheduleData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  salaryConfig: { regulerRate: number, privateRate: number };
  setSalaryConfig: React.Dispatch<React.SetStateAction<{ regulerRate: number, privateRate: number }>>;
}

const AdminAcademic: React.FC<AdminAcademicProps> = ({ 
  subjects, setSubjects, classes, setClasses, levels, setLevels, scheduleData, setScheduleData, salaryConfig, setSalaryConfig
}) => {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'SCHEDULE' | 'SALARY'>('CONFIG');
  const [newSubject, setNewSubject] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
const [draggedType, setDraggedType] = useState<'SUBJECT' | 'CLASS' | 'LEVEL' | null>(null);
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Salary Editing State
  const [tempSalary, setTempSalary] = useState(salaryConfig);

  const [editingCell, setEditingCell] = useState<{ day: string, room: string } | null>(null);
  const [editMatpel, setEditMatpel] = useState('');
  const [editJam, setEditJam] = useState('');

  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  const syncConfigToCloud = async (newSubjects: string[], newLevels: string[], newClasses: string[]) => {
    setIsLoading(true);
    try {
      await supabase.from('settings').upsert({
        key: 'academic_config',
        value: { subjects: newSubjects, levels: newLevels, classes: newClasses }
      });
    } catch (e) {
      alert("Gagal sinkron konfigurasi ke Cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const syncScheduleToCloud = async (newData: Record<string, string>) => {
    setIsLoading(true);
    try {
      await supabase.from('settings').upsert({
        key: 'master_schedule',
        value: newData
      });
      setScheduleData(newData);
    } catch (e) {
      alert("Gagal sinkron jadwal ke Cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const syncSalaryToCloud = async () => {
    setIsLoading(true);
    try {
      await supabase.from('settings').upsert({
        key: 'salary_config',
        value: tempSalary
      });
      setSalaryConfig(tempSalary);
      alert("Tarif Honor Guru Berhasil Diperbarui! ✨");
    } catch (e) {
      alert("Gagal sinkron honor ke Cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (day: string, room: string) => {
    const rawValue = scheduleData[`${day}-${room}`] || '|';
    const [matpel, jam] = rawValue.split('|');
    setEditingCell({ day, room });
    setEditMatpel(matpel || '');
    setEditJam(jam || '');
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      const key = `${editingCell.day}-${editingCell.room}`;
      const valueToSave = `${editMatpel.toUpperCase()}|${editJam}`;
      const nextData = { ...scheduleData, [key]: valueToSave };
      syncScheduleToCloud(nextData);
      setEditingCell(null);
    }
  };

  const handleAddSubject = () => {
    if (!newSubject.trim()) return;
    const formatted = newSubject.trim().toUpperCase();
    if (subjects.includes(formatted)) return alert("Mata pelajaran sudah ada!");
    const next = [...subjects, formatted];
    setSubjects(next);
    syncConfigToCloud(next, levels, classes);
    setNewSubject('');
  };

  const handleRemoveSubject = (s: string) => {
    const next = subjects.filter(v => v !== s);
    setSubjects(next);
    syncConfigToCloud(next, levels, classes);
  };

  const handleAddClass = () => {
    if (!newClass.trim()) return;
    const formatted = newClass.trim();
    if (classes.includes(formatted)) return alert("Ruangan sudah ada!");
    const next = [...classes, formatted];
    setClasses(next);
    syncConfigToCloud(subjects, levels, next);
    setNewSubject('');
  };

  const handleRemoveClass = (c: string) => {
    const next = classes.filter(v => v !== c);
    setClasses(next);
    syncConfigToCloud(subjects, levels, next);
  };

  const handleAddLevel = () => {
    if (!newLevel.trim()) return;
    const formatted = newLevel.trim().toUpperCase();
    if (levels.includes(formatted)) return alert("Level sudah ada!");
    const next = [...levels, formatted];
    setLevels(next);
    syncConfigToCloud(subjects, next, classes);
    setNewLevel('');
  };

  const handleRemoveLevel = (l: string) => {
    const next = levels.filter(v => v !== l);
    setLevels(next);
    syncConfigToCloud(subjects, next, classes);
  };
  const handleDragStart = (index: number, type: 'SUBJECT' | 'CLASS' | 'LEVEL') => {
  setDraggedIndex(index);
  setDraggedType(type);
};

const handleDragOver = (e: React.DragEvent, index: number) => {
  e.preventDefault();
  setDragOverIndex(index);
};

const handleDrop = (dropIndex: number, type: 'SUBJECT' | 'CLASS' | 'LEVEL') => {
  if (draggedIndex === null || draggedType !== type || draggedIndex === dropIndex) {
    setDraggedIndex(null);
    setDraggedType(null);
    return;
  }

  if (type === 'SUBJECT') {
    const next = [...subjects];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(dropIndex, 0, moved);
    setSubjects(next);
    syncConfigToCloud(next, levels, classes);
  } else if (type === 'CLASS') {
    const next = [...classes];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(dropIndex, 0, moved);
    setClasses(next);
    syncConfigToCloud(subjects, levels, next);
  } else if (type === 'LEVEL') {
    const next = [...levels];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(dropIndex, 0, moved);
    setLevels(next);
    syncConfigToCloud(subjects, next, classes);
  }

  setDraggedIndex(null);
  setDraggedType(null);
};

const handleDragEnd = () => {
  setDraggedIndex(null);
  setDraggedType(null);
  setDragOverIndex(null);
};

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 px-4 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><Settings size={18} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Academic Central Management</span>
           </div>
           <h2 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">Pengaturan <span className="text-blue-600">Akademik</span></h2>
           <p className="text-slate-500 font-medium text-sm max-w-lg leading-relaxed italic">Kelola daftar program, peta ruang, dan tarif gaji guru secara dinamis.</p>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-[2rem] border border-slate-200 shadow-inner flex-wrap justify-center">
           <button onClick={() => setActiveTab('CONFIG')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'CONFIG' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>1. Data Master</button>
           <button onClick={() => setActiveTab('SCHEDULE')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SCHEDULE' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>2. Peta Ruangan</button>
           <button onClick={() => setActiveTab('SALARY')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SALARY' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400'}`}>3. Gaji Guru</button>
        </div>
      </div>

      <div className={`flex items-center gap-3 px-6 py-3 bg-blue-50 rounded-2xl w-fit mx-auto transition-all duration-500 border border-blue-100 shadow-sm ${isLoading ? 'opacity-100' : 'opacity-0'}`}>
         <Cloud size={18} className="text-blue-600 animate-pulse" />
         <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Sinkronisasi Cloud Aktif...</span>
      </div>

      {activeTab === 'CONFIG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <section className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-8 flex flex-col group hover:border-blue-200 transition-all duration-500">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-inner group-hover:scale-110 transition-transform"><BookOpen size={28}/></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase italic">Mata Pelajaran</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Program Belajar Utama</p>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <input type="text" placeholder="MATPEL BARU..." value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="flex-1 min-w-0 px-6 py-5 bg-slate-50 rounded-[1.5rem] font-black text-[11px] uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" />
              <button onClick={handleAddSubject} className="p-5 bg-blue-600 text-white rounded-[1.5rem] shadow-xl hover:bg-blue-700 active:scale-95 transition-all"><Plus size={20} /></button>
            </div>
            <div className="space-y-2 flex-1 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
  {subjects.map((s, idx) => (
    <div 
  key={idx} 
  draggable
  onDragStart={() => handleDragStart(idx, 'SUBJECT')}
  onDragOver={(e) => handleDragOver(e, idx)}
  onDrop={() => handleDrop(idx, 'SUBJECT')}
  onDragEnd={handleDragEnd}
  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all group/item cursor-move ${
    draggedIndex === idx && draggedType === 'SUBJECT' 
      ? 'opacity-50 bg-blue-100 border-blue-300 border-dashed' 
      : dragOverIndex === idx && draggedType === 'SUBJECT'
      ? 'bg-blue-50 border-blue-400 scale-105 shadow-lg'
      : 'bg-slate-50 border-transparent hover:border-blue-100'
  }`}
>
      <span className="text-[11px] font-black uppercase italic text-slate-700">{s}</span>
      <button onClick={() => handleRemoveSubject(s)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
    </div>
  ))}
</div>
          </section>

          <section className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-8 flex flex-col group hover:border-emerald-200 transition-all duration-500">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner group-hover:scale-110 transition-transform"><Layers size={28}/></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase italic">Level Belajar</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tingkatan Kompetensi</p>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <input type="text" placeholder="LEVEL BARU..." value={newLevel} onChange={(e) => setNewLevel(e.target.value)} className="flex-1 min-w-0 px-6 py-5 bg-slate-50 rounded-[1.5rem] font-black text-[11px] uppercase outline-none focus:bg-white border-2 border-transparent focus:border-emerald-500 transition-all shadow-inner" />
              <button onClick={handleAddLevel} className="p-5 bg-emerald-600 text-white rounded-[1.5rem] shadow-xl hover:bg-emerald-700 active:scale-95 transition-all"><Plus size={20} /></button>
            </div>
            <div className="space-y-2 flex-1 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
  {levels.map((l, idx) => (
    <div 
  key={idx} 
  draggable
  onDragStart={() => handleDragStart(idx, 'LEVEL')}
  onDragOver={(e) => handleDragOver(e, idx)}
  onDrop={() => handleDrop(idx, 'LEVEL')}
  onDragEnd={handleDragEnd}
  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all group/item cursor-move ${
    draggedIndex === idx && draggedType === 'LEVEL' 
      ? 'opacity-50 bg-emerald-100 border-emerald-300 border-dashed' 
      : dragOverIndex === idx && draggedType === 'LEVEL'
      ? 'bg-emerald-50 border-emerald-400 scale-105 shadow-lg'
      : 'bg-slate-50 border-transparent hover:border-emerald-100'
  }`}
>
      <span className="text-[11px] font-black uppercase italic text-slate-700">{l}</span>
      <button onClick={() => handleRemoveLevel(l)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
    </div>
  ))}
</div>
          </section>

          <section className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-8 flex flex-col group hover:border-orange-200 transition-all duration-500">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl shadow-inner group-hover:scale-110 transition-transform"><Home size={28}/></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase italic">Ruang Kelas</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lokasi Pelaksanaan Sesi</p>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <input type="text" placeholder="RUANG BARU..." value={newClass} onChange={(e) => setNewClass(e.target.value)} className="flex-1 min-w-0 px-6 py-5 bg-slate-50 rounded-[1.5rem] font-black text-[11px] uppercase outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 transition-all shadow-inner" />
              <button onClick={handleAddClass} className="p-5 bg-orange-500 text-white rounded-[1.5rem] shadow-xl hover:bg-orange-600 active:scale-95 transition-all"><Plus size={20} /></button>
            </div>
            <div className="space-y-2 flex-1 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
  {classes.map((c, idx) => (
    <div 
  key={idx} 
  draggable
  onDragStart={() => handleDragStart(idx, 'CLASS')}
  onDragOver={(e) => handleDragOver(e, idx)}
  onDrop={() => handleDrop(idx, 'CLASS')}
  onDragEnd={handleDragEnd}
  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all group/item cursor-move ${
    draggedIndex === idx && draggedType === 'CLASS' 
      ? 'opacity-50 bg-orange-100 border-orange-300 border-dashed' 
      : dragOverIndex === idx && draggedType === 'CLASS'
      ? 'bg-orange-50 border-orange-400 scale-105 shadow-lg'
      : 'bg-slate-50 border-transparent hover:border-orange-100'
  }`}
>
      <span className="text-[11px] font-black uppercase italic text-slate-700">{c}</span>
      <button onClick={() => handleRemoveClass(c)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
    </div>
  ))}
</div>
          </section>
        </div>
      )}

      {activeTab === 'SCHEDULE' && (
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-700">
           <div className="p-12 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
              <div className="relative z-10">
                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Peta Ruangan Cloud</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
                  <Cloud size={14} className="text-blue-400" /> Sinkronisasi Real-time Aktif
                </p>
              </div>
              <button onClick={() => { if(window.confirm("Kosongkan semua peta ruangan?")) syncScheduleToCloud({}); }} className="px-10 py-5 bg-white/10 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center gap-3 backdrop-blur-md border border-white/10 shadow-xl active:scale-95"><Trash size={18}/> Reset Semua Jadwal</button>
           </div>
           
           <div className="p-8 bg-blue-50/50 border-b border-blue-100 flex items-center gap-4">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg"><Info size={16} /></div>
              <p className="text-[10px] font-black text-blue-800 uppercase tracking-tight">Klik pada kotak ruangan untuk menambah atau mengubah jadwal harian. Perubahan langsung tersimpan di Cloud.</p>
           </div>

           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
                 <thead><tr className="bg-slate-50 border-b"><th className="p-8 text-[11px] font-black text-slate-500 uppercase tracking-widest border-r w-48 bg-slate-100 sticky left-0 z-20 shadow-sm italic">Ruangan \ Hari</th>{days.map(d => (<th key={d} className="p-8 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center border-r bg-slate-50">{d}</th>))}</tr></thead>
                 <tbody className="divide-y divide-slate-100">
                    {classes.map(room => (
                       <tr key={room} className="group/row">
                          <td className="p-8 font-black text-slate-800 text-[12px] uppercase italic bg-slate-50 border-r sticky left-0 z-10 shadow-sm group-hover/row:bg-blue-50 transition-colors">{room}</td>
                          {days.map(day => {
                             const rawValue = scheduleData[`${day}-${room}`] || '';
                             const [matpel, jam] = rawValue.split('|');
                             return (
                               <td key={day} className="p-3 border-r h-[140px] relative">
                                  {matpel ? (
                                     <div className="w-full h-full p-6 bg-blue-600 text-white rounded-[2rem] shadow-xl flex flex-col justify-center items-center group/card relative overflow-hidden text-center border-2 border-transparent hover:border-white transition-all scale-[0.98] hover:scale-100">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -mr-8 -mt-8"></div>
                                        {jam && <div className="flex items-center gap-1.5 mb-2 opacity-80"><Clock size={12} /><span className="text-[10px] font-black uppercase">{jam}</span></div>}
                                        <p className="text-[11px] font-black uppercase italic tracking-tight leading-tight px-2">{matpel}</p>
                                        <button onClick={() => handleOpenEdit(day, room)} className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm"><Edit3 size={28} className="text-white mb-2" /><span className="text-[9px] font-black uppercase text-white tracking-widest">UBAH JADWAL</span></button>
                                     </div>
                                  ) : (
                                     <button onClick={() => handleOpenEdit(day, room)} className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] hover:border-blue-300 hover:bg-blue-50/50 transition-all group/btn"><Plus size={24} className="text-slate-200 group-hover/btn:text-blue-500 mb-2 transition-all group-hover/btn:scale-125" /><span className="text-[9px] font-black text-slate-200 group-hover/btn:text-blue-400 uppercase tracking-widest">ISI JADWAL</span></button>
                                  )}
                               </td>
                             );
                          })}
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'SALARY' && (
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl p-10 md:p-14 animate-in slide-in-from-bottom-4 space-y-12">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-50 pb-10">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center shadow-inner"><Banknote size={32} /></div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase italic">Konfigurasi Honor Guru</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Tarif per jam yang otomatis tersinkron ke log presensi.</p>
                 </div>
              </div>
              <button onClick={syncSalaryToCloud} disabled={isLoading} className="px-12 py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-3">
                 {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} SIMPAN PERUBAHAN TARIF ✨
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-slate-50 p-10 rounded-[3.5rem] border-2 border-transparent hover:border-blue-200 transition-all group">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><Layers size={24}/></div>
                    <h4 className="font-black text-slate-800 uppercase italic tracking-tight">Tarif Kelas REGULER</h4>
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Honor Per Jam (Rp)</label>
                    <div className="relative flex items-center bg-white rounded-[2rem] px-8 border-2 border-transparent group-focus-within:border-blue-500 shadow-inner">
                       <span className="text-xl font-black text-slate-300 italic mr-3">Rp</span>
                       <input 
                         type="number" 
                         value={tempSalary.regulerRate} 
                         onChange={e => setTempSalary({...tempSalary, regulerRate: parseInt(e.target.value) || 0})}
                         className="w-full py-6 bg-transparent font-black text-3xl outline-none text-slate-800"
                       />
                    </div>
                 </div>
              </div>

              <div className="bg-slate-50 p-10 rounded-[3.5rem] border-2 border-transparent hover:border-orange-200 transition-all group">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm"><Edit3 size={24}/></div>
                    <h4 className="font-black text-slate-800 uppercase italic tracking-tight">Tarif Kelas PRIVATE</h4>
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Honor Per Jam (Rp)</label>
                    <div className="relative flex items-center bg-white rounded-[2rem] px-8 border-2 border-transparent group-focus-within:border-orange-500 shadow-inner">
                       <span className="text-xl font-black text-slate-300 italic mr-3">Rp</span>
                       <input 
                         type="number" 
                         value={tempSalary.privateRate} 
                         onChange={e => setTempSalary({...tempSalary, privateRate: parseInt(e.target.value) || 0})}
                         className="w-full py-6 bg-transparent font-black text-3xl outline-none text-slate-800"
                       />
                    </div>
                 </div>
              </div>
           </div>

           <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex items-start gap-6">
              <Info size={24} className="text-blue-600 mt-1 shrink-0" />
              <p className="text-[11px] font-bold text-blue-800 uppercase leading-relaxed tracking-wide italic">
                 "Catatan: Perubahan tarif ini hanya akan berpengaruh pada sesi-sesi baru yang dilaporkan oleh guru di masa depan. Data sesi lama yang sudah tersimpan di database tetap menggunakan tarif saat sesi tersebut dibuat demi konsistensi laporan keuangan."
              </p>
           </div>
        </div>
      )}

      {/* MODAL EDIT PER SEL (CELL) */}
      {editingCell && (
        <div className="fixed inset-0 z-[6000] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in zoom-in duration-300" onClick={() => setEditingCell(null)}>
           <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 md:p-14 shadow-2xl relative border border-slate-50" onClick={e => e.stopPropagation()}>
              <button onClick={() => setEditingCell(null)} className="absolute top-10 right-10 p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
              <div className="mb-10 text-center">
                 <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100 rotate-3"><Layout size={28} /></div>
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">Update Jadwal</h4>
                 <div className="flex items-center justify-center gap-3 mt-3 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                   <span>{editingCell.room}</span>
                   <ArrowRight size={12} className="text-blue-500" />
                   <span>{editingCell.day}</span>
                 </div>
              </div>
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-4 flex items-center gap-2"><Clock size={14} className="text-blue-500" /> Jam Belajar</label>
                    <input type="text" placeholder="MISAL: 08:00 - 10:00" className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" value={editJam} onChange={e => setEditJam(e.target.value)} />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-4 flex items-center gap-2"><BookOpen size={14} className="text-blue-500" /> Mata Pelajaran</label>
                    <input type="text" placeholder="MISAL: WORD BASIC..." className="w-full px-8 py-5 bg-slate-50 rounded-[1.8rem] font-black text-sm uppercase outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" value={editMatpel} onChange={e => setEditMatpel(e.target.value)} />
                 </div>
                 <div className="pt-6 flex gap-4">
                    <button onClick={() => setEditingCell(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Batal</button>
                    <button onClick={handleSaveEdit} className="flex-[1.5] py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                       {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} SIMPAN PERUBAHAN
                    </button>
                 </div>
              </div>
              <p className="mt-8 text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center italic">Perubahan akan langsung muncul di HP guru Kak ✨</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminAcademic;
