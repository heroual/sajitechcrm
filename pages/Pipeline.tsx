
import React, { useState } from 'react';
import { getDB, saveDB } from '../db';
import { Opportunity, Client } from '../types';
import { Kanban, Plus, DollarSign, Clock, User, X, Pencil, Filter } from 'lucide-react';
import { useLanguage } from '../App';

const STAGES = ['Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export default function Pipeline() {
  const { t, language } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [showModal, setShowModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [formData, setFormData] = useState<any>({});

  const stageTranslations: Record<string, string> = {
    'Discovery': language === 'FR' ? 'Découverte' : 'Discovery',
    'Proposal': language === 'FR' ? 'Proposition' : 'Proposal',
    'Negotiation': language === 'FR' ? 'Négociation' : 'Negotiation',
    'Won': language === 'FR' ? 'Gagné' : 'Won',
    'Lost': language === 'FR' ? 'Perdu' : 'Lost',
  };

  const opportunities = db.opportunities || [];

  const openModal = (opp: Opportunity | null = null) => {
    if (opp) {
      setEditingOpp(opp);
      setFormData(opp);
    } else {
      setEditingOpp(null);
      setFormData({ title: '', expectedValue: 0, probability: 50, stage: 'Discovery', closeDate: '', assignedTo: 'e1' });
    }
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let newDb = { ...db };
    if (editingOpp) {
      newDb.opportunities = db.opportunities.map((o: Opportunity) => o.id === editingOpp.id ? { ...o, ...formData } : o);
    } else {
      const newOpp = { ...formData, id: `OPP-${Date.now()}`, createdAt: new Date().toISOString() };
      newDb.opportunities = [...(db.opportunities || []), newOpp];
    }
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  return (
    <div className="space-y-10 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t('salesPipeline')}</h2>
          <p className="text-slate-500 font-medium">{t('pipelineDesc')}</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> {t('newOpportunity')}
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 scrollbar-hide">
        <div className="flex gap-8 min-w-[1200px] h-full">
          {STAGES.map(stage => {
            const oppsInStage = opportunities.filter((o: Opportunity) => o.stage === stage);
            const stageValue = oppsInStage.reduce((a: number, b: Opportunity) => a + b.expectedValue, 0);
            
            return (
              <div key={stage} className="w-80 bg-slate-100/50 rounded-[2rem] border border-slate-200/60 p-5 flex flex-col">
                <div className="mb-6 px-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-xs text-slate-900 uppercase tracking-[0.2em]">{stageTranslations[stage]}</h3>
                    <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-lg">{oppsInStage.length}</span>
                  </div>
                  <p className="text-indigo-600 font-black text-sm tracking-tight">{db.settings.currency} {stageValue.toLocaleString()}</p>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide pr-1">
                  {oppsInStage.map(opp => (
                    <div 
                      key={opp.id} 
                      onClick={() => openModal(opp)}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer group active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                          opp.probability >= 70 ? 'bg-emerald-50 text-emerald-600' :
                          opp.probability >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {opp.probability}% Prob
                        </span>
                        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="font-black text-slate-800 tracking-tight text-sm mb-4 leading-tight">{opp.title}</h4>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-indigo-600 font-black text-xs">
                          <DollarSign className="w-3 h-3" />
                          {opp.expectedValue.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold">
                          <Clock className="w-3 h-3" />
                          {opp.closeDate || '---'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">{editingOpp ? t('edit') : t('new')}</h3>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-1 italic">Sales Intelligence Engine</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</label>
                <input required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('expectedValue')} ({db.settings.currency})</label>
                  <input required type="number" value={formData.expectedValue || 0} onChange={e => setFormData({...formData, expectedValue: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('probability')} (%)</label>
                  <input required type="number" min="0" max="100" value={formData.probability || 0} onChange={e => setFormData({...formData, probability: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('stage')}</label>
                  <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold appearance-none" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>
                    {STAGES.map(s => <option key={s} value={s}>{stageTranslations[s]}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('closeDate')}</label>
                  <input type="date" value={formData.closeDate || ''} onChange={e => setFormData({...formData, closeDate: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
