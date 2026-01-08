
import React from 'react';
import { User } from '../types';
import { MOCK_ATTENDANCE } from '../constants';
import { 
  Wallet, 
  TrendingUp, 
  Download, 
  CreditCard,
  FileText,
  PieChart,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

interface TeacherSalaryProps {
  user: User;
}

const TeacherSalary: React.FC<TeacherSalaryProps> = ({ user }) => {
  const chartData = [
    { month: 'Jun', amount: 1200000 },
    { month: 'Jul', amount: 1500000 },
    { month: 'Agu', amount: 1100000 },
    { month: 'Sep', amount: 1800000 },
    { month: 'Okt', amount: 1450000 },
  ];

  const totalEarnings = chartData.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Riwayat <span className="text-blue-600">Gaji & Honor</span></h2>
          <p className="text-slate-500 font-bold mt-2">Seluruh penghasilan mengajar Anda tercatat secara otomatis dan transparan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-blue-200">
            <div className="p-4 bg-white/10 rounded-2xl w-fit mb-8">
              <Wallet size={28} />
            </div>
            <p className="text-blue-200 text-xs font-black uppercase tracking-widest mb-2">Estimasi Honor Sesi Berjalan</p>
            <h3 className="text-3xl font-black mb-8">Rp 1.450.000</h3>
            <div className="pt-6 border-t border-white/10">
               <p className="text-[10px] text-blue-300 font-medium italic">*Honor akan ditransfer sesuai jadwal rutin pengurus.</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <PieChart size={16} className="text-orange-500" /> Komposisi Honor
            </h4>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Kelas Reguler</span>
                <span className="text-xs font-black text-slate-900">Rp 840.000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Kelas Private</span>
                <span className="text-xs font-black text-slate-900 text-emerald-600">Rp 610.000</span>
              </div>
              <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                <span className="text-xs font-black text-slate-900 uppercase">Total Sesi Ini</span>
                <span className="text-lg font-black text-blue-600">Rp 1.450.000</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <TrendingUp size={24} className="text-blue-600" /> Pertumbuhan Honor
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}
                  />
                  <Bar dataKey="amount" radius={[12, 12, 12, 12]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 4 ? '#f97316' : '#2563eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <FileText size={24} className="text-orange-500" /> Riwayat Pembayaran Sebelumnya
            </h3>
            <div className="space-y-4">
              {chartData.reverse().map((item, i) => (
                <div key={i} className="group p-6 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all border border-transparent rounded-[2rem] flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">Transfer Honor Periode {item.month}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Selesai Dibayarkan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <p className="font-black text-slate-900">Rp {item.amount.toLocaleString()}</p>
                    <button className="p-2.5 text-blue-500 hover:text-white hover:bg-blue-600 bg-white rounded-xl shadow-sm border border-slate-100 transition-all">
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSalary;
