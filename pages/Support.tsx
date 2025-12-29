import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getDB, saveDB, logAudit } from '../db';
import { 
  Ticket, Message, Conversation, User as SajitechUser, UserRole, 
  TicketStatus, TicketPriority, TicketCategory, Client, Vehicle, Driver
} from '../types';
import { 
  Plus, Search, MessageSquare, Clock, Pencil, Trash2, X, Send, 
  Paperclip, ShieldAlert, CheckCircle2, Filter, ChevronRight, 
  User as UserIcon, Tag, AlertTriangle, Inbox, Image as ImageIcon,
  LifeBuoy, MessageCircle, MoreVertical, Link as LinkIcon, ExternalLink,
  CarFront, Users, History as HistoryIcon
} from 'lucide-react';
import { useLanguage } from '../App';

export default function Support() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<SajitechUser | null>(null);
  const [db, setDb] = useState(getDB());
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketData, setNewTicketData] = useState<Partial<Ticket>>({
    category: TicketCategory.TECH,
    priority: TicketPriority.MEDIUM,
    subject: '',
    description: ''
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const auth = localStorage.getItem('SAJITECH_AUTH');
    if (auth) setCurrentUser(JSON.parse(auth));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConvId, db.messages]);

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  const filteredConversations = useMemo(() => {
    const convs = (db.conversations || []) as Conversation[];
    return convs.filter(c => {
      if (isAdmin) return true;
      return c.participants.includes(currentUser?.id || '');
    }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [db.conversations, currentUser, isAdmin]);

  const activeConv = useMemo(() => db.conversations?.find((c: Conversation) => c.id === selectedConvId), [selectedConvId, db.conversations]);
  const activeMessages = useMemo(() => (db.messages || []).filter((m: Message) => m.conversationId === selectedConvId), [selectedConvId, db.messages]);
  const relatedTicket = useMemo(() => db.tickets?.find((t: Ticket) => t.id === activeConv?.relatedTicketId), [activeConv, db.tickets]);

  const handleSendMessage = (text: string, attachment?: string) => {
    if (!selectedConvId || (!text.trim() && !attachment)) return;
    const newMessage: Message = { id: `MSG-${Date.now()}`, conversationId: selectedConvId, senderId: currentUser?.id || 'system', senderName: currentUser?.firstName || 'User', text, attachment, createdAt: new Date().toISOString() };
    const newDb = { ...db };
    newDb.messages = [...(db.messages || []), newMessage];
    newDb.conversations = db.conversations.map((c: Conversation) => c.id === selectedConvId ? { ...c, lastMessageAt: newMessage.createdAt } : c);
    saveDB(newDb);
    setDb(newDb);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketData.subject) return;

    const ticketId = `TK-${Date.now()}`;
    const convId = `CV-TK-${Date.now()}`;
    
    // SLA Calculation
    const deadline = new Date();
    const slaHours = newTicketData.priority === TicketPriority.CRITICAL ? 2 : newTicketData.priority === TicketPriority.HIGH ? 8 : 48;
    deadline.setHours(deadline.getHours() + slaHours);

    const newTicket: Ticket = {
      ...newTicketData,
      id: ticketId,
      userId: currentUser?.id || 'unknown',
      status: TicketStatus.OPEN,
      slaDeadline: deadline.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Ticket;

    const newConv: Conversation = { id: convId, participants: [currentUser?.id || '', '1'], type: 'Ticket', relatedTicketId: ticketId, lastMessageAt: new Date().toISOString() };
    const firstMsg: Message = { id: `MSG-INIT-${Date.now()}`, conversationId: convId, senderId: currentUser?.id || 'system', senderName: currentUser?.firstName || 'User', text: `[Ticket : ${newTicket.category}] ${newTicket.description}`, createdAt: new Date().toISOString() };

    const newDb = { ...db };
    newDb.tickets = [newTicket, ...(db.tickets || [])];
    newDb.conversations = [newConv, ...(db.conversations || [])];
    newDb.messages = [firstMsg, ...(db.messages || [])];

    saveDB(newDb);
    setDb(newDb);
    setShowNewTicketModal(false);
    setSelectedConvId(convId);
    logAudit(currentUser?.username || 'system', 'Support', 'Create Ticket', `${newTicket.subject}`);
  };

  const getPriorityStyle = (p: TicketPriority) => {
    switch(p) {
      case TicketPriority.CRITICAL: return 'bg-rose-600 text-white animate-pulse';
      case TicketPriority.HIGH: return 'bg-rose-100 text-rose-700';
      case TicketPriority.MEDIUM: return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 animate-in fade-in duration-500 overflow-hidden">
      <div className="w-96 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
         <div className="p-8 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Support CX</h3>
               <button onClick={() => setShowNewTicketModal(true)} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
            </div>
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
               <input type="text" placeholder="Chercher un ticket..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none font-bold" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
         </div>

         <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-2">
            {filteredConversations.map((conv) => {
               const ticket = db.tickets?.find((t: Ticket) => t.id === conv.relatedTicketId);
               const isActive = selectedConvId === conv.id;
               return (
                  <button key={conv.id} onClick={() => setSelectedConvId(conv.id)} className={`w-full text-left p-5 rounded-[2rem] transition-all border ${isActive ? 'bg-[#0f172a] text-white' : 'bg-white hover:bg-slate-50'}`}>
                     <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${ticket ? getPriorityStyle(ticket.priority) : 'bg-slate-100'}`}>
                           {ticket ? ticket.priority : 'Direct'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">{new Date(conv.lastMessageAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                     </div>
                     <p className="font-black text-sm truncate mb-1">{ticket ? ticket.subject : 'Discussion direct'}</p>
                     <p className="text-[10px] font-medium opacity-60 truncate">SLA: {ticket?.slaDeadline ? new Date(ticket.slaDeadline).toLocaleDateString() : 'Zéro'}</p>
                  </button>
               );
            })}
         </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
         {selectedConvId ? (
            <>
               <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-6">
                     <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl"><LifeBuoy className="w-7 h-7" /></div>
                     <div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">{relatedTicket?.subject || 'Discussion'}</h4>
                        <div className="flex items-center gap-4 mt-1">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Tag className="w-3 h-3" /> {relatedTicket?.category}</span>
                           <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2"><Clock className="w-3 h-3" /> SLA: {relatedTicket?.slaDeadline ? new Date(relatedTicket.slaDeadline).toLocaleString() : 'N/A'}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     {relatedTicket?.relatedVehicleId && <div className="p-3 bg-slate-50 rounded-xl text-slate-500"><CarFront className="w-5 h-5" /></div>}
                     {relatedTicket?.relatedDriverId && <div className="p-3 bg-slate-50 rounded-xl text-slate-500"><Users className="w-5 h-5" /></div>}
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-hide bg-slate-50/40">
                  {activeMessages.map((msg) => {
                     const isMine = msg.senderId === currentUser?.id;
                     return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[70%] p-5 rounded-[2rem] shadow-sm ${isMine ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                              <p className="text-sm font-medium">{msg.text}</p>
                              <p className={`text-[8px] mt-2 font-black uppercase opacity-40`}>{new Date(msg.createdAt).toLocaleTimeString()}</p>
                           </div>
                        </div>
                     );
                  })}
                  <div ref={chatEndRef} />
               </div>

               <div className="p-8 bg-white border-t border-slate-100 flex items-center gap-4">
                  <input 
                    type="text" 
                    placeholder="Tapez votre réponse..." 
                    className="flex-1 bg-slate-50 border-none outline-none py-4 px-6 rounded-2xl font-medium text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                    onKeyDown={(e) => { if(e.key === 'Enter') { handleSendMessage(e.currentTarget.value); e.currentTarget.value = ''; } }}
                  />
                  <button className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"><Send className="w-6 h-6" /></button>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20"><MessageCircle className="w-20 h-20 mb-4" /><p className="font-black uppercase tracking-widest text-xs">Sélectionnez une discussion</p></div>
         )}
      </div>

      {showNewTicketModal && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
               <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase tracking-tight">Ouvrir un Dossier Support</h3>
                  <button onClick={() => setShowNewTicketModal(false)}><X className="w-6 h-6" /></button>
               </div>
               <form onSubmit={handleCreateTicket} className="p-10 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</label>
                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={newTicketData.category} onChange={e => setNewTicketData({...newTicketData, category: e.target.value as any})}>
                           {Object.values(TicketCategory).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgence</label>
                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={newTicketData.priority} onChange={e => setNewTicketData({...newTicketData, priority: e.target.value as any})}>
                           {Object.values(TicketPriority).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client concerné</label>
                    <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={newTicketData.clientId} onChange={e => setNewTicketData({...newTicketData, clientId: e.target.value})}>
                        <option value="">Sélectionner un client...</option>
                        {db.clients.map((c:Client) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objet</label>
                     <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={newTicketData.subject} onChange={e => setNewTicketData({...newTicketData, subject: e.target.value})} />
                  </div>
                  <textarea required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm outline-none min-h-[120px]" placeholder="Description précise..." value={newTicketData.description} onChange={e => setNewTicketData({...newTicketData, description: e.target.value})} />
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Valider & Créer le Ticket</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
