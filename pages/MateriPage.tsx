import React, { useState, useEffect, useMemo } from 'react';
import { User, StudentPayment } from '../types';
import { supabase } from '../services/supabase.ts';
import {
  Library, Upload, FileText, Download, Trash2, Loader2,
  X, Plus, FolderOpen, CheckCircle2, AlertCircle
} from 'lucide-react';

interface Material {
  id: string;
  subject: string;
  level: string;
  title: string;
  file_url: string;
  file_size?: number;
  sort_order?: number;
  created_at?: string;
}

interface MateriPageProps {
  user: User;
  teachers: User[];
  subjects: string[];
  levels: string[];
  studentPayments?: StudentPayment[];
}

const stripLabel = (className: string) =>
  (className || '').replace(/\s*\(.*?\)\s*-\s*(REGULER|PRIVATE)\s*\d+/i, '').trim();

const MateriPage: React.FC<MateriPageProps> = ({ user, teachers, subjects, levels, studentPayments }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Material | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [form, setForm] = useState({ subject: subjects[0] || '', level: levels[0] || '', title: '', file: null as File | null });

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('materials').select('*').order('subject').order('level').order('sort_order');
      if (error) throw error;
      setMaterials(data || []);
    } catch (e) {
      console.error('Gagal ambil materi:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  // 🎯 Filter akses berdasarkan role
  const visibleMaterials = useMemo(() => {
    if (user.role === 'ADMIN') return materials;

    if (user.role === 'TEACHER') {
      const myTeacherRecord = teachers.find(t => t.id === user.id);
      const mySubjects: string[] = (myTeacherRecord as any)?.subjects || [];
      return materials.filter(m => mySubjects.includes(m.subject));
    }

    if (user.role === 'STUDENT') {
      const normalizedName = (user.name || '').toUpperCase().trim();
      const accessPairs = (studentPayments || [])
        .filter(p => (p.studentName || '').toUpperCase().trim() === normalizedName && p.status === 'VERIFIED')
        .map(p => {
          const name = stripLabel(p.className);
          const match = p.className.match(/\((.*?)\)/);
          return { subject: name, level: (match ? match[1] : '').toUpperCase() };
        });
      return materials.filter(m =>
        accessPairs.some(a => a.subject === m.subject && a.level === m.level)
      );
    }

    return [];
  }, [materials, user, teachers, studentPayments]);

  // Kelompokkan per subject -> level
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Material[]>>();
    visibleMaterials.forEach(m => {
      if (!map.has(m.subject)) map.set(m.subject, new Map());
      const levelMap = map.get(m.subject)!;
      if (!levelMap.has(m.level)) levelMap.set(m.level, []);
      levelMap.get(m.level)!.push(m);
    });
    return map;
  }, [visibleMaterials]);

  const resetForm = () => {
    setForm({ subject: subjects[0] || '', level: levels[0] || '', title: '', file: null });
    setShowUploadForm(false);
  };

  const handleUpload = async () => {
    if (!form.subject || !form.level || !form.title || !form.file) {
      return alert('Lengkapi semua kolom dulu ya, termasuk file PDF-nya! ✨');
    }
    if (form.file.type !== 'application/pdf') {
      return alert('File harus berformat PDF ya!');
    }
    setUploading(true);
    try {
      const id = `MAT-${Date.now()}`;
      const filePath = `${form.subject}/${form.level}/${id}_${form.file.name}`.replace(/\s+/g, '_');

      const { error: uploadError } = await supabase.storage.from('materials').upload(filePath, form.file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('materials').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('materials').insert([{
        id,
        subject: form.subject.toUpperCase(),
        level: form.level.toUpperCase(),
        title: form.title,
        file_url: publicUrlData.publicUrl,
        file_size: form.file.size,
      }]);
      if (insertError) throw insertError;

      await fetchMaterials();
      resetForm();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e: any) {
      alert('Gagal upload: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      const urlParts = confirmDelete.file_url.split('/materials/');
      const filePath = urlParts[1];
      if (filePath) await supabase.storage.from('materials').remove([filePath]);
      await supabase.from('materials').delete().eq('id', confirmDelete.id);
      await fetchMaterials();
      setConfirmDelete(null);
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-40 px-4 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="bg-slate-900 p-10 md:p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-20"></div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20"><Library size={14} className="text-white" /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Perpustakaan Digital</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Materi <span className="text-blue-500">Belajar</span></h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
            {isAdmin ? 'Kelola semua modul & contoh soal' : 'Modul & contoh soal sesuai kelasmu'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="relative z-10 flex items-center gap-3 bg-blue-600 hover:bg-blue-700 px-8 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            <Plus size={18} /> Upload Materi
          </button>
        )}
      </div>

      {/* LIST MATERI */}
      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>
      ) : grouped.size === 0 ? (
        <div className="bg-white p-14 rounded-[4rem] border border-slate-100 shadow-xl flex flex-col items-center text-center gap-4 opacity-60">
          <FolderOpen size={56} className="text-slate-300" />
          <p className="font-black text-[12px] uppercase tracking-[0.4em] text-slate-400">Belum Ada Materi</p>
          <p className="text-[10px] font-bold uppercase text-slate-400">
            {isAdmin ? 'Klik "Upload Materi" untuk mulai menambahkan.' : 'Materi untuk kelasmu belum tersedia.'}
          </p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([subject, levelMap]) => (
          <div key={subject} className="bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 shadow-xl space-y-8">
            <h3 className="font-black text-slate-800 uppercase italic text-2xl">{subject}</h3>
            {Array.from(levelMap.entries()).map(([level, items]) => (
              <div key={level} className="space-y-4">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Level {level}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map(m => (
                    <div key={m.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><FileText size={22} /></div>
                        <p className="font-black text-slate-700 text-sm truncate uppercase italic">{m.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md" title="Lihat/Download">
                          <Download size={16} />
                        </a>
                        {isAdmin && (
                          <button onClick={() => setConfirmDelete(m)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all" title="Hapus">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* MODAL UPLOAD (ADMIN ONLY) */}
      {showUploadForm && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative">
            <button onClick={resetForm} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500"><X size={20} /></button>
            <div className="space-y-1">
              <h4 className="text-xl font-black text-slate-800 uppercase italic">Upload Materi Baru</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">File harus format PDF</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Mata Pelajaran</label>
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl font-black text-xs outline-none border-2 border-slate-100">
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Level</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl font-black text-xs outline-none border-2 border-slate-100">
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Judul Materi</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Contoh Soal Bab 1" className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl font-black text-xs outline-none border-2 border-slate-100" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">File PDF</label>
                <input type="file" accept="application/pdf" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full mt-1 text-xs font-bold" />
              </div>
            </div>

            <button onClick={handleUpload} disabled={uploading} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <><Upload size={16} /> Upload Sekarang</>}
            </button>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center space-y-6">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto"><AlertCircle size={28} /></div>
            <div>
              <h4 className="text-lg font-black text-slate-800 uppercase italic">Hapus Materi?</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{confirmDelete.title}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase">Batal</button>
              <button onClick={executeDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-[130000] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 size={20} /> <span className="font-black text-[10px] uppercase">Berhasil disimpan!</span>
        </div>
      )}
    </div>
  );
};

export default MateriPage;
