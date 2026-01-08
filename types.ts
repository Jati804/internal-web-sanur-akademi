
export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type SessionCategory = 'REGULER' | 'PRIVATE';
export type ReportStatus = 'PENDING' | 'COMPLETED' | 'REMEDIAL';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface User {
  id: string;
  name: string;
  role: Role;
  username: string;
  pin?: string; 
  status?: UserStatus;
  lastActive?: string;
  phone?: string;
  birthday?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  dob: string;
  institution: string;
  personalPhone: string;
  parentPhone: string;
  enrolledClass: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  date: string;
  description: string;
}

export interface StudentPayment {
  id: string;
  studentName: string;
  className: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  note?: string;
  receiptData?: string; 
}

export interface Attendance {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  clockIn: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'SESSION_LOG' | 'SUB_LOG' | 'WORK_LOG' | 'REPORT_REQUEST' | 'REPORT_PROCESSING' | 'REPORT_REJECTED';
  className?: string;
  sessionCategory?: SessionCategory;
  level?: string; // Menambahkan level belajar (Basic, dll)
  duration?: number; 
  studentsAttended?: string[];
  studentSessions?: Record<string, number>; 
  studentScores?: Record<string, number | number[]>; 
  studentTopics?: Record<string, string | string[]>; 
  studentNarratives?: Record<string, string>; 
  earnings?: number;
  paymentStatus?: 'PAID' | 'UNPAID';
  receiptUrl?: string; 
  receiptData?: string; 
  packageId?: string; // Digunakan sebagai ID Siklus 6 Sesi
  sessionNumber?: number; 
  totalPackageSessions?: number;
  reportNarrative?: string;
  substituteFor?: string; // Nama guru yang digantikan (jika ada)
  originalTeacherId?: string; // ID Guru pemilik siklus asli
}

export interface AuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  detail: string;
}
