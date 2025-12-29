
import React, { useState } from 'react';
import { getDB, saveDB } from '../db';
import { Category, Product } from '../types';
import { Plus, Search, Pencil, Trash2, X, Tags } from 'lucide-react';

export default function Categories() {
  const [db, setDb] = useState(getDB());
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const categories = (db.categories || []).filter((c: Category) => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (category: Category | null = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description || '' });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("Category name is required.");
    
    // Check uniqueness
    const isDuplicate = db.categories.some((c: Category) => 
      c.name.toLowerCase() === formData.name.toLowerCase() && (!editingCategory || c.id !== editingCategory.id)
    );
    if (isDuplicate) return alert("A category with this name already exists.");

    let newDb = { ...db };
    if (editingCategory) {
      newDb.categories = db.categories.map((c: Category) => 
        c.id === editingCategory.id ? { ...c, ...formData } : c
      );
    } else {
      const category: Category = {
        ...formData,
        id: `CAT-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      newDb.categories = [...(db.categories || []), category];
    }
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  const handleDeleteCategory = (id: string) => {
    // Check dependency
    const isUsed = db.products.some((p: Product) => p.categoryId === id);
    if (isUsed) {
      return alert("Cannot delete this category because it is linked to one or more products. Reassign or delete the products first.");
    }

    if (window.confirm('Are you sure you want to delete this category?')) {
      const newDb = { ...db, categories: db.categories.filter((c: Category) => c.id !== id) };
      saveDB(newDb);
      setDb(newDb);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Product Categories</h2>
          <p className="text-slate-500">Organize your inventory by groupings.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Category Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Products Count</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((c: Category) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Tags className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                      {c.description || <span className="italic">No description</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">
                        {db.products.filter((p: Product) => p.categoryId === c.id).length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openModal(c)} className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteCategory(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex justify-between">
              <h3 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Category Name</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. Electronics" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description (Optional)</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]" 
                  placeholder="What products go in this group?" 
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
