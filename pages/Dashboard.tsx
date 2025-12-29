import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Users, ShoppingBag, AlertCircle, ArrowUpRight, ArrowDownRight, 
  ChevronRight, Calendar as CalendarIcon, BarChart3, CheckSquare, Wrench, 
  Clock, Target, History as HistoryIcon, ShieldCheck, Briefcase, FileText, Boxes, 
  Ticket as TicketIcon, Wallet, Fuel, Landmark, Navigation, UserCheck, Activity,
  PlusCircle, ShoppingCart, Receipt, Truck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { getDB } from '../db';
import { useLanguage, formatMAD } from '../App';
import { User, UserRole, Sale, Client, Product, Task, Ticket, Opportunity, Invoice, Purchase, Expense, Mission, FuelLog } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const KPIModal = ({ title, value, trend, sub, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${colorClass} text-white shadow-lg`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
      <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">{sub}</p>
    </div>
  </div>
);

const SectionHeader = ({ title, subtitle, icon: Icon }: any) => (
  <div className="flex items-center gap-4 mb-8">
    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{title}</h3>
      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>
    </div>
  </div>
);

export default function Dashboard({ user }: { user: User }) {
  const { t } = useLanguage();
  const db = useMemo(() => getDB(), []);
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;

  // --- CALCULS ANALYTIQUES COMPLEXES (ADMIN) ---
  const analytics = useMemo(() => {
    if (!isAdmin) return null;

    const invoices = (db.invoices || []) as Invoice[];
    const validatedInvoices = invoices.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled');
    const purchases = (db.purchases || []) as Purchase[];
    const expenses = (db.expenses || []) as Expense[];
    const missions = (db.missions || []) as Mission[];
    const fuel = (db.fuelLogs || []) as FuelLog[];

    // Finances
    const totalCA = validatedInvoices.reduce((a, b) => a + b.totalTTC, 0);
    const totalPurchases = purchases.filter(p => p.status === 'Validé').reduce((a, b) => a + b.totalTTC, 0);
    const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0);
    const netProfit = totalCA - totalPurchases - totalExpenses;

    // Ventes par mois (Simulation sur les 6 derniers mois)
    const monthlySales = [
      { name: 'Jan', val: totalCA * 0.12 }, { name: 'Fev', val: totalCA * 0.15 }, 
      { name: 'Mar', val: totalCA * 0.18 }, { name: 'Avr', val: totalCA * 0.14 },
      { name: 'Mai', val: totalCA * 0.20 }, { name: 'Jun', val: totalCA * 0.21 }
    ];

    // Répartition Stock
    const stockByCategory = db.categories.map((c: any) => ({
      name: c.name,
      value: db.products.filter((p: any) => p.categoryId === c.id).reduce((a: number, b: any) => a + (b.stockQty * b.cost), 0)
    })).filter((c: any) => c.value > 0);

    // Logistique
    const totalFuelCost = fuel.reduce((a, b) => a + b.totalAmount, 0);
    const totalDistance = missions.filter(m => m.status === 'Terminée').reduce((a, b) => a + ((b.endKm || 0) - b.startKm), 0);
    const costPerKm = totalDistance > 0 ? (totalFuelCost / totalDistance) : 0;

    return { totalCA, totalPurchases, totalExpenses, netProfit, monthlySales, stockByCategory, totalDistance, costPerKm, totalFuelCost };
  }, [db, isAdmin]);

  // --- VUE ADMINISTRATEUR ---
  if (isAdmin) {
    return (
      <div className="space-y-12 pb-20 animate-in fade-in duration-700">
        
        {/* TOP KPI GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPIModal title="Chiffre d'Affaire" value={formatMAD(analytics?.totalCA || 0)} trend={12} sub="Total TTC Validé" icon={TrendingUp} colorClass="bg-indigo-600" />
          <KPIModal title="Bénéfice Net" value={formatMAD(analytics?.netProfit || 0)} trend={5} sub="Revenus - (Achats + Charges)" icon={Target} colorClass="bg-emerald-600" />
          <KPIModal title="Total Dépenses" value={formatMAD((analytics?.totalExpenses || 0) + (analytics?.totalPurchases || 0))} trend={-2} sub="Achats Stock + Frais Fixes" icon={Wallet} colorClass="bg-rose-600" />
          <KPIModal title="Clients Actifs" value={db.clients.length} trend={8} sub="Portefeuille CRM" icon={Users} colorClass="bg-blue-600" />
        </div>

        {/* SECTION 1: PERFORMANCE FINANCIÈRE & VENTES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
             <SectionHeader title="Évolution de l'activité" subtitle="Volume de facturation mensuel (DH)" icon={BarChart3} />
             <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.monthlySales}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 900}} />
                    <YAxis hide />
                    <Tooltip cursor={{stroke: '#6366f1', strokeWidth: 2}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
             <SectionHeader title="Alertes Stock" subtitle="Articles en rupture ou seuil min" icon={Boxes} />
             <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                {db.products.filter((p: any) => p.stockQty <= p.minStock).slice(0, 6).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                     <div>
                        <p className="text-xs font-black text-rose-900 truncate max-w-[120px] uppercase">{p.name}</p>
                        <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">Stock: {p.stockQty} {p.unit}</p>
                     </div>
                     <Link to="/stock" className="p-2 bg-white text-rose-600 rounded-xl shadow-sm hover:bg-rose-600 hover:text-white transition-all">
                        <PlusCircle className="w-4 h-4" />
                     </Link>
                  </div>
                ))}
                {db.products.filter((p: any) => p.stockQty <= p.minStock).length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                     <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
                     <p className="text-[10px] font-black uppercase tracking-widest">Stock en bonne santé</p>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* SECTION 2: LOGISTIQUE & CRM ANALYTICS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Logistique Stats */}
           <div className="bg-[#0f172a] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <Navigation className="absolute -right-8 -bottom-8 w-48 h-48 text-white opacity-[0.03] rotate-12" />
              <SectionHeader title="Logistique" subtitle="Performance du parc" icon={Truck} />
              <div className="space-y-8 relative z-10 mt-10">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem]">
                       <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Coût / KM</p>
                       <h4 className="text-2xl font-black">{analytics?.costPerKm.toFixed(2)} <span className="text-xs text-slate-500">DH</span></h4>
                    </div>
                    <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem]">
                       <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Distance Totale</p>
                       <h4 className="text-2xl font-black">{analytics?.totalDistance.toLocaleString()} <span className="text-xs text-slate-500">KM</span></h4>
                    </div>
                 </div>
                 <div className="p-6 bg-indigo-600 rounded-[2rem] shadow-xl">
                    <div className="flex items-center gap-4">
                       <Fuel className="w-8 h-8 text-indigo-200" />
                       <div>
                          <p className="text-[10px] font-black text-indigo-200 uppercase">Budget Carburant</p>
                          <h3 className="text-3xl font-black">{formatMAD(analytics?.totalFuelCost || 0)}</h3>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Répartition Valeur Stock */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
              <SectionHeader title="Répartition Stock" subtitle="Valeur PMP par catégorie" icon={Landmark} />
              <div className="h-64 mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie data={analytics?.stockByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {analytics?.stockByCategory.map((entry: any, index: number) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip formatter={(v: number) => formatMAD(v)} contentStyle={{borderRadius: '16px', border: 'none'}} />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-2">
                 {analytics?.stockByCategory.slice(0, 3).map((item: any, idx: number) => (
                    <div key={item.name} className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span>{item.name}</span>
                       </div>
                       <span className="text-slate-900">{formatMAD(item.value)}</span>
                    </div>
                 ))}
              </div>
           </div>

           {/* RH & Tâches */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <SectionHeader title="Opérations RH" subtitle="Tâches & Collaborateurs" icon={UserCheck} />
              <div className="space-y-6 mt-8">
                 <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-slate-700 uppercase">Taux de complétion</p>
                    <span className="text-indigo-600 font-black">78%</span>
                 </div>
                 <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 w-[78%]"></div>
                 </div>
                 <div className="pt-6 space-y-4">
                    {db.tasks.slice(0, 3).map((t: any) => (
                       <div key={t.id} className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${t.priority === 'High' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                          <p className="text-xs font-bold text-slate-600 truncate flex-1">{t.title}</p>
                          <span className="text-[9px] font-black uppercase text-slate-400">{t.status}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* SECTION 3: SYSTEM AUDIT & TICKETS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <SectionHeader title="Historique Critique" subtitle="Dernières actions de sécurité" icon={HistoryIcon} />
              <div className="space-y-4">
                 {db.auditLogs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5 text-slate-400" />
                       </div>
                       <div>
                          <p className="text-xs font-black text-slate-900 leading-tight">{log.action}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{log.module} • Par {log.userId} • {new Date(log.createdAt).toLocaleTimeString()}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <SectionHeader title="Support Interne" subtitle="Tickets techniques ouverts" icon={TicketIcon} />
              <div className="space-y-4">
                 {db.tickets.filter((t: any) => t.status === 'Ouvert').slice(0, 3).map((tk: any) => (
                    <div key={tk.id} className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] flex justify-between items-center group hover:border-indigo-300 transition-all">
                       <div>
                          <p className="text-[10px] font-black text-indigo-500 uppercase mb-1">{tk.category}</p>
                          <h4 className="text-sm font-black text-slate-900">{tk.subject}</h4>
                       </div>
                       <Link to="/support" className="p-3 bg-white text-slate-400 rounded-xl shadow-sm group-hover:text-indigo-600 transition-all">
                          <ChevronRight className="w-4 h-4" />
                       </Link>
                    </div>
                 ))}
                 {db.tickets.filter((t: any) => t.status === 'Ouvert').length === 0 && (
                    <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px]">Aucun ticket en attente</div>
                 )}
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- VUES OPÉRATIONNELLES (VENDEUR / TECHNICIEN) ---
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-xl">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t('welcome')} {user.firstName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Session {user.role} Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user.role === UserRole.VENDEUR ? (
          <>
            <KPIModal title="Mes Ventes" value={formatMAD(db.sales.filter((s:any)=>s.userId === user.id).reduce((a:any,b:any)=>a+b.totalTTC,0))} icon={ShoppingCartIcon} colorClass="bg-emerald-600" sub="Volume personnel" />
            <KPIModal title="Tickets Caisse" value={db.sales.filter((s:any)=>s.userId === user.id).length} icon={ReceiptIcon} colorClass="bg-indigo-600" sub="Nombre de ventes" />
            <KPIModal title="Prospects" value={db.opportunities.length} icon={Target} colorClass="bg-blue-600" sub="Pipeline commercial" />
            <KPIModal title="Catalogue" value={db.products.length} icon={Boxes} colorClass="bg-slate-800" sub="Articles disponibles" />
          </>
        ) : (
          <>
            <KPIModal title="Mes Tâches" value={db.tasks.filter((t:any)=>t.assignedTo === user.id).length} icon={CheckSquare} colorClass="bg-indigo-600" sub="Assignations en cours" />
            <KPIModal title="Support" value={db.tickets.filter((t:any)=>t.status === 'Ouvert').length} icon={TicketIcon} colorClass="bg-rose-600" sub="Tickets actifs" />
            <KPIModal title="Services" value={db.services.length} icon={Wrench} colorClass="bg-slate-800" sub="Catalogue interventions" />
            <KPIModal title="Agenda" value="Auj." icon={CalendarIcon} colorClass="bg-blue-600" sub="Voir le planning" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3">
               <Activity className="w-6 h-6 text-indigo-600" /> Mon Activité Récente
            </h3>
            <div className="space-y-6">
               {(user.role === UserRole.VENDEUR ? db.sales : db.tasks).slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                           {user.role === UserRole.VENDEUR ? <ReceiptIcon className="w-5 h-5 text-emerald-600" /> : <CheckSquare className="w-5 h-5 text-indigo-600" />}
                        </div>
                        <div>
                           <p className="text-sm font-black text-slate-800">{user.role === UserRole.VENDEUR ? `Vente #${item.id}` : item.title}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <span className="text-xs font-black text-indigo-600">{user.role === UserRole.VENDEUR ? formatMAD(item.totalTTC) : item.status}</span>
                  </div>
               ))}
            </div>
         </div>

         <div className="bg-[#0f172a] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
               <CalendarIcon className="w-40 h-40" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-8 relative z-10">Prochaines Échéances</h3>
            <div className="space-y-6 relative z-10">
               {db.calendarEvents.slice(0, 3).map((ev: any) => (
                  <div key={ev.id} className="flex items-center gap-6 p-4 bg-white/5 border border-white/10 rounded-[2rem]">
                     <div className="text-center bg-indigo-600 px-4 py-2 rounded-2xl shadow-lg">
                        <p className="text-[9px] font-black uppercase text-indigo-200">Jour</p>
                        <p className="text-lg font-black">{new Date(ev.startDate).getDate()}</p>
                     </div>
                     <div>
                        <h4 className="text-sm font-black uppercase">{ev.title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2"><Clock className="w-3 h-3" /> {new Date(ev.startDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                     </div>
                  </div>
               ))}
               {db.calendarEvents.length === 0 && (
                  <div className="py-10 text-center text-slate-500 font-black uppercase text-[10px]">Aucun événement prévu</div>
               )}
            </div>
            <Link to="/calendar" className="mt-10 block w-full py-5 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] text-center shadow-xl hover:bg-indigo-600 hover:text-white transition-all">
               Ouvrir le planning
            </Link>
         </div>
      </div>
    </div>
  );
}

// Icons placeholders
const ShoppingCartIcon = ({ className }: any) => <ShoppingCart className={className} />;
const ReceiptIcon = ({ className }: any) => <Receipt className={className} />;
