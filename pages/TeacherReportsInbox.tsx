import React, { useState, useMemo, useEffect } from 'react';
import { User, Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import ReportTemplate, { formatDateToDMY } from '../ReportTemplate.tsx';
import { 
  GraduationCap, Search, X, Loader2, Check, Sparkles,
  History, Trophy, Edit3, CheckCircle2, UserCheck, Layout, BookOpen, Printer,
  Quote, BadgeCheck, ClipboardList, Star, Calendar, Clock, AlertCircle, Trash2,
  FileEdit, ChevronRight, Zap, Info, Send, SendHorizonal, Save, AlertTriangle, FileDown, FileCheck,
  Filter // ✅ TAMBAH INI KALAU BELUM ADA
} from 'lucide-react';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface TeacherReportsInboxProps {
  user: User;
  logs: Attendance[];
  reports: any[]; 
  studentAttendanceLogs: any[]; // ✅ TAMBAHAN BARU
  studentAccounts: User[];
  refreshAllData: () => Promise<void>;
}

const MilestoneView = ({ studentAttendanceLogs, studentName, packageId, periode = 1 }: { studentAttendanceLogs: any[], studentName: string, packageId: string, periode?: number }) => {
  const sNameNorm = studentName.toUpperCase().trim();
  const pkgIdNorm = packageId.toUpperCase().trim();

  const sortedLogs = [...(studentAttendanceLogs || [])]
    .filter(l => 
      (l.packageid || '').toUpperCase().trim() === pkgIdNorm && 
      (l.studentname || '').toUpperCase().trim() === sNameNorm
    )
    .sort((a,b) => (a.sessionnumber || 0) - (b.sessionnumber || 0));

  // ✅ HITUNG SESSION NUMBERS DINAMIS SESUAI TINGKAT
  const startSession = (periode - 1) * 6 + 1;
  const sessionNumbers = Array.from({ length: 6 }, (_, i) => startSession + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-slate-400 border-b border-slate-100 pb-2">
        <ClipboardList size={16} />
        <p className="text-[10px] font-black uppercase tracking-widest">Milestone Pembelajaran Siswa - Tingkat {periode}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {sessionNumbers.map((sessionNum, idx) => {
          const log = sortedLogs.find(l => l.sessionnumber === (idx + 1)); // ✅ TETAP CARI DI 1-6
          return (
            <div key={sessionNum} className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${log ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-transparent opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic text-[10px] ${log ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>{sessionNum < 10 ? `0${sessionNum}` : sessionNum}</div>
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-800 uppercase italic leading-none">Sesi {sessionNum}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{log ? formatDateToDMY(log.date) : 'Kosong'}</p>
              </div>
              {log && <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm"><Check size={12} strokeWidth={4}/></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TeacherReportsInbox: React.FC<TeacherReportsInboxProps> = ({ user, logs, reports, studentAttendanceLogs, studentAccounts, refreshAllData }) => {
  
  // ✅ TAMBAH INI DI BARIS PALING ATAS
  console.log('🔍 CHECK DATA MASUK:', {
    studentAttendanceLogs,
    isArray: Array.isArray(studentAttendanceLogs),
    length: studentAttendanceLogs?.length
  });

  const [activeStep, setActiveStep] = useState<'ANTREAN' | 'WORKSPACE' | 'HISTORY'>('ANTREAN');
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [lastActionedId, setLastActionedId] = useState<string | null>(null);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showMilestoneFor, setShowMilestoneFor] = useState<any | null>(null);
  const [confirmReject, setConfirmReject] = useState<any | null>(null);
  const [confirmNextClass, setConfirmNextClass] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [reportForm, setReportForm] = useState({ sessions: [{ num: 1, material: '', score: 90 }], narrative: '' });
  
  // FIXED: Menggunakan state ID agar loading tidak terjadi secara massal
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026'); // ✅ TAMBAH INI
  const [selectedTingkat, setSelectedTingkat] = useState(1);
  
  // Efek Highlight untuk kartu yang baru saja dikerjakan
  useEffect(() => {
    if (activeStep === 'HISTORY' && lastActionedId) {
      setTimeout(() => {
        const element = document.getElementById(`history-card-${lastActionedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-blue-500', 'ring-offset-8', 'scale-[1.03]', 'z-50');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-8', 'scale-[1.03]');
          }, 4000);
        }
      }, 400);
    }
  }, [activeStep, lastActionedId]);

  // ✅ Auto scroll modal ke tengah viewport (body bebas scroll)
  useEffect(() => {
    const hasModal = !!(
      activeDownloadId || 
      showMilestoneFor || 
      confirmReject
    );
    
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
  }, [activeDownloadId, showMilestoneFor, confirmReject]);

  const reportRequests = useMemo(() => {
  const requests = reports.filter(r =>
    (r.status === 'REQ' || r.status === 'REPORT_PROCESSING') &&
    r.teacherid === user.id &&
    r.teacherid !== 'SISWA_MANDIRI' // ✅ FILTER ABSEN SISWA MANDIRI
  );
  return requests.filter(req => {
      const studentNameInRequest = (req.studentsAttended?.[0] || '').toUpperCase().trim();
      return studentAccounts.some(acc => acc.name.toUpperCase().trim() === studentNameInRequest);
  });
}, [reports, user.id, studentAccounts]);

const publishedReports = useMemo(() => {
  const baseReports = reports.filter(r =>  // ✅ Ganti logs → reports
    (r.status === 'SESSION_LOG' || r.status === 'REPORT_READY') && 
    r.sessionnumber === 6 &&  // ✅ Ganti ke huruf kecil
    r.teacherid === user.id &&  // ✅ Ganti ke huruf kecil
    (r.packageid || '').startsWith('PAY-') &&  // ✅ Ganti ke huruf kecil
    r.date.startsWith(selectedYear)
  );
    
  // LOGIKA SORTING (sama kayak sebelumnya)
  const sorted = [...baseReports].sort((a, b) => {
      if (a.id === lastActionedId) return -1;
      if (b.id === lastActionedId) return 1;
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id);
  });

  if (!historySearchTerm.trim()) return sorted;

  const term = historySearchTerm.toLowerCase();
  return sorted.filter(req => {
      const sName = (req.studentsAttended?.[0] || '').toLowerCase();
      const cName = (req.className || '').toLowerCase();
      return sName.includes(term) || cName.includes(term);
  });
}, [reports, user.id, historySearchTerm, lastActionedId, selectedYear]); // ✅ TAMBAH selectedYear DI DEPENDENCY

  const handleOpenWorkspace = (req: any, isEdit: boolean = false) => {
    setSelectedPackage(req);
    setIsEditMode(isEdit);
    setShowErrors(false);
    
    const sName = req.studentsAttended?.[0] || 'SISWA';
    if (isEdit || req.status === 'REPORT_READY') {
      const existingTopics = (req.studentTopics?.[sName] || Array(6).fill('')) as string[];
      const existingScores = (req.studentScores?.[sName] || Array(6).fill(90)) as number[];
      
setReportForm({ 
  sessions: existingTopics.length > 0 
    ? existingTopics.map((mat: string, i: number) => ({ num: i + 1, material: mat || '', score: existingScores[i] || 90 }))
    : [{ num: 1, material: '', score: 90 }],
  narrative: ''
});
} else {
  setReportForm({ 
    sessions: [{ num: 1, material: '', score: 90 }],
    narrative: '' 
  });
}
    setActiveStep('WORKSPACE');
  };

  const handleAcceptRequest = async (req: any) => {
    setActionLoadingId(req.id);
    try {
      await supabase.from('reports').update({ status: 'REPORT_PROCESSING' }).eq('id', req.id);
      await refreshAllData();
      handleOpenWorkspace(req, false);
    } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
  };

const handleRejectRequest = async () => {
  if (!confirmReject) return;
  setActionLoadingId(`reject-${confirmReject.id}`);
  try {
    await supabase.from('reports').update({ status: 'REPORT_REJECTED' }).eq('id', confirmReject.id);
    await refreshAllData();
    setConfirmReject(null);
  } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
};

const handleNextClass = async () => {
  if (!confirmNextClass) return;
  setActionLoadingId(`next-${confirmNextClass.id}`);
  try {
    await supabase.from('reports').update({ status: 'NEXT_CLASS' }).eq('id', confirmNextClass.id);
    await refreshAllData();
    setConfirmNextClass(null);
  } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
};

const avgScore = useMemo(() => {
  const total = reportForm.sessions.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
  return reportForm.sessions.length > 0 ? Math.round(total / reportForm.sessions.length) : 0;
}, [reportForm.sessions]);

  const handleSaveReportToReady = async () => {
    const isMaterialEmpty = reportForm.sessions.some(s => !s.material.trim());

  if (isMaterialEmpty) {
      setShowErrors(true);
      const errEl = document.getElementById('error-notif-required');
      if (errEl) errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return alert("Waduh Kak! Materi kurikulum wajib diisi yaa agar rapot siswa sempurna ✨");
    }

    setActionLoadingId(selectedPackage.id);
    try {
      const sName = selectedPackage.studentsAttended?.[0] || 'SISWA';
      const topics = reportForm.sessions.map(s => (s.material || '').toUpperCase());
      const scores = reportForm.sessions.map(s => Number(s.score) || 0);
      const payload = { 
  status: 'REPORT_READY', 
  sessionnumber: 6, 
  studenttopics: { [sName]: topics }, 
  studentscores: { [sName]: scores }, 
  date: isEditMode ? selectedPackage.date : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()) 
};
      await supabase.from('reports').update(payload).eq('id', selectedPackage.id);
      await refreshAllData();
      
      setLastActionedId(selectedPackage.id);
      setSelectedPackage(null);
      setActiveStep('HISTORY');
    } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
  };

  const handleSendReportToStudent = async (req: any) => {
    setActionLoadingId(req.id);
    try {
      await supabase.from('reports').update({ status: 'SESSION_LOG' }).eq('id', req.id);
      await refreshAllData();
      setLastActionedId(req.id); // Set sebagai yang terakhir diaksi agar loncat ke depan
      alert("Rapot Berhasil Dikirim ke Siswa! ✨");
    } catch (e: any) { alert(e.message); } finally { setActionLoadingId(null); }
  };

const handleDownloadPDF = async (req: any) => {
  const studentName = req.studentsAttended?.[0] || 'SISWA';
  const rawScores = req.studentScores ? Object.values(req.studentScores)[0] : null;
  const scores: number[] = Array.isArray(rawScores) ? rawScores : [];
  const rawTopics = req.studentTopics ? Object.values(req.studentTopics)[0] : null;
  const topics: string[] = Array.isArray(rawTopics) ? rawTopics : [];
  const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
  const isPass = avg >= 80;
  const matpelMatch = req.className?.match(/(.*) \((.*)\) - (.*)/);
  const subject = matpelMatch ? matpelMatch[1] : (req.className || "PROGRAM SANUR");
  const level = matpelMatch ? matpelMatch[2] : (req.level || 'BASIC');
  const verifyUrl = `https://sanur-verify.vercel.app/verify?id=${req.id}`;
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
        <span style="font-weight:900; color:#1e293b; font-size:20px; text-transform:uppercase; font-style:italic; letter-spacing:-0.01em; line-height:1.1; display:block;">
          ${topics[i] || 'MATERI PEMBELAJARAN'}
        </span>
      </td>
      <td style="text-align:center; vertical-align:middle;">
        <span style="font-weight:900; color:${accentColor}; font-size:20px; font-style:italic;">${score}</span>
        <span style="color:#94a3b8; font-weight:700; font-size:11px;">/100</span>
      </td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rapot_Sanur_${studentName.replace(/\s+/g, '_')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;0,900;1,700;1,900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', serif; background: #111; }
    .page-wrapper { display: flex; align-items: center; justify-content: center; width: 100vw; min-height: 100vh; background: #111; padding: 40px 0; }
    .page-landscape { width: 297mm; height: 210mm; background: white; overflow: hidden; display: flex; flex-direction: column; border: 25px double ${mainColor}; flex-shrink: 0; }
    .page-landscape-inner { width: 100%; height: 100%; border: 4px solid #cbd5e1; display: flex; flex-direction: row; box-sizing: border-box; }
    .page-portrait { width: 210mm; height: 297mm; background: white; overflow: hidden; display: flex; flex-direction: column; padding: 70px 60px; flex-shrink: 0; }
    @media print {
      @page:first { size: A4 landscape; margin: 0; }
      @page { size: A4 portrait; margin: 0; }
      body { background: white; margin: 0; }
      .page-wrapper { display: block; width: auto; min-height: auto; padding: 0; background: white; }
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

<div id="print-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999; align-items:center; justify-content:center;">
  <div style="background:white; border-radius:24px; padding:40px; max-width:480px; width:90%; box-shadow:0 25px 60px rgba(0,0,0,0.4);">
    <h2 style="font-size:20px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:-0.02em; margin-bottom:6px;">📄 Cara Save sebagai PDF</h2>
    <p style="font-size:13px; color:#64748b; margin-bottom:28px;">Ikuti langkah berikut agar sertifikat tersimpan dengan benar</p>
    <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:20px;">
      <div style="width:32px; height:32px; background:#2563eb; color:white; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; flex-shrink:0;">1</div>
      <div>
        <p style="font-weight:900; color:#0f172a; font-size:14px; margin-bottom:2px;">Pilih Destination: <span style="color:#2563eb;">Save as PDF</span></p>
        <p style="font-size:12px; color:#64748b;">Di dialog print yang muncul, ganti printer ke <strong>"Save as PDF"</strong></p>
      </div>
    </div>
    <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:20px;">
      <div style="width:32px; height:32px; background:#2563eb; color:white; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; flex-shrink:0;">2</div>
      <div>
        <p style="font-weight:900; color:#0f172a; font-size:14px; margin-bottom:2px;">Centang <span style="color:#2563eb;">Background Graphics</span></p>
        <p style="font-size:12px; color:#64748b;">Klik <strong>"More settings"</strong> lalu centang <strong>"Background graphics"</strong> — agar warna, gradient, dan gambar ikut tercetak</p>
      </div>
    </div>
    <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:32px;">
      <div style="width:32px; height:32px; background:#2563eb; color:white; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; flex-shrink:0;">3</div>
      <div>
        <p style="font-weight:900; color:#0f172a; font-size:14px; margin-bottom:2px;">Klik <span style="color:#2563eb;">Save</span></p>
        <p style="font-size:12px; color:#64748b;">Pilih lokasi penyimpanan dan klik <strong>"Save"</strong></p>
      </div>
    </div>
    <div style="display:flex; gap:12px;">
      <button onclick="document.getElementById('print-modal').style.display='none'" style="flex:1; padding:12px; border:2px solid #e2e8f0; background:white; border-radius:12px; font-weight:900; font-size:13px; cursor:pointer; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Batal</button>
      <button onclick="document.getElementById('print-modal').style.display='none'; window.print();" style="flex:2; padding:12px; background:#2563eb; color:white; border:none; border-radius:12px; font-weight:900; font-size:13px; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em;">🖨️ Mengerti, Lanjut Print!</button>
    </div>
  </div>
</div>

<!-- HALAMAN 1: SERTIFIKAT LANDSCAPE -->
<div class="page-wrapper">
  <div class="page-landscape">
    <div class="page-landscape-inner">
      <div style="width:140px; background:${gradientSidebar}; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px 15px; flex-shrink:0;">
        <div style="background:white; padding:12px; border-radius:15px; box-shadow:0 4px 12px rgba(0,0,0,0.2);">
          <img src="${qrUrl}" style="width:100px; height:100px; display:block;" />
        </div>
        <p style="font-size:8px; font-weight:900; color:white; text-align:center; margin-top:12px; text-transform:uppercase; letter-spacing:0.1em;">Scan untuk verifikasi</p>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; padding:50px 80px;">
        <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:50px;">
          <img src="${logoUrl}" style="max-width:240px; max-height:80px; object-fit:contain;" />
        </div>
        <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
          <h2 style="font-size:38px; font-family:serif; font-style:italic; color:${mainColor}; margin:0 0 25px 0;">${isPass ? 'Sertifikat Kelulusan' : 'Capaian Pembelajaran'}</h2>
          <p style="font-size:14px; font-family:serif; font-style:italic; color:#64748b; margin:0 0 15px 0;">Diberikan kepada:</p>
          <div style="display:inline-block; margin-bottom:40px;">
            <h3 style="font-size:34px; font-weight:900; color:${accentColor}; text-transform:uppercase; letter-spacing:0.05em; margin:0; line-height:1.1;">${studentName.toUpperCase()}</h3>
            <div style="width:100%; height:4px; background:${isPass ? '#dbeafe' : '#ffedd5'}; margin-top:10px; border-radius:10px;"></div>
          </div>
          <p style="font-size:14px; font-family:serif; font-style:italic; color:#475569; line-height:1.7; margin:0 0 8px 0; padding:0 100px;">${isPass ? 'Telah menyelesaikan seluruh materi pelatihan dan lulus dalam ujian standar kompetensi' : 'Telah berkomitmen mengikuti dan menyelesaikan seluruh rangkaian program pelatihan'}</p>
          <p style="font-size:14px; font-family:serif; font-style:italic; color:${mainColor}; font-weight:700; margin:0 0 40px 0;">Sanur Akademi Inspirasi</p>
          <div style="background:${gradientBox}; width:700px; padding:30px 20px; border-radius:35px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 12px 30px -8px rgba(0,0,0,0.15); margin-bottom:50px;">
            <p style="font-size:22px; font-weight:900; color:white; text-transform:uppercase; font-style:italic; margin:0; line-height:1.2;">${subject}</p>
            <p style="font-size:16px; font-weight:900; color:rgba(255,255,255,0.8); text-transform:uppercase; letter-spacing:0.3em; margin:8px 0 0 0;">LEVEL ${level}</p>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:auto;">
          <div style="text-align:center;">
            <p style="font-size:9px; font-weight:900; color:${isPass ? '#60a5fa' : '#fb923c'}; text-transform:uppercase; letter-spacing:0.2em; margin-bottom:3px;">Tanggal Terbit</p>
            <p style="font-size:13px; font-weight:900; color:#64748b; font-style:italic;">${formatDate(req.date)}</p>
          </div>
          <div style="text-align:center;">
            <p style="font-size:9px; font-weight:900; color:${isPass ? '#60a5fa' : '#fb923c'}; text-transform:uppercase; letter-spacing:0.2em; margin-bottom:3px;">ID Sertifikat</p>
            <p style="font-size:11px; font-weight:900; color:#64748b; font-style:italic;">${req.id.toUpperCase()}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- HALAMAN 2: TRANSKRIP PORTRAIT -->
<div class="page-wrapper">
  <div class="page-portrait">
    <div style="display:flex; align-items:flex-end; gap:16px; margin-bottom:20px;">
      <div style="width:52px; height:52px; background:#0f172a; color:white; border-radius:18px; display:flex; align-items:center; justify-content:center; transform:rotate(6deg); flex-shrink:0;">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
      </div>
      <h1 style="font-size:34px; font-weight:900; font-style:italic; color:#1e293b; text-transform:uppercase; letter-spacing:-0.05em; line-height:1;">Transkrip <span style="color:${accentColor};">Nilai</span></h1>
    </div>
    <div style="margin-bottom:30px; display:flex; justify-content:space-between; align-items:flex-end;">
      <p style="font-size:13px; font-weight:900; color:${accentColor}; text-transform:uppercase; letter-spacing:0.3em; margin:0;">📚 MATERI KURIKULUM</p>
      <div style="display:flex; flex-direction:column; align-items:flex-end; text-align:right;">
        <p style="font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:0.3em; margin:0 0 3px 0;">Guru Penilai</p>
        <p style="font-size:13px; font-weight:900; color:#1e293b; text-transform:uppercase; margin:0; letter-spacing:0.05em;">${req.teacherName || '-'}</p>
      </div>
    </div>
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

      <div className="max-w-7xl mx-auto space-y-12 pb-40 px-4 animate-in fade-in duration-700">
      {/* LOADING MODAL TENGAH - DENGAN REAL PROGRESS BAR */}
      {activeDownloadId && (
        <div data-modal-container className="fixed inset-0 z-[300000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl flex flex-col items-center text-center space-y-8 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <div className="w-20 h-20 bg-blue-600 text-white rounded-[2.2rem] flex items-center justify-center shadow-xl animate-bounce">
                <FileDown size={40} />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Memproses PDF</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed px-4">Mengonversi sertifikat & transkrip</p>
              </div>
              
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center px-1">
                   <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Progress</span>
                   <span className="text-[11px] font-black text-blue-600 italic">{downloadProgress}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                   <div 
                     className="h-full bg-blue-600 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
                     style={{ width: `${downloadProgress}%` }}
                   ></div>
                </div>
              </div>
           </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
        <div className="space-y-4">
           <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Portal <span className="text-orange-600">Rapot</span></h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Terbitkan Sertifikat & Rapot Digital Siswa ✨</p>
        </div>
      </header>

      <div className="flex bg-slate-100 p-2 rounded-full w-full max-w-xl mx-auto shadow-inner border border-slate-100">
         <button onClick={() => setActiveStep('ANTREAN')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'ANTREAN' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-400'}`}>Antrean ({reportRequests.length})</button>
         <button onClick={() => setActiveStep('WORKSPACE')} disabled={!selectedPackage} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'WORKSPACE' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 disabled:opacity-30'}`}>Workspace</button>
         <button onClick={() => setActiveStep('HISTORY')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'HISTORY' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Histori</button>
      </div>

      {activeStep === 'HISTORY' && (
  <div className="max-w-5xl mx-auto">
     <div className="flex items-center gap-3 bg-white border-2 border-slate-100 rounded-3xl shadow-xl p-2 pr-3">
        {/* Search Input */}
        <div className="flex-1 relative">
           <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500"><Search size={18} /></div>
           <input 
              type="text" 
              placeholder="CARI SISWA / KELAS..." 
              value={historySearchTerm} 
              onChange={(e) => setHistorySearchTerm(e.target.value.toUpperCase())} 
              className="w-full pl-14 pr-4 py-4 bg-transparent font-black text-[10px] uppercase outline-none" 
           />
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200"></div>

        {/* Filter Tahun - Integrated */}
        <div className="relative group shrink-0">
           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"><Filter size={14} /></div>
           <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)} 
              className="pl-9 pr-3 py-3 bg-transparent font-black text-[10px] uppercase outline-none appearance-none cursor-pointer min-w-[100px] text-center"
           >
              {Array.from({ length: 11 }, (_, i) => (2024 + i).toString()).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
           </select>
        </div>
     </div>
  </div>
)}

      {activeStep === 'ANTREAN' && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {reportRequests.map((req, i) => (
              <div key={i} className="bg-white p-12 md:p-14 rounded-[4rem] shadow-xl border border-slate-100 flex flex-col justify-between hover:border-orange-500 transition-all">
                 <div>
<div className="flex justify-between items-start mb-10">
   <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center shadow-inner"><GraduationCap size={40}/></div>
   <div className="flex flex-col items-center gap-1">
      <span className="px-6 py-2 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">KLAIM BARU</span>
      {(() => {
         const lastSession = studentAttendanceLogs.find(l =>
            (l.packageid || '').toUpperCase().trim() === (req.packageId || '').toUpperCase().trim() &&
            (l.studentname || '').toUpperCase().trim() === (req.studentsAttended?.[0] || '').toUpperCase().trim() &&
            l.sessionnumber === 6
         );
         return lastSession ? (
<div className="flex flex-col items-center gap-0.5">
   <p className="text-[8px] font-black text-orange-300 uppercase tracking-widest">Sesi Terakhir</p>
   <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{formatDateToDMY(lastSession.date)}</p>
</div>
         ) : null;
      })()}
   </div>
</div>
                   <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-2 Kalimat leading-tight">{req.studentsAttended?.[0]}</h4>
                   <p className="text-[11px] font-bold text-blue-600 uppercase mb-10 Kalimat leading-relaxed">{req.className}</p>
                   <button onClick={() => setShowMilestoneFor(req)} className="w-full py-5 mb-5 bg-slate-50 text-slate-500 rounded-3xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all border border-transparent shadow-sm"><History size={18}/> LIHAT MILESTONE</button>
                 </div>
                 <div className="space-y-4">
                    <button 
                      onClick={() => handleAcceptRequest(req)} 
                      disabled={!!actionLoadingId}
                      className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-black flex items-center justify-center gap-3"
                    >
                      {actionLoadingId === req.id ? <Loader2 className="animate-spin" size={20} /> : 'TERIMA & ISI RAPOT ✍️'}
                    </button>
                    <button 
                      onClick={() => setConfirmReject(req)} 
                      disabled={!!actionLoadingId}
                      className="w-full py-5 bg-rose-50 text-rose-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                    >
                      TOLAK PERMINTAAN
                    </button>
                 </div>
              </div>
            ))}
         </div>
      )}
      
      {activeStep === 'WORKSPACE' && selectedPackage && (
         <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-blue-600 overflow-hidden animate-in zoom-in space-y-0">
            <div className="p-10 bg-blue-600 text-white flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner shrink-0 rotate-3"><GraduationCap size={32} /></div>
                  <div className="text-center md:text-left"><h3 className="text-2xl font-black uppercase italic leading-none">{isEditMode ? 'Edit Rapot Siswa' : 'Ruang Kerja Penilaian'}</h3><p className="text-[11px] font-black uppercase tracking-widest mt-2 opacity-80">{selectedPackage.studentsAttended?.[0]} — {selectedPackage.className}</p></div>
               </div>
               <button onClick={() => { setSelectedPackage(null); setIsEditMode(false); setActiveStep('ANTREAN'); setShowErrors(false); }} className="p-4 bg-white/20 rounded-2xl hover:bg-white/40 transition-all"><X/></button>
            </div>
            <div className="p-8 md:p-14 space-y-16">
               <section className="flex flex-col items-center">
<div className="space-y-3 w-full max-w-lg">
  <div className="flex items-center justify-center gap-6 text-[9px] font-black uppercase tracking-widest">
    <span className="flex items-center gap-2 text-blue-500"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>≥ 80: LULUS</span>
    <span className="flex items-center gap-2 text-orange-400"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>&lt; 80: REMEDIAL</span>
  </div>
  <div className="bg-slate-900 p-12 rounded-[4rem] text-white text-center shadow-2xl relative overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
    <p className="text-[10px] uppercase font-black text-slate-400 mb-2 relative z-10">Skor Rata-Rata Akhir</p>
    <h4 className={`text-8xl font-black italic relative z-10 ${avgScore >= 80 ? 'text-blue-400' : 'text-orange-400'}`}>{avgScore}</h4>
    <p className={`text-[11px] font-black uppercase tracking-widest mt-6 opacity-60 relative z-10 ${avgScore >= 80 ? 'text-blue-400' : 'text-orange-400'}`}>{avgScore >= 80 ? 'KOMPETENSI: LULUS' : 'KOMPETENSI: REMEDIAL'}</p>
  </div>
</div>
               </section>
<section className="space-y-6">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3 text-blue-600"><BookOpen size={20} /><h4 className="text-xs font-black uppercase tracking-widest">Detail Materi & Nilai (Rentang Nilai = 0-100)</h4></div>
<button onClick={() => { if (reportForm.sessions.length >= 8) return; setReportForm(prev => ({ ...prev, sessions: [...prev.sessions, { num: prev.sessions.length + 1, material: '', score: 90 }] })) }} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase transition-all ${reportForm.sessions.length >= 8 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white'}`}>
  + TAMBAH MATERI
</button>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {reportForm.sessions.map((s, i) => (
                        <div key={i} className={`flex flex-col gap-4 p-8 rounded-[2.5rem] border-2 transition-all shadow-inner ${showErrors && !s.material.trim() ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-200' : 'border-transparent bg-slate-50 focus-within:border-blue-500'}`}>
                           <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                              <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 italic shadow-sm shrink-0">{s.num < 10 ? `0${s.num}` : s.num}</span>
                              <div className="text-right"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Skor Materi</label><input type="number" value={s.score} onChange={e => { const n = [...reportForm.sessions]; n[i].score = parseInt(e.target.value) || 0; setReportForm({...reportForm, sessions: n}); }} className="w-16 bg-transparent text-right font-black text-blue-600 text-2xl outline-none" /></div>
                           </div>
                           <div className="space-y-2">
                              <div className="flex justify-between items-center ml-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase Kalimat tracking-widest flex items-center gap-1">
                                  Materi Pembelajaran 
                                  <span className={`font-black px-1.5 py-0.5 rounded-md text-[6px] border ${showErrors && !s.material.trim() ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>WAJIB DIISI ✨</span>
                                </label>
                                <span className={`text-[7px] font-black ${s.material.length >= 35 ? 'text-rose-500' : 'text-slate-300'}`}>{s.material.length}/35</span>
                              </div>
                              <input 
                                type="text" 
                                placeholder="MISAL: PENGENALAN TOOLS..." 
                                value={s.material} 
                                maxLength={35} 
                                onChange={e => { 
                                  const n = [...reportForm.sessions]; 
                                  n[i].material = e.target.value; 
                                  setReportForm({...reportForm, sessions: n}); 
                                }} 
                                className={`w-full px-5 py-3 rounded-xl font-black uppercase text-[10px] outline-none transition-all border ${showErrors && !s.material.trim() ? 'bg-rose-50 border-rose-500 placeholder:text-rose-300' : 'bg-white border-slate-200 focus:border-blue-500'}`} 
                              />
                             {reportForm.sessions.length > 1 && (
  <button onClick={() => setReportForm(prev => ({ ...prev, sessions: prev.sessions.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, num: idx + 1 })) }))} className="w-full py-2 text-rose-400 font-black text-[8px] uppercase hover:text-rose-600 transition-all">
    − HAPUS MATERI INI
  </button>
)}
                           </div>
                        </div>
                     ))}
                  </div>
               </section>
               <section className="pt-10">
                  <button 
                    id="error-notif-required" 
                    onClick={handleSaveReportToReady} 
                    disabled={!!actionLoadingId} 
                    className="w-full py-10 bg-blue-600 text-white rounded-[3rem] font-black text-[14px] uppercase tracking-[0.4em] shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-5"
                  >
                     {actionLoadingId === selectedPackage.id ? <Loader2 size={32} className="animate-spin" /> : <><Save size={32} /> SIMPAN HASIL PENILAIAN ✨</>}
                  </button>
               </section>
            </div>
         </div>
      )}

      {activeStep === 'HISTORY' && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {publishedReports.map((req, i) => {
               const sName = req.studentsAttended?.[0] || 'SISWA';
               const rawScores = req.studentScores?.[sName];
               const scores = (Array.isArray(rawScores) && rawScores.length > 0 ? rawScores : []) as number[];
               const avg = scores.length > 0 ? Math.round(scores.reduce((a:number,b:number)=>a+b,0)/scores.length) : 0;
               const isPass = avg >= 80;
               const isReadyToSend = req.status === 'REPORT_READY';
               const isNewlyActioned = req.id === lastActionedId;
               const periode = req.periode || 1; // ✅ AMBIL PERIODE

               return (
                  <div 
                    key={i} 
                    id={`history-card-${req.id}`}
                    className={`bg-white p-12 md:p-14 rounded-[4rem] shadow-xl border-2 transition-all flex flex-col relative ${isNewlyActioned ? 'border-blue-500 shadow-blue-100' : isReadyToSend ? 'border-amber-400 bg-amber-50/10' : isPass ? 'border-slate-100 hover:border-blue-500' : 'border-slate-100 hover:border-orange-500'}`}
                  >
                    {/* ✅ BADGE CONTAINER */}
                     {isNewlyActioned && (
                        <div className="absolute -top-3 -right-3 px-6 py-2 bg-blue-600 text-white rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl animate-bounce z-20">
                           TERBARU ✨
                        </div>
                     )}
                     
                     <div className="flex justify-between items-start mb-10">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner shrink-0 ${isPass ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{isPass ? <BadgeCheck size={40}/> : <AlertCircle size={40}/>}</div>
                        <div className="flex flex-col items-end gap-2">
                           <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center ${isPass ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>{isPass ? 'LULUS' : 'REMEDIAL'}</span>
                           {isReadyToSend && <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest animate-pulse italic">SIAP DIKIRIM ✨</span>}
                        </div>
                     </div>
                     <h4 className="text-2xl font-black text-slate-800 uppercase italic mb-1 truncate">{sName}</h4>
                     <p className="text-[11px] font-bold text-blue-600 uppercase mb-10 leading-relaxed">{req.className}</p>
                     
                     {/* ✅ INFO BOX DENGAN PERIODE DI TENGAH */}
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] mb-10">
                        <div className="flex justify-between items-center">
                           {/* NILAI */}
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rerata</p>
                              <p className={`text-3xl font-black italic ${isPass ? 'text-blue-600' : 'text-orange-600'}`}>{avg}</p>
                           </div>
                           
                           {/* TANGGAL */}
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{isReadyToSend ? 'Selesai' : 'Terkirim'}</p>
                              <p className="text-[11px] font-black text-slate-800 uppercase tracking-normal">{formatDateToDMY(req.date)}</p>
                           </div>
                        </div>
                     </div>
                     
                     <div className="space-y-4 mt-auto">
                        {isReadyToSend ? (
                           <>
                              <button 
                                onClick={() => handleSendReportToStudent(req)} 
                                disabled={!!actionLoadingId} 
                                className="w-full py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 group"
                              >
                                 {actionLoadingId === req.id ? <Loader2 size={20} className="animate-spin" /> : <><SendHorizonal size={20} className="group-hover:translate-x-2 transition-transform"/> KIRIM RAPOT KE SISWA ✨</>}
                              </button>
                              <button onClick={() => handleOpenWorkspace(req, true)} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-[2rem] font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-500 transition-all">
                                 <FileEdit size={16}/> EDIT PENILAIAN
                              </button>
                           </>
                        ) : (
                           <>
                              <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-[2rem] font-black text-[10px] uppercase flex items-center justify-center gap-3 border-2 border-emerald-100 shadow-sm mb-2">
                                 <CheckCircle2 size={18}/> SUDAH DITERIMA SISWA ✨
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                 <button onClick={() => handleOpenWorkspace(req, true)} className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                    <FileEdit size={16}/> EDIT
                                 </button>
                                 <button onClick={() => handleDownloadPDF(req)} disabled={activeDownloadId === req.id} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-xl">
                                    {activeDownloadId === req.id ? <Loader2 className="animate-spin" size={16}/> : <Printer size={16}/>} CETAK
                                 </button>
                              </div>
                           </>
                        )}
                     </div>
                  </div>
               );
            })}
            {publishedReports.length === 0 && (
               <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-30">
                  <History size={64} className="mx-auto mb-6 text-slate-300" />
                  <p className="font-black text-[11px] uppercase tracking-[0.4em] italic leading-relaxed text-center">Belum ada histori rapot. ✨</p>
               </div>
            )}
         </div>
      )}


      {showMilestoneFor && (
        <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
           <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative overflow-hidden space-y-10 opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
              <button onClick={() => setShowMilestoneFor(null)} className="absolute top-10 right-10 p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
              <div className="flex items-center gap-6"><div className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-3"><History size={32} /></div><div><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Milestone Belajar</h4><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{showMilestoneFor.studentsAttended?.[0]}</p></div></div>
              <MilestoneView 
                studentAttendanceLogs={studentAttendanceLogs} 
                studentName={showMilestoneFor.studentsAttended?.[0] || ''} 
                packageId={showMilestoneFor.packageId}
                periode={showMilestoneFor.periode || 1}
              />
              <button onClick={() => setShowMilestoneFor(null)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl">TUTUP MILESTONE ✨</button>
           </div>
        </div>
      )}

      {confirmReject && (
         <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
            <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
               <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-pulse"><AlertCircle size={48} /></div>
               <div className="space-y-2"><h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Tolak Permintaan?</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest Kalimat leading-relaxed px-4">Siswa akan diminta memilih pengajar lain untuk klaim rapot mereka.</p></div>
               <div className="flex gap-4">
  <button onClick={() => setConfirmReject(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button>
<button onClick={handleRejectRequest} disabled={!!actionLoadingId} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">{actionLoadingId === `reject-${confirmReject.id}` ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18}/>} IYA, TOLAK</button>
</div>
<button onClick={() => { setConfirmReject(null); setConfirmNextClass(confirmReject); }} className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 mt-2">
  <ChevronRight size={18}/> LANJUT KELAS BERIKUTNYA
</button>
            </div>
         </div>
  )}
  {confirmNextClass && (
  <div data-modal-container className="fixed inset-0 z-[120000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
    <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 shadow-2xl relative opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
      <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm animate-pulse"><ChevronRight size={48} /></div>
      <div className="space-y-2">
        <h4 className="text-2xl font-black text-slate-800 uppercase italic leading-none">Lanjut Kelas Berikutnya?</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest Kalimat leading-relaxed px-4">Siswa akan dilanjutkan ke kelas berikutnya. Keputusan ini tidak dapat diubah.</p>
      </div>
      <div className="flex gap-4">
        <button onClick={() => setConfirmNextClass(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase">BATAL</button>
        <button onClick={handleNextClass} disabled={!!actionLoadingId} className="flex-1 py-5 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">
          {actionLoadingId === `next-${confirmNextClass.id}` ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18}/>} YA, LANJUTKAN ✨
        </button>
      </div>
    </div>
  </div>
      )}
    </div>
    </>
  );
};

export default TeacherReportsInbox;
