
import React, { useState, useMemo, useRef } from 'react';
import { getDB, saveDB, logAudit } from '../db';
import { Product, Category, StockMovement } from '../types';
import { Package, Search, Plus, Filter, AlertTriangle, ArrowUpRight, ArrowDownRight, Pencil, Trash2, X, Tags, History, TrendingUp, TrendingDown, Info, Scale, Camera, Image as LucideImage, Upload } from 'lucide-react';
import { useLanguage, formatMAD } from '../App';

const UNITS = ['Pièce (pcs)', 'Kg', 'Gramme (g)', 'Mètre (m)', 'Litre (l)', 'Boîte', 'Heure', 'Forfait'];

// Utilitaire de compression d'image client-side
const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // On compresse en JPEG 70% pour économiser du localStorage
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.onerror = error => reject(error);
  });
};

export default function Stock() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({ name: '', sku: '', categoryId: '', price: 0, cost: 0, stockQty: 0, minStock: 1, unit: 'Pièce (pcs)', image: '' });
  const [movementData, setMovementData] = useState({ type: 'Adjustment' as 'In' | 'Out' | 'Adjustment', quantity: 0, reason: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryMap = useMemo(() => (db.categories || []).reduce((acc: any, cat: Category) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {}), [db.categories]);

  const products = useMemo(() => db.products.filter((p: Product) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  }), [db.products, search, categoryFilter]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const compressed = await processImage(e.target.files[0]);
        setFormData({ ...formData, image: compressed });
      } catch (err) {
        alert("Erreur lors du traitement de l'image");
      }
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    let newDb = { ...db };
    if (editingProduct) {
      newDb.products = db.products.map((p: Product) => 
        p.id === editingProduct.id ? { ...p, ...formData, cost: p.cost, stockQty: p.stockQty } : p
      );
      logAudit('admin', 'Stock', 'Update', `Référence modifiée: ${formData.name}`);
    } else {
      const product: Product = { ...(formData as any), id: `P-${Date.now()}` };
      newDb.products = [...db.products, product];
      logAudit('admin', 'Stock', 'Create', `Nouvelle référence catalogue: ${formData.name}`);
    }
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  const handleStockMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    let newDb = { ...db };
    const movement: StockMovement = {
      id: `MOV-${Date.now()}`,
      productId: selectedProduct.id,
      type: movementData.type,
      quantity: movementData.quantity,
      reason: movementData.reason,
      userId: 'admin',
      createdAt: new Date().toISOString()
    };

    newDb.products = db.products.map((p: Product) => {
      if (p.id === selectedProduct.id) {
        let newQty = p.stockQty;
        if (movementData.type === 'In') newQty += movementData.quantity;
        if (movementData.type === 'Out') newQty -= movementData.quantity;
        if (movementData.type === 'Adjustment') newQty = movementData.quantity;
        return { ...p, stockQty: newQty };
      }
      return p;
    });

    newDb.stockMovements = [movement, ...(db.stockMovements || [])];
    saveDB(newDb);
    setDb(newDb);
    setShowMovementModal(false);
    logAudit('admin', 'Stock', 'Adjustment', `Ajustement manuel: ${movementData.type} pour ${selectedProduct.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Catalogue & Stock</h2>
          <p className="text-slate-500 font-medium">Déclarez vos références et gérez les niveaux réels.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setEditingProduct(null); setFormData({ name: '', sku: '', categoryId: db.categories?.[0]?.id || '', price: 0, cost: 0, stockQty: 0, minStock: 1, unit: 'Pièce (pcs)', image: '' }); setShowModal(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
            <Plus className="w-5 h-5" /> Déclarer Référence
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Rechercher par nom ou SKU..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-3 outline-none shadow-sm"
          >
            <option value="all">Toutes Catégories</option>
            {db.categories.map((cat: Category) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-8 py-5">Photo & Référence</th>
                <th className="px-8 py-5">Vente HT</th>
                <th className="px-8 py-5">Coût (PMP)</th>
                <th className="px-8 py-5">Niveau Stock</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map((p: Product) => (
                <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      {p.image ? (
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                           <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black border border-indigo-100/50 shadow-sm">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-black text-slate-900 leading-none mb-1">{p.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">SKU: {p.sku}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">{p.unit}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-black text-slate-700">{formatMAD(p.price)}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <p className="font-black text-emerald-600">{formatMAD(p.cost)}</p>
                       <Info className="w-3 h-3 text-slate-300" title="Prix Moyen Pondéré calculé via les achats" />
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-black border ${p.stockQty <= p.minStock ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      {p.stockQty} <span className="ml-1 opacity-50 text-[10px]">{p.unit.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setSelectedProduct(p); setShowMovementModal(true); }} className="p-2.5 bg-slate-100 text-slate-400 hover:text-amber-600 rounded-xl transition-all shadow-sm" title="Ajustement Manuel"><TrendingUp className="w-4 h-4" /></button>
                      <button onClick={() => { setEditingProduct(p); setFormData(p); setShowModal(true); }} className="p-2.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Pencil className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Produit (Référence) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-8 bg-indigo-600 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">{editingProduct ? 'Modifier Référence' : 'Déclarer Référence'}</h3>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-1">Catalogue Produit Visuel</p>
              </div>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              
              <div className="flex items-center gap-8 mb-8">
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-32 h-32 rounded-[2rem] bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all overflow-hidden group"
                 >
                    {formData.image ? (
                       <img src={formData.image} className="w-full h-full object-cover" />
                    ) : (
                       <>
                         <LucideImage className="w-8 h-8 text-slate-300 group-hover:text-indigo-400 mb-2" />
                         <span className="text-[8px] font-black text-slate-400 uppercase">Ajouter Photo</span>
                       </>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                       <Upload className="w-6 h-6" />
                    </div>
                 </div>
                 <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageChange} />
                 
                 <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom de l'article</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU / Code</label>
                  <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unité de mesure</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix Vente HT (MAD)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none text-indigo-600" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Alert Min.</label>
                  <input required type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</label>
                 <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                    {db.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>

              {!editingProduct && (
                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1 flex items-center gap-1"><Info className="w-3 h-3" /> Initialisation</p>
                    <p className="text-[10px] text-amber-600 font-medium">Le stock sera initialisé à 0. Utilisez le module "Achats" pour faire entrer de la marchandise réelle.</p>
                 </div>
              )}

              <div className="pt-6 flex gap-4 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Annuler</button>
                <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30 active:scale-95 transition-all">Enregistrer Référence</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustement */}
      {showMovementModal && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 bg-[#0f172a] text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Ajustement Stock</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setShowMovementModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleStockMovement} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                    <select value={movementData.type} onChange={e => setMovementData({...movementData, type: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none">
                       <option value="Adjustment">Mise à jour réelle</option>
                       <option value="Out">Perte / Casse</option>
                       <option value="In">Don / Bonus</option>
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantité ({selectedProduct.unit.split(' ')[0]})</label>
                    <input required type="number" value={movementData.quantity} onChange={e => setMovementData({...movementData, quantity: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raison / Commentaire</label>
                 <textarea required value={movementData.reason} onChange={e => setMovementData({...movementData, reason: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm outline-none" placeholder="Ex: Inventaire de fin d'année..." />
              </div>
              <button type="submit" className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Appliquer la modification</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
