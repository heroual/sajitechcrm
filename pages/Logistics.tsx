
import React, { useState, useMemo, useEffect } from 'react';
import { getDB, saveDB, logAudit } from '../db';
import { 
  Vehicle, Driver, Mission, FuelLog, Maintenance, VehicleType, 
  VehicleStatus, MissionStatus, Client, UserRole, User 
} from '../types';
import { 
  CarFront, Users, Map as MapIcon, Fuel, Wrench, BarChart3, Plus, 
  Search, Eye, Pencil, Trash2, X, AlertCircle, CheckCircle2, 
  TrendingUp, Calendar, Clock, MapPin, Smartphone, CreditCard, 
  ShieldCheck, Info, ChevronRight, LayoutGrid, List, Navigation,
  History, AlertTriangle, ArrowRightCircle, Gauge, Award, CalendarDays,
  Briefcase, Contact, UserSquare2
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useLanguage, formatMAD } from '../App';

export default function Logistics() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [db, setDb] = useState(getDB());
  const [activeTab, setActiveTab] = useState<'Fleet' | 'Drivers' | 'Missions' | 'Fuel' | 'Maintenance'>('Fleet');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDriverProfile, setShowDriverProfile] = useState<Driver | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const auth = localStorage.getItem('SAJITECH_AUTH');
    if (auth) setCurrentUser(JSON.parse(auth));
  }, []);

  const drivers = useMemo(() => {
    return (db.drivers || []).filter((d: Driver) => d.name.toLowerCase().includes(search.toLowerCase()));
  }, [db.drivers, search]);

  const vehicles = useMemo(() => {
    return (db.vehicles || []).filter((v: Vehicle) => v.plate.toLowerCase().includes(search.toLowerCase()));
  }, [db.vehicles, search]);

  const missions = useMemo(() => db.missions || [], [db.missions]);
  const fuelLogs = useMemo(() => db.fuelLogs || [], [db.fuelLogs]);
  const maintenances = useMemo(() => db.maintenances || [], [db.maintenances]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newDb = { ...db };
    const keyMap: Record<string, string> = {
      'Fleet': 'vehicles',
      'Drivers': 'drivers',
      'Missions': 'missions',
      'Fuel': 'fuelLogs',
      'Maintenance': 'maintenances'
    };
    const key = keyMap[activeTab];
    
    if (editingItem) {
      newDb[key] = (db[key] || []).map((i: any) => i.id === editingItem.id ? { ...i, ...formData } : i);
    } else {
      const newItem = { 
        ...formData, 
        id: `LOG-${Date.now()}`, 
        createdAt: new Date().toISOString() 
      };
      // For missions, ensure a number exists
      if (activeTab === 'Missions' && !newItem.number) newItem.number = `MS-${Date.now().toString().slice(-6)}`;
      
      newDb[key] = [...(db[key] || []), newItem];
    }
    
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
    logAudit(currentUser?.id || 'admin', 'Logistics', editingItem ? 'Update' : 'Create', `${activeTab}: ${formData.plate || formData.name || formData.number || 'Log entry'}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 70) return 'text-indigo-600 bg-indigo-50 border-indigo-100';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Logistique & Parc</h2>
          <p className="text-slate-500 font-medium tracking-tight">Intelligence de flotte et scoring chauffeurs prédictif.</p>
        </div>
        <button onClick={() => { 
          setEditingItem(null); 
          // Set sensible defaults for the new item
          const defaults: any = {};
          if (activeTab === 'Missions') defaults.status = MissionStatus.PLANNED;
          if (activeTab === 'Fuel') defaults.date = new Date().toISOString().split('T')[0];
          if (activeTab === 'Maintenance') defaults.date = new Date().toISOString().split('T')[0];
          
          setFormData(defaults); 
          setShowModal(true); 
        }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
          <Plus className="w-5 h-5" /> Ajouter {activeTab === 'Fleet' ? 'un Véhicule' : activeTab === 'Fuel' ? 'un Plein' : activeTab === 'Maintenance' ? 'un Entretien' : `un(e) ${activeTab}`}
        </button>
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 shadow-sm overflow-x-auto">
        {[
          { id: 'Fleet', label: 'Véhicules', icon: CarFront },
          { id: 'Drivers', label: 'Chauffeurs', icon: Users },
          { id: 'Missions', label: 'Missions', icon: Navigation },
          { id: 'Fuel', label: 'Gasoil', icon: Fuel },
          { id: 'Maintenance', label: 'Entretiens', icon: Wrench }
        ].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'Drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {drivers.map((d: Driver) => (
             <div key={d.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      {d.name.charAt(0)}
                   </div>
                   <div className={`px-4 py-2 rounded-2xl border flex flex-col items-center ${getScoreColor(d.smartScore || 0)}`}>
                      <span className="text-[14px] font-black">{d.smartScore || '--'}</span>
                      <span className="text-[7px] font-black uppercase">Smart Score</span>
                   </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">{d.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">CIN: {d.cin} • {d.phone}</p>
                
                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
                   <button onClick={() => setShowDriverProfile(d)} className="py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Détails Score</button>
                   <button onClick={() => { setEditingItem(d); setFormData(d); setShowModal(true); }} className="py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:border-indigo-300">Modifier</button>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'Fleet' && (
         <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] text-slate-500 uppercase tracking-widest">
                  <tr>
                     <th className="px-8 py-5">Identité</th>
                     <th className="px-8 py-5">Kilométrage</th>
                     <th className="px-8 py-5">Consommation Moy.</th>
                     <th className="px-8 py-5">État de Santé</th>
                     <th className="px-8 py-5 text-center">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {vehicles.map((v: Vehicle) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-8 py-5">
                          <p className="font-black text-slate-900 uppercase text-sm">{v.plate}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.brand} {v.model}</p>
                       </td>
                       <td className="px-8 py-5 font-black text-indigo-600">{v.currentKm.toLocaleString()} KM</td>
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-black text-slate-700">9.4 L</span>
                             <TrendingUp className="w-3 h-3 text-emerald-500" />
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${v.status === VehicleStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{v.status}</span>
                       </td>
                       <td className="px-8 py-5 text-center">
                          <button onClick={() => { setEditingItem(v); setFormData(v); setShowModal(true); }} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Pencil className="w-4 h-4" /></button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      )}

      {activeTab === 'Missions' && (
         <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] text-slate-500 uppercase tracking-widest">
                  <tr>
                     <th className="px-8 py-5">N° Mission</th>
                     <th className="px-8 py-5">Date</th>
                     <th className="px-8 py-5">Véhicule & Chauffeur</th>
                     <th className="px-8 py-5">Destination</th>
                     <th className="px-8 py-5">Statut</th>
                     <th className="px-8 py-5 text-center">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {missions.map((m: Mission) => {
                    const vehicle = db.vehicles.find((v:Vehicle) => v.id === m.vehicleId);
                    const driver = db.drivers.find((d:Driver) => d.id === m.driverId);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-8 py-5 font-black text-slate-900">{m.number}</td>
                         <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(m.startDate).toLocaleDateString()}</td>
                         <td className="px-8 py-5">
                            <p className="text-xs font-black text-indigo-600">{vehicle?.plate || '---'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{driver?.name || '---'}</p>
                         </td>
                         <td className="px-8 py-5 font-bold text-slate-700 text-sm">{m.destination}</td>
                         <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${m.status === MissionStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>{m.status}</span>
                         </td>
                         <td className="px-8 py-5 text-center">
                            <button onClick={() => { setEditingItem(m); setFormData(m); setShowModal(true); }} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Pencil className="w-4 h-4" /></button>
                         </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      )}

      {activeTab === 'Fuel' && (
         <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] text-slate-500 uppercase tracking-widest">
                  <tr>
                     <th className="px-8 py-5">Date</th>
                     <th className="px-8 py-5">Véhicule</th>
                     <th className="px-8 py-5">Litres</th>
                     <th className="px-8 py-5">Montant</th>
                     <th className="px-8 py-5">Compteur</th>
                     <th className="px-8 py-5 text-center">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {fuelLogs.map((f: FuelLog) => {
                    const vehicle = db.vehicles.find((v:Vehicle) => v.id === f.vehicleId);
                    return (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(f.date).toLocaleDateString()}</td>
                         <td className="px-8 py-5 font-black text-slate-900 uppercase">{vehicle?.plate || '---'}</td>
                         <td className="px-8 py-5 font-black text-indigo-600">{f.liters} L</td>
                         <td className="px-8 py-5 font-black text-slate-900">{formatMAD(f.totalAmount)}</td>
                         <td className="px-8 py-5 text-xs font-bold text-slate-400">{f.odometer.toLocaleString()} KM</td>
                         <td className="px-8 py-5 text-center">
                            <button onClick={() => { setEditingItem(f); setFormData(f); setShowModal(true); }} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Pencil className="w-4 h-4" /></button>
                         </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      )}

      {activeTab === 'Maintenance' && (
         <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] text-slate-500 uppercase tracking-widest">
                  <tr>
                     <th className="px-8 py-5">Véhicule</th>
                     <th className="px-8 py-5">Type d'entretien</th>
                     <th className="px-8 py-5">Date</th>
                     <th className="px-8 py-5">Coût</th>
                     <th className="px-8 py-5">Prochain (KM)</th>
                     <th className="px-8 py-5 text-center">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {maintenances.map((m: Maintenance) => {
                    const vehicle = db.vehicles.find((v:Vehicle) => v.id === m.vehicleId);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-8 py-5 font-black text-slate-900 uppercase">{vehicle?.plate || '---'}</td>
                         <td className="px-8 py-5 text-sm font-bold text-slate-700">{m.type}</td>
                         <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(m.date).toLocaleDateString()}</td>
                         <td className="px-8 py-5 font-black text-rose-600">{formatMAD(m.cost)}</td>
                         <td className="px-8 py-5 text-xs font-black text-indigo-500">{m.nextEcheanceKm?.toLocaleString() || '---'} KM</td>
                         <td className="px-8 py-5 text-center">
                            <button onClick={() => { setEditingItem(m); setFormData(m); setShowModal(true); }} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Pencil className="w-4 h-4" /></button>
                         </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      )}

      {showDriverProfile && (
         <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
               <div className="p-10 bg-[#0f172a] text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-8">
                     <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-4xl font-black shadow-2xl">{showDriverProfile.name.charAt(0)}</div>
                     <div>
                        <h3 className="text-3xl font-black tracking-tight">{showDriverProfile.name}</h3>
                        <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mt-1">Smart Performance Radar</p>
                     </div>
                  </div>
                  <button onClick={() => setShowDriverProfile(null)}><X className="w-8 h-8" /></button>
               </div>
               <div className="flex-1 p-12 overflow-y-auto scrollbar-hide grid grid-cols-2 gap-12">
                  <div className="space-y-8">
                     <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Résumé de Performance</h4>
                        <div className="space-y-4">
                           <ScoreLine label="Respect trajets" value={85} />
                           <ScoreLine label="Consommation Carburant" value={72} />
                           <ScoreLine label="KM Cohérent" value={95} />
                           <ScoreLine label="Satisfaction Client" value={80} />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-emerald-50 text-emerald-700 rounded-3xl">
                           <Award className="w-8 h-8 mb-4 opacity-50" />
                           <p className="text-[10px] font-black uppercase">Points Forts</p>
                           <p className="text-sm font-bold">Assiduité exemplaire sur les missions de nuit.</p>
                        </div>
                        <div className="p-6 bg-rose-50 text-rose-700 rounded-3xl">
                           <AlertTriangle className="w-8 h-8 mb-4 opacity-50" />
                           <p className="text-[10px] font-black uppercase">Axe de progrès</p>
                           <p className="text-sm font-bold">Réduire la consommation en zone urbaine.</p>
                        </div>
                     </div>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center p-8">
                     <ResponsiveContainer width="100%" height={300}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                           { subject: 'Trajet', A: 85, fullMark: 100 },
                           { subject: 'Fuel', A: 72, fullMark: 100 },
                           { subject: 'KM', A: 95, fullMark: 100 },
                           { subject: 'Soin', A: 60, fullMark: 100 },
                           { subject: 'Fidelité', A: 80, fullMark: 100 },
                        ]}>
                           <PolarGrid stroke="#f1f5f9" />
                           <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 900, fill:'#94a3b8'}} />
                           <Radar name="Chauffeur" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                        </RadarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         </div>
      )}

      {showModal && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden p-10 animate-in zoom-in-95">
               <div className="flex justify-between items-start mb-8">
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {editingItem ? 'Modifier' : 'Ajouter'} {activeTab === 'Fleet' ? 'un Véhicule' : activeTab === 'Fuel' ? 'un Plein' : activeTab === 'Maintenance' ? 'un Entretien' : `un(e) ${activeTab}`}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
               </div>
               <form onSubmit={handleSave} className="space-y-6">
                  {activeTab === 'Fleet' && (
                     <>
                        <Field label="Plaque" value={formData.plate} onChange={v => setFormData({...formData, plate: v})} />
                        <Field label="Marque" value={formData.brand} onChange={v => setFormData({...formData, brand: v})} />
                        <Field label="Modèle" value={formData.model} onChange={v => setFormData({...formData, model: v})} />
                        <Field label="Kilométrage" type="number" value={formData.currentKm} onChange={v => setFormData({...formData, currentKm: Number(v)})} />
                     </>
                  )}
                  {activeTab === 'Drivers' && (
                     <>
                        <Field label="Nom Complet" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                        <Field label="CIN" value={formData.cin} onChange={v => setFormData({...formData, cin: v})} />
                        <Field label="Téléphone" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                        <Field label="Exp. Permis" type="date" value={formData.licenseExpiry} onChange={v => setFormData({...formData, licenseExpiry: v})} />
                     </>
                  )}
                  {activeTab === 'Missions' && (
                     <>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Véhicule</label>
                           <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}>
                              <option value="">Sélectionner...</option>
                              {db.vehicles.map((v:Vehicle) => <option key={v.id} value={v.id}>{v.plate} ({v.brand})</option>)}
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chauffeur</label>
                           <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})}>
                              <option value="">Sélectionner...</option>
                              {db.drivers.map((d:Driver) => <option key={d.id} value={d.id}>{d.name}</option>)}
                           </select>
                        </div>
                        <Field label="Destination" value={formData.destination} onChange={v => setFormData({...formData, destination: v})} />
                        <Field label="Date & Heure Départ" type="datetime-local" value={formData.startDate} onChange={v => setFormData({...formData, startDate: v})} />
                        <Field label="Kilométrage Départ" type="number" value={formData.startKm} onChange={v => setFormData({...formData, startKm: Number(v)})} />
                     </>
                  )}
                  {activeTab === 'Fuel' && (
                     <>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Véhicule</label>
                           <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}>
                              <option value="">Sélectionner...</option>
                              {db.vehicles.map((v:Vehicle) => <option key={v.id} value={v.id}>{v.plate} ({v.brand})</option>)}
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chauffeur</label>
                           <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})}>
                              <option value="">Sélectionner...</option>
                              {db.drivers.map((d:Driver) => <option key={d.id} value={d.id}>{d.name}</option>)}
                           </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <Field label="Litres" type="number" value={formData.liters} onChange={v => setFormData({...formData, liters: Number(v)})} />
                           <Field label="Montant TTC" type="number" value={formData.totalAmount} onChange={v => setFormData({...formData, totalAmount: Number(v)})} />
                        </div>
                        <Field label="Compteur (KM)" type="number" value={formData.odometer} onChange={v => setFormData({...formData, odometer: Number(v)})} />
                     </>
                  )}
                  {activeTab === 'Maintenance' && (
                     <>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Véhicule</label>
                           <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}>
                              <option value="">Sélectionner...</option>
                              {db.vehicles.map((v:Vehicle) => <option key={v.id} value={v.id}>{v.plate}</option>)}
                           </select>
                        </div>
                        <Field label="Type d'entretien" value={formData.type} onChange={v => setFormData({...formData, type: v})} />
                        <div className="grid grid-cols-2 gap-4">
                           <Field label="Date" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v})} />
                           <Field label="Coût" type="number" value={formData.cost} onChange={v => setFormData({...formData, cost: Number(v)})} />
                        </div>
                        <Field label="Prochaine échéance (KM)" type="number" value={formData.nextEcheanceKm} onChange={v => setFormData({...formData, nextEcheanceKm: Number(v)})} />
                     </>
                  )}
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Valider l'enregistrement</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}

const ScoreLine = ({ label, value }: { label: string, value: number }) => (
  <div className="space-y-2">
     <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
        <span>{label}</span>
        <span className="text-indigo-600">{value}%</span>
     </div>
     <div className="w-full h-2 bg-white rounded-full border border-slate-200 overflow-hidden">
        <div className="h-full bg-indigo-600" style={{width: `${value}%`}}></div>
     </div>
  </div>
);

const Field = ({ label, value, onChange, type = "text" }: { label: string, value: any, onChange: (v: string) => void, type?: string }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
  </div>
);
