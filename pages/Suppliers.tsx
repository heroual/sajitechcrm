
import React, { useState, useMemo } from 'react';
import { getDB, saveDB, logAudit } from '../db';
import { Supplier } from '../types';
import { 
  Plus, Search, Pencil, Trash2, X, Truck, Building2, 
  User as UserIcon, Phone, Mail, MapPin, Landmark, ShieldCheck 
} from 'lucide-react';
import { useLanguage } from '../App';

export default function Suppliers() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});

  const suppliers = useMemo(() => {
    return (db.suppliers || []).filter((s: Supplier) => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.ice?.includes(search)
    );
  }, [db.suppliers, search]);

  const openModal = (supplier: Supplier | null = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData(supplier);
    } else {
      setEditingSupplier(null);
      setFormData({
        type: 'Société',
        status: 'Actif',
        name: '', phone: '', email: '', address: '', city: '', ice: '', if: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let newDb = { ...db };
    if (editingSupplier) {
      newDb.suppliers = db.suppliers.map((s: Supplier) => s.id === editingSupplier.id ? { ...s, ...formData } : s);
      logAudit('admin', 'Finance', 'Supplier Update', `Fournisseur ${formData.name} modifié`);
    } else {
      const newS = { ...formData, id: `SUP-${Date.now()}`, createdAt: new Date().toISOString() };
      newDb.suppliers = [...(db.suppliers || []), newS];
      logAudit('admin', 'Finance', 'Supplier Create', `Nouveau fournisseur ${formData.name}`);
    }
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Répertoire Fournisseurs</h2>
          <p className="text-slate-500 font-medium">Gestion des comptes fournisseurs & logistique amont.</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Nouveau Fournisseur
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Rechercher par raison sociale ou ICE..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Identité</th>
                <th className="px-8 py-5">Identifiants</th>
                <th className="px-8 py-5">Localisation</th>
                <th className="px-8 py-5">Contact</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {suppliers.map((s: Supplier) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                        {s.type === 'Société' ? <Building2 className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 tracking-tight leading-none mb-1">{s.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{s.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded w-fit mb-1">ICE: {s.ice || '---'}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">IF: {s.if || '---'}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><MapPin className="w-3 h-3 text-indigo-400" /> {s.city}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><Phone className="w-3 h-3 text-indigo-400" /> {s.phone}</div>
                       <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><Mail className="w-3 h-3 text-indigo-400" /> {s.email}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2">
                       <button onClick={() => openModal(s)} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Pencil className="w-4 h-4" /></button>
                       <button className="p-2.5 bg-slate-100 text-slate-400 hover:text-rose-600 rounded-xl transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="p-10 bg-[#0f172a] text-white flex items-center justify-between shrink-0">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-3xl font-black shadow-2xl">
                     <Truck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">{editingSupplier ? 'Modifier Fournisseur' : 'Nouveau Fournisseur'}</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Conformité Identifiant Fiscal</p>
                  </div>
               </div>
               <button onClick={() => setShowModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nature</label>
                   <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                     <option value="Société">Société</option>
                     <option value="Particulier">Particulier / Freelance</option>
                   </select>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raison Sociale</label>
                   <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ICE (15 chiffres)</label>
                    <input maxLength={15} value={formData.ice} onChange={e => setFormData({...formData, ice: e.target.value.replace(/\D/g, '')})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identifiant Fiscal (IF)</label>
                    <input value={formData.if} onChange={e => setFormData({...formData, if: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</label>
                    <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                    <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                 </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black text-xs uppercase tracking-widest">Annuler</button>
                <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20">Enregistrer Fournisseur</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
