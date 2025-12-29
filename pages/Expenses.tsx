
import React, { useState, useMemo } from 'react';
import { getDB, saveDB, logAudit } from '../db';
import { Expense } from '../types';
import { 
  Plus, Search, Wallet, X, Trash2, Calendar, 
  Tag, CreditCard, Banknote, Landmark, FileText 
} from 'lucide-react';
import { useLanguage, formatMAD } from '../App';

export default function Expenses() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({
    category: 'Loyer',
    paymentMethod: 'Cash',
    amount: 0,
    label: '',
    date: new Date().toISOString().split('T')[0]
  });

  const categories = ['Loyer', 'Electricité/Eau', 'Salaires', 'Internet/Tel', 'Transport', 'Marketing', 'Maintenance', 'Fournitures Bureau', 'Divers'];

  const expenses = useMemo(() => db.expenses || [], [db.expenses]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newEx = { ...formData, id: `EXP-${Date.now()}`, createdAt: new Date().toISOString() };
    const newDb = { ...db, expenses: [newEx, ...(db.expenses || [])] };
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
    logAudit('admin', 'Finance', 'Expense Create', `Dépense ${formData.label} de ${formData.amount} DH`);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Charges & Dépenses</h2>
          <p className="text-slate-500 font-medium">Suivi des coûts opérationnels (Opex) de l'entreprise.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Déclarer une Charge
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center"><Wallet className="w-8 h-8" /></div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Charges (Mois)</p>
               <h3 className="text-3xl font-black text-slate-900">{formatMAD(expenses.reduce((a,b)=>a+b.amount,0))}</h3>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center"><FileText className="w-8 h-8" /></div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nb. Justificatifs</p>
               <h3 className="text-3xl font-black text-slate-900">{expenses.length}</h3>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Dépense</th>
                <th className="px-8 py-5">Catégorie</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Règlement</th>
                <th className="px-8 py-5 text-right">Montant (DH)</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {expenses.map((ex: Expense) => (
                <tr key={ex.id} className="hover:bg-rose-50/20 transition-colors">
                  <td className="px-8 py-5 font-black text-slate-800">{ex.label}</td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-lg">{ex.category}</span>
                  </td>
                  <td className="px-8 py-5 font-bold text-slate-400">{ex.date}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                       {ex.paymentMethod === 'Cash' ? <Banknote className="w-4 h-4" /> : <Landmark className="w-4 h-4" />} {ex.paymentMethod}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-rose-600">{formatMAD(ex.amount)}</td>
                  <td className="px-8 py-5">
                     <div className="flex justify-center">
                        <button className="p-2.5 text-slate-300 hover:text-rose-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase text-xs">Aucune charge enregistrée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-rose-600 text-white flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl"><Wallet className="w-6 h-6" /></div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Déclarer une dépense</h3>
               </div>
               <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Libellé de la dépense</label>
                 <input required value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" placeholder="Ex: Facture Maroc Telecom" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant (DH)</label>
                    <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none text-rose-600" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode Paiement</label>
                    <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                       <option value="Cash">Espèces</option>
                       <option value="Virement">Virement</option>
                       <option value="Chèque">Chèque</option>
                       <option value="Carte">Carte Bancaire</option>
                    </select>
                 </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Annuler</button>
                <button type="submit" className="flex-1 py-4 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-600/30">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
