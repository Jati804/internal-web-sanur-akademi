
import React from 'react';
import { Attendance } from './types';
import { 
  GraduationCap, BadgeCheck, Layout, 
  ClipboardList, Quote
} from 'lucide-react';

interface ReportTemplateProps {
  reportLog: Attendance; 
  allLogs: Attendance[]; 
  studentAttendanceLogs: any[]; // ✅ TAMBAHAN INI KAK!
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

/**
 * Fungsi "Direct Data": Mengambil value pertama dari JSON object.
 */
const getDirectValue = (dataObj: any, defaultValue: any) => {
  if (!dataObj || typeof dataObj !== 'object') return defaultValue;
  const keys = Object.keys(dataObj);
  if (keys.length === 0) return defaultValue;
  return dataObj[keys[0]] || defaultValue;
};

const ReportTemplate: React.FC<ReportTemplateProps> = ({ 
  reportLog, 
  allLogs, 
  studentAttendanceLogs, // ✅ TAMBAHAN INI KAK!
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
  
  // 2. DATA SISWA ONLY (Untuk Milestone)
const sNameNorm = studentName.toUpperCase().trim();
const pkgIdNorm = (reportLog.packageId || '').toUpperCase().trim();

// ✅ GANTI KE TABLE BARU (student_attendance)
const studentOnlyLogs = [...studentAttendanceLogs]
  .filter(l => 
    (l.packageid || '').toUpperCase().trim() === pkgIdNorm && 
    (l.studentname || '').toUpperCase().trim() === sNameNorm
  )
  .sort((a, b) => (a.sessionnumber || 0) - (b.sessionnumber || 0));

  // LOGIKA QR CODE: Teks Informasi
  const statusLabel = isPass ? "LULUS & KOMPETEN" : "PESERTA PELATIHAN";
  const qrRawText = `SANUR AKADEMI INSPIRASI\nVERIFIKASI DIGITAL RESMI\n--------------------------\nNama: ${studentName.toUpperCase()}\nProgram: ${subject.toUpperCase()}\nLevel: ${level.toUpperCase()}\nTipe: ${reportLog.sessionCategory || 'REGULER'}\nTanggal: ${formatDateToDMY(reportLog.date)}\nStatus: ${statusLabel}\nID Ref: SN-${reportLog.id.substring(0,8).toUpperCase()}`;
  
  const finalQrData = encodeURIComponent(qrRawText);

  // STYLE LOCK: Ukuran A4 standar (794x1123px)
  const PAGE_STYLE: React.CSSProperties = {
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
    <div id={`report-pabrik-${reportLog.id}`} style={{ width: '794px' }}>
      
      {/* HALAMAN 1: SERTIFIKAT (OPTIMIZED SPACING) */}
      <div id={`cert-render-${reportLog.id}`} style={{ ...PAGE_STYLE, border: `25px double ${isPass ? '#1e3a8a' : '#ea580c'}` }}>
        <div style={{ width: '100%', height: '100%', border: '4px solid #f1f5f9', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative' }}>
          
          {/* AREA ATAS: HEADER */}
          <div style={{ height: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '40px', borderBottom: '1px solid white' }}>
            <img src={ASSETS.LOGO} style={{ maxWidth: '260px', maxHeight: '80px', objectFit: 'contain', marginBottom: '15px' }} />
            <h1 style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '0.2em', color: '#1e293b', textTransform: 'uppercase', margin: 0 }}>SANUR AKADEMI INSPIRASI</h1>
            <div style={{ width: '280px', height: '2px', backgroundColor: '#e2e8f0', marginTop: '8px' }}></div>
          </div>

          {/* AREA TENGAH: KONTEN UTAMA */}
          <div style={{ height: '530px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', textAlign: 'center', padding: '0 60px', boxSizing: 'border-box' }}>
            <h2 style={{ fontSize: '42px', fontFamily: 'serif', fontStyle: 'italic', color: isPass ? '#1e3a8a' : '#ea580c', margin: '0 0 25px 0' }}>
              {isPass ? 'Sertifikat Kelulusan' : 'Capaian Pembelajaran'}
            </h2>
            
            <p style={{ fontSize: '16px', fontFamily: 'serif', fontStyle: 'italic', color: '#64748b', margin: '0 0 15px 0' }}>
              Diberikan kepada:
            </p>
            
            <div style={{ display: 'inline-block' }}>
  <h3 style={{ fontSize: '38px', fontWeight: '900', color: isPass ? '#2563eb' : '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, lineHeight: 1.1 }}>
    {studentName.toUpperCase()}
  </h3>
  
  <div style={{ width: '100%', height: '5px', backgroundColor: isPass ? '#dbeafe' : '#ffedd5', marginTop: '12px', borderRadius: '10px' }}></div>
</div>

<div style={{ height: '45px' }}></div>
            
            <p style={{ fontSize: '14px', fontFamily: 'serif', fontStyle: 'italic', color: '#475569', lineHeight: '1.8', margin: '0 0 45px 0', padding: '0 60px' }}>
              {isPass 
                ? "Telah menunjukkan kompetensi luar biasa dan berhasil menyelesaikan seluruh kurikulum pelatihan intensif dengan hasil memuaskan pada program:" 
                : "Telah berpartisipasi aktif dan menyelesaikan modul pelatihan intensif dengan dedikasi tinggi guna meningkatkan kompetensi pada program:"}
            </p>

            <div style={{ background: isPass ? 'linear-gradient(135deg, #1e3a8a, #0f172a)' : 'linear-gradient(135deg, #ea580c, #0f172a)', width: '620px', padding: '32px 25px', borderRadius: '40px', border: '4px solid white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 35px -10px rgba(0,0,0,0.15)' }}>
               <p style={{ fontSize: '22px', fontWeight: '900', color: 'white', textTransform: 'uppercase', fontStyle: 'italic', margin: 0, lineHeight: 1.2 }}>{subject}</p>
               <p style={{ fontSize: '9px', fontWeight: '900', color: isPass ? '#93c5fd' : '#fed7aa', letterSpacing: '0.6em', textTransform: 'uppercase', marginTop: '10px' }}>LEVEL {level}</p>
            </div>
          </div>

          {/* AREA BAWAH: FOOTER (DITURUNIN DIKIT AGAR TIDAK NABRAK BOX TENGAH) */}
          <div style={{ position: 'absolute', bottom: '20px', height: '293px', width: '100%', borderTop: '1px solid white', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100%', padding: '0 100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center', marginTop: '-15px' }}>
 		<p style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3em', margin: '0 0 5px 0' }}>Tanggal Terbit:</p>
		<p style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{formatDateToDMY(reportLog.date)}</p>
	      </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', opacity: 0.12, color: isPass ? '#1e3a8a' : '#ea580c' }}>
                <GraduationCap size={75} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <div style={{ padding: '6px', border: '3px solid #f1f5f9', borderRadius: '15px', backgroundColor: 'white' }}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${finalQrData}`} style={{ width: '65px', height: '65px' }} />
                 </div>
                 <p style={{ fontSize: '7px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginTop: '8px' }}>Verifikasi Digital Resmi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HALAMAN 2: TRANSKRIP (UNIFIED FONT SIZE 20PX) */}
      <div id={`transcript-render-${reportLog.id}`} style={{ ...PAGE_STYLE, padding: '48px', border: '8px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '50px', height: '50px', backgroundColor: isPass ? '#2563eb' : '#ea580c', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Layout size={24}/></div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '900', fontStyle: 'italic', color: isPass ? '#2563eb' : '#ea580c', textTransform: 'uppercase', lineHeight: 1, letterSpacing: '-0.02em' }}>SANUR</h1>
              <p style={{ fontSize: '8px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4em', marginTop: '4px' }}>Catatan Akademik Resmi</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '8px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kode Referensi</p>
            <p style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>SN/TR/{reportLog.id.substring(0,8).toUpperCase()}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '16px 24px', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
          <div style={{ borderRight: '1px solid #cbd5e1' }}>
            <p style={{ fontSize: '8px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Nama Siswa</p>
            <p style={{ fontSize: '17px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1 }}>{studentName.toUpperCase()}</p>
          </div>
          <div style={{ paddingLeft: '20px' }}>
            <p style={{ fontSize: '8px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Program Akademik</p>
            <p style={{ fontSize: '17px', fontWeight: '900', color: isPass ? '#2563eb' : '#ea580c', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1.2 }}>{subject}</p>
          </div>
        </div>

        {/* Tabel Nilai (UNIFIED FONT SIZE: 20px) */}
        <div style={{ borderRadius: '35px', border: '2px solid #cbd5e1', overflow: 'hidden', marginBottom: '18px', backgroundColor: 'white' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', width: '90px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Sesi</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Materi & Modul Kurikulum</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', width: '120px' }}>Nilai</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5,6].map((num, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', height: '78px' }}>
                  {/* Sel Sesi - Font 20px */}
                  <td style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ fontWeight: '900', color: '#e2e8f0', fontSize: '20px', fontStyle: 'italic' }}>0{num}</span>
                    </div>
                  </td>
                  {/* Sel Materi - Font 20px */}
                  <td style={{ padding: '0 35px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{ fontWeight: '900', color: '#1e293b', fontSize: '20px', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1.1, display: 'block' }}>{topics[i] || "MATERI PEMBELAJARAN"}</span>
                    </div>
                  </td>
                  {/* Sel Nilai - Font 20px */}
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
          <div style={{ position: 'absolute', top: 0, right: 0, width: '230px', height: '230px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '999px', marginRight: '-115px', marginTop: '-115px' }}></div>
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

      {/* HALAMAN 3: MILESTONE (LOCKED & WRAPPING FIXED) */}
      <div id={`milestone-render-${reportLog.id}`} style={{ ...PAGE_STYLE, padding: '70px 80px' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '350px', height: '350px', backgroundColor: isPass ? '#eff6ff' : '#fff7ed', borderRadius: '999px', marginLeft: '-175px', marginTop: '-175px', opacity: 0.5 }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '35px', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '52px', height: '52px', backgroundColor: isPass ? '#1e3a8a' : '#7c2d12', color: 'white', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(6deg)' }}><BadgeCheck size={26}/></div>
          <h1 style={{ fontSize: '34px', fontWeight: '900', fontStyle: 'italic', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Langkah <span style={{ color: isPass ? '#2563eb' : '#ea580c' }}>Pembelajaran</span></h1>
        </div>
        
        <div style={{ marginBottom: '40px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', color: isPass ? '#2563eb' : '#ea580c', borderBottom: '3px solid #f8fafc', paddingBottom: '10px', marginBottom: '25px' }}>
            <ClipboardList size={22}/>
            <h3 style={{ fontSize: '15px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Log Presensi Mandiri Siswa</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3,4,5,6].map((num, idx) => { 
               const studentLog = studentOnlyLogs.find(x => x.sessionNumber === num);
               return (
                 <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '40px', padding: '10px 40px', borderBottom: '1px solid #f8fafc' }}>
                   <div style={{ fontWeight: '900', fontSize: '18px', textTransform: 'uppercase', fontStyle: 'italic', width: '85px' }} className={SESSION_COLORS[idx] || 'text-slate-400'}>SESI {num}</div>
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
          <div style={{ flex: 1, backgroundColor: isPass ? '#f0f9ff' : '#fff7ed', borderRadius: '42px', border: '4px solid #f1f5f9', padding: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
             {/* WRAPPING FIX APPLIED HERE */}
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
