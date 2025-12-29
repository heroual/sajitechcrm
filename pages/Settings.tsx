
import React, { useState, useRef, useEffect } from 'react';
import { getDB, saveDB, hashPassword, logAudit, syncToCloud, pullFromCloud, supabase } from '../db';
import { Settings as SettingsIcon, Database, Save, Download, Upload, ShieldCheck, Landmark, Plus, Pencil, Trash2, X, MapPin, Users, UserPlus, Lock, ShieldAlert, KeyRound, UserCheck, Smartphone, Mail, MessageSquare, Image as LucideImage, CheckCircle2, Shield, PlusCircle, CloudLightning, Loader2 } from 'lucide-react';
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
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
};

const MODULES = [
  'dashboard', 'calendar', 'reports', 'crm', 'pipeline', 'activities', 
  'pos', 'invoices', 'suppliers', 'purchases', 'expenses', 'stock', 
  'logistics', 'hr', 'services', 'support', 'settings'
];

const ACTIONS = ['view', 'create', 'edit', 'delete', 'validate', 'export', 'configure', 'use', '*'];

export default function Settings() {
  const { refreshPermissions } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [company, setCompany] = useState(db.settings);
  const [rolePermissions, setRolePermissions] = useState(db.rolePermissions || {});
  const [activeTab, setActiveTab] = useState<'Profile' | 'Users' | 'Security' | 'Roles'>('Profile');
  const [syncing, setSyncing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const logoRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<HTMLInputElement>(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SajitechUser | null>(null);
  const [userFormData, setUserFormData] = useState({ 
    username: '', 
    firstName: '',
    lastName: '',
    password: '', 
    role: UserRole.VENDEUR,
    isActive: true 
  });

  const [newPerm, setNewPerm] = useState({ role: '', module: 'crm', action: 'view' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  const handleSaveSettings = () => {
    const newDb = { ...db, settings: company };
    saveDB(newDb);
    setDb(newDb);
    alert("Paramètres enregistrés avec succès !");
    logAudit('admin', 'Settings', 'Update', 'Profil entreprise mis à jour');
  };

  const handleSyncCloud = async () => {
    if (!currentUser) return alert("Vous devez être connecté via Supabase pour synchroniser.");
    setSyncing(true);
    try {
      await syncToCloud(currentUser.id);
      alert("✅ Sauvegarde cloud réussie !");
    } catch (err: any) {
      alert("❌ Erreur de sync : " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handlePullCloud = async () => {
    if (!currentUser) return alert("Vous devez être connecté via Supabase.");
    if (!window.confirm("Cela écrasera vos données locales par la version cloud. Continuer ?")) return;
    setSyncing(true);
    try {
      const success = await pullFromCloud(currentUser.id);
      if (success) {
        alert("✅ Données cloud récupérées ! L'application va redémarrer.");
        window.location.reload();
      } else {
        alert("ℹ️ Aucun backup trouvé sur le cloud.");
      }
    } catch (err: any) {
      alert("❌ Erreur : " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'signature') => {
    if (e.target.files?.[0]) {
      const maxWidth = target === 'logo' ? 512 : 300;
      const maxHeight = target === 'logo' ? 512 : 150;
      const compressed = await compressImage(e.target.files[0], maxWidth, maxHeight);
      setCompany({ ...company, [target]: compressed });
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    let newDb = { ...db };
    
    if (editingUser) {
      newDb.users = db.users.map((u: SajitechUser) => {
        if (u.id === editingUser.id) {
          const updated = { ...u, ...userFormData };
          delete (updated as any).password;
          return updated;
        }
        return u;
      });
      logAudit('admin', 'Security', 'Update User', `Utilisateur ${userFormData.username} mis à jour`);
    } else {
      if (!userFormData.password) return alert("Mot de passe requis");
      const pHash = await hashPassword(userFormData.password);
      const newUser: SajitechUser = {
        id: `USR-${Date.now()}`,
        username: userFormData.username,
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        role: userFormData.role,
        passwordHash: pHash,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      newDb.users = [...(db.users || []), newUser];
      logAudit('admin', 'Security', 'Create User', `Nouvel utilisateur: ${newUser.username}`);
    }
    saveDB(newDb);
    setDb(newDb);
    setShowUserModal(false);
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(db, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `SAJITECH_BACKUP_${new Date().toISOString()}.json`);
    linkElement.click();
  };

  const handleAddPermission = (role: string) => {
    const permString = newPerm.action === '*' ? `${newPerm.module}.*` : `${newPerm.module}.${newPerm.action}`;
    if (rolePermissions[role].includes(permString) || rolePermissions[role].includes('*')) return;
    
    const updated = {
      ...rolePermissions,
      [role]: [...rolePermissions[role], permString]
    };
    setRolePermissions(updated);
    const newDb = { ...db, rolePermissions: updated };
    saveDB(newDb);
    setDb(newDb);
    refreshPermissions();
  };

  const handleRemovePermission = (role: string, perm: string) => {
    if (role === UserRole.ADMIN && perm === '*') return;
    const updated = {
      ...rolePermissions,
      [role]: rolePermissions[role].filter((p: string) => p !== perm)
    };
    setRolePermissions(updated);
    const newDb = { ...db, rolePermissions: updated };
    saveDB(newDb);
    setDb(newDb);
    refreshPermissions();
  };

  return (
    <div className="max-w-7xl space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Configuration & Identité</h2>
          <p className="text-slate-500 font-medium">Gérez votre identité visuelle, vos accès et vos documents.</p>
        </div>
        {currentUser && (
          <div className="flex items-center gap-3 bg-white border border-indigo-100 px-5 py-3 rounded-2xl shadow-sm">
             <CloudLightning className="w-5 h-5 text-indigo-500" />
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Connecté Cloud</p>
                <p className="text-xs font-bold text-slate-700">{currentUser.email}</p>
             </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 shadow-sm overflow-x-auto">
        {[
          { id: 'Profile', label: 'Société & Documents', icon: Landmark },
          { id: 'Users', label: 'Utilisateurs', icon: Users },
          { id: 'Roles', label: 'Rôles & Permissions', icon: Shield },
          { id: 'Security', label: 'Backup & Cloud', icon: Database }
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
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-10 flex items-center gap-3">
                  <Landmark className="w-6 h-6 text-indigo-600" /> Profil de l'Entreprise
                </h3>
                <div className="grid grid-cols-2 gap-12 mb-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo</label>
                    <div onClick={() => logoRef.current?.click()} className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all overflow-hidden">
                      {company.logo ? <img src={company.logo} className="h-full w-full object-contain p-4" /> : <div className="text-center"><LucideImage className="w-8 h-8 text-slate-300 mx-auto mb-2" /><span className="text-[9px] font-black uppercase text-slate-400">Uploader Logo</span></div>}
                      <input type="file" ref={logoRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</label>
                    <div onClick={() => signRef.current?.click()} className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all overflow-hidden">
                      {company.signature ? <img src={company.signature} className="h-full w-full object-contain p-4" /> : <div className="text-center"><Pencil className="w-8 h-8 text-slate-300 mx-auto mb-2" /><span className="text-[9px] font-black uppercase text-slate-400">Uploader Signature</span></div>}
                      <input type="file" ref={signRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'signature')} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raison Sociale</label><input value={company.companyName} onChange={e => setCompany({...company, companyName: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siège Social</label><input value={company.address} onChange={e => setCompany({...company, address: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ICE</label><input value={company.ice} onChange={e => setCompany({...company, ice: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" maxLength={15} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</label><input value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" /></div>
                </div>
                <div className="mt-10 pt-10 border-t border-slate-100">
                  <button onClick={handleSaveSettings} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20">
                    <Save className="w-4 h-4" /> Enregistrer la Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Users' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Users className="w-6 h-6 text-indigo-600" /> Comptes Utilisateurs</h3>
                  <button onClick={() => { setEditingUser(null); setUserFormData({ username: '', firstName: '', lastName: '', password: '', role: UserRole.VENDEUR, isActive: true }); setShowUserModal(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><UserPlus className="w-4 h-4" /> Créer</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <tbody className="divide-y divide-slate-50">
                     {db.users.map((u: SajitechUser) => (
                       <tr key={u.id} className="hover:bg-slate-50">
                         <td className="px-8 py-5"><p className="font-black text-slate-800 tracking-tight">{u.firstName} {u.lastName}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">@{u.username}</p></td>
                         <td className="px-8 py-5"><span className="text-[10px] font-black uppercase px-3 py-1 bg-slate-100 text-slate-500 rounded-lg">{u.role}</span></td>
                         <td className="px-8 py-5 text-right"><button onClick={() => { setEditingUser(u); setUserFormData({ ...u, password: '' }); setShowUserModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'Roles' && (
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Shield className="w-6 h-6 text-indigo-600" /> Matrice RBAC</h3>
               {Object.entries(rolePermissions).map(([role, perms]: [string, any]) => (
                  <div key={role} className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                     <h4 className="font-black text-indigo-600 uppercase tracking-widest text-xs mb-4">{role}</h4>
                     <div className="flex flex-wrap gap-2">
                        {perms.map((p: string) => (
                           <div key={p} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-tight group">
                              {p}
                              <button onClick={() => handleRemovePermission(role, p)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="space-y-6">
              <div className="bg-[#0f172a] text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <CloudLightning className="absolute -right-6 -top-6 w-32 h-32 text-indigo-400/10" />
                <h3 className="text-2xl font-black mb-10 tracking-tight flex items-center gap-3"><Database className="w-6 h-6 text-indigo-400" /> Synchronisation Cloud</h3>
                <div className="grid grid-cols-2 gap-6">
                   <button disabled={syncing || !currentUser} onClick={handleSyncCloud} className="flex flex-col items-center gap-4 p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all disabled:opacity-50">
                      {syncing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8 text-indigo-400" />}
                      <div className="text-center">
                         <h4 className="font-black uppercase tracking-widest text-xs mb-1">Pousser vers Cloud</h4>
                         <p className="text-[9px] text-slate-500 font-bold uppercase">Sauvegarder l'état actuel</p>
                      </div>
                   </button>
                   <button disabled={syncing || !currentUser} onClick={handlePullCloud} className="flex flex-col items-center gap-4 p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all disabled:opacity-50">
                      {syncing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Download className="w-8 h-8 text-emerald-400" />}
                      <div className="text-center">
                         <h4 className="font-black uppercase tracking-widest text-xs mb-1">Récupérer du Cloud</h4>
                         <p className="text-[9px] text-slate-500 font-bold uppercase">Restaurer dernier backup</p>
                      </div>
                   </button>
                </div>
                {!currentUser && (
                  <div className="mt-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4">
                     <ShieldAlert className="w-5 h-5 text-rose-500" />
                     <p className="text-xs font-bold text-rose-200">Mode Local Uniquement. Connectez-vous pour activer la synchronisation cloud.</p>
                  </div>
                )}
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex justify-between items-center shadow-sm">
                 <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight">Export de Sécurité</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Télécharger une copie physique au format JSON</p>
                 </div>
                 <button onClick={handleBackup} className="p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"><Download className="w-6 h-6" /></button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
           <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
              <ShieldCheck className="w-8 h-8 text-indigo-600 mb-4" />
              <h4 className="text-sm font-black uppercase text-indigo-900 mb-2">Supabase Ready</h4>
              <p className="text-xs text-indigo-700/70 font-medium leading-relaxed italic">
                 Votre instance SAJITECH est maintenant liée à votre projet cloud Supabase. 
                 Chaque backup est chiffré et stocké en toute sécurité.
              </p>
           </div>
        </div>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight">{editingUser ? 'Editer Utilisateur' : 'Nouvel Utilisateur'}</h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X className="w-6 h-6" /></button>
             </div>
             <form onSubmit={handleSaveUser} className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prénom</label><input required value={userFormData.firstName} onChange={e => setUserFormData({...userFormData, firstName: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</label><input required value={userFormData.lastName} onChange={e => setUserFormData({...userFormData, lastName: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" /></div>
               </div>
               <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Login</label><input required value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" /></div>
               {!editingUser && <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe</label><input required type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" /></div>}
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rôle</label>
                  <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                     {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
               </div>
               <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl">Enregistrer l'utilisateur</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
