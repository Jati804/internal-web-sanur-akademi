import React from 'react';
import { Attendance } from './types';
import { 
  GraduationCap, BadgeCheck, Layout, 
  ClipboardList, Quote
} from 'lucide-react';

interface ReportTemplateProps {
  reportLog: Attendance; 
  allLogs: Attendance[]; 
  studentAttendanceLogs: any[];
  studentName: string;
}

export const formatDateToDMY = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const SESSION_COLORS = ['text-blue-500', 'text-emerald-500', 'text-orange-500', 'text-rose-500', 'text-purple-500', 'text-amber-500'];

const ASSETS = { 
  LOGO: "https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/SANUR%20Logo.png" 
};

const getDirectValue = (dataObj: any, defaultValue: any) => {
  if (!dataObj || typeof dataObj !== 'object') return defaultValue;
  const keys = Object.keys(dataObj);
  if (keys.length === 0) return defaultValue;
  return dataObj[keys[0]] || defaultValue;
};

const ReportTemplate: React.FC<ReportTemplateProps> = ({ 
  reportLog, 
  allLogs, 
  studentAttendanceLogs,
  studentName 
}) => {
  // 1. DATA GURU
const rawScores = getDirectValue(reportLog.studentScores, null);
const scores: number[] = Array.isArray(rawScores) && rawScores.length > 0 ? rawScores : [];

const rawTopics = getDirectValue(reportLog.studentTopics, null);
const topics: string[] = Array.isArray(rawTopics) && rawTopics.length > 0 ? rawTopics : [];

const totalScore = scores.reduce((a, b) => a + b, 0);
const avg = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
const isPass = avg >= 80;
  
  const matpelMatch = reportLog.className?.match(/(.*) \((.*)\) - (.*)/);
  const subject = matpelMatch ? matpelMatch[1] : (reportLog.className || "PROGRAM SANUR");
  const level = matpelMatch ? matpelMatch[2] : (reportLog.level || 'BASIC');
  
  // ✅ AMBIL PERIODE DARI DATABASE
  const sessionNumbers = Array.from({ length: scores.length }, (_, i) => i + 1);

  // ✅ Selalu 1 kolom, maks 8 baris (batasnya udah diatur di form guru)
  const materiCount = sessionNumbers.length;
  const ROW_HEIGHT = 50; // px per baris — pas buat nampung s/d 8 materi di halaman landscape
  
  // 2. DATA SISWA ONLY (Untuk Milestone)
const sNameNorm = studentName.toUpperCase().trim();
const pkgIdNorm = (reportLog.packageId || '').toUpperCase().trim();

// ✅ PRIORITAS: Pakai backup milestone dari reports kalau ada
// Kalau nggak ada, baru ambil dari student_attendance (live data)
const studentOnlyLogs = (() => {
  // 1. Cek apakah ada backup milestone di reports
  if (reportLog.student_milestone && Array.isArray(reportLog.student_milestone) && reportLog.student_milestone.length > 0) {
    console.log('📦 Pakai milestone dari backup (siswa mungkin udah dihapus)');
    return reportLog.student_milestone.sort((a, b) => (a.sessionnumber || 0) - (b.sessionnumber || 0));
  }
  
  // 2. Kalau nggak ada backup, ambil dari student_attendance (live)
  console.log('📡 Pakai milestone dari student_attendance (live data)');
  return [...(studentAttendanceLogs || [])]
    .filter(l => 
      (l.packageid || '').toUpperCase().trim() === pkgIdNorm && 
      (l.studentname || '').toUpperCase().trim() === sNameNorm
    )
    .sort((a, b) => (a.sessionnumber || 0) - (b.sessionnumber || 0));
})();

  // LOGIKA QR CODE
  const statusLabel = isPass ? "LULUS & KOMPETEN" : "PESERTA PELATIHAN";
  const verifyUrl = `https://sanur-verify.vercel.app/verify?id=${reportLog.id}`;
  const finalQrData = verifyUrl;

    // 👇 TAMBAH INI
  const FONT_STYLE = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,900;1,900&display=swap');
  `;

  // ✅ HALAMAN 1 & 2: LANDSCAPE (1123x794px) — SEKARANG DUA-DUANYA SAMA
  const PAGE_LANDSCAPE: React.CSSProperties = {
    width: '1123px',
    height: '794px',
    backgroundColor: 'white',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <div id={`report-pabrik-${reportLog.id}`} style={{ width: '1123px' }}>
      
      {/* ✅ HALAMAN 1: SERTIFIKAT LANDSCAPE - SIMPLIFIED */}
      <div id={`cert-render-${reportLog.id}`} style={{ ...PAGE_LANDSCAPE, border: `25px double ${isPass ? '#1e3a8a' : '#ea580c'}` }}>
        <div style={{ width: '100%', height: '100%', border: '4px solid #cbd5e1', display: 'flex', flexDirection: 'row', boxSizing: 'border-box', position: 'relative' }}>

{/* SIDEBAR KIRI UNTUK QR CODE */}
<div style={{ 
  width: '140px', 
  background: isPass 
    ? 'linear-gradient(180deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)' 
    : 'linear-gradient(180deg, #f97316 0%, #ea580c 50%, #dc2626 100%)', 
  display: 'flex', 
  flexDirection: 'column', 
  alignItems: 'center', 
  justifyContent: 'center',
  padding: '30px 15px'
}}>
  <div style={{ 
    backgroundColor: 'white', 
    padding: '12px', 
    borderRadius: '15px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  }}>
    <img 
      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(finalQrData)}`} 
      style={{ width: '100px', height: '100px', display: 'block' }}
    />
  </div>
  <p style={{ 
    fontSize: '8px', 
    fontWeight: '900', 
    color: 'white', 
    textAlign: 'center', 
    marginTop: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }}>
    Verifikasi
  </p>
</div>

{/* KONTEN UTAMA */}
<div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '50px 80px' }}>
          
          {/* HEADER - LOGO AJA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '50px' }}>
            <img src={ASSETS.LOGO} style={{ maxWidth: '240px', maxHeight: '80px', objectFit: 'contain' }} />
          </div>

          {/* KONTEN UTAMA */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <h2 style={{ fontSize: '38px', fontFamily: 'serif', fontStyle: 'italic', color: isPass ? '#1e3a8a' : '#ea580c', margin: '0 0 25px 0' }}>
              {isPass ? 'Sertifikat Kelulusan' : 'Capaian Pembelajaran'}
            </h2>
            
            <p style={{ fontSize: '14px', fontFamily: 'serif', fontStyle: 'italic', color: '#64748b', margin: '0 0 15px 0' }}>
              Diberikan kepada:
            </p>
            
            <div style={{ display: 'inline-block', marginBottom: '40px' }}>
              <h3 style={{ fontSize: '34px', fontWeight: '900', color: isPass ? '#2563eb' : '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, lineHeight: 1.1 }}>
                {studentName.toUpperCase()}
              </h3>
              <div style={{ width: '100%', height: '4px', backgroundColor: isPass ? '#dbeafe' : '#ffedd5', marginTop: '10px', borderRadius: '10px' }}></div>
            </div>
            
<p style={{ fontSize: '14px', fontFamily: 'serif', fontStyle: 'italic', color: '#475569', lineHeight: '1.7', margin: '0 0 8px 0', padding: '0 100px' }}>
  {isPass 
    ? "Telah menyelesaikan seluruh materi pelatihan dan lulus dalam ujian standar kompetensi" 
    : "Telah berkomitmen mengikuti dan menyelesaikan seluruh rangkaian program pelatihan"}
</p>
<p style={{ fontSize: '14px', fontFamily: 'serif', fontStyle: 'normal', color: isPass ? '#1e3a8a' : '#ea580c', fontWeight: '700', margin: '0 0 40px 0' }}>
  SANUR AKADEMI INSPIRASI
</p>

            {/* ✅ KOTAK HANYA UNTUK SUBJECT & LEVEL */}
            <div style={{ background: isPass ? 'linear-gradient(135deg, #1e3a8a, #0f172a)' : 'linear-gradient(135deg, #ea580c, #0f172a)', width: '700px', padding: '30px 20px', borderRadius: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -8px rgba(0,0,0,0.15)', marginBottom: '50px' }}>
               <p style={{ fontSize: '22px', fontWeight: '900', color: 'white', textTransform: 'uppercase', fontStyle: 'italic', margin: 0, lineHeight: 1.2 }}>{subject}</p>
               <p style={{ fontSize: '16px', fontWeight: '900', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.3em', margin: '8px 0 0 0' }}>LEVEL {level}</p>
            </div>
          </div>

{/* ✅ FOOTER - CUMA TANGGAL TERBIT + ID SERTIFIKAT */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '0', marginTop: 'auto' }}>
  <div style={{ textAlign: 'center' }}>
    <p style={{ fontSize: '9px', fontWeight: '900', color: isPass ? '#60a5fa' : '#fb923c', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '3px' }}>Tanggal Terbit</p>
    <p style={{ fontSize: '13px', fontWeight: '900', color: '#64748b', fontStyle: 'italic' }}>{formatDateToDMY(reportLog.date)}</p>
  </div>
  <div style={{ textAlign: 'center' }}>
    <p style={{ fontSize: '9px', fontWeight: '900', color: isPass ? '#60a5fa' : '#fb923c', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '3px' }}>ID Sertifikat</p>
    <p style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', fontStyle: 'italic' }}>{reportLog.id.toUpperCase()}</p>
  </div>
</div>

        </div> {/* Tutup konten utama */}
        </div> {/* Tutup wrapper dengan border */}
      </div> {/* Tutup halaman 1 */}

      {/* ✅ HALAMAN 2: TRANSKRIP — SEKARANG LANDSCAPE, MATERI FLEKSIBEL */}
      <div id={`transcript-render-${reportLog.id}`} style={{ ...PAGE_LANDSCAPE, padding: '40px 60px' }}>
  <style>{FONT_STYLE}</style>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', position: 'relative', zIndex: 10, flexShrink: 0 }}>
          <div style={{ width: '44px', height: '44px', backgroundColor: '#0f172a', color: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(6deg)', flexShrink: 0 }}><Layout size={22}/></div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', fontStyle: 'italic', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '-0.05em', lineHeight: 1, margin: 0 }}>Transkrip <span style={{ color: isPass ? '#2563eb' : '#ea580c' }}>Nilai</span></h1>
          </div>
        </div>
        
        
<div style={{ marginBottom: '16px', position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 }}>
  <p style={{ fontSize: '12px', fontWeight: '900', color: isPass ? '#2563eb' : '#ea580c', textTransform: 'uppercase', letterSpacing: '0.3em', margin: 0 }}>
    📚 MATERI KURIKULUM
  </p>
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
  <p style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3em', margin: '0 -0.3em 3px 0' }}>Guru Penilai</p>
  <p style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.05em', margin: '0 -0.05em 0 0', whiteSpace: 'nowrap' }}>{reportLog.teacherName || '-'}</p>
  </div>
</div>


        {/* ✅ KOTAK MATERI - 1 KOLOM, TINGGI PER BARIS TETAP (NGGAK DI-STRETCH), MAKS 8 BARIS */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '32px', 
          border: '3px solid #f1f5f9', 
          overflow: 'hidden', 
          marginBottom: '18px', 
          position: 'relative', 
          zIndex: 10,
          flexShrink: 0
        }}>
          {/* HEADER BAR - MATERI RATA KIRI (SEJAJAR ISI BARIS), NILAI TETEP RATA TENGAH */}
          <div style={{ backgroundColor: '#0f172a', color: 'white', display: 'flex' }}>
            <div style={{ flex: 1, padding: '9px 35px', textAlign: 'left' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Materi</span>
            </div>
            <div style={{ width: '234px', padding: '9px 14px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Nilai</span>
            </div>
          </div>

          {materiCount === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Belum ada data materi</span>
            </div>
          ) : (
            sessionNumbers.map((sessionNum, i) => (
              <div key={i} style={{
                height: `${ROW_HEIGHT}px`,
                display: 'flex',
                alignItems: 'center',
                borderBottom: i < sessionNumbers.length - 1 ? '1px solid #f1f5f9' : 'none'
              }}>
                <div style={{ flex: 1, padding: '0 35px', overflow: 'hidden', textAlign: 'left' }}>
                  <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '-0.005em', lineHeight: 1.25, display: 'block' }}>
                    {topics[i] || 'Materi Pembelajaran'}
                  </span>
                </div>
                {/* ✅ Opsi B: garis pembatas + tint warna tipis biar kolom nilai keliatan "kotak" sendiri */}
                {/* ✅ Lebar 234px + center align biar sejajar sama kotak Status Capaian di footer */}
                <div style={{
                  width: '234px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  flexShrink: 0,
                  alignSelf: 'stretch',
                  borderLeft: '1px solid #f1f5f9',
                  backgroundColor: isPass ? 'rgba(37, 99, 235, 0.05)' : 'rgba(234, 88, 12, 0.05)'
                }}>
                  <span style={{ fontWeight: '900', color: isPass ? '#2563eb' : '#ea580c', fontSize: '18px' }}>{scores[i] || 0}</span>
                  <span style={{ color: '#94a3b8', fontWeight: '700', fontSize: '10px' }}>/100</span>
                </div>
              </div>
            ))
          )}
        </div>

{/* Footer Transkrip - ukuran natural, nempel langsung di bawah kotak materi (nggak stretch); sisa ruang dibiarin kosong di bawah */}
<div style={{ padding: '22px 32px', backgroundColor: '#0f172a', borderRadius: '36px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
  <div style={{ position: 'relative', zIndex: 10 }}>
    <p style={{ fontSize: '8px', fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5em', marginBottom: '3px' }}>Evaluasi Kumulatif</p>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
      <p style={{ fontSize: '13px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RATA-RATA:</p>
      <h4 style={{ fontSize: '44px', fontWeight: '900', fontStyle: 'italic', letterSpacing: '-0.05em', margin: 0, transform: 'translateY(4px)' }}>{avg}</h4>
      <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', fontWeight: '900', fontStyle: 'italic' }}>/ 100</span>
    </div>
  </div>
  
  <div style={{ 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    padding: '14px 20px', 
    borderRadius: '22px', 
    border: '1px solid rgba(255,255,255,0.2)', 
    borderBottom: `5px solid ${isPass ? '#10b981' : '#f97316'}`,
    textAlign: 'center', 
    minWidth: '170px', 
    position: 'relative', 
    zIndex: 10 
  }}>
    <p style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#93c5fd', marginBottom: '4px' }}>Status Capaian</p>
    <p style={{ fontSize: '15px', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', margin: 0 }}>{isPass ? 'KOMPETEN' : 'REMEDIAL'}</p>
  </div>
</div>
</div>
    </div>
  );
};

export default ReportTemplate;
