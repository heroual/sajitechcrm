

export enum UserRole {
  ADMIN = 'Admin',
  VENDEUR = 'Vendeur',
  TECHNICIEN = 'Technicien',
  MANAGER = 'Manager',
  CHAUFFEUR = 'Chauffeur'
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'validate' | 'export' | 'configure' | 'use';

export interface AppPermission {
  module: string;
  actions: PermissionAction[];
}

// --- NOTIFICATIONS SYSTEM ---
export enum NotificationPriority {
  LOW = 'Info',
  MEDIUM = 'Action Requise',
  HIGH = 'Urgent',
  CRITICAL = 'Critique'
}

export enum NotificationType {
  SYSTEM = 'Système',
  FLEET = 'Flotte',
  MAINTENANCE = 'Maintenance',
  SUPPORT = 'Support',
  FINANCE = 'Finance',
  HR = 'RH'
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  userId?: string;
  role?: UserRole;
  isRead: boolean;
  createdAt: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  expiresAt?: string;
}

// --- EXECUTIVE REPORTING ---
export enum ReportFrequency {
  DAILY = 'Quotidien',
  WEEKLY = 'Hebdomadaire',
  MONTHLY = 'Mensuel'
}

export interface ExecutiveInsight {
  type: 'Positive' | 'Negative' | 'Neutral';
  title: string;
  message: string;
  impact: string;
}

// --- LOGISTICS & SCORING ---
export enum VehicleType { CAR = 'Voiture', VAN = 'Utilitaire', TRUCK = 'Camion', MOTO = 'Moto' }
export enum VehicleStatus { ACTIVE = 'Actif', MAINTENANCE = 'En Maintenance', OUT = 'Hors Service' }
export enum MissionStatus { PLANNED = 'Planifiée', ONGOING = 'En cours', COMPLETED = 'Terminée', CANCELLED = 'Annulée' }

export interface Driver { 
  id: string; 
  name: string; 
  cin: string; 
  phone: string; 
  licenseExpiry: string; 
  status: 'Actif' | 'Suspendu' | 'Inactif'; 
  linkedUserId?: string; 
  smartScore?: number;
  contractType: string;
  createdAt: string;
}

export interface Vehicle { 
  id: string; 
  plate: string; 
  brand: string; 
  model: string; 
  currentKm: number; 
  status: VehicleStatus; 
  createdAt: string; 
}

export interface Mission { 
  id: string; 
  number: string; 
  status: MissionStatus; 
  startDate: string; 
  vehicleId: string; 
  driverId: string; 
  startKm: number; 
  endKm?: number; 
  destination: string;
  createdAt: string; 
}

export interface FuelLog { 
  id: string; 
  date: string; 
  vehicleId: string; 
  driverId: string; 
  liters: number; 
  totalAmount: number; 
  odometer: number; 
}

export interface Maintenance { 
  id: string; 
  vehicleId: string; 
  type: string; 
  date: string; 
  cost: number; 
  nextEcheanceKm?: number; 
}

// --- SUPPORT & CX ---
export enum TicketStatus { OPEN = 'Ouvert', IN_PROGRESS = 'En cours', RESOLVED = 'Résolu', CLOSED = 'Fermé' }
export enum TicketPriority { LOW = 'Basse', MEDIUM = 'Moyenne', HIGH = 'Haute', CRITICAL = 'Critique' }
export enum TicketCategory { TECH = 'Technique', LOGISTICS = 'Logistique', BILLING = 'Facturation', OTHER = 'Autre' }

export interface Ticket {
  id: string;
  clientId?: string;
  userId: string;
  assignedTo?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  relatedVehicleId?: string;
  relatedDriverId?: string;
  slaDeadline?: string;
  resolutionTime?: number; // minutes
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  attachment?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessageAt: string;
  type: 'Direct' | 'Ticket';
  relatedTicketId?: string;
}

// --- FINANCE & CRM ---
export enum ItemType { PRODUCT = 'PRODUIT', SERVICE = 'SERVICE' }
export enum ClientType { PARTICULIER = 'Particulier', SOCIETE = 'Société' }
export enum ClientStatus { ACTIVE = 'Actif', BLOCKED = 'Bloqué' }
export enum InvoiceType { MIXED = 'Mixte', PRODUCT = 'Produit', SERVICE = 'Service', AVOIR = 'Avoir' }
export enum InvoiceStatus { DRAFT = 'Draft', VALIDATED = 'Validated', PAID = 'Paid', CANCELLED = 'Cancelled' }
export enum PurchaseStatus { DRAFT = 'Brouillon', VALIDATED = 'Validé' }

export interface Product { id: string; name: string; sku: string; categoryId: string; price: number; cost: number; unit: string; stockQty: number; minStock: number; tva: number; image?: string; }
export interface Category { id: string; name: string; description?: string; createdAt: string; }
export interface Service { id: string; reference: string; name: string; description: string; categoryId: string; status: string; priceHT: number; tvaRate: number; unit: string; isVariablePrice: boolean; isTechAssignable: boolean; isRecurring: boolean; }

// Fix: added discount property to InvoiceLine to resolve assignment errors
export interface InvoiceLine { id: string; itemId: string; itemType: ItemType; description: string; quantity: number; unit: string; priceHT: number; tvaRate: number; discount?: number; totalHT: number; totalTVA: number; totalTTC: number; }
export interface Invoice { id: string; number: string; type: InvoiceType; status: InvoiceStatus; clientId: string; userId: string; lines: InvoiceLine[]; totalHT: number; totalTVA: number; totalTTC: number; globalDiscount: number; paidAmount: number; createdAt: string; dueDate: string; validatedAt?: string; }

export interface Client { id: string; name: string; type: ClientType; status: ClientStatus; phone: string; city: string; ice?: string; address?: string; createdAt: string; }
export interface ClientAction { id: string; clientId: string; userId: string; type: string; description: string; amount?: number; createdAt: string; }

export interface PurchaseLine { id: string; productId: string; description: string; quantity: number; unit: string; pricePurchaseHT: number; tvaRate: number; totalHT: number; totalTTC: number; }
export interface Purchase { id: string; number: string; supplierId: string; status: PurchaseStatus; date: string; lines: PurchaseLine[]; totalHT: number; totalTVA: number; totalTTC: number; createdAt: string; }
export interface Supplier { id: string; name: string; type: any; ice?: string; if?: string; phone: string; email: string; city: string; createdAt: string; }
export interface Expense { id: string; category: string; amount: number; label: string; date: string; paymentMethod: string; }

// Fix: added teamId to Task to resolve missing property error in HR_Tasks
export interface Task { id: string; title: string; description: string; priority: string; status: string; assignedTo: string; teamId?: string; dueDate: string; createdAt: string; }
export interface Employee { id: string; name: string; role: string; salary: number; hireDate: string; }
export interface EmployeeService { id: string; employeeId: string; serviceId: string; commissionPercentage: number; }
export interface CalendarEvent { id: string; title: string; type: string; status: string; startDate: string; }

// Fix: defined SaleItem and updated Sale to include it and globalDiscount
export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  catalogPrice: number;
  priceHT: number;
  discount: number;
  tva: number;
}

export interface Sale { 
  id: string; 
  userId: string; 
  items: SaleItem[]; 
  globalDiscount?: number;
  totalTTC: number; 
  totalHT: number; 
  totalTVA: number; 
  paymentMode: string; 
  status: string; 
  createdAt: string; 
}

export interface StockMovement { id: string; productId: string; type: string; quantity: number; reason: string; userId: string; createdAt: string; }
export interface AuditLog { id: string; userId: string; action: string; module: string; details: string; createdAt: string; }
export interface Opportunity { id: string; title: string; expectedValue: number; probability: number; stage: string; closeDate: string; assignedTo: string; }
export interface Activity { id: string; type: 'Call' | 'Meeting' | 'Email' | 'Note'; status: 'Pending' | 'Completed'; dueDate: string; subject: string; description: string; createdAt: string; }
export interface User { id: string; username: string; firstName: string; lastName: string; role: UserRole; passwordHash?: string; isActive: boolean; createdAt: string; }
export interface PurchasePriceLog { id: string; productId: string; supplierId: string; priceHT: number; date: string; purchaseId: string; }

// Fix: added missing Team and TeamMember interfaces
export interface Team {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  employeeId: string;
}

// Fix: added missing Leave interface
export interface Leave {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}
