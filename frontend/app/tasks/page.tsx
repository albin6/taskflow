'use client';

import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { Plus, CheckSquare, Clock, CheckCircle2, Edit3, Trash2, Check, X, Calendar, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
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

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Task Board</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage organize work streams visually</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => openModal()}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center gap-1.5 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        )}
      </div>

      {loading && tasks.length === 0 ? (
         <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading tickets...</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {columns.map((col) => (
          <div 
            key={col.id} 
            className="flex flex-col bg-muted/30 rounded-xl border border-border/60 p-4 h-full"
            onDragOver={allowDrop}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <col.icon className={`h-4 w-4 ${col.color}`} />
                <h2 className="font-semibold text-foreground text-sm">{col.label}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">
                   {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pb-4">
              {tasks.filter(t => t.status === col.id).map((task) => (
                <div
                  key={task.id}
                  draggable={true} // Anyone can drag their items to change status
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className={`bg-card p-4 rounded-xl border ${isOverdue(task) ? 'border-red-500/50 shadow-red-500/5' : 'border-border/80'} shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-border transition-all space-y-2 group relative`}
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-xs rounded-md p-0.5 border border-border/40">
                     {canManageTask(task) && (
                        <>
                           <button onClick={() => openModal(task)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"><Edit3 className="h-3 w-3" /></button>
                           <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded"><Trash2 className="h-3 w-3" /></button>
                        </>
                     )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                     <h3 className="font-medium text-foreground text-sm leading-snug">{task.title}</h3>
                     <span className={`text-xxs px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        task.priority === 'HIGH' ? 'bg-red-500/10 text-red-600' :
                        task.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600' : 'bg-green-500/10 text-green-600'
                     }`}>
                        {task.priority}
                     </span>
                  </div>
                  {task.description && (
                     <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  )}
                  
                  {task.dueDate && (
                     <div className={`flex items-center gap-1 text-[10px] font-medium ${isOverdue(task) ? 'text-red-500' : 'text-muted-foreground'}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                        {isOverdue(task) && <AlertCircle className="h-2.5 w-2.5 ml-auto" />}
                     </div>
                  )}

                  {canApprove(task) && (
                     <div className="flex gap-2 pt-1">
                        <button onClick={() => handleApproveTask(task.id)} className="flex-1 flex items-center justify-center gap-1 text-xxs bg-green-500/10 text-green-600 hover:bg-green-500/20 py-1 rounded font-medium"><Check className="h-3 w-3" /> Approve</button>
                        <button onClick={() => handleRejectTask(task.id)} className="flex-1 flex items-center justify-center gap-1 text-xxs bg-red-500/10 text-red-600 hover:bg-red-500/20 py-1 rounded font-medium"><X className="h-3 w-3" /> Reject</button>
                     </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-2 text-xxs text-muted-foreground">
                     <span className="truncate max-w-[120px]">To: {task.assignee?.name || 'Unassigned'}</span>
                     <span>By: {task.assigner?.name || 'Self'}</span>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === col.id).length === 0 && (
                 <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    No items here
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
    </div>
  );
}

