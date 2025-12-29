
import React, { useState, useMemo, useEffect } from 'react';
import { getDB, saveDB, getNextInvoiceRef, numberToWordsDH, logAudit, logClientAction } from '../db';
import { 
  FileText, Plus, Search, Filter, Printer, Download, Eye, 
  CheckCircle2, AlertCircle, X, Save, Trash2, Receipt, 
  PlusCircle, MinusCircle, User as UserIcon, Package, Wrench, ShieldAlert,
  Calendar, CreditCard, ChevronRight, LayoutList
} from 'lucide-react';
import { useLanguage, formatMAD } from '../App';
import { Invoice, InvoiceStatus, InvoiceType, Client, Product, Service, InvoiceLine, ItemType, UserRole } from '../types';

export default function Invoices() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [showEditor, setShowEditor] = useState(false);
  const [showMotifModal, setShowMotifModal] = useState<{id: string, action: 'cancel' | 'delete'} | null>(null);
  const [motif, setMotif] = useState('');
  
  const [currentInvoice, setCurrentInvoice] = useState<Partial<Invoice> | null>(null);
  const [search, setSearch] = useState('');

  const invoices = useMemo(() => (db.invoices || []).filter((inv: Invoice) => 
    inv.number.toLowerCase().includes(search.toLowerCase()) ||
    (db.clients.find((c: any) => c.id === inv.clientId)?.name || '').toLowerCase().includes(search.toLowerCase())
  ), [db.invoices, db.clients, search]);

  const clients = db.clients || [];
  const products = db.products || [];
  const services = db.services || [];

  const openEditor = (invoice: Invoice | null = null) => {
    if (invoice) {
      setCurrentInvoice({ ...invoice });
    } else {
      setCurrentInvoice({
        id: `INV-${Date.now()}`,
        number: 'BROUILLON',
        type: InvoiceType.MIXED,
        status: InvoiceStatus.DRAFT,
        clientId: '',
        userId: 'admin',
        lines: [],
        globalDiscount: 0,
        totalHT: 0, totalTVA: 0, totalTTC: 0, paidAmount: 0,
        dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });
    }
    setShowEditor(true);
  };

  const calculateTotals = (lines: InvoiceLine[], globalDiscount: number) => {
    const totalHT = lines.reduce((sum, l) => sum + (Number(l.totalHT) || 0), 0);
    const totalTVA = lines.reduce((sum, l) => sum + (Number(l.totalTVA) || 0), 0);
    const discount = Number(globalDiscount) || 0;
    const totalTTC = (totalHT + totalTVA) - discount;
    return { 
      totalHT: Number(totalHT.toFixed(2)) || 0, 
      totalTVA: Number(totalTVA.toFixed(2)) || 0, 
      totalTTC: Number(totalTTC.toFixed(2)) || 0 
    };
  };

  const addLine = (item: Product | Service, type: ItemType) => {
    if (!currentInvoice) return;
    
    let priceHT = 0;
    let tvaRate = 20;
    
    if (type === ItemType.PRODUCT) {
      const p = item as Product;
      const basePrice = Number(p.price) || 0;
      const tva = Number(p.tva) || 20;
      priceHT = basePrice / (1 + tva / 100);
      tvaRate = tva;
    } else {
      const s = item as Service;
      priceHT = Number(s.priceHT) || 0;
      tvaRate = Number(s.tvaRate) || 20;
    }

    const newLine: InvoiceLine = {
      id: `L-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      itemId: item.id,
      itemType: type,
      description: item.name,
      quantity: 1,
      unit: type === ItemType.PRODUCT ? (item as Product).unit : (item as Service).unit,
      priceHT: Number(priceHT.toFixed(2)),
      tvaRate: tvaRate,
      discount: 0,
      totalHT: Number(priceHT.toFixed(2)),
      totalTVA: Number((priceHT * (tvaRate / 100)).toFixed(2)),
      totalTTC: Number((priceHT * (1 + tvaRate / 100)).toFixed(2))
    };

    const newLines = [...(currentInvoice.lines || []), newLine];
    const totals = calculateTotals(newLines, currentInvoice.globalDiscount || 0);
    setCurrentInvoice({ ...currentInvoice, lines: newLines, ...totals });
  };

  const updateLineField = (lineId: string, field: keyof InvoiceLine, value: any) => {
    if (!currentInvoice) return;
    const newLines = (currentInvoice.lines || []).map(l => {
      if (l.id === lineId) {
        const updated = { ...l, [field]: value };
        const qty = Number(updated.quantity) || 0;
        const pu = Number(updated.priceHT) || 0;
        const tva = Number(updated.tvaRate) || 0;
        
        updated.totalHT = Number((qty * pu).toFixed(2)) || 0;
        updated.totalTVA = Number((updated.totalHT * (tva / 100)).toFixed(2)) || 0;
        updated.totalTTC = Number((updated.totalHT + updated.totalTVA).toFixed(2)) || 0;
        return updated;
      }
      return l;
    });
    const totals = calculateTotals(newLines, currentInvoice.globalDiscount || 0);
    setCurrentInvoice({ ...currentInvoice, lines: newLines, ...totals });
  };

  const removeLine = (lineId: string) => {
    if (!currentInvoice) return;
    const newLines = (currentInvoice.lines || []).filter(l => l.id !== lineId);
    const totals = calculateTotals(newLines, currentInvoice.globalDiscount || 0);
    setCurrentInvoice({ ...currentInvoice, lines: newLines, ...totals });
  };

  const handleSaveDraft = () => {
    if (!currentInvoice?.clientId) return alert("Veuillez sélectionner un client.");
    const currentDb = getDB();
    const existingIdx = currentDb.invoices.findIndex((inv: Invoice) => inv.id === currentInvoice.id);
    
    const invoiceToSave = { ...currentInvoice, updatedAt: new Date().toISOString() };

    if (existingIdx > -1) {
      currentDb.invoices[existingIdx] = invoiceToSave;
    } else {
      currentDb.invoices = [invoiceToSave, ...currentDb.invoices];
    }

    saveDB(currentDb);
    setDb(currentDb);
    setShowEditor(false);
    logAudit('admin', 'Billing', 'Save', `Brouillon ${currentInvoice.id} enregistré.`);
  };

  const validateInvoice = () => {
    if (!currentInvoice?.lines?.length) return alert("La facture est vide.");
    if (!currentInvoice.clientId) return alert("Sélectionnez un client destinataire.");
    if (!window.confirm("Valider cette facture générera un numéro officiel. Continuer ?")) return;

    const finalDb = getDB();
    const { num, newIndex, year } = getNextInvoiceRef(finalDb);
    finalDb.settings.nextInvoiceIndex = newIndex;
    finalDb.settings.currentYear = year;

    const validatedInvoice = { 
      ...currentInvoice, 
      status: InvoiceStatus.VALIDATED, 
      number: num,
      validatedAt: new Date().toISOString() 
    } as Invoice;

    validatedInvoice.lines.forEach(line => {
      if (line.itemType === ItemType.PRODUCT && line.itemId) {
        const pIdx = finalDb.products.findIndex((p: Product) => p.id === line.itemId);
        if (pIdx > -1) {
          finalDb.products[pIdx].stockQty = Number(finalDb.products[pIdx].stockQty) - Number(line.quantity);
        }
      }
    });

    const idx = finalDb.invoices.findIndex((i: Invoice) => i.id === validatedInvoice.id);
    if (idx > -1) finalDb.invoices[idx] = validatedInvoice;
    else finalDb.invoices = [validatedInvoice, ...finalDb.invoices];

    saveDB(finalDb);
    setDb(finalDb);
    setCurrentInvoice(validatedInvoice);
    
    // Fix: logClientAction call corrected (removed extra argument and ensured correct count)
    logClientAction(validatedInvoice.clientId, 'admin', 'Sale', `Facture validée : ${num}`, validatedInvoice.totalTTC);

    logAudit('admin', 'Billing', 'Validate', `Facture ${num} validée.`);
    alert(`Facture ${num} validée avec succès !`);
  };

  const handleActionWithMotif = () => {
    if (!showMotifModal || !motif.trim()) return alert("Motif obligatoire.");
    const currentDb = getDB();
    const invIdx = currentDb.invoices.findIndex((inv: Invoice) => inv.id === showMotifModal.id);
    
    if (invIdx > -1) {
      const inv = currentDb.invoices[invIdx];
      if (showMotifModal.action === 'cancel') {
        inv.status = InvoiceStatus.CANCELLED;
        inv.cancellationReason = motif;
      } else {
        currentDb.invoices.splice(invIdx, 1);
      }
      saveDB(currentDb);
      setDb(currentDb);
    }
    setShowMotifModal(null);
    setMotif('');
    setShowEditor(false);
  };

  const handlePrint = (inv: Invoice) => {
    const client = db.clients.find((c: any) => c.id === inv.clientId);
    const settings = db.settings;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Facture ${inv.number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; margin-bottom: 50px; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; }
            .logo { height: 70px; }
            .company-info { text-align: right; font-size: 11px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .client-box { background: #f8fafc; padding: 25px; border-radius: 15px; width: 45%; }
            .invoice-box { text-align: right; width: 45%; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background: #0f172a; color: white; padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .totals { margin-top: 30px; display: flex; justify-content: flex-end; }
            .totals-table { width: 300px; }
            .totals-table tr td { padding: 5px 0; }
            .grand-total { font-weight: 900; font-size: 20px; color: #4f46e5; border-top: 2px solid #0f172a; padding-top: 10px !important; }
            .footer { margin-top: 80px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
            .signature { margin-top: 40px; text-align: right; }
            .signature img { height: 80px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings.logo ? `<img src="${settings.logo}" class="logo" />` : `<h1>${settings.companyName}</h1>`}
            <div class="company-info">
              <div style="font-weight: 900; font-size: 16px;">${settings.companyName}</div>
              <div>${settings.address}</div>
              <div>Tél: ${settings.phone} | ${settings.email}</div>
              <div style="margin-top:5px; font-weight: bold;">ICE: ${settings.ice} | IF: ${settings.if} | RC: ${settings.rc}</div>
            </div>
          </div>
          <div class="details">
            <div class="client-box">
              <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 10px;">Facturer à</div>
              <div style="font-weight: 900; font-size: 18px; margin-bottom: 5px;">${client?.name}</div>
              <div>${client?.address || '---'}</div>
              <div>${client?.city || ''}</div>
              ${client?.ice ? `<div style="font-weight: bold; margin-top: 10px;">ICE: ${client.ice}</div>` : ''}
            </div>
            <div class="invoice-box">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #0f172a;">${inv.status === InvoiceStatus.DRAFT ? 'BROUILLON' : 'FACTURE'}</h1>
              <div style="font-weight: 900; font-size: 18px; color: #4f46e5;">N° ${inv.number}</div>
              <div style="margin-top: 15px;">Date: ${new Date(inv.createdAt).toLocaleDateString()}</div>
              <div>Échéance: ${new Date(inv.dueDate).toLocaleDateString()}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Désignation</th>
                <th>Qté</th>
                <th style="text-align: right;">P.U HT</th>
                <th style="text-align: right;">Total HT</th>
              </tr>
            </thead>
            <tbody>
              ${inv.lines.map(l => `
                <tr>
                  <td>
                    <div style="font-weight: bold;">${l.description}</div>
                    <div style="font-size: 10px; color: #64748b;">${l.itemType}</div>
                  </td>
                  <td>${l.quantity} ${l.unit}</td>
                  <td style="text-align: right;">${Number(l.priceHT).toFixed(2)} DH</td>
                  <td style="text-align: right; font-weight: bold;">${Number(l.totalHT).toFixed(2)} DH</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 30px; font-style: italic; font-size: 12px; color: #64748b;">
            Arrêté la présente facture à la somme de : <strong>${numberToWordsDH(inv.totalTTC)}</strong>
          </div>
          <div class="totals">
            <table class="totals-table">
              <tr><td>Total HT</td><td style="text-align: right;">${Number(inv.totalHT).toFixed(2)} DH</td></tr>
              <tr><td>TVA (20%)</td><td style="text-align: right;">${Number(inv.totalTVA).toFixed(2)} DH</td></tr>
              ${inv.globalDiscount > 0 ? `<tr><td>Remise</td><td style="text-align: right;">-${Number(inv.globalDiscount).toFixed(2)} DH</td></tr>` : ''}
              <tr class="grand-total"><td>NET À PAYER</td><td style="text-align: right;">${Number(inv.totalTTC).toFixed(2)} DH</td></tr>
            </table>
          </div>
          <div class="signature">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 10px;">Cachet et Signature</div>
            ${settings.signature ? `<img src="${settings.signature}" />` : '<div style="height: 100px;"></div>'}
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Facturation Pro</h2>
          <p className="text-slate-500 font-medium tracking-tight">Émettez des factures conformes pour vos produits et services.</p>
        </div>
        <button onClick={() => openEditor()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
          <PlusCircle className="w-5 h-5" /> Nouvelle Facture
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Rechercher par N° Facture ou Client..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium focus:bg-white transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-8 py-5">Référence</th>
                <th className="px-8 py-5">Client</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Total TTC</th>
                <th className="px-8 py-5">Statut</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase text-xs">Aucune facture enregistrée</td></tr>
              ) : (
                invoices.map((inv: Invoice) => (
                  <tr key={inv.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-5">
                       <p className="font-black text-slate-900 leading-none mb-1">{inv.number}</p>
                       <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md tracking-widest">{inv.type}</span>
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-700">
                      {(db.clients.find((c:any) => c.id === inv.clientId))?.name || '---'}
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-400 text-sm">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-8 py-5 font-black text-slate-900">{formatMAD(inv.totalTTC)}</td>
                    <td className="px-8 py-5">
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                         inv.status === InvoiceStatus.VALIDATED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                         inv.status === InvoiceStatus.PAID ? 'bg-indigo-600 text-white border-indigo-600' :
                         inv.status === InvoiceStatus.CANCELLED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                         'bg-amber-50 text-amber-600 border-amber-100'
                       }`}>
                         {inv.status}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditor(inv)} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handlePrint(inv)} className="p-2.5 bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-xl transition-all shadow-sm"><Printer className="w-4 h-4" /></button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditor && currentInvoice && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300 overflow-hidden">
          <div className="bg-white w-full max-w-7xl h-full rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
             
             <div className="p-8 bg-[#0f172a] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Éditeur de Facture</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                      {currentInvoice.status === InvoiceStatus.DRAFT ? 'Mode : Création de brouillon' : `Consultation : ${currentInvoice.number}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {currentInvoice.status === InvoiceStatus.DRAFT && (
                    <button onClick={handleSaveDraft} className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                      <Save className="w-4 h-4" /> Sauvegarder Brouillon
                    </button>
                  )}
                  <button onClick={() => setShowEditor(false)} className="p-3 hover:bg-white/10 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
                </div>
             </div>

             <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                <div className="flex-1 p-8 overflow-y-auto scrollbar-hide border-r border-slate-100 flex flex-col gap-8">
                   
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon className="w-3 h-3" /> Client destinataire
                      </label>
                      <select 
                        disabled={currentInvoice.status !== InvoiceStatus.DRAFT}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10"
                        value={currentInvoice.clientId}
                        onChange={(e) => setCurrentInvoice({...currentInvoice, clientId: e.target.value})}
                      >
                         <option value="">Sélectionner un client...</option>
                         {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.ice ? `(ICE: ${c.ice})` : ''}</option>)}
                      </select>
                   </div>

                   {currentInvoice.status === InvoiceStatus.DRAFT && (
                     <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50">
                        <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <PlusCircle className="w-4 h-4" /> Ajouter des articles
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <select className="w-full p-3.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none" onChange={(e) => {
                                const p = products.find(pr => pr.id === e.target.value);
                                if (p) addLine(p, ItemType.PRODUCT);
                                e.target.value = "";
                              }}>
                                <option value="">Produits (Stocks)...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stockQty} {p.unit})</option>)}
                           </select>
                           <select className="w-full p-3.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none" onChange={(e) => {
                                const s = services.find(sr => sr.id === e.target.value);
                                if (s) addLine(s, ItemType.SERVICE);
                                e.target.value = "";
                              }}>
                                <option value="">Services / Prestations...</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.priceHT} DH)</option>)}
                           </select>
                        </div>
                     </div>
                   )}

                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <LayoutList className="w-3 h-3" /> Lignes de facturation
                      </label>
                      <div className="border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                               <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  <th className="px-6 py-4">Désignation</th>
                                  <th className="px-6 py-4 text-center">Quantité</th>
                                  <th className="px-6 py-4 text-right">P.U HT</th>
                                  <th className="px-6 py-4 text-right">Total HT</th>
                                  {currentInvoice.status === InvoiceStatus.DRAFT && <th className="px-6 py-4"></th>}
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {(currentInvoice.lines || []).map((l) => (
                                 <tr key={l.id} className="group hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                       {currentInvoice.status === InvoiceStatus.DRAFT ? (
                                         <input 
                                           className="w-full bg-slate-50/50 px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:bg-white focus:border-indigo-300 font-black text-slate-800 text-sm outline-none transition-all"
                                           value={l.description}
                                           onChange={(e) => updateLineField(l.id, 'description', e.target.value)}
                                         />
                                       ) : (
                                         <p className="font-black text-slate-800 text-sm px-2">{l.description}</p>
                                       )}
                                       <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest px-2">{l.itemType}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center justify-center gap-3">
                                          {currentInvoice.status === InvoiceStatus.DRAFT ? (
                                            <>
                                              <button onClick={() => updateLineField(l.id, 'quantity', Math.max(1, Number(l.quantity) - 1))} className="p-1.5 bg-slate-100 rounded-lg hover:bg-rose-50 hover:text-rose-600"><MinusCircle className="w-3.5 h-3.5" /></button>
                                              <input 
                                                className="w-10 bg-transparent text-center font-black text-sm outline-none"
                                                value={l.quantity}
                                                onChange={(e) => updateLineField(l.id, 'quantity', Number(e.target.value) || 0)}
                                              />
                                              <button onClick={() => updateLineField(l.id, 'quantity', Number(l.quantity) + 1)} className="p-1.5 bg-slate-100 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"><PlusCircle className="w-3.5 h-3.5" /></button>
                                            </>
                                          ) : (
                                            <span className="font-black text-slate-900">{l.quantity} {l.unit}</span>
                                          )}
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       {currentInvoice.status === InvoiceStatus.DRAFT ? (
                                         <div className="flex items-center justify-end gap-1">
                                            <input 
                                              className="w-20 bg-slate-50/50 px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:bg-white focus:border-indigo-300 text-right font-bold text-slate-600 outline-none transition-all"
                                              value={l.priceHT}
                                              onChange={(e) => updateLineField(l.id, 'priceHT', Number(e.target.value) || 0)}
                                            />
                                            <span className="text-[9px] font-bold text-slate-400">DH</span>
                                         </div>
                                       ) : (
                                         <span className="font-bold text-slate-600">{Number(l.priceHT).toFixed(2)} DH</span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-indigo-600 text-sm">
                                       {formatMAD(l.totalHT || 0)}
                                    </td>
                                    {currentInvoice.status === InvoiceStatus.DRAFT && (
                                      <td className="px-6 py-4 text-right">
                                         <button onClick={() => removeLine(l.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                                      </td>
                                    )}
                                 </tr>
                               ))}
                               {(currentInvoice.lines || []).length === 0 && (
                                 <tr><td colSpan={5} className="py-16 text-center text-slate-300 uppercase font-black text-[9px] tracking-widest italic">Aucun article dans cette facture</td></tr>
                               )}
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>

                <div className="w-full md:w-80 p-8 bg-slate-50 flex flex-col gap-6 shrink-0 border-t md:border-t-0 md:border-l border-slate-100">
                   
                   <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Échéance</label>
                        <input 
                          disabled={currentInvoice.status !== InvoiceStatus.DRAFT}
                          type="date" 
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none" 
                          value={currentInvoice.dueDate}
                          onChange={(e) => setCurrentInvoice({...currentInvoice, dueDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                        <select 
                          disabled={currentInvoice.status !== InvoiceStatus.DRAFT}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none"
                          value={currentInvoice.type}
                          onChange={(e) => setCurrentInvoice({...currentInvoice, type: e.target.value as any})}
                        >
                           <option value={InvoiceType.MIXED}>Facture Mixte</option>
                           <option value={InvoiceType.PRODUCT}>Produits Uniquement</option>
                           <option value={InvoiceType.SERVICE}>Services Uniquement</option>
                           <option value={InvoiceType.AVOIR}>Avoir</option>
                        </select>
                      </div>
                   </div>

                   <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl space-y-4 relative overflow-hidden border border-slate-800">
                      <Receipt className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 rotate-12" />
                      
                      <div className="space-y-2 relative z-10">
                         <div className="flex justify-between items-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <span>Total HT</span>
                            <span>{formatMAD(currentInvoice.totalHT || 0)}</span>
                         </div>
                         <div className="flex justify-between items-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <span>TVA (20%)</span>
                            <span>{formatMAD(currentInvoice.totalTVA || 0)}</span>
                         </div>
                         <div className="flex justify-between items-center text-amber-400 font-bold text-[10px] uppercase tracking-widest pt-2 border-t border-white/10">
                            <span>Remise</span>
                            {currentInvoice.status === InvoiceStatus.DRAFT ? (
                               <input 
                                 type="number" 
                                 className="w-16 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-right font-black text-[11px] outline-none focus:border-amber-400"
                                 value={currentInvoice.globalDiscount}
                                 onChange={(e) => {
                                   const val = Number(e.target.value) || 0;
                                   const totals = calculateTotals(currentInvoice.lines || [], val);
                                   setCurrentInvoice({...currentInvoice, globalDiscount: val, ...totals});
                                 }}
                               />
                            ) : (
                               <span>-{formatMAD(currentInvoice.globalDiscount || 0)}</span>
                            )}
                         </div>
                      </div>

                      <div className="pt-4 border-t border-indigo-500/30 relative z-10">
                         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Net à Payer</p>
                         <h2 className="text-3xl font-black tracking-tighter text-white">
                           {formatMAD(currentInvoice.totalTTC || 0)}
                         </h2>
                      </div>
                   </div>

                   <div className="mt-auto space-y-3">
                      {currentInvoice.status === InvoiceStatus.DRAFT ? (
                        <button 
                          onClick={validateInvoice} 
                          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                           <CheckCircle2 className="w-5 h-5" /> Valider Facture
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handlePrint(currentInvoice as Invoice)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                             <Printer className="w-5 h-5" /> Imprimer A4
                          </button>
                          {currentInvoice.status === InvoiceStatus.VALIDATED && (
                            <button onClick={() => setShowMotifModal({ id: currentInvoice.id!, action: 'cancel' })} className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
                               <ShieldAlert className="w-4 h-4" /> Annuler / Archivé
                            </button>
                          )}
                        </>
                      )}

                      {currentInvoice.status !== InvoiceStatus.PAID && (
                        <button 
                          onClick={() => {
                            if (currentInvoice.status === InvoiceStatus.DRAFT) {
                              if (window.confirm("Abandonner ce brouillon ?")) setShowEditor(false);
                            } else {
                              setShowMotifModal({ id: currentInvoice.id!, action: 'delete' });
                            }
                          }} 
                          className="w-full py-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest hover:text-rose-600 transition-colors"
                        >
                           {currentInvoice.status === InvoiceStatus.DRAFT ? 'Abandonner le brouillon' : 'Supprimer définitivement'}
                        </button>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {showMotifModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 relative">
              <button onClick={() => setShowMotifModal(null)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
              <h3 className="text-xl font-black uppercase tracking-tight text-rose-600 mb-2">Sécurité Requise</h3>
              <p className="text-slate-500 font-medium text-sm mb-8">
                 {showMotifModal.action === 'cancel' 
                   ? "Veuillez saisir le motif d'annulation." 
                   : "La suppression est irréversible. Pourquoi supprimez-vous cette facture ?"}
              </p>
              <textarea 
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm outline-none mb-8 min-h-[120px]"
                placeholder="Raison obligatoire..."
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              />
              <div className="flex gap-4">
                 <button onClick={() => setShowMotifModal(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Annuler</button>
                 <button 
                  onClick={handleActionWithMotif} 
                  className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
                 >
                    Confirmer
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
