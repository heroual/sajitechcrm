import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShoppingCart, FileText, UserSquare2, 
  Ticket as TicketIcon, Settings as SettingsIcon, LogOut, Database, 
  Search, Tags, Wrench, UsersRound, CalendarDays, CheckSquare,
  ChevronRight, Briefcase, Boxes, Kanban, CalendarClock, Target, Globe, BarChart3, Calendar as CalendarIcon,
  ShieldCheck, History as HistoryIcon, Wallet, ShoppingBag, Truck, Info, Map as MapIcon, CarFront, Lock,
  Bell, BellRing, X, CheckCircle2, AlertTriangle, Info as InfoIcon
} from 'lucide-react';

import { initializeDB, getDB, saveDB, logAudit, runPulseChecks } from './db';
import { User, UserRole, PermissionAction, AppNotification, NotificationPriority, NotificationType } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Pipeline from './pages/Pipeline';
import Activities from './pages/Activities';
import Stock from './pages/Stock';
import Categories from './pages/Categories';
import ServicesPage from './pages/Services';
import POS from './pages/POS';
import Invoices from './pages/Invoices';
import HR from './pages/HR';
import HRTeams from './pages/HR_Teams';
import HRLeaves from './pages/HR_Leaves';
import HRTasks from './pages/HR_Tasks';
import Support from './pages/Support';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Expenses from './pages/Expenses';
import About from './pages/About';
import Logistics from './pages/Logistics';

/**
 * Vérifie si l'utilisateur possède une permission spécifique
 */
export const hasPermission = (user: User | null, module: string, action: PermissionAction = 'view', rolePermissions: Record<string, string[]>): boolean => {
  if (!user) return false;
  const permissions = rolePermissions[user.role] || [];
  
  if (permissions.includes('*')) return true;
  
  const target = `${module}.${action}`;
  const moduleWildcard = `${module}.*`;
  
  return permissions.includes(target) || permissions.includes(moduleWildcard);
};

export const formatMAD = (amount: number) => {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2
  }).format(amount).replace('MAD', 'DH');
};

export const translations = {
  FR: {
    main: "Principal",
    dashboard: "Tableau de Bord",
    calendarView: "Calendrier & Planning",
    reports: "Analyses & Rapports",
    crm: "Gestion CRM",
    leadsClients: "Clients & Prospects",
    pipeline: "Pipeline Commercial",
    activities: "Activités",
    transactions: "Ventes & Factures",
    pos: "Caisse (POS)",
    billing: "Facturation",
    finance: "Finance & Achats",
    suppliers: "Fournisseurs",
    purchases: "Achats / Entrées",
    expenses: "Dépenses / Charges",
    inventory: "Stocks",
    stock: "Inventaire",
    categories: "Catégories",
    workforce: "Ressources Humaines",
    employees: "Collaborateurs",
    departments: "Équipes & Départements",
    timeOff: "Absences & Congés",
    operations: "Opérations",
    support: "Service Client",
    serviceCatalog: "Catalogue Services",
    tickets: "Tickets Support",
    logistics: "Logistique & Parc",
    signOut: "Déconnexion",
    search: "Recherche ICE, Client, Facture...",
    sync: "Mode Offline Actif",
    enterprise: "Sajitech Maroc",
    settings: "Configuration",
    about: "À propos & Aide",
    unauthorized: "Accès Refusé",
    unauthorizedDesc: "Permissions insuffisantes pour ce module.",
    welcome: "Bonjour,",
    new: "Nouveau",
    save: "Enregistrer",
    cancel: "Annuler",
    total: "Total TTC",
    subtotal: "Total HT",
    tax: "TVA",
    status: "Statut",
    searchPlaceholder: "Rechercher...",
    processPayment: "Valider la Facture",
    inStock: "en stock",
    revenueFlow: "Flux de Revenus",
    overview: "Aperçu Global",
    clients: "Clients",
    back: "Retour",
    name: "Nom",
    pricing: "Prix",
    cost: "Coût",
    type: "Type",
    actions: "Actions",
    notifications: "Notifications",
    markAllRead: "Tout marquer comme lu",
    noNotifications: "Aucune notification pour le moment."
  },
  EN: {
    main: "Main",
    dashboard: "Dashboard",
    calendarView: "Calendar",
    reports: "Reports",
    crm: "CRM",
    leadsClients: "Clients & Leads",
    pipeline: "Sales Pipeline",
    activities: "Activities",
    transactions: "Transactions",
    pos: "Point of Sale",
    billing: "Invoicing",
    finance: "Finance & Purchases",
    suppliers: "Suppliers",
    purchases: "Purchases / Stock-in",
    expenses: "Expenses",
    inventory: "Inventory",
    stock: "Stock Control",
    categories: "Categories",
    workforce: "Human Resources",
    employees: "Employees",
    departments: "Teams",
    timeOff: "Leaves",
    operations: "Operations",
    support: "Support",
    serviceCatalog: "Services",
    tickets: "Tickets",
    logistics: "Fleet & Logistics",
    signOut: "Sign Out",
    search: "Search ICE, Client...",
    sync: "Offline Mode",
    enterprise: "Sajitech Morocco",
    settings: "Settings",
    about: "About & Help",
    unauthorized: "Access Denied",
    unauthorizedDesc: "Insufficient permissions.",
    welcome: "Welcome,",
    new: "New",
    save: "Save",
    cancel: "Cancel",
    total: "Total Incl. Tax",
    subtotal: "Total Excl. Tax",
    tax: "VAT",
    status: "Status",
    searchPlaceholder: "Search...",
    processPayment: "Issue Invoice",
    inStock: "in stock",
    revenueFlow: "Revenue Flow",
    overview: "Global Overview",
    clients: "Clients",
    back: "Back",
    name: "Name",
    pricing: "Pricing",
    cost: "Cost",
    type: "Type",
    actions: "Actions",
    notifications: "Notifications",
    markAllRead: "Mark all as read",
    noNotifications: "No notifications yet."
  }
};

type Language = 'FR' | 'EN';
interface LanguageContextType { 
  language: Language; 
  setLanguage: (lang: Language) => void; 
  t: (key: string) => string;
  rolePermissions: Record<string, string[]>;
  refreshPermissions: () => void;
}
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};

const NavSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
  const hasChildren = React.Children.toArray(children).some(child => child !== null);
  if (!hasChildren) return null;
  return (
    <div className="mb-6">
      <h3 className="px-4 mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500/80">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

const SidebarLink: React.FC<{ to: string, label: string, icon: any, active: boolean, user: User, module: string }> = ({ to, label, icon: Icon, active, user, module }) => {
  const { rolePermissions } = useLanguage();
  if (!hasPermission(user, module, 'view', rolePermissions)) return null;
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all duration-200 group ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="flex-1 font-semibold text-sm tracking-tight">{label}</span>
      {active && <ChevronRight className="w-4 h-4 text-white/50" />}
    </Link>
  );
};

const Sidebar = ({ user, logout }: { user: User, logout: () => void }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const { t } = useLanguage();
  return (
    <div className="w-72 bg-[#0f172a] text-slate-300 flex flex-col h-full border-r border-slate-800 shadow-2xl z-20 shrink-0">
      <div className="p-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white font-black text-xl tracking-tight leading-none">SAJITECH</h1>
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1 block">{t('enterprise')}</span>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-dark">
        <NavSection title={t('main')}>
          <SidebarLink to="/dashboard" label={t('dashboard')} icon={LayoutDashboard} active={isActive('/dashboard')} user={user} module="dashboard" />
          <SidebarLink to="/calendar" label={t('calendarView')} icon={CalendarIcon} active={isActive('/calendar')} user={user} module="calendar" />
          <SidebarLink to="/reports" label={t('reports')} icon={BarChart3} active={isActive('/reports')} user={user} module="reports" />
        </NavSection>
        <NavSection title={t('crm')}>
          <SidebarLink to="/crm" label={t('leadsClients')} icon={Users} active={isActive('/crm')} user={user} module="crm" />
          <SidebarLink to="/pipeline" label={t('pipeline')} icon={Kanban} active={isActive('/pipeline')} user={user} module="pipeline" />
          <SidebarLink to="/activities" label={t('activities')} icon={CalendarClock} active={isActive('/activities')} user={user} module="activities" />
        </NavSection>
        <NavSection title={t('transactions')}>
          <SidebarLink to="/pos" label={t('pos')} icon={ShoppingCart} active={isActive('/pos')} user={user} module="pos" />
          <SidebarLink to="/invoices" label={t('billing')} icon={FileText} active={isActive('/invoices')} user={user} module="invoices" />
        </NavSection>
        <NavSection title={t('finance')}>
          <SidebarLink to="/suppliers" label={t('suppliers')} icon={Truck} active={isActive('/suppliers')} user={user} module="suppliers" />
          <SidebarLink to="/purchases" label={t('purchases')} icon={ShoppingBag} active={isActive('/purchases')} user={user} module="purchases" />
          <SidebarLink to="/expenses" label={t('expenses')} icon={Wallet} active={isActive('/expenses')} user={user} module="expenses" />
        </NavSection>
        <NavSection title={t('inventory')}>
          <SidebarLink to="/stock" label={t('stock')} icon={Boxes} active={isActive('/stock')} user={user} module="stock" />
          <SidebarLink to="/categories" label={t('categories')} icon={Tags} active={isActive('/categories')} user={user} module="stock" />
        </NavSection>
        <NavSection title={t('logistics')}>
          <SidebarLink to="/logistics" label={t('logistics')} icon={CarFront} active={isActive('/logistics')} user={user} module="logistics" />
        </NavSection>
        <NavSection title={t('workforce')}>
          <SidebarLink to="/hr" label={t('employees')} icon={UserSquare2} active={isActive('/hr')} user={user} module="hr" />
          <SidebarLink to="/hr/teams" label={t('departments')} icon={UsersRound} active={isActive('/hr/teams')} user={user} module="hr" />
          <SidebarLink to="/hr/leaves" label={t('timeOff')} icon={CalendarDays} active={isActive('/hr/leaves')} user={user} module="hr" />
          <SidebarLink to="/hr/tasks" label={t('operations')} icon={CheckSquare} active={isActive('/hr/tasks')} user={user} module="hr" />
        </NavSection>
        <NavSection title={t('support')}>
          <SidebarLink to="/services" label={t('serviceCatalog')} icon={Wrench} active={isActive('/services')} user={user} module="services" />
          <SidebarLink to="/support" label={t('tickets')} icon={TicketIcon} active={isActive('/support')} user={user} module="support" />
        </NavSection>
        <NavSection title={t('settings')}>
          <SidebarLink to="/settings" label={t('settings')} icon={SettingsIcon} active={isActive('/settings')} user={user} module="settings" />
          <SidebarLink to="/about" label={t('about')} icon={Info} active={isActive('/about')} user={user} module="about" />
        </NavSection>
      </nav>
      <div className="p-6 mt-auto border-t border-slate-800">
        <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest">
          <LogOut className="w-4 h-4" /> {t('signOut')}
        </button>
      </div>
    </div>
  );
};

const Header = ({ user, refreshData }: { user: User, refreshData: () => void }) => {
  const { t, language, setLanguage } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    const db = getDB();
    const filtered = (db.notifications || []).filter((n: AppNotification) => {
      if (n.userId === user.id) return true;
      if (n.role === user.role) return true;
      return false;
    });
    setNotifications(filtered);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markRead = (id: string) => {
    const db = getDB();
    db.notifications = db.notifications.map((n: AppNotification) => n.id === id ? { ...n, isRead: true } : n);
    saveDB(db);
    loadNotifications();
  };

  const markAllRead = () => {
    const db = getDB();
    db.notifications = db.notifications.map((n: AppNotification) => {
      if (n.userId === user.id || n.role === user.role) return { ...n, isRead: true };
      return n;
    });
    saveDB(db);
    loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 shrink-0 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 bg-slate-100/50 px-5 py-3 rounded-2xl w-96 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
          <Search className="w-5 h-5 text-slate-400" />
          <input type="text" placeholder={t('search')} className="bg-transparent border-none outline-none text-sm w-full font-medium" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        
        {/* BELL NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
           <button 
             onClick={() => setShowNotifications(!showNotifications)}
             className={`p-3 rounded-2xl transition-all relative border ${unreadCount > 0 ? 'bg-indigo-50 border-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
           >
              {unreadCount > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
           </button>

           {showNotifications && (
              <div className="absolute right-0 mt-4 w-96 bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 flex flex-col z-50 max-h-[500px]">
                 <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
                    <h4 className="font-black text-xs uppercase tracking-widest">{t('notifications')}</h4>
                    {unreadCount > 0 && <button onClick={markAllRead} className="text-[9px] font-black uppercase text-indigo-400 hover:text-white transition-colors">{t('markAllRead')}</button>}
                 </div>
                 <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
                    {notifications.length === 0 ? (
                       <div className="py-12 text-center text-slate-300 italic text-[10px] uppercase font-black">{t('noNotifications')}</div>
                    ) : (
                       notifications.map(n => (
                         <div key={n.id} className={`p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 relative ${!n.isRead ? 'bg-indigo-50/30' : ''}`}>
                            {!n.isRead && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600"></div>}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                               n.priority === NotificationPriority.CRITICAL ? 'bg-rose-100 text-rose-600' :
                               n.priority === NotificationPriority.HIGH ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                            }`}>
                               {n.type === NotificationType.MAINTENANCE ? <Wrench className="w-5 h-5" /> : n.type === NotificationType.FLEET ? <CarFront className="w-5 h-5" /> : <InfoIcon className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0" onClick={() => markRead(n.id)}>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{n.type} • {n.priority}</p>
                               <p className="text-xs font-black text-slate-900 leading-tight mb-1">{n.title}</p>
                               <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{n.message}</p>
                               <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => markRead(n.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
                         </div>
                       ))
                    )}
                 </div>
              </div>
           )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black">{user.username.charAt(0).toUpperCase()}</div>
          <div className="hidden md:block">
            <p className="text-[10px] font-black text-slate-900 leading-none">{user.firstName} {user.lastName.charAt(0)}.</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{user.role}</p>
          </div>
        </div>
        <button onClick={() => setLanguage(language === 'FR' ? 'EN' : 'FR')} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-white transition-all">
          <Globe className="w-4 h-4" /> {language === 'FR' ? 'FRANÇAIS' : 'ENGLISH'}
        </button>
        <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 px-4 py-2 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('sync')}</span>
          <Database className="w-4 h-4 text-indigo-400" />
        </div>
      </div>
    </header>
  );
};

const RoleGuard = ({ user, module, action = 'view', children }: { user: User, module: string, action?: PermissionAction, children?: React.ReactNode }) => {
  const { t, rolePermissions } = useLanguage();
  if (!hasPermission(user, module, action, rolePermissions)) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner"><Lock className="w-12 h-12" /></div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{t('unauthorized')}</h2>
        <p className="text-slate-500 max-w-md font-medium">{t('unauthorizedDesc')}</p>
        <Link to="/dashboard" className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">{t('back')} {t('dashboard')}</Link>
      </div>
    );
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLang] = useState<Language>('FR');
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [isInitializing, setIsInitializing] = useState(true);

  const loadPermissions = () => {
    const db = getDB();
    if (db.rolePermissions) setRolePermissions(db.rolePermissions);
  };

  useEffect(() => {
    const init = async () => {
      await initializeDB();
      const db = getDB();
      if (db.settings?.language) setLang(db.settings.language);
      if (db.rolePermissions) setRolePermissions(db.rolePermissions);
      const savedUser = localStorage.getItem('SAJITECH_AUTH');
      if (savedUser) setUser(JSON.parse(savedUser));
      setIsInitializing(false);
      
      // Pulse Engine Trigger
      runPulseChecks();
    };
    init();
  }, []);

  const setLanguage = (lang: Language) => { setLang(lang); const db = getDB(); db.settings.language = lang; saveDB(db); };
  const t = (key: string) => (translations[language] as any)[key] || key;

  if (isInitializing) return null;

  if (!user) return <HashRouter><Routes><Route path="*" element={<Login onLogin={(u) => { setUser(u); localStorage.setItem('SAJITECH_AUTH', JSON.stringify(u)); logAudit(u.id, 'System', 'Login', 'Session démarrée'); runPulseChecks(); }} />} /></Routes></HashRouter>;
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, rolePermissions, refreshPermissions: loadPermissions }}>
      <HashRouter>
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
          <Sidebar user={user} logout={() => { logAudit(user.id, 'System', 'Logout', 'Session terminée'); setUser(null); localStorage.removeItem('SAJITECH_AUTH'); }} />
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <Header user={user} refreshData={() => runPulseChecks()} />
            <main className="flex-1 overflow-auto p-10 bg-slate-50/50">
              <div className="max-w-7xl mx-auto h-full">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard user={user} />} />
                  <Route path="/calendar" element={<RoleGuard user={user} module="calendar"><Calendar /></RoleGuard>} />
                  <Route path="/reports" element={<RoleGuard user={user} module="reports"><Reports /></RoleGuard>} />
                  <Route path="/crm" element={<RoleGuard user={user} module="crm"><CRM /></RoleGuard>} />
                  <Route path="/pipeline" element={<RoleGuard user={user} module="pipeline"><Pipeline /></RoleGuard>} />
                  <Route path="/activities" element={<RoleGuard user={user} module="activities"><Activities /></RoleGuard>} />
                  <Route path="/stock" element={<RoleGuard user={user} module="stock"><Stock /></RoleGuard>} />
                  <Route path="/categories" element={<RoleGuard user={user} module="stock"><Categories /></RoleGuard>} />
                  <Route path="/services" element={<RoleGuard user={user} module="services"><ServicesPage /></RoleGuard>} />
                  <Route path="/pos" element={<RoleGuard user={user} module="pos" action="use"><POS user={user} /></RoleGuard>} />
                  <Route path="/invoices" element={<RoleGuard user={user} module="invoices"><Invoices /></RoleGuard>} />
                  <Route path="/suppliers" element={<RoleGuard user={user} module="suppliers"><Suppliers /></RoleGuard>} />
                  <Route path="/purchases" element={<RoleGuard user={user} module="purchases"><Purchases /></RoleGuard>} />
                  <Route path="/expenses" element={<RoleGuard user={user} module="expenses"><Expenses /></RoleGuard>} />
                  <Route path="/logistics" element={<RoleGuard user={user} module="logistics"><Logistics /></RoleGuard>} />
                  <Route path="/hr" element={<RoleGuard user={user} module="hr"><HR /></RoleGuard>} />
                  <Route path="/hr/teams" element={<RoleGuard user={user} module="hr"><HRTeams /></RoleGuard>} />
                  <Route path="/hr/leaves" element={<RoleGuard user={user} module="hr"><HRLeaves /></RoleGuard>} />
                  <Route path="/hr/tasks" element={<RoleGuard user={user} module="hr"><HRTasks /></RoleGuard>} />
                  <Route path="/support" element={<RoleGuard user={user} module="support"><Support /></RoleGuard>} />
                  <Route path="/settings" element={<RoleGuard user={user} module="settings"><Settings /></RoleGuard>} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </HashRouter>
    </LanguageContext.Provider>
  );
};
export default App;