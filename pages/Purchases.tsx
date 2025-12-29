
import React, { useState, useMemo } from 'react';
import { getDB, saveDB, logAudit } from '../db';
import { Purchase, PurchaseLine, Supplier, Product, PurchaseStatus, StockMovement, PurchasePriceLog } from '../types';
import { 
  Plus, Search, ShoppingBag, Eye, CheckCircle2, X, Trash2, 
  Landmark, Receipt, Calendar, ArrowDownCircle, PackagePlus, Info, TrendingUp
} from 'lucide-react';
import { useLanguage, formatMAD } from '../App';

export default function Purchases() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [showModal, setShowModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const purchases = useMemo(() => db.purchases || [], [db.purchases]);

  const handleCreatePurchase = () => {
    if (!selectedSupplierId) return alert("Sélectionnez un fournisseur");
    const id = `PUR-${Date.now()}`;
    const newPurchase: Purchase = {
      id,
      number: `BA-${Date.now().toString().slice(-6)}`,
      supplierId: selectedSupplierId,
      status: PurchaseStatus.DRAFT,
      date: new Date().toISOString().split('T')[0],
      lines: [],
      totalHT: 0,
      totalTVA: 0,
      totalTTC: 0,
      createdAt: new Date().toISOString()
    };
    
    const newDb = { ...db, purchases: [newPurchase, ...purchases] };
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
    setSelectedPurchase(newPurchase);
    logAudit('admin', 'Finance', 'Purchase Draft', `Brouillon d'achat créé pour fournisseur ${selectedSupplierId}`);
  };

  const addItemToPurchase = (pId: string) => {
    if (!selectedPurchase) return;
    const prod = db.products.find((p:Product) => p.id === pId);
    if (!prod) return;

    const newLine: PurchaseLine = {
      id: `PL-${Date.now()}`,
      productId: prod.id,
      description: prod.name,
      quantity: 1,
      unit: prod.unit,
      pricePurchaseHT: prod.cost || 0,
      tvaRate: prod.tva || 20,
      totalHT: prod.cost || 0,
      totalTTC: (prod.cost || 0) * (1 + (prod.tva || 20) / 100)
    };

    const newDb = { ...db };
    const pIdx = newDb.purchases.findIndex((p: Purchase) => p.id === selectedPurchase.id);
    const pur = { ...newDb.purchases[pIdx], lines: [...newDb.purchases[pIdx].lines, newLine] };
    newDb.purchases[pIdx] = pur;
    
    recalculatePurchase(pur);

    saveDB(newDb);
    setDb(newDb);
    setSelectedPurchase({...pur});
  };

  const updateLine = (lineId: string, updates: Partial<PurchaseLine>) => {
    if (!selectedPurchase) return;
    const newDb = { ...db };
    const pIdx = newDb.purchases.findIndex((p: Purchase) => p.id === selectedPurchase.id);
    const pur = { ...newDb.purchases[pIdx], lines: [...newDb.purchases[pIdx].lines] };
    newDb.purchases[pIdx] = pur;
    
    const lIdx = pur.lines.findIndex((l: PurchaseLine) => l.id === lineId);
    if (lIdx !== -1) {
      pur.lines[lIdx] = { ...pur.lines[lIdx], ...updates };
      const line = pur.lines[lIdx];
      line.totalHT = line.quantity * line.pricePurchaseHT;
      line.totalTTC = line.totalHT * (1 + line.tvaRate / 100);
      recalculatePurchase(pur);
      saveDB(newDb);
      setDb(newDb);
      setSelectedPurchase({...pur});
    }
  };

  const recalculatePurchase = (pur: Purchase) => {
    pur.totalHT = pur.lines.reduce((acc: number, l: PurchaseLine) => acc + l.totalHT, 0);
    pur.totalTTC = pur.lines.reduce((acc: number, l: PurchaseLine) => acc + l.totalTTC, 0);
    pur.totalTVA = pur.totalTTC - pur.totalHT;
  };

  // Correction de la validation : Mise à jour immuable pour forcer le rafraîchissement React
  const validatePurchase = (p: Purchase) => {
    if (p.lines.length === 0) return alert("Le bon d'achat est vide");
    if (!window.confirm("Valider cet achat ? Cela mettra à jour les stocks et calculera le nouveau Prix Moyen Pondéré (PMP).")) return;

    // Création d'une copie propre de la DB pour modification
    const newDb = { 
      ...db,
      products: [...db.products],
      purchases: [...db.purchases],
      purchasePriceHistory: db.purchasePriceHistory ? [...db.purchasePriceHistory] : [],
      stockMovements: db.stockMovements ? [...db.stockMovements] : []
    };

    const pIdx = newDb.purchases.findIndex((item: Purchase) => item.id === p.id);
    if (pIdx === -1) return;
    
    // Copie de l'achat en cours
    const purchase = { ...newDb.purchases[pIdx], lines: [...newDb.purchases[pIdx].lines] };
    newDb.purchases[pIdx] = purchase;

    // Mise à jour Stock & Coût (PMP) pour chaque ligne
    purchase.lines.forEach((line: PurchaseLine) => {
      const prodIdx = newDb.products.findIndex((pr: Product) => pr.id === line.productId);
      if (prodIdx !== -1) {
        // Copie immuable du produit
        const prod = { ...newDb.products[prodIdx] };
        newDb.products[prodIdx] = prod;

        // Sécurisation des valeurs numériques
        const currentQty = Number(prod.stockQty) || 0;
        const currentCost = Number(prod.cost) || 0;
        const addedQty = Number(line.quantity) || 0;
        const addedPrice = Number(line.pricePurchaseHT) || 0;

        // Formule PMP : ((Q_exist * PMP_exist) + (Q_new * P_new)) / (Q_exist + Q_new)
        const currentVal = currentQty * currentCost;
        const purchaseVal = addedQty * addedPrice;
        const totalQty = currentQty + addedQty;
        
        const newPmp = totalQty > 0 ? (currentVal + purchaseVal) / totalQty : addedPrice;
        
        prod.cost = Number(newPmp.toFixed(4));
        prod.stockQty = totalQty;

        // Historique des prix d'achat
        const priceLog: PurchasePriceLog = {
          id: `LOG-${Date.now()}-${line.id}`,
          productId: prod.id,
          supplierId: purchase.supplierId,
          priceHT: addedPrice,
          date: purchase.date,
          purchaseId: purchase.id
        };
        newDb.purchasePriceHistory.push(priceLog);

        // Mouvement de stock
        const mvmt: StockMovement = {
          id: `MV-${Date.now()}-${line.id}`,
          productId: prod.id,
          type: 'Purchase',
          quantity: addedQty,
          reason: `Achat n°${purchase.number}`,
          userId: 'admin',
          createdAt: new Date().toISOString()
        };
        newDb.stockMovements.push(mvmt);
      }
    });

    purchase.status = PurchaseStatus.VALIDATED;
    
    // Sauvegarde et mise à jour de l'état
    saveDB(newDb);
    setDb(newDb);
    setSelectedPurchase({...purchase}); // Met à jour la vue du modal
    logAudit('admin', 'Finance', 'Purchase Validated', `Bon d'achat ${purchase.number} validé. Stocks et PMP recalculés.`);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Gestion des Achats</h2>
          <p className="text-slate-500 font-medium">Réception réelle de marchandises & Pilotage du coût de revient.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Nouveau Bon d'Achat
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ArrowDownCircle className="w-5 h-5 text-indigo-500" /> Flux d'approvisionnement</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Référence BA</th>
                <th className="px-8 py-5">Fournisseur</th>
                <th className="px-8 py-5">Articles</th>
                <th className="px-8 py-5">Valeur TTC</th>
                <th className="px-8 py-5">Statut</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {purchases.map((p: Purchase) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-black text-indigo-600">{p.number}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{p.date}</p>
                  </td>
                  <td className="px-8 py-5 font-bold text-slate-800">{(db.suppliers.find((s:any) => s.id === p.supplierId))?.name || '---'}</td>
                  <td className="px-8 py-5">
                    <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black text-slate-600">{p.lines.length} refs</span>
                  </td>
                  <td className="px-8 py-5 font-black text-slate-900">{formatMAD(p.totalTTC)}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg ${
                      p.status === PurchaseStatus.VALIDATED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button onClick={() => setSelectedPurchase(p)} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
             <div className="flex justify-between items-start mb-10">
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Nouvel Achat</h3>
                <button onClick={() => setShowModal(false)}><X className="w-6 h-6 text-slate-400" /></button>
             </div>
             <div className="space-y-6">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sélection Fournisseur</label>
                   <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}>
                      <option value="">Sélectionnez un fournisseur...</option>
                      {db.suppliers.map((s: Supplier) => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
                <button onClick={handleCreatePurchase} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20">Initialiser le Bon d'Achat</button>
             </div>
          </div>
        </div>
      )}

      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-start justify-center z-50 p-10 overflow-y-auto">
           <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl p-12 relative">
             <button onClick={() => setSelectedPurchase(null)} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all"><X className="w-6 h-6" /></button>
             
             <div className="flex justify-between items-start mb-12">
                <div>
                   <span className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Bon d'Achat (Sourcing)</span>
                   <h2 className="text-4xl font-black text-slate-900">{selectedPurchase.number}</h2>
                   <p className="text-slate-400 font-bold mt-1">Fournisseur : {(db.suppliers.find((s:any)=>s.id === selectedPurchase.supplierId))?.name}</p>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-slate-900 uppercase">Émis le : {selectedPurchase.date}</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Statut actuel : {selectedPurchase.status}</p>
                </div>
             </div>

             {selectedPurchase.status === PurchaseStatus.DRAFT && (
               <div className="mb-10 p-8 bg-indigo-50 border border-indigo-100 rounded-3xl">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><PackagePlus className="w-4 h-4" /> Ajouter une référence catalogue</p>
                  <select className="w-full p-4 bg-white border border-indigo-200 rounded-2xl text-sm font-black outline-none" onChange={e => { addItemToPurchase(e.target.value); e.target.value=""; }}>
                     <option value="">Sélectionnez un article à faire entrer...</option>
                     {db.products.map((p: Product) => <option key={p.id} value={p.id}>{p.name} ({p.unit}) - SKU: {p.sku}</option>)}
                  </select>
               </div>
             )}

             <div className="mb-10 overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                <table className="w-full text-left">
                   <thead className="bg-[#0f172a] text-white">
                      <tr className="text-[10px] font-black uppercase tracking-widest">
                         <th className="px-8 py-5">Référence Catalogue</th>
                         <th className="px-8 py-5 text-center">Quantité</th>
                         <th className="px-8 py-5 text-right">P.U Achat HT</th>
                         <th className="px-8 py-5 text-right">Montant HT</th>
                         <th className="px-8 py-5 text-center">TVA (%)</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {selectedPurchase.lines.map((line) => (
                        <tr key={line.id}>
                           <td className="px-8 py-5">
                              <p className="font-black text-slate-800">{line.description}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{line.unit}</p>
                           </td>
                           <td className="px-8 py-5 text-center">
                              {selectedPurchase.status === PurchaseStatus.DRAFT ? (
                                 <input type="number" className="w-20 px-3 py-1 border border-slate-200 rounded-lg text-center font-black" value={line.quantity} onChange={e => updateLine(line.id, { quantity: Number(e.target.value) })} />
                              ) : <span className="font-black">{line.quantity}</span>}
                           </td>
                           <td className="px-8 py-5 text-right">
                              {selectedPurchase.status === PurchaseStatus.DRAFT ? (
                                 <input type="number" className="w-32 px-3 py-1 border border-slate-200 rounded-lg text-right font-black" value={line.pricePurchaseHT} onChange={e => updateLine(line.id, { pricePurchaseHT: Number(e.target.value) })} />
                              ) : <span className="font-bold text-slate-600">{formatMAD(line.pricePurchaseHT)}</span>}
                           </td>
                           <td className="px-8 py-5 text-right font-black text-slate-900">{formatMAD(line.totalHT)}</td>
                           <td className="px-8 py-5 text-center">
                              {selectedPurchase.status === PurchaseStatus.DRAFT ? (
                                 <input type="number" className="w-16 px-3 py-1 border border-slate-200 rounded-lg text-center font-black" value={line.tvaRate} onChange={e => updateLine(line.id, { tvaRate: Number(e.target.value) })} />
                              ) : <span className="font-bold text-slate-400">{line.tvaRate}%</span>}
                           </td>
                        </tr>
                      ))}
                      {selectedPurchase.lines.length === 0 && (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-black uppercase text-xs">Aucun article ajouté au bon</td></tr>
                      )}
                   </tbody>
                </table>
             </div>

             <div className="grid grid-cols-2 gap-10">
                <div className="bg-slate-50 p-10 rounded-3xl border border-slate-100 flex flex-col justify-between">
                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Info className="w-4 h-4 text-indigo-500" /> Note Technique</p>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                        La validation de ce bon recalculera le **PMP (Prix Moyen Pondéré)** de chaque article. 
                        Ce coût sera utilisé comme base pour le calcul de votre marge réelle lors des ventes.
                      </p>
                   </div>
                   {selectedPurchase.status === PurchaseStatus.DRAFT && (
                      <button onClick={() => validatePurchase(selectedPurchase)} className="w-full mt-8 py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all">
                         <CheckCircle2 className="w-6 h-6" /> Confirmer & Alimenter Stock
                      </button>
                   )}
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant Total HT</span>
                      <span className="font-bold text-slate-600 text-lg">{formatMAD(selectedPurchase.totalHT)}</span>
                    </div>
                    <div className="flex justify-between items-center px-10 py-10 bg-[#0f172a] text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                       <TrendingUp className="absolute -left-10 -bottom-10 w-40 h-40 text-white opacity-[0.03]" />
                       <span className="text-xs font-black uppercase tracking-widest relative z-10">Total à Payer (TTC)</span>
                       <span className="text-5xl font-black tracking-tighter relative z-10">{formatMAD(selectedPurchase.totalTTC)}</span>
                    </div>
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
