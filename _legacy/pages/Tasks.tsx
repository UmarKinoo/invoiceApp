
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Task, TaskPriority, Client } from '../types';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', dueDate: '', priority: TaskPriority.MEDIUM, clientId: '', completed: false
  });

  useEffect(() => {
    setTasks(StorageService.getTasks());
    setClients(StorageService.getClients());
  }, []);

  const handleAdd = () => {
    if (!newTask.title) return;
    StorageService.addTask(newTask);
    setTasks(StorageService.getTasks());
    setShowAdd(false);
    setNewTask({ title: '', dueDate: '', priority: TaskPriority.MEDIUM, clientId: '', completed: false });
  };

  const toggleTask = (id: string) => {
    StorageService.toggleTask(id);
    setTasks(StorageService.getTasks());
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch(p) {
      case TaskPriority.HIGH: return 'text-rose-600 bg-rose-50';
      case TaskPriority.MEDIUM: return 'text-amber-600 bg-amber-50';
      default: return 'text-emerald-600 bg-emerald-50';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Tasks</h2>
          <p className="text-slate-500 mt-1">Manage follow-ups and CRM duties</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center space-x-2"
        >
          <i className="fa-solid fa-plus"></i>
          <span>Add Task</span>
        </button>
      </header>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xl mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Task Title</label>
              <input 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Due Date</label>
              <input 
                type="date"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none"
                value={newTask.dueDate}
                onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Priority</label>
              <select 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none"
                value={newTask.priority}
                onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})}
              >
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Link to Contact</label>
              <select 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none"
                value={newTask.clientId}
                onChange={e => setNewTask({...newTask, clientId: e.target.value})}
              >
                <option value="">No Contact</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={() => setShowAdd(false)} className="text-slate-500 font-bold px-4">Cancel</button>
            <button onClick={handleAdd} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Add Task</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">All caught up! No tasks yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tasks.map(task => {
              const client = clients.find(c => c.id === task.clientId);
              return (
                <div key={task.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${task.completed ? 'opacity-50' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        task.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-transparent hover:border-indigo-400'
                      }`}
                    >
                      <i className="fa-solid fa-check text-[10px]"></i>
                    </button>
                    <div>
                      <h4 className={`font-bold text-slate-900 ${task.completed ? 'line-through' : ''}`}>{task.title}</h4>
                      <div className="flex items-center space-x-3 mt-1">
                        {client && <span className="text-xs text-indigo-600 font-medium">@ {client.name}</span>}
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{task.dueDate || 'No Date'}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="text-slate-300 hover:text-rose-500">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
