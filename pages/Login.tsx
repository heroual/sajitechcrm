
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { getDB, saveDB, supabase, pullFromCloud, logAudit } from '../db';
import { Lock, User as UserIcon, ShieldAlert, CheckCircle2, CloudLightning, Loader2 } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // --- 1. CONNEXION SUPABASE AUTH ---
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        // Fix: Force string conversion to avoid [object Object]
        const errorMsg = typeof authError === 'object' ? authError.message : String(authError);
        setError(errorMsg || "Échec de l'authentification.");
        setLoading(false);
        return;
      }

      if (data.user) {
        // --- 2. TENTATIVE DE RÉCUPÉRATION DES DONNÉES CLOUD ---
        // On ne bloque pas si la table est absente (resilience)
        try {
          await pullFromCloud(data.user.id);
        } catch (pullErr) {
          console.warn("Table de sauvegarde indisponible, utilisation du profil local.");
        }

        const db = getDB();
        if (!db.users) db.users = [];

        // --- 3. ENFORCEMENT DES RÔLES ADMIN ---
        // On force le rôle ADMIN pour les emails spécifiés par l'expert
        const ADMIN_EMAILS = ['admin@sajitech.ma', 'jihane@sajitech.ma'];
        const isSuperAdmin = ADMIN_EMAILS.includes(normalizedEmail);
        
        const cloudMetadata = data.user.user_metadata;
        const realRole = isSuperAdmin ? UserRole.ADMIN : ((cloudMetadata?.role as UserRole) || UserRole.VENDEUR);
        const realFirstName = cloudMetadata?.first_name || (isSuperAdmin ? normalizedEmail.split('@')[0] : 'Utilisateur');
        const realLastName = cloudMetadata?.last_name || 'Sajitech';

        let localUserIndex = db.users.findIndex((u: User) => u.username.toLowerCase() === normalizedEmail);
        let finalUser: User;

        if (localUserIndex === -1) {
          finalUser = {
            id: data.user.id,
            username: normalizedEmail,
            firstName: realFirstName,
            lastName: realLastName,
            role: realRole,
            isActive: true,
            createdAt: new Date().toISOString()
          };
          db.users.push(finalUser);
        } else {
          // MISE À JOUR SYNC : On écrase toujours le rôle local par la vérité Cloud/Hardcoded
          finalUser = {
            ...db.users[localUserIndex],
            id: data.user.id,
            role: realRole,
            firstName: realFirstName,
            lastName: realLastName
          };
          db.users[localUserIndex] = finalUser;
        }

        // Sauvegarde immédiate
        saveDB(db);
        
        logAudit(finalUser.id, 'System', 'Login Success', `Connexion terminal : ${finalUser.role}`);
        onLogin(finalUser);
      }
    } catch (err: any) {
      // Fix: Force string conversion to avoid [object Object]
      const finalError = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
      setError("Erreur système : " + finalError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-indigo-600 p-12 text-center text-white relative">
          <div className="absolute top-6 right-6">
             <CloudLightning className={`w-6 h-6 text-indigo-300 ${loading ? 'animate-pulse' : ''}`} />
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 backdrop-blur-sm shadow-xl border border-white/10">
            <Lock className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Sajitech CRM</h1>
          <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-80">Full Supabase Cloud Terminal</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-12 space-y-8">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl text-xs font-bold flex items-center gap-3 border border-rose-100 animate-in shake duration-500">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Professionnel</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-800 font-bold"
                placeholder="votre@email.ma"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de Passe</label>
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
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
               <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Synchronisation...
               </>
            ) : 'Se connecter au Cloud'}
          </button>

          <div className="flex flex-col items-center justify-center gap-2 pt-4 opacity-40">
             <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest">Session Sécurisée</p>
             </div>
             <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Admin & Jihane : Accès Prioritaire</p>
          </div>
        </form>
      </div>
    </div>
  );
}
