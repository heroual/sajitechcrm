
import React, { useState } from 'react';
import { Info, BookOpen, ShieldCheck, Target, Layers, HelpCircle, Package, ShoppingCart, FileText, Users, Lock, Settings, ChevronRight, MessageSquare, Truck, Banknote } from 'lucide-react';

export default function About() {
  const [activeTab, setActiveTab] = useState<'About' | 'Docs'>('About');

  const Section = ({ icon: Icon, title, children }: any) => (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
      </div>
      <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
        {children}
      </div>
    </div>
  );

  const Step = ({ num, text }: { num: number, text: string }) => (
    <div className="flex gap-4 items-start">
      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-black text-xs">{num}</div>
      <p className="text-sm font-bold text-slate-700">{text}</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Espace Sajitech</h2>
          <p className="text-slate-500 font-medium">Présentation & Guide d'utilisation complet.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 shadow-sm">
        {[
          { id: 'About', label: 'À propos de Sajitech', icon: Info },
          { id: 'Docs', label: 'Guide Utilisateur', icon: BookOpen }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'About' ? (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-[#0f172a] text-white p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
             <div className="relative z-10">
                <Target className="w-16 h-16 text-indigo-400 mb-8" />
                <h1 className="text-5xl font-black tracking-tighter mb-6">Sajitech CRM</h1>
                <p className="text-xl text-slate-300 max-w-2xl font-medium leading-relaxed">
                   La solution intégrée "Offline-First" conçue spécifiquement pour les commerçants, artisans et PME du Maroc. 
                   Sajitech simplifie votre quotidien en centralisant la caisse, les stocks et la facturation dans un terminal rapide et fiable.
                </p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <Section icon={Layers} title="Notre Philosophie">
                Sajitech est né de l'observation des besoins réels des commerces de proximité. Nous croyons que la puissance d'un logiciel de gestion ne doit pas être synonyme de complexité. Notre philosophie repose sur trois piliers : 
                <ul className="space-y-3 mt-4">
                   <li className="flex items-center gap-2 text-indigo-600 font-bold"><ChevronRight className="w-4 h-4" /> Simplicité d'Usage</li>
                   <li className="flex items-center gap-2 text-indigo-600 font-bold"><ChevronRight className="w-4 h-4" /> Résilience Offline (Zéro dépendance Cloud)</li>
                   <li className="flex items-center gap-2 text-indigo-600 font-bold"><ChevronRight className="w-4 h-4" /> Professionnalisation instantanée</li>
                </ul>
             </Section>
             <Section icon={ShieldCheck} title="Objectifs de la plateforme">
                La plateforme vise à transformer votre gestion manuelle en un système automatisé et sécurisé. Elle permet d'éliminer les erreurs de calcul, de suivre chaque centime de votre stock et de fidéliser vos clients grâce à une vision 360° de leurs interactions.
             </Section>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm text-center">
             <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Ingénierie & Développement</p>
             <h4 className="text-2xl font-black text-slate-900 mb-2">Created by Elheroual Salah Eddine</h4>
             <p className="text-indigo-600 font-black tracking-widest text-sm uppercase">Powered by Sajitech</p>
          </div>
        </div>
      ) : (
        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500 pb-20">
           
           {/* Section Produits */}
           <Section icon={Package} title="📦 Gestion des Produits">
              <p>Le catalogue produit est le cœur de votre système. Chaque fiche produit alimente à la fois votre stock et votre interface de vente.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                 <div className="space-y-4">
                    <Step num={1} text="Ajoutez un produit avec un nom clair et un SKU (code unique)." />
                    <Step num={2} text="Uploadez une image : elle facilitera l'identification visuelle en caisse (POS)." />
                    <Step num={3} text="Définissez l'unité : pièce, kg, litre, ou forfait." />
                 </div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-sm text-slate-500">
                    💡 Astuce : Le 'Coût PMP' est calculé automatiquement à chaque validation d'achat fournisseur pour refléter votre marge réelle.
                 </div>
              </div>
           </Section>

           {/* Section Achats */}
           <Section icon={Truck} title="🧾 Achats & Fournisseurs">
              <p>Pilotez vos approvisionnements et surveillez l'évolution des prix du marché.</p>
              <div className="space-y-4 mt-6">
                 <Step num={1} text="Créez vos fournisseurs (Société ou Particulier) avec leurs ICE/IF." />
                 <Step num={2} text="Initiez un 'Bon d'Achat' dès réception de marchandise." />
                 <Step num={3} text="Modifiez les prix d'achat à la volée si votre fournisseur a changé ses tarifs." />
                 <Step num={4} text="Validez : le stock est alimenté et l'historique des prix est archivé." />
              </div>
           </Section>

           {/* Section POS */}
           <Section icon={ShoppingCart} title="🛒 Point de Vente (POS)">
              <p>L'interface conçue pour la rapidité au comptoir.</p>
              <ul className="space-y-3 mt-4">
                 <li className="flex gap-3 text-sm font-bold text-slate-700"><ChevronRight className="w-4 h-4 text-indigo-500" /> Recherche instantanée par nom ou image.</li>
                 <li className="flex gap-3 text-sm font-bold text-slate-700"><ChevronRight className="w-4 h-4 text-indigo-500" /> Ajustement libre des prix HT (selon permissions vendeur).</li>
                 <li className="flex gap-3 text-sm font-bold text-slate-700"><ChevronRight className="w-4 h-4 text-indigo-500" /> Application de remises forfaitaires sur chaque ligne.</li>
                 <li className="flex gap-3 text-sm font-bold text-slate-700"><ChevronRight className="w-4 h-4 text-indigo-500" /> Encaissement multi-mode (Espèces, TPE, Virement).</li>
              </ul>
           </Section>

           {/* Section Facturation */}
           <Section icon={FileText} title="🧮 Facturation & Tickets">
              <p>Donnez une image sérieuse à votre entreprise avec des documents aux normes.</p>
              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 mt-6">
                 <h4 className="font-black text-indigo-900 text-sm uppercase mb-4">Configuration Requise :</h4>
                 <p className="text-xs text-indigo-700 leading-relaxed mb-4">
                    Avant votre première vente, rendez-vous dans <strong>Paramètres</strong> pour :
                 </p>
                 <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900"><ShieldCheck className="w-4 h-4" /> Uploader votre Logo & Signature</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900"><ShieldCheck className="w-4 h-4" /> Saisir vos infos légales (ICE, IF, RC)</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900"><ShieldCheck className="w-4 h-4" /> Configurer le message de pied de ticket</div>
                 </div>
              </div>
           </Section>

           {/* Section CRM */}
           <Section icon={Users} title="👥 Clients & CRM">
              <p>Ne perdez plus aucune interaction. Sajitech analyse votre portefeuille en continu.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                 <div className="p-6 bg-slate-50 rounded-2xl">
                    <h5 className="font-black text-slate-900 text-xs uppercase mb-3">Timeline Client</h5>
                    <p className="text-xs text-slate-500 italic">Un journal immuable enregistre chaque facture, devis ou intervention pour chaque client.</p>
                 </div>
                 <div className="p-6 bg-emerald-50 rounded-2xl">
                    <h5 className="font-black text-emerald-900 text-xs uppercase mb-3">Scoring Best Clients</h5>
                    <p className="text-xs text-emerald-700 italic">Le système classe automatiquement vos clients (VIP, Gold, À relancer) selon leur valeur (RFM).</p>
                 </div>
              </div>
           </Section>

           {/* Section Sécurité */}
           <Section icon={Lock} title="🔐 Utilisateurs & Sécurité">
              <p>Contrôlez les accès pour protéger vos données financières.</p>
              <div className="space-y-4 mt-6">
                 <Step num={1} text="Rôle ADMIN : Accès total aux finances et configurations." />
                 <Step num={2} text="Rôle VENDEUR : Accès limité au POS et à la création de clients." />
                 <Step num={3} text="Rôle TECHNICIEN : Accès aux interventions et catalogue de services." />
                 <p className="text-[10px] text-rose-500 font-black uppercase mt-6">⚠️ IMPORTANT : Changez le mot de passe 'password' de l'administrateur dès la première connexion.</p>
              </div>
           </Section>

           {/* FAQ Simple */}
           <div className="bg-[#0f172a] text-white p-10 rounded-[3rem] shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                 <HelpCircle className="w-10 h-10 text-indigo-400" />
                 <h3 className="text-2xl font-black uppercase tracking-tight">Foire aux Questions</h3>
              </div>
              <div className="space-y-6">
                 <div>
                    <h4 className="font-black text-indigo-400 mb-2">Puis-je utiliser Sajitech sans internet ?</h4>
                    <p className="text-sm text-slate-400">Oui. Sajitech est 100% offline. Toutes vos données sont stockées localement sur votre appareil. Internet n'est nécessaire que pour les mises à jour ou le chargement initial.</p>
                 </div>
                 <div>
                    <h4 className="font-black text-indigo-400 mb-2">Comment sauvegarder mes données ?</h4>
                    <p className="text-sm text-slate-400">Allez dans Paramètres &gt; Base de Données et cliquez sur 'Export .JSON'. Nous vous recommandons de sauvegarder ce fichier sur une clé USB une fois par semaine.</p>
                 </div>
                 <div>
                    <h4 className="font-black text-indigo-400 mb-2">Le logiciel gère-t-il la TVA marocaine ?</h4>
                    <p className="text-sm text-slate-400">Absolument. Vous pouvez définir des taux personnalisés (20%, 14%, 10%, 7%) par produit ou service.</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
