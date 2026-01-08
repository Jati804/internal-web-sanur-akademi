
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { MOCK_ADMIN } from '../constants';
import { 
  UserCog, 
  GraduationCap, 
  Mail, 
  ArrowLeft, 
  ChevronRight, 
  Sparkles,
  Users,
  ShieldAlert,
  UserCheck,
  Lock,
  Cloud,
  WifiOff,
  Loader2,
  Info,
  CheckCircle2,
  Database
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
  teachers: User[];
  studentAccounts: User[];
  connectionError?: boolean;
  isSyncing?: boolean;
}

type ViewState = 'SELECTION' | 'LOGIN';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, teachers, studentAccounts, connectionError, isSyncing }) => {
  const [view, setView] = useState<ViewState>('SELECTION');
  const [role, setRole] = useState<Role>('ADMIN');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectRole = (selectedRole: Role) => {
    setRole(selectedRole);
    setView('LOGIN');
    setUsername('');
    setPin('');
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
        const userPin = foundUser.pin || (role === 'STUDENT' ? '1234' : '4488');
        if (pin === userPin) {
          onLogin(foundUser);
        } else {
          setError('PIN Salah. Cek kembali digit PIN Anda.');
        }
      } else {
        setError('Username tidak terdaftar. Hubungi Admin.');
      }
      setLoading(false);
    }, 600);
  };

  const theme = {
    blue: { text: "text-blue-600", bg: "bg-blue-600", shadow: "shadow-blue-200", border: "border-blue-600", light: "bg-blue-50" },
    orange: { text: "text-orange-600", bg: "bg-orange-600", shadow: "shadow-orange-200", border: "border-orange-600", light: "bg-orange-50" },
    emerald: { text: "text-emerald-600", bg: "bg-emerald-600", shadow: "shadow-emerald-200", border: "border-emerald-600", light: "bg-emerald-50" }
  };

  const currentTheme = role === 'ADMIN' ? theme.blue : role === 'TEACHER' ? theme.orange : theme.emerald;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[120px] -mr-48 -mt-48 opacity-40"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-100 rounded-full blur-[120px] -ml-48 -mb-48 opacity-40"></div>

      <div className="w-full max-w-6xl flex flex-col items-center gap-12 relative z-10 animate-in fade-in duration-700">
        
        {/* Branding Area */}
        <div className="text-center space-y-6">
           <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-xl">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg rotate-3"><Database size={20} /></div>
              <div className="text-left">
                 <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">SANUR Akademi Inspirasi</h1>
                 <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.4em] mt-1">Internal Management System</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4 justify-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${connectionError ? 'bg-rose-50 text-rose-600 border-rose-200' : isSyncing ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                 {isSyncing ? <Loader2 size={14} className="animate-spin" /> : connectionError ? <WifiOff size={14} /> : <CheckCircle2 size={14} />}
                 {isSyncing ? "Menghubungkan Database..." : connectionError ? "Cloud Terputus" : "Database Siap ✨"}
              </div>
           </div>
        </div>

        {/* Main Interface */}
        <div className="w-full max-w-4xl">
          {view === 'SELECTION' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <RoleCard icon={UserCog} title="Pengurus" color="blue" desc="Admin, Keuangan, Pengelolaan" onClick={() => handleSelectRole('ADMIN')} />
              <RoleCard icon={GraduationCap} title="Pengajar" color="orange" desc="Log Sesi Guru, Honor, Rapot" onClick={() => handleSelectRole('TEACHER')} />
              <RoleCard icon={Users} title="Siswa" color="emerald" desc="Pembayaran, Progres, Sertifikat" onClick={() => handleSelectRole('STUDENT')} />
              
              <div className="md:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 text-slate-600 shadow-xl shadow-slate-200/50">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0"><Info size={24}/></div>
                 <p className="text-[11px] font-bold uppercase tracking-wide leading-relaxed">
                   Halo! Selamat datang di Portal Internal SANUR Akademi Inspirasi. Silakan <span className="text-blue-600 font-black">pilih peran</span> di atas untuk melanjutkan ke halaman login.
                 </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">
              <div className={`md:w-72 p-12 ${currentTheme.bg} text-white flex flex-col justify-between items-center text-center`}>
                 <button onClick={() => setView('SELECTION')} className="p-3 bg-white/20 rounded-full hover:bg-white/40 transition-all"><ArrowLeft/></button>
                 <div className="space-y-6">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-3">
                       {role === 'ADMIN' ? <UserCog size={48}/> : role === 'TEACHER' ? <GraduationCap size={48}/> : <Users size={48}/>}
                    </div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter">PORTAL <br/> {role}</h3>
                 </div>
                 <div className="text-[9px] font-black uppercase tracking-widest opacity-60">Sanur Cloud v2.0</div>
              </div>

              <div className="flex-1 p-10 md:p-16">
                 <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="space-y-4">
                       <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase italic leading-none">SELAMAT <span className={currentTheme.text}>DATANG</span></h2>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Silakan masukkan identitas untuk masuk.</p>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-widest">Username Akun</label>
                          <div className="relative group">
                             <div className={`absolute left-6 top-1/2 -translate-y-1/2 ${currentTheme.text} opacity-30 group-focus-within:opacity-100 transition-opacity`}><Mail size={24}/></div>
                             <input 
                               type="text" 
                               value={username} 
                               onChange={(e) => setUsername(e.target.value)} 
                               placeholder="ISI USERNAME..." 
                               className={`w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-transparent rounded-[2rem] outline-none font-black text-xs uppercase transition-all focus:bg-white focus:${currentTheme.border}`} 
                             />
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-widest">PIN Keamanan</label>
                          <div className="relative group">
                             <div className={`absolute left-6 top-1/2 -translate-y-1/2 ${currentTheme.text} opacity-30 group-focus-within:opacity-100 transition-opacity`}><Lock size={24}/></div>
                             <input 
                               type="password" 
                               maxLength={6}
                               value={pin} 
                               onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} 
                               placeholder="****" 
                               className={`w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-transparent rounded-[2rem] outline-none font-black text-2xl tracking-[0.5em] text-center transition-all focus:bg-white focus:${currentTheme.border}`} 
                             />
                          </div>
                       </div>
                    </div>

                    {error && (
                      <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 text-rose-600 animate-bounce">
                         <ShieldAlert size={24} className="shrink-0" />
                         <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={loading || isSyncing} 
                      className={`w-full py-7 ${currentTheme.bg} text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50`}
                    >
                      {loading ? <Loader2 size={24} className="animate-spin" /> : <UserCheck size={24} />}
                      {loading ? 'MEMVERIFIKASI...' : 'MASUK SEKARANG ✨'}
                    </button>
                 </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-20 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
         Sanur Akademi Inspirasi &copy; 2026
      </footer>
    </div>
  );
};

const RoleCard = ({ icon: Icon, title, desc, color, onClick }: any) => {
  const themes: any = {
    blue: { border: 'border-blue-100 hover:border-blue-600', text: 'text-blue-600', bg: 'bg-blue-50', shadow: 'hover:shadow-blue-200' },
    orange: { border: 'border-orange-100 hover:border-orange-600', text: 'text-orange-600', bg: 'bg-orange-50', shadow: 'hover:shadow-orange-200' },
    emerald: { border: 'border-emerald-100 hover:border-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50', shadow: 'hover:shadow-emerald-200' }
  };
  const theme = themes[color];
  
  return (
    <button onClick={onClick} className={`group p-10 bg-white rounded-[4rem] border-2 shadow-xl transition-all flex flex-col items-center text-center hover:scale-105 active:scale-95 ${theme.border} ${theme.shadow}`}>
      <div className={`w-20 h-20 ${theme.bg} ${theme.text} rounded-[2rem] flex items-center justify-center mb-6 shadow-inner group-hover:rotate-6 transition-transform`}>
        <Icon size={40} />
      </div>
      <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-800 mb-2">{title}</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{desc}</p>
    </button>
  );
};

export default LoginPage;
