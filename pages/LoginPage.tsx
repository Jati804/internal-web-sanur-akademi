import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { MOCK_ADMIN } from '../constants';
import { supabase } from '../services/supabase.ts';
import { 
  UserCog, 
  GraduationCap, 
  Mail, 
  ArrowLeft, 
  Sparkles,
  Users,
  ShieldAlert,
  UserCheck,
  Lock,
  WifiOff,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Wrench,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
  teachers: User[];
  studentAccounts: User[];
  connectionError?: boolean;
  isSyncing?: boolean;
}

type ViewState = 'SELECTION' | 'LOGIN' | 'MAINTENANCE';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, teachers, studentAccounts, connectionError, isSyncing }) => {
  const [view, setView] = useState<ViewState>('SELECTION');
  const [role, setRole] = useState<Role>('ADMIN');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemMaintenance, setSystemMaintenance] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

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
    if (!username.trim() || !pin.trim()) {
      setError(`Username & PIN wajib diisi.`);
      return;
    }
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

  const roleConfig = {
    ADMIN: {
      icon: UserCog,
      label: 'Pengurus',
      sub: 'Admin & Keuangan',
      accent: 'blue',
      accentHex: '#2563eb',
      bg: 'bg-blue-600',
      text: 'text-blue-600',
      light: 'bg-blue-50',
      border: 'border-blue-200',
      focusBorder: 'focus:border-blue-500',
      ring: 'focus:ring-blue-100',
      gradient: 'from-blue-600 to-blue-700',
      softGradient: 'from-blue-50 to-blue-100/60',
      dot: 'bg-blue-500',
    },
    TEACHER: {
      icon: GraduationCap,
      label: 'Pengajar',
      sub: 'Log Sesi & Honor',
      accent: 'orange',
      accentHex: '#ea580c',
      bg: 'bg-orange-600',
      text: 'text-orange-600',
      light: 'bg-orange-50',
      border: 'border-orange-200',
      focusBorder: 'focus:border-orange-500',
      ring: 'focus:ring-orange-100',
      gradient: 'from-orange-500 to-orange-600',
      softGradient: 'from-orange-50 to-orange-100/60',
      dot: 'bg-orange-500',
    },
    STUDENT: {
      icon: Users,
      label: 'Siswa',
      sub: 'Progres & Sertifikat',
      accent: 'emerald',
      accentHex: '#059669',
      bg: 'bg-emerald-600',
      text: 'text-emerald-600',
      light: 'bg-emerald-50',
      border: 'border-emerald-200',
      focusBorder: 'focus:border-emerald-500',
      ring: 'focus:ring-emerald-100',
      gradient: 'from-emerald-500 to-emerald-600',
      softGradient: 'from-emerald-50 to-emerald-100/60',
      dot: 'bg-emerald-500',
    },
  };

  const currentTheme = roleConfig[role];

  // ─── MAINTENANCE VIEW ──────────────────────────────────────────────────────
  if (view === 'MAINTENANCE') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />

        {/* Secret admin button */}
        <button
          onClick={() => { setRole('ADMIN'); setView('LOGIN'); }}
          className="fixed left-0 top-1/2 -translate-y-1/2 w-16 h-32 z-[99999] outline-none"
          aria-label="Secret Admin Access"
        />

        <div className="relative z-10 max-w-md w-full text-center space-y-8">
          {/* Icon */}
          <div className="mx-auto w-24 h-24 bg-orange-500/20 rounded-3xl flex items-center justify-center border border-orange-500/30">
            <Wrench size={40} className="text-orange-400" />
          </div>

          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">SISTEM TIDAK TERSEDIA</p>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
              SEDANG<br/>MAINTENANCE
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Kami sedang melakukan perawatan sistem. Harap tunggu sebentar.
            </p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-white/5 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Wrench size={15} className="text-blue-400" />
              </div>
              <div>
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Status</p>
                <p className="text-xs font-bold text-white uppercase italic">Optimalisasi Database Sanur</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={15} className="text-orange-400" />
              </div>
              <div>
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Estimasi</p>
                <p className="text-xs font-bold text-white uppercase italic">Segera Kembali Online</p>
              </div>
            </div>
          </div>

          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.6em]">SANUR Akademi Inspirasi</p>
        </div>
      </div>
    );
  }

  // ─── SELECTION VIEW ────────────────────────────────────────────────────────
  if (view === 'SELECTION') {
    return (
      <div className="min-h-screen bg-slate-50 flex relative overflow-hidden font-sans">
        {/* Left decorative panel */}
        <div className="hidden lg:flex lg:w-2/5 xl:w-1/3 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/15 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-600/10 rounded-full blur-[80px]" />

          {/* Top: Logo */}
          <div className="relative z-10 flex items-center gap-4">
            <img
              src="https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/SANUR%20Logo.png"
              alt="SANUR Logo"
              className="h-10 w-auto object-contain brightness-0 invert opacity-90"
            />
            <div className="border-l border-white/20 pl-4">
              <p className="text-xs font-black text-white uppercase italic tracking-tight leading-none">SANUR</p>
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Akademi Inspirasi</p>
            </div>
          </div>

          {/* Middle: Tagline */}
          <div className="relative z-10 space-y-6">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">Portal Internal</p>
              <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-[0.9] space-y-1">
                <span className="block">SATU</span>
                <span className="block text-blue-400">PORTAL</span>
                <span className="block">SEMUA</span>
                <span className="block text-orange-400">AKSES</span>
              </h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Kelola administrasi, pengajaran, dan pembelajaran dalam satu sistem terpadu.
            </p>

            {/* Role chips */}
            <div className="flex flex-col gap-2">
              {(['ADMIN', 'TEACHER', 'STUDENT'] as Role[]).map((r) => {
                const cfg = roleConfig[r];
                const Icon = cfg.icon;
                return (
                  <div key={r} className="flex items-center gap-3 py-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <Icon size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cfg.label}</span>
                    <span className="text-[9px] text-slate-600 font-medium">{cfg.sub}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom: Status & Footer */}
          <div className="relative z-10 space-y-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${connectionError ? 'bg-rose-900/40 text-rose-400 border-rose-800' : isSyncing ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-emerald-900/40 text-emerald-400 border-emerald-800'}`}>
              {isSyncing ? <Loader2 size={10} className="animate-spin" /> : connectionError ? <WifiOff size={10} /> : <CheckCircle2 size={10} />}
              {isSyncing ? "Connecting..." : connectionError ? "Cloud Offline" : "Database Terkoneksi"}
            </div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">© 2026 SANUR Akademi</p>
          </div>
        </div>

        {/* Right: Role Selection */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-[120px] opacity-40" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-100 rounded-full blur-[120px] opacity-40" />

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img
              src="https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/SANUR%20Logo.png"
              alt="SANUR Logo"
              className="h-10 w-auto object-contain"
            />
            <div className="border-l-2 border-slate-100 pl-3">
              <p className="text-sm font-black text-slate-900 uppercase italic leading-none">SANUR</p>
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wide">Akademi Inspirasi</p>
            </div>
          </div>

          <div className="relative z-10 w-full max-w-lg space-y-8">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">Masuk Sebagai</p>
              <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">PILIH PERAN ANDA</h1>
            </div>

            {/* Role list — vertical stack */}
            <div className="space-y-3">
              {(['ADMIN', 'TEACHER', 'STUDENT'] as Role[]).map((r) => {
                const cfg = roleConfig[r];
                const Icon = cfg.icon;
                const isHovered = hoveredRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => handleSelectRole(r)}
                    onMouseEnter={() => setHoveredRole(r)}
                    onMouseLeave={() => setHoveredRole(null)}
                    className={`group w-full flex items-center gap-5 p-5 bg-white rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-lg ${
                      isHovered
                        ? `border-${cfg.accent}-400 shadow-${cfg.accent}-100`
                        : 'border-slate-100'
                    }`}
                  >
                    <div className={`w-14 h-14 ${cfg.light} ${cfg.text} rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                      <Icon size={28} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-base font-black text-slate-800 uppercase italic tracking-tight">{cfg.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{cfg.sub}</p>
                    </div>
                    <ChevronRight size={18} className={`${cfg.text} opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0`} />
                  </button>
                );
              })}
            </div>

            {/* Mobile connection status */}
            <div className="lg:hidden flex justify-center">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${connectionError ? 'bg-rose-50 text-rose-600 border-rose-200' : isSyncing ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                {isSyncing ? <Loader2 size={10} className="animate-spin" /> : connectionError ? <WifiOff size={10} /> : <CheckCircle2 size={10} />}
                {isSyncing ? "Connecting..." : connectionError ? "Cloud Offline" : "Database Terkoneksi"}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LOGIN VIEW ────────────────────────────────────────────────────────────
  const Icon = currentTheme.icon;
  const roleLabels: Record<Role, string> = { ADMIN: 'PENGURUS', TEACHER: 'PENGAJAR', STUDENT: 'SISWA' };

  return (
    <div className="min-h-screen bg-slate-50 flex relative overflow-hidden font-sans">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-100 rounded-full blur-[120px] opacity-40 pointer-events-none" />

      {/* Left accent strip */}
      <div className={`hidden lg:flex w-2 bg-gradient-to-b ${currentTheme.gradient}`} />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative z-10 w-full max-w-md space-y-10">

          {/* Top bar: back + logo */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView(systemMaintenance ? 'MAINTENANCE' : 'SELECTION')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors group"
            >
              <div className="w-9 h-9 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                <ArrowLeft size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Kembali</span>
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src="https://raw.githubusercontent.com/Jati804/internal-web-sanur-akademi/main/images/SANUR%20Logo.png"
                alt="SANUR Logo"
                className="h-8 w-auto object-contain"
              />
              <div className="border-l border-slate-200 pl-2.5">
                <p className="text-[10px] font-black text-slate-700 uppercase italic leading-none">SANUR</p>
                <p className="text-[8px] font-bold text-blue-600 uppercase tracking-wide">Akademi Inspirasi</p>
              </div>
            </div>
          </div>

          {/* Role badge + heading */}
          <div className="space-y-4">
            <div className={`inline-flex items-center gap-3 px-4 py-2 ${currentTheme.light} rounded-full border ${currentTheme.border}`}>
              <Icon size={16} className={currentTheme.text} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${currentTheme.text}`}>
                PORTAL {roleLabels[role]}
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase italic leading-none">
                SELAMAT <span className={currentTheme.text}>DATANG</span>
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Masukkan identitas akun untuk melanjutkan
              </p>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Username Akun</label>
                <div className="relative group">
                  <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${currentTheme.text} opacity-40 group-focus-within:opacity-100 transition-opacity`} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ISI USERNAME..."
                    className={`w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-xl outline-none font-black text-xs uppercase transition-all placeholder:text-slate-300 focus:bg-white focus:border-current ${currentTheme.text}`}
                  />
                </div>
              </div>

              {/* PIN */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">6 Digit PIN</label>
                <div className="relative group">
                  <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${currentTheme.text} opacity-40 group-focus-within:opacity-100 transition-opacity`} />
                  <input
                    type={showPin ? "text" : "password"}
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className={`w-full pl-11 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-xl outline-none font-black text-xl tracking-[0.4em] text-center transition-all placeholder:text-slate-300 focus:bg-white focus:border-current ${currentTheme.text}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 ${currentTheme.text} opacity-50 hover:opacity-100 transition-opacity`}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600">
                  <ShieldAlert size={18} className="shrink-0" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || isSyncing}
                className={`w-full py-4 ${currentTheme.bg} text-white rounded-xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg`}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                {loading ? 'VERIFIKASI...' : 'MASUK SEKARANG'}
              </button>
            </form>
          </div>

          {/* Connection status + footer */}
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${connectionError ? 'bg-rose-50 text-rose-600 border-rose-200' : isSyncing ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
              {isSyncing ? <Loader2 size={10} className="animate-spin" /> : connectionError ? <WifiOff size={10} /> : <CheckCircle2 size={10} />}
              {isSyncing ? "Connecting..." : connectionError ? "Offline" : "Terkoneksi"}
            </div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">© 2026 SANUR</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
