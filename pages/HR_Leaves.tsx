
import React, { useState } from 'react';
import { getDB, saveDB } from '../db';
import { Leave, Employee } from '../types';
import { Plus, CalendarDays, CheckCircle, XCircle, Clock, Search, X } from 'lucide-react';
import { useLanguage } from '../App';

export default function HRLeaves() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ employeeId: '', leaveTypeId: 'lt1', startDate: '', endDate: '', reason: '' });

  const leaves = db.leaves || [];
  const leaveTypes = db.leaveTypes || [];

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const leave: Leave = { 
      ...formData, 
      id: `LV-${Date.now()}`, 
      status: 'Pending', 
      createdAt: new Date().toISOString() 
    };
    const newDb = { ...db, leaves: [...(db.leaves || []), leave] };
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  const updateStatus = (id: string, status: 'Approved' | 'Rejected') => {
    const newDb = { ...db };
    newDb.leaves = db.leaves.map((l: Leave) => l.id === id ? { ...l, status } : l);
    saveDB(newDb);
    setDb(newDb);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">{t('leaveMgmt')}</h2>
          <p className="text-slate-500">{t('leaveDesc')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">
          <Plus className="w-5 h-5" /> {t('requestLeave')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-slate-800"><Clock className="w-5 h-5 text-indigo-600" /> {t('recentRequests')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">{t('employees')}</th>
                  <th className="px-6 py-4">{t('period')}</th>
                  <th className="px-6 py-4">{t('type')}</th>
                  <th className="px-6 py-4">{t('status')}</th>
                  <th className="px-6 py-4 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">---</td></tr>
                ) : (
                  leaves.map((l: Leave) => {
                    const emp = db.employees.find((e: Employee) => e.id === l.employeeId);
                    const type = leaveTypes.find((tItem: any) => tItem.id === l.leaveTypeId);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{emp?.name || '---'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {l.startDate} - {l.endDate}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">{type?.name || '---'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-full ${
                            l.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                            l.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {l.status === 'Pending' && (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => updateStatus(l.id, 'Approved')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => updateStatus(l.id, 'Rejected')} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"><XCircle className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-indigo-300">
              <CalendarDays className="w-5 h-5" /> {t('todayAbsence')}
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-slate-400 italic">---</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex justify-between">
              <h3 className="text-xl font-bold">{t('requestLeave')}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveLeave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('employees')}</label>
                <select required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})}>
                  <option value="">{t('searchPlaceholder')}</option>
                  {db.employees.map((e: Employee) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('back')}</label>
                  <input required type="date" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fin</label>
                  <input required type="date" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
