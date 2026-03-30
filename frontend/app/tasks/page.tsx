'use client';

import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { Plus, CheckSquare, Clock, CheckCircle2, Edit3, Trash2, Check, X, Calendar, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import ConfirmationModal from '../../components/ui/confirmation-modal';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const { user } = useAuthStore();
  const canCreate = user?.level === 0 || user?.permissions?.includes('CREATE_TASK');
  
  // Assignee Restriction: Assignees CANNOT edit if not creator/manager
  const canEditGeneral = user?.level === 0 || user?.permissions?.includes('EDIT_TASK');

  // Modal / Form State
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const columns = [
    { id: 'TODO', label: 'To Do', icon: CheckSquare, color: 'text-blue-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', icon: Clock, color: 'text-amber-500' },
    { id: 'DONE', label: 'Done', icon: CheckCircle2, color: 'text-green-500' }
  ];

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get('/users/roster'); 
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch team members', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (task && !canDropTask(task)) return; // Prevent illegal moves

    try {
      await api.patch(`/tasks/${taskId}`, { status: targetStatus });
      fetchTasks();
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const openModal = (task: any = null) => {
    setSelectedTask(task);
    if (task) {
       setTitle(task.title);
       setDescription(task.description || '');
       setPriority(task.priority);
       setAssigneeId(task.assignee?.id || '');
       setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    } else {
       setTitle('');
       setDescription('');
       setPriority('MEDIUM');
       setAssigneeId('');
       setDueDate('');
    }
    setIsModalOpen(true);
  };

  const handleCreateOrUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      };

      if (selectedTask) {
        await api.patch(`/tasks/${selectedTask.id}`, payload);
      } else {
        await api.post('/tasks', { ...payload, status: 'TODO' });
      }

      setIsModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setIsConfirmModalOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete}`);
      setIsConfirmModalOpen(false);
      setTaskToDelete(null);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/approve`);
      fetchTasks();
    } catch (err) {
      console.error('Failed to approve task', err);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/reject`);
      fetchTasks();
    } catch (err) {
      console.error('Failed to reject task', err);
    }
  };

  // Determine if actor can manage total details
  const canManageTask = (task: any) => {
     const isOwner = task.creator?.id === user?.userId;
     const isAssignee = task.assignee?.id === user?.userId;
     const isManager = user?.level !== undefined && user.level <= 2;
     
     if (isAssignee && !isOwner && !isManager) return false;
     return user?.level === 0 || isOwner || isManager || canEditGeneral;
  };

  const canDropTask = (task: any) => {
     const isOwner = task.creator?.id === user?.userId;
     const isAssignee = task.assignee?.id === user?.userId;
     const isManager = user?.level !== undefined && user.level <= 2;
     
     return isOwner || isManager || isAssignee || canEditGeneral;
  };

  const canApprove = (task: any) => {
     const isAssigner = task.assigner?.id === user?.userId;
     const isManager = user?.level !== undefined && user.level <= 2;
     const isSelfAssigned = task.assignee?.id === task.creator?.id;

     if (task.status !== 'DONE') return false;

     if (isSelfAssigned) {
        const actorLevel = user?.level ?? 99;
        const creatorLevel = task.creator?.creator_role?.level ?? 99;
        return actorLevel < creatorLevel || user?.level === 0; 
     }

     return isAssigner || isManager || user?.level === 0;
  };

  const isOverdue = (task: any) => {
     if (!task.dueDate || task.status === 'DONE') return false;
     return new Date(task.dueDate) < new Date();
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const priorityColors: Record<string, string> = {
    HIGH: 'border-l-red-500',
    MEDIUM: 'border-l-amber-500',
    LOW: 'border-l-green-500',
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Task Board</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic">Coordinate and track work streams with precision</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => openModal()}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-primary/20"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            Add Task
          </button>
        )}
      </div>

      {loading && tasks.length === 0 ? (
         <div className="flex-1 flex items-center justify-center text-muted-foreground font-medium italic animate-pulse">Loading tickets...</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden pb-4">
        {columns.map((col) => (
          <div 
            key={col.id} 
            className="flex flex-col bg-muted/40 rounded-2xl border border-border/40 h-full backdrop-blur-xs transition-colors hover:bg-muted/50"
            onDragOver={allowDrop}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between p-4 border-b border-border/30 bg-muted/20 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg bg-card border border-border/40 shadow-xs ${col.color.replace('text-', 'bg-').replace('-500', '-500/10')}`}>
                  <col.icon className={`h-4 w-4 ${col.color}`} />
                </div>
                <h2 className="font-bold text-foreground text-sm tracking-tight capitalize">{col.label}</h2>
                <span className="text-[10px] text-muted-foreground bg-muted/80 border border-border/40 px-2 py-0.5 rounded-full font-bold">
                   {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>
            </div>

            <div className="p-3 space-y-4 flex-1 overflow-y-auto no-scrollbar pb-6">
              {tasks.filter(t => t.status === col.id).map((task) => (
                <div
                  key={task.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className={`group relative bg-card rounded-xl border-l-[4px] border border-border/60 hover:border-border/80 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-grab active:cursor-grabbing overflow-hidden ${
                    priorityColors[task.priority] || 'border-l-primary'
                  } ${isOverdue(task) ? 'ring-1 ring-red-500/30' : ''}`}
                >
                  <div className="p-4 space-y-3 relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-foreground text-[15px] leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                        {task.title}
                      </h3>
                      
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-widest shadow-xs ${
                          task.priority === 'HIGH' ? 'bg-red-500/15 text-red-600' :
                          task.priority === 'MEDIUM' ? 'bg-amber-500/15 text-amber-600' : 'bg-green-500/15 text-green-600'
                        }`}>
                          {task.priority}
                        </span>
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 origin-right">
                          {canManageTask(task) && (
                            <>
                              <button onClick={() => openModal(task)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40 rounded-lg transition-all"><Edit3 className="h-3.5 w-3.5" /></button>
                              <button onClick={() => confirmDeleteTask(task.id)} className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 border border-border/40 rounded-lg transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {task.description && (
                       <p className="text-xs text-muted-foreground leading-relaxed font-medium line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity whitespace-pre-wrap">
                        {task.description}
                       </p>
                    )}
                    
                    {task.dueDate && (
                       <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold ${
                        isOverdue(task) ? 'bg-red-500/10 text-red-600 ring-1 ring-red-500/20' : 'bg-muted/50 text-muted-foreground/80'
                       }`}>
                          <Calendar className={`h-3 w-3 ${isOverdue(task) ? 'text-red-500' : 'text-muted-foreground'}`} />
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {isOverdue(task) && <AlertCircle className="h-3 w-3 animate-pulse" />}
                       </div>
                    )}

                    {canApprove(task) && (
                       <div className="flex gap-2 pt-1 border-t border-border/30 mt-1">
                          <button onClick={() => handleApproveTask(task.id)} className="flex-1 flex items-center justify-center gap-1.5 text-[10px] bg-green-500/10 text-green-600 hover:bg-green-500/20 py-2 rounded-lg font-bold shadow-xs transition-all active:scale-95 border border-green-500/20"><Check className="h-3 w-3 stroke-[3px]" /> Approve</button>
                          <button onClick={() => handleRejectTask(task.id)} className="flex-1 flex items-center justify-center gap-1.5 text-[10px] bg-red-500/10 text-red-600 hover:bg-red-500/20 py-2 rounded-lg font-bold shadow-xs transition-all active:scale-95 border border-red-500/20"><X className="h-3 w-3 stroke-[3px]" /> Reject</button>
                       </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 mt-2">
                       <div className="flex items-center gap-2 overflow-hidden group/meta">
                          <div className="h-6 w-6 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shadow-xs">
                             {getInitials(task.assignee?.name || 'U')}
                          </div>
                          <div className="flex flex-col min-w-0">
                             <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/60 font-black">Assignee</span>
                             <span className="text-[11px] font-bold text-foreground/80 truncate leading-tight group-hover/meta:text-primary transition-colors">{task.assignee?.name || 'Unassigned'}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 overflow-hidden grayscale hover:grayscale-0 transition-all group/meta">
                         <div className="h-6 w-6 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shadow-xs">
                             {getInitials(task.creator?.name || 'S')}
                          </div>
                         <div className="flex flex-col min-w-0">
                             <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/60 font-black">Reporter</span>
                             <span className="text-[11px] font-bold text-muted-foreground truncate leading-tight">{task.creator?.name || 'Self'}</span>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === col.id).length === 0 && (
                 <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/40 animate-in fade-in zoom-in-95 duration-300 bg-muted/5">
                    <div className="bg-muted/30 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 border border-border/20 shadow-xs">
                       <CheckSquare className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground/60 tracking-tight">Clear horizon!</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-1 capitalize italic font-medium">No tasks in {col.label.toLowerCase()}</p>
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl space-y-4">
               <h2 className="text-lg font-bold text-foreground">{selectedTask ? 'Edit Task' : 'Create Task'}</h2>
               <form onSubmit={handleCreateOrUpdateTask} className="space-y-3">
                  <div>
                     <label className="block text-xs font-medium mb-1">Title</label>
                     <input type="text" required value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"/>
                  </div>
                  <div>
                     <label className="block text-xs font-medium mb-1">Description</label>
                     <textarea value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm h-20"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                        <label className="block text-xs font-medium mb-1">Priority</label>
                        <select value={priority} onChange={(e)=>setPriority(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                           <option value="LOW">Low</option>
                           <option value="MEDIUM">Medium</option>
                           <option value="HIGH">High</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-medium mb-1">Assignee</label>
                        <select value={assigneeId} onChange={(e)=>setAssigneeId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                           <option value="">Unassigned</option>
                           {members.filter(m => {
                              const memberLevel = m.role?.level ?? 99;
                              const actorLevel = user?.level ?? 99;
                              if (actorLevel === 0) return true;
                              return memberLevel >= actorLevel;
                           }).map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                           ))}
                        </select>
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-medium mb-1">Deadline</label>
                     <div className="relative">
                        <input 
                           type="date" 
                           value={dueDate} 
                           onChange={(e)=>setDueDate(e.target.value)} 
                           className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                     </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-3 border-t border-border mt-1">
                     <button type="button" onClick={()=>setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium text-sm">Cancel</button>
                     <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm transition-all focus:ring-2 focus:ring-primary/50">
                        {submitting ? 'Saving...' : selectedTask ? 'Update' : 'Create'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isConfirmModalOpen}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={handleDeleteTask}
        onCancel={() => setIsConfirmModalOpen(false)}
        variant="danger"
        confirmText="Delete Task"
      />
    </div>
  );
}
