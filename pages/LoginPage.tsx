import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { MOCK_ADMIN } from '../constants';
import { supabase } from '../services/supabase.ts';
import { 
  UserCog, 
  GraduationCap, 
  ArrowLeft, 
  ChevronRight, 
  Users,
  ShieldAlert,
  UserCheck,
  Mail,
  Lock,
  WifiOff,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Construction,
  Wrench,
  AlertTriangle
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
  teachers: User[];
  studentAccounts: User[];
  connectionError?: boolean;
  isSyncing?: boolean;
}

type ViewState = 'SELECTION' | 'LOGIN' | 'MAINTENANCE';

const BG_URL = "https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/Background%20Login.png";
const LOGO_URL = "https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/SANUR%20Logo.png";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');

    .lp-root { font-family: 'Plus Jakarta Sans', sans-serif; }

    @keyframes fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ping-slow {
      0%   { transform: scale(1);   opacity: 0.6; }
      70%  { transform: scale(1.8); opacity: 0; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    @keyframes blob-dark-1 {
      0%,100% { transform: translate(0px,0px) scale(1); }
      40%      { transform: translate(30px,-40px) scale(1.1); }
      70%      { transform: translate(-10px,15px) scale(0.92); }
    }
    @keyframes blob-dark-2 {
      0%,100% { transform: translate(0px,0px) scale(1); }
      40%      { transform: translate(-30px,20px) scale(1.08); }
      70%      { transform: translate(15px,-20px) scale(0.95); }
    }
    @keyframes float-card {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-6px); }
    }
    @keyframes pulse-dot {
      0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
      70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
      100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
    }

    .lp-fade-up   { animation: fade-up 0.55s ease-out both; }
    .lp-fade-up-1 { animation: fade-up 0.55s ease-out 0.10s both; }
    .lp-fade-up-2 { animation: fade-up 0.55s ease-out 0.18s both; }
    .lp-fade-up-3 { animation: fade-up 0.55s ease-out 0.26s both; }
    .lp-fade-up-4 { animation: fade-up 0.55s ease-out 0.34s both; }
    .lp-fade-in   { animation: fade-in 0.6s ease-out both; }

    .lp-ping-slow { animation: ping-slow 2s ease-out infinite; }
    .lp-blob-dark-1 { animation: blob-dark-1 10s ease-in-out infinite; }
    .lp-blob-dark-2 { animation: blob-dark-2 12s ease-in-out infinite; }

    .lp-role-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .lp-role-card:hover {
      transform: translateY(-6px) scale(1.03);
    }
    .lp-role-card:active { transform: scale(0.97); }

    .lp-db-dot { animation: pulse-dot 2s infinite; }

    .lp-btn-primary {
      transition: filter 0.15s, transform 0.15s, box-shadow 0.15s;
    }
    .lp-btn-primary:hover { filter: brightness(1.1); box-shadow: 0 8px 24px rgba(0,80,200,0.25); }
    .lp-btn-primary:active { transform: scale(0.97); }

    .lp-btn-wa {
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .lp-btn-wa:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(34,197,94,0.35); }
    .lp-btn-wa:active { transform: scale(0.97); }

    .lp-footer-link {
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .lp-footer-link:hover { transform: scale(1.04); }

    .lp-input-wrap input:focus {
      outline: none;
    }
  `}</style>
);

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, teachers, studentAccounts, connectionError, isSyncing }) => {
  const [view, setView] = useState<ViewState>('SELECTION');
  const [role, setRole] = useState<Role>('ADMIN');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ username: false, pin: false });
  const [systemMaintenance, setSystemMaintenance] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const { data } = await supabase.from('settings').select('*').eq('key', 'system_status').single();
        if (data?.value?.maintenance) {
          setSystemMaintenance(true);
          setView('MAINTENANCE');
        } else {
          setSystemMaintenance(false);
          setView('SELECTION');
        }
      } catch (e) {
        console.warn("Maintenance check bypassed.");
      }
    };
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectRole = (selectedRole: Role) => {
    setRole(selectedRole);
    setView('LOGIN');
    setUsername('');
    setPin('');
    setShowPin(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const usernameEmpty = !username.trim();
    const pinEmpty = !pin.trim();
    if (usernameEmpty || pinEmpty) {
      setFieldErrors({ username: usernameEmpty, pin: pinEmpty });
      setError('Username & PIN wajib diisi.');
      return;
    }
    setFieldErrors({ username: false, pin: false });
    setLoading(true);
    setError('');
    setTimeout(() => {
      const lowerInput = username.trim().toLowerCase();
      let foundUser: User | undefined;
      if (role === 'ADMIN') {
        foundUser = teachers.find(t => t.role === 'ADMIN' && t.username.toLowerCase() === lowerInput);
        if (!foundUser && lowerInput === MOCK_ADMIN.username.toLowerCase()) foundUser = MOCK_ADMIN;
      } else if (role === 'TEACHER') {
        foundUser = teachers.find(t => t.role === 'TEACHER' && t.username.toLowerCase() === lowerInput);
      } else if (role === 'STUDENT') {
        foundUser = studentAccounts.find(s => s.username.toLowerCase() === lowerInput);
      }
      if (foundUser) {
        const userPin = foundUser.pin || (role === 'STUDENT' ? '051020' : '224488');
        if (pin === userPin) onLogin(foundUser);
        else setError('PIN Salah.');
      } else {
        setError('Username tidak terdaftar.');
      }
      setLoading(false);
    }, 600);
  };

  const roleLabels: Record<Role, string> = {
    ADMIN: 'PENGURUS',
    TEACHER: 'PENGAJAR',
    STUDENT: 'SISWA'
  };

  const roleTheme = {
    ADMIN:   { color: '#2563eb', bgClass: 'bg-blue-600',    textClass: 'text-blue-600',    borderClass: 'border-blue-500',    iconBg: '#dbeafe', iconColor: '#1d4ed8' },
    TEACHER: { color: '#ea580c', bgClass: 'bg-orange-600',  textClass: 'text-orange-600',  borderClass: 'border-orange-500',  iconBg: '#ffedd5', iconColor: '#c2410c' },
    STUDENT: { color: '#16a34a', bgClass: 'bg-emerald-600', textClass: 'text-emerald-600', borderClass: 'border-emerald-500', iconBg: '#dcfce7', iconColor: '#15803d' },
  };
  const currentTheme = roleTheme[role];

  // ── STATUS BADGE ──────────────────────────────────────────────────────
  const StatusBadge = () => {
    if (isSyncing) return (
      <div className="lp-fade-up-1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/90 border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
        <Loader2 size={12} className="animate-spin" /> Menghubungkan...
      </div>
    );
    if (connectionError) return (
      <div className="lp-fade-up-1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50/90 border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
        <WifiOff size={12} /> Cloud Offline
      </div>
    );
    return (
      <div className="lp-fade-up-1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm">
        <span className="lp-db-dot w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        Database Terkoneksi
      </div>
    );
  };

  // ── MAINTENANCE ─────────────────────────────────────────────────────────
  if (view === 'MAINTENANCE') {
    return (
      <div className="lp-root min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <GlobalStyles />
        <div className="lp-blob-dark-1 absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
        <div className="lp-blob-dark-2 absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -ml-48 -mb-48 pointer-events-none" />

        {/* Secret admin button */}
        <button
          onClick={() => { setRole('ADMIN'); setView('LOGIN'); }}
          className="fixed left-0 top-1/2 -translate-y-1/2 w-20 h-40 z-[99999] outline-none"
          aria-label="Secret Admin Access"
        />

        <div className="max-w-md w-full space-y-10 lp-fade-in relative z-10">
          <div className="w-32 h-32 bg-orange-500 text-white rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce border-8 border-slate-900">
            <Construction size={64} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
              SYSTEM <span className="text-orange-500">PAUSED</span>
            </h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
              Halo! Mohon maaf, kami sedang melakukan perbaikan sistem berkala agar aplikasi makin kencang. ✨
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/5 space-y-4">
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center shrink-0"><Wrench size={20}/></div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status Saat Ini:</p>
                <p className="text-[10px] font-bold text-white uppercase italic">Optimalisasi Database Sanur</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-orange-600/20 text-orange-400 rounded-xl flex items-center justify-center shrink-0"><AlertTriangle size={20}/></div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estimasi Selesai:</p>
                <p className="text-[10px] font-bold text-white uppercase italic">Segera Kembali Online</p>
              </div>
            </div>
          </div>
          <a
            href="https://wa.me/6281293047069?text=Halo%20Admin%20SANUR%2C%20saya%20mau%20menanyakan%20status%20sistem%20yang%20sedang%20maintenance.%20Kapan%20kira-kira%20bisa%20diakses%20kembali%3F"
            target="_blank" rel="noopener noreferrer"
            className="lp-btn-wa flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
          >
            💬 Hubungi Admin via WhatsApp
          </a>
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.8em]">SANUR Akademi Inspirasi</p>
        </div>
      </div>
    );
  }

  // ── SELECTION ──────────────────────────────────────────────────────────
  if (view === 'SELECTION') {
    return (
      <div
        className="lp-root min-h-screen relative overflow-hidden flex flex-col"
        style={{
          backgroundImage: `url('${BG_URL}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1a5fbe',
        }}
      >
        <GlobalStyles />

        {/* Overlay: gelap tipis di atas, putih di bawah untuk area cards */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,40,130,0.15) 0%, rgba(10,40,130,0.08) 38%, rgba(248,250,255,0.78) 62%, rgba(248,250,255,0.97) 100%)'
          }}
        />

        {/* ── NAVBAR ── */}
        <div className="relative z-10 flex items-center justify-between px-8 pt-6 pb-4">
          {/* Logo pill */}
          <div className="lp-fade-up inline-flex items-center gap-3 px-5 py-3 bg-white/95 rounded-2xl shadow-lg backdrop-blur-sm">
            <img
              src={LOGO_URL}
              alt="SANUR Logo"
              className="h-10 w-auto object-contain"
            />
            <div className="border-l-2 border-slate-100 pl-3">
              <p className="text-base font-black text-slate-900 tracking-tighter uppercase italic leading-none">SANUR</p>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-tight">Internal System</p>
            </div>
          </div>

          {/* Status badge */}
          <StatusBadge />
        </div>

        {/* ── HERO TEXT ── */}
        <div className="relative z-10 px-8 pt-4 pb-0 max-w-[55%]">
          <h1 className="lp-fade-up-1 text-3xl md:text-4xl font-black text-white leading-snug mb-3" style={{ textShadow: '0 2px 16px rgba(0,30,120,0.22)' }}>
            Halo! Selamat datang<br />
            di <span style={{ color: '#FFD43B' }}>SANUR</span> Internal System
          </h1>
          <p className="lp-fade-up-2 text-[13px] font-semibold text-white/80" style={{ textShadow: '0 1px 8px rgba(0,30,120,0.18)' }}>
            Pilih peran di bawah untuk log in ke sistem
          </p>
        </div>

        {/* ── CARDS + BOTTOM ── */}
        <div className="relative z-10 mt-auto px-8 pb-7">
          {/* 3 Role cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <RoleCard icon={UserCog}       title="Pengurus" color="blue"    desc={<>Admin, Keuangan,<br/>Pengelolaan</>}         onClick={() => handleSelectRole('ADMIN')}   delay="lp-fade-up-2" />
            <RoleCard icon={GraduationCap} title="Pengajar" color="orange"  desc={<>Log Sesi Guru,<br/>Honor, Rapot</>}          onClick={() => handleSelectRole('TEACHER')} delay="lp-fade-up-3" />
            <RoleCard icon={Users}         title="Siswa"    color="emerald" desc={<>Pembayaran, Progres,<br/>Sertifikat</>}       onClick={() => handleSelectRole('STUDENT')} delay="lp-fade-up-4" />
          </div>

          {/* Bottom row */}
          <div className="lp-fade-up-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-bold text-slate-500">Butuh bantuan?</p>
              <a
                href="https://wa.me/6281293047069?text=Halo%20Admin%20SANUR%2C%20saya%20ingin%20bertanya%20mengenai%20akses%20login%20portal%20internal.%20Mohon%20bantuannya."
                target="_blank" rel="noopener noreferrer"
                className="lp-btn-wa inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md"
              >
                💬 Hubungi Admin
              </a>
            </div>
            <a
              href="https://sanurakademi.com"
              target="_blank" rel="noopener noreferrer"
              className="lp-footer-link inline-flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200 rounded-full shadow-sm text-[10px] font-black text-slate-400 uppercase tracking-widest backdrop-blur-sm hover:text-slate-600"
            >
              🌐 SANUR Akademi Inspirasi
              <ChevronRight size={11} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── LOGIN FORM ─────────────────────────────────────────────────────────
  return (
    <div
      className="lp-root min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage: `url('${BG_URL}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1a5fbe',
      }}
    >
      <GlobalStyles />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(10,35,110,0.38)' }} />

      <div className="relative z-10 w-full max-w-4xl lp-fade-up">
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">

          {/* ── LEFT PANEL ── */}
          <div
            className="md:w-72 p-12 flex flex-col justify-between items-center text-center text-white"
            style={{ background: currentTheme.color }}
          >
            <button
              onClick={() => setView(systemMaintenance ? 'MAINTENANCE' : 'SELECTION')}
              className="relative p-3 bg-white/20 rounded-full hover:bg-white/40 transition-all hover:scale-110 active:scale-95"
            >
              <span className="lp-ping-slow absolute inset-0 rounded-full bg-white/30 pointer-events-none" />
              <ArrowLeft />
            </button>
            <div className="space-y-6">
              <div className="w-24 h-24 bg-white/15 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
                {role === 'ADMIN' ? <UserCog size={48}/> : role === 'TEACHER' ? <GraduationCap size={48}/> : <Users size={48}/>}
              </div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">
                PORTAL <br/> {roleLabels[role]}
              </h3>
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest opacity-60">SANUR Akademi Inspirasi</div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="flex-1 p-10 md:p-16">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase italic leading-none">
                  SELAMAT{' '}
                  <span style={{ color: currentTheme.color }}>DATANG</span>
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Masukkan identitas akun untuk melanjutkan
                </p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-widest">Username Akun</label>
                <div className="lp-input-wrap relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.username ? '#f43f5e' : currentTheme.color, opacity: 0.5 }}>
                    <Mail size={22}/>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setFieldErrors(f => ({ ...f, username: false })); }}
                    placeholder="ISI USERNAME"
                    className={`w-full pl-14 pr-6 py-5 bg-slate-50 border-2 rounded-2xl font-black text-xs uppercase transition-all focus:bg-white ${
                      fieldErrors.username ? 'border-rose-400 bg-rose-50' : 'border-transparent'
                    }`}
                    style={{ outline: 'none' }}
                    onFocus={e => { if (!fieldErrors.username) e.currentTarget.style.borderColor = currentTheme.color; }}
                    onBlur={e => { e.currentTarget.style.borderColor = fieldErrors.username ? '' : 'transparent'; }}
                  />
                </div>
              </div>

              {/* PIN */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-widest">6 Digit PIN</label>
                <div className="lp-input-wrap relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.pin ? '#f43f5e' : currentTheme.color, opacity: 0.5 }}>
                    <Lock size={22}/>
                  </div>
                  <input
                    type={showPin ? "text" : "password"}
                    maxLength={6}
                    value={pin}
                    onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setFieldErrors(f => ({ ...f, pin: false })); }}
                    placeholder="••••••"
                    className={`w-full pl-14 pr-14 py-5 bg-slate-50 border-2 rounded-2xl font-black text-2xl tracking-[0.5em] text-center transition-all focus:bg-white ${
                      fieldErrors.pin ? 'border-rose-400 bg-rose-50' : 'border-transparent'
                    }`}
                    style={{ outline: 'none' }}
                    onFocus={e => { if (!fieldErrors.pin) e.currentTarget.style.borderColor = currentTheme.color; }}
                    onBlur={e => { e.currentTarget.style.borderColor = fieldErrors.pin ? '' : 'transparent'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/60 hover:bg-white transition-all"
                    style={{ color: currentTheme.color }}
                  >
                    {showPin ? <EyeOff size={20}/> : <Eye size={20}/>}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                  <ShieldAlert size={20} className="shrink-0"/>
                  <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || isSyncing}
                className="lp-btn-primary w-full py-6 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                style={{ background: currentTheme.color }}
              >
                {loading || isSyncing ? <Loader2 size={22} className="animate-spin"/> : <UserCheck size={22}/>}
                {loading ? 'VERIFIKASI...' : isSyncing ? 'MENGHUBUNGKAN...' : 'MASUK SEKARANG'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center mt-6">
          <a
            href="https://sanurakademi.com"
            target="_blank" rel="noopener noreferrer"
            className="lp-footer-link inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 border border-white/60 rounded-full shadow-sm text-[10px] font-black text-slate-500 uppercase tracking-widest backdrop-blur-sm hover:text-slate-700"
          >
            🌐 SANUR Akademi Inspirasi
            <ChevronRight size={11}/>
          </a>
        </div>
      </div>
    </div>
  );
};

// ── ROLE CARD COMPONENT ────────────────────────────────────────────────
const RoleCard = ({ icon: Icon, title, desc, color, onClick, delay }: any) => {
  const themes: any = {
    blue:    { iconBg: '#dbeafe', iconColor: '#1d4ed8', hoverBorder: '#3b82f6' },
    orange:  { iconBg: '#ffedd5', iconColor: '#c2410c', hoverBorder: '#f97316' },
    emerald: { iconBg: '#dcfce7', iconColor: '#15803d', hoverBorder: '#22c55e' },
  };
  const t = themes[color];

  return (
    <button
      onClick={onClick}
      className={`lp-role-card ${delay} group w-full bg-white/90 backdrop-blur-md rounded-[2rem] border-2 border-white shadow-xl flex flex-col items-center text-center p-8`}
      style={{ minHeight: '200px' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = t.hoverBorder)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'white')}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
        style={{ background: t.iconBg, color: t.iconColor }}
      >
        <Icon size={34}/>
      </div>
      <h3 className="text-base font-black uppercase italic tracking-tighter text-slate-800 mb-2">{title}</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{desc}</p>
    </button>
  );
};

export default LoginPage;
