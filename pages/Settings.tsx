
import React, { useState, useRef, useEffect } from 'react';
import { getDB, saveDB, supabase, logAudit, syncToCloud, pullFromCloud } from '../db';
import { Settings as SettingsIcon, Database, Save, Download, Upload, ShieldCheck, Landmark, Plus, Pencil, Trash2, X, Users, UserPlus, Lock, ShieldAlert, KeyRound, Image as LucideImage, CheckCircle2, Shield, CloudLightning, Loader2, Eye, EyeOff } from 'lucide-react';
import { UserRole, User as SajitechUser } from '../types';
import { useLanguage } from '../App';

const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
};

export default function Settings() {
  const { refreshPermissions } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [company, setCompany] = useState(db.settings);
  const [rolePermissions, setRolePermissions] = useState(db.rolePermissions || {});
  const [activeTab, setActiveTab] = useState<'Profile' | 'Users' | 'Security' | 'Roles'>('Profile');
  const [syncing, setSyncing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SajitechUser | null>(null);
  const [userFormData, setUserFormData] = useState({ 
    username: '', firstName: '', lastName: '', password: '', role: UserRole.VENDEUR, isActive: true 
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  const handleSaveSettings = async () => {
    const newDb = { ...db, settings: company };
    saveDB(newDb);
    setDb(newDb);
    if (currentUser) {
        setSyncing(true);
        try { await syncToCloud(currentUser.id); alert("Configuration synchronisée sur le Cloud !"); }
        catch (e:any) { alert("Erreur Sync : " + e.message); }
        finally { setSyncing(false); }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    let newDb = { ...db };
    
    try {
      if (editingUser) {
        // Note: Supabase Admin API est requise pour modifier les rôles d'AUTRES utilisateurs. 
        // Ici on modifie le profil local et on compte sur le prochain sync.
        newDb.users = db.users.map((u: SajitechUser) => u.id === editingUser.id ? { ...u, ...userFormData } : u);
      } else {
        // --- CRÉATION AVEC MÉTA-DATA CLOUD ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userFormData.username,
          password: userFormData.password,
          options: {
            data: {
              first_name: userFormData.firstName,
              last_name: userFormData.lastName,
              role: userFormData.role // TRÈS IMPORTANT : Stockage direct du rôle dans le Cloud
            }
          }
        });

        if (authError) throw new Error(authError.message);

        const newUser: SajitechUser = {
          id: authData.user?.id || `USR-${Date.now()}`,
          username: userFormData.username.toLowerCase(),
          firstName: userFormData.firstName,
          lastName: userFormData.lastName,
          role: userFormData.role,
          isActive: true,
          createdAt: new Date().toISOString()
        };
        newDb.users = [...(db.users || []), newUser];
      }
      
      saveDB(newDb);
      setDb(newDb);
      if (currentUser) await syncToCloud(currentUser.id);
      setShowUserModal(false);
      alert("Utilisateur enregistré et synchronisé !");
    } catch (err: any) {
      alert("Erreur Cloud : " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Configuration & Cloud</h2>
          <p className="text-slate-500 font-medium tracking-tight">Gérez vos accès et assurez la pérennité de vos données sur Supabase.</p>
        </div>
        {currentUser && (
          <div className="flex items-center gap-3 bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-xl">
             <CloudLightning className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
             <div>
                <p className="text-[8px] font-black uppercase text-indigo-200 leading-none">Cloud Synchronisé</p>
                <p className="text-xs font-bold">{currentUser.email}</p>
             </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 shadow-sm overflow-x-auto">
        {[
          { id: 'Profile', label: 'Société', icon: Landmark },
          { id: 'Users', label: 'Utilisateurs', icon: Users },
          { id: 'Roles', label: 'Sécurité (RBAC)', icon: Shield },
          { id: 'Security', label: 'Cloud Status', icon: Database }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {activeTab === 'Profile' && (
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raison Sociale</label><input value={company.companyName} onChange={e => setCompany({...company, companyName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siège Social</label><input value={company.address} onChange={e => setCompany({...company, address: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" /></div>
                </div>
                <button disabled={syncing} onClick={handleSaveSettings} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl disabled:opacity-50">
                   {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer sur le Cloud
                </button>
            </div>
          )}

          {activeTab === 'Users' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Users className="w-6 h-6 text-indigo-600" /> Comptes Cloud</h3>
                  <button onClick={() => { setEditingUser(null); setUserFormData({ username: '', firstName: '', lastName: '', password: '', role: UserRole.VENDEUR, isActive: true }); setShowUserModal(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><UserPlus className="w-4 h-4" /> Nouvel Admin / Vendeur</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <tbody className="divide-y divide-slate-50">
                     {db.users.map((u: SajitechUser) => (
                       <tr key={u.id} className="hover:bg-slate-50">
                         <td className="px-8 py-5">
                            <p className="font-black text-slate-800 tracking-tight">{u.firstName} {u.lastName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.username}</p>
                         </td>
                         <td className="px-8 py-5">
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${u.role === UserRole.ADMIN ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                               {u.role}
                            </span>
                         </td>
                         <td className="px-8 py-5 text-right">
                            <button onClick={() => { setEditingUser(u); setUserFormData({ ...u, password: '' }); setShowUserModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'Security' && (
             <div className="bg-[#0f172a] text-white p-10 rounded-[3rem] shadow-2xl space-y-10">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><Database className="w-6 h-6 text-indigo-400" /> Infrastructure Supabase</h3>
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl">
                   <h4 className="font-black uppercase tracking-widest text-xs text-indigo-400 mb-4">Statut de la Table backups</h4>
                   <p className="text-xs text-slate-400 leading-relaxed">
                      Si vous recevez l'erreur <strong>"Could not find the table public.backups"</strong>, vous devez exécuter la commande SQL suivante dans votre Dashboard Supabase :
                   </p>
                   <pre className="mt-4 p-4 bg-black/50 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`CREATE TABLE public.backups (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  data_blob JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own backup" ON public.backups
  FOR ALL USING (auth.uid() = user_id);`}
                   </pre>
                </div>
             </div>
          )}
        </div>

        <div className="space-y-6">
           <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mb-4" />
              <h4 className="text-sm font-black uppercase text-emerald-900 mb-2">Multi-Synchronisation</h4>
              <p className="text-xs text-emerald-700/70 font-medium leading-relaxed italic">
                 Le rôle Cloud (Admin/Vendeur) est injecté à chaque connexion. Pour changer le statut d'un compte existant, modifiez ses métadonnées dans <strong>Supabase &gt; Authentication &gt; Users</strong>.
              </p>
           </div>
        </div>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight">{editingUser ? 'Editer Cloud Info' : 'Nouveau Profil Cloud'}</h3>
                <button onClick={() => setShowUserModal(false)}><X className="w-6 h-6" /></button>
             </div>
             <form onSubmit={handleSaveUser} className="p-8 space-y-5">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prénom</label><input required value={userFormData.firstName} onChange={e => setUserFormData({...userFormData, firstName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</label><input required value={userFormData.lastName} onChange={e => setUserFormData({...userFormData, lastName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" /></div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Login Cloud)</label>
                  <input required type="email" placeholder="votre@email.com" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rôle Supabase</label>
                  <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                     {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
               </div>
               {!editingUser && (
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Définir Mot de Passe</label>
                    <input required type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                 </div>
               )}
               <button disabled={syncing} type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl flex items-center justify-center gap-2">
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingUser ? 'Mettre à jour Local' : 'Créer & Enrôler Cloud'}
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
