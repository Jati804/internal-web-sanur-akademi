import React, { useMemo } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { DAYS, sortSchedule, fmtRange, stripPelatihan } from './pages/AdminAcademic.tsx';
import type { ScheduleItem } from './pages/AdminAcademic.tsx';

// ============================================================================
// 🗓️ JADWAL SAYA (read-only)
// Muncul dari tombol kalender di header (guru & siswa). Jadwal diambil dari
// `settings` (key: class_schedule) yang sudah di-fetch App, lalu DISARING:
//   - Guru  -> hanya jadwal yang teacherId-nya = akun yang login
//   - Siswa -> hanya jadwal yang daftar pesertanya memuat akun yang login
// Siswa tidak melihat nama teman sekelas. Guru melihat siswanya sendiri.
// ============================================================================

interface ScheduleModalProps {
  user: any;
  schedule: ScheduleItem[];
  teachers: any[];
  studentAccounts: any[];
  color: string; // kelas warna peran, mis. 'bg-orange-500'
  onClose: () => void;
}

const isPrivateRoom = (room: string) => /PRIVATE|PRIVAT|HOME TUTORING/i.test(room || '');

const ScheduleModal: React.FC<ScheduleModalProps> = ({ user, schedule, teachers, studentAccounts, color, onClose }) => {
  const myId = String(user?.id ?? '');
  const isTeacher = user?.role === 'TEACHER';

  const teacherById = useMemo(() => new Map((teachers || []).map((t: any) => [String(t.id), t])), [teachers]);
  const studentById = useMemo(() => new Map((studentAccounts || []).map((s: any) => [String(s.id), s])), [studentAccounts]);

  const teacherName = (it: ScheduleItem) => teacherById.get(String(it.teacherId))?.name || it.teacherName || '-';
  const personName = (p: { id: string; name: string }) => studentById.get(String(p.id))?.name || p.name;

  // Hari ini (JS: 0 = Minggu) -> indeks DAYS (0 = Senin)
  const todayName = DAYS[(new Date().getDay() + 6) % 7];

  const groups = useMemo(() => {
    const mine = (Array.isArray(schedule) ? schedule : []).filter(it =>
      isTeacher
        ? String(it.teacherId) === myId
        : (it.participants || []).some(p => String(p.id) === myId)
    );
    const sorted = sortSchedule(mine);
    const byDay = DAYS.map(day => ({ day, list: sorted.filter(i => i.day === day) })).filter(g => g.list.length > 0);
    // hari ini di paling atas, sisanya urut Senin-Minggu
    return [...byDay.filter(g => g.day === todayName), ...byDay.filter(g => g.day !== todayName)];
  }, [schedule, isTeacher, myId, todayName]);

  return (
    <div
      data-modal-container
      className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-8 py-6 ${color} text-white flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <CalendarDays size={24} />
            <div>
              <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none">Jadwal Saya</h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/70 mt-1.5">
                {isTeacher ? 'Jadwal mengajar' : 'Jadwal belajar'}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="w-10 h-10 shrink-0 rounded-full bg-white/20 text-white hover:bg-white hover:text-rose-600 active:bg-white active:text-rose-600 flex items-center justify-center transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Isi */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-7">
          {groups.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Belum ada jadwal untukmu</p>
              <p className="text-[11px] font-bold text-slate-300">Hubungi Pengurus kalau jadwalmu belum terdaftar ya.</p>
            </div>
          ) : (
            groups.map(g => (
              <section key={g.day} className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{g.day}</h4>
                  {g.day === todayName && (
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${color}`}>Hari ini</span>
                  )}
                </div>
                <div className="space-y-2">
                  {g.list.map(it => {
                    const priv = isPrivateRoom(it.room);
                    const people = it.participants || [];
                    return (
                      <div key={it.id} className="flex gap-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] px-5 py-4">
                        <p className="w-[5.5rem] shrink-0 text-xs font-black text-slate-800 leading-snug">{fmtRange(it.start, it.end)}</p>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black text-slate-800 uppercase italic">{stripPelatihan(it.subject)}</p>
                            <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${priv ? 'bg-orange-500' : 'bg-blue-900'}`}>{it.room}</span>
                          </div>
                          {!isTeacher && (
                            <p className="text-[11px] font-bold text-slate-500">{teacherName(it)}</p>
                          )}
                          {isTeacher && people.length > 0 && (
                            <div className={`text-[11px] font-semibold space-y-0.5 ${priv ? 'text-orange-600' : 'text-blue-900/70'}`}>
                              {people.map((p, k) => (
                                <p key={p.id + k}>{people.length > 1 ? `${k + 1}. ` : ''}{personName(p)}</p>
                              ))}
                            </div>
                          )}
                          {it.note && (
                            <p className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-xl text-[10px] font-semibold italic text-slate-500">“{it.note}”</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default ScheduleModal;
