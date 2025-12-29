
import React, { useState } from 'react';
import { getDB, saveDB } from '../db';
import { Task, Employee, Team } from '../types';
import { Plus, CheckSquare, Clock, Filter, Pencil, Trash2, X, AlertCircle } from 'lucide-react';
import { useLanguage } from '../App';

export default function HRTasks() {
  const { t, language } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'Medium', status: 'Todo', assignedTo: '', teamId: '', dueDate: '' });

  const tasks = db.tasks || [];

  const openModal = (task: Task | null = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({ ...task, teamId: task.teamId || '' });
    } else {
      setEditingTask(null);
      setFormData({ title: '', description: '', priority: 'Medium', status: 'Todo', assignedTo: '', teamId: '', dueDate: '' });
    }
    setShowModal(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    let newDb = { ...db };
    if (editingTask) {
      newDb.tasks = db.tasks.map((t: Task) => 
        t.id === editingTask.id ? { ...t, ...formData } : t
      );
    } else {
      const task: Task = { 
        ...formData, 
        id: `TSK-${Date.now()}`, 
        createdAt: new Date().toISOString() 
      };
      newDb.tasks = [...(db.tasks || []), task];
    }
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  const priorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-rose-600 bg-rose-100';
      case 'Medium': return 'text-amber-600 bg-amber-100';
      default: return 'text-emerald-600 bg-emerald-100';
    }
  };

  const statuses = [
    { key: 'Todo', label: t('todo') },
    { key: 'In Progress', label: t('inProgress') },
    { key: 'Done', label: t('done') }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">{t('taskMgmt')}</h2>
          <p className="text-slate-500">{t('taskDesc')}</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">
          <Plus className="w-5 h-5" /> {t('newTask')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statuses.map(({ key, label }) => (
          <div key={key} className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between px-2">
              <span>{label}</span>
              <span className="bg-white px-2 py-0.5 rounded-full text-xs text-slate-400">
                {tasks.filter((t: any) => t.status === key).length}
              </span>
            </h3>
            <div className="space-y-4">
              {tasks.filter((t: any) => t.status === key).map((tObj: Task) => {
                const assignee = db.employees.find((e: Employee) => e.id === tObj.assignedTo);
                return (
                  <div key={tObj.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group" onClick={() => openModal(tObj)}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${priorityColor(tObj.priority)}`}>
                        {tObj.priority}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{tObj.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">{tObj.description}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          {assignee?.name.charAt(0) || '?'}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">{assignee?.name || '---'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {tObj.dueDate || '---'}
                      </div>
                    </div>
                  </div>
                );
              })}
              {tasks.filter((tItem: any) => tItem.status === key).length === 0 && (
                <div className="text-center py-10 opacity-30 border-2 border-dashed border-slate-200 rounded-xl">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs">{t('emptyColumn')}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95">
            <div className="p-6 bg-indigo-600 text-white flex justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">{editingTask ? t('edit') : t('new')}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('name')}</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('priority')}</label>
                  <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('status')}</label>
                  <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    {statuses.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('assignedTo')}</label>
                  <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
                    <option value="">{t('searchPlaceholder')}</option>
                    {db.employees.map((e: Employee) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('dueDate')}</label>
                  <input type="date" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('description')}</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none min-h-[100px]" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
