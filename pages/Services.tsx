
import React, { useState, useMemo } from 'react';
import { getDB, saveDB, logAudit } from '../db';
import { Service, Category, UserRole } from '../types';
import { 
  Plus, Search, Pencil, Trash2, X, Wrench, 
  Settings, Clock, UserCheck, ShieldCheck, 
  Tag, Info, Activity, Layers, DollarSign,
  Briefcase, FileText
} from 'lucide-react';
import { useLanguage, formatMAD } from '../App';

export default function ServicesPage() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<Partial<Service>>({});

  const currentUser = { role: UserRole.ADMIN };

  const services = useMemo(() => {
    return (db.services || []).filter((s: Service) => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.reference?.toLowerCase().includes(search.toLowerCase())
    );
  }, [db.services, search]);

  const openModal = (service: Service | null = null) => {
    if (service) {
      setEditingService(service);
      setFormData(service);
    } else {
      setEditingService(null);
      setFormData({
        reference: `SRV-${Date.now().toString().slice(-6)}`,
        name: '',
        description: '',
        status: 'Actif',
        priceHT: 0,
        tvaRate: 20,
        unit: 'Intervention',
        isVariablePrice: false,
        isTechAssignable: true,
        isRecurring: false,
        allowDiscount: true,
        maxDiscount: 10,
        categoryId: db.categories?.[0]?.id || ''
      });
    }
    setShowModal(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    let newDb = { ...db };
    const key = 'services';
    
    if (editingService) {
      newDb[key] = db[key].map((s: Service) => s.id === editingService.id ? { ...s, ...formData } : s);
      logAudit('admin', 'Services', 'Update', `Mise à jour du service ${formData.name}`);
    } else {
      const newSrv = { 
        ...formData, 
        id: `SRV-${Date.now()}`, 
        createdAt: new Date().toISOString() 
      };
      newDb[key] = [...(db[key] || []), newSrv];
      logAudit('admin', 'Services', 'Create', `Création du service ${formData.name}`);
    }
    
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  const SectionTitle = ({ icon: Icon, title }: any) => (
    <div className="flex items-center gap-2 mb-6 pt-6 border-t border-slate-100 first:border-0 first:pt-0">
      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
        <Icon className="w-4 h-4" />
      </div>
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h4>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Catalogue de Services</h2>
          <p className="text-slate-500 font-medium tracking-tight">Prestations immatérielles • Interventions • Forfaits</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Nouveau Service
        </button>
      </div>

      {/* Stats Services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Prestations</p>
            <h3 className="text-3xl font-black text-slate-900">{services.length}</h3>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Services Actifs</p>
            <h3 className="text-3xl font-black text-slate-900">{services.filter(s => s.status === 'Actif').length}</h3>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Technicien Requis</p>
            <h3 className="text-3xl font-black text-slate-900">{services.filter(s => s.isTechAssignable).length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Rechercher par nom ou référence..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-8 py-5">Service & Unité</th>
                <th className="px-8 py-5">Catégorie</th>
                <th className="px-8 py-5">Prix Unitaire HT</th>
                <th className="px-8 py-5">TVA</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {services.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase text-xs">Aucun service enregistré</td></tr>
              ) : (
                services.map((s: Service) => (
                  <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                          <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 tracking-tight leading-none mb-1">{s.name}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.reference}</span>
                             <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                             <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">par {s.unit}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-lg">
                        {(db.categories.find((c:any) => c.id === s.categoryId))?.name || 'Général'}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-black text-slate-900">
                      {s.isVariablePrice ? (
                        <span className="text-amber-600 italic text-[10px] uppercase">Variable</span>
                      ) : formatMAD(s.priceHT)}
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-slate-400">{s.tvaRate}%</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex gap-2">
                        {s.isTechAssignable && <UserCheck className="w-4 h-4 text-emerald-500" title="Technicien requis" />}
                        {s.isRecurring && <Activity className="w-4 h-4 text-indigo-500" title="Récurrent / Abonnement" />}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openModal(s)} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Pencil className="w-4 h-4" /></button>
                        <button className="p-2.5 bg-slate-100 text-slate-400 hover:text-rose-600 rounded-xl transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Service */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="p-10 bg-[#0f172a] text-white flex items-center justify-between shrink-0">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-3xl font-black shadow-2xl">
                     <Wrench className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tight">{editingService ? 'Modifier Prestation' : 'Nouveau Service'}</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-500" /> Catalogue des Opérations Services
                    </p>
                  </div>
               </div>
               <button onClick={() => setShowModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSaveService} className="flex-1 overflow-y-auto p-12 scrollbar-hide">
              <div className="grid grid-cols-2 gap-16">
                
                {/* IDENTITÉ DU SERVICE */}
                <div className="space-y-8">
                  <SectionTitle icon={Briefcase} title="Informations Générales" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence</label>
                      <input disabled value={formData.reference || ''} className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-black text-xs outline-none opacity-50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none focus:ring-4 focus:ring-indigo-500/10">
                        <option value="Actif">Actif</option>
                        <option value="Inactif">Inactif / Suspendu</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom de la Prestation</label>
                    <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Ex: Maintenance Climatisation" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</label>
                    <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                      {db.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                    <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm outline-none min-h-[100px]" placeholder="Détaillez la nature de l'intervention..." />
                  </div>
                </div>

                {/* TARIFICATION & LOGIQUE */}
                <div className="space-y-8">
                  <SectionTitle icon={DollarSign} title="Tarification & Facturation" />
                  
                  <div className="flex items-center gap-4 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Prix Variable</p>
                      <p className="text-[9px] font-bold text-slate-500">Activer pour définir le prix manuellement lors de la facturation (Ex: Devis)</p>
                    </div>
                    <input type="checkbox" checked={formData.isVariablePrice} onChange={e => setFormData({...formData, isVariablePrice: e.target.checked})} className="w-6 h-6 rounded-lg text-amber-600 focus:ring-amber-500" />
                  </div>

                  {!formData.isVariablePrice && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix HT (MAD)</label>
                        <input type="number" value={formData.priceHT || 0} onChange={e => setFormData({...formData, priceHT: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taux TVA (%)</label>
                        <select value={formData.tvaRate} onChange={e => setFormData({...formData, tvaRate: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none">
                          <option value={20}>20% (Standard)</option>
                          <option value={14}>14% (Transport/Elect)</option>
                          <option value={10}>10% (Restauration)</option>
                          <option value={0}>0% (Exonéré)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unité de mesure</label>
                    <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                      <option value="Intervention">Par Intervention</option>
                      <option value="Heure">Par Heure</option>
                      <option value="Jour">Par Journée</option>
                      <option value="Forfait">Forfaitaire</option>
                      <option value="KM">Par Kilomètre (Déplacement)</option>
                    </select>
                  </div>

                  <SectionTitle icon={UserCheck} title="Paramètres Techniques" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Assignation Technicien</p>
                        <p className="text-[9px] font-bold text-slate-500">Demander le choix d'un collaborateur lors de la facturation</p>
                      </div>
                      <input type="checkbox" checked={formData.isTechAssignable} onChange={e => setFormData({...formData, isTechAssignable: e.target.checked})} className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-indigo-500" />
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prestation Récurrente</p>
                        <p className="text-[9px] font-bold text-slate-500">Pour les contrats de maintenance ou abonnements</p>
                      </div>
                      <input type="checkbox" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} className="w-6 h-6 rounded-lg text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-16 pt-10 border-t border-slate-100 flex gap-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black text-xs uppercase tracking-[0.2em]">Annuler</button>
                <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all">Enregistrer le Service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
