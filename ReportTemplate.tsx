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
  // DATA PROCESSING
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
  
  // STUDENT LOGS
  const sNameNorm = studentName.toUpperCase().trim();
  const pkgIdNorm = (reportLog.packageId || '').toUpperCase().trim();

  const studentOnlyLogs = [...(studentAttendanceLogs || [])]
    .filter(l => 
      (l.packageid || '').toUpperCase().trim() === pkgIdNorm && 
      (l.studentname || '').toUpperCase().trim() === sNameNorm
    )
    .sort((a, b) => (a.sessionnumber || 0) - (b.sessionnumber || 0));

  const verifyUrl = `https://sanur-verify.vercel.app/#/verify?id=${reportLog.id}`;
  const finalQrData = verifyUrl;

  // STYLES
  const PAGE_STYLE_VERTICAL: React.CSSProperties = {
    width: '794px',
    height: '1123px',
    backgroundColor: 'white',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  };

  const PAGE_STYLE_HORIZONTAL: React.CSSProperties = {
    width: '1123px',
    height: '794px',
    backgroundColor: 'white',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box'
  };

  return (
    <div id={`report-pabrik-${reportLog.id}`} style={{ width: '1123px' }}>
      
      {/* ========================================
          HALAMAN 1: SERTIFIKAT HORIZONTAL - CLEAN REDESIGN
          ======================================== */}
      <div id={`cert-render-${reportLog.id}`} style={{ 
        ...PAGE_STYLE_HORIZONTAL, 
        background: isPass 
          ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e3a8a 100%)'
          : 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #ea580c 100%)',
        padding: '25px'
      }}>
        {/* INNER WHITE CONTAINER */}
        <div style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '50px 70px'
        }}>
          
          {/* SUBTLE BACKGROUND DECORATION */}
          <div style={{ 
            position: 'absolute', 
            top: '-150px', 
            right: '-150px', 
            width: '400px', 
            height: '400px', 
            background: isPass 
              ? 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}></div>
          
          <div style={{ 
            position: 'absolute', 
            bottom: '-150px', 
            left: '-150px', 
            width: '400px', 
            height: '400px', 
            background: isPass 
              ? 'radial-gradient(circle, rgba(30,58,138,0.04) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(234,88,12,0.04) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}></div>

          {/* TOP SECTION: LOGO + QR HORIZONTAL */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '40px',
            position: 'relative',
            zIndex: 10
          }}>
            {/* LOGO + INSTITUTION NAME */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '75px',
                height: '75px',
                background: isPass 
                  ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)'
                  : 'linear-gradient(135deg, #ea580c, #f97316)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
              }}>
                <img 
                  src={ASSETS.LOGO} 
                  alt="Logo"
                  style={{ 
                    width: '55px', 
                    height: 'auto', 
                    objectFit: 'contain',
                    filter: 'brightness(0) invert(1)'
                  }} 
                />
              </div>
              
              <div>
                <h1 style={{ 
                  fontSize: '20px', 
                  fontWeight: '900', 
                  letterSpacing: '0.25em', 
                  color: '#0f172a', 
                  textTransform: 'uppercase', 
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  SANUR AKADEMI
                </h1>
                <p style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  letterSpacing: '0.35em',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  margin: '3px 0 0 0'
                }}>
                  INSPIRASI
                </p>
              </div>
            </div>

            {/* QR CODE */}
            <div style={{ 
              background: '#f8fafc',
              padding: '12px',
              borderRadius: '16px',
              border: '3px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(finalQrData)}`}
                style={{ width: '90px', height: '90px', display: 'block' }}
                alt="QR Code"
              />
              <p style={{ 
                fontSize: '7px', 
                fontWeight: '900', 
                color: '#64748b',
                marginTop: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Scan Verifikasi
              </p>
            </div>
          </div>

          {/* MAIN CONTENT SECTION */}
          <div style={{ 
            flex: 1,
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 10
          }}>
            
            {/* TITLE - Dynamic based on isPass */}
            <h2 style={{ 
              fontSize: '50px', 
              fontFamily: 'serif', 
              fontStyle: 'italic', 
              color: isPass ? '#1e3a8a' : '#ea580c',
              margin: '0 0 12px 0',
              fontWeight: '900',
              letterSpacing: '-0.01em',
              textShadow: isPass 
                ? '0 2px 20px rgba(30,58,138,0.12)'
                : '0 2px 20px rgba(234,88,12,0.12)'
            }}>
              {isPass ? 'Sertifikat Kelulusan' : 'Capaian Pembelajaran'}
            </h2>
            
            <p style={{ 
              fontSize: '14px', 
              fontFamily: 'serif', 
              fontStyle: 'italic', 
              color: '#64748b', 
              margin: '0 0 30px 0',
              fontWeight: '600'
            }}>
              Diberikan kepada:
            </p>
            
            {/* STUDENT NAME */}
            <div style={{ 
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              <h3 style={{ 
                fontSize: '42px', 
                fontWeight: '900', 
                background: isPass 
                  ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)'
                  : 'linear-gradient(135deg, #ea580c, #f97316)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textTransform: 'uppercase', 
                letterSpacing: '0.06em', 
                margin: 0, 
                lineHeight: 1.2
              }}>
                {studentName.toUpperCase()}
              </h3>
              
              <div style={{ 
                width: '450px', 
                height: '3px', 
                background: isPass 
                  ? 'linear-gradient(90deg, transparent, #3b82f6, transparent)'
                  : 'linear-gradient(90deg, transparent, #f97316, transparent)',
                marginTop: '15px',
                marginLeft: 'auto',
                marginRight: 'auto',
                borderRadius: '10px'
              }}></div>
            </div>
            
            {/* DESCRIPTION TEXT */}
            <p style={{ 
              fontSize: '13px', 
              fontFamily: 'serif', 
              fontStyle: 'italic', 
              color: '#475569', 
              lineHeight: '1.8', 
              margin: '0 0 30px 0', 
              padding: '0 60px',
              textAlign: 'center',
              maxWidth: '850px',
              fontWeight: '500'
            }}>
              {isPass 
                ? "Telah menunjukkan kompetensi luar biasa dan berhasil menyelesaikan seluruh kurikulum pelatihan intensif dengan hasil memuaskan pada program:" 
                : "Telah berpartisipasi aktif dan menyelesaikan modul pelatihan intensif dengan dedikasi tinggi guna meningkatkan kompetensi pada program:"}
            </p>

            {/* PROGRAM BADGE - SATU-SATUNYA KOTAK YANG DIPERTAHANKAN */}
            <div style={{ 
              background: isPass 
                ? 'linear-gradient(135deg, #1e3a8a, #0f172a)' 
                : 'linear-gradient(135deg, #ea580c, #7c2d12)', 
              maxWidth: '750px',
              width: '100%',
              padding: '32px 45px', 
              borderRadius: '30px', 
              border: '5px solid white', 
              textAlign: 'center',
              boxShadow: '0 15px 40px rgba(0,0,0,0.2)'
            }}>
              <p style={{ 
                fontSize: '28px', 
                fontWeight: '900', 
                color: 'white', 
                textTransform: 'uppercase', 
                fontStyle: 'italic', 
                margin: 0, 
                lineHeight: 1.3,
                letterSpacing: '0.04em',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}>
                {subject}
              </p>
              
              <div style={{ 
                width: '40%', 
                height: '2px', 
                background: 'rgba(255,255,255,0.5)', 
                margin: '16px auto' 
              }}></div>
              
              <p style={{ 
                fontSize: '17px', 
                fontWeight: '900', 
                color: 'rgba(255,255,255,0.85)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.35em',
                margin: 0
              }}>
                Level {level}
              </p>
            </div>
          </div>

          {/* BOTTOM SECTION: DATE & SCORE ONLY */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: '35px',
            position: 'relative',
            zIndex: 10
          }}>
            {/* DATE */}
            <div style={{ textAlign: 'left' }}>
              <p style={{ 
                fontSize: '9px', 
                color: '#94a3b8', 
                fontWeight: '900', 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em', 
                marginBottom: '6px' 
              }}>
                Tanggal Penerbitan
              </p>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '900', 
                color: '#1e293b',
                fontStyle: 'italic',
                letterSpacing: '0.02em'
              }}>
                {formatDateToDMY(reportLog.createdDate || new Date().toISOString().split('T')[0])}
              </p>
            </div>

            {/* SCORE BADGE */}
            <div style={{
              width: '85px',
              height: '85px',
              background: isPass 
                ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)'
                : 'linear-gradient(135deg, #ea580c, #f97316)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '5px solid white',
              boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
            }}>
              <div style={{
                textAlign: 'center',
                color: 'white'
              }}>
                <p style={{
                  fontSize: '26px',
                  fontWeight: '900',
                  margin: 0,
                  lineHeight: 1,
                  fontStyle: 'italic'
                }}>{avg}</p>
                <p style={{
                  fontSize: '8px',
                  fontWeight: '900',
                  margin: '3px 0 0 0',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  opacity: 0.9
                }}>Score</p>
              </div>
            </div>

            {/* EMPTY SPACER FOR BALANCE */}
            <div style={{ width: '120px' }}></div>
          </div>

        </div>
      </div>

      {/* ========================================
          HALAMAN 2: TRANSKRIP NILAI (VERTICAL)
          ======================================== */}
      <div id={`transcript-render-${reportLog.id}`} style={{ ...PAGE_STYLE_VERTICAL, padding: '70px 80px' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '350px', height: '350px', backgroundColor: isPass ? '#eff6ff' : '#fff7ed', borderRadius: '999px', marginRight: '-175px', marginTop: '-175px', opacity: 0.5 }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '52px', height: '52px', backgroundColor: isPass ? '#1e3a8a' : '#7c2d12', color: 'white', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-6deg)' }}><Layout size={26}/></div>
          <h1 style={{ fontSize: '34px', fontWeight: '900', fontStyle: 'italic', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Transkrip <span style={{ color: isPass ? '#2563eb' : '#ea580c' }}>Nilai</span></h1>
        </div>
        
        <div style={{ marginBottom: '35px', position: 'relative', zIndex: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '42px', overflow: 'hidden', boxShadow: '0 4px 25px -5px rgba(0,0,0,0.08)' }}>
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
                  <td style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ fontWeight: '900', color: '#e2e8f0', fontSize: '20px', fontStyle: 'italic' }}>0{num}</span>
                    </div>
                  </td>
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

      {/* ========================================
          HALAMAN 3: MILESTONE (VERTICAL)
          ======================================== */}
      <div id={`milestone-render-${reportLog.id}`} style={{ ...PAGE_STYLE_VERTICAL, padding: '70px 80px' }}>
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
