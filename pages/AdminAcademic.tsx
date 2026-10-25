import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen,
  Settings,
  Plus,
  Trash2,
  Home,
  Save,
  Cloud,
  Edit3,
  Layers,
  Info,
  Banknote,
  Loader2,
  AlertTriangle,
  Download,
  X,
  Search
} from 'lucide-react';
import { supabase, waitForActiveSession } from '../services/supabase.ts';
import ModalPortal from '../ModalPortal.tsx';
import { User } from '../types';

// ============================================================================
// 🗓️ JADWAL KELAS
// Pengurus mengisi formulir, sistem menyusunnya jadi daftar per hari, lalu bisa
// diekspor ke Excel yang rapi. Disimpan di tabel `settings` (key: class_schedule)
// sebagai satu daftar.
// Pengajar & peserta disimpan sebagai ID, jadi kalau nama/gelar diubah di Admin
// Staff, jadwal ikut berubah otomatis (nama yang tersimpan hanya cadangan kalau
// akunnya sudah tidak ada).
// ============================================================================

export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;
export type Day = typeof DAYS[number];

export type SchedulePerson = { id: string; name: string };
export type ScheduleItem = {
  id: string;
  day: Day;
  start: string; // 'HH:MM'
  end: string;   // 'HH:MM'
  subject: string;
  teacherId: string;
  teacherName: string; // cadangan
  room: string;
  participants: SchedulePerson[];
  note: string;
};

const SETTINGS_KEY = 'class_schedule';

// ---------- helper murni (di luar komponen supaya gampang diuji) ----------

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const formatDateID = (d: Date) => `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;

export const stripPelatihan = (s: string) => String(s || '').replace(/^PELATIHAN\s+/i, '');

// '15:00','17:00' -> '15.00 - 17.00' (gaya yang sama dengan Excel jadwal)
export const fmtRange = (start: string, end: string) => `${start.replace(':', '.')} - ${end.replace(':', '.')}`;

export const sortSchedule = (items: ScheduleItem[]) =>
  [...items].sort((a, b) =>
    DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
    a.start.localeCompare(b.start) ||
    a.room.localeCompare(b.room) ||
    a.subject.localeCompare(b.subject)
  );

export type ExportRow = {
  day: Day;
  time: string;
  subject: string;
  teacher: string;
  participants: string[];
  room: string;
  note: string;
};

export const toExportRows = (
  items: ScheduleItem[],
  teacherName: (it: ScheduleItem) => string,
  personName: (p: SchedulePerson) => string
): ExportRow[] =>
  sortSchedule(items).map(it => ({
    day: it.day,
    time: fmtRange(it.start, it.end),
    subject: stripPelatihan(it.subject),
    teacher: teacherName(it),
    participants: it.participants.map(personName),
    room: it.room,
    note: it.note || '',
  }));

// ---------- Excel (exceljs dimuat hanya saat tombol Ekspor ditekan) ----------

const COL = { day: 1, time: 2, subject: 3, teacher: 4, participants: 5, room: 6, note: 7 }; // kolom A..G
type ColKey = keyof typeof COL;

// Lebar kolom menyesuaikan isi (nama panjang otomatis melebar), dengan batas bawah/atas supaya
// seluruh tabel tetap muat di satu halaman A4 landscape.
const COL_LIMITS: Record<ColKey, { min: number; max: number }> = {
  day: { min: 9, max: 12 },
  time: { min: 13, max: 16 },
  subject: { min: 16, max: 32 },
  teacher: { min: 22, max: 44 },
  participants: { min: 24, max: 52 },
  room: { min: 12, max: 20 },
  note: { min: 14, max: 30 },
};

const FONT = { name: 'Arial', size: 9 };
const FONT_FACTOR = 0.9; // Arial 9 pt lebih sempit daripada satuan lebar kolom Excel (acuan huruf 11 pt)
const BLACK = { argb: 'FF000000' };
const thin = { style: 'thin', color: BLACK };
const medium = { style: 'medium', color: BLACK };
const ALL_THIN = { top: thin, left: thin, bottom: thin, right: thin };

// Perkiraan lebar teks dalam "satuan lebar kolom Excel". Huruf kapital dihitung lebih lebar daripada
// huruf kecil, dan angkanya sengaja sedikit lega supaya teks tidak pernah terpotong.
export const textUnits = (t: string) => {
  let u = 0;
  for (const ch of String(t || '')) u += /[A-Z0-9]/.test(ch) ? 1.12 : /[a-z]/.test(ch) ? 0.92 : ch === ' ' ? 0.55 : 0.65;
  return u * FONT_FACTOR;
};

const HEADERS: Record<ColKey, string> = {
  day: 'HARI', time: 'WAKTU', subject: 'JENIS PELATIHAN', teacher: 'PENGAJAR', participants: 'PESERTA', room: 'KELAS', note: 'CATATAN',
};

const participantText = (row: ExportRow, k: number) =>
  row.participants.length > 1 ? `${k + 1}. ${row.participants[k]}` : (row.participants[k] || '');

export const computeColumnWidths = (rows: ExportRow[]): Record<ColKey, number> => {
  const need = {} as Record<ColKey, number>;
  (Object.keys(COL) as ColKey[]).forEach(k => { need[k] = textUnits(HEADERS[k]) * 1.1; }); // header tebal
  rows.forEach(r => {
    need.day = Math.max(need.day, textUnits(r.day.toUpperCase()) * 1.1);
    need.time = Math.max(need.time, textUnits(r.time));
    need.subject = Math.max(need.subject, textUnits(r.subject));
    need.teacher = Math.max(need.teacher, textUnits(r.teacher));
    need.room = Math.max(need.room, textUnits(r.room));
    need.note = Math.max(need.note, textUnits(r.note) + 1);
    r.participants.forEach((_, k) => { need.participants = Math.max(need.participants, textUnits(participantText(r, k)) + 1); });
  });
  const w = {} as Record<ColKey, number>;
  (Object.keys(COL) as ColKey[]).forEach(k => {
    w[k] = Math.min(COL_LIMITS[k].max, Math.max(COL_LIMITS[k].min, Math.ceil(need[k] + 3)));
  });
  return w;
};

// jumlah baris teks yang terbungkus di kolom selebar `width` (hanya terjadi kalau melewati batas maksimal)
const linesFor = (text: string, width: number) => Math.max(1, Math.ceil(textUnits(text) / Math.max(1, width - 2)));

export const buildScheduleWorkbook = (ExcelJS: any, rows: ExportRow[], dateText: string) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sanur Akademi';
  wb.created = new Date();

  const ws = wb.addWorksheet('Jadwal', { views: [{ showGridLines: false }] });

  const widths = computeColumnWidths(rows);
  (Object.keys(COL) as ColKey[]).forEach(k => { ws.getColumn(COL[k]).width = widths[k]; });

  // Cetak/PDF: A4 landscape, "muat satu lebar halaman". Sebagai cadangan untuk aplikasi yang mengabaikan
  // pengaturan itu, skala juga dipatok dari lebar tabel (1 satuan lebar kolom ~ 7 px, 96 px per inci).
  const totalWidthIn = (Object.values(widths).reduce((a, b) => a + b, 0) * 7 + 5 * Object.keys(COL).length) / 96;
  const printableIn = 11.69 - 0.6; // lebar A4 landscape dikurangi margin kiri-kanan
  const fallbackScale = Math.max(40, Math.min(100, Math.floor((printableIn / totalWidthIn) * 94))); // faktor 94% = pengaman, karena tiap aplikasi mengukur lebar kolom sedikit berbeda
  ws.pageSetup = {
    orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, scale: fallbackScale,
    horizontalCentered: true, printTitlesRow: '4:4',
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };

  // Judul
  ws.mergeCells(2, COL.day, 2, COL.note);
  const title = ws.getCell(2, COL.day);
  title.value = 'JADWAL PELATIHAN DI YAYASAN SANUR AKADEMI INSPIRASI';
  title.font = { ...FONT, size: 12, bold: true };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 24;

  // Header tabel
  const HEADER_ROW = 4;
  (Object.keys(COL) as ColKey[]).forEach(k => {
    const c = ws.getCell(HEADER_ROW, COL[k]);
    c.value = HEADERS[k];
    c.font = { ...FONT, bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = { top: medium, left: thin, bottom: medium, right: thin };
  });
  ws.getRow(HEADER_ROW).height = 22;

  const centered = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const LINE = 12;
  const PAD = 5;
  const MIN_H = 17;

  let r = HEADER_ROW + 1;
  const dayStarts: number[] = [];

  DAYS.filter(d => rows.some(x => x.day === d)).forEach(day => {
    const dayStart = r;
    dayStarts.push(dayStart);

    rows.filter(x => x.day === day).forEach(row => {
      const n = Math.max(1, row.participants.length);
      const first = r;
      const last = r + n - 1;
      const partTexts = Array.from({ length: n }, (_, k) => participantText(row, k));

      // Tinggi baris: cukup untuk teks yang terbungkus, dibagi rata kalau sel gabungan lebih tinggi
      const heights = partTexts.map(t => Math.max(MIN_H, LINE * linesFor(t, widths.participants) + PAD));
      const need = LINE * Math.max(
        linesFor(row.subject, widths.subject), linesFor(row.teacher, widths.teacher),
        linesFor(row.room, widths.room), linesFor(row.note, widths.note), linesFor(row.time, widths.time)
      ) + PAD;
      const sum = heights.reduce((a, b) => a + b, 0);
      const extra = sum < need ? (need - sum) / n : 0;
      heights.forEach((h, k) => { ws.getRow(first + k).height = h + extra; });

      // Peserta: satu baris per orang
      partTexts.forEach((t, k) => {
        const c = ws.getCell(first + k, COL.participants);
        c.value = t;
        c.font = FONT;
        c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
        c.border = ALL_THIN;
      });

      // Kolom lain: satu sel, digabung sepanjang daftar peserta. Gaya diset SEBELUM digabung.
      const merged: [number, string][] = [
        [COL.time, row.time], [COL.subject, row.subject], [COL.teacher, row.teacher],
        [COL.room, row.room], [COL.note, row.note],
      ];
      merged.forEach(([col, val]) => {
        const c = ws.getCell(first, col);
        c.value = val;
        c.font = FONT;
        c.alignment = col === COL.note ? { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 } : centered;
        c.border = ALL_THIN;
        if (n > 1) ws.mergeCells(first, col, last, col);
      });

      r = last + 1;
    });

    // Kolom HARI digabung sepanjang blok hari itu
    const dc = ws.getCell(dayStart, COL.day);
    dc.value = day.toUpperCase();
    dc.font = { ...FONT, bold: true };
    dc.alignment = centered;
    dc.border = ALL_THIN;
    if (r - 1 > dayStart) ws.mergeCells(dayStart, COL.day, r - 1, COL.day);
  });

  const lastRow = r - 1;

  // Garis tebal pemisah antar hari & penutup tabel
  dayStarts.forEach(rowNo => {
    for (let col = COL.day; col <= COL.note; col++) {
      const c = ws.getCell(rowNo, col);
      c.border = { ...(c.border || ALL_THIN), top: medium };
    }
  });
  if (lastRow >= HEADER_ROW + 1) {
    for (let col = COL.day; col <= COL.note; col++) {
      const c = ws.getCell(lastRow, col);
      c.border = { ...(c.border || ALL_THIN), bottom: medium };
    }
  }

  // Tanda tangan
  const signRow = lastRow + 2;
  ws.mergeCells(signRow, COL.participants, signRow, COL.note);
  const place = ws.getCell(signRow, COL.participants);
  place.value = `Depok, ${dateText}`;
  place.font = FONT;
  place.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells(signRow + 1, COL.participants, signRow + 1, COL.note);
  const who = ws.getCell(signRow + 1, COL.participants);
  who.value = 'Pengurus Yayasan Sanur Akademi Inspirasi';
  who.font = FONT;
  who.alignment = { horizontal: 'center', vertical: 'middle' };

  // Area cetak dipatok jelas (judul sampai tanda tangan) supaya tidak ada yang terpotong atau meluber
  ws.pageSetup.printArea = `A1:G${signRow + 1}`;

  return wb;
};

export const downloadScheduleExcel = async (rows: ExportRow[]) => {
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const now = new Date();
  const wb = buildScheduleWorkbook(ExcelJS, rows, formatDateID(now));
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const pad = (n: number) => String(n).padStart(2, '0');
  const a = document.createElement('a');
  a.href = url;
  a.download = `Jadwal_Pelatihan_Sanur_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ---------- komponen ----------

interface ScheduleTabProps {
  subjects: string[];
  classes: string[];
  teachers: User[];
  studentAccounts: any[];
}

type FormState = {
  day: Day;
  start: string;
  end: string;
  subject: string;
  teacherId: string;
  room: string;
  participants: SchedulePerson[];
  note: string;
};

const emptyForm: FormState = { day: 'Senin', start: '', end: '', subject: '', teacherId: '', room: '', participants: [], note: '' };

const fieldLabel = 'text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block';
const fieldBox = 'w-full px-5 py-3.5 bg-slate-50 rounded-2xl font-bold text-sm text-slate-800 outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all';

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ subjects, classes, teachers, studentAccounts }) => {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState<FormState | null>(null); // null = formulir tertutup
  const [formMode, setFormMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ScheduleItem | null>(null);

  // Muat jadwal tersimpan
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await waitForActiveSession();
        const { data, error } = await supabase.from('settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
        if (error) throw error;
        const v = (data as any)?.value;
        if (!cancelled) setItems(Array.isArray(v) ? v : []);
      } catch (e) {
        console.error('Gagal memuat jadwal:', e);
        if (!cancelled) setLoadError('Jadwal belum bisa dimuat. Coba muat ulang halaman ya.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Kunci scroll halaman selama jendela terbuka
  useEffect(() => {
    document.body.style.overflow = (form || confirmDelete) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [form, confirmDelete]);

  const teacherList = useMemo(
    () => teachers.filter(t => t.role === 'TEACHER').sort((a, b) => a.name.localeCompare(b.name)),
    [teachers]
  );
  const teacherById = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);
  const studentById = useMemo(() => new Map<string, any>((studentAccounts || []).map((s: any) => [String(s.id), s])), [studentAccounts]);

  const teacherName = (it: ScheduleItem) => teacherById.get(it.teacherId)?.name || it.teacherName || '-';
  const personName = (p: SchedulePerson) => studentById.get(p.id)?.name || p.name;

  const grouped = useMemo(() => {
    const sorted = sortSchedule(items);
    return DAYS.map(day => ({ day, list: sorted.filter(i => i.day === day) })).filter(g => g.list.length > 0);
  }, [items]);

  const persist = async (next: ScheduleItem[]) => {
    setSaving(true);
    try {
      await waitForActiveSession();
      const { error } = await supabase.from('settings').upsert({ key: SETTINGS_KEY, value: next });
      if (error) throw error;
      setItems(next);
      return true;
    } catch (e) {
      console.error('Gagal menyimpan jadwal:', e);
      alert('Gagal menyimpan jadwal ke Cloud. Coba lagi ya.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const formFromItem = (it: ScheduleItem): FormState => ({
    day: it.day, start: it.start, end: it.end, subject: it.subject, teacherId: it.teacherId, room: it.room,
    participants: it.participants.map(p => ({ id: p.id, name: personName(p) })), note: it.note || '',
  });

  const openAdd = () => { setFormMode('ADD'); setEditingId(null); setStudentQuery(''); setForm({ ...emptyForm }); };
  const openEdit = (it: ScheduleItem) => { setFormMode('EDIT'); setEditingId(it.id); setStudentQuery(''); setForm(formFromItem(it)); };
  const closeForm = () => { setForm(null); setEditingId(null); setStudentQuery(''); };

  const patch = (p: Partial<FormState>) => setForm(prev => (prev ? { ...prev, ...p } : prev));

  // Scrollbar biru yang menyatu dengan kotak formulir (pola yang sama dengan modal Admin Staff)
  const formScrollRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 100, visible: false });
  const updateThumb = () => {
    const el = formScrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) { setThumb(t => (t.visible ? { top: 0, height: 100, visible: false } : t)); return; }
    const h = Math.max((el.clientHeight / el.scrollHeight) * 100, 8);
    setThumb({ top: (el.scrollTop / scrollable) * (100 - h), height: h, visible: true });
  };
  useEffect(() => {
    if (!form) { setThumb(t => (t.visible ? { top: 0, height: 100, visible: false } : t)); return; }
    const id = window.requestAnimationFrame(updateThumb); // hitung ulang setiap isi formulir berubah (mis. peserta bertambah)
    window.addEventListener('resize', updateThumb);
    return () => { window.cancelAnimationFrame(id); window.removeEventListener('resize', updateThumb); };
  }, [form]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.day || !form.start || !form.end || !form.subject || !form.teacherId || !form.room) {
      return alert('Lengkapi dulu hari, jam mulai, jam selesai, jenis pelatihan, pengajar, dan kelas.');
    }
    if (form.end <= form.start) return alert('Jam selesai harus setelah jam mulai.');

    const item: ScheduleItem = {
      id: editingId || `SCH-${Date.now()}`,
      day: form.day,
      start: form.start,
      end: form.end,
      subject: form.subject,
      teacherId: form.teacherId,
      teacherName: teacherById.get(form.teacherId)?.name || '',
      room: form.room,
      participants: form.participants,
      note: form.note.trim(),
    };
    const next = editingId ? items.map(i => (i.id === editingId ? item : i)) : [...items, item];
    if (await persist(next)) closeForm();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (await persist(items.filter(i => i.id !== confirmDelete.id))) setConfirmDelete(null);
  };

  const handleExport = async () => {
    if (items.length === 0) return alert('Belum ada jadwal untuk diekspor.');
    setExporting(true);
    try {
      await downloadScheduleExcel(toExportRows(items, teacherName, personName));
    } catch (e) {
      console.error('Gagal membuat Excel:', e);
      alert('Gagal membuat file Excel. Coba lagi ya.');
    } finally {
      setExporting(false);
    }
  };

  const suggestions = useMemo(() => {
    if (!form) return [];
    const q = studentQuery.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(form.participants.map(p => p.id));
    return (studentAccounts || [])
      .filter((s: any) => !taken.has(String(s.id)) && String(s.name || '').toLowerCase().includes(q))
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))
      .slice(0, 6);
  }, [form, studentQuery, studentAccounts]);

  // Pilihan yang sudah tersimpan tapi sudah tidak ada di daftar (dihapus) tetap ditampilkan agar tidak hilang diam-diam saat diubah
  const subjectOptions = form && form.subject && !subjects.includes(form.subject) ? [form.subject, ...subjects] : subjects;
  const roomOptions = form && form.room && !classes.includes(form.room) ? [form.room, ...classes] : classes;
  const teacherMissing = !!form && !!form.teacherId && !teacherList.some(t => t.id === form.teacherId);

  const isPrivateRoom = (room: string) => /PRIVATE|PRIVAT|HOME TUTORING/i.test(room);

  return (
    <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden">
      <div className="p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100">
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter leading-none">Jadwal Kelas</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Isi jadwal, lalu ekspor ke Excel untuk dibagikan</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={exporting || items.length === 0}
            className="px-8 py-4 bg-slate-100 text-slate-700 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Ekspor Excel
          </button>
          <button
            onClick={openAdd}
            className="px-8 py-4 bg-blue-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Tambah Jadwal
          </button>
        </div>
      </div>

      <div className="p-6 md:p-12 space-y-10">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-300">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest italic">Memuat jadwal...</p>
          </div>
        ) : loadError ? (
          <p className="text-center text-[11px] font-bold text-rose-600 py-16">{loadError}</p>
        ) : grouped.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Belum ada jadwal</p>
            <p className="text-[11px] font-bold text-slate-300">Tekan "Tambah Jadwal" untuk mulai mengisi.</p>
          </div>
        ) : (
          grouped.map(g => (
            <section key={g.day} className="space-y-4">
              <h4 className="text-lg font-black text-slate-800 uppercase italic tracking-tight px-2">{g.day}</h4>
              <div className="space-y-3">
                {g.list.map(it => (
                  <div key={it.id} className="flex flex-col md:flex-row md:items-start gap-4 bg-slate-50 border border-slate-100 rounded-[2rem] px-6 py-5">
                    <p className="md:w-36 shrink-0 text-sm font-black text-slate-800">{fmtRange(it.start, it.end)}</p>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-black text-slate-800 uppercase italic">{stripPelatihan(it.subject)}</p>
                        <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${isPrivateRoom(it.room) ? 'bg-orange-500' : 'bg-blue-900'}`}>{it.room}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">{teacherName(it)}</p>
                      {it.participants.length > 0 && (
                        <div className={`text-[11px] font-semibold space-y-0.5 ${isPrivateRoom(it.room) ? 'text-orange-600' : 'text-blue-900/70'}`}>
                          {it.participants.map((p, k) => (
                            <p key={p.id + k}>{it.participants.length > 1 ? `${k + 1}. ` : ''}{personName(p)}</p>
                          ))}
                        </div>
                      )}
                      {it.note && (
                        <p className="inline-block mt-1 px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold italic text-slate-500">“{it.note}”</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEdit(it)} title="Ubah jadwal" aria-label="Ubah jadwal" className="w-10 h-10 rounded-full bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all"><Edit3 size={16} /></button>
                      <button onClick={() => setConfirmDelete(it)} title="Hapus jadwal" aria-label="Hapus jadwal" className="w-10 h-10 rounded-full bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* FORMULIR TAMBAH / UBAH / SALIN */}
      {form && (
        <ModalPortal>
          <div data-modal-container tabIndex={-1} className="fixed inset-0 z-[100000] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6" onClick={closeForm}>
            <style>{`
              .sch-seamless-scroll { scrollbar-width: none; -ms-overflow-style: none; }
              .sch-seamless-scroll::-webkit-scrollbar { width: 0; height: 0; display: none; }
              .sch-scroll-track { position: absolute; top: 0; bottom: 0; right: 0; width: 7px; background: transparent; pointer-events: none; z-index: 10; }
              .sch-scroll-thumb { position: absolute; left: 0; right: 0; border-radius: 4px; background: #2563eb; transition: top 0.05s linear; }
            `}</style>
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div ref={formScrollRef} onScroll={updateThumb} className="sch-seamless-scroll max-h-[90vh] overflow-y-auto p-8 md:p-10 relative">
              <button onClick={closeForm} aria-label="Tutup" className="absolute top-8 right-8 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={22} /></button>
              <h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight mb-8 pr-10">
                {formMode === 'EDIT' ? 'Ubah Jadwal' : 'Tambah Jadwal'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="sch-day" className={fieldLabel}>Hari</label>
                  <select id="sch-day" value={form.day} onChange={e => patch({ day: e.target.value as Day })} className={fieldBox}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sch-start" className={fieldLabel}>Jam mulai</label>
                    <input id="sch-start" type="time" value={form.start} onChange={e => patch({ start: e.target.value })} className={fieldBox} />
                  </div>
                  <div>
                    <label htmlFor="sch-end" className={fieldLabel}>Jam selesai</label>
                    <input id="sch-end" type="time" value={form.end} onChange={e => patch({ end: e.target.value })} className={fieldBox} />
                  </div>
                </div>

                <div>
                  <label htmlFor="sch-subject" className={fieldLabel}>Jenis pelatihan</label>
                  <select id="sch-subject" value={form.subject} onChange={e => patch({ subject: e.target.value })} className={fieldBox}>
                    <option value="">Pilih pelatihan</option>
                    {subjectOptions.map(s => <option key={s} value={s}>{stripPelatihan(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="sch-teacher" className={fieldLabel}>Pengajar</label>
                  <select id="sch-teacher" value={form.teacherId} onChange={e => patch({ teacherId: e.target.value })} className={fieldBox}>
                    <option value="">Pilih pengajar</option>
                    {teacherMissing && <option value={form.teacherId}>{teacherById.get(form.teacherId)?.name || 'Pengajar tidak ditemukan'}</option>}
                    {teacherList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="sch-room" className={fieldLabel}>Kelas</label>
                  <select id="sch-room" value={form.room} onChange={e => patch({ room: e.target.value })} className={fieldBox}>
                    <option value="">Pilih kelas</option>
                    {roomOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="sch-student-q" className={fieldLabel}>Peserta (boleh dikosongkan)</label>
                  {form.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {form.participants.map(p => (
                        <span key={p.id} className="inline-flex items-center gap-2 pl-4 pr-2 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                          {personName(p)}
                          <button type="button" aria-label={`Hapus ${personName(p)}`} onClick={() => patch({ participants: form.participants.filter(x => x.id !== p.id) })} className="w-5 h-5 rounded-full hover:bg-blue-100 flex items-center justify-center"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input id="sch-student-q" type="text" autoComplete="off" value={studentQuery} onChange={e => setStudentQuery(e.target.value)} placeholder="Ketik nama siswa lalu pilih" className={`${fieldBox} pl-12`} />
                    {suggestions.length > 0 && (
                      <ul className="absolute z-10 left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                        {suggestions.map((s: any) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => { patch({ participants: [...form.participants, { id: String(s.id), name: String(s.name) }] }); setStudentQuery(''); }}
                              className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 transition-colors"
                            >
                              {s.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="sch-note" className={fieldLabel}>Catatan (boleh dikosongkan)</label>
                  <input id="sch-note" type="text" value={form.note} onChange={e => patch({ note: e.target.value })} placeholder='Misalnya "Ke rumah"' className={fieldBox} />
                </div>
              </div>

              <div className="flex gap-3 pt-8">
                <button onClick={closeForm} className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Batal</button>
                <button onClick={handleSave} disabled={saving} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Jadwal
                </button>
              </div>
              </div>
              {thumb.visible && (
                <div className="sch-scroll-track">
                  <div className="sch-scroll-thumb" style={{ top: `${thumb.top}%`, height: `${thumb.height}%` }} />
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* KONFIRMASI HAPUS */}
      {confirmDelete && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto"><AlertTriangle size={28} /></div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-800 uppercase italic">Hapus jadwal ini?</h4>
                <p className="text-sm font-bold text-slate-500">
                  {confirmDelete.day}, {fmtRange(confirmDelete.start, confirmDelete.end)}<br />
                  {stripPelatihan(confirmDelete.subject)} · {confirmDelete.room}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase">Batal</button>
                <button onClick={handleDelete} disabled={saving} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase disabled:opacity-60">Ya, Hapus</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

interface AdminAcademicProps {
  subjects: string[];
  setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
  classes: string[];
  setClasses: React.Dispatch<React.SetStateAction<string[]>>;
  levels: string[];
  setLevels: React.Dispatch<React.SetStateAction<string[]>>;
  salaryConfig: { regulerRate: number, privateRate: number };
  setSalaryConfig: React.Dispatch<React.SetStateAction<{ regulerRate: number, privateRate: number }>>;
  teachers: User[];
  studentAccounts: any[];
}

const AdminAcademic: React.FC<AdminAcademicProps> = ({ 
  subjects, setSubjects, classes, setClasses, levels, setLevels, salaryConfig, setSalaryConfig, teachers, studentAccounts
}) => {
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'CONFIG' | 'SALARY'>('SCHEDULE');
  const [newSubject, setNewSubject] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
const [draggedType, setDraggedType] = useState<'SUBJECT' | 'CLASS' | 'LEVEL' | null>(null);
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Salary Editing State
  const [tempSalary, setTempSalary] = useState(salaryConfig);

  const [confirmDeleteItem, setConfirmDeleteItem] = useState<{ type: 'SUBJECT' | 'LEVEL' | 'CLASS', value: string } | null>(null);

  const syncConfigToCloud = async (newSubjects: string[], newLevels: string[], newClasses: string[]) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        key: 'academic_config',
        value: { subjects: newSubjects, levels: newLevels, classes: newClasses }
      });
      if (error) throw error;
    } catch (e) {
      alert("Gagal sinkron konfigurasi ke Cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const syncSalaryToCloud = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        key: 'salary_config',
        value: tempSalary
      });
      if (error) throw error;
      setSalaryConfig(tempSalary);
      alert("Tarif Honor Guru Berhasil Diperbarui! ✨");
    } catch (e) {
      alert("Gagal sinkron honor ke Cloud.");
    } finally {
      setIsLoading(false);
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

  const executeConfirmedDelete = () => {
    if (!confirmDeleteItem) return;
    const { type, value } = confirmDeleteItem;
    if (type === 'SUBJECT') handleRemoveSubject(value);
    else if (type === 'LEVEL') handleRemoveLevel(value);
    else if (type === 'CLASS') handleRemoveClass(value);
    setConfirmDeleteItem(null);
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
           <p className="text-slate-500 font-medium text-sm max-w-lg leading-relaxed italic">Kelola jadwal kelas, daftar program, dan tarif gaji guru secara dinamis.</p>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-[2rem] border border-slate-200 shadow-inner flex-wrap justify-center">
           <button onClick={() => setActiveTab('SCHEDULE')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SCHEDULE' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>1. Jadwal Kelas</button>
           <button onClick={() => setActiveTab('CONFIG')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'CONFIG' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'}`}>2. Data Master</button>
           <button onClick={() => setActiveTab('SALARY')} className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SALARY' ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-400'}`}>3. Gaji Guru</button>
        </div>
      </div>

      <div className={`flex items-center gap-3 px-6 py-3 bg-blue-50 rounded-2xl w-fit mx-auto transition-all duration-500 border border-blue-100 shadow-sm ${isLoading ? 'opacity-100' : 'opacity-0'}`}>
         <Cloud size={18} className="text-blue-600 animate-pulse" />
         <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Sinkronisasi Cloud Aktif...</span>
      </div>

      {activeTab === 'SCHEDULE' && (
        <ScheduleTab subjects={subjects} classes={classes} teachers={teachers} studentAccounts={studentAccounts} />
      )}

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
      <button onClick={() => setConfirmDeleteItem({ type: 'SUBJECT', value: s })} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
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
      <button onClick={() => setConfirmDeleteItem({ type: 'LEVEL', value: l })} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
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
      <button onClick={() => setConfirmDeleteItem({ type: 'CLASS', value: c })} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
    </div>
  ))}
</div>
          </section>
        </div>
      )}

      {activeTab === 'SALARY' && (
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl p-10 md:p-14 animate-in slide-in-from-bottom-4 space-y-12">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-50 pb-10">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center shadow-inner"><Banknote size={32} /></div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase italic">Konfigurasi Honor Guru</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Tarif per jam yang otomatis tersinkron ke log presensi.</p>
                 </div>
              </div>
              <button onClick={syncSalaryToCloud} disabled={isLoading} className="px-12 py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all flex items-center gap-3">
                 {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} SIMPAN PERUBAHAN
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

      {/* MODAL KONFIRMASI HAPUS DATA MASTER (MATPEL / LEVEL / RUANG) */}
      {confirmDeleteItem && (
        <ModalPortal>
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl" onClick={() => setConfirmDeleteItem(null)}>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto"><AlertTriangle size={28} /></div>
            <div className="space-y-2">
              <h4 className="text-lg font-black text-slate-800 uppercase italic">Yakin Mau Hapus?</h4>
              <p className="text-sm font-black text-rose-600 uppercase italic">
                {confirmDeleteItem.type === 'SUBJECT' && 'Mata Pelajaran'}
                {confirmDeleteItem.type === 'LEVEL' && 'Level'}
                {confirmDeleteItem.type === 'CLASS' && 'Ruang Kelas'}
                : {confirmDeleteItem.value}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-left">
              <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                {confirmDeleteItem.type === 'SUBJECT' && 'Data lama (materi, jadwal, riwayat siswa) yang sudah pakai matkul ini TIDAK ikut terhapus. Tapi matkul ini nggak akan muncul lagi sebagai pilihan baru di form Materi, Jadwal Kelas, atau pendaftaran kelas.'}
                {confirmDeleteItem.type === 'LEVEL' && 'Data lama (rapot, materi, jadwal) yang sudah pakai level ini TIDAK ikut terhapus. Tapi level ini nggak akan muncul lagi sebagai pilihan baru di form Materi, Jadwal Kelas, atau pendaftaran kelas.'}
                {confirmDeleteItem.type === 'CLASS' && 'Jadwal yang sudah memakai ruangan ini TIDAK ikut terhapus dan tetap tampil di daftar Jadwal Kelas, tapi ruangan ini nggak akan muncul lagi sebagai pilihan baru.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteItem(null)} className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase">Batal</button>
              <button onClick={executeConfirmedDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase">Ya, Hapus</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default AdminAcademic;
