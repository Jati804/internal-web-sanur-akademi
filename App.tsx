
import React, { useState, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } = ReactRouterDOM as any;
const Router = HashRouter;

import { 
  LayoutDashboard, Receipt, Menu, CreditCard, BookOpen, Book, UserCog, 
  ClipboardCheck, Wallet, GraduationCap, Power, 
  Settings as SettingsIcon, Database, X,
  Sparkles, HelpCircle, Info
} from 'lucide-react';

import { supabase } from './services/supabase.ts';

import LoginPage from './pages/LoginPage.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import AdminFinance from './pages/AdminFinance.tsx';
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
    orange: isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-blue-600', // Diseragamkan ke biru
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

const GuideModal = ({ role, onClose }: { role: string, onClose: () => void }) => {
  const content = {
    ADMIN: {
      color: 'bg-blue-600',
      text: 'text-blue-600',
      steps: [
        { title: 'Verifikasi SPP', desc: 'Cek bukti bayar siswa di tab "Keuangan" -> "Verif SPP". Klik konfirmasi agar paket aktif.' },
        { title: 'Bayar Honor', desc: 'Cairkan gaji guru di tab "Gaji Guru" & upload bukti transfer untuk mengurangi saldo kas.' },
        { title: 'Buku Induk', desc: 'Daftarkan siswa baru atau update data kontak orang tua di menu "Buku Induk".' },
        { title: 'Maintenance', desc: 'Lakukan "Export Database" di menu "Sistem" minimal sebulan sekali untuk cadangan data.' }
      ]
    },
    TEACHER: {
      color: 'bg-orange-500',
      text: 'text-orange-600',
      steps: [
        { title: 'Lapor Presensi', desc: 'Lapor setiap selesai mengajar. Sistem otomatis mendeteksi sesi 1-6 dalam satu paket.' },
        { title: 'Guru Pengganti', desc: 'Jika digantikan teman, gunakan tombol "Berhalangan". Honor akan otomatis beralih ke temanmu.' },
        { title: 'Pantau Honor', desc: 'Lihat status honor cair & unduh slip gaji digital resmi di menu "Honor Saya".' },
        { title: 'Proses Rapot', desc: 'Permintaan rapot muncul di menu "Rapot Siswa" hanya setelah siswa menekan tombol Klaim.' }
      ]
    },
    STUDENT: {
      color: 'bg-emerald-600',
      text: 'text-emerald-600',
      steps: [
        { title: 'Lapor Bayar', desc: 'Upload bukti transfer di menu "Pembayaran" agar Admin bisa mengaktifkan paket belajarmu.' },
        { title: 'Presensi Mandiri', desc: 'Presensi dilakukan secara mandiri, kamu bisa klik nomor sesi di "Kelas Saya" untuk lapor progres.' },
        { title: 'Klaim Rapot', desc: 'Tombol Klaim muncul saat progres 6/6. Pilih guru pembimbingmu untuk meminta penilaian.' },
        { title: 'Unduh Rapot', desc: 'Sertifikat & Rapot PDF bisa diunduh di tab "Kelas Saya" setelah guru selesai menilai.' }
      ]
    }
  }[role] || { color: 'bg-slate-600', text: 'text-slate-600', steps: [] };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className={`p-8 ${content.color} text-white flex justify-between items-center shrink-0`}>
          <div className="flex items-center gap-3">
            <HelpCircle size={24} />
            <h3 className="text-lg font-black uppercase italic tracking-tighter">Panduan Sistem</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-all"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
          {content.steps.map((s, i) => (
            <div key={i} className="flex gap-4">
              <div className={`w-8 h-8 rounded-full ${content.color} text-white flex items-center justify-center font-black italic shrink-0 text-xs shadow-md`}>0{i+1}</div>
              <div className="space-y-1">
                <h4 className={`text-xs font-black uppercase tracking-widest ${content.text}`}>{s.title}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed uppercase">{s.desc}</p>
              </div>
            </div>
          ))}
          <div className="pt-4 border-t border-slate-50">
             <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                <Info size={16} className="text-slate-400 shrink-0" />
                <p className="text-[9px] font-black text-slate-400 uppercase leading-tight italic">Hubungi Admin jika ada kendala teknis lebih lanjut ya Kak! ✨</p>
             </div>
          </div>
        </div>
        <div className="p-6 bg-white border-t border-slate-50 shrink-0">
          <button onClick={onClose} className={`w-full py-4 ${content.color} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all`}>SAYA MENGERTI ✨</button>
        </div>
      </div>
    </div>
  );
};

const AppContent = ({ 
  user, setUser, attendanceLogs, setAttendanceLogs, studentAttendanceLogs, setStudentAttendanceLogs, teachers, setTeachers, studentAccounts, setStudentAccounts, transactions, setTransactions, studentPayments, setStudentPayments, studentProfiles, setStudentProfiles, subjects, setSubjects, classes, setClasses, levels, setLevels, masterSchedule, setMasterSchedule, salaryConfig, setSalaryConfig, isSidebarOpen, setIsSidebarOpen, isSyncing, connectionError, refreshAllData
}: any) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showGuide, setShowGuide] = useState(false);
  
  const closeSidebar = () => setIsSidebarOpen(false);

  const executeLogout = () => {
    localStorage.removeItem('sanur_user');
    setUser(null);
    navigate('/', { replace: true });
  };

  const pendingReportsCount = Array.isArray(attendanceLogs) ? attendanceLogs.filter((l: Attendance) => 
        (l.status === 'REPORT_REQUEST' || l.status === 'REPORT_PROCESSING') && 
        l.teacherId === user?.id
      ).length : 0;

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
      {showGuide && <GuideModal role={user.role} onClose={() => setShowGuide(false)} />}
      
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
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.4em] mt-1.5">Portal Internal</p>
              </div>
            </div>
            <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-300 hover:text-rose-500"><X size={24} /></button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
            {user.role === 'ADMIN' && (
              <>
                <p className="px-6 mb-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">Utama</p>
                <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" onClick={closeSidebar} />
                <NavItem to="/admin/finance" icon={Receipt} label="Keuangan" onClick={closeSidebar} />
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
            <h1 className="font-black italic uppercase text-slate-800 tracking-tighter text-lg md:text-xl">PORTAL {(user?.name || 'USER').split(' ')[0]}</h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowGuide(true)} className={`flex items-center gap-3 px-6 py-3 ${roleGuideColor} text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:opacity-90 transition-all`}>
                <HelpCircle size={18} /> <span className="hidden md:inline">PANDUAN</span>
             </button>
             <button onClick={executeLogout} className="flex items-center gap-3 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-rose-700 transition-all">
                <Power size={18} /> <span className="hidden sm:inline">LOGOUT</span>
             </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/admin" element={<AdminDashboard user={user} attendanceLogs={attendanceLogs} studentAttendanceLogs={studentAttendanceLogs} setAttendanceLogs={setAttendanceLogs} teachers={teachers} transactions={transactions} studentProfiles={studentProfiles} />} />
              <Route path="/admin/finance" element={<AdminFinance attendanceLogs={attendanceLogs} transactions={transactions} studentPayments={studentPayments} refreshAllData={refreshAllData} />} />
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
    studentAttendanceLogs={studentAttendanceLogs} 
    studentAccounts={studentAccounts} 
    refreshAllData={refreshAllData} 
  />
} />
              <Route path="/student" element={<StudentPortal user={user} attendanceLogs={attendanceLogs} studentAttendanceLogs={studentAttendanceLogs} studentPayments={studentPayments} setStudentPayments={setStudentPayments} subjects={subjects} levels={levels} classes={classes} teachers={teachers} initialView="PROGRESS" refreshAllData={refreshAllData} />} />
              <Route path="/student/payments" element={<StudentPortal user={user} attendanceLogs={attendanceLogs} studentAttendanceLogs={studentAttendanceLogs} studentPayments={studentPayments} setStudentPayments={setStudentPayments} subjects={subjects} levels={levels} classes={classes} teachers={teachers} initialView="PAYMENTS" refreshAllData={refreshAllData} />} />
              <Route path="/" element={<Navigate to={user.role === 'ADMIN' ? '/admin' : user.role === 'TEACHER' ? '/teacher' : '/student'} replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

// Fix: Added missing App component which coordinates the central state and provides it to AppContent
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
  const [subjects, setSubjects] = useState<string[]>(INITIAL_SUBJECTS);
  const [classes, setClasses] = useState<string[]>(CLASS_ROOM_OPTIONS);
  const [levels, setLevels] = useState<string[]>(['BASIC', 'INTERMEDIATE', 'ADVANCED']);
  const [masterSchedule, setMasterSchedule] = useState<Record<string, string>>({});
  const [salaryConfig, setSalaryConfig] = useState({ regulerRate: 15000, privateRate: 25000 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Fix: Implemented refreshAllData to synchronize all state with Supabase
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
  { data: salesCon }, // ✅ TAMBAHIN INI!
  { data: settings }
] = await Promise.all([
  supabase.from('attendance').select('*'),
  supabase.from('student_attendance').select('*'),
  supabase.from('teachers').select('*'),
  supabase.from('student_accounts').select('*'),
  supabase.from('transactions').select('*'),
  supabase.from('student_payments').select('*'),
  supabase.from('student_profiles').select('*'),
  supabase.from('sales_contacts').select('*'), // ✅ DAN INI!
  supabase.from('settings').select('*')
]);

      if (att) setAttendanceLogs(att.map((a: any) => ({
        ...a,
        teacherId: a.teacherid,
        teacherName: a.teachername,
        clockIn: a.clockin,
        className: a.classname,
        level: a.level, // FIXED: Menambahkan pemetaan level agar terdeteksi di dashboard
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

        // ✅ TAMBAHIN INI DI BAWAHNYA
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

// ✅ TAMBAHIN SEMUA INI DI BAWAHNYA!
if (salesCon) setSalesContacts(salesCon.map((s: any) => ({
  ...s,
  institutionName: s.institution_name,
  contactPerson: s.contact_person,
  jobTitle: s.job_title,
  lastContactDate: s.last_contact_date,
  nextFollowupDate: s.next_followup_date,
  dealStatus: s.deal_status,
  meetingNotes: s.meeting_notes,
  createdAt: s.created_at
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
