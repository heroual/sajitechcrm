import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { getDB, saveDB, supabase, pullFromCloud, logAudit } from '../db';
import { Lock, User as UserIcon, ShieldAlert, CheckCircle2, CloudLightning } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState(''); // Supabase utilise principalement l'email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // --- AUTHENTIFICATION SUPABASE ---
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // 1. Tenter de récupérer les données cloud de cet utilisateur
      try {
        await pullFromCloud(data.user.id);
      } catch (err) {
        console.warn("Nouveau compte ou erreur de sync cloud, utilisation de la DB locale.");
      }

      const db = getDB();
      // On cherche si l'utilisateur existe dans notre table de profils (JSON local)
      // Note: Dans un système full cloud, on utiliserait une table 'profiles' dans Supabase
      let localUser = db.users.find((u: User) => u.username.toLowerCase() === email.toLowerCase());
      
      if (!localUser) {
          // Création auto d'un profil local si c'est un premier login cloud
          localUser = {
              id: data.user.id,
              username: email,
              firstName: 'Utilisateur',
              lastName: 'Cloud',
              role: UserRole.ADMIN, // Par défaut Admin pour le premier setup
              isActive: true,
              createdAt: new Date().toISOString()
          };
          db.users.push(localUser);
          saveDB(db);
      }

      logAudit(localUser.id, 'System', 'Cloud Login', 'Authentification Supabase réussie');
      onLogin(localUser);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-indigo-600 p-10 text-center text-white relative">
          <div className="absolute top-4 right-4 animate-pulse">
             <CloudLightning className="w-6 h-6 text-indigo-300" />
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-xl">
            <Lock className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">SAJITECH CLOUD</h1>
          <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mt-2 opacity-80 italic">Propulsé par Supabase</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-rose-100 animate-in shake duration-300">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email / Identifiant</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-800 font-bold"
                placeholder="votre@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-800 font-bold"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50"
          >
            {loading ? 'Connexion Cloud...' : 'Synchroniser & Ouvrir'}
          </button>

          <div className="flex items-center justify-center gap-2 pt-4 opacity-40">
             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
             <p className="text-[10px] font-black uppercase tracking-widest">Auth Cloud & LocalStorage Backup</p>
          </div>
        </form>
        
        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic leading-relaxed">
            Sajitech Morocco • Mode Hybride Cloud/Offline<br/>
            Souveraineté des données garantie
          </p>
        </div>
      </div>
    </div>
  );
}