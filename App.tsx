// FORCE REBUILD - CLEAR CACHE v3.1 - ANTI PORTRAIT MODE
import React, { useState, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } = ReactRouterDOM as any;
const Router = HashRouter;

import { 
  LayoutDashboard, Receipt, Menu, CreditCard, BookOpen, Book, UserCog, 
  ClipboardCheck, Wallet, GraduationCap, Power, 
  Settings as SettingsIcon, Database, X,
  Sparkles, HelpCircle, Info, RotateCw
} from 'lucide-react';

import { supabase } from './services/supabase.ts';

import LoginPage from './pages/LoginPage.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import AdminFinance from './pages/AdminFinance.tsx';
import AdminReceipts from './pages/AdminReceipts.tsx';
import AdminStaff from './pages/AdminStaff.tsx';
import AdminInventory from './pages/AdminInventory.tsx';
import AdminAcademic from './pages/AdminAcademic.tsx';
import AdminMaintenance from './pages/AdminMaintenance.tsx';
import TeacherDashboard from './pages/TeacherDashboard.tsx';
import TeacherHistory from './pages/TeacherHistory.tsx';
import TeacherHonor from './pages/TeacherHonor.tsx';
import TeacherReportsInbox from './pages/TeacherReportsInbox.tsx';
import StudentPortal from './pages/StudentPortal.tsx';
import VerifyCertificate from './pages/VerifyCertificate.tsx';

import { User, Attendance, Transaction, StudentProfile, StudentPayment } from './types.ts';
import { INITIAL_SUBJECTS, CLASS_ROOM_OPTIONS } from './constants.tsx';

const NavItem = ({ to, icon: Icon, label, activeColor = 'blue', onClick, badge }: { to: string, icon: any, label: string, activeColor?: string, onClick?: () => void, badge?: number }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const colors: any = {
    blue: isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-blue-600',
    emerald: isActive ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-emerald-600',
    orange: isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-blue-600',
  };
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center justify-between gap-3 px-6 py-4 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all ${colors[activeColor]}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        {label}
      </div>
      {badge && badge > 0 ? (
        <span className="bg-rose-500 text-white text-[9px] px-2 py-1 min-w-[20px] text-center rounded-full animate-pulse shadow-lg shadow-rose-200">{badge}</span>
      ) : null}
    </Link>
  );
};

const GuideTour = ({ role, onClose }: { role: string, onClose: () => void }) => {
  const [currentStep, setCurrentStep] = React.useState(0);

  const tourSteps = {
    TEACHER: [
      { 
        title: 'Dashboard Guru', 
        desc: 'Ini halaman utama kamu. Di sini bisa lihat ringkasan mengajar.',
        target: '[href="#/teacher"]',
        placement: 'right'
      },
      { 
        title: 'Lapor Presensi', 
        desc: 'KLIK DI SINI untuk lapor setiap selesai mengajar. Sistem otomatis deteksi sesi 1-6.',
        target: '[href="#/teacher"]',
        placement: 'right'
      },
      { 
        title: 'Honor Saya', 
        desc: 'KLIK DI SINI untuk pantau status honor & download slip gaji.',
        target: '[href="#/teacher/honor"]',
        placement: 'right'
      },
      { 
        title: 'Rapot Siswa', 
        desc: 'KLIK DI SINI untuk lihat permintaan rapot dari siswa.',
        target: '[href="#/teacher/reports"]',
        placement: 'right'
      },
    ],
    ADMIN: [
      { 
        title: 'Dashboard Admin', 
        desc: 'Lihat ringkasan keuangan dan aktivitas sistem di sini.',
        target: '[href="#/admin"]',
        placement: 'right'
      },
      { 
        title: 'Keuangan', 
        desc: 'KLIK DI SINI untuk verifikasi SPP siswa. Cek bukti bayar lalu konfirmasi.',
        target: '[href="#/admin/finance"]',
        placement: 'right'
      },
      { 
        title: 'Buku Induk', 
        desc: 'KLIK DI SINI untuk daftarkan siswa baru atau update data.',
        target: '[href="#/admin/buku-induk"]',
        placement: 'right'
      },
      { 
        title: 'Sistem', 
        desc: 'PENTING! KLIK DI SINI untuk export database minimal sebulan sekali.',
        target: '[href="#/admin/maintenance"]',
        placement: 'right'
      },
    ],
STUDENT: [
  { 
    title: '1. Menu Kelas Saya', 
    desc: 'Ini menu utama untuk lihat paket belajar dan progres absensi kamu.',
    target: '[href="#/student"]',
    placement: 'right'
  },
  { 
    title: '2. Menu Pembayaran', 
    desc: 'KLIK DI SINI untuk bayar paket kelas. Kamu harus bayar dulu sebelum bisa absen!',
    target: '[href="#/student/payments"]',
    placement: 'right'
  },
  { 
    title: '3. Isi Form Pembayaran', 
    desc: 'Setelah masuk menu Pembayaran, pilih paket kelas, isi nominal, tanggal, dan upload bukti transfer. Lalu klik "Kirim Laporan".',
    target: 'body',
    placement: 'center'
  },
  { 
    title: '4. Tunggu Persetujuan Admin', 
    desc: 'Pembayaran kamu akan muncul di Riwayat dengan status PENDING. Selama pending, kamu masih bisa edit/hapus. Setelah disetujui admin, kamu dapat kwitansi digital!',
    target: 'body',
    placement: 'center'
  },
  { 
    title: '5. Kembali ke Kelas Saya', 
    desc: 'Setelah pembayaran disetujui, KLIK DI SINI untuk mulai absen.',
    target: '[href="#/student"]',
    placement: 'right'
  },
  { 
    title: '6. Klik Tombol Absen', 
    desc: 'Kotak kelas yang sudah dibayar akan muncul. Klik tombol "Absen" setiap kali selesai belajar. Isi tanggal belajar lalu simpan.',
    target: 'body',
    placement: 'center'
  },
  { 
    title: '7. Absen 6 Kali', 
    desc: 'Kamu harus absen 6 kali untuk menyelesaikan paket. Progress absensi bisa dilihat di kotak kelas (misal: 3/6).',
    target: 'body',
    placement: 'center'
  },
  { 
    title: '8. Klaim Guru', 
    desc: 'Setelah absen 6/6, tombol "Klaim Guru" akan muncul. Klik dan pilih guru yang kamu inginkan untuk buat rapot.',
    target: 'body',
    placement: 'center'
  },
  { 
    title: '9. Tunggu Persetujuan Guru', 
    desc: 'Guru bisa terima atau tolak. Kalau ditolak, pilih guru lain. Kalau diterima, status akan berubah jadi "Menunggu Rapot".',
    target: 'body',
    placement: 'center'
  },
  { 
    title: '10. Download Rapot', 
    desc: 'Setelah guru selesai buat rapot (3-7 hari), klik kotak kelas untuk lihat dan download rapot lengkap kamu. Rapot berisi nilai, topik, dan catatan perkembangan. Selamat!',
    target: 'body',
    placement: 'center'
  },
]
  }[role] || [];

  const content = {
    ADMIN: { color: 'bg-blue-600', borderColor: 'border-blue-500', glowColor: 'rgba(59, 130, 246, 0.6)' },
    TEACHER: { color: 'bg-orange-500', borderColor: 'border-orange-500', glowColor: 'rgba(249, 115, 22, 0.6)' },
    STUDENT: { color: 'bg-emerald-600', borderColor: 'border-emerald-500', glowColor: 'rgba(16, 185, 129, 0.6)' }
  }[role] || { color: 'bg-slate-600', borderColor: 'border-slate-500', glowColor: 'rgba(100, 116, 139, 0.6)' };

  const currentStepData = tourSteps[currentStep];
  
  React.useEffect(() => {
    if (!currentStepData) return;
    
    const targetEl = document.querySelector(currentStepData.target);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, currentStepData]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (!currentStepData) return null;

  const targetEl = document.querySelector(currentStepData.target);
  const rect = targetEl?.getBoundingClientRect();

  return (
    <>
      {/* Light overlay - LEBIH TERANG */}
      <div className="fixed inset-0 bg-slate-900/20 z-[99998] animate-in fade-in" onClick={onClose} />
      
      {/* Spotlight highlight */}
      {rect && (
        <div 
          className={`fixed z-[99999] ${content.borderColor} border-[6px] rounded-2xl pointer-events-none animate-pulse`}
          style={{
            top: rect.top - 12,
            left: rect.left - 12,
            width: rect.width + 24,
            height: rect.height + 24,
            boxShadow: `0 0 0 9999px rgba(15, 23, 42, 0.3), 0 0 60px 20px ${content.glowColor}`
          }}
        />
      )}

      {/* Tooltip */}
      {rect && (
        <div 
          className="fixed z-[100000] animate-in slide-in-from-left"
          style={{
            top: rect.top,
            left: rect.right + 24,
            maxWidth: '320px'
          }}
        >
          {/* Arrow pointing to element */}
          <div 
            className={`absolute -left-3 top-8 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 ${content.color.replace('bg-', 'border-r-')}`}
          />
          
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className={`p-6 ${content.color} text-white`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase opacity-80">Step {currentStep + 1}/{tourSteps.length}</span>
                <button onClick={onClose} className="p-1 bg-white/20 rounded-lg hover:bg-white/40 transition-all">
                  <X size={16}/>
                </button>
              </div>
              <h4 className="text-lg font-black uppercase">{currentStepData.title}</h4>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 font-bold leading-relaxed">{currentStepData.desc}</p>
              
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button 
                    onClick={handleBack} 
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 transition-all"
                  >
                    ← Kembali
                  </button>
                )}
                <button 
                  onClick={handleNext} 
                  className={`flex-1 py-2 ${content.color} text-white rounded-xl font-black text-xs uppercase hover:opacity-90 transition-all`}
                >
                  {currentStep < tourSteps.length - 1 ? 'Lanjut →' : 'Selesai ✨'}
                </button>
              </div>
              
              <button 
                onClick={onClose} 
                className="w-full text-slate-400 text-xs font-bold uppercase hover:text-slate-600"
              >
                Lewati Tour
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// 🔥 MODAL ANTI PORTRAIT - NUTUPIN LAYAR KALO PORTRAIT
const PortraitBlocker = () => {
  return (
    <div className="fixed inset-0 z-[999999] bg-gradient-to-br from-blue-600 via-purple-600 to-emerald-600 flex items-center justify-center p-8">
      <div className="text-center text-white space-y-8 max-w-md animate-in fade-in">
        <div className="relative">
          <div className="text-9xl animate-bounce">📱</div>
          <RotateCw size={48} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-black uppercase tracking-wider leading-tight">PUTAR LAYAR<br/>KE HORIZONTAL</h1>
          <div className="h-1 w-24 bg-white/50 rounded-full mx-auto"></div>
          <p className="text-base font-bold opacity-90 leading-relaxed">
            Untuk pengalaman terbaik,<br/>
            gunakan mode <span className="font-black text-yellow-300">LANDSCAPE</span> ya Kak! ✨
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
            📲 Tablet & HP: Wajib Horizontal<br/>
            💻 Desktop: Otomatis OK
          </p>
        </div>
      </div>
    </div>
  );
};

const AppContent = ({ 
  user, setUser, attendanceLogs, setAttendanceLogs, studentAttendanceLogs, setStudentAttendanceLogs, teachers, setTeachers, studentAccounts, setStudentAccounts, transactions, setTransactions, studentPayments, setStudentPayments, studentProfiles, setStudentProfiles, salesContacts, setSalesContacts, reports, setReports, subjects, setSubjects, classes, setClasses, levels, setLevels, masterSchedule, setMasterSchedule, salaryConfig, setSalaryConfig, isSidebarOpen, setIsSidebarOpen, isSyncing, connectionError, refreshAllData
}: any) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showGuide, setShowGuide] = useState(false);
  
  // 🎯 DETEKSI DOMAIN - FUTURE PROOF!
  // Vercel domain (.vercel.app) = verify only
  // Domain lain apapun = full feature
  const isVercelDomain = window.location.hostname.includes('vercel.app');
  
  // 🔥 STATE DETEKSI PORTRAIT
  const [isPortrait, setIsPortrait] = useState(false);

  // 🔥 DETEKSI ORIENTASI LAYAR
  useEffect(() => {
    const checkOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // 🎯 KHUSUS HALAMAN VERIFY: BOLEH PORTRAIT & LANDSCAPE
      if (location.pathname === '/verify') {
        setIsPortrait(false); // Gak tampilkan blocker
        return;
      }
      
      // Halaman lain: Tetep wajib landscape (horizontal)
      const isMobileTablet = width <= 1024;
      const isPortraitMode = height > width;
      
      setIsPortrait(isMobileTablet && isPortraitMode);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [location.pathname]);

  // 🔥 KALO PORTRAIT -> TAMPILKAN BLOCKER (PRIORITAS TERTINGGI)
  if (isPortrait) {
    return <PortraitBlocker />;
  }
  
  const closeSidebar = () => setIsSidebarOpen(false);

  const executeLogout = () => {
    localStorage.removeItem('sanur_user');
    setUser(null);
    navigate('/', { replace: true });
  };

const pendingReportsCount = Array.isArray(reports) ? 
  reports.filter((r: any) => 
    r.status === 'REQ' && 
    r.teacherId === user?.id
  ).length : 0;

  // 🎯 VERCEL DOMAIN: Hanya tampilkan verify page, block semua yang lain
  if (isVercelDomain) {
    if (location.pathname === '/verify') {
      return <VerifyCertificate />;
    }
    // Kalau bukan /verify di Vercel domain, paksa redirect ke /verify
    return <Navigate to="/verify" replace />;
  }
  
  // 🎯 DOMAIN UTAMA Handle /verify secara normal
  if (location.pathname === '/verify') return <VerifyCertificate />;
  
  if (!user) return (
    <LoginPage 
      onLogin={(u: User) => { setUser(u); localStorage.setItem('sanur_user', JSON.stringify(u)); }} 
      teachers={teachers} 
      studentAccounts={studentAccounts}
      connectionError={connectionError}
      isSyncing={isSyncing}
    />
  );

  const roleGuideColor = {
    ADMIN: 'bg-blue-600',
    TEACHER: 'bg-orange-500',
    STUDENT: 'bg-emerald-600'
  }[user.role as string] || 'bg-slate-600';

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex overflow-hidden font-sans relative">
      {showGuide && <GuideTour role={user.role} onClose={() => setShowGuide(false)} />}
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80000] lg:hidden animate-in fade-in" onClick={closeSidebar} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-slate-100 z-[81000] transform transition-transform duration-500 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-between mb-12 px-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 shrink-0"><BookOpen size={24} /></div>
              <div>
                <h1 className="font-black text-slate-800 text-xl tracking-tighter uppercase italic leading-none">SANUR</h1>
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.4em] mt-1.5">Sistem Internal</p>
              </div>
            </div>
            <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-300 hover:text-rose-500"><X size={24} /></button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
            {user.role === 'ADMIN' && (
              <>
                <p className="px-6 mb-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">Utama</p>
                <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" onClick={closeSidebar} />
                <NavItem to="/admin/finance" icon={Wallet} label="Keuangan" onClick={closeSidebar} />
                <NavItem to="/admin/receipts" icon={Receipt} label="Kuitansi" onClick={closeSidebar} />
                <p className="px-6 mt-6 mb-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">Manajemen</p>
                <NavItem to="/admin/buku-induk" icon={Book} label="Buku Induk" onClick={closeSidebar} />
                <NavItem to="/admin/staff" icon={UserCog} label="Akses User" onClick={closeSidebar} />
                <NavItem to="/admin/academic" icon={SettingsIcon} label="Pengaturan" onClick={closeSidebar} />
                <NavItem to="/admin/maintenance" icon={Database} label="Sistem" onClick={closeSidebar} />
              </>
            )}
            {user.role === 'TEACHER' && (
              <>
                <NavItem to="/teacher" icon={ClipboardCheck} label="Lapor Presensi" onClick={closeSidebar} />
                <NavItem to="/teacher/honor" icon={Wallet} label="Honor Saya" activeColor="blue" onClick={closeSidebar} />
                <NavItem to="/teacher/reports" icon={GraduationCap} label="Rapot Siswa" activeColor="blue" onClick={closeSidebar} badge={pendingReportsCount} />
              </>
            )}
            {user.role === 'STUDENT' && (
              <>
                <NavItem to="/student" icon={GraduationCap} label="Kelas Saya" activeColor="blue" onClick={closeSidebar} />
                <NavItem to="/student/payments" icon={CreditCard} label="Pembayaran" activeColor="blue" onClick={closeSidebar} />
              </>
            )}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-8 md:px-12 sticky top-0 z-[1000] shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-slate-50 text-slate-400 rounded-xl lg:hidden"><Menu size={24}/></button>
<div className="flex flex-col">
  <h1 className="font-black italic uppercase text-slate-800 tracking-tighter text-lg md:text-xl leading-none">
    {user?.name || user?.username || 'USER'}
  </h1>
  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
    STATUS: {user?.role === 'ADMIN' ? 'ADMIN' : user?.role === 'TEACHER' ? 'GURU' : 'SISWA'}
  </p>
</div>
          </div>
          <div className="flex items-center gap-3">
<button onClick={() => setShowGuide(true)} className={`p-4 ${roleGuideColor} text-white rounded-2xl shadow-xl hover:opacity-90 active:scale-95 transition-all`}>
   <HelpCircle size={20} />
</button>
<button onClick={executeLogout} className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl hover:bg-rose-700 active:scale-95 transition-all">
   <Power size={20} />
</button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/admin" element={<AdminDashboard user={user} attendanceLogs={attendanceLogs} studentAttendanceLogs={studentAttendanceLogs} setAttendanceLogs={setAttendanceLogs} teachers={teachers} transactions={transactions} studentProfiles={studentProfiles} />} />
              <Route path="/admin/finance" element={<AdminFinance attendanceLogs={attendanceLogs} transactions={transactions} studentPayments={studentPayments} refreshAllData={refreshAllData} />} />
              <Route path="/admin/receipts" element={<AdminReceipts />} />
              <Route path="/admin/buku-induk" element={<AdminInventory studentProfiles={studentProfiles} setStudentProfiles={setStudentProfiles} salesContacts={salesContacts} setSalesContacts={setSalesContacts} refreshAllData={refreshAllData} />} />
              <Route path="/admin/staff" element={<AdminStaff user={user} teachers={teachers} setTeachers={setTeachers} studentAccounts={studentAccounts} setStudentAccounts={setStudentAccounts} refreshAllData={refreshAllData} />} />
              <Route path="/admin/academic" element={<AdminAcademic subjects={subjects} setSubjects={setSubjects} classes={classes} setClasses={setClasses} levels={levels} setLevels={setLevels} scheduleData={masterSchedule} setScheduleData={setMasterSchedule} salaryConfig={salaryConfig} setSalaryConfig={setSalaryConfig} />} />
              <Route path="/admin/maintenance" element={<AdminMaintenance attendanceLogs={attendanceLogs} setAttendanceLogs={setAttendanceLogs} studentPayments={studentPayments} setStudentPayments={setStudentPayments} refreshAllData={refreshAllData} />} />
              <Route path="/teacher" element={<TeacherDashboard user={user} logs={attendanceLogs} studentAccounts={studentAccounts} subjects={subjects} classes={classes} levels={levels} salaryConfig={salaryConfig} teachers={teachers} refreshAllData={refreshAllData} />} />
              <Route path="/teacher/honor" element={<TeacherHonor user={user} logs={attendanceLogs} refreshAllData={refreshAllData} />} />
              <Route path="/teacher/reports" element={
  <TeacherReportsInbox 
    user={user} 
    logs={attendanceLogs}
    reports={reports}
    studentAttendanceLogs={studentAttendanceLogs} 
    studentAccounts={studentAccounts} 
    refreshAllData={refreshAllData} 
  />
} />
              <Route path="/student" element={<StudentPortal user={user} attendanceLogs={attendanceLogs} reports={reports} studentAttendanceLogs={studentAttendanceLogs} studentPayments={studentPayments} setStudentPayments={setStudentPayments} subjects={subjects} levels={levels} classes={classes} teachers={teachers} initialView="PROGRESS" refreshAllData={refreshAllData} />} />
              <Route path="/student/payments" element={<StudentPortal user={user} attendanceLogs={attendanceLogs} studentAttendanceLogs={studentAttendanceLogs} studentPayments={studentPayments} setStudentPayments={setStudentPayments} subjects={subjects} levels={levels} classes={classes} teachers={teachers} initialView="PAYMENTS" refreshAllData={refreshAllData} />} />
              <Route path="/" element={<Navigate to={user.role === 'ADMIN' ? '/admin' : user.role === 'TEACHER' ? '/teacher' : '/student'} replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<Attendance[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [studentAccounts, setStudentAccounts] = useState<User[]>([]);
  const [studentAttendanceLogs, setStudentAttendanceLogs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [salesContacts, setSalesContacts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>(INITIAL_SUBJECTS);
  const [classes, setClasses] = useState<string[]>(CLASS_ROOM_OPTIONS);
  const [levels, setLevels] = useState<string[]>(['BASIC', 'INTERMEDIATE', 'ADVANCED']);
  const [masterSchedule, setMasterSchedule] = useState<Record<string, string>>({});
  const [salaryConfig, setSalaryConfig] = useState({ regulerRate: 15000, privateRate: 25000 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const refreshAllData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [
  { data: att },
  { data: stuAtt },
  { data: teach },
  { data: stuAcc },
  { data: trans },
  { data: stuPay },
  { data: stuProf },
  { data: salesCon },
  { data: reps },
  { data: settings }
] = await Promise.all([
  supabase.from('attendance').select('*'),
  supabase.from('student_attendance').select('*'),
  supabase.from('teachers').select('*'),
  supabase.from('student_accounts').select('*'),
  supabase.from('transactions').select('*'),
  supabase.from('student_payments').select('*'),
  supabase.from('student_profiles').select('*'),
  supabase.from('sales_contacts').select('*'),
  supabase.from('reports').select('*'),
  supabase.from('settings').select('*')
]);

      if (att) setAttendanceLogs(att.map((a: any) => ({
        ...a,
        teacherId: a.teacherid,
        teacherName: a.teachername,
        clockIn: a.clockin,
        className: a.classname,
        level: a.level,
        sessionCategory: a.sessioncategory,
        packageId: a.packageid,
        sessionNumber: a.sessionnumber,
        studentsAttended: a.studentsattended,
        studentSessions: a.studentsessions,
        studentScores: a.studentscores,
        studentTopics: a.studenttopics,
        studentNarratives: a.studentnarratives,
        paymentStatus: a.paymentstatus,
        receiptData: a.receiptdata,
        reportNarrative: a.reportnarrative,
        substituteFor: a.substitutefor,
        originalTeacherId: a.originalteacherid
      })));

if (stuAtt) setStudentAttendanceLogs(stuAtt.map((s: any) => ({
  ...s,
  packageId: s.packageid,
  studentName: s.studentname,
  sessionNumber: s.sessionnumber,
  clockIn: s.clockin,
  className: s.classname,
  sessionCategory: s.sessioncategory,
  studentScores: s.studentscores,
  studentTopics: s.studenttopics,
  studentNarratives: s.studentnarratives,
  reportNarrative: s.reportnarrative
})));
      
      if (teach) setTeachers(teach);
      if (stuAcc) setStudentAccounts(stuAcc);
      if (trans) setTransactions(trans);
      if (stuPay) setStudentPayments(stuPay.map((p: any) => ({
        ...p,
        studentName: p.studentname,
        className: p.classname,
        receiptData: p.receiptdata
      })));
      if (stuProf) setStudentProfiles(stuProf.map((p: any) => ({
  ...p,
  personalPhone: p.personalphone,
  parentPhone: p.parentphone,
  enrolledClass: p.enrolledclass
})));

if (salesCon) setSalesContacts(salesCon.map((s: any) => ({
  ...s,
  institutionName: s.institution_name,
  contactPerson: s.contact_person,
  jobTitle: s.job_title,
  lastContactDate: s.last_contact_date,
  nextFollowupDate: s.next_followup_date,
  dealStatus: s.deal_status,
  meetingNotes: s.meeting_notes
})));

if (reps) setReports(reps.map((r: any) => ({
  ...r,
  teacherId: r.teacherid,
  teacherName: r.teachername,
  className: r.classname,
  sessionCategory: r.sessioncategory,
  packageId: r.packageid,
  sessionNumber: r.sessionnumber,
  studentsAttended: r.studentsattended,
  studentScores: r.studentscores,
  studentTopics: r.studenttopics,
  studentNarratives: r.studentnarratives,
  reportNarrative: r.reportnarrative,
  periode: r.periode
})));

      if (settings) {
        const acad = settings.find(s => s.key === 'academic_config');
        if (acad?.value) {
          if (acad.value.subjects) setSubjects(acad.value.subjects);
          if (acad.value.levels) setLevels(acad.value.levels);
          if (acad.value.classes) setClasses(acad.value.classes);
        }
        const sched = settings.find(s => s.key === 'master_schedule');
        if (sched?.value) setMasterSchedule(sched.value);
        const sal = settings.find(s => s.key === 'salary_config');
        if (sal?.value) setSalaryConfig(sal.value);
      }
      setConnectionError(false);
    } catch (e) {
    console.error('❌ FETCH ERROR:', e);
    setConnectionError(true);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('sanur_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    refreshAllData();
  }, [refreshAllData]);

  return (
    <Router>
      <AppContent 
  user={user} setUser={setUser}
  attendanceLogs={attendanceLogs} setAttendanceLogs={setAttendanceLogs}
  studentAttendanceLogs={studentAttendanceLogs} setStudentAttendanceLogs={setStudentAttendanceLogs}
  teachers={teachers} setTeachers={setTeachers}
  studentAccounts={studentAccounts} setStudentAccounts={setStudentAccounts}
  transactions={transactions} setTransactions={setTransactions}
  studentPayments={studentPayments} setStudentPayments={setStudentPayments}
  studentProfiles={studentProfiles} setStudentProfiles={setStudentProfiles}
  salesContacts={salesContacts} setSalesContacts={setSalesContacts}
  reports={reports} setReports={setReports}
  subjects={subjects} setSubjects={setSubjects}
  classes={classes} setClasses={setClasses}
  levels={levels} setLevels={setLevels}
  masterSchedule={masterSchedule} setMasterSchedule={setMasterSchedule}
  salaryConfig={salaryConfig} setSalaryConfig={setSalaryConfig}
  isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
  isSyncing={isSyncing} connectionError={connectionError}
  refreshAllData={refreshAllData}
/>
    </Router>
  );
};

export default App;
