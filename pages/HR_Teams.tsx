
import React, { useState } from 'react';
import { getDB, saveDB } from '../db';
import { Team, TeamMember, Employee } from '../types';
import { Plus, UsersRound, Pencil, Trash2, X, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../App';

export default function HRTeams() {
  const { t } = useLanguage();
  const [db, setDb] = useState(getDB());
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', leaderId: '' });

  const teams = db.teams || [];

  const openModal = (team: Team | null = null) => {
    if (team) {
      setEditingTeam(team);
      setFormData({ name: team.name, description: team.description, leaderId: team.leaderId });
    } else {
      setEditingTeam(null);
      setFormData({ name: '', description: '', leaderId: '' });
    }
    setShowModal(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    let newDb = { ...db };
    if (editingTeam) {
      newDb.teams = db.teams.map((tObj: Team) => 
        tObj.id === editingTeam.id ? { ...tObj, ...formData } : tObj
      );
    } else {
      const team: Team = { ...formData, id: `TEAM-${Date.now()}`, createdAt: new Date().toISOString() };
      newDb.teams = [...(db.teams || []), team];
    }
    saveDB(newDb);
    setDb(newDb);
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">{t('teamsDirectory')}</h2>
          <p className="text-slate-500">{t('teamsDesc')}</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">
          <Plus className="w-5 h-5" /> {t('newTeam')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teams.map((teamObj: Team) => {
          const leader = db.employees.find((e: Employee) => e.id === teamObj.leaderId);
          const membersCount = (db.teamMembers || []).filter((tm: TeamMember) => tm.teamId === teamObj.id).length;
          return (
            <div key={teamObj.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UsersRound className="w-6 h-6" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(teamObj)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                  <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{teamObj.name}</h3>
              <p className="text-sm text-slate-500 mb-6 line-clamp-2">{teamObj.description || '---'}</p>
              
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{t('teamLeader')}</span>
                  <span className="font-bold flex items-center gap-1">
                    {leader ? <><ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> {leader.name}</> : '---'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{t('members')}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full font-bold text-xs">{membersCount} {t('members').toLowerCase()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex justify-between">
              <h3 className="text-xl font-bold">{editingTeam ? t('edit') : t('new')}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveTeam} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('name')}</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('teamLeader')}</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" value={formData.leaderId} onChange={e => setFormData({...formData, leaderId: e.target.value})}>
                  <option value="">{t('searchPlaceholder')}</option>
                  {db.employees.map((e: Employee) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('description')}</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none min-h-[80px]" />
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
