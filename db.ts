
import { createClient } from '@supabase/supabase-js';
import { 
  AppNotification, NotificationPriority, NotificationType, UserRole, 
  Driver, Vehicle, Maintenance, Mission, MissionStatus, Invoice, 
  Ticket, TicketStatus, FuelLog, VehicleStatus 
} from './types';

// Identifiants Supabase
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
  if (!existing) {
    const initialState = {
      users: [],
      notifications: [],
      rolePermissions: {
        [UserRole.ADMIN]: ['*'],
        [UserRole.MANAGER]: ['dashboard.view', 'reports.view', 'crm.*', 'pipeline.*', 'invoices.*', 'stock.*', 'suppliers.*', 'purchases.*', 'expenses.*', 'logistics.*', 'support.*'],
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
      sales: [],
      leaveTypes: [{ id: 'lt1', name: 'Congé Annuel' }, { id: 'lt2', name: 'Maladie' }, { id: 'lt3', name: 'Exceptionnel' }],
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
  }
};

export const getDB = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Local Storage Error:", e);
    return {};
  }
};

export const saveDB = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const syncToCloud = async (userId: string) => {
    const localData = getDB();
    try {
        const { error } = await supabase
            .from('backups')
            .upsert({ 
                user_id: userId, 
                data_blob: localData, 
                updated_at: new Date().toISOString() 
            }, { onConflict: 'user_id' });
        
        if (error) {
            // Error code 42P01 means table does not exist
            const msg = error.code === '42P01' 
                ? "Table 'backups' manquante sur Supabase. Synchronisation désactivée." 
                : (error.message || "Erreur Cloud inconnue");
            console.warn("Cloud Sync Warning:", msg);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Sync Catch Error:", err);
        return false;
    }
};

export const pullFromCloud = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('backups')
            .select('data_blob')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01') {
                return false; 
            }
            throw new Error(error.message || "Erreur lors du pull");
        }
        
        if (data?.data_blob) {
            saveDB(data.data_blob);
            return true;
        }
        return false;
    } catch (err) {
        console.error("Pull Catch Error:", err);
        return false;
    }
};

export const logAudit = (userId: string, module: string, action: string, details: string) => {
  const db = getDB();
  const log = { id: `LOG-${Date.now()}`, userId, module, action, details, createdAt: new Date().toISOString() };
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs = [log, ...db.auditLogs].slice(0, 1000);
  saveDB(db);
};

export const logClientAction = (clientId: string, userId: string, type: string, description: string, amount?: number) => {
  const db = getDB();
  const action = { id: `ACT-${Date.now()}`, clientId, userId, type, description, amount, createdAt: new Date().toISOString() };
  if (!db.clientActions) db.clientActions = [];
  db.clientActions = [action, ...db.clientActions];
  saveDB(db);
};

export const getNextInvoiceRef = (db: any) => {
  const year = new Date().getFullYear();
  let index = db.settings.nextInvoiceIndex || 1;
  if (db.settings.currentYear !== year) index = 1;
  const formattedIndex = String(index).padStart(6, '0');
  return { num: `SJ-${year}-${formattedIndex}`, newIndex: index + 1, year };
};

export const numberToWordsDH = (amount: number): string => amount.toString() + " DH";

// Fix: implemented runPulseChecks to resolve import error in App.tsx
export const runPulseChecks = () => {
  const db = getDB();
  const notifications: AppNotification[] = db.notifications || [];
  const newNotifications: AppNotification[] = [];

  // 1. Check for low stock
  if (db.products) {
    db.products.forEach((p: any) => {
      if (p.stockQty <= p.minStock) {
        const id = `NOTIF-STOCK-${p.id}`;
        if (!notifications.some(n => n.id === id)) {
          newNotifications.push({
            id,
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.HIGH,
            title: 'Alerte Stock Bas',
            message: `Le produit ${p.name} est en rupture ou sous le seuil minimum (${p.stockQty} ${p.unit} restants).`,
            role: UserRole.MANAGER,
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    });
  }

  // 2. Check for maintenance
  if (db.vehicles) {
      db.vehicles.forEach((v: any) => {
          if (v.status === VehicleStatus.MAINTENANCE) {
              const id = `NOTIF-MAINT-${v.id}`;
              if (!notifications.some(n => n.id === id)) {
                newNotifications.push({
                  id,
                  type: NotificationType.MAINTENANCE,
                  priority: NotificationPriority.MEDIUM,
                  title: 'Entretien requis',
                  message: `Le véhicule ${v.plate} nécessite une révision technique.`,
                  role: UserRole.CHAUFFEUR,
                  isRead: false,
                  createdAt: new Date().toISOString()
                });
              }
          }
      });
  }

  if (newNotifications.length > 0) {
    db.notifications = [...newNotifications, ...notifications];
    saveDB(db);
  }
};
