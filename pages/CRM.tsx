
import React, { useState, useMemo } from 'react';
import { getDB, saveDB, logAudit, logClientAction } from '../db';
import { Client, ClientType, ClientStatus, UserRole, ClientAction, Invoice, Sale } from '../types';
import { 
  Plus, Search, Mail, Phone, MapPin, Pencil, Trash2, X, 
  UserCheck, Zap, Info, Landmark, CreditCard, Tag, 
  MessageSquare, Globe, Building2, User as UserIcon, AlertCircle,
  Smartphone, Wallet, ShieldCheck, ChevronDown, History, BarChart3, TrendingUp, Award, Clock, ShoppingBag
} from 'lucide-react';
import { useLanguage, formatMAD } from '../App';

// Define interface for client statistics to fix type errors
interface ClientStat {
  totalCA: number;
  ordersCount: number;
  lastDate: string;
  daysSinceLast: number;
  score: number;
  category: string;
}

export default function CRM() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [tab, setTab] = useState<'Clients' | 'Leads' | 'Analysis'>('Clients');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'Info' | 'History' | 'Performance'>('Info');
  const [editingItem, setEditingItem] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});

  // --- MOTEUR DE CALCUL RFM & SCORING ---
  // Fix: Add explicit return type to useMemo for clientStats
  const clientStats = useMemo<Record<string, ClientStat>>(() => {
    const stats: Record<string, ClientStat> = {};
    const invoices = (db.invoices || []) as Invoice[];
    const actions = (db.clientActions || []) as ClientAction[];

    (db.clients || []).forEach((c: Client) => {
      const clientInvoices = invoices.filter((i: Invoice) => i.clientId === c.id && i.status !== 'Draft');

      const totalCA = clientInvoices.reduce((sum: number, i: Invoice) => sum + i.totalTTC, 0);
      const ordersCount = clientInvoices.length;
      
      let lastDate = c.createdAt;
      if (clientInvoices.length > 0) {
        lastDate = [...clientInvoices].sort((a: Invoice, b: Invoice) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt;
      }

      // Scoring simple
      const daysSinceLast = Math.floor((new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 3600 * 24));
      let score = (totalCA / 100) + (ordersCount * 10);
      if (daysSinceLast < 30) score += 50;

      let category: string = 'Standard';
      if (score > 1000) category = 'VIP';
      else if (score > 400) category = 'Gold';
      else if (daysSinceLast > 180) category = 'À Relancer';

      stats[c.id] = { totalCA, ordersCount, lastDate, daysSinceLast, score, category };
    });
    return stats;
  }, [db]);

  const items = useMemo(() => {
    if (tab === 'Analysis') return [];
    const key = tab === 'Clients' ? 'clients' : 'leads';
    const list = (db[key] as any[]) || [];
    return list.filter((i: any) => 
      i.name?.toLowerCase().includes(search.toLowerCase()) || 
      i.ice?.includes(search) || 
      i.phone?.includes(search)
    );
  }, [db, tab, search]);

  const sortedTopClients = useMemo(() => {
    // Fix: Cast entries to fix unknown property access in map and sort
    const entries = Object.entries(clientStats) as [string, ClientStat][];
    return entries
      .map(([id, data]) => ({ 
        id, 
        ...data, 
        name: ((db.clients as any[]) || []).find((c: any) => c.id === id)?.name 
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [clientStats, db.clients]);

  const openModal = (item: Client | null = null) => {
    setModalTab('Info');
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        type: ClientType.PARTICULIER,
        status: ClientStatus.ACTIVE,
        country: 'Maroc',
        creditLimit: 0,
        paymentDelay: 0,
        defaultTvaRate: 20,
        isVatExempt: false,
        defaultDiscount: 0,
        name: '', email: '', phone: '', address: '', city: '', notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let newDb = { ...db };
    const key = tab === 'Leads' ? 'leads' : 'clients';
    
    if (editingItem) {
      newDb[key] = db[key].map((i: any) => i.id === editingItem.id ? { ...i, ...formData, updatedAt: new Date().toISOString() } : i);
      logClientAction(editingItem.id, 'admin', 'CRM', `Modification des informations de profil`);
    } else {
      const id = `${tab === 'Leads' ? 'L' : 'C'}-${Date.now()}`;
      const newItem = { ...formData, id, createdAt: new Date().toISOString() };
      newDb[key] = [...(db[key] || []), newItem];
      logClientAction(id, 'admin', 'CRM', `Création du compte client`);
    }
    
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Espace CRM</h2>
          <p className="text-slate-500 font-medium tracking-tight">Intelligence Client & Suivi de Fidélité RFM.</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Nouveau {tab === 'Leads' ? 'Prospect' : 'Client'}
        </button>
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 shadow-sm">
        {[
          { id: 'Clients', label: 'Portefeuille Clients', icon: UserCheck },
          { id: 'Leads', label: 'Prospects (Leads)', icon: Zap },
          { id: 'Analysis', label: 'Analyse & Scoring', icon: BarChart3 }
        ].map((tVal) => (
          <button 
            key={tVal.id}
            onClick={() => setTab(tVal.id as any)}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${tab === tVal.id ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <tVal.icon className="w-4 h-4" /> {tVal.label}
          </button>
        ))}
      </div>

      {tab === 'Analysis' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0f172a] text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                 <Award className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5" />
                 <p className="text-[10px] font-black uppercase text-indigo-400 mb-2">Total Clients VIP</p>
                 <h3 className="text-4xl font-black">{Object.values(clientStats).filter((s: ClientStat) => s.category === 'VIP').length}</h3>
                 <p className="text-[9px] font-bold text-slate-500 mt-4 uppercase">Score de fidélité {'>'} 1000</p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                 <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Chiffre d'Affaires CRM</p>
                 {/* Fix: Explicitly type reduce callback to prevent unknown argument errors */}
                 <h3 className="text-4xl font-black text-slate-900">{formatMAD((Object.values(clientStats) as ClientStat[]).reduce((a: number, b: ClientStat) => a + b.totalCA, 0))}</h3>
                 <p className="text-[9px] font-bold text-emerald-600 mt-4 uppercase">Cumul TTC Validé</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2.5rem] shadow-sm">
                 <p className="text-[10px] font-black uppercase text-rose-400 mb-2">Clients à Relancer</p>
                 <h3 className="text-4xl font-black text-rose-700">{Object.values(clientStats).filter((s: ClientStat) => s.category === 'À Relancer').length}</h3>
                 <p className="text-[9px] font-bold text-rose-400 mt-4 uppercase">Inactifs depuis +180 jours</p>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-10">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Top 10 Clients (Scoring RFM)</h3>
              <div className="space-y-4">
                 {sortedTopClients.map((c, idx) => (
                   <div key={c.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-3xl group hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400">#{idx+1}</div>
                         <div>
                            <p className="font-black text-slate-900 text-lg">{c.name || '---'}</p>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{c.category} • Score: {c.score.toFixed(0)}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black text-slate-900">{formatMAD(c.totalCA)}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{c.ordersCount} commandes • Passé le {new Date(c.lastDate).toLocaleDateString()}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Rechercher (Nom, ICE, Tel...)"
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-5">Identité</th>
                  <th className="px-8 py-5">Performance RFM</th>
                  <th className="px-8 py-5">Dernier Passage</th>
                  <th className="px-8 py-5">Statut CRM</th>
                  <th className="px-8 py-5 text-center">Fiche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item: Client) => {
                  // Fix: stats is now properly typed to prevent unknown property access
                  const stats: Partial<ClientStat> = clientStats[item.id] || {};
                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black border ${item.type === ClientType.SOCIETE ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {item.type === ClientType.SOCIETE ? <Building2 className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 tracking-tight leading-none mb-1">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.city} • {item.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800">{formatMAD(stats.totalCA || 0)}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{stats.ordersCount || 0} commandes</p>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-600">
                        {stats.lastDate ? new Date(stats.lastDate).toLocaleDateString() : '---'}
                      </td>
                      <td className="px-8 py-5">
                         <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg border ${
                           stats.category === 'VIP' ? 'bg-indigo-600 text-white border-indigo-600' :
                           stats.category === 'Gold' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                           stats.category === 'À Relancer' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                         }`}>
                           {stats.category || 'Standard'}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button onClick={() => openModal(item)} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><EyeIcon className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL FICHE CLIENT 360° AVEC TIMELINE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="p-10 bg-[#0f172a] text-white flex items-center justify-between shrink-0">
               <div className="flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-3xl font-black shadow-2xl ${formData.type === ClientType.SOCIETE ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                     {formData.type === ClientType.SOCIETE ? <Building2 className="w-10 h-10" /> : <UserIcon className="w-10 h-10" />}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tight">{formData.name || 'Nouveau Profil'}</h3>
                    <div className="flex items-center gap-4 mt-2">
                       <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Dossier Certifié</span>
                       {editingItem && (
                         <span className="text-[10px] font-black px-2 py-0.5 bg-white/10 rounded-lg text-indigo-400 uppercase tracking-widest">Score Fidélité: {(clientStats[editingItem.id]?.score || 0).toFixed(0)}</span>
                       )}
                    </div>
                  </div>
               </div>
               <button onClick={() => setShowModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex items-center gap-6 px-12 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
               {[
                 { id: 'Info', label: 'Informations', icon: UserIcon },
                 { id: 'History', label: 'Timeline & Historique', icon: History },
                 { id: 'Performance', label: 'Analyse Rentabilité', icon: TrendingUp }
               ].map(t => (
                 <button key={t.id} onClick={() => setModalTab(t.id as any)} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${modalTab === t.id ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' : 'text-slate-400'}`}>
                   <t.icon className="w-4 h-4" /> {t.label}
                 </button>
               ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
              {modalTab === 'Info' && (
                 <form onSubmit={handleSave} className="space-y-10 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-12">
                       <div className="space-y-8">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nature</label>
                                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                                   <option value={ClientType.PARTICULIER}>Particulier</option>
                                   <option value={ClientType.SOCIETE}>Société</option>
                                </select>
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                                   <option value={ClientStatus.ACTIVE}>Actif</option>
                                   <option value={ClientStatus.BLOCKED}>Bloqué</option>
                                </select>
                             </div>
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identité Complète</label>
                             <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ICE</label>
                                <input value={formData.ice || ''} onChange={e => setFormData({...formData, ice: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identifiant Fiscal</label>
                                <input value={formData.if || ''} onChange={e => setFormData({...formData, if: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                             </div>
                          </div>
                       </div>
                       <div className="space-y-8">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</label>
                                <input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                                <input value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                             </div>
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresse</label>
                             <textarea value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm outline-none min-h-[100px]" />
                          </div>
                          <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Sauvegarder les modifications</button>
                       </div>
                    </div>
                 </form>
              )}

              {modalTab === 'History' && editingItem && (
                 <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock className="w-5 h-5" /> Journal d'Activité Client</h4>
                    <div className="relative border-l-4 border-slate-100 ml-6 space-y-12 pb-12">
                       {(db.clientActions || []).filter((a: ClientAction) => a.clientId === editingItem.id).map((a: ClientAction) => (
                         <div key={a.id} className="relative pl-12">
                            <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-white border-4 border-indigo-500 shadow-sm"></div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 group hover:border-indigo-200 transition-all">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase text-white ${
                                       a.type === 'Sale' ? 'bg-indigo-600' : a.type === 'Payment' ? 'bg-emerald-600' : 'bg-slate-400'
                                     }`}>{a.type}</span>
                                     <p className="text-sm font-black text-slate-900">{a.description}</p>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
                               </div>
                               {a.amount && <p className="text-lg font-black text-indigo-600">{formatMAD(a.amount)}</p>}
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Agent : {a.userId}</p>
                            </div>
                         </div>
                       ))}
                       {(db.clientActions || []).filter((a: ClientAction) => a.clientId === editingItem.id).length === 0 && (
                         <div className="py-20 text-center text-slate-300 italic uppercase font-black text-xs">Aucune interaction enregistrée pour le moment.</div>
                       )}
                    </div>
                 </div>
              )}

              {modalTab === 'Performance' && editingItem && (
                 <div className="grid grid-cols-2 gap-12 animate-in fade-in duration-500">
                    <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                       <Award className="absolute -right-6 -top-6 w-40 h-40 text-white/5 rotate-12" />
                       <h4 className="text-xs font-black uppercase text-indigo-400 mb-8 tracking-widest">Bilan Rentabilité</h4>
                       <div className="space-y-8">
                          <div>
                             <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Score RFM Final</p>
                             {/* Fix: Provide default for formatMAD input to prevent type errors */}
                             <h2 className="text-6xl font-black text-white">{(clientStats[editingItem.id]?.score || 0).toFixed(0)}</h2>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[9px] font-black text-slate-500 uppercase mb-2">CA Cumulé</p>
                                <p className="text-xl font-black">{formatMAD(clientStats[editingItem.id]?.totalCA || 0)}</p>
                             </div>
                             <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Volume Achats</p>
                                <p className="text-xl font-black">{clientStats[editingItem.id]?.ordersCount || 0} <span className="text-[10px] text-slate-500">tickets</span></p>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-8">
                       <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem]">
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Award className="w-4 h-4" /> Analyse du Profil</p>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                             Ce client appartient au segment <span className="font-black text-indigo-600">"{clientStats[editingItem.id]?.category || 'Standard'}"</span>. 
                             Son panier moyen est de <span className="font-black">{formatMAD((clientStats[editingItem.id]?.totalCA || 0) / (clientStats[editingItem.id]?.ordersCount || 1))}</span>.
                          </p>
                       </div>
                       <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2.5rem]">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap className="w-4 h-4" /> Action Recommandée</p>
                          <p className="text-sm font-bold text-slate-700">
                             {clientStats[editingItem.id]?.category === 'VIP' && "Appliquer une remise automatique de 10% sur les prochaines factures."}
                             {clientStats[editingItem.id]?.category === 'À Relancer' && "Planifier un appel de courtoisie pour proposer un coupon de réactivation."}
                             {clientStats[editingItem.id]?.category === 'Gold' && "Proposer un programme de parrainage pour augmenter le volume."}
                             {(clientStats[editingItem.id]?.category === 'Standard' || !clientStats[editingItem.id]) && "Suivi régulier du prospect pour conversion en Gold."}
                          </p>
                       </div>
                    </div>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EyeIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
