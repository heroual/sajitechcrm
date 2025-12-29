
import React, { useState } from 'react';
import { getDB, saveDB } from '../db';
import { Activity } from '../types';
import { CalendarClock, Plus, Phone, Mail, Users, CheckCircle, Clock, X, MessageSquare, Briefcase } from 'lucide-react';

export default function Activities() {
  const [db, setDb] = useState(getDB());
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'Tous' | 'En attente' | 'Terminés'>('En attente');
  // Fixed: Use 'Call' instead of 'Appel' to match Activity type definition
  const [formData, setFormData] = useState<any>({ type: 'Call', status: 'Pending', dueDate: '', subject: '', description: '' });

  const activities = (db.activities || []).filter((a: Activity) => {
    if (filter === 'Tous') return true;
    if (filter === 'En attente') return a.status === 'Pending';
    return a.status === 'Completed';
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newActivity = { ...formData, id: `ACT-${Date.now()}`, createdAt: new Date().toISOString() };
    const newDb = { ...db, activities: [...(db.activities || []), newActivity] };
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  const toggleStatus = (id: string) => {
    const newDb = { ...db };
    newDb.activities = db.activities.map((a: Activity) => 
      a.id === id ? { ...a, status: a.status === 'Pending' ? 'Completed' : 'Pending' } : a
    );
    saveDB(newDb);
    setDb(newDb);
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Flux d'Activités</h2>
          <p className="text-slate-500 font-medium">Consignez les interactions clients et orchestrez les réponses de l'équipe.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Planifier une Activité
        </button>
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 shadow-sm">
        {['En attente', 'Terminés', 'Tous'].map((f: any) => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 pb-12">
        {activities.length === 0 ? (
          <div className="py-20 text-center opacity-30 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white">
            <CalendarClock className="w-16 h-16 mx-auto mb-6" />
            <p className="text-xs font-black uppercase tracking-widest">Aucune activité enregistrée ici.</p>
          </div>
        ) : (
          activities.map((a: Activity) => (
            <div key={a.id} className={`bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between group hover:shadow-xl hover:border-indigo-200 transition-all ${a.status === 'Completed' ? 'opacity-60 grayscale' : ''}`}>
              <div className="flex items-center gap-6">
                {/* Fixed: Use correct Activity type keys 'Call' and 'Meeting' for comparison */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  a.type === 'Call' ? 'bg-indigo-50 text-indigo-600' :
                  a.type === 'Meeting' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {a.type === 'Call' && <Phone className="w-6 h-6" />}
                  {a.type === 'Meeting' && <Users className="w-6 h-6" />}
                  {a.type === 'Email' && <Mail className="w-6 h-6" />}
                  {a.type === 'Note' && <MessageSquare className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 tracking-tight leading-none mb-2">{a.subject}</h4>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{a.type}</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" /> {new Date(a.dueDate).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleStatus(a.id)}
                  className={`p-3 rounded-2xl transition-all border ${
                    a.status === 'Completed' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-500'
                  }`}
                >
                  <CheckCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="p-8 bg-indigo-600 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Enregistrer une Interaction</h3>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-1 italic">Terminal d'Engagement Client</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type d'Engagement</label>
                  {/* Fixed: Use 'Call' and 'Meeting' as values to match the Activity interface */}
                  <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold appearance-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="Call">Appel Téléphonique</option>
                    <option value="Meeting">Réunion / Meeting</option>
                    <option value="Email">Relance Email</option>
                    <option value="Note">Note Interne</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</label>
                  <input required type="datetime-local" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objet / Sujet</label>
                <input required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold placeholder:text-slate-300" placeholder="ex: Négociation de contrat..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Résumé / Détails</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold min-h-[100px]" placeholder="Points clés et prochaines étapes..." />
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Annuler</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30">Planifier l'Engagement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
