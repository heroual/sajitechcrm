
import React, { useState, useMemo } from 'react';
import { ShoppingCart, Search, Plus, Minus, CreditCard, Banknote, Receipt, Tag, Package, Percent, Edit3, X, Info, TrendingDown, Printer, CheckCircle2 } from 'lucide-react';
import { getDB, saveDB, logAudit, logClientAction } from '../db';
import { Product, User, UserRole, SaleItem, Sale } from '../types';
import { useLanguage, formatMAD } from '../App';

export default function POS({ user }: { user: User }) {
  const { t } = useLanguage();
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [search, setSearch] = useState('');
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [editLineModal, setEditLineModal] = useState<SaleItem | null>(null);
  const [db, setDb] = useState(getDB());

  // Fixed: Added missing UserRole.CHAUFFEUR to match Record<UserRole, number> type
  const DISCOUNT_LIMITS: Record<UserRole, number> = { 
    [UserRole.ADMIN]: 100, 
    [UserRole.MANAGER]: 25, 
    [UserRole.VENDEUR]: 10, 
    [UserRole.TECHNICIEN]: 0,
    [UserRole.CHAUFFEUR]: 0 
  };
  const currentLimit = DISCOUNT_LIMITS[user.role] || 0;

  const filteredProducts = useMemo(() => db.products.filter((p: Product) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())), [search, db.products]);

  const addToCart = (product: Product) => {
    if (product.stockQty <= 0) return alert("Stock épuisé");
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      const ht = product.price / (1 + (product.tva || 20) / 100);
      return [...prev, { productId: product.id, name: product.name, quantity: 1, catalogPrice: ht, priceHT: ht, discount: 0, tva: product.tva || 20 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.productId === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const totals = useMemo(() => {
    const totalHT = cart.reduce((sum, item) => sum + (item.priceHT * item.quantity) - item.discount, 0);
    const afterGlobalDiscountHT = Math.max(0, totalHT - globalDiscount);
    const totalTVA = cart.reduce((sum, item) => {
      const lineHT = (item.priceHT * item.quantity) - item.discount;
      const weight = totalHT > 0 ? lineHT / totalHT : 0;
      const lineNetHT = Math.max(0, lineHT - (globalDiscount * weight));
      return sum + (lineNetHT * (item.tva / 100));
    }, 0);
    return { ht: afterGlobalDiscountHT, tva: totalTVA, ttc: afterGlobalDiscountHT + totalTVA };
  }, [cart, globalDiscount]);

  const handlePrintTicket = (sale: Sale) => {
    const setts = db.settings;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 10px; margin: 0; color: #000; font-size: 12px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .header { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .logo { max-width: 60mm; height: auto; margin-bottom: 5px; }
            .line { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .footer { margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { border-bottom: 1px solid #000; text-align: left; }
            .qr { margin-top: 15px; text-align: center; }
            @media print { @page { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="center header">
            ${setts.logo ? `<img src="${setts.logo}" class="logo" />` : `<div class="bold" style="font-size: 16px;">${setts.companyName}</div>`}
            <div>${setts.address}</div>
            <div>Tél: ${setts.phone}</div>
          </div>
          <div class="bold center">TICKET N° ${sale.id}</div>
          <div class="center" style="margin-bottom: 10px;">Le ${new Date(sale.createdAt).toLocaleString()}</div>
          <table>
            <thead><tr><th>ART.</th><th>QTÉ</th><th style="text-align:right;">P.U</th></tr></thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>${item.name.substring(0, 15)}</td>
                  <td>${item.quantity}</td>
                  <td style="text-align:right;">${(item.priceHT * (1 + item.tva/100)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 15px; border-top: 1px solid #000; padding-top: 5px;">
            <div class="line"><span>Total HT:</span><span>${sale.totalHT.toFixed(2)} DH</span></div>
            <div class="line"><span>TVA (20%):</span><span>${sale.totalTVA.toFixed(2)} DH</span></div>
            <div class="line bold" style="font-size: 16px; margin-top: 5px;"><span>TOTAL TTC:</span><span>${sale.totalTTC.toFixed(2)} DH</span></div>
          </div>
          <div class="line" style="margin-top: 10px;"><span>Paiement:</span><span>${sale.paymentMode}</span></div>
          <div class="qr">
             <svg width="80" height="80" viewBox="0 0 100 100">
               <rect width="100" height="100" fill="white"/><rect x="10" y="10" width="30" height="30" fill="black"/><rect x="60" y="10" width="30" height="30" fill="black"/><rect x="10" y="60" width="30" height="30" fill="black"/><rect x="60" y="60" width="30" height="30" fill="black"/><rect x="45" y="45" width="10" height="10" fill="black"/>
             </svg>
             <div style="font-size: 8px; margin-top: 5px;">Transaction Authentifiée Sajitech</div>
          </div>
          <div class="center footer">
            <div class="bold">MERCI DE VOTRE VISITE</div>
            <div>${setts.footerMessage}</div>
            <div style="margin-top: 10px;">Vendeur: ${user.firstName}</div>
            <div style="font-size: 8px; color: #666; margin-top: 10px;">Logiciel Sajitech CRM Moroccan Edition</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleCheckout = (mode: 'Cash' | 'Card' | 'Transfer') => {
    const saleId = `TCK-${Date.now().toString().slice(-6)}`;
    const newSale: Sale = { id: saleId, userId: user.id, items: cart, globalDiscount: globalDiscount, totalHT: totals.ht, totalTVA: totals.tva, totalTTC: totals.ttc, paymentMode: mode, status: 'Paid', createdAt: new Date().toISOString() };
    const newDb = { ...db };
    newSale.items.forEach(item => { const prod = newDb.products.find((p: any) => p.id === item.productId); if (prod) prod.stockQty -= item.quantity; });
    newDb.sales = [newSale, ...(db.sales || [])];
    
    // Fix: logClientAction call corrected (removed extra argument and ensured correct count)
    logClientAction('c1', user.id, 'Sale', `Achat au comptoir (Ticket ${saleId})`, totals.ttc);
    
    saveDB(newDb); setDb(newDb); setLastSale(newSale); setCheckoutModal(false);
    logAudit(user.id, 'POS', 'Sale', `Vente effectuée - Ticket ${saleId}`);
  };

  return (
    <div className="h-[calc(100vh-140px)] grid grid-cols-12 gap-8 overflow-hidden">
      <div className="col-span-12 lg:col-span-7 flex flex-col min-h-0">
        <div className="mb-6 flex gap-4 shrink-0">
          <div className="relative group flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input type="text" placeholder="Scanner ou rechercher..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl shadow-sm outline-none font-bold text-slate-700" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-5 scrollbar-hide">
          {filteredProducts.map((p: Product) => (
            <button key={p.id} onClick={() => addToCart(p)} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 text-left flex flex-col group active:scale-[0.97] overflow-hidden">
              <div className="relative h-24 w-full bg-slate-50 mb-3 rounded-2xl overflow-hidden">{p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 m-auto mt-8 text-slate-200" />}</div>
              <h4 className="font-black text-slate-800 text-[10px] truncate uppercase">{p.name}</h4>
              <span className="text-indigo-600 font-black text-sm mt-1">{formatMAD(p.price)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl flex flex-col overflow-hidden relative">
        <div className="p-8 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
          <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight"><ShoppingCart className="w-5 h-5 text-indigo-600" /> Panier</h3>
          <button onClick={() => { setCart([]); setLastSale(null); }} className="text-slate-300 hover:text-rose-500"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-3 scrollbar-hide">
          {cart.map(item => (
            <div key={item.productId} className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <div className="flex-1 min-w-0"><p className="text-xs font-black text-slate-800 truncate uppercase">{item.name}</p><p className="text-[10px] font-black text-indigo-500">{formatMAD(item.priceHT * (1 + item.tva/100))}</p></div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200"><button onClick={() => updateQty(item.productId, -1)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Minus className="w-3 h-3" /></button><span className="text-xs font-black w-6 text-center">{item.quantity}</span><button onClick={() => updateQty(item.productId, 1)} className="p-1.5 hover:bg-indigo-50 rounded-lg"><Plus className="w-3 h-3" /></button></div>
            </div>
          ))}
          {lastSale && (
            <div className="p-8 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] flex flex-col items-center text-center animate-in slide-in-from-bottom-4">
               <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mb-4 shadow-xl"><CheckCircle2 className="w-8 h-8" /></div>
               <h4 className="font-black text-emerald-900 uppercase">Vente Confirmée</h4>
               <p className="text-[10px] font-bold text-emerald-600 mb-6">Numéro de ticket: {lastSale.id}</p>
               <button onClick={() => handlePrintTicket(lastSale)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg"><Printer className="w-4 h-4" /> Imprimer le Ticket</button>
            </div>
          )}
        </div>
        <div className="p-10 bg-[#0f172a] text-white rounded-t-[3rem] shadow-2xl">
          <div className="flex justify-between items-end mb-10"><div><p className="text-[10px] text-indigo-400 font-black uppercase mb-1">Net à Payer (TTC)</p><h2 className="text-4xl font-black tracking-tighter">{formatMAD(totals.ttc)}</h2></div><Receipt className="w-10 h-10 text-white/10" /></div>
          <button disabled={cart.length === 0} onClick={() => setCheckoutModal(true)} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl">Valider & Encaisser</button>
        </div>
      </div>

      {checkoutModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => setCheckoutModal(false)} className="absolute top-6 right-6 p-2 bg-white/20 text-white hover:bg-white/40 rounded-xl transition-all z-10">
              <X className="w-6 h-6" />
            </button>
            <div className="p-12 text-center bg-indigo-600 text-white relative"><h2 className="text-5xl font-black tracking-tighter">{formatMAD(totals.ttc)}</h2></div>
            <div className="p-10 grid grid-cols-2 gap-4">
              <button onClick={() => handleCheckout('Cash')} className="flex flex-col items-center p-10 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-indigo-500 transition-all"><Banknote className="w-8 h-8 mb-4" /><span className="font-black text-[10px] uppercase">Espèces</span></button>
              <button onClick={() => handleCheckout('Card')} className="flex flex-col items-center p-10 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-indigo-500 transition-all"><CreditCard className="w-8 h-8 mb-4" /><span className="font-black text-[10px] uppercase">Carte TPE</span></button>
              <button onClick={() => setCheckoutModal(false)} className="col-span-2 py-4 text-slate-400 font-black text-[10px] uppercase">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
