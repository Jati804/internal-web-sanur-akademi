import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Attendance } from '../types';
import ModalPortal from '../ModalPortal.tsx';
import { supabase } from '../services/supabase.ts';
import { DAYS, sortSchedule, fmtRange, stripPelatihan } from './AdminAcademic.tsx';
import type { ScheduleItem } from './AdminAcademic.tsx';
import {
  ClipboardCheck, Loader2, Clock, Send, Zap, HeartPulse,
  UserPlus, Wallet, Hash, Timer, RotateCcw, Save, Sparkles,
  AlertTriangle, X, Check, CalendarDays
} from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useLocation, useNavigate } = ReactRouterDOM as any;

// ============================================================================
// 📅 PRESENSI BERBASIS JADWAL
// Guru TIDAK lagi memilih matpel / level / ruangan / siswa satu per satu.
// Guru cukup memilih salah satu slot dari jadwal yang dia pegang (class_schedule),
// lalu mengisi TANGGAL ASLI mengajar. Hari di slot hanya label pengenal kelas,
// tidak dicek terhadap tanggal (kelas pengganti di hari lain tetap sah).
//
// Identitas paket honor = ID slot (kolom attendance.scheduleid), bukan lagi
// kombinasi matpel+level+ruang. Nama siswa disimpan di tiap sesi (studentsattended)
// sesuai isi slot SAAT sesi diinput, jadi riwayat tidak berubah kalau admin mengganti siswa.
// ============================================================================

interface TeacherDashboardProps {
  user: User;
  logs: Attendance[];
  studentAccounts: User[];
  schedule: ScheduleItem[];
  salaryConfig: { regulerRate: number, privateRate: number };
  teachers: User[];
  refreshAllData: () => Promise<void>;
}

// Satu aturan "ruang private" untuk semua tempat (sama dengan ScheduleModal)
const isPrivateRoom = (room: string) => /PRIVATE|PRIVAT|HOME TUTORING/i.test(room || '');

const todayJakarta = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user, logs, studentAccounts, schedule, salaryConfig, teachers, refreshAllData
}) => {
  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const editData = location.state?.editLog as any | undefined;
  const formCardRef = useRef<HTMLDivElement>(null);

  // AUTO-SCROLL KE KOTAK FORM (BUKAN KE ATAS HALAMAN) KHUSUS MODE EDIT
  useEffect(() => {
    if (editData) {
      const timer = setTimeout(() => {
        formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [editData]);

  const [form, setForm] = useState({
    scheduleId: '',
    targetTeacherId: '',
    sessionNumber: 1,
    duration: 2,
    date: todayJakarta()
  });

  const [activePackageId, setActivePackageId] = useState<string | null>(null);
  const [activeOriginalTeacherId, setActiveOriginalTeacherId] = useState<string | null>(null);

  const [blockModal, setBlockModal] = useState<{
    ownerName: string;
    className: string;
    currentSession: number;
  } | null>(null);

  const [showTeacherSuggestions, setShowTeacherSuggestions] = useState(false);
  const [teacherInputValue, setTeacherInputValue] = useState('');

  // ===== JADWAL MILIK GURU INI =====
  const scheduleList: ScheduleItem[] = Array.isArray(schedule) ? schedule : [];
  const myId = String(user.id);
  const mySlots = useMemo(
    () => sortSchedule(scheduleList.filter(it => String(it.teacherId) === myId)),
    [scheduleList, myId]
  );
  const slotsByDay = useMemo(
    () => DAYS.map(day => ({ day, list: mySlots.filter(i => i.day === day) })).filter(g => g.list.length > 0),
    [mySlots]
  );
  const studentById = useMemo(
    () => new Map((studentAccounts || []).map((s: any) => [String(s.id), s])),
    [studentAccounts]
  );

  // Sesi lama (dibuat sebelum fitur jadwal) atau slotnya sudah tidak ada -> identitas kelas dikunci dari data sesinya
  const legacyEdit = !!editData && !(editData.scheduleId && scheduleList.some(it => String(it.id) === String(editData.scheduleId)));
  const selectedSlot = scheduleList.find(it => String(it.id) === form.scheduleId) || null;

  // 🏷️ IDENTITAS KELAS: semua turunan dari slot yang dipilih
  const identity = useMemo(() => {
    if (legacyEdit && editData) {
      const className = String(editData.className || '');
      return {
        scheduleId: null as string | null,
        className,
        level: String(editData.level || ''),
        category: (editData.sessionCategory || 'REGULER') as 'REGULER' | 'PRIVATE',
        students: ((editData.studentsAttended || []) as string[]).filter(Boolean),
        room: className.split(' - ').pop() || ''
      };
    }
    if (!selectedSlot) return null;
    const room = selectedSlot.room || '';
    const students = (selectedSlot.participants || [])
      .map(p => String(studentById.get(String(p.id))?.name || p.name || '').toUpperCase().trim())
      .filter(Boolean);
    return {
      scheduleId: String(selectedSlot.id),
      className: `${selectedSlot.subject} - ${room}`.toUpperCase().trim(),
      level: '',
      category: (isPrivateRoom(room) ? 'PRIVATE' : 'REGULER') as 'REGULER' | 'PRIVATE',
      students,
      room
    };
  }, [legacyEdit, editData, selectedSlot, studentById]);

  const isHomeTutoring = (identity?.className || '').toUpperCase().includes('HOME TUTORING');

  // Apakah slot diganti saat edit? (= pindah sesi ke paket slot lain)
  const isSlotChanged = !!editData && !legacyEdit && form.scheduleId !== String(editData.scheduleId);

  // Nama siswa yang disimpan di sesi ini:
  // - sesi baru / dipindah slot -> isi slot saat ini
  // - edit di slot yang sama -> pertahankan yang sudah tersimpan (riwayat tidak berubah)
  const studentsToSave = (): string[] => {
    if (editData && !isSlotChanged) {
      const old = (editData.studentsAttended || []) as string[];
      return old.length ? old : ['REGULER'];
    }
    return identity && identity.students.length ? identity.students : ['REGULER'];
  };

  // ===== ISI FORM SAAT MODE EDIT =====
  useEffect(() => {
    if (editData) {
      setForm({
        scheduleId: editData.scheduleId ? String(editData.scheduleId) : '',
        targetTeacherId: editData.teacherId !== user.id ? editData.teacherId : '',
        sessionNumber: editData.sessionNumber || 1,
        duration: editData.duration || 2,
        date: editData.date
      });
      setIsDelegating(editData.teacherId !== user.id);
      setActivePackageId(editData.packageId || null);
      setActiveOriginalTeacherId(editData.originalTeacherId || null);
      setTeacherInputValue(editData.teacherId !== user.id ? (teachers.find(t => t.id === editData.teacherId)?.name || '') : '');
    }
  }, [editData, user.id]);

  // Nutup mode edit: balikin form ke kosong & bersihin location.state
  const handleCloseEdit = () => {
    setForm({ scheduleId: '', targetTeacherId: '', sessionNumber: 1, duration: 2, date: todayJakarta() });
    setIsDelegating(false);
    setActivePackageId(null);
    setActiveOriginalTeacherId(null);
    setTeacherInputValue('');
    navigate(location.pathname, { replace: true, state: {} });
  };

  // Home Tutoring: guru wajib datang sendiri -> tidak ada opsi "digantikan teman"
  useEffect(() => {
    if (isHomeTutoring && isDelegating) {
      setIsDelegating(false);
      setForm(prev => ({ ...prev, targetTeacherId: '' }));
      setTeacherInputValue('');
      setShowTeacherSuggestions(false);
    }
  }, [isHomeTutoring, isDelegating]);

  const estimatedHonor = useMemo(() => {
    const isPrivate = identity?.category === 'PRIVATE';
    const hourlyRate = isPrivate ? (salaryConfig?.privateRate || 25000) : (salaryConfig?.regulerRate || 15000);
    return Math.round(hourlyRate * form.duration);
  }, [identity?.category, form.duration, salaryConfig]);

  // ===== Helper urutan sesi berdasarkan TANGGAL =====
  type PkgRow = { id: string; sessionnumber: number; date: string; paymentstatus?: string };
  type PkgChange = { id: string; from: number; to: number; date: string; paymentstatus?: string };

  const NEW_ID = 'ATT-~'; // ID sementara untuk sesi baru: kalau tanggal sama, sesi baru dianggap paling akhir
  const dateOnly = (d: any) => String(d).slice(0, 10);
  const fmtDate = (d: any) => dateOnly(d).split('-').reverse().join('/');
  const toPkgRows = (arr: any[]): PkgRow[] =>
    arr.map(r => ({
      id: r.id,
      sessionnumber: Number(r.sessionnumber) || 0,
      date: dateOnly(r.date),
      paymentstatus: r.paymentstatus
    }));

  const placeInPackage = (others: PkgRow[], date: string, id: string) => {
    const sorted = [...others].sort((a, b) => a.sessionnumber - b.sessionnumber);
    const idx = sorted.findIndex(r => r.date > date || (r.date === date && r.id > id));
    const position = idx === -1 ? sorted.length + 1 : idx + 1;
    const changes: PkgChange[] = sorted
      .map((r, i) => ({
        id: r.id,
        from: r.sessionnumber,
        to: i < position - 1 ? i + 1 : i + 2,
        date: r.date,
        paymentstatus: r.paymentstatus
      }))
      .filter(c => c.to !== c.from);
    return { position, changes };
  };

  const compressPackage = (rows: PkgRow[]): PkgChange[] =>
    [...rows]
      .sort((a, b) => a.sessionnumber - b.sessionnumber)
      .map((r, i) => ({ id: r.id, from: r.sessionnumber, to: i + 1, date: r.date, paymentstatus: r.paymentstatus }))
      .filter(c => c.to !== c.from);

  const toOps = (changes: PkgChange[]) => ({
    p_up: changes.filter(c => c.to > c.from).sort((a, b) => b.from - a.from).map(c => ({ id: c.id, sessionnumber: c.to })),
    p_down: changes.filter(c => c.to < c.from).sort((a, b) => a.from - b.from).map(c => ({ id: c.id, sessionnumber: c.to }))
  });

  const friendlyError = (e: any) => {
    const raw = String(e?.message || '');
    const low = raw.toLowerCase();
    if (low.includes('failed to fetch') || low.includes('network')) return 'Koneksi internet terputus.';
    if (low.includes('jwt') || low.includes('expired')) return 'Sesi login sudah habis, silakan login ulang.';
    if (low.includes('row-level security') || low.includes('permission denied')) return 'Akun Kakak tidak punya izin untuk mengubah data ini.';
    if (low.includes('duplicate key')) return 'Nomor sesi bentrok dengan sesi lain.';
    if (low.includes('sesi_lunas')) return 'Ada sesi LUNAS yang nomornya ikut bergeser.';
    if (low.includes('could not find the function')) return 'Fitur urutan sesi belum aktif di database.';
    return raw || 'Terjadi kendala yang tidak diketahui.';
  };

  // 🔎 Cari paket aktif untuk SLOT yang dipilih (identitas paket = ID slot).
  // excludeId dipakai saat edit/pindah: sesi yang lagi dipindah jangan ikut dihitung.
  const findActivePackage = (excludeId?: string) => {
    if (!identity?.scheduleId) return null;
    const relevantLogs = logs.filter(l =>
      String((l as any).scheduleId || '') === identity.scheduleId &&
      (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG') &&
      l.id !== excludeId
    );

    // Aktivitas input terbaru (ID = timestamp) menentukan paket mana yang sedang berjalan
    const latestAction = [...relevantLogs].sort((a, b) => b.id.localeCompare(a.id))[0];
    if (!latestAction) return null;

    const pkgLogs = relevantLogs.filter(l => l.packageId === latestAction.packageId);
    const maxNum = pkgLogs.reduce((max, l) => Math.max(max, Number(l.sessionNumber) || 0), 0);

    return {
      packageId: latestAction.packageId || null,
      originalTeacherId: latestAction.originalTeacherId || null,
      // Nama kelas & level mengikuti paket yang dilanjutkan, supaya satu paket tidak
      // berisi dua format nama (paket lama masih ber-"(LEVEL)", sesi baru tidak).
      className: latestAction.className || null,
      level: latestAction.level || '',
      maxNum
    };
  };

  // LOGIKA DETEKSI SESI OTOMATIS
  useEffect(() => {
    if (editData) {
      setIsDetecting(false);
      return;
    }
    if (!identity?.scheduleId || !Array.isArray(logs)) {
      setForm(prev => (prev.sessionNumber === 1 ? prev : { ...prev, sessionNumber: 1 }));
      setActivePackageId(null);
      setActiveOriginalTeacherId(null);
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);

    const timer = setTimeout(() => {
      const active = findActivePackage();

      if (active && active.maxNum < 6) {
        // Paket belum penuh -> lanjutkan, nomor sesi mengikuti TANGGAL
        const pkgRows = toPkgRows(
          logs.filter(l => l.packageId === active.packageId && (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG'))
        );
        const { position } = placeInPackage(pkgRows, form.date, NEW_ID);
        setForm(prev => ({ ...prev, sessionNumber: position }));
        setActivePackageId(active.packageId);
        setActiveOriginalTeacherId(active.originalTeacherId);
      } else {
        // Belum ada riwayat, atau paket terakhir sudah 6 sesi -> buka paket baru (Sesi 1)
        setForm(prev => ({ ...prev, sessionNumber: 1 }));
        setActivePackageId(null);
        setActiveOriginalTeacherId(null);
      }
      setIsDetecting(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [logs, identity?.scheduleId, form.date, editData]);

  // 👀 PREVIEW nomor sesi saat EDIT (sesuai urutan tanggal, sama seperti hasil saat dikirim)
  useEffect(() => {
    if (!editData || !identity) return;

    let targetPkgId: string | null = editData.packageId || null;
    let isNewPackage = false;

    if (isSlotChanged) {
      const dest = findActivePackage(editData.id);
      if (dest && dest.packageId && dest.packageId !== editData.packageId) {
        targetPkgId = dest.packageId;
      } else {
        isNewPackage = true;
      }
    }

    let preview = 1;
    if (!isNewPackage && targetPkgId) {
      const rows = toPkgRows(
        logs.filter(l => l.packageId === targetPkgId && l.id !== editData.id &&
                         (l.status === 'SESSION_LOG' || l.status === 'SUB_LOG'))
      );
      preview = placeInPackage(rows, form.date, editData.id).position;
    }

    setForm(prev => (prev.sessionNumber === preview ? prev : { ...prev, sessionNumber: preview }));
  }, [logs, form.scheduleId, form.date, editData, identity?.scheduleId]);

  // 🔀 Ganti slot saat edit = pindahkan sesi ke paket slot tujuan (disisipkan sesuai tanggal).
  const handleMoveSession = async (delegating: boolean) => {
    if (!editData || !identity) return;
    setLoading(true);
    try {
      const fullClassName = identity.className;
      const targetTeacher = teachers.find(t => t.id === form.targetTeacherId);
      const srcPkgId = editData.packageId;

      const found = findActivePackage(editData.id);
      const destPkg = found && found.packageId && found.packageId !== srcPkgId ? found : null;

      // Ambil data TERBARU dari DB (bukan cuma state lokal)
      const pkgIds = [srcPkgId, destPkg?.packageId].filter(Boolean) as string[];
      const { data: freshRows, error: freshErr } = await supabase
        .from('attendance')
        .select('id, packageid, sessionnumber, date, paymentstatus, status, teacherid, originalteacherid')
        .in('packageid', pkgIds)
        .in('status', ['SESSION_LOG', 'SUB_LOG']);
      if (freshErr) throw freshErr;

      const rows = (freshRows || []) as any[];
      const srcRaw = rows.filter(r => r.packageid === srcPkgId && r.id !== editData.id);
      const destRaw = destPkg ? rows.filter(r => r.packageid === destPkg.packageId) : [];

      if (destPkg && destRaw.length >= 6) {
        alert(`Paket tujuan (${fullClassName}) sudah terisi 6 sesi, jadi sesi ini tidak bisa disisipkan. Silakan hubungi Admin ya Kak! 🙏`);
        return;
      }

      // Validasi ownership paket tujuan
      if (destPkg) {
        const ownerId = destPkg.originalTeacherId || destRaw[0]?.originalteacherid;
        if (ownerId && ownerId !== user.id) {
          const hasSub = destRaw.some(r => r.teacherid === user.id && r.status === 'SUB_LOG');
          if (!hasSub) {
            const owner = teachers.find(t => t.id === ownerId);
            setBlockModal({
              ownerName: owner?.name || 'Guru Lain',
              className: fullClassName,
              currentSession: destRaw.length
            });
            return;
          }
        }
      }

      const placed = placeInPackage(toPkgRows(destRaw), form.date, editData.id);
      const newNumber = placed.position;
      const destChanges = placed.changes;
      const srcChanges = compressPackage(toPkgRows(srcRaw));

      if (destChanges.some(c => c.paymentstatus !== 'UNPAID')) {
        alert(`Sesi tidak bisa dipindah ke kotak ${fullClassName}.\n\nSesi tanggal ${fmtDate(form.date)} harus disisipkan sebelum sesi lain di kotak itu yang sudah LUNAS (sudah dibayar), dan sesi LUNAS tidak boleh berubah nomornya.\n\nSilakan hubungi Admin ya Kak! 🙏`);
        return;
      }
      if (srcChanges.some(c => c.paymentstatus !== 'UNPAID')) {
        alert(`Sesi tidak bisa dipindah dari kotak lama.\n\nAda sesi setelahnya di kotak itu yang sudah LUNAS (sudah dibayar), jadi nomornya tidak bisa dirapatkan setelah sesi ini keluar.\n\nSilakan hubungi Admin ya Kak! 🙏`);
        return;
      }

      const notes: string[] = [];
      if (!destPkg) notes.push('Kotak baru akan dibuat karena belum ada kotak yang cocok.');
      if (destChanges.length > 0) notes.push(`Sesi di kotak itu yang tanggalnya lebih akhir (mulai tanggal ${fmtDate(destChanges[0].date)}) akan mundur satu nomor.`);
      if (srcChanges.length > 0) notes.push('Sesi di kotak lama yang tanggalnya setelah sesi ini akan maju satu nomor.');
      const ok = window.confirm(
        `Sesi ini akan dipindah ke kotak ${fullClassName} sebagai sesi ke-${newNumber}.` +
        (notes.length ? `\n\n${notes.join('\n')}` : '') +
        `\n\nLanjutkan?`
      );
      if (!ok) return;

      const classNameToSave = destPkg?.className || fullClassName;
      const levelToSave = destPkg ? destPkg.level : identity.level;
      const finalPackageId = destPkg?.packageId
        || `PKG-${identity.category}-${identity.scheduleId}-${Date.now()}`;
      const finalOriginalTeacherId = destPkg?.originalTeacherId || destRaw[0]?.originalteacherid || user.id;

      const payload: any = {
        id: editData.id,
        teacherid: delegating ? (targetTeacher?.id || user.id) : user.id,
        teachername: delegating ? (targetTeacher?.name || user.name) : user.name,
        date: form.date,
        clockin: editData.clockIn,
        status: delegating ? 'SUB_LOG' : 'SESSION_LOG',
        classname: classNameToSave,
        level: levelToSave,
        sessioncategory: identity.category,
        packageid: finalPackageId,
        scheduleid: identity.scheduleId,
        sessionnumber: newNumber,
        studentsattended: studentsToSave(),
        earnings: estimatedHonor,
        paymentstatus: 'UNPAID',
        duration: form.duration,
        substitutefor: delegating ? user.name : (editData.substituteFor || null),
        originalteacherid: finalOriginalTeacherId
      };

      // Semua perubahan dijalankan di database dalam SATU transaksi
      const ops = toOps([...destChanges, ...srcChanges]);
      const { error: rpcErr } = await supabase.rpc('move_attendance_session', {
        p_up: ops.p_up,
        p_moved: payload,
        p_down: ops.p_down
      });
      if (rpcErr) throw rpcErr;

      if (refreshAllData) await refreshAllData();
      navigate('/teacher/honor', { replace: true, state: { highlightId: finalPackageId } });
    } catch (e: any) {
      alert("Gagal memindahkan sesi: " + friendlyError(e) + "\n\nTidak ada data yang berubah. Silakan coba lagi, atau hubungi Admin kalau masih gagal ya Kak! 🙏");
      if (refreshAllData) await refreshAllData();
    } finally {
      setLoading(false);
    }
  };

  const handleLaporPresensi = async () => {
    if (isDetecting || loading) return;
    const delegating = isDelegating && !isHomeTutoring; // Home Tutoring: tidak boleh digantikan
    if (!identity) return alert("Pilih jadwal kelasnya dulu ya! ✨");
    if (identity.category === 'PRIVATE' && identity.students.length === 0 && !editData) {
      return alert("Jadwal Private ini belum punya siswa. Hubungi Admin untuk mengisinya ya Kak! 🙏");
    }
    if (delegating && !form.targetTeacherId) return alert("Pilih Nama Teman yang menggantikan dulu ya! ✨");

    // ✏️ Mode edit + slot diganti -> pindahkan sesi ke paket yang benar
    if (editData && isSlotChanged) {
      await handleMoveSession(delegating);
      return;
    }

    // ⭐ VALIDASI OWNERSHIP SEBELUM SUBMIT
    if (activePackageId && activeOriginalTeacherId && activeOriginalTeacherId !== user.id) {
      const mySubLogs = logs.filter(l =>
        l.packageId === activePackageId &&
        l.teacherId === user.id &&
        l.status === 'SUB_LOG'
      );

      if (mySubLogs.length === 0) {
        const owner = teachers.find(t => t.id === activeOriginalTeacherId);
        setBlockModal({
          ownerName: owner?.name || 'Guru Lain',
          className: identity.className,
          currentSession: form.sessionNumber
        });
        return;
      }
    }

    setLoading(true);
    try {
      const targetTeacher = teachers.find(t => t.id === form.targetTeacherId);

      // Kalau melanjutkan paket yang sudah ada, nama kelas & level mengikuti baris paket itu
      const pkgRef: any = activePackageId
        ? [...logs].filter(l => l.packageId === activePackageId).sort((a, b) => b.id.localeCompare(a.id))[0]
        : null;
      const fullClassName = pkgRef?.className || identity.className;
      const levelToSave = pkgRef ? String(pkgRef.level || '') : identity.level;

      // ID Paket: sesi 1 buat baru, selanjutnya pakai yang lama
      const finalPackageId = activePackageId
        || `PKG-${identity.category}-${identity.scheduleId || 'LAMA'}-${Date.now()}`;
      const finalOriginalTeacherId = activeOriginalTeacherId || user.id;

      const payloadId = editData ? editData.id : `ATT-${Date.now()}`; // ID berisi timestamp untuk sorting

      // Nomor sesi ditentukan dari TANGGAL, pakai data terbaru di database
      let position = form.sessionNumber;
      let changes: PkgChange[] = [];
      if (activePackageId) {
        const { data: freshPkg, error: freshErr } = await supabase
          .from('attendance')
          .select('id, sessionnumber, date, paymentstatus')
          .eq('packageid', activePackageId)
          .in('status', ['SESSION_LOG', 'SUB_LOG']);
        if (freshErr) throw freshErr;

        const others = toPkgRows((freshPkg || []).filter((r: any) => r.id !== payloadId));
        if (!editData && others.length >= 6) {
          alert('Paket ini sudah terisi 6 sesi, jadi sesi baru tidak bisa ditambahkan. Silakan hubungi Admin ya Kak! 🙏');
          setLoading(false);
          return;
        }
        const placed = placeInPackage(others, form.date, payloadId);
        position = placed.position;
        changes = placed.changes;
      }

      const payload: any = {
        id: payloadId,
        teacherid: delegating ? (targetTeacher?.id || user.id) : user.id,
        teachername: delegating ? (targetTeacher?.name || user.name) : user.name,
        date: form.date,
        clockin: editData ? editData.clockIn : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date()),
        status: delegating ? 'SUB_LOG' : 'SESSION_LOG',
        classname: fullClassName,
        level: levelToSave,
        sessioncategory: identity.category,
        packageid: finalPackageId,
        scheduleid: identity.scheduleId,
        sessionnumber: position,
        studentsattended: studentsToSave(),
        earnings: estimatedHonor,
        paymentstatus: 'UNPAID',
        duration: form.duration,
        substitutefor: delegating ? user.name : (editData?.substituteFor || null),
        originalteacherid: finalOriginalTeacherId
      };

      if (changes.length > 0) {
        if (changes.some(c => c.paymentstatus !== 'UNPAID')) {
          alert(`Sesi tanggal ${fmtDate(form.date)} tidak bisa disimpan di urutan ke-${position}.\n\nAda sesi yang sudah LUNAS (sudah dibayar) yang nomornya ikut berubah, dan sesi LUNAS tidak boleh berubah nomornya.\n\nSilakan hubungi Admin ya Kak! 🙏`);
          setLoading(false);
          return;
        }

        const dates = changes.map(c => fmtDate(c.date)).join(', ');
        const ok = window.confirm(
          (editData
            ? `Sesi ini akan jadi sesi ke-${position}, karena urutannya mengikuti tanggal.`
            : `Sesi tanggal ${fmtDate(form.date)} akan disimpan sebagai sesi ke-${position}, karena urutannya mengikuti tanggal.`) +
          `\n\nNomor sesi tanggal ${dates} ikut berubah.\n\nLanjutkan?`
        );
        if (!ok) {
          setLoading(false);
          return;
        }

        const ops = toOps(changes);
        const { error: rpcErr } = await supabase.rpc('move_attendance_session', {
          p_up: ops.p_up,
          p_moved: payload,
          p_down: ops.p_down
        });
        if (rpcErr) throw rpcErr;
      } else {
        const { error } = await supabase.from('attendance').upsert([payload]);
        if (error) throw error;
      }

      if (refreshAllData) await refreshAllData();
      setLoading(false);
      navigate('/teacher/honor', { replace: true, state: { highlightId: finalPackageId } });

    } catch (e: any) {
      alert("Gagal: " + friendlyError(e));
      setLoading(false);
    }
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
        @keyframes editHighlightPulse {
          0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.45); }
          50% { box-shadow: 0 0 0 18px rgba(249, 115, 22, 0); }
          100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-12 pb-40 px-4">
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

      <div
        ref={formCardRef}
        className={`bg-white p-10 md:p-14 rounded-[4rem] shadow-2xl border space-y-12 relative overflow-hidden scroll-mt-32 transition-colors duration-500 ${editData ? 'border-orange-200' : 'border-slate-100'}`}
        style={editData ? { animation: 'editHighlightPulse 1.6s ease-out 2' } : undefined}
      >
         {editData && (
           <div className="relative z-20 flex items-center justify-between">
             <div className="inline-flex px-6 py-2.5 bg-orange-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg items-center gap-2">
               <RotateCcw size={12}/> Mode edit
             </div>
             <button
               onClick={handleCloseEdit}
               title="Batal edit"
               className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all active:scale-95 shadow-sm"
             >
               <X size={18} />
             </button>
           </div>
         )}
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50"></div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">

            {/* ===== PILIH JADWAL ===== */}
            <div className="md:col-span-2 space-y-5">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2 leading-none">
                 <CalendarDays size={14} className="text-blue-500 -translate-y-px"/> Pilih Jadwal Kelas
               </label>

               {legacyEdit && editData ? (
                 <div className="px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] space-y-2">
                    <p className="text-xs font-black text-slate-800 uppercase italic">{identity?.className}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">
                      Sesi ini dibuat sebelum sistem jadwal, jadi kelasnya tidak bisa diganti. Tanggal dan guru pengganti tetap bisa diubah.
                    </p>
                 </div>
               ) : slotsByDay.length === 0 ? (
                 <div className="px-8 py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-center space-y-2">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Belum ada jadwal untukmu</p>
                    <p className="text-[11px] font-bold text-slate-300">Hubungi Admin untuk menambahkan jadwal mengajarmu ya Kak.</p>
                 </div>
               ) : (
                 <div className="space-y-6">
                   {slotsByDay.map(g => (
                     <div key={g.day} className="space-y-3">
                       <div className="flex items-center gap-3 px-2">
                         <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{g.day}</h4>
                       </div>
                       <div className="space-y-2">
                         {g.list.map(it => {
                           const sel = form.scheduleId === String(it.id);
                           const priv = isPrivateRoom(it.room);
                           const people = (it.participants || []).map(p => String(studentById.get(String(p.id))?.name || p.name || ''));
                           return (
                             <button
                               type="button"
                               key={it.id}
                               onClick={() => setForm(prev => ({ ...prev, scheduleId: prev.scheduleId === String(it.id) ? '' : String(it.id) }))}
                               className={`w-full text-left flex gap-4 rounded-[1.5rem] px-5 py-4 border-2 transition-all active:scale-[0.99] ${sel ? 'bg-blue-50 border-blue-500 shadow-lg' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}
                             >
                               <p className="w-[5.5rem] shrink-0 text-xs font-black text-slate-800 leading-snug">{fmtRange(it.start, it.end)}</p>
                               <div className="min-w-0 flex-1 space-y-1.5">
                                 <div className="flex flex-wrap items-center gap-2">
                                   <p className="text-xs font-black text-slate-800 uppercase italic">{stripPelatihan(it.subject)}</p>
                                   <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${priv ? 'bg-orange-500' : 'bg-blue-900'}`}>{it.room}</span>
                                 </div>
                                 {people.length > 0 && (
                                   <div className={`text-[11px] font-semibold space-y-0.5 ${priv ? 'text-orange-600' : 'text-blue-900/70'}`}>
                                     {people.map((n, k) => (
                                       <p key={k}>{people.length > 1 ? `${k + 1}. ` : ''}{n}</p>
                                     ))}
                                   </div>
                                 )}
                               </div>
                               {sel
                                 ? <Check size={20} className="text-blue-600 shrink-0 self-center" />
                                 : <span className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 self-center" aria-hidden="true" />}
                             </button>
                           );
                         })}
                       </div>
                     </div>
                   ))}
                 </div>
               )}

               {identity && identity.category === 'PRIVATE' && identity.students.length === 0 && !editData && (
                 <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-4 italic">Jadwal Private ini belum punya siswa — hubungi Admin.</p>
               )}
            </div>

            <div className="md:col-span-2 space-y-6 pt-4">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2 leading-none"><Hash size={14} className="text-blue-500 -translate-y-px"/> Sesi Terdeteksi Otomatis (1-6)</label>
               <div className="grid grid-cols-6 gap-3">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <div
                      key={n}
                      className={`py-5 rounded-2xl font-black text-lg transition-all border-2 text-center flex items-center justify-center cursor-default ${identity && form.sessionNumber === n ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-slate-50 text-slate-300 border-slate-100 shadow-inner'} ${isDetecting ? 'animate-pulse opacity-50' : ''}`}
                    >
                      {n}
                    </div>
                  ))}
               </div>
               <div className="mt-4 bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-4 shadow-sm animate-in fade-in duration-700">
                  <div className="space-y-3">
                     <p className="text-[9px] font-bold text-blue-800 uppercase italic leading-relaxed tracking-wide">
                        "Jika nomor sesi tidak sesuai, mohon cek kembali <span className="font-black underline">Jadwal Kelas</span> yang dipilih dan <span className="font-black underline">Tanggal Pelaksanaan</span> ✨"
                     </p>
                     <p className="text-[9px] font-bold text-blue-800 uppercase italic leading-relaxed tracking-wide">
                        Jika ada halangan mengajar dan kelas diganti di hari lain, tetap pilih kelas yang diajar sesuai jadwal, dan isi <span className="font-black underline">Tanggal Pelaksanaan</span> sesuai hari Anda mengajar.
                     </p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2 leading-none"><Timer size={14} className="text-blue-500 -translate-y-px"/> Durasi Mengajar (Jam)</label>
               <div className="h-[72px] rounded-[2rem] bg-orange-500 border-2 border-orange-500 shadow-lg flex items-center justify-center gap-2 text-white cursor-default">
                  <span className="font-black text-[11px]">2 JAM</span>
                  <span className="font-black text-[11px]">/ PERTEMUAN</span>
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2 leading-none"><Clock size={14} className="text-blue-500 -translate-y-px"/> Tanggal Pelaksanaan</label>
               <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all shadow-inner h-[72px]" />
            </div>

            {!isHomeTutoring && (
            <div className={`md:col-span-2 p-8 rounded-[3.5rem] border-2 transition-all duration-500 ${isDelegating ? 'bg-rose-50 border-rose-200 shadow-xl' : 'bg-slate-50 border-transparent'}`}>
               <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isDelegating ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                        <HeartPulse size={28}/>
                     </div>
                     <div>
                        <h4 className={`text-sm font-black uppercase italic ${isDelegating ? 'text-rose-600' : 'text-slate-500'}`}>Guru Lain Yang Mengajar?</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gunakan ini jika teman menggantikan sesi Anda</p>
                     </div>
                  </div>
                  <button onClick={() => setIsDelegating(!isDelegating)} className={`w-16 h-8 rounded-full p-1.5 transition-all duration-500 flex ${isDelegating ? 'bg-rose-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                     <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                  </button>
               </div>

               {isDelegating && (
                 <div className="mt-8 space-y-4 animate-in slide-in-from-top-4 relative">
                   <label className="text-[9px] font-black text-rose-500 uppercase ml-4 tracking-widest flex items-center gap-2">
                     <UserPlus size={12}/> Pilih Rekan Yang Menggantikan Anda:
                   </label>

                   <div className="relative">
                     <input
                       type="text"
                       placeholder="KETIK NAMA TEMAN..."
                       value={teacherInputValue}
                       onChange={(e) => {
                         const val = e.target.value;
                         setTeacherInputValue(val);
                         setShowTeacherSuggestions(true);

                         const matchedTeacher = teachers.find(t => t.name.toUpperCase() === val.toUpperCase() && t.id !== user.id && t.role === 'TEACHER');
                         if (matchedTeacher) {
                           setForm({...form, targetTeacherId: matchedTeacher.id});
                         } else {
                           setForm({...form, targetTeacherId: ''});
                         }
                       }}
                       onFocus={() => setShowTeacherSuggestions(true)}
                       onBlur={() => setTimeout(() => setShowTeacherSuggestions(false), 200)}
                       className="w-full px-8 py-6 bg-white border-2 border-transparent focus:border-rose-500 rounded-[2rem] font-black text-[11px] outline-none shadow-sm transition-all h-[72px]"
                     />

                     {showTeacherSuggestions && teacherInputValue.trim() && (
                       <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border-2 border-rose-100 max-h-[100px] overflow-y-auto">
                         {teachers
                           .filter(t => t.id !== user.id && t.role === 'TEACHER' && t.name.toUpperCase().includes(teacherInputValue.toUpperCase()))
                           .slice(0, 8)
                           .map(teacher => (
                             <button
                               key={teacher.id}
                               type="button"
                               onMouseDown={(e) => {
                                 e.preventDefault();
                                 setTeacherInputValue(teacher.name);
                                 setForm({...form, targetTeacherId: teacher.id});
                                 setShowTeacherSuggestions(false);
                               }}
                               className="w-full px-6 py-4 text-left text-[11px] font-black hover:bg-rose-50 transition-all text-slate-700 border-b last:border-0"
                             >
                               {teacher.name}
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
            )}
         </div>

         <div>
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
               <h3 className={`text-xs font-black italic ${isDelegating ? 'text-orange-400 animate-pulse' : 'text-blue-400'}`}>
                  {isDelegating ? (teachers.find(t=>t.id===form.targetTeacherId)?.name || 'PILIH TEMAN') : 'SAYA SENDIRI'}
               </h3>
            </div>
         </div>
         {isHomeTutoring && (
            <p className="mt-4 px-6 text-[10px] font-bold text-slate-400 italic leading-relaxed">
               ✨ Estimasi ini belum termasuk honor transport. Honor transport 100% akan dibayarkan di akhir paket.
            </p>
         )}
         </div>

         <button
           onClick={handleLaporPresensi}
           disabled={loading || isDetecting || !identity}
           className="w-full py-10 bg-blue-600 text-white rounded-[3rem] font-black text-[14px] uppercase tracking-[0.5em] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30 group"
         >
            {loading ? <Loader2 className="animate-spin" size={32} /> : isDetecting ? 'HARAP TUNGGU...' : (editData ? <><Save size={28}/> SIMPAN PERUBAHAN ✨</> : <><Send size={28} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> KIRIM PRESENSI</>)}
         </button>
      </div>

      {/* MODAL BLOCKING SLOT OWNERSHIP */}
      {blockModal && (
        <ModalPortal>
        <div data-modal-container className="fixed inset-0 z-[300000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative border-t-8 border-rose-600 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
            <div className="p-8">
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-rose-50 rounded-[1.5rem] p-5 flex flex-col gap-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-9 h-9 bg-rose-200 rounded-xl flex items-center justify-center shrink-0">
                      <AlertTriangle size={18} className="text-rose-800" />
                    </div>
                    <p className="text-[11px] font-black text-rose-700 uppercase tracking-wider leading-tight">
                      Kelas Sedang Digunakan!
                    </p>
                  </div>

                  <div className="border-t border-rose-200 pt-4 space-y-3">
                    <p className="text-[10px] font-bold text-rose-700 uppercase leading-relaxed text-center">
                      Kelas ini sedang berjalan oleh:
                    </p>
                    <div className="bg-white rounded-xl px-4 py-2">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-wide leading-relaxed">{blockModal.className}</p>
                    </div>
                    <div className="bg-white rounded-xl px-4 py-3 space-y-1">
                      <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Guru:</p>
                      <p className="text-[10px] font-black text-slate-800">{blockModal.ownerName}</p>
                      <p className="text-[10px] font-bold text-rose-600">Sesi {blockModal.currentSession} / 6</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 rounded-[1.5rem] p-5 flex-1">
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-wide mb-4">Anda bisa input setelah:</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0 mt-0.5"/>
                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed">Beliau menyelesaikan <span className="font-black text-slate-800">Sesi 6</span></p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0 mt-0.5"/>
                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed">Beliau <span className="font-black text-slate-800">mendelegasikan</span> kelas kepada Kakak</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-500 shrink-0 mt-0.5"/>
                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed">Hubungi <span className="font-black text-slate-800">Admin</span> untuk koordinasi tukar kelas</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setBlockModal(null)}
                    className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-[1.25rem] font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check size={16}/> Saya Mengerti
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
    </>
  );
};

export default TeacherDashboard;
