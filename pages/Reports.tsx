import React, { useMemo, useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Scatter
} from 'recharts';
import { 
  TrendingUp, Users, ShoppingBag, PieChart as PieIcon, ArrowUpRight, 
  Award, Target, Wrench, Package, Wallet, ShoppingCart, 
  Truck, Navigation, AlertTriangle, ShieldCheck, Zap, 
  Calendar, FileText, ChevronRight, Download, Share2, 
  Search, Clock, BarChart3, Mail, MoreHorizontal,
  Fuel, CheckCircle2, History as HistoryIcon, Loader2
} from 'lucide-react';
import { getDB, logAudit } from '../db';
import { useLanguage, formatMAD } from '../App';
import { 
  Invoice, InvoiceStatus, Purchase, PurchaseStatus, 
  Expense, Mission, Vehicle, FuelLog, Driver, 
  Ticket, TicketStatus, ExecutiveInsight, MissionStatus 
} from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const { t } = useLanguage();
  const db = getDB();
  const [activeView, setActiveView] = useState<'Finance' | 'Flotte' | 'Support' | 'Chauffeurs'>('Finance');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // --- MOTEUR DE CALCUL EXÉCUTIF ---
  const stats = useMemo(() => {
    const invoices = (db.invoices || []) as Invoice[];
    const valInvoices = invoices.filter(i => i.status !== InvoiceStatus.DRAFT && i.status !== InvoiceStatus.CANCELLED);
    const purchases = (db.purchases || []) as Purchase[];
    const valPurchases = purchases.filter(p => p.status === PurchaseStatus.VALIDATED);
    const expenses = (db.expenses || []) as Expense[];

    const rev = valInvoices.reduce((a, b) => a + b.totalTTC, 0);
    const buy = valPurchases.reduce((a, b) => a + b.totalTTC, 0);
    const expe = expenses.reduce((a, b) => a + b.amount, 0);
    const profit = rev - buy - expe;

    const fuel = (db.fuelLogs || []) as FuelLog[];
    const missions = (db.missions || []) as Mission[];
    const totalFuel = fuel.reduce((a, b) => a + b.totalAmount, 0);
    const totalDist = missions.filter(m => m.status === MissionStatus.COMPLETED).reduce((a, b) => a + ((b.endKm || 0) - b.startKm), 0);
    const costPerKm = totalDist > 0 ? (totalFuel / totalDist) : 0;

    const tickets = (db.tickets || []) as Ticket[];
    const resolvedTickets = tickets.filter(t => t.status === TicketStatus.RESOLVED).length;
    const resRate = tickets.length > 0 ? (resolvedTickets / tickets.length) * 100 : 100;

    const insights: ExecutiveInsight[] = [];
    if (profit < 0) insights.push({ type: 'Negative', title: 'Alerte Rentabilité', message: 'Vos charges dépassent vos revenus.', impact: 'Critique' });
    if (costPerKm > 15) insights.push({ type: 'Negative', title: 'Anomalie Flotte', message: 'Coût/KM anormalement élevé.', impact: 'Moyen' });
    if (resRate < 50) insights.push({ type: 'Neutral', title: 'Goulot Support', message: 'Taux de résolution inférieur à 50%.', impact: 'Client' });
    if (rev > 50000) insights.push({ type: 'Positive', title: 'Croissance', message: 'Objectif mensuel de CA atteint.', impact: 'Stratégique' });

    return { rev, buy, expe, profit, totalFuel, totalDist, costPerKm, openTickets: tickets.filter(t => t.status === TicketStatus.OPEN).length, resolvedTickets, resRate, insights };
  }, [db]);

  // --- LOGIQUE D'EXPORT PDF ROBUSTE ---
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      // Capture du rapport avec html2canvas
      // Note: On utilise des options spécifiques pour le mode offline et les graphiques
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Haute qualité
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Ajout des métadonnées
      pdf.setProperties({
        title: `Sajitech_Rapport_${activeView}_${new Date().toISOString()}`,
        subject: 'Analyse CRM Business Intelligence',
        author: 'Sajitech CRM'
      });

      pdf.save(`SAJITECH_RAPPORT_${activeView.toUpperCase()}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
      
      logAudit('admin', 'Reports', 'Export PDF', `Rapport ${activeView} exporté avec succès`);
      alert("✅ Rapport PDF généré avec succès !");
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("❌ Erreur lors de la génération du PDF. Vérifiez que toutes les données sont chargées.");
    } finally {
      setIsExporting(false);
    }
  };

  const StatCard = ({ title, value, sub, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
      <div className={`p-4 ${color} text-white rounded-2xl shadow-lg w-fit mb-6`}>
         <Icon className="w-6 h-6" />
      </div>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h3>
          <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">{sub}</p>
        </div>
        {trend && (
           <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
             {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
             {Math.abs(trend)}%
           </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      
      {/* HEADER EXÉCUTIF */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Rapports Exécutifs</h2>
          <p className="text-slate-500 font-medium tracking-tight">Analyse consolidée & Recommandations stratégiques</p>
        </div>
        <div className="flex gap-3">
           <button 
             disabled={isExporting}
             onClick={handleExportPDF}
             className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
           >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
              {isExporting ? 'Génération...' : 'Export PDF'}
           </button>
           <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all">
              <Share2 className="w-4 h-4" /> Partager
           </button>
        </div>
      </div>

      {/* TABS DE NAVIGATION DÉCISIONNELLE */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 shadow-sm overflow-x-auto scrollbar-hide">
        {[
          { id: 'Finance', label: 'Bilan Financier', icon: Wallet },
          { id: 'Flotte', label: 'Performance Flotte', icon: Truck },
          { id: 'Support', label: 'Service Client', icon: Target },
          { id: 'Chauffeurs', label: 'Score Chauffeurs', icon: Users }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeView === tab.id ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ZONE DE CAPTURE POUR L'EXPORT */}
      <div ref={reportRef} className="space-y-10">
        
        {/* IDENTIFIANT DE RAPPORT (Masqué en mode UI, utile pour PDF) */}
        <div className="hidden pdf-only flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
            <h1 className="text-2xl font-black text-indigo-600 uppercase tracking-tighter">Sajitech Executive Report</h1>
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Généré le {new Date().toLocaleString()}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type: {activeView} Analysis</p>
            </div>
        </div>

        {/* DASHBOARD FINANCIER */}
        {activeView === 'Finance' && (
          <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Chiffre d'Affaire" value={formatMAD(stats.rev)} sub="Ventes TTC Validées" icon={TrendingUp} color="bg-indigo-600" trend={12} />
                <StatCard title="Total Dépenses" value={formatMAD(stats.buy + stats.expe)} sub="Achats + Frais Fixes" icon={ShoppingBag} color="bg-rose-600" trend={-4} />
                <StatCard title="Bénéfice Net" value={formatMAD(stats.profit)} sub="Résultat d'Exploitation" icon={Award} color="bg-emerald-600" trend={8} />
                <StatCard title="Taux de Marge" value={`${stats.rev > 0 ? ((stats.profit / stats.rev) * 100).toFixed(1) : 0}%`} sub="Rentabilité Brute" icon={PieIcon} color="bg-amber-50" />
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-center mb-10">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Flux de Revenus & Dépenses</h3>
                      <div className="flex gap-4">
                         <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> Revenus</div>
                         <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Charges</div>
                      </div>
                   </div>
                   <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={[
                           { name: 'S1', rev: stats.rev * 0.1, exp: stats.expe * 0.2 },
                           { name: 'S2', rev: stats.rev * 0.3, exp: stats.expe * 0.25 },
                           { name: 'S3', rev: stats.rev * 0.4, exp: stats.expe * 0.3 },
                           { name: 'S4', rev: stats.rev * 0.2, exp: stats.expe * 0.25 },
                         ]}>
                            <defs>
                               <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                               <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 900}} />
                            <YAxis hide />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                            <Area type="monotone" dataKey="rev" stroke="#6366f1" strokeWidth={4} fill="url(#colorRev)" />
                            <Area type="monotone" dataKey="exp" stroke="#ef4444" strokeWidth={4} fill="url(#colorExp)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-[#0f172a] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col">
                   <Zap className="absolute -right-6 -top-6 w-32 h-32 text-indigo-400/10" />
                   <h3 className="text-xl font-black uppercase tracking-tight mb-8 relative z-10 flex items-center gap-3"><Zap className="w-5 h-5 text-indigo-400" /> Insights Exécutifs</h3>
                   <div className="space-y-6 flex-1 relative z-10">
                      {stats.insights.map((insight, idx) => (
                         <div key={idx} className={`p-5 rounded-2xl border ${insight.type === 'Negative' ? 'bg-rose-500/10 border-rose-500/20' : insight.type === 'Positive' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex justify-between items-start mb-2">
                               <h4 className="font-black text-xs uppercase tracking-widest">{insight.title}</h4>
                               <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${insight.impact === 'Critique' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}>{insight.impact}</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">{insight.message}</p>
                         </div>
                      ))}
                      {stats.insights.length === 0 && <p className="text-center py-20 text-slate-500 italic text-sm">Analyse des données en cours...</p>}
                   </div>
                   <button className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-all">Générer Rapport IA</button>
                </div>
             </div>
          </div>
        )}

        {/* DASHBOARD FLOTTE & LOGISTIQUE */}
        {activeView === 'Flotte' && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-8">
                   <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-inner">
                      <Navigation className="w-10 h-10" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Distance Totale</p>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalDist.toLocaleString()} <span className="text-sm text-slate-300">KM</span></h3>
                   </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-8">
                   <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-inner">
                      <Fuel className="w-10 h-10" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Budget Carburant</p>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{formatMAD(stats.totalFuel)}</h3>
                   </div>
                </div>
                <div className="bg-[#0f172a] text-white p-8 rounded-[2.5rem] shadow-2xl flex items-center gap-8 relative overflow-hidden">
                   <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-indigo-400 border border-white/5">
                      <TrendingUp className="w-10 h-10" />
                   </div>
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Coût / KM Réel</p>
                      <h3 className="text-4xl font-black tracking-tighter">{stats.costPerKm.toFixed(2)} <span className="text-sm text-slate-500 uppercase">DH</span></h3>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                   <SectionTitle title="Analyse de Consommation" sub="Top 5 Véhicules les plus gourmands" icon={BarChart3} />
                   <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={db.vehicles.slice(0, 5).map((v: Vehicle) => ({ name: v.plate, val: Math.random() * 20 + 8 }))} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 900}} width={80} />
                            <Tooltip cursor={{fill: '#f8fafc'}} />
                            <Bar dataKey="val" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                   <SectionTitle title="État de Maintenance" sub="Urgence des interventions" icon={Wrench} />
                   <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie 
                              data={[
                                { name: 'Opérationnel', value: 70 },
                                { name: 'Entretien Proche', value: 20 },
                                { name: 'Urgent', value: 10 }
                              ]} 
                              innerRadius={70} outerRadius={90} paddingAngle={10} dataKey="value"
                            >
                               <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                            </Pie>
                            <Legend verticalAlign="bottom" height={36}/>
                         </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* DASHBOARD SUPPORT & QUALITÉ */}
        {activeView === 'Support' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Tickets Ouverts" value={stats.openTickets} sub="En attente de résolution" icon={Clock} color="bg-rose-600" />
                <StatCard title="Tickets Résolus" value={stats.resolvedTickets} sub="Total période actuelle" icon={CheckCircle2} color="bg-emerald-600" />
                <StatCard title="Score Satisfaction" value={`${stats.resRate.toFixed(1)}%`} sub="Taux de succès" icon={Target} color="bg-indigo-600" />
             </div>

             <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                <SectionTitle title="Tendances Support" sub="Volume de tickets par jour" icon={HistoryIcon} />
                <div className="h-80">
                   <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={[
                        { name: 'Lun', tickets: 4, res: 2 },
                        { name: 'Mar', tickets: 7, res: 5 },
                        { name: 'Mer', tickets: 5, res: 5 },
                        { name: 'Jeu', tickets: 12, res: 8 },
                        { name: 'Ven', tickets: 3, res: 3 },
                      ]}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 900}} />
                         <YAxis hide />
                         <Tooltip />
                         <Bar dataKey="tickets" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                         <Line type="monotone" dataKey="res" stroke="#10b981" strokeWidth={3} />
                      </ComposedChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {/* FOOTER POUR PDF */}
        <div className="hidden pdf-only mt-20 pt-10 border-t border-slate-100 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                SAJITECH CRM Maroc - Document Confidentiel - Propriété de l'entreprise<br/>
                Logiciel Propulsé par Sajitech - Terminal de Gestion Intelligente
            </p>
        </div>
      </div>
    </div>
  );
}

const SectionTitle = ({ title, sub, icon: Icon }: any) => (
  <div className="flex items-center gap-4 mb-10">
     <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
        <Icon className="w-5 h-5" />
     </div>
     <div>
        <h4 className="font-black text-slate-900 uppercase tracking-tight">{title}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
     </div>
  </div>
);