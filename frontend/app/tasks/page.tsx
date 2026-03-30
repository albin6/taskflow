'use client';

import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { Plus, CheckSquare, Clock, CheckCircle2, Edit3, Trash2, Check, X, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import ConfirmationModal from '../../components/ui/confirmation-modal';
import { ToastContainer } from '../../components/ui/toast';
import TaskCard from '../../components/tasks/task-card';
import { useCallback, useRef } from 'react';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastTaskElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);
 
  // Toast State
  const [toasts, setToasts] = useState<any[]>([]);
  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
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
  const [showErrors, setShowErrors] = useState(false);

  const columns = [
    { id: 'TODO', label: 'To Do', icon: CheckSquare, color: 'text-blue-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', icon: Clock, color: 'text-amber-500' },
    { id: 'DONE', label: 'Done', icon: CheckCircle2, color: 'text-green-500' }
  ];

  useEffect(() => {
    fetchTasks(1, true);
    fetchMembers();
  }, []);

  useEffect(() => {
    if (page > 1) {
      fetchTasks(page, false);
    }
  }, [page]);

  const fetchTasks = async (pageNum: number, isInitial: boolean) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const res = await api.get(`/tasks?page=${pageNum}&limit=20`);
      const { tasks: newTasks, total: totalCount } = res.data;
      
      setTasks(prev => isInitial ? newTasks : [...prev, ...newTasks]);
      setTotal(totalCount);
      setHasMore(tasks.length + newTasks.length < totalCount);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
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
      addToast(`Task moved to ${targetStatus.replace('_', ' ')}`, 'success');
      // Update local state optimistically for speed
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        addToast('Impossible Move: Task status cannot be moved backwards manually.', 'error');
      } else if (status === 403) {
        addToast('Access Denied: Only the creator or assignee can update status.', 'error');
      } else {
        addToast(err.response?.data?.message || 'Failed to update task status.', 'error');
      }
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
    setShowErrors(false);
    setIsModalOpen(true);
  };

  const handleCreateOrUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    if (!assigneeId) {
      setShowErrors(true);
      addToast('Please assign the task to at least one user', 'error');
      return;
    }

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
        addToast('Task updated successfully', 'success');
      } else {
        await api.post('/tasks', { ...payload, status: 'TODO' });
        addToast('New task created!', 'success');
      }

      setIsModalOpen(false);
      setShowErrors(false);
      fetchTasks(1, true); // Refresh from first page
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save task.', 'error');
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
      addToast('Task deleted successfully', 'success');
      setIsConfirmModalOpen(false);
      setTaskToDelete(null);
      fetchTasks(1, true); // Refresh
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete task.', 'error');
      console.error('Failed to delete task', err);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/approve`);
      setTasks(prev => prev.filter(t => t.id !== taskId)); // Remove since it's approved
      addToast('Task approved!', 'success');
    } catch (err) {
      console.error('Failed to approve task', err);
      addToast('Failed to approve task', 'error');
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/reject`);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'IN_PROGRESS' } : t));
      addToast('Task rejected - moved back to In Progress', 'info');
    } catch (err) {
      console.error('Failed to reject task', err);
      addToast('Failed to reject task', 'error');
    }
  };

  // Determine if actor can manage total details
  const canManageTask = (task: any): boolean => {
     const isOwner = task.creator?.id === user?.userId;
     const isAssignee = task.assignee?.id === user?.userId;
     const isManager = (user?.level !== undefined && user.level <= 2);
     
     if (isAssignee && !isOwner && !isManager) return false;
     return !!(user?.level === 0 || isOwner || isManager || canEditGeneral);
  };

  const canDropTask = (task: any): boolean => {
     const isOwner = task.creator?.id === user?.userId;
     const isAssignee = task.assignee?.id === user?.userId;
     const isManager = (user?.level !== undefined && user.level <= 2);
     
     return !!(isOwner || isManager || isAssignee || canEditGeneral);
  };

  const canApprove = (task: any): boolean => {
     const isAssigner = task.assigner?.id === user?.userId;
     const isManager = (user?.level !== undefined && user.level <= 2);
     const isSelfAssigned = task.assignee?.id === task.creator?.id;

     if (task.status !== 'DONE') return false;

     if (isSelfAssigned) {
        const actorLevel = user?.level ?? 99;
        const creatorLevel = task.creator?.creator_role?.level ?? 99;
        return !!(actorLevel < creatorLevel || user?.level === 0); 
     }

     return !!(isAssigner || isManager || user?.level === 0);
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
      <ToastContainer toasts={toasts} onClose={removeToast} />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 h-full max-h-[calc(100vh-180px)] overflow-hidden pb-4">
        {columns.map((col) => (
          <div 
            key={col.id} 
            className="flex flex-col bg-muted/40 rounded-2xl border border-border/40 h-full backdrop-blur-xs transition-colors hover:bg-muted/50 overflow-hidden"
            onDragOver={allowDrop}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Sticky Header Container */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-border/30 bg-muted/40 backdrop-blur-md rounded-t-2xl shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg bg-card border border-border/40 shadow-xs ${col.color.replace('text-', 'bg-').replace('-500', '-500/10')}`}>
                  <col.icon className={`h-4 w-4 ${col.color}`} />
                </div>
                <h2 className="font-extrabold text-foreground text-sm tracking-tight capitalize">{col.label}</h2>
                <span className="text-[10px] text-muted-foreground bg-muted/80 border border-border/40 px-2 py-0.5 rounded-full font-black">
                   {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>
            </div>
 
            {/* Scrollable Task Area */}
            <div className="p-3 space-y-4 flex-1 overflow-y-auto pb-8 custom-scrollbar">
              {tasks.filter(t => t.status === col.id).map((task, index, filteredTasks) => {
                const isLastTask = index === filteredTasks.length - 1;
                return (
                  <div key={task.id} ref={isLastTask ? lastTaskElementRef : null}>
                    <TaskCard
                      task={task}
                      user={user}
                      priorityColors={priorityColors}
                      isOverdue={isOverdue}
                      canManageTask={canManageTask}
                      canApprove={canApprove}
                      getInitials={getInitials}
                      onDragStart={handleDragStart}
                      openModal={openModal}
                      confirmDeleteTask={confirmDeleteTask}
                      handleApproveTask={handleApproveTask}
                      handleRejectTask={handleRejectTask}
                    />
                  </div>
                );
              })}
              
              {loadingMore && (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {tasks.filter(t => t.status === col.id).length === 0 && !loading && (
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
                        <select 
                           value={assigneeId} 
                           onChange={(e)=>{
                              setAssigneeId(e.target.value);
                              if (e.target.value) setShowErrors(false);
                           }} 
                           className={`w-full px-3 py-2 rounded-lg border bg-background text-sm transition-all ${showErrors && !assigneeId ? 'border-red-500 ring-2 ring-red-500/20' : 'border-border'}`}
                        >
                           <option value="" disabled>Select Assignee...</option>
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
