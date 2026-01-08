
import React, { useState, useMemo } from 'react';
import { Attendance } from '../types';
import { supabase } from '../services/supabase.ts';
import { 
  Wallet, 
  Package, 
  CheckCircle2, 
  Crown, 
  Banknote,
  X,
  Clock,
  Loader2
} from 'lucide-react';

interface AdminPayrollProps {
  attendanceLogs: Attendance[];
  setAttendanceLogs: React.Dispatch<React.SetStateAction<Attendance[]>>;
}

const AdminPayroll: React.FC<AdminPayrollProps> = ({ attendanceLogs, setAttendanceLogs }) => {
  const [showReceiptInput, setShowReceiptInput] = useState<{pkgId: string, teacherId: string} | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const packagesWithTeachers = useMemo(() => {
    const pkgs: Record<string, any> = {};
    const academicLogs = attendanceLogs.filter(l => (l.status || '').toUpperCase() !== 'ABSENT');

    academicLogs.forEach(log => {
      const pkgId = (log.packageId || 'UNASSIGNED').toUpperCase();
      const className = (log.className || 'Kelas Tidak Diketahui').toUpperCase();
      const groupKey = `${pkgId}::${className}`;

      if (!pkgs[groupKey]) {
        pkgs[groupKey] = { 
          id: pkgId, 
          displayId: groupKey,
          className: className, 
          totalSessions: 0, 
          teachers: {}, 
          isFullyPaid: true, 
          sessions: [] 
        };
      }
      
      const p = pkgs[groupKey];
      p.sessions.push(log);
      p.totalSessions = Math.max(p.totalSessions, log.sessionNumber || 0);

      const tid = log.teacherId;
      if (!p.teachers[tid]) {
        p.teachers[tid] = { name: log.teacherName.toUpperCase(), earnings: 0, count: 0, isPaid: true };
      }
      const t = p.teachers[tid];
      t.earnings += (log.earnings || 0);
      t.count++;
      if ((log.paymentStatus || 'UNPAID').toUpperCase() === 'UNPAID') { t.isPaid = false; p.isFullyPaid = false; }
    });

    return Object.values(pkgs).filter((p: any) => !p.isFullyPaid).sort((a, b) => b.totalSessions - a.totalSessions);
  }, [attendanceLogs]);

  const handleMarkAsPaid = async () => {
    if (!showReceiptInput) return;
    setIsLoading(true);
    const { pkgId, teacherId } = showReceiptInput;
    try {
      await supabase.from('attendance').update({ paymentstatus: 'PAID', receiptdata: receiptUrl || 'BANK TRANSFER' }).eq('packageid', pkgId).eq('teacherid', teacherId);
      setAttendanceLogs(prev => prev.map(log => {
        if (log.packageId === pkgId && log.teacherId === teacherId) return { ...log, paymentStatus: 'PAID', receiptData: receiptUrl || 'BANK TRANSFER' };
        return log;
      }));
      setShowReceiptInput(null);
      setReceiptUrl('');
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-12 animate-in">
      <div className="space-y-4 px-2">
         <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Gaji <span className="text-blue-600">Guru</span></h2>
         <p className="text-slate-500 font-medium text-sm max-w-lg leading-relaxed uppercase italic">Pencairan honor per paket sesi pengajar.</p>
      </div>

      <div className="grid grid-cols-1 gap-12 px-2">
         {packagesWithTeachers.map((pkg: any) => {
            const isReady = pkg.totalSessions >= 6;
            return (
              <div key={pkg.displayId} className={`bg-white p-10 md:p-14 rounded-[4rem] border-2 transition-all ${isReady ? 'border-blue-500 shadow-2xl' : 'border-slate-50 shadow-lg'}`}>
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 pb-10 border-b border-slate-50">
                    <div className="flex items-center gap-6">
                       <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isReady ? 'bg-blue-600 text-white shadow-xl' : 'bg-slate-100 text-slate-300'}`}><Package size={32} /></div>
                       <div><h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic leading-none">{pkg.className}</h4><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">PROGRESS: {pkg.totalSessions} / 6 SESI</p></div>
                    </div>
                    {isReady ? (
                      <span className="px-6 py-2 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2"><CheckCircle2 size={12}/> SIAP LULUS</span>
                    ) : (
                      <span className="px-6 py-2 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> DALAM PROSES</span>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(pkg.teachers).map(([tid, t]: [string, any]) => (
                       <div key={tid} className="p-8 rounded-[3rem] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-blue-500 transition-all">
                          <div className="flex items-center gap-5">
                             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-inner"><Crown size={24} /></div>
                             <div>
                                <p className="font-black text-slate-800 text-sm uppercase italic">{t.name}</p>
                                <p className="text-[10px] font-black text-blue-600 uppercase mt-1">{t.count} Sesi • Rp {t.earnings.toLocaleString()}</p>
                             </div>
                          </div>
                          {!t.isPaid && <button onClick={() => setShowReceiptInput({pkgId: pkg.id, teacherId: tid})} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all">BAYAR</button>}
                          {t.isPaid && <div className="text-emerald-600 font-black text-[10px] uppercase flex items-center gap-2"><CheckCircle2 size={16}/> CAIR</div>}
                       </div>
                    ))}
                 </div>
              </div>
            );
         })}
         {packagesWithTeachers.length === 0 && (
            <div className="py-40 text-center bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 opacity-20"><p className="text-[12px] font-black uppercase tracking-[0.4em] italic leading-relaxed">Antrean Payroll Bersih ✨</p></div>
         )}
      </div>

      {showReceiptInput && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl relative">
              <button onClick={() => setShowReceiptInput(null)} className="absolute top-10 right-10 p-3 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
              <h4 className="text-xl font-bold text-slate-800 text-center mb-8 uppercase italic">Konfirmasi Transfer</h4>
              <div className="space-y-6 text-center">
                 <Banknote size={48} className="mx-auto text-emerald-500 mb-2" />
                 <input type="text" value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)} placeholder="REFERENSI BANK/CATATAN..." className="w-full px-8 py-5 bg-slate-50 rounded-2xl text-[11px] font-black uppercase outline-none shadow-inner" />
                 <button onClick={handleMarkAsPaid} disabled={isLoading} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-2xl transition-all">
                    {isLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'SELESAIKAN PEMBAYARAN ✨'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayroll;
