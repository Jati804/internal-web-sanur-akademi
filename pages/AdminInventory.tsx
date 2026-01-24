      {/* MODAL DELETE SALES B2B */}
      {showDeleteConfirmSales && (
        <div data-modal-container className="fixed inset-0 z-[110000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl opacity-0" style={{animation: 'modalFadeIn 0.3s ease-out forwards'}}>
          <div className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative opacity-0" style={{animation: 'modalZoomIn 0.3s ease-out 0.1s forwards'}}>
            <button onClick={() => setShowDeleteConfirmSales(null)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20}/></button>
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-800 uppercase italic leading-none">Hapus Kontak?</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-2">
                Data kontak <span className="text-slate-800 font-black underline">{showDeleteConfirmSales?.institutionName}</span> akan dihapus permanen.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirmSales(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">BATAL</button>
              <button onClick={executeDeleteSales} disabled={isLoading} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14}/>} IYA, HAPUS
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
{activeTab === 'SALES' && (
        <>
          {urgentSalesContacts.length > 0 && (
            <div className="mx-4 p-8 bg-rose-50 rounded-[3rem] border-2 border-rose-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl animate-in zoom-in">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0 animate-pulse"><AlertTriangle size={36} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-600 mb-1">⚠️ BUTUH FOLLOW-UP SEGERA!</p>
                  <h3 className="text-xl font-black italic uppercase leading-none tracking-tight text-slate-800">
                    {urgentSalesContacts.length} kontak belum di-follow-up lebih dari 7 hari! 🔥
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mx-4">
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl flex items-center gap-8 group">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-all"><Zap size={32} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HOT DEALS</p><h4 className="text-3xl font-black italic">{salesContacts.filter(s => s.dealStatus === 'HOT').length}</h4></div>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl flex items-center gap-8 group">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-all"><Clock size={32} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WARM DEALS</p><h4 className="text-3xl font-black italic">{salesContacts.filter(s => s.dealStatus === 'WARM').length}</h4></div>
            </div>
            <div className="bg-[#0F172A] p-10 rounded-[3rem] text-white shadow-2xl flex items-center gap-8">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white"><Building2 size={32} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL KONTAK</p><h4 className="text-3xl font-black italic">{salesContacts.length}</h4></div>
            </div>
          </div>

          <div className="mx-4">
            <div className="relative w-full shadow-2xl shadow-slate-200/50">
              <Search size={22} className="absolute left-8 top-1/2 -translate-y-1/2 text-orange-500" />
              <input type="text" placeholder="CARI INSTANSI, NARAHUBUNG, ATAU HP..." value={searchTermSales} onChange={e => setSearchTermSales(e.target.value.toUpperCase())} className="w-full pl-16 pr-8 py-6 bg-white border border-slate-50 rounded-full text-[12px] font-black uppercase outline-none shadow-sm focus:border-orange-500 transition-all placeholder:text-slate-300" />
            </div>
          </div>

          <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden mx-4">
            <div className="max-h-[750px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-20 border-b">
                  <tr>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">INSTANSI & NARAHUBUNG</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">KONTAK</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">FOLLOW-UP</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">STATUS</th>
                    <th className="px-8 py-10 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSalesContacts.map(s => {
                    const daysSince = getDaysSinceLastContact(s.lastContactDate);
                    const isUrgent = daysSince > 7;
                    const colors = getStatusColor(s.dealStatus);
                    return (
                      <tr key={s.id} className={`transition-all group border-l-8 ${isUrgent ? 'bg-rose-50/50 border-rose-400' : 'hover:bg-slate-50 border-transparent'}`}>
                        <td className="px-8 py-10">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Building2 size={16} className="text-orange-500 shrink-0" />
                              <p className="text-base font-black uppercase italic leading-none text-slate-800">{s.institutionName}</p>
                            </div>
                            <div className="flex items-center gap-3 ml-6">
                              <Briefcase size={14} className="text-slate-400 shrink-0" />
                              <p className="text-xs font-black text-slate-600">{s.contactPerson}</p>
                            </div>
                            <div className="ml-6">
                              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[8px] font-black uppercase tracking-widest">{s.jobTitle}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-10">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Phone size={14} className="text-orange-500" />
                              <p className="text-xs font-black text-slate-800">{s.phone}</p>
                            </div>
                            {s.email && (
                              <div className="flex items-center gap-3">
                                <Mail size={14} className="text-blue-500" />
                                <p className="text-[10px] font-bold text-blue-600 italic">{s.email}</p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-10">
                          <div className="space-y-3">
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Contact:</p>
                              <p className={`text-xs font-black ${isUrgent ? 'text-rose-600' : 'text-slate-700'}`}>{formatDateToDMY(s.lastContactDate)}</p>
                              <p className={`text-[9px] font-bold mt-1 ${isUrgent ? 'text-rose-500' : 'text-slate-400'}`}>({daysSince} hari lalu)</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Next F/U:</p>
                              <p className="text-xs font-black text-orange-600">{formatDateToDMY(s.nextFollowupDate)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-10">
                          <div className={`px-4 py-3 rounded-2xl ${colors.bg} border-2 ${colors.border} text-center`}>
                            <p className={`text-xs font-black uppercase ${colors.text}`}>
                              {s.dealStatus === 'HOT' && '🔥 HOT'}
                              {s.dealStatus === 'WARM' && '🌤️ WARM'}
                              {s.dealStatus === 'COLD' && '❄️ COLD'}
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-10">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleOpenEditSales(s)} className="p-3.5 bg-white text-slate-300 hover:text-orange-600 rounded-2xl shadow-sm border border-slate-50 transition-all active:scale-90"><Edit3 size={18}/></button>
                            <button onClick={() => setShowDeleteConfirmSales(s)} className="p-3.5 bg-white text-slate-300 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90"><Trash2 size={18}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSalesContacts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-20">
                          <Building2 size={48} className="text-slate-300" />
                          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Belum ada kontak B2B.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  </>
  );
};

export default AdminMarketing;
