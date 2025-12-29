
import { createClient } from '@supabase/supabase-js';
import { 
  AppNotification, NotificationPriority, NotificationType, UserRole, 
  Driver, Vehicle, Maintenance, Mission, MissionStatus, Invoice, 
  Ticket, TicketStatus, FuelLog 
} from './types';

// Identifiants réels fournis par l'utilisateur
const SUPABASE_URL = 'https://kcghkrqnkohmfninxltz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZ2hrcnFua29obWZuaW54bHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDAyOTUsImV4cCI6MjA4MjU3NjI5NX0.SmvvIDHJpY06KtpjoEVs4sYXpgN63B8g6X06IvTJrfA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STORAGE_KEY = 'SAJITECH_DB';

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const initializeDB = async () => {
  const existing = localStorage.getItem(STORAGE_KEY);
  const adminHash = await hashPassword('password');

  const initialState = {
    users: [{ id: '1', username: 'admin', firstName: 'Admin', lastName: 'Sajitech', role: UserRole.ADMIN, passwordHash: adminHash, isActive: true, createdAt: new Date().toISOString() }],
    notifications: [],
    rolePermissions: {
      [UserRole.ADMIN]: ['*'],
      [UserRole.MANAGER]: [
        'dashboard.view', 'reports.view', 'crm.*', 'pipeline.*', 'invoices.*', 
        'stock.*', 'suppliers.*', 'purchases.*', 'expenses.*', 'logistics.*', 'support.*'
      ],
      [UserRole.VENDEUR]: ['dashboard.view', 'crm.view', 'pos.use', 'invoices.create', 'stock.view'],
      [UserRole.TECHNICIEN]: ['dashboard.view', 'support.*', 'services.view'],
      [UserRole.CHAUFFEUR]: ['dashboard.view', 'logistics.view']
    },
    clients: [{ id: 'c1', name: 'Client de Passage', city: 'Casablanca', type: 'Particulier', status: 'Actif', createdAt: new Date().toISOString() }],
    suppliers: [],
    purchases: [],
    purchasePriceHistory: [],
    expenses: [],
    products: [],
    categories: [],
    services: [],
    invoices: [],
    clientActions: [],
    auditLogs: [],
    calendarEvents: [],
    tasks: [],
    opportunities: [],
    activities: [],
    tickets: [],
    conversations: [],
    messages: [],
    employees: [],
    employeeServices: [],
    stockMovements: [],
    vehicles: [],
    drivers: [],
    missions: [],
    fuelLogs: [],
    maintenances: [],
    settings: {
      companyName: 'SAJITECH ENTERPRISE',
      ice: '000000000000000',
      if: '00000000',
      rc: '000000',
      address: 'Casablanca, Maroc',
      phone: '+212 5XX XX XX XX',
      email: 'contact@sajitech.ma',
      logo: '',
      signature: '',
      footerMessage: 'Merci de votre confiance.',
      language: 'FR',
      nextInvoiceIndex: 1,
      currentYear: new Date().getFullYear()
    }
  };

  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
  }
};

export const getDB = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
export const saveDB = (data: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const syncToCloud = async (userId: string) => {
    const localData = getDB();
    const { error } = await supabase
        .from('backups')
        .upsert({ 
            user_id: userId, 
            data_blob: localData, 
            updated_at: new Date().toISOString() 
        }, { onConflict: 'user_id' });
    
    if (error) throw error;
    return true;
};

export const pullFromCloud = async (userId: string) => {
    const { data, error } = await supabase
        .from('backups')
        .select('data_blob')
        .eq('user_id', userId)
        .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no results
    if (data?.data_blob) {
        saveDB(data.data_blob);
        return true;
    }
    return false;
};

export const createNotification = (data: Partial<AppNotification>) => {
  const db = getDB();
  const notif: AppNotification = {
    id: `NTF-${Date.now()}`,
    type: data.type || NotificationType.SYSTEM,
    priority: data.priority || NotificationPriority.LOW,
    title: data.title || 'Alerte',
    message: data.message || '',
    userId: data.userId,
    role: data.role,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  db.notifications = [notif, ...(db.notifications || [])].slice(0, 500);
  saveDB(db);
  return notif;
};

export const calculateDriverScore = (driverId: string, db: any) => {
  const missions = (db.missions || []).filter((m: Mission) => m.driverId === driverId && m.status === MissionStatus.COMPLETED);
  const fuel = (db.fuelLogs || []).filter((f: FuelLog) => f.driverId === driverId);
  
  if (missions.length === 0) return 70;

  const totalMissions = (db.missions || []).filter((m: Mission) => m.driverId === driverId).length;
  const trajetScore = (missions.length / (totalMissions || 1)) * 100;

  const totalKm = missions.reduce((acc: number, m: Mission) => acc + ((m.endKm || 0) - m.startKm), 0);
  const totalLiters = fuel.reduce((acc: number, f: FuelLog) => acc + f.liters, 0);
  const ratio = totalKm > 0 ? (totalLiters / totalKm) * 100 : 10;
  const fuelScore = Math.max(0, 100 - (ratio - 8) * 10);

  const kmConsistency = totalKm > 0 ? 100 : 50;

  const finalScore = (trajetScore * 0.4) + (fuelScore * 0.3) + (kmConsistency * 0.3);
  return Math.min(100, Math.round(finalScore));
};

export const runPulseChecks = () => {
  const db = getDB();
  const now = new Date();

  if (db.drivers) {
    db.drivers = db.drivers.map((d: Driver) => ({
      ...d,
      smartScore: calculateDriverScore(d.id, db)
    }));
  }

  (db.tickets || []).forEach((tk: Ticket) => {
    if (tk.status !== TicketStatus.RESOLVED && tk.status !== TicketStatus.CLOSED) {
      if (tk.slaDeadline && new Date(tk.slaDeadline) < now) {
        if (!db.notifications.some((n: any) => n.relatedEntityId === tk.id && n.priority === NotificationPriority.CRITICAL)) {
          createNotification({
            type: NotificationType.SUPPORT,
            priority: NotificationPriority.CRITICAL,
            title: `SLA Dépassé : Ticket ${tk.id}`,
            message: `Le ticket "${tk.subject}" nécessite une intervention immédiate.`,
            role: UserRole.MANAGER
          });
        }
      }
    }
  });

  saveDB(db);
};

export const logAudit = (userId: string, module: string, action: string, details: string) => {
  const db = getDB();
  const log = { id: `LOG-${Date.now()}`, userId, module, action, details, createdAt: new Date().toISOString() };
  db.auditLogs = [log, ...(db.auditLogs || [])].slice(0, 1000);
  saveDB(db);
};

export const logClientAction = (clientId: string, userId: string, type: string, description: string, amount?: number) => {
  const db = getDB();
  const action = { id: `ACT-${Date.now()}`, clientId, userId, type, description, amount, createdAt: new Date().toISOString() };
  db.clientActions = [action, ...(db.clientActions || [])];
  saveDB(db);
};

export const getNextInvoiceRef = (db: any) => {
  const year = new Date().getFullYear();
  let index = db.settings.nextInvoiceIndex;
  if (db.settings.currentYear !== year) index = 1;
  const formattedIndex = String(index).padStart(6, '0');
  return { num: `SJ-${year}-${formattedIndex}`, newIndex: index + 1, year };
};

export const numberToWordsDH = (amount: number): string => amount.toString() + " DH";
