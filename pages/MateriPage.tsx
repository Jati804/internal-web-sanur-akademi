import React, { useState, useEffect, useMemo } from 'react';
import { User, StudentPayment, Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import ModalPortal from '../ModalPortal.tsx';
import {
  Library, Upload, Download, Trash2, Loader2,
  X, Plus, FolderOpen, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown,
  ExternalLink, Link as LinkIcon
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
  subjects: string[];
  levels: string[];
  studentPayments?: StudentPayment[];
  attendanceLogs?: Attendance[];
}

const stripLabel = (className: string) =>
  (className || '').replace(/\s*\(.*?\)\s*-\s*(REGULER|PRIVATE)\s*\d+/i, '').trim();

// Urutan level dari ATAS ke BAWAH tampilan (BUKAN alfabetis, BUKAN urutan di Pengaturan,
// karena urutan penambahan di Pengaturan bisa aja kebalik-balik / nggak berurutan)
// BASIC ditaruh PALING BAWAH (kayak pondasi), makin ke atas makin tinggi levelnya.
const LEVEL_DIFFICULTY_ORDER = ['ADVANCED', 'INTERMEDIATE', 'BASIC'];
const getLevelRank = (level: string) => {
  const idx = LEVEL_DIFFICULTY_ORDER.indexOf((level || '').toUpperCase());
  return idx === -1 ? 999 : idx; // level custom yang nggak dikenal, taruh di paling belakang
};

// ID unik per grup Subject+Level, dipakai buat auto-scroll setelah upload berhasil
const groupDomId = (subject: string, level: string) =>
  `materi-group-${subject}-${level}`.replace(/[^a-zA-Z0-9-]/g, '_');

// Format file yang diizinkan buat materi (PDF, Word, Excel, PowerPoint, Gambar)
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png'];
const isAllowedFile = (file: File) => ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));

// Ambil ekstensi dari URL file, buat ditampilkan sebagai badge (PDF/DOCX/XLSX/dst)
const getFileExt = (url: string) => {
  const clean = (url || '').split('?')[0];
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toUpperCase() : 'FILE';
};

// Label teks singkat + warna berbeda per tipe file, niru gaya ikon asli
// Microsoft (W biru buat Word, X hijau buat Excel, dst)
const getFileIconMeta = (extUpper: string) => {
  switch (extUpper) {
    case 'PDF': return { label: 'PDF', box: 'bg-red-50', text: 'text-red-600' };
    case 'DOC': case 'DOCX': return { label: 'W', box: 'bg-blue-50', text: 'text-blue-600' };
    case 'XLS': case 'XLSX': return { label: 'X', box: 'bg-emerald-50', text: 'text-emerald-600' };
    case 'PPT': case 'PPTX': return { label: 'PPT', box: 'bg-orange-50', text: 'text-orange-600' };
    case 'JPG': case 'JPEG': case 'PNG': return { label: 'IMG', box: 'bg-purple-50', text: 'text-purple-600' };
    default: return { label: 'FILE', box: 'bg-slate-100', text: 'text-slate-500' };
  }
};

// Deteksi apakah url yang disimpan itu link Google Drive (bukan file yang diupload ke storage)
const isGDriveLink = (url: string) => /drive\.google\.com|docs\.google\.com/i.test(url || '');

// Badge + warna khusus buat item yang sumbernya link G-Drive
const getMaterialMeta = (url: string) => {
  if (isGDriveLink(url)) return { label: 'DRIVE', box: 'bg-amber-50', text: 'text-amber-600' };
  return getFileIconMeta(getFileExt(url));
};

// Buat file yang diupload ke Supabase Storage: nempelin query param ?download
// biar server Supabase ngirim header Content-Disposition: attachment.
// PENTING: atribut HTML `download` doang nggak cukup karena file_url beda domain
// (cross-origin) dari web-nya, browser bakal abaikan attribute itu dan malah
// preview PDF/gambar di tab baru. Query param ini yang beneran maksa download.
const getDownloadHref = (url: string) => {
  if (!url || isGDriveLink(url)) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}download`;
};

const MateriPage: React.FC<MateriPageProps> = ({ user, subjects, levels, studentPayments, attendanceLogs }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Material | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [form, setForm] = useState({
    subject: subjects[0] || '',
    level: levels[0] || '',
    title: '',
    file: null as File | null,
    linkUrl: '',
    uploadMode: 'file' as 'file' | 'link',
  });

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

  // 🎯 Pasangan Subject+Level yang "seharusnya" bisa diakses guru ini,
  // diambil dari histori presensi (bukan dari materials) — dipakai juga
  // buat ngedeteksi kelas yang UDAH diajar tapi materinya BELUM diupload.
  const teacherAccessPairs = useMemo(() => {
    if (user.role !== 'TEACHER') return [];
    // Sama seperti logic di TeacherHonor.tsx: guru dianggap "pegang" kelas itu kalau dia
    // yang beneran ngajar (teacherId) ATAU itu kelas miliknya sendiri yang lagi digantiin
    // guru lain (originalTeacherId) — dan cuma log sesi yang valid (SESSION_LOG/SUB_LOG).
    return (attendanceLogs || [])
      .filter(l =>
        (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG') &&
        (l.teacherId === user.id || l.originalTeacherId === user.id)
      )
      .map(l => {
        const match = (l.className || '').match(/(.*)\s\((.*)\)\s-\s.*/);
        const subject = (match ? match[1] : '').trim().toUpperCase();
        const level = (l.level || (match ? match[2] : '')).trim().toUpperCase();
        return { subject, level };
      })
      .filter(p => p.subject && p.level);
  }, [user, attendanceLogs]);

  // 🎯 Pasangan Subject+Level yang siswa ini udah bayar & VERIFIED,
  // dipakai juga buat ngedeteksi kelas yang udah dibayar tapi materinya belum ada.
  const studentAccessPairs = useMemo(() => {
    if (user.role !== 'STUDENT') return [];
    const normalizedName = (user.name || '').toUpperCase().trim();
    return (studentPayments || [])
      .filter(p => (p.studentName || '').toUpperCase().trim() === normalizedName && p.status === 'VERIFIED')
      .map(p => {
        const name = stripLabel(p.className);
        const match = p.className.match(/\((.*?)\)/);
        return { subject: name, level: (match ? match[1] : '').toUpperCase() };
      });
  }, [user, studentPayments]);

  // 🎯 Filter akses berdasarkan role
  const visibleMaterials = useMemo(() => {
    if (user.role === 'ADMIN') return materials;

    if (user.role === 'TEACHER') {
      return materials.filter(m =>
        teacherAccessPairs.some(a => a.subject === m.subject && a.level === m.level)
      );
    }

    if (user.role === 'STUDENT') {
      return materials.filter(m =>
        studentAccessPairs.some(a => a.subject === m.subject && a.level === m.level)
      );
    }

    return [];
  }, [materials, user, teacherAccessPairs, studentAccessPairs]);

  // 🚨 Deteksi kelas yang "seharusnya" ada materinya tapi kosong:
  // - Guru: kelas yang pernah/masih dia ajar tapi belum ada materi
  // - Siswa: kelas yang udah dia bayar (VERIFIED) tapi belum ada materi
  // - Admin: gabungan SEMUA guru & SEMUA siswa, biar admin tau apa aja yang perlu ditagih
  const missingGroups = useMemo(() => {
    let expectedPairs: { subject: string; level: string }[] = [];

    if (user.role === 'TEACHER') {
      expectedPairs = teacherAccessPairs;
    } else if (user.role === 'STUDENT') {
      expectedPairs = studentAccessPairs;
    } else if (user.role === 'ADMIN') {
      const fromAttendance = (attendanceLogs || [])
        .filter(l => l.status === 'SESSION_LOG' || l.status === 'SUB_LOG')
        .map(l => {
          const match = (l.className || '').match(/(.*)\s\((.*)\)\s-\s.*/);
          const subject = (match ? match[1] : '').trim().toUpperCase();
          const level = (l.level || (match ? match[2] : '')).trim().toUpperCase();
          return { subject, level };
        })
        .filter(p => p.subject && p.level);

      const fromPayments = (studentPayments || [])
        .filter(p => p.status === 'VERIFIED')
        .map(p => {
          const name = stripLabel(p.className);
          const match = p.className.match(/\((.*?)\)/);
          return { subject: name.toUpperCase(), level: (match ? match[1] : '').toUpperCase() };
        })
        .filter(p => p.subject && p.level);

      expectedPairs = [...fromAttendance, ...fromPayments];
    }

    const uniquePairs = new Map<string, { subject: string; level: string }>();
    expectedPairs.forEach(p => uniquePairs.set(`${p.subject}|||${p.level}`, p));

    // Buat admin, cek terhadap SEMUA materials (toh admin emang liat semua).
    // Buat guru/siswa, cek terhadap materi yang keliatan buat dia.
    const materialsPool = user.role === 'ADMIN' ? materials : visibleMaterials;
    const existingKeys = new Set(materialsPool.map(m => `${m.subject}|||${m.level}`));

    return Array.from(uniquePairs.values()).filter(p => !existingKeys.has(`${p.subject}|||${p.level}`));
  }, [user, attendanceLogs, studentPayments, materials, visibleMaterials, teacherAccessPairs, studentAccessPairs]);

  // Kelompokkan flat per kombinasi Subject + Level (misal "MICROSOFT WORD - BASIC")
  // Termasuk grup yang materinya masih kosong (dari missingGroups), biar
  // "lubang" materi yang belum diisi tetap keliatan garisnya.
  const grouped = useMemo(() => {
    const map = new Map<string, { subject: string; level: string; items: Material[]; isOrphaned: boolean }>();
    visibleMaterials.forEach(m => {
      const key = `${m.subject}|||${m.level}`;
      if (!map.has(key)) map.set(key, { subject: m.subject, level: m.level, items: [], isOrphaned: !subjects.includes(m.subject) });
      map.get(key)!.items.push(m);
    });
    missingGroups.forEach(p => {
      const key = `${p.subject}|||${p.level}`;
      if (!map.has(key)) map.set(key, { subject: p.subject, level: p.level, items: [], isOrphaned: !subjects.includes(p.subject) });
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.subject !== b.subject) {
        // Subject yang udah dihapus dari Pengaturan (indexOf = -1) ditaruh PALING BAWAH,
        // bukan malah loncat ke atas (indexOf -1 secara default lebih kecil dari index manapun)
        const rankA = a.isOrphaned ? 9999 : subjects.indexOf(a.subject);
        const rankB = b.isOrphaned ? 9999 : subjects.indexOf(b.subject);
        return rankA - rankB;
      }
      // Urutkan level dari atas ke bawah (ADVANCED -> INTERMEDIATE -> BASIC)
      return getLevelRank(a.level) - getLevelRank(b.level);
    });
  }, [visibleMaterials, missingGroups, subjects, levels]);

  const resetForm = () => {
    setForm({ subject: subjects[0] || '', level: levels[0] || '', title: '', file: null, linkUrl: '', uploadMode: 'file' });
    setShowUploadForm(false);
  };

  const handleUpload = async () => {
    if (!form.subject || !form.level || !form.title) {
      return alert('Lengkapi mata pelajaran, level, dan judul materi dulu ya! ✨');
    }

    const trimmedLink = form.linkUrl.trim();

    // Cuma wajibin field yang sesuai sama mode yang lagi dipilih.
    // Nggak boleh dua-duanya kosong, tapi salah satu (sesuai mode) udah cukup.
    if (form.uploadMode === 'file' && !form.file) {
      return alert('Pilih file materinya dulu ya, atau ganti ke mode Link G-Drive! ✨');
    }
    if (form.uploadMode === 'link' && !trimmedLink) {
      return alert('Isi link Google Drive-nya dulu ya, atau ganti ke mode Upload File! ✨');
    }
    if (form.uploadMode === 'file' && form.file && !isAllowedFile(form.file)) {
      return alert('File harus format PDF, Word, Excel, PowerPoint, atau Gambar (JPG/PNG) ya!');
    }
    if (form.uploadMode === 'link' && !isGDriveLink(trimmedLink)) {
      return alert('Link-nya harus link Google Drive ya (drive.google.com / docs.google.com)!');
    }

    setUploading(true);
    try {
      const id = `MAT-${Date.now()}`;
      const targetSubject = form.subject.toUpperCase();
      const targetLevel = form.level.toUpperCase();

      let finalUrl = '';
      let fileSize: number | undefined = undefined;

      if (form.uploadMode === 'file' && form.file) {
        const filePath = `${form.subject}/${form.level}/${id}_${form.file.name}`.replace(/\s+/g, '_');
        const { error: uploadError } = await supabase.storage.from('materials').upload(filePath, form.file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('materials').getPublicUrl(filePath);
        finalUrl = publicUrlData.publicUrl;
        fileSize = form.file.size;
      } else {
        finalUrl = trimmedLink;
      }

      const { error: insertError } = await supabase.from('materials').insert([{
        id,
        subject: targetSubject,
        level: targetLevel,
        title: form.title,
        file_url: finalUrl,
        file_size: fileSize,
      }]);
      if (insertError) throw insertError;

      await fetchMaterials();
      resetForm();

      // Auto-scroll ke kotak Subject+Level tujuan, biar keliatan langsung hasilnya
      setTimeout(() => {
        document.getElementById(groupDomId(targetSubject, targetLevel))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } catch (e: any) {
      alert('Gagal upload: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const moveItem = async (items: Material[], index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setReordering(true);
    try {
      // Tulis ulang sort_order semua item di grup ini secara berurutan (0,1,2,...)
      // biar konsisten walau sort_order lama-nya berantakan/sama semua
      await Promise.all(reordered.map((m, i) => supabase.from('materials').update({ sort_order: i }).eq('id', m.id)));
      await fetchMaterials();
    } catch (e: any) {
      alert('Gagal mengatur urutan: ' + e.message);
    } finally {
      setReordering(false);
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
  const isStudent = user.role === 'STUDENT';
  const isTeacher = user.role === 'TEACHER';

  // 🎨 Tema warna per role: Admin biru, Guru oranye, Siswa hijau
  const theme = user.role === 'TEACHER'
    ? { blur: 'bg-orange-600', badge: 'bg-orange-500', label: 'text-orange-400', title: 'text-orange-500', tag: 'text-orange-600', iconBg: 'bg-orange-50 text-orange-600', btn: 'bg-orange-600 hover:bg-orange-700' }
    : user.role === 'STUDENT'
    ? { blur: 'bg-emerald-600', badge: 'bg-emerald-500', label: 'text-emerald-400', title: 'text-emerald-500', tag: 'text-emerald-600', iconBg: 'bg-emerald-50 text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' }
    : { blur: 'bg-blue-600', badge: 'bg-blue-500', label: 'text-blue-400', title: 'text-blue-500', tag: 'text-blue-600', iconBg: 'bg-blue-50 text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-40 px-4 animate-in fade-in duration-500">
      {/* HEADER */}
      {isStudent ? (
        // Varian khusus siswa: solid hijau terang, niru gaya header "Kelas Saya"
        // (StudentPortal.tsx), biar transisi antar menu nggak kerasa "kaget"
        // dari terang ke gelap.
        <header className="relative py-12 px-10 md:px-14 bg-emerald-600 rounded-[4rem] text-white shadow-2xl overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
              <Library size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Perpustakaan Digital</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Materi <span className="text-yellow-300">Belajar</span></h2>
            <p className="text-emerald-50 font-bold text-[10px] uppercase tracking-widest italic">Modul & contoh soal sesuai kelasmu</p>
          </div>
        </header>
      ) : isTeacher ? (
        // Varian khusus guru: polos tanpa background sama sekali, niru gaya
        // header "Portal Rapot" (TeacherReports.tsx) biar konsisten sama
        // halaman guru yang lain yang juga nggak pakai kotak background.
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 rounded-lg"><Library size={14} className="text-orange-600" /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500 italic">Perpustakaan Digital</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">
            Materi <span className="text-orange-600">Belajar</span>
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-4">
            Materi & soal sesuai kelasmu ✨
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 p-10 md:p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
          <div className={`absolute top-0 right-0 w-80 h-80 ${theme.blur} rounded-full blur-[120px] opacity-20`}></div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 ${theme.badge} rounded-lg shadow-lg shadow-black/10`}><Library size={14} className="text-white" /></div>
              <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme.label} italic`}>Perpustakaan Digital</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Materi <span className={theme.title}>Belajar</span></h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              {isAdmin ? 'Kelola semua modul & contoh soal' : 'Modul & contoh soal sesuai kelasmu'}
            </p>
          </div>
          {isAdmin && (
            <div className="relative z-10 flex items-center gap-3">
              <button
                onClick={() => setReorderMode(v => !v)}
                className={`flex items-center gap-2 px-6 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all ${reorderMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                <ArrowUpDown size={16} /> {reorderMode ? 'Selesai Atur Urutan' : 'Atur Urutan'}
              </button>
              <button
                onClick={() => setShowUploadForm(true)}
                className={`flex items-center gap-3 ${theme.btn} px-8 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all`}
              >
                <Plus size={18} /> Upload Materi
              </button>
            </div>
          )}
        </div>
      )}

      {/* LIST MATERI */}
      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 size={32} className={`animate-spin ${theme.tag}`} /></div>
      ) : grouped.length === 0 ? (
        <div className="bg-white p-14 rounded-[4rem] border border-slate-100 shadow-xl flex flex-col items-center text-center gap-4 opacity-60">
          <FolderOpen size={56} className="text-slate-300" />
          <p className="font-black text-[12px] uppercase tracking-[0.4em] text-slate-400">Belum Ada Materi</p>
          <p className="text-[10px] font-bold uppercase text-slate-400">
            {isAdmin ? 'Klik "Upload Materi" untuk mulai menambahkan.' : 'Materi untuk kelasmu belum tersedia.'}
          </p>
        </div>
      ) : (
        grouped.map(({ subject, level, items, isOrphaned }) => (
          <div key={`${subject}|||${level}`} id={groupDomId(subject, level)} className="bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 shadow-xl space-y-6 scroll-mt-8">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-black text-slate-800 uppercase italic text-2xl">{subject}</h3>
              <span className={`font-black uppercase italic text-2xl ${theme.tag}`}>- {level}</span>
              {isOrphaned && isAdmin && (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                  ⚠️ Matkul ini sudah dihapus dari Pengaturan
                </span>
              )}
            </div>
            {items.length === 0 ? (
              // 🚨 Kelas ini udah ada histori mengajar/pembayaran, tapi materinya belum diupload.
              // Tampilan "pressure" biar kelihatan jelas ini lubang yang perlu dilengkapi,
              // bukan cuma sekadar kosong tanpa keterangan.
              <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-[2rem] p-8 flex flex-col items-center text-center gap-3">
                <AlertCircle size={32} className="text-amber-500" />
                <p className="font-black text-amber-700 text-xs uppercase tracking-widest italic">
                  {isAdmin ? 'Materi Belum Diupload' : isTeacher ? 'Kamu Belum Upload Materi' : 'Materi Belum Tersedia'}
                </p>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide max-w-md leading-relaxed">
                  {isAdmin
                    ? 'Ada histori mengajar/pembayaran untuk kelas ini, tapi materinya belum diupload. Yuk tagih ke gurunya!'
                    : isTeacher
                    ? 'Serahkan materimu ke admin ya, biar siswa bisa segera belajar! ✨'
                    : 'Materi untuk kelas ini belum diupload gurumu. Coba minta gurumu untuk melengkapi ya! 🙏'}
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((m, idx) => (
                <div key={m.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {reorderMode && isAdmin && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => moveItem(items, idx, 'up')} disabled={idx === 0 || reordering} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-amber-600 hover:border-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Naik">
                          <ArrowUp size={12} />
                        </button>
                        <button onClick={() => moveItem(items, idx, 'down')} disabled={idx === items.length - 1 || reordering} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-amber-600 hover:border-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Turun">
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    )}
                    {(() => {
                      const { label, box, text } = getMaterialMeta(m.file_url);
                      return (
                        <div className={`w-12 h-12 ${box} rounded-2xl flex items-center justify-center shrink-0`}>
                          <span className={`font-black italic ${text} text-[10px]`}>{label}</span>
                        </div>
                      );
                    })()}
                    <p className="font-black text-slate-700 text-xs italic leading-snug">{m.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isGDriveLink(m.file_url) ? (
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={`p-3 ${theme.btn} text-white rounded-xl transition-all shadow-md`} title="Buka di Google Drive">
                        <ExternalLink size={16} />
                      </a>
                    ) : (
                      <a href={getDownloadHref(m.file_url)} target="_blank" rel="noopener noreferrer" className={`p-3 ${theme.btn} text-white rounded-xl transition-all shadow-md`} title="Download">
                        <Download size={16} />
                      </a>
                    )}
                    {isAdmin && !reorderMode && (
                      <button onClick={() => setConfirmDelete(m)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        ))
      )}

      {/* MODAL UPLOAD (ADMIN ONLY) */}
      {showUploadForm && (
        <ModalPortal>
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative">
            <button onClick={resetForm} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500"><X size={20} /></button>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h4 className="text-lg font-black text-slate-800 uppercase italic">Upload Materi Baru</h4>
              <span className="text-[9px] font-bold text-slate-400 uppercase">— PDF, Word, Excel, PPT, Gambar, atau Link G-Drive</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Mata Pelajaran</label>
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl font-black text-xs uppercase outline-none border-2 border-slate-100">
                  {subjects.map(s => <option key={s} value={s} className="uppercase">{s}</option>)}
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
                <div className="flex items-center justify-between ml-2 mb-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">File / Link Materi</label>
                </div>
                <div className="flex gap-1 mb-1.5 bg-slate-100 p-1 rounded-lg w-fit">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, uploadMode: 'file' })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase transition-all ${form.uploadMode === 'file' ? 'bg-white text-blue-600 shadow' : 'text-slate-400'}`}
                  >
                    <Upload size={10} /> File
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, uploadMode: 'link' })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase transition-all ${form.uploadMode === 'link' ? 'bg-white text-blue-600 shadow' : 'text-slate-400'}`}
                  >
                    <LinkIcon size={10} /> Link G-Drive
                  </button>
                </div>
                {form.uploadMode === 'file' ? (
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                    onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border-2 border-slate-100 text-[10px] font-bold text-slate-500 cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-[9px] file:font-black file:uppercase file:cursor-pointer hover:file:bg-blue-700 file:transition-all"
                  />
                ) : (
                  <input
                    type="text"
                    value={form.linkUrl}
                    onChange={e => setForm({ ...form, linkUrl: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold text-xs outline-none border-2 border-slate-100"
                  />
                )}
              </div>
            </div>

            <button onClick={handleUpload} disabled={uploading} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <><Upload size={16} /> Upload Sekarang</>}
            </button>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {confirmDelete && (
        <ModalPortal>
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
        </ModalPortal>
      )}
    </div>
  );
};

export default MateriPage;
