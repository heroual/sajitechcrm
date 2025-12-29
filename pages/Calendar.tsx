
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Users, Tag, X } from 'lucide-react';
import { getDB, saveDB } from '../db';
import { useLanguage } from '../App';
import { CalendarEvent } from '../types';

export default function Calendar() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    type: 'Call',
    status: 'Planned',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date().toISOString().slice(0, 16),
  });

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  const getEventsForDay = (day: number) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return (db.calendarEvents || []).filter((e: CalendarEvent) => e.startDate.startsWith(dateStr));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent = { ...formData, id: `EV-${Date.now()}` } as CalendarEvent;
    const newDb = { ...db, calendarEvents: [...(db.calendarEvents || []), newEvent] };
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  const typeColors = {
    Call: 'bg-blue-100 text-blue-700 border-blue-200',
    Meeting: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Task: 'bg-amber-100 text-amber-700 border-amber-200',
    Leave: 'bg-rose-100 text-rose-700 border-rose-200',
    Service: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
              Aujourd'hui
            </button>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all active:scale-95">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-2xl font-black text-slate-900 capitalize tracking-tight">{monthName}</h2>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Planifier
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => (
            <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[140px]">
          {calendarData.map((day, idx) => (
            <div key={idx} className={`p-4 border-r border-b border-slate-50 hover:bg-slate-50/30 transition-colors ${!day ? 'bg-slate-50/20' : ''}`}>
              {day && (
                <div className="h-full flex flex-col">
                  <span className={`text-xs font-black ${new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() ? 'bg-indigo-600 text-white w-7 h-7 flex items-center justify-center rounded-xl shadow-lg shadow-indigo-600/20' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  <div className="mt-3 space-y-1 overflow-y-auto scrollbar-hide">
                    {getEventsForDay(day).map(ev => (
                      <div key={ev.id} className={`px-2 py-1.5 rounded-lg border text-[9px] font-black truncate tracking-tight transition-all hover:scale-[1.02] cursor-pointer ${typeColors[ev.type as keyof typeof typeColors]}`}>
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Nouvel Événement</h3>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-1 italic">Moteur de Planification Local</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre de l'événement</label>
                <input required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Ex: Réunion Technique" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                  <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold appearance-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="Call">Appel</option>
                    <option value="Meeting">Réunion</option>
                    <option value="Task">Tâche</option>
                    <option value="Leave">Congé</option>
                    <option value="Service">Intervention</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
                  <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option value="Planned">Planifié</option>
                    <option value="Confirmed">Confirmé</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Début</label>
                  <input type="datetime-local" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fin</label>
                  <input type="datetime-local" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Annuler</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
