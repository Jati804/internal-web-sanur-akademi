import React, { useMemo, useState, useEffect, useRef } from 'react';
import { User, Attendance, StudentPayment } from '../types';
import { supabase } from '../services/supabase.ts';
import ReportTemplate, { formatDateToDMY } from '../ReportTemplate.tsx';
import { 
  BookOpen, Clock, Loader2, Sparkles, Check, X, Rocket, Trophy, Stars, 
  GraduationCap, BadgeCheck, FileText, Upload, Receipt, History, AlertCircle, 
  CreditCard, Eye, Trash2, Printer, Smile, Heart, Target, Edit3, Save, ChevronRight,
  ClipboardList, Download, ShieldCheck, PartyPopper, UserCog, AlertTriangle, Zap, Star, Quote,
  Layout, Info, FileDown, FileCheck, ImageIcon, Calendar, CheckCircle2, ArrowRight
} from 'lucide-react';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ModalPortal from '../ModalPortal.tsx';

interface StudentPortalProps {
  user: User;
  attendanceLogs: Attendance[];
  reports: any[];  // 👈 TAMBAH INI!
  studentPayments: StudentPayment[];
  setStudentPayments: React.Dispatch<React.SetStateAction<StudentPayment[]>>;
  subjects: string[];
  levels: string[];
  classes: string[];
  teachers: User[];
  studentAttendanceLogs: any[];
  initialView?: 'PROGRESS' | 'PAYMENTS';
  refreshAllData?: () => Promise<void>;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ 
  user, attendanceLogs, reports, studentPayments, setStudentPayments, teachers, initialView, refreshAllData, classes, subjects, levels, studentAttendanceLogs 
}) => {
  const isPaymentView = initialView === 'PAYMENTS';
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [previewModal, setPreviewModal] = useState<string | null>(null);
  const [showDigitalSlip, setShowDigitalSlip] = useState<StudentPayment | null>(null);
  const [downloadingPaymentId, setDownloadingPaymentId] = useState<string | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);

  const [confirmingAbsen, setConfirmingAbsen] = useState<{course: any, sessionNum: number} | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('SEMUA');
  const [activePaymentFilter, setActivePaymentFilter] = useState<string>('SEMUA');
  const [selectedAbsenDate, setSelectedAbsenDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()));
  const [requestingReportFor, setRequestingReportFor] = useState<any | null>(null);
  const [selectedTeacherForReport, setSelectedTeacherForReport] = useState('');
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<StudentPayment | null>(null);
  const [showEditDateModal, setShowEditDateModal] = useState<any | null>(null);
  const [editDateValue, setEditDateValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [payForm, setPayForm] = useState({ subject: '', level: 'BASIC', room: '', amount: 0, date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()), receiptData: '' });

  const normalizedUserName = (user?.name || '').toUpperCase().trim();
  const firstName = (user?.name || 'Siswa').split(' ')[0].toUpperCase();

  const motivationalQuotes = [
    "Setiap langkah kecil belajarmu adalah pondasi kesuksesan di masa depan. Semangat! ✨",
    "Setiap pembelajaran akan melatih dirimu untuk menjadi pribadi yang hebat. 🚀",
    "Kesuksesan hari esok ditentukan oleh seberapa giat kamu belajar hari ini. ⭐",
    "Jadilah versi terbaik dirimu setiap hari melalui ilmu yang bermanfaat. 🔥",
    "Tidak ada kata terlambat untuk memulai hal yang hebat. Ayo lanjut! 🎯"
  ];

  useEffect(() => {
    const interval = setInterval(() => setQuoteIndex((p) => (p + 1) % motivationalQuotes.length), 60000); 
    return () => clearInterval(interval);
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > height) {
            if (width > maxDim) { height *= maxDim / width; width = maxDim; }
          } else {
            if (height > maxDim) { width *= maxDim / height; height = maxDim; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const compressedBase64 = await compressImage(file);
      setPayForm({ ...payForm, receiptData: compressedBase64 });
      setShowErrors(false);
    } catch (err) {
      alert("Gagal memproses gambar. Coba lagi ya!");
    } finally {
      setLoading(false);
    }
  };

  const verifiedCourses = useMemo(() => {
    if (!Array.isArray(studentPayments)) return [];
    return [...studentPayments]
      .filter(p => (p.studentName || '').toUpperCase().trim() === normalizedUserName && p.status === 'VERIFIED')
      .sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id.localeCompare(a.id);
      });
  }, [studentPayments, normalizedUserName]);

const uniqueSubjects = useMemo(() => {
  const names = verifiedCourses.map(c =>
    (c.className || '').replace(/\s*\(.*?\)\s*-\s*REGULER\s*\d+/i, '').trim()
  );
  return ['SEMUA', ...Array.from(new Set(names))];
}, [verifiedCourses]);

// 🆕 Grouping "Kelas Saya" berdasarkan MATKUL + LEVEL (label REGULER di-strip).
// Tiap kartu paket (per 6 sesi) tetap independen — progress, status, badge, rapot
// nggak digabung. Ini murni pengelompokan tampilan biar paket-paket dari
// matkul+level yang sama (misal Microsoft Word Basic REGULER 1 & 2) kelihatan
// sebagai satu keluarga, bukan nyebar di list panjang campur matkul lain.
const groupedFilteredCourses = useMemo(() => {
  const filtered = verifiedCourses.filter(course => {
    if (activeFilter === 'SEMUA') return true;
    const name = (course.className || '').replace(/\s*\(.*?\)\s*-\s*REGULER\s*\d+/i, '').trim();
    return name === activeFilter;
  });

  const groupsMap = new Map<string, typeof filtered>();
  filtered.forEach(course => {
    const groupName = (course.className || '').replace(/\s*\(.*?\)\s*-\s*REGULER\s*\d+/i, '').trim();
    if (!groupsMap.has(groupName)) groupsMap.set(groupName, []);
    groupsMap.get(groupName)!.push(course);
  });

  // Urutan grup ngikutin urutan kemunculan pertama (verifiedCourses udah sorted
  // terbaru dulu), jadi matkul yang lagi paling aktif tetap di atas.
  // Di dalam grup, urutan paket dibikin kronologis (terlama ke terbaru) biar
  // ngikutin alur cerita belajar siswa dari awal.
  return Array.from(groupsMap.entries()).map(([name, courses]) => ({
    name,
    courses: [...courses].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
  }));
}, [verifiedCourses, activeFilter]);

    const myPayments = useMemo(() => {
    if (!Array.isArray(studentPayments)) return [];
    return [...studentPayments]
      .filter(p => (p.studentName || '').toUpperCase().trim() === normalizedUserName)
      .sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id.localeCompare(a.id);
      });
  }, [studentPayments, normalizedUserName]);

  const uniquePaymentSubjects = useMemo(() => {
    const names = myPayments.map(p =>
      (p.className || '').replace(/\s*\(.*?\)\s*-\s*REGULER\s*\d+/i, '').trim()
    );
    return ['SEMUA', ...Array.from(new Set(names))];
  }, [myPayments]);

// 🆕 myLogs sekarang untuk attendance biasa saja (bukan rapot!)
const myLogs = useMemo(() => {
  if (!Array.isArray(attendanceLogs)) return [];
  return attendanceLogs.filter(l => 
    Array.isArray(l.studentsAttended) && 
    l.studentsAttended.some(s => (s || '').toUpperCase().trim() === normalizedUserName)
  );
}, [attendanceLogs, normalizedUserName]);

// 🆕 myReports khusus untuk data rapot dari tabel reports
const myReports = useMemo(() => {
  if (!Array.isArray(reports)) return [];
  return reports.filter(r => 
    Array.isArray(r.studentsAttended) && 
    r.studentsAttended.some(s => (s || '').toUpperCase().trim() === normalizedUserName)
  );
}, [reports, normalizedUserName]);

// 🆕 FIXED: Sekarang cari rapot di tabel reports, bukan attendance!
const findOfficialReportLog = (course: any) => {
  const possibleReports = myReports.filter(r => 
    (r.packageId === course.id) && // Match dengan ID Pembayaran
    (r.status === 'SESSION_LOG' || r.status === 'REPORT_READY') && // Rapot yang sudah siap
    r.sessionNumber === 6 &&
    r.studentScores && 
    Object.keys(r.studentScores).length > 0
  );
  return possibleReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

  const handleLaporBayar = async () => {
    if (!payForm.subject || !payForm.room || !payForm.amount || !payForm.receiptData) {
      setShowErrors(true);
      return alert("Waduh! Tolong lengkapi kolom yang warna merah dulu yaa ✨");
    }
    setLoading(true);
    try {
      const fullClassName = `${payForm.subject} (${payForm.level}) - ${payForm.room}`.toUpperCase();
      const payload = { studentname: normalizedUserName, classname: fullClassName, amount: Number(payForm.amount), date: payForm.date, status: 'PENDING', receiptdata: payForm.receiptData };
      if (isEditing) { await supabase.from('student_payments').update(payload).eq('id', isEditing); }
      else { await supabase.from('student_payments').insert([{ ...payload, id: `PAY-${Date.now()}` }]); }
      if (refreshAllData) await refreshAllData();
      resetForm();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
// Auto scroll ke riwayat pembayaran
setTimeout(() => {
  const riwayatSection = document.getElementById('riwayat-pembayaran');
  if (riwayatSection) {
    riwayatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}, 500);  
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setPayForm({ subject: '', level: 'BASIC', room: '', amount: 0, date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()), receiptData: '' });
    setIsEditing(null);
    setShowErrors(false);
  };

  const handleEditPending = (p: StudentPayment) => {
    setIsEditing(p.id);
    setShowErrors(false);
    const match = p.className.match(/(.*) \((.*)\) - (.*)/);
    if (match) { setPayForm({ subject: match[1], level: match[2], room: match[3], amount: p.amount, date: p.date, receiptData: p.receiptData || '' }); }
    else { setPayForm({ ...payForm, subject: p.className, amount: p.amount, date: p.date, receiptData: p.receiptData || '' }); }
    setTimeout(() => { const formEl = document.getElementById('form-bayar'); if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
  };

  const executeDeletePayment = async () => {
    if (!confirmDeletePayment) return;
    setLoading(true);
    try {
      await supabase.from('student_payments').delete().eq('id', confirmDeletePayment.id);
      if (refreshAllData) await refreshAllData();
      setConfirmDeletePayment(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e: any) { alert("Gagal menghapus laporan: " + e.message); } finally { setLoading(false); }
  };

  const handleConfirmAbsen = async () => {
  if (!confirmingAbsen) return;
  setLoading(true);
  try {
    // ✅ GANTI: Sekarang insert ke student_attendance
    const payload = { 
      id: `STU-${Date.now()}`, 
      packageid: confirmingAbsen.course.id, // ID PEMBAYARAN
      studentname: normalizedUserName,
      sessionnumber: confirmingAbsen.sessionNum,
      date: selectedAbsenDate, 
      clockin: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date()), 
      duration: 2,
      classname: confirmingAbsen.course.className.toUpperCase(),
      level: 'BASIC', // Bisa hardcode atau ambil dari course
      sessioncategory: 'REGULER'
    };
    
    // ✅ GANTI TABLE-NYA!
    await supabase.from('student_attendance').insert([payload]);
    
    if (refreshAllData) await refreshAllData();
    setConfirmingAbsen(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  } catch (e: any) { alert(e.message); } finally { setLoading(false); }
};

  const executeUpdateSessionDate = async () => {
  if (!showEditDateModal || !editDateValue) return;
  setLoading(true);
  try {
    // ✅ GANTI TABLE-NYA!
    await supabase.from('student_attendance').update({ date: editDateValue }).eq('id', showEditDateModal.id);
    
    if (refreshAllData) await refreshAllData();
    setShowEditDateModal(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  } catch (e: any) { alert("Gagal update tanggal: " + e.message); } finally { setLoading(false); }
};

  const handleRequestReport = async () => {
  if (!selectedTeacherForReport || !requestingReportFor) return alert("Pilih Guru Pembimbing dulu ya! ✨");
  
// CEK: Apakah ini klaim ulang setelah rejected?
const isReclaimAfterRejected = myReports.some(r =>  // 👈 GANTI myLogs jadi myReports
  r.packageId === requestingReportFor.id && 
  r.status === 'REPORT_REJECTED'
);
  
  // Kalau klaim ulang dari rejected -> langsung eksekusi tanpa modal konfirmasi
  if (isReclaimAfterRejected) {
    executeFinalRequestReport();
  } else {
    // Kalau klaim pertama kali -> tampilkan modal warning
    setShowFinalConfirmation(true);
  }
};

const executeFinalRequestReport = async () => {
  if (!selectedTeacherForReport || !requestingReportFor) return;
  setLoading(true);
  try {
    const teacher = teachers.find(t => t.id === selectedTeacherForReport);
    
    // ✅ PAYLOAD LENGKAP SESUAI TABEL REPORTS
    const payload = { 
      id: `REQ-${Date.now()}`, 
      teacherid: selectedTeacherForReport, 
      teachername: (teacher?.name || 'GURU').toUpperCase(), 
      date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()), 
      status: 'REQ',  // ✅ GANTI JADI 'REQ'
      classname: requestingReportFor.className.toUpperCase(), 
      level: requestingReportFor.level || 'BASIC',  // ✅ TAMBAH
      sessioncategory: requestingReportFor.sessionCategory || 'REGULER',  // ✅ TAMBAH
      packageid: requestingReportFor.id, 
      sessionnumber: 6,  // ✅ TAMBAH
      studentsattended: [normalizedUserName], 
      studentscores: {},  // ✅ TAMBAH
      studenttopics: {},  // ✅ TAMBAH
    };
    
    // ✅ GANTI KE TABEL REPORTS!
    await supabase.from('reports').delete().eq('packageid', requestingReportFor.id).eq('status', 'REPORT_REJECTED');
    await supabase.from('reports').insert([payload]);
    
    if (refreshAllData) await refreshAllData();
    setRequestingReportFor(null);
    setSelectedTeacherForReport('');
    setShowFinalConfirmation(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  } catch (e: any) { 
    console.error('❌ ERROR INSERT REPORT:', e);
    alert(`Gagal mengajukan rapot: ${e.message}`); 
  } finally { 
    setLoading(false); 
  }
};

const handleDownloadPDFReport = async (course: any) => {
  const reportLog = findOfficialReportLog(course);
  if (!reportLog) return alert("Rapot belum siap diunduh! Tunggu Guru selesai input nilai ya. ✨");

  const rawScores = reportLog.studentScores ? Object.values(reportLog.studentScores)[0] : null;
  const scores: number[] = Array.isArray(rawScores) ? rawScores : [];
  const rawTopics = reportLog.studentTopics ? Object.values(reportLog.studentTopics)[0] : null;
  const topics: string[] = Array.isArray(rawTopics) ? rawTopics : [];
  const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
  const isPass = avg >= 80;
  const matpelMatch = reportLog.className?.match(/(.*) \((.*)\) - (.*)/);
  const subject = matpelMatch ? matpelMatch[1] : (reportLog.className || "PROGRAM SANUR");
  const level = matpelMatch ? matpelMatch[2] : (reportLog.level || 'BASIC');
  const verifyUrl = `https://sanur-verify.vercel.app/verify?id=${reportLog.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`;
  const logoUrl = `https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/SANUR%20Logo.png`;
  const formatDate = (d: string) => { if (!d || !d.includes('-')) return d; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };

  const mainColor = isPass ? '#1e3a8a' : '#ea580c';
  const accentColor = isPass ? '#2563eb' : '#ea580c';
  const gradientSidebar = isPass
    ? 'linear-gradient(180deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'
    : 'linear-gradient(180deg, #f97316 0%, #ea580c 50%, #dc2626 100%)';
  const gradientBox = isPass
    ? 'linear-gradient(135deg, #1e3a8a, #0f172a)'
    : 'linear-gradient(135deg, #ea580c, #0f172a)';

  const tableRows = scores.map((score, i) => `
    <tr style="border-bottom: 1px solid #f1f5f9; height: 78px;">
      <td style="padding: 0 35px; vertical-align: middle;">
        <span style="font-weight:900; color:#1e293b; font-size:20px; text-transform:uppercase; letter-spacing:-0.01em; line-height:1.1; display:block;">
          ${topics[i] || 'MATERI PEMBELAJARAN'}
        </span>
      </td>
      <td style="text-align:center; vertical-align:middle;">
        <span style="font-weight:900; color:${accentColor}; font-size:20px;">${score}</span>
        <span style="color:#94a3b8; font-weight:700; font-size:11px;">/100</span>
      </td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rapot_Sanur_${user.name.toUpperCase().replace(/\s+/g, '_')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;0,900;1,700;1,900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', serif;
      background: #111;
    }

    .page-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100vw;
      min-height: 100vh;
      background: #111;
      padding: 40px 0;
    }

    .page-landscape {
      width: 297mm;
      height: 210mm;
      background: white;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 25px double ${mainColor};
      flex-shrink: 0;
    }

    .page-landscape-inner {
      width: 100%;
      height: 100%;
      border: 4px solid #cbd5e1;
      display: flex;
      flex-direction: row;
      box-sizing: border-box;
    }

    .page-portrait {
      width: 210mm;
      height: 297mm;
      background: white;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 70px 60px;
      flex-shrink: 0;
    }

    @media print {
      @page:first { size: A4 landscape; margin: 0; }
      @page { size: A4 portrait; margin: 0; }
      body { background: white; margin: 0; }
      .page-wrapper {
        display: block;
        width: auto;
        min-height: auto;
        padding: 0;
        background: white;
      }
      .page-landscape { page-break-after: always; border: 25px double ${mainColor}; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

<div class="no-print" style="position:fixed; top:16px; right:16px; z-index:9999;">
  <button onclick="document.getElementById('print-modal').style.display='flex'" style="background:#2563eb; color:white; border:none; padding:10px 24px; border-radius:12px; font-weight:900; font-size:13px; cursor:pointer; text-transform:uppercase; letter-spacing:0.1em;">
    🖨️ Print / Save PDF
  </button>
</div>

<!-- MODAL PANDUAN -->
<div id="print-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999; align-items:center; justify-content:center;">
  <div style="background:white; border-radius:24px; padding:40px; max-width:480px; width:90%; box-shadow:0 25px 60px rgba(0,0,0,0.4);">
    
    <h2 style="font-size:20px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:-0.02em; margin-bottom:6px;">📄 Cara Save sebagai PDF</h2>
    <p style="font-size:13px; color:#64748b; margin-bottom:28px;">Ikuti langkah berikut agar sertifikat tersimpan dengan benar</p>

    <!-- STEP 1 -->
    <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:20px;">
      <div style="width:32px; height:32px; background:#2563eb; color:white; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; flex-shrink:0;">1</div>
      <div>
        <p style="font-weight:900; color:#0f172a; font-size:14px; margin-bottom:2px;">Pilih Destination: <span style="color:#2563eb;">Save as PDF</span></p>
        <p style="font-size:12px; color:#64748b;">Di dialog print yang muncul, ganti printer ke <strong>"Save as PDF"</strong></p>
      </div>
    </div>

    <!-- STEP 2 -->
    <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:20px;">
      <div style="width:32px; height:32px; background:#2563eb; color:white; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; flex-shrink:0;">2</div>
      <div>
        <p style="font-weight:900; color:#0f172a; font-size:14px; margin-bottom:2px;">Centang <span style="color:#2563eb;">Background Graphics</span></p>
        <p style="font-size:12px; color:#64748b;">Klik <strong>"More settings"</strong> lalu centang <strong>"Background graphics"</strong> — agar warna, gradient, dan gambar ikut tercetak</p>
      </div>
    </div>

    <!-- STEP 3 -->
    <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:32px;">
      <div style="width:32px; height:32px; background:#2563eb; color:white; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; flex-shrink:0;">3</div>
      <div>
        <p style="font-weight:900; color:#0f172a; font-size:14px; margin-bottom:2px;">Klik <span style="color:#2563eb;">Save</span></p>
        <p style="font-size:12px; color:#64748b;">Pilih lokasi penyimpanan dan klik <strong>"Save"</strong></p>
      </div>
    </div>

    <!-- TOMBOL -->
    <div style="display:flex; gap:12px;">
      <button onclick="document.getElementById('print-modal').style.display='none'" style="flex:1; padding:12px; border:2px solid #e2e8f0; background:white; border-radius:12px; font-weight:900; font-size:13px; cursor:pointer; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">
        Batal
      </button>
      <button onclick="document.getElementById('print-modal').style.display='none'; window.print();" style="flex:2; padding:12px; background:#2563eb; color:white; border:none; border-radius:12px; font-weight:900; font-size:13px; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em;">
        🖨️ Mengerti, Lanjut Print!
      </button>
    </div>

  </div>
</div>

<!-- HALAMAN 1: SERTIFIKAT LANDSCAPE -->
<div class="page-wrapper">
  <div class="page-landscape">
    <div class="page-landscape-inner">

      <!-- SIDEBAR QR -->
      <div style="width:140px; background:${gradientSidebar}; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px 15px; flex-shrink:0;">
        <div style="background:white; padding:12px; border-radius:15px; box-shadow:0 4px 12px rgba(0,0,0,0.2);">
          <img src="${qrUrl}" style="width:100px; height:100px; display:block;" />
        </div>
        <p style="font-size:8px; font-weight:900; color:white; text-align:center; margin-top:12px; text-transform:uppercase; letter-spacing:0.1em;">Scan untuk verifikasi</p>
      </div>

      <!-- KONTEN UTAMA -->
      <div style="flex:1; display:flex; flex-direction:column; padding:50px 80px;">

        <!-- LOGO -->
        <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:50px;">
          <img src="${logoUrl}" style="max-width:240px; max-height:80px; object-fit:contain;" />
        </div>

        <!-- BODY -->
        <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
          <h2 style="font-size:38px; font-family:serif; font-style:italic; color:${mainColor}; margin:0 0 25px 0;">
            ${isPass ? 'Sertifikat Kelulusan' : 'Capaian Pembelajaran'}
          </h2>
          <p style="font-size:14px; font-family:serif; font-style:italic; color:#64748b; margin:0 0 15px 0;">Diberikan kepada:</p>
          <div style="display:inline-block; margin-bottom:40px;">
            <h3 style="font-size:34px; font-weight:900; color:${accentColor}; text-transform:uppercase; letter-spacing:0.05em; margin:0; line-height:1.1;">
              ${user.name.toUpperCase()}
            </h3>
            <div style="width:100%; height:4px; background:${isPass ? '#dbeafe' : '#ffedd5'}; margin-top:10px; border-radius:10px;"></div>
          </div>
          <p style="font-size:14px; font-family:serif; font-style:italic; color:#475569; line-height:1.7; margin:0 0 8px 0; padding:0 100px;">
            ${isPass ? 'Telah menyelesaikan seluruh materi pelatihan dan lulus dalam ujian standar kompetensi' : 'Telah berkomitmen mengikuti dan menyelesaikan seluruh rangkaian program pelatihan'}
          </p>
          <p style="font-size:14px; font-family:serif; font-style:italic; color:${mainColor}; font-weight:700; margin:0 0 40px 0;">
            Sanur Akademi Inspirasi
          </p>
          <div style="background:${gradientBox}; width:700px; padding:30px 20px; border-radius:35px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 12px 30px -8px rgba(0,0,0,0.15); margin-bottom:50px;">
            <p style="font-size:22px; font-weight:900; color:white; text-transform:uppercase; font-style:italic; margin:0; line-height:1.2;">${subject}</p>
            <p style="font-size:16px; font-weight:900; color:rgba(255,255,255,0.8); text-transform:uppercase; letter-spacing:0.3em; margin:8px 0 0 0;">LEVEL ${level}</p>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:auto;">
          <div style="text-align:center;">
            <p style="font-size:9px; font-weight:900; color:${isPass ? '#60a5fa' : '#fb923c'}; text-transform:uppercase; letter-spacing:0.2em; margin-bottom:3px;">Tanggal Terbit</p>
            <p style="font-size:13px; font-weight:900; color:#64748b; font-style:italic;">${formatDate(reportLog.date)}</p>
          </div>
          <div style="text-align:center;">
            <p style="font-size:9px; font-weight:900; color:${isPass ? '#60a5fa' : '#fb923c'}; text-transform:uppercase; letter-spacing:0.2em; margin-bottom:3px;">ID Sertifikat</p>
            <p style="font-size:11px; font-weight:900; color:#64748b; font-style:italic;">${reportLog.id.toUpperCase()}</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</div>

<!-- HALAMAN 2: TRANSKRIP PORTRAIT -->
<div class="page-wrapper">
  <div class="page-portrait">

    <!-- HEADER -->
    <div style="display:flex; align-items:flex-end; gap:16px; margin-bottom:20px;">
      <div style="width:52px; height:52px; background:#0f172a; color:white; border-radius:18px; display:flex; align-items:center; justify-content:center; transform:rotate(6deg); flex-shrink:0;">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
      </div>
      <h1 style="font-size:34px; font-weight:900; font-style:italic; color:#1e293b; text-transform:uppercase; letter-spacing:-0.05em; line-height:1;">
        Transkrip <span style="color:${accentColor};">Nilai</span>
      </h1>
    </div>

    <!-- SUBHEADER -->
    <div style="margin-bottom:30px; display:flex; justify-content:space-between; align-items:flex-end;">
      <p style="font-size:13px; font-weight:900; color:${accentColor}; text-transform:uppercase; letter-spacing:0.3em; margin:0;">📚 MATERI KURIKULUM</p>
      <div style="display:flex; flex-direction:column; align-items:flex-end; text-align:right;">
        <p style="font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:0.3em; margin:0 -0.3em 3px 0;">Guru Penilai</p>
        <p style="font-size:13px; font-weight:900; color:#1e293b; text-transform:uppercase; letter-spacing:0.05em; margin:0 -0.05em 0 0; white-space:nowrap;">${reportLog.teacherName || '-'}</p>
      </div>
    </div>

    <!-- TABEL -->
    <div style="background:white; border-radius:35px; border:3px solid #f1f5f9; overflow:hidden; margin-bottom:30px;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#0f172a; color:white;">
            <th style="padding:14px; text-align:center; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">Materi</th>
            <th style="padding:14px; text-align:center; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; width:120px;">Nilai</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    <!-- FOOTER TRANSKRIP -->
    <div style="padding:30px 40px; background:#0f172a; border-radius:42px; color:white; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden;">
      <div style="position:absolute; top:0; right:0; width:230px; height:230px; background:rgba(255,255,255,0.05); border-radius:999px; margin-right:-130px; margin-top:-130px;"></div>
      <div style="position:relative; z-index:10;">
        <p style="font-size:9px; font-weight:900; color:#60a5fa; text-transform:uppercase; letter-spacing:0.5em; margin-bottom:4px;">Evaluasi Kumulatif</p>
        <div style="display:flex; align-items:baseline; gap:14px;">
          <p style="font-size:15px; font-weight:900; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.1em;">RATA-RATA:</p>
          <h4 style="font-size:60px; font-weight:900; font-style:italic; letter-spacing:-0.05em;">${avg}</h4>
          <span style="font-size:18px; color:rgba(255,255,255,0.3); font-weight:900; font-style:italic;">/ 100</span>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.1); padding:18px 24px; border-radius:25px; border:1px solid rgba(255,255,255,0.2); border-bottom:6px solid ${isPass ? '#10b981' : '#f97316'}; text-align:center; min-width:190px; position:relative; z-index:10;">
        <p style="font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#93c5fd; margin-bottom:5px;">Status Capaian</p>
        <p style="font-size:17px; font-weight:900; font-style:italic; text-transform:uppercase;">${isPass ? 'KOMPETEN' : 'REMEDIAL'}</p>
      </div>
    </div>

  </div>
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
  }
};

  const handleDownloadSlipDirect = async (p: StudentPayment) => {
  setShowDigitalSlip(p);
  setDownloadingPaymentId(p.id); // 👈 Tandai payment ini yang lagi didownload
  setTimeout(async () => {
    if (!slipRef.current) { 
      setDownloadingPaymentId(null); // 👈 Reset
      setShowDigitalSlip(null); 
      return; 
    }
    try {
      const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true, logging: false, width: 700 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'px', [700, 1000]);
      pdf.addImage(imgData, 'PNG', 0, 0, 700, 1000);
      pdf.save(`Kuitansi_Sanur_${p.studentName.replace(/\s+/g, '_')}_${p.id.substring(0,8)}.pdf`);
    } catch (e) { 
      alert("Gagal download PDF"); 
    } finally { 
      setDownloadingPaymentId(null); // 👈 Reset setelah selesai
      setShowDigitalSlip(null); 
    }
  }, 500);
};

  const getDisplayAmount = (amt: number) => {
    return amt > 0 ? `Rp ${amt}` : 'Rp ';
  };

  const handleFetchReceiptPreview = async (payId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('student_payments').select('receiptdata').eq('id', payId).single();
      if (error) throw error;
      if (data?.receiptdata) setPreviewModal(data.receiptdata);
      else alert("Foto tidak ditemukan.");
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
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

  @keyframes glowPulse {
    0%, 100% {
      box-shadow: 0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2);
      border-color: rgba(249, 115, 22, 0.6);
    }
    50% {
      box-shadow: 0 0 30px rgba(249, 115, 22, 0.6), 0 0 60px rgba(249, 115, 22, 0.3);
      border-color: rgba(249, 115, 22, 0.9);
    }
  }

  @keyframes highlightFade {
    0% {
      background-color: rgba(254, 243, 199, 0.6);
    }
    100% {
      background-color: transparent;
    }
  }

  .edit-mode-glow {
    animation: glowPulse 2s ease-in-out 3;
  }

  .edit-mode-highlight {
    animation: highlightFade 4s ease-out forwards;
  }
`}</style>

      <div className="max-w-6xl mx-auto space-y-8 pb-40 px-4">
      {(activeDownloadId || loading) && (
        <ModalPortal>
  <div data-modal-container className="fixed inset-0 z-[300000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
     <div className="bg-white w-full max-w-[320px] rounded-[2rem] p-10 shadow-2xl flex flex-col items-center text-center space-y-6 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-xl animate-bounce">
                {activeDownloadId ? <FileDown size={32} /> : <Loader2 size={32} className="animate-spin" />}
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-800 uppercase italic leading-none">{activeDownloadId ? 'Memproses PDF' : 'Memproses Data'}</h4>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Tunggu sebentar ya... ✨</p>
              </div>
              {activeDownloadId && (
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Progress</span>
                    <span className="text-[10px] font-black text-emerald-600 italic">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${downloadProgress}%` }}></div>
                  </div>
                </div>
              )}
           </div>
        </div>
        </ModalPortal>
      )}

      <header className="relative py-16 px-12 bg-emerald-600 rounded-[4rem] text-white shadow-2xl overflow-hidden group">
         <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-6 text-center md:text-left flex-1">
               <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30"><Stars size={18} className="text-yellow-300" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Sanur Student Portal</span></div>
               <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-normal Kalimat leading-none">{isPaymentView ? "RIWAYAT BAYAR " : "RUANG BELAJAR "} <br/><span className="text-yellow-300">{firstName} ✨</span></h1>
               <div className="min-h-[60px] flex items-center justify-center md:justify-start"><p className="text-sm font-bold italic text-emerald-50 Kalimat leading-relaxed max-w-xl">"{motivationalQuotes[quoteIndex]}"</p></div>
            </div>
            <div className="w-44 h-44 bg-white/10 backdrop-blur-xl rounded-[3.5rem] flex items-center justify-center shadow-2xl shrink-0 group/icon cursor-pointer active:scale-90 transition-all duration-300">
               {isPaymentView ? (
                 <Rocket size={90} className="text-orange-400 group-hover/icon:-translate-y-4 group-hover/icon:translate-x-4 group-hover/icon:scale-125 group-hover/icon:rotate-12 transition-all duration-500" />
               ) : (
                 <Trophy size={90} className="text-yellow-400 group-hover/icon:scale-125 group-hover/icon:rotate-[360deg] transition-all duration-1000" />
               )}
            </div>
         </div>
      </header>

      {!isPaymentView && (
        <div className="mx-2 bg-emerald-50/60 backdrop-blur-sm border-2 border-dashed border-emerald-200/60 rounded-[3rem] p-8 shadow-sm flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 group">
           <div className="w-14 h-14 bg-white text-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-emerald-100 animate-pulse transition-all">
              <Info size={28} />
           </div>
           <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                 <Sparkles size={14} className="text-emerald-400" />
                 <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest leading-relaxed">
                    "Sertif & Rapot segera disimpan ya 😊, karena jika akun sudah tidak digunakan / tidak ada kelas aktif selama <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg">lebih dari 6 bulan</span>, akun akan dihapus pengurus demi kelancaran sistem."
                 </p>
              </div>
           </div>
        </div>
      )}

      {isPaymentView && (
        <div className="mx-2 bg-orange-50/60 backdrop-blur-sm border-2 border-dashed border-orange-200/60 rounded-[3rem] p-8 shadow-sm flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 group">
           <div className="w-14 h-14 bg-white text-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-orange-100 animate-pulse transition-all">
              <Zap size={28} />
           </div>
           <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                 <Sparkles size={14} className="text-orange-400" />
                 <p className="text-[11px] font-black text-orange-800 uppercase tracking-widest leading-relaxed">
                    "Lapor bayar di sini ya! ✨ Setelah kirim, status akan <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded-lg">PENDING</span> (sedang dicek Admin). Jika sudah <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg">BERHASIL</span>, silakan unduh Kuitansi resmi dan kelas otomatis aktif di menu "Kelas Saya"! 🚀"
                 </p>
              </div>
           </div>
        </div>
      )}

      {isPaymentView ? (
        <section className="space-y-12">
           <div 
  id="form-bayar" 
  className={`bg-white p-12 md:p-16 rounded-[4rem] border-2 shadow-2xl space-y-12 relative overflow-hidden scroll-mt-32 transition-colors duration-500 ${
    isEditing 
      ? 'border-orange-500 edit-mode-glow edit-mode-highlight' 
      : 'border-slate-50'
  }`}
>
  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50"></div>
  
  {isEditing && (
    <div className="absolute top-6 right-6 z-30 flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-xl animate-pulse">
      <Edit3 size={16} strokeWidth={3} className="animate-spin" style={{animationDuration: '3s'}} />
      <span className="text-[10px] font-black uppercase tracking-widest">MODE UPDATE</span>
    </div>
  )}
  
  <div className="flex items-center gap-8 relative z-10"><div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center shadow-inner shrink-0"><Receipt size={36} /></div><div><h3 className="text-3xl font-black text-slate-800 uppercase italic leading-none">{isEditing ? 'Update Laporan' : 'Lapor Bayar'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Pastikan bukti transfer jelas ya ✨</p></div>{isEditing && <button onClick={resetForm} className="ml-auto p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Mata Pelajaran</label>
                  <select 
                    value={payForm.subject} 
                    onChange={e => { setPayForm({...payForm, subject: e.target.value}); setShowErrors(false); }} 
                    className={`w-full px-8 py-6 rounded-[2rem] font-black text-xs uppercase outline-none transition-all shadow-inner h-[72px] border-2 ${showErrors && !payForm.subject ? 'border-rose-500 bg-rose-50' : 'border-transparent bg-slate-50 focus:bg-white focus:border-orange-500'}`}
                  >
                    <option value="">-- PILIH MATPEL --</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Level Belajar</label>
                  <select value={payForm.level} onChange={e => setPayForm({...payForm, level: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs outline-none focus:bg-white border-2 border-transparent focus:border-orange-500 h-[72px]">{levels.map(l => <option key={l} value={l}>{l}</option>)}</select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Ruangan</label>
                  <select 
                    value={payForm.room} 
                    onChange={e => { setPayForm({...payForm, room: e.target.value}); setShowErrors(false); }} 
                    className={`w-full px-8 py-6 rounded-[2rem] font-black text-xs uppercase outline-none transition-all shadow-inner h-[72px] border-2 ${showErrors && !payForm.room ? 'border-rose-500 bg-rose-50' : 'border-transparent bg-slate-50 focus:bg-white focus:border-orange-500'}`}
                  >
                    <option value="">-- PILIH RUANGAN --</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nominal Transfer (Rp)</label>
                  <input 
                    type="text" 
                    placeholder="Rp 720000" 
                    value={getDisplayAmount(payForm.amount)} 
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, ''); 
                      setPayForm({...payForm, amount: parseInt(raw) || 0});
                      setShowErrors(false);
                    }} 
                    className={`w-full h-[72px] px-8 py-6 rounded-[2rem] font-black text-xl italic outline-none transition-all shadow-inner border-2 ${showErrors && !payForm.amount ? 'border-rose-500 bg-rose-50' : 'border-transparent bg-slate-50 focus:bg-white focus:border-orange-500'}`} 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Tanggal</label>
                  <input type="date" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] font-black text-xs outline-none h-[72px]" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Bukti Transfer</label>
                  <div className="flex gap-2">
                    {payForm.receiptData ? (
                      <div className="flex-1 flex gap-2 h-[72px]">
                        <button onClick={() => setPreviewModal(payForm.receiptData)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-[2rem] font-black text-[10px] uppercase border-2 border-emerald-100 flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all shadow-sm">
                          <Eye size={18}/> PREVIEW
                        </button>
                        <button onClick={() => setPayForm({...payForm, receiptData: ''})} className="w-16 h-full bg-rose-50 text-rose-500 rounded-[1.5rem] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                          <Trash2 size={20}/>
                        </button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className={`w-full py-6 rounded-[2rem] font-black text-[10px] uppercase shadow-inner border-2 border-dashed h-[72px] transition-all ${showErrors && !payForm.receiptData ? 'border-rose-500 bg-rose-50' : 'border-orange-200 bg-orange-50 text-orange-600'}`}
                        >
                          {loading ? 'COMPRESSING...' : 'UPLOAD BUKTI'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={handleLaporBayar} disabled={loading} className="w-full py-8 bg-emerald-600 text-white rounded-[3rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">{loading ? <Loader2 size={24} className="animate-spin" /> : <><Rocket size={24} /> {isEditing ? 'UPDATE LAPORAN ✨' : 'KIRIM LAPORAN ✨'}</>}</button>
           </div>

           <div id="riwayat-pembayaran" className="space-y-8">
              <div className="flex items-center gap-4 px-6"><div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><History size={24}/></div><h3 className="text-2xl font-black text-slate-800 uppercase italic">Riwayat Pembayaran</h3></div>
              {uniquePaymentSubjects.length > 2 && (
                <div className="flex flex-wrap gap-2 px-2">
                  {uniquePaymentSubjects.map(subject => (
                    <button
                      key={subject}
                      onClick={() => setActivePaymentFilter(subject)}
                      className={`px-5 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${
                        activePaymentFilter === subject
                          ? 'bg-emerald-600 text-white shadow-lg'
                          : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-emerald-300'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-6">
                 {myPayments
                   .filter(p => {
                     if (activePaymentFilter === 'SEMUA') return true;
                     const name = (p.className || '').replace(/\s*\(.*?\)\s*-\s*REGULER\s*\d+/i, '').trim();
                     return name === activePaymentFilter;
                   })
                   .map((p, i) => (
                    <div key={p.id || i} className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between group hover:border-emerald-500 transition-all gap-8 relative overflow-hidden">
                       
                       {p.status === 'PENDING' && (
                         <button 
                           onClick={() => setConfirmDeletePayment(p)}
                           className="absolute top-0 right-0 p-5 md:p-6 bg-rose-600 text-white rounded-bl-[2.5rem] hover:bg-rose-700 transition-all shadow-xl z-20 flex items-center justify-center group/del"
                           title="Hapus Laporan"
                         >
                           <X size={22} strokeWidth={4} className="group-hover/del:scale-125 transition-transform" />
                         </button>
                       )}

                       <div className="flex-1 flex items-center gap-8 min-w-0">
                         <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-inner shrink-0 ${p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FFF5F2] text-[#FF4500]'}`}>
                           {p.status === 'VERIFIED' ? <BadgeCheck size={40} /> : <Clock size={40} />}
                         </div>
                         <div className="min-w-0 flex-1">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{formatDateToDMY(p.date)}</p>
                           <h4 className="font-black text-slate-800 text-lg uppercase italic leading-tight pr-14 md:pr-0">{p.className}</h4>
                           <div className="flex items-center gap-4 mt-3">
                             <span className={`px-5 py-2 rounded-full text-[8px] font-black uppercase tracking-widest shadow-md ${p.status === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-[#FF4500] text-white'}`}>
                               {p.status === 'VERIFIED' ? 'BERHASIL' : 'PENDING'}
                             </span>
                           </div>
                         </div>
                       </div>

                       <div className="flex flex-col md:flex-row items-center gap-10">
                         <div className="text-center md:text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NOMINAL</p>
                           <p className={`text-2xl font-black italic ${p.status === 'VERIFIED' ? 'text-emerald-600' : 'text-slate-800'}`}>Rp {p.amount.toLocaleString()}</p>
                         </div>
                         
                         <div className="flex gap-3">
                           {p.status === 'PENDING' ? (
                             <>
                               <button onClick={() => handleFetchReceiptPreview(p.id)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Eye size={24}/></button>
                               <button onClick={() => handleEditPending(p)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-orange-500 hover:text-white transition-all"><Edit3 size={24}/></button>
                             </>
                           ) : (
                             <div className="flex gap-3">
  <button 
    onClick={() => handleDownloadSlipDirect(p)} 
    disabled={downloadingPaymentId === p.id} 
    className="px-6 py-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 min-w-[120px] flex items-center justify-center"
    title={downloadingPaymentId === p.id ? "Memproses PDF..." : "Cetak Kuitansi"}
  >
    {downloadingPaymentId === p.id ? (
      <Loader2 size={24} className="animate-spin" />
    ) : (
      <Printer size={24} />
    )}
  </button>
</div>
                           )}
                         </div>
                       </div>
                    </div>
                 ))}
                 {myPayments.length === 0 && (
                   <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 opacity-20"><History size={48} className="mx-auto mb-4" /><p className="text-[11px] font-black uppercase tracking-[0.3em]">Belum ada riwayat pembayaran.</p></div>
                 )}
              </div>
           </div>
        </section>
      ) : (
        <section className="space-y-10">
   {uniqueSubjects.length > 2 && (
     <div className="flex flex-wrap gap-2 px-2">
       {uniqueSubjects.map(subject => (
         <button
           key={subject}
           onClick={() => setActiveFilter(subject)}
           className={`px-5 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${
             activeFilter === subject
               ? 'bg-emerald-600 text-white shadow-lg'
               : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-emerald-300'
           }`}
         >
           {subject}
         </button>
       ))}
     </div>
   )}
   {groupedFilteredCourses.map((group) => (
     <div key={group.name} className="space-y-6">
       <div className="bg-slate-800 text-white px-8 py-4 rounded-[2rem] shadow-lg flex items-center gap-3">
         <BookOpen size={18} className="text-white/70 shrink-0" />
         <h3 className="text-sm font-black uppercase italic tracking-wide">{group.name}</h3>
       </div>
       <div className="space-y-10">
       {group.courses.map((course, idx) => {
              // ✅ GANTI PAKAI studentAttendanceLogs
const pkgIdNorm = (course.id || '').toUpperCase().trim();
const completedSessions = studentAttendanceLogs
  .filter(l => 
    (l.packageid || '').toUpperCase().trim() === pkgIdNorm &&  
    (l.studentname || '').toUpperCase().trim() === normalizedUserName
  )
  .map(l => ({ id: l.id, num: l.sessionnumber || 0, date: l.date }));
              
              const reportLog = findOfficialReportLog(course);
              
              // LOGIKA KELULUSAN TERKINI
              const sName = normalizedUserName;
              const scores = reportLog ? (reportLog.studentScores?.[sName] as number[] || []) : [];
              const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
              const isPass = avg >= 80;

              const maxSess = new Set(completedSessions.map(s => s.num)).size;
              
              const isReportPublished = !!reportLog && reportLog.status === 'SESSION_LOG';
              const isWaitingRelease = !!reportLog && reportLog.status === 'REPORT_READY';
              const courseLogs = myReports.filter(r => r.packageId === course.id);  // ✅ GANTI myLogs → myReports!
              const isRequesting = courseLogs.some(r => r.status === 'REQ');
              const isProcessing = courseLogs.some(r => r.status === 'REPORT_PROCESSING');
              const isRejected = courseLogs.some(r => r.status === 'REPORT_REJECTED');
              const isNextClass = courseLogs.some(r => r.status === 'NEXT_CLASS');
              const requestingLog = courseLogs.find(r => r.status === 'REQ' || r.status === 'REPORT_PROCESSING' || r.status === 'REPORT_REJECTED' || r.status === 'REPORT_READY');
              const teacherDisplay = requestingLog?.teachername ? requestingLog.teachername.toUpperCase() : null;
              const displayMaxSess = (isReportPublished || isWaitingRelease) ? 6 : maxSess;
              const progressPercent = Math.min((displayMaxSess / 6) * 100, 100);

              // THEME LOGIC
              const themeColorClass = isReportPublished 
                ? (isPass ? 'bg-blue-600' : 'bg-orange-600')
                : isWaitingRelease ? 'bg-amber-500' 
                : isProcessing ? 'bg-orange-500' 
                : isRequesting ? 'bg-amber-500' 
                : isNextClass ? 'bg-purple-600'
                : isRejected ? 'bg-rose-500' 
                : 'bg-emerald-600';

              const badgeText = isReportPublished 
                ? (isPass ? 'LULUS 🎓' : 'REMEDIAL 📜') 
                : isWaitingRelease ? 'SIAP TERBIT' 
                : isProcessing ? 'SEDANG DI PROSES' 
                : isRequesting ? 'MENUNGGU PERSETUJUAN' 
                : isNextClass ? 'LANJUT KELAS BERIKUTNYA 🚀'
                : isRejected ? 'DI TOLAK' 
                : 'PAKET AKTIF ✨';

              return (
                <div key={course.id || idx} className={`bg-white rounded-[3rem] border-2 border-slate-50 shadow-2xl transition-all duration-500 overflow-hidden ${isReportPublished ? (isPass ? 'hover:border-blue-500' : 'hover:border-orange-500') : isNextClass ? 'hover:border-purple-500' : (isRequesting || isWaitingRelease || isProcessing) ? 'hover:border-amber-400' : 'hover:border-emerald-500'}`}>
                   <div className="p-8 md:p-12 flex flex-col lg:flex-row items-center gap-10">
                      <div className="flex-1 space-y-6 text-center lg:text-left w-full lg:w-auto">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                           <div className={`w-16 h-16 mx-auto lg:mx-0 ${themeColorClass} text-white rounded-2xl flex items-center justify-center shadow-lg transition-colors`}>
                              {isReportPublished ? (isPass ? <BadgeCheck size={32} /> : <AlertTriangle size={32} />) : isWaitingRelease ? <Clock size={32} /> : isRequesting ? <Clock size={32} /> : isProcessing ? <Edit3 size={32} /> : isNextClass ? <ArrowRight size={32} /> : isRejected ? <AlertTriangle size={32} /> : <BookOpen size={32} />}
                           </div>
                           <span className={`inline-flex px-5 py-1.5 mx-auto lg:mx-0 ${themeColorClass} text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-md transition-colors`}>
                              {badgeText}
                           </span>
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight leading-tight">{course.className}</h3>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID PAKET: {course.id}</p>
                        </div>
                        <div className="space-y-2">
                           <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                              <div className={`h-full rounded-full transition-all duration-1000 ${isReportPublished ? (isPass ? 'bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]') : isNextClass ? 'bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.4)]' : (isRequesting || isWaitingRelease || isProcessing) ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`} style={{ width: `${progressPercent}%` }}></div>
                           </div>
                           <p className="text-[9px] font-black uppercase text-slate-400 text-center lg:text-left">{displayMaxSess}/6 SESI</p>
                        </div>
                      </div>
                      <div className="flex-[1.5] w-full lg:w-auto">
  {isReportPublished ? (
  <div className="space-y-4">
  {/* Grid sesi dulu */}
  <div className="grid grid-cols-6 gap-2">
    {[1, 2, 3, 4, 5, 6].map(sNum => {
      const doneLog = completedSessions.find(s => s.num === sNum);
      return (
        <div key={sNum} className={`w-full p-2 h-20 md:h-24 rounded-2xl font-black border-2 flex flex-col items-center justify-center gap-1.5 ${doneLog ? (isPass ? 'bg-white border-blue-500 text-blue-600' : 'bg-white border-orange-400 text-orange-500') : 'bg-slate-50 border-transparent text-slate-200 opacity-40'}`}>
          {doneLog ? (
            <>
              <p className={`text-[7px] font-black mb-1 leading-none ${isPass ? 'text-blue-500' : 'text-orange-400'}`}>{formatDateToDMY(doneLog.date)}</p>
              <Check size={16} strokeWidth={4}/>
            </>
          ) : (
            <span className="text-xl">{sNum}</span>
          )}
          <p className="text-[6px] md:text-[7px] font-black uppercase">{doneLog ? 'DONE' : `SESI ${sNum}`}</p>
        </div>
      );
    })}
  </div>
  {/* Banner lulus/remedial di bawah */}
  <div className={`${isPass ? 'bg-blue-600' : 'bg-orange-600'} p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden`}>
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
      <div className="flex items-center gap-5 text-left">
        <div className={`w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0 ${isPass ? 'animate-bounce' : ''}`}>
          {isPass ? <PartyPopper size={28}/> : <Zap size={28}/>}
        </div>
        <div>
          <h4 className="text-2xl font-black uppercase italic leading-none">{isPass ? 'KAMU LULUS! 🎉' : 'SESI SELESAI!'}</h4>
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 mt-1">
            {isPass ? 'Selamat! Sertifikat & Rapotmu sudah terbit ✨' : 'Kamu hebat sudah belajar sampai akhir! Terus semangat ya ✨'}
          </p>
        </div>
      </div>
      <button onClick={() => handleDownloadPDFReport(course)} disabled={!!activeDownloadId} className={`px-8 py-4 bg-white ${isPass ? 'text-blue-600' : 'text-orange-600'} rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all shrink-0`}>
        {activeDownloadId === course.id ? <Loader2 className="animate-spin" size={16} /> : <Download size={18}/>} UNDUH RAPOT
      </button>
    </div>
  </div>
</div>
) : isWaitingRelease ? (
  <div className="space-y-4">
    <div className="grid grid-cols-6 gap-2">
      {[1, 2, 3, 4, 5, 6].map(sNum => {
        const doneLog = completedSessions.find(s => s.num === sNum);
        return (
          <div key={sNum} className={`w-full p-2 h-20 md:h-24 rounded-2xl font-black border-2 flex flex-col items-center justify-center gap-1.5 ${doneLog ? 'bg-white border-amber-400 text-amber-600' : 'bg-slate-50 border-transparent text-slate-200 opacity-40'}`}>
            {doneLog ? (<><p className="text-[7px] font-black mb-1 leading-none text-amber-500">{formatDateToDMY(doneLog.date)}</p><Check size={16} strokeWidth={4}/></>) : (<span className="text-xl">{sNum}</span>)}
            <p className="text-[6px] md:text-[7px] font-black uppercase">{doneLog ? 'DONE' : `SESI ${sNum}`}</p>
          </div>
        );
      })}
    </div>
    <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex items-center gap-4">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shrink-0"><Zap size={20}/></div>
      <div><p className="text-[10px] font-black text-amber-800 uppercase italic">Penilaian Selesai!</p>{teacherDisplay && <p className="text-[9px] font-black text-amber-700 uppercase mt-0.5">Guru: {teacherDisplay}</p>}<p className="text-[9px] font-bold text-amber-600 uppercase mt-1">Tunggu Guru Mengirimkan Rapotmu Ke Sini ✨</p></div>
    </div>
  </div>
) : isRequesting ? (
  <div className="space-y-4">
    <div className="grid grid-cols-6 gap-2">
      {[1, 2, 3, 4, 5, 6].map(sNum => {
        const doneLog = completedSessions.find(s => s.num === sNum);
        return (
          <div key={sNum} className={`w-full p-2 h-20 md:h-24 rounded-2xl font-black border-2 flex flex-col items-center justify-center gap-1.5 ${doneLog ? 'bg-white border-amber-400 text-amber-600' : 'bg-slate-50 border-transparent text-slate-200 opacity-40'}`}>
            {doneLog ? (<><p className="text-[7px] font-black mb-1 leading-none text-amber-500">{formatDateToDMY(doneLog.date)}</p><Check size={16} strokeWidth={4}/></>) : (<span className="text-xl">{sNum}</span>)}
            <p className="text-[6px] md:text-[7px] font-black uppercase">{doneLog ? 'DONE' : `SESI ${sNum}`}</p>
          </div>
        );
      })}
    </div>
    <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex items-center gap-4">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shrink-0"><Clock size={20}/></div>
      <div><p className="text-[10px] font-black text-amber-800 uppercase italic leading-none">Sedang Meminta Persetujuan Guru Untuk Rapot</p>{teacherDisplay && <p className="text-[9px] font-black text-amber-700 uppercase mt-0.5">Guru: {teacherDisplay}</p>}<p className="text-[9px] font-bold text-amber-600 uppercase mt-1">Tunggu Guru Menerima Permintaanmu Ya ✨</p></div>
    </div>
  </div>
) : isProcessing ? (
  <div className="space-y-4">
    <div className="grid grid-cols-6 gap-2">
      {[1, 2, 3, 4, 5, 6].map(sNum => {
        const doneLog = completedSessions.find(s => s.num === sNum);
        return (
          <div key={sNum} className={`w-full p-2 h-20 md:h-24 rounded-2xl font-black border-2 flex flex-col items-center justify-center gap-1.5 ${doneLog ? 'bg-white border-orange-400 text-orange-600' : 'bg-slate-50 border-transparent text-slate-200 opacity-40'}`}>
            {doneLog ? (<><p className="text-[7px] font-black mb-1 leading-none text-orange-500">{formatDateToDMY(doneLog.date)}</p><Check size={16} strokeWidth={4}/></>) : (<span className="text-xl">{sNum}</span>)}
            <p className="text-[6px] md:text-[7px] font-black uppercase">{doneLog ? 'DONE' : `SESI ${sNum}`}</p>
          </div>
        );
      })}
    </div>
    <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 flex items-center gap-4">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 shrink-0"><Edit3 size={20}/></div>
      <div><p className="text-[10px] font-black text-orange-800 uppercase italic leading-none">Sedang Di Proses</p>{teacherDisplay && <p className="text-[9px] font-black text-orange-700 uppercase mt-0.5">Guru: {teacherDisplay}</p>}<p className="text-[9px] font-bold text-orange-600 uppercase mt-1">Sertifikat & Rapotmu Sedang Diisi Oleh Guru ✨</p></div>
    </div>
  </div>
) : isRejected ? (
  <div className="space-y-6">
    <div className="grid grid-cols-6 gap-2">
      {[1, 2, 3, 4, 5, 6].map(sNum => {
        const doneLog = completedSessions.find(s => s.num === sNum);
        return (
          <div key={sNum} className={`w-full p-2 h-20 md:h-24 rounded-2xl font-black border-2 flex flex-col items-center justify-center gap-1.5 ${doneLog ? 'bg-white border-rose-400 text-rose-600' : 'bg-slate-50 border-transparent text-slate-200 opacity-40'}`}>
            {doneLog ? (<><p className="text-[7px] font-black mb-1 leading-none text-rose-500">{formatDateToDMY(doneLog.date)}</p><Check size={16} strokeWidth={4}/></>) : (<span className="text-xl">{sNum}</span>)}
            <p className="text-[6px] md:text-[7px] font-black uppercase">{doneLog ? 'DONE' : `SESI ${sNum}`}</p>
          </div>
        );
      })}
    </div>
    <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex items-center gap-4 shadow-sm">
      <AlertCircle className="text-rose-600 shrink-0" size={24}/>
      <div><p className="text-[10px] font-black text-rose-800 uppercase italic leading-relaxed">Di tolak, pilih guru lain ya! ✨</p>{teacherDisplay && <p className="text-[9px] font-black text-rose-700 uppercase mt-0.5">Ditolak oleh: {teacherDisplay}</p>}<p className="text-[9px] font-bold text-rose-600 uppercase mt-1">Silakan ajukan ke pembimbing lainnya.</p></div>
    </div>
    <button onClick={() => setRequestingReportFor(course)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
      <GraduationCap size={20}/> KLAIM ULANG RAPOT 🎓
    </button>
  </div>
                        // AFTER
) : (
  <div className="space-y-6">
     <div className="grid grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map(sNum => {
           const doneLog = completedSessions.find(s => s.num === sNum);
           return (
             <div key={sNum} className="relative group/box">
               <button 
                 onClick={() => setConfirmingAbsen({ course, sessionNum: sNum })}
                 disabled={!!doneLog || (sNum !== maxSess + 1)} 
                 className={`w-full p-2 h-20 md:h-24 rounded-2xl font-black transition-all border-2 flex flex-col items-center justify-center gap-1.5 ${!!doneLog ? (isNextClass ? 'bg-white border-purple-500 text-purple-600' : 'bg-white border-emerald-500 text-emerald-600') : (sNum === maxSess + 1) ? 'bg-blue-50 border-blue-500 text-blue-600 animate-pulse active:scale-95' : 'bg-slate-50 border-transparent text-slate-200 opacity-60'}`}
               >
                  {!!doneLog ? (
                     <>
                        <p className={`text-[7px] font-black mb-1 leading-none ${isNextClass ? 'text-purple-500' : 'text-emerald-500'}`}>{formatDateToDMY(doneLog.date)}</p>
                                                <Check size={16} strokeWidth={4}/>
                                             </>
                                          ) : (
                                             <span className="text-xl">{sNum}</span>
                                          )}
                                          <p className="text-[6px] md:text-[7px] font-black uppercase">{doneLog ? 'DONE' : `SESI ${sNum}`}</p>
                                       </button>
                                       {!!doneLog && !isRequesting && !isProcessing && !isNextClass && !isRejected && !isWaitingRelease && (
                                          <button onClick={(e) => { e.stopPropagation(); setShowEditDateModal(doneLog); setEditDateValue(doneLog.date); }} className="absolute -top-1.5 -right-1.5 p-1.5 bg-white text-blue-500 rounded-full shadow-lg border border-blue-50 hover:bg-blue-50 transition-all z-20" title="Ubah Tanggal"><Edit3 size={10} strokeWidth={3} /></button>
                                       )}
                                     </div>
                                   );
                                })}
                             </div>
{maxSess >= 6 && !isNextClass && (
  <button onClick={() => setRequestingReportFor(course)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl animate-bounce flex items-center justify-center gap-3">
    <GraduationCap size={20}/> KLAIM RAPOT SEKARANG! 🎓
  </button>
)}
{isNextClass && (
  <div className="w-full py-5 bg-purple-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-xl flex flex-col items-center justify-center gap-2">
    <div className="flex items-center gap-2"><Star size={16}/> LANJUTKAN BELAJAR! ⭐</div>
    <p className="text-[10px] font-bold text-white normal-case">Materi {(() => { const name = (course.className || '').replace(/^PELATIHAN\s+/i, '').replace(/\s*-\s*REGULER\s*\d+/i, '').trim(); return name; })()} belum selesai dipelajari 🌟</p>
  </div>
)}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              );
           })}
       </div>
     </div>
   ))}
           {verifiedCourses.length === 0 && (
             <div className="py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-20">
               <BookOpen size={64} className="mx-auto mb-6 text-slate-300" />
               <p className="font-black text-[11px] uppercase tracking-[0.4em] italic leading-relaxed text-center">Belum ada paket aktif. ✨</p>
             </div>
           )}
        </section>
      )}

      {showEditDateModal && (
        <ModalPortal>
        <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-[340px] rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6 relative border-t-4 border-blue-500 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setShowEditDateModal(null)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20}/></button>
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm"><Calendar size={28} /></div>
              <div className="space-y-1"><h4 className="text-xl font-black text-slate-800 uppercase italic leading-none">Koreksi Tanggal</h4><p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Sesi {showEditDateModal.num} ✨</p></div>
              <div className="space-y-2 text-left"><label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Pilih Tanggal Baru:</label><input type="date" value={editDateValue} onChange={e => setEditDateValue(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-black text-xs outline-none border-2 border-blue-50 shadow-inner" /></div>
              <div className="flex gap-3"><button onClick={() => setShowEditDateModal(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">BATAL</button><button onClick={executeUpdateSessionDate} disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 flex items-center justify-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14}/> SIMPAN PERUBAHAN ✨</>}</button></div>
           </div>
        </div>
        </ModalPortal>
      )}

      {confirmDeletePayment && (
        <ModalPortal>
        <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-[340px] rounded-[2rem] p-8 text-center space-y-6 shadow-2xl relative border-t-4 border-rose-500 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setConfirmDeletePayment(null)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20}/></button>
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm animate-bounce"><AlertTriangle size={32} /></div>
              <div className="space-y-2"><h4 className="text-xl font-black text-slate-800 uppercase italic leading-none">Hapus Laporan?</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">Data laporan bayar <span className="text-slate-800 font-black underline">{confirmDeletePayment.className}</span> akan dihapus permanen.</p></div>
              <div className="flex gap-3"><button onClick={() => setConfirmDeletePayment(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all">BATAL</button><button onClick={executeDeletePayment} disabled={loading} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 flex items-center justify-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} HAPUS</button></div>
           </div>
        </div>
        </ModalPortal>
      )}

      {showFinalConfirmation && (
        <ModalPortal>
        <div data-modal-container className="fixed inset-0 z-[130000] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-[380px] rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8 relative overflow-hidden border-t-4 border-amber-500 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setShowFinalConfirmation(false)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20}/></button>
              
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <AlertCircle size={36} strokeWidth={2.5} />
              </div>

              <div className="space-y-3">
                <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Perhatian!</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Konfirmasi Klaim Rapot</p>
              </div>

              <div className="bg-amber-50/60 border-2 border-amber-100 rounded-[2rem] p-6 space-y-3">
                <div className="flex items-start gap-3 text-left">
                  <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle size={14} strokeWidth={3} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-amber-900 uppercase italic leading-relaxed">
                      Setelah klik "YAKIN LANJUTKAN!", tanggal sesi yang sudah kamu input <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-lg">TIDAK BISA DIUBAH</span> lagi ya! 
                    </p>
                    <p className="text-[9px] font-bold text-amber-700 mt-3 leading-relaxed">
                      Pastikan semua tanggal sudah benar sebelum melanjutkan. ✨
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFinalConfirmation(false)} 
                  className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-wide hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
                >
                  BATAL
                </button>
                <button 
                  onClick={executeFinalRequestReport} 
                  disabled={loading}
                  className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wide shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} strokeWidth={3} /> YAKIN, LANJUTKAN! 🚀</>}
                </button>
              </div>
           </div>
        </div>
        </ModalPortal>
      )}

      {previewModal && (<ModalPortal><div data-modal-container className="fixed inset-0 z-[300000] flex items-center justify-center p-6 bg-slate-900/95 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}} onClick={() => setPreviewModal(null)}><div className="relative max-w-4xl w-full flex flex-col items-center opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}><button className="absolute -top-14 right-0 p-4 text-white hover:text-rose-500 transition-colors" onClick={() => setPreviewModal(null)}><X size={40}/></button><img src={previewModal} className="max-w-full max-h-[75vh] rounded-[3rem] shadow-2xl border-4 border-white/10 object-contain" alt="Preview" /><div className="mt-8 text-center"><p className="text-[10px] font-black text-white/40 uppercase tracking-[0.8em] italic">Sanur Payment Verification ✨</p></div></div></div></ModalPortal>)}
      
      {confirmingAbsen && (
        <ModalPortal>
        <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-[340px] rounded-[2rem] p-8 shadow-2xl text-center space-y-6 relative overflow-hidden opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setConfirmingAbsen(null)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20}/></button>
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto animate-bounce shadow-lg"><Check size={28} strokeWidth={4} /></div>
              <div className="space-y-1"><h4 className="text-xl font-black text-slate-800 uppercase italic leading-none">Konfirmasi Sesi</h4><p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">{confirmingAbsen.course.className} - SESI {confirmingAbsen.sessionNum}</p></div>
              <div className="space-y-2 text-left"><label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Kapan kamu belajarnya?</label><input type="date" value={selectedAbsenDate} onChange={e => setSelectedAbsenDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-black text-xs outline-none border-2 border-emerald-50 shadow-inner" /></div>
              <button onClick={handleConfirmAbsen} disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : 'SAYA SUDAH BELAJAR! ✨'}</button>
           </div>
        </div>
        </ModalPortal>
      )}

      {requestingReportFor && (
        <ModalPortal>
        <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-[360px] rounded-[2rem] p-8 shadow-2xl text-center space-y-6 relative overflow-hidden opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setRequestingReportFor(null)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20}/></button>
              <div className="space-y-3"><div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl rotate-3"><GraduationCap size={28} /></div><div><h4 className="text-xl font-black text-slate-800 uppercase italic leading-none">Klaim Rapot</h4><p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-1 truncate">{requestingReportFor.className}</p></div></div>
              <div className="bg-slate-50 p-5 rounded-2xl text-left space-y-3 border border-slate-100"><p className="text-[9px] font-bold text-slate-600 leading-tight">"Pilih Guru Pembimbing untuk mengirim data ke antrean Rapot & Sertifikat."</p><div className="space-y-1.5"><label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-1.5"><UserCog size={10}/> Pilih Guru Pembimbing</label><select value={selectedTeacherForReport} onChange={e => setSelectedTeacherForReport(e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl font-black text-[10px] uppercase italic outline-none border-2 border-blue-50 shadow-sm appearance-none"><option value="">-- PILIH GURU --</option>{teachers.filter(t => t.role === 'TEACHER').map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}</select></div></div>
              <button onClick={handleRequestReport} disabled={!selectedTeacherForReport || loading} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.1em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={14} /> AJUKAN SEKARANG ✨</>}</button>
           </div>
        </div>
        </ModalPortal>
      )}
      
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
         {verifiedCourses.map((course) => { const reportLog = findOfficialReportLog(course); return reportLog ? ( <ReportTemplate key={reportLog.id} reportLog={reportLog} allLogs={reports} studentAttendanceLogs={studentAttendanceLogs} studentName={normalizedUserName} /> ) : null; })}
         {myPayments.map((p) => (
            <div id={`slip-digital-${p.id}`} ref={p.id === showDigitalSlip?.id ? slipRef : null} key={p.id} className="bg-white p-12 md:p-20 space-y-10 w-[700px] mx-auto overflow-hidden text-slate-900 border-8 border-double border-slate-100">
               <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10"><div className="min-w-0 text-left"><img src="https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/SANUR%20Logo.png" style={{ maxHeight: '90px', width: 'auto', objectFit: 'contain' }} /></div><div className="text-right flex flex-col items-end"><h2 className="text-xl font-black uppercase text-slate-800 leading-none">KUITANSI RESMI</h2><p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-2 whitespace-nowrap">ID: {p.id.toUpperCase()}</p></div></div>
               <div className="grid grid-cols-12 gap-10"><div className="col-span-8 pr-6 border-r border-slate-50 text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Diterima Dari:</p><p className="text-lg font-black text-slate-900 uppercase Kalimat text-left">{p.studentName}</p></div><div className="col-span-4 text-right"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal Bayar:</p><p className="text-base font-black text-slate-800 uppercase Kalimat">{formatDateToDMY(p.date)}</p></div></div>
               <div className="space-y-6"><div className="flex items-center gap-3 text-slate-400 border-b-2 border-slate-50 pb-2"><ClipboardList size={14} /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Rincian Paket Pembelajaran</p></div><div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col gap-6"><div className="text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Nama Program/Kelas:</p><p className="text-[13px] font-black text-slate-800 uppercase Kalimat text-left">{p.className}</p></div><div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200/60"><div className="text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Total Sesi Paket:</p><p className="text-[12px] font-black text-slate-800 uppercase tracking-tight text-left">6 Sesi</p></div><div className="text-right"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Durasi Sesi:</p><p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">2 Jam / 120 Menit</p></div></div></div></div>
               <div className="pt-8 border-t-2 border-slate-900"><div className="flex justify-between items-start min-h-[32px]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VERIFIKASI SISTEM:</p><div className="text-right flex flex-col items-end"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Terverifikasi Digital</p><p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">Status: LUNAS</p></div></div><p className="text-5xl font-black text-blue-600 leading-none mt-4 text-left">Rp {p.amount.toLocaleString()}</p></div>
               <div className="pt-10 border-t border-slate-100 flex justify-between items-end gap-10"><div className="max-w-xs text-left"><p className="text-[10px] font-bold text-slate-400 italic Kalimat text-left">"Terima kasih atas kepercayaannya bergabung di SANUR Akademi Inspirasi. Pembayaran ini sah diverifikasi sistem internal."</p></div><div className="text-center flex flex-col items-center shrink-0"><ShieldCheck size={44} className="text-slate-900 opacity-20 mb-2" /><p className="text-[13px] font-black uppercase text-slate-900 tracking-tight leading-none">Admin Sanur</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">Official Receipt</p></div></div>
            </div>
         ))}
      </div>
    </div>
    </>
  );
};

export default StudentPortal;
