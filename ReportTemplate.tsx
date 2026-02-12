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
  const rawScores = getDirectValue(reportLog.studentScores, Array(6).fill(0));
  const scores: number[] = Array.isArray(rawScores) ? rawScores : Array(6).fill(0);
  
  const rawTopics = getDirectValue(reportLog.studentTopics, Array(6).fill("MATERI BELUM DIISI"));
  const topics: string[] = Array.isArray(rawTopics) ? rawTopics : Array(6).fill("MATERI BELUM DIISI");
  
  const nar = getDirectValue(reportLog.studentNarratives, "") || reportLog.reportNarrative || "ULASAN BELUM TERSEDIA.";
  
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const avg = scores.length > 0 ? Math.round(totalScore / 6) : 0;
  const isPass = avg >= 80;
  
  const matpelMatch = reportLog.className?.match(/(.*) \((.*)\) - (.*)/);
  const subject = matpelMatch ? matpelMatch[1] : (reportLog.className || "PROGRAM SANUR");
  const level = matpelMatch ? matpelMatch[2] : (reportLog.level || 'BASIC');
  
  // ✅ AMBIL PERIODE DARI DATABASE
  const periode = reportLog.periode || 1;
  const startSession = (periode - 1) * 6 + 1;
  const sessionNumbers = Array.from({ length: 6 }, (_, i) => startSession + i);
  
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
  const verifyUrl = `https://sanur-verify.vercel.app/#/verify?id=${reportLog.id}`;
  const finalQrData = verifyUrl;

  // ✅ HALAMAN 1: LANDSCAPE (1123x794px)
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

  // HALAMAN 2 & 3: PORTRAIT (794x1123px)
  const PAGE_PORTRAIT: React.CSSProperties = {
    width: '794px',
    height: '1123px',
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
    Scan untuk verifikasi
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
            
            <p style={{ fontSize: '14px', fontFamily: 'serif', fontStyle: 'italic', color: '#475569', lineHeight: '1.7', margin: '0 0 40px 0', padding: '0 100px' }}>
              {isPass 
                ? "Telah menunjukkan kompetensi luar biasa dan berhasil menyelesaikan seluruh kurikulum pelatihan intensif dengan hasil memuaskan pada program:" 
                : "Telah berpartisipasi aktif dan menyelesaikan modul pelatihan intensif dengan dedikasi tinggi guna meningkatkan kompetensi pada program:"}
            </p>

            {/* ✅ KOTAK HANYA UNTUK SUBJECT & LEVEL */}
            <div style={{ background: isPass ? 'linear-gradient(135deg, #1e3a8a, #0f172a)' : 'linear-gradient(135deg, #ea580c, #0f172a)', width: '700px', padding: '30px 20px', borderRadius: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -8px rgba(0,0,0,0.15)', marginBottom: '50px' }}>
               <p style={{ fontSize: '22px', fontWeight: '900', color: 'white', textTransform: 'uppercase', fontStyle: 'italic', margin: 0, lineHeight: 1.2 }}>{subject}</p>
               <p style={{ fontSize: '16px', fontWeight: '900', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.3em', margin: '8px 0 0 0' }}>LEVEL {level}</p>
            </div>
          </div>

{/* ✅ FOOTER - CUMA TANGGAL TERBIT + ID SERTIFIKAT */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0', marginTop: 'auto' }}>
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

      {/* ✅ HALAMAN 2: TRANSKRIP (PORTRAIT) - PERIODE HIGHLIGHTED */}
      <div id={`transcript-render-${reportLog.id}`} style={{ ...PAGE_PORTRAIT, padding: '70px 60px' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '350px', height: '350px', backgroundColor: '#eff6ff', borderRadius: '999px', marginRight: '-175px', marginTop: '-175px', opacity: 0.4 }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '52px', height: '52px', backgroundColor: '#0f172a', color: 'white', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(6deg)' }}><Layout size={26}/></div>
          <div>
            <h1 style={{ fontSize: '34px', fontWeight: '900', fontStyle: 'italic', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '-0.05em', lineHeight: 1 }}>Transkrip <span style={{ color: isPass ? '#2563eb' : '#ea580c' }}>Nilai</span></h1>
          </div>
        </div>
        
        
<div style={{ marginBottom: '30px', position: 'relative', zIndex: 10 }}>
  <p style={{ fontSize: '13px', fontWeight: '900', color: isPass ? '#2563eb' : '#ea580c', textTransform: 'uppercase', letterSpacing: '0.3em', textAlign: 'center', margin: 0 }}>
    📚 MATERI KURIKULUM
  </p>
</div>

        <div style={{ backgroundColor: 'white', borderRadius: '35px', border: '3px solid #f1f5f9', overflow: 'hidden', marginBottom: '30px', position: 'relative', zIndex: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: 'white' }}>
                <th style={{ padding: '14px', textAlign: 'center', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Materi</th>
                <th style={{ padding: '14px', textAlign: 'center', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', width: '120px' }}>Nilai</th>
              </tr>
            </thead>
            <tbody>
              {/* ✅ GANTI NOMOR SESI JADI DINAMIS */}
              {sessionNumbers.map((sessionNum, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', height: '78px' }}>
                  <td style={{ padding: '0 35px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{ fontWeight: '900', color: '#1e293b', fontSize: '20px', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1.1, display: 'block' }}>{topics[i] || "MATERI PEMBELAJARAN"}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '100%' }}>
                      <span style={{ fontWeight: '900', color: isPass ? '#2563eb' : '#ea580c', fontSize: '20px', fontStyle: 'italic' }}>{scores[i] || 0}</span>
                      <span style={{ color: '#cbd5e1', fontWeight: '700', fontSize: '11px' }}>/100</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

{/* Footer Transkrip */}
<div style={{ padding: '30px 40px', backgroundColor: '#0f172a', borderRadius: '42px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
  <div style={{ position: 'absolute', top: 0, right: 0, width: '230px', height: '230px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '999px', marginRight: '-130px', marginTop: '-130px' }}></div>
  
  <div style={{ position: 'relative', zIndex: 10 }}>
    <p style={{ fontSize: '9px', fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5em', marginBottom: '4px' }}>Evaluasi Kumulatif</p>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
      <p style={{ fontSize: '15px', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RATA-RATA:</p>
      <h4 style={{ fontSize: '60px', fontWeight: '900', fontStyle: 'italic', letterSpacing: '-0.05em' }}>{avg}</h4>
      <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)', fontWeight: '900', fontStyle: 'italic' }}>/ 100</span>
    </div>
  </div>
  
  <div style={{ 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    padding: '18px 24px', 
    borderRadius: '25px', 
    border: '1px solid rgba(255,255,255,0.2)', 
    borderBottom: `6px solid ${isPass ? '#10b981' : '#f97316'}`,
    textAlign: 'center', 
    minWidth: '190px', 
    position: 'relative', 
    zIndex: 10 
  }}>
    <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#93c5fd', marginBottom: '5px' }}>Status Capaian</p>
    <p style={{ fontSize: '17px', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' }}>{isPass ? 'KOMPETEN' : 'REMEDIAL'}</p>
  </div>
</div>
      </div>

      {/* ✅ HALAMAN 3: MILESTONE (PORTRAIT) - TANPA TULISAN PERIODE */}
      <div id={`milestone-render-${reportLog.id}`} style={{ ...PAGE_PORTRAIT, padding: '70px 80px' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '350px', height: '350px', backgroundColor: isPass ? '#eff6ff' : '#fff7ed', borderRadius: '999px', marginLeft: '-175px', marginTop: '-175px', opacity: 0.5 }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '35px', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '52px', height: '52px', backgroundColor: isPass ? '#1e3a8a' : '#7c2d12', color: 'white', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(6deg)' }}><BadgeCheck size={26}/></div>
          <div>
            <h1 style={{ fontSize: '34px', fontWeight: '900', fontStyle: 'italic', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Langkah <span style={{ color: isPass ? '#2563eb' : '#ea580c' }}>Pembelajaran</span></h1>
          </div>
        </div>
        
        <div style={{ marginBottom: '40px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', color: isPass ? '#2563eb' : '#ea580c', borderBottom: '3px solid #f8fafc', paddingBottom: '10px', marginBottom: '25px' }}>
            <ClipboardList size={22}/>
            <h3 style={{ fontSize: '15px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Log Presensi Mandiri Siswa</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* ✅ GANTI NOMOR SESI JADI DINAMIS (TANPA TULISAN PERIODE) */}
            {sessionNumbers.map((sessionNum, idx) => { 
               const studentLog = studentOnlyLogs.find(x => x.sessionnumber === (idx + 1));
               return (
                 <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '40px', padding: '10px 40px', borderBottom: '1px solid #f8fafc' }}>
                   <div style={{ fontWeight: '900', fontSize: '18px', textTransform: 'uppercase', fontStyle: 'italic', width: '85px' }} className={SESSION_COLORS[idx] || 'text-slate-400'}>SESI {sessionNum}</div>
                   <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                     <p style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {studentLog ? formatDateToDMY(studentLog.date) : "BELUM ABSEN"}
                     </p>
                     <p style={{ fontSize: '10px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', fontStyle: 'italic' }}>
                        {studentLog ? "DURASI: 2 JAM / 120 MENIT" : "—"}
                     </p>
                   </div>
                 </div>
               ); 
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginBottom: '55px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', color: isPass ? '#2563eb' : '#f97316', borderBottom: '3px solid #f8fafc', paddingBottom: '10px', marginBottom: '20px' }}>
            <Quote size={22}/>
<h3 style={{ fontSize: '15px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Ulasan Pengajar</h3>
</div>

{/* Nama Pengajar */}
<p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginTop: '10px', marginBottom: '15px', textAlign: 'center', fontWeight: '600' }}>
  OLEH: <span style={{ color: '#1e293b', fontWeight: '800' }}>{reportLog.teacherName}</span>
</p>
          <div style={{ flex: 1, backgroundColor: isPass ? '#f0f9ff' : '#fff7ed', borderRadius: '42px', border: '4px solid #f1f5f9', padding: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
             <p style={{ 
               fontSize: '17px', 
               fontFamily: 'serif', 
               fontStyle: 'italic', 
               color: '#334155', 
               lineHeight: '1.6', 
               padding: '0 32px',
               wordBreak: 'break-word',
               overflowWrap: 'anywhere',
               whiteSpace: 'pre-wrap',
               maxWidth: '100%',
               boxSizing: 'border-box'
             }}>"{nar}"</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '35px', position: 'relative', zIndex: 10, borderTop: '2px solid #f1f5f9', opacity: 0.6 }}>
          <p style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8em', color: '#94a3b8', textAlign: 'center' }}>Sanur Akademi Inspirasi</p>
        </div>
      </div>
    </div>
  );
};

export default ReportTemplate;
