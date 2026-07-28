
import { Transaction, Attendance, StudentProfile, User, StudentPayment } from './types';

// 🗑️ MOCK_ADMIN dihapus: dulu jalur darurat login yang skip Supabase Auth,
// tapi username-nya collision sama akun Admin asli ('pengurus_sanur2024'),
// jadi malah nge-block login akun asli begitu RLS aktif. Sekarang akun
// Admin udah tersinkron penuh ke Supabase Auth, jalur ini udah nggak
// dipakai/diperlukan lagi (sudah dihapus juga dari LoginPage.tsx).

export const MOCK_TEACHERS: User[] = [
  { id: 'guru-1', name: 'SRI ISTI UNTARI', role: 'TEACHER', username: 'guru_sri', pin: '4488' },
  { id: 'guru-2', name: 'ANITA RAHMAWATI', role: 'TEACHER', username: 'guru_anita', pin: '4488' },
  { id: 'guru-3', name: 'HAFIDZ HABIBULLOH', role: 'TEACHER', username: 'guru_hafidz', pin: '4488' },
  { id: 'guru-4', name: 'DODI SETIAWAN', role: 'TEACHER', username: 'guru_dodi', pin: '4488' }
];

export const MOCK_PROFILES: StudentProfile[] = [
  { id: 'p-1', name: 'FELLYA', dob: '01 JANUARI 2012', institution: '-', personalPhone: '-', parentPhone: '-', enrolledClass: '-', notes: '[SISWA SANUR]' },
  { id: 'p-2', name: 'TIBI', dob: '01 JANUARI 2012', institution: '-', personalPhone: '-', parentPhone: '-', enrolledClass: '-', notes: '[SISWA SANUR]' }
];

export const MOCK_TRANSACTIONS: Transaction[] = [];
export const MOCK_STUDENT_PAYMENTS: StudentPayment[] = [];
export const MOCK_ATTENDANCE: Attendance[] = [];

export const INITIAL_SUBJECTS = [
  "Pelatihan Microsoft Word", 
  "Pelatihan Microsoft Excel", 
  "Pelatihan Microsoft PowerPoint",
  "Desain Grafis Canva",
  "Pelatihan Affiliate Tiktok",
  "Digital Marketing Basic",
  "Pendampingan CPNS",
  "Pelatihan Kewirausahaan",
  "Pelatihan Youtube Creator"
];

export const CLASS_ROOM_OPTIONS = [
  "Reguler 1", "Reguler 2", "Reguler 3", "Reguler 4", "Reguler 5",
  "Private 1", "Private 2", "Private 3", "Private 4", "Private 5"
];
