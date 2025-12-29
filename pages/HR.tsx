
import React, { useState } from 'react';
import { getDB, saveDB } from '../db';
import { Employee, Service, EmployeeService } from '../types';
import { UserSquare2, Clock, Pencil, Trash2, Plus, X, Wrench, Percent, Briefcase, Calendar, ShieldCheck, UserCheck } from 'lucide-react';

export default function HR() {
  const [db, setDb] = useState(getDB());
  const [showModal, setShowModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({ name: '', role: '', salary: 0, hireDate: new Date().toISOString().split('T')[0] });
  
  const [selectedEmployeeForServices, setSelectedEmployeeForServices] = useState<Employee | null>(null);
  const [assignmentData, setAssignmentData] = useState({ serviceId: '', commissionPercentage: 0 });

  const openModal = (emp: Employee | null = null) => {
    if (emp) {
      setEditingEmployee(emp);
      setFormData({ name: emp.name, role: emp.role, salary: emp.salary, hireDate: emp.hireDate });
    } else {
      setEditingEmployee(null);
      setFormData({ name: '', role: '', salary: 0, hireDate: new Date().toISOString().split('T')[0] });
    }
    setShowModal(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    let newDb = { ...db };
    if (editingEmployee) {
      newDb.employees = db.employees.map((e: Employee) => 
        e.id === editingEmployee.id ? { ...e, ...formData } : e
      );
    } else {
      const employee: Employee = { ...formData, id: `E-${Date.now()}`, attendance: {} };
      newDb.employees = [...db.employees, employee];
    }
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  const handleAssignService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForServices) return;
    if (!assignmentData.serviceId) return alert("Sélectionnez un service.");

    const newDb = { ...db };
    if (!newDb.employeeServices) newDb.employeeServices = [];

    const isAlreadyAssigned = newDb.employeeServices.some(
      (es: EmployeeService) => es.employeeId === selectedEmployeeForServices.id && es.serviceId === assignmentData.serviceId
    );
    if (isAlreadyAssigned) return alert("Service déjà assigné à ce collaborateur.");

    const assignment: EmployeeService = {
      id: `ES-${Date.now()}`,
      employeeId: selectedEmployeeForServices.id,
      serviceId: assignmentData.serviceId,
      commissionPercentage: assignmentData.commissionPercentage
    };

    newDb.employeeServices.push(assignment);
    saveDB(newDb);
    setDb(newDb);
    setAssignmentData({ serviceId: '', commissionPercentage: 0 });
  };

  const removeAssignment = (assignmentId: string) => {
    const newDb = { ...db, employeeServices: db.employeeServices.filter((es: EmployeeService) => es.id !== assignmentId) };
    saveDB(newDb);
    setDb(newDb);
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Répertoire du Personnel</h2>
          <p className="text-slate-500 font-medium">Coordonnez vos équipes, suivez les performances et gérez les compétences.</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Enrôler un Collaborateur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {db.employees.map((emp: Employee) => (
          <div key={emp.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all group flex flex-col overflow-hidden">
            <div className="p-8 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-2xl text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                  {emp.name.charAt(0)}
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(emp)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors shadow-sm"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => { if(window.confirm('Supprimer définitivement ce dossier ?')) { const nDb = {...db, employees: db.employees.filter((e: any) => e.id !== emp.id)}; saveDB(nDb); setDb(nDb); } }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors shadow-sm"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{emp.name}</h3>
              <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mt-1">{emp.role}</p>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Grille Salariale</p>
                  <p className="text-sm font-black text-slate-800">{emp.salary.toLocaleString()} DH</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ancienneté</p>
                  <p className="text-sm font-black text-slate-800">{new Date(emp.hireDate).getFullYear()}</p>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 flex-1 overflow-auto max-h-40 scrollbar-hide">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Compétences Techniques
              </p>
              <div className="flex flex-wrap gap-2">
                {db.employeeServices?.filter((es: EmployeeService) => es.employeeId === emp.id).map((es: EmployeeService) => {
                  const srv = db.services.find((s: Service) => s.id === es.serviceId);
                  return srv ? (
                    <span key={es.id} className="text-[10px] font-bold bg-indigo-50/50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100/50">
                      {srv.name} ({es.commissionPercentage}%)
                    </span>
                  ) : null;
                })}
                {db.employeeServices?.filter((es: EmployeeService) => es.employeeId === emp.id).length === 0 && (
                  <span className="text-[10px] font-bold text-slate-300 italic">Aucune spécialisation définie</span>
                )}
              </div>
            </div>

            <div className="p-6 pt-0 mt-auto">
              <button 
                onClick={() => { setSelectedEmployeeForServices(emp); setShowAssignmentModal(true); }}
                className="w-full py-3 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-slate-100"
              >
                Gérer les Qualifications
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">{editingEmployee ? 'Mettre à jour le Profil' : 'Nouvelle Inscription'}</h3>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-1 italic">Gestion du Dossier Personnel</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom Complet du Collaborateur</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold" placeholder="ex: Robert Deniro" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poste / Fonction</label>
                <input required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold" placeholder="ex: Technicien Senior" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salaire de Base (DH)</label>
                  <input required type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date d'Embauche</label>
                  <input required type="date" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Annuler</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignmentModal && selectedEmployeeForServices && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl h-[600px] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-10 bg-[#0f172a] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-3xl font-black">
                  {selectedEmployeeForServices.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight">{selectedEmployeeForServices.name}</h3>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">Registre des Compétences & Matrice de Commissions</p>
                </div>
              </div>
              <button onClick={() => setShowAssignmentModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/3 p-10 bg-slate-50 border-r border-slate-100">
                <h4 className="font-black text-slate-800 mb-6 text-xs uppercase tracking-widest flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" /> Nouvelle Assignation
                </h4>
                <form onSubmit={handleAssignService} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Catalogue</label>
                    <select required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" value={assignmentData.serviceId} onChange={e => setAssignmentData({...assignmentData, serviceId: e.target.value})}>
                      <option value="">Sélectionnez...</option>
                      {db.services.map((s: Service) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.priceHT} DH)</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taux de Commission (%)</label>
                    <div className="relative">
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="number" step="0.5" className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" value={assignmentData.commissionPercentage} onChange={e => setAssignmentData({...assignmentData, commissionPercentage: Number(e.target.value)})} />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20">Autoriser l'Assignation</button>
                </form>
              </div>

              <div className="flex-1 p-10 overflow-y-auto">
                <h4 className="font-black text-slate-800 mb-6 text-xs uppercase tracking-widest flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" /> Certifications Actives
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {db.employeeServices?.filter((es: EmployeeService) => es.employeeId === selectedEmployeeForServices.id).map((es: EmployeeService) => {
                    const srv = db.services.find((s: Service) => s.id === es.serviceId);
                    return srv ? (
                      <div key={es.id} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl hover:border-indigo-500 transition-all shadow-sm group">
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-tight mb-1">{srv.name}</p>
                          <div className="flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                             <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{es.commissionPercentage}% Commission</p>
                          </div>
                        </div>
                        <button onClick={() => removeAssignment(es.id)} className="p-2.5 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
