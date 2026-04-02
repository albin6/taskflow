'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../lib/axios';
import { Plus, CheckSquare, Clock, CheckCircle2, Edit3, Trash2, Check, X, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import ConfirmationModal from '../../components/ui/confirmation-modal';
import { ToastContainer } from '../../components/ui/toast';
import TaskCard from '../../components/tasks/task-card';
import InputError from '../../components/ui/input-error';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().optional().nullable(),
  isRecurring: z.boolean(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  daysOfWeek: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

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
  const canCreate = user?.level !== 0 && user?.permissions?.includes('CREATE_TASK');
  const canEditGeneral = user?.level !== 0 && user?.permissions?.includes('EDIT_TASK');

  // Modal / Form State
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      assigneeId: '',
      assigneeIds: [],
      dueDate: '',
      isRecurring: false,
      frequency: 'DAILY',
      daysOfWeek: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    },
  });

  const isRecurring = watch('isRecurring');
  const frequency = watch('frequency');
  const selectedDays = watch('daysOfWeek') || [];
  const selectedAssigneeIds = watch('assigneeIds') || [];

  // Early return for System Admins
  if (user?.level === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-card rounded-xl border border-border shadow-sm m-6">
        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          System Administrators are restricted from accessing the task management module. 
          Task management is reserved for Team Leads, Heads, and Members to maintain a clear 
          separation of system administration and workflow responsibilities.
        </p>
        <button 
          onClick={() => window.location.href = '/dashboard'}
          className="mt-8 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

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
    if (task && !canDropTask(task)) return;

    try {
      await api.patch(`/tasks/${taskId}`, { status: targetStatus });
      addToast(`Task moved to ${targetStatus.replace('_', ' ')}`, 'success');
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));
    } catch (err: any) {
      const status = err.status;
      if (status === 409) {
        addToast('Impossible Move: Task status cannot be moved backwards manually.', 'error');
      } else if (status === 403) {
        addToast('Access Denied: Only the creator or assignee can update status.', 'error');
      } else {
        addToast(err.message || 'Failed to update task status.', 'error');
      }
    }
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const openModal = (task: any = null) => {
    setSelectedTask(task);
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        assigneeId: task.assignee?.id || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        isRecurring: false,
        frequency: 'DAILY',
        daysOfWeek: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        assigneeIds: [],
      });
    } else {
      reset({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assigneeId: '',
        assigneeIds: [],
        dueDate: '',
        isRecurring: false,
        frequency: 'DAILY',
        daysOfWeek: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });
    }
    setIsModalOpen(true);
  };

  const onSaveTask: SubmitHandler<TaskFormValues> = async (data) => {
    setSubmitting(true);
    try {
      if (selectedTask) {
        // Edit path: Simple update to title, description, priority, assignee, due date
        const payload = {
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          assigneeId: data.assigneeId || null,
          dueDate: data.dueDate || null,
        };
        await api.patch(`/tasks/${selectedTask.id}`, payload);
        addToast('Task updated successfully', 'success');
      } else if (data.isRecurring) {
        // Create Recurring path
        const payload = {
          title: data.title,
          description: data.description,
          priority: data.priority,
          frequency: data.frequency,
          daysOfWeek: data.daysOfWeek,
          startDate: data.startDate,
          endDate: data.endDate || null,
          assigneeIds: data.assigneeIds && data.assigneeIds.length > 0 
            ? data.assigneeIds 
            : data.assigneeId ? [data.assigneeId] : [],
        };

        if (payload.assigneeIds.length === 0) {
          addToast('Please select at least one assignee for recurring tasks', 'error');
          setSubmitting(false);
          return;
        }

        await api.post('/tasks/recurring', payload);
        addToast('Recurring task automation set up!', 'success');
      } else {
        // Create Simple path
        const payload = {
          title: data.title,
          description: data.description,
          priority: data.priority,
          assigneeId: data.assigneeId || null,
          dueDate: data.dueDate || null,
          status: 'TODO'
        };
        await api.post('/tasks', payload);
        addToast('New task created!', 'success');
      }

      setIsModalOpen(false);
      fetchTasks(1, true);
    } catch (err: any) {
      addToast(err.message || 'Failed to save task.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day: string) => {
    const current = selectedDays;
    if (current.includes(day)) {
      setValue('daysOfWeek', current.filter(d => d !== day));
    } else {
      setValue('daysOfWeek', [...current, day]);
    }
  };

  const toggleAssignee = (id: string) => {
    const current = selectedAssigneeIds;
    if (current.includes(id)) {
      setValue('assigneeIds', current.filter(i => i !== id));
    } else {
      setValue('assigneeIds', [...current, id]);
    }
  };

  const selectAllMembers = () => {
    setValue('assigneeIds', members.map(m => m.id));
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
      fetchTasks(1, true);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete task.', 'error');
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/approve`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      addToast('Task approved!', 'success');
    } catch (err) {
      addToast('Failed to approve task', 'error');
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/reject`);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'IN_PROGRESS' } : t));
      addToast('Task rejected - moved back to In Progress', 'info');
    } catch (err) {
      addToast('Failed to reject task', 'error');
    }
  };

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
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 flex flex-col pb-8">
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
               <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">{selectedTask ? 'Edit Task' : 'Create Task'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={20} />
                  </button>
               </div>
                <form onSubmit={handleSubmit(onSaveTask)} className="space-y-4">
                  {/* Recurring Toggle */}
                  {!selectedTask && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                      <div className="flex items-center gap-2">
                         <div className={`p-1.5 rounded-lg ${isRecurring ? 'bg-primary/10' : 'bg-muted/50'}`}>
                           <Clock className={`h-4 w-4 ${isRecurring ? 'text-primary' : 'text-muted-foreground'}`} />
                         </div>
                         <span className="text-xs font-bold text-foreground uppercase tracking-widest">Recurring Task</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          {...register('isRecurring')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  )}

                  <div>
                     <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Title</label>
                     <input 
                        {...register('title')}
                        type="text" 
                        className={`w-full px-4 py-2.5 rounded-xl border bg-background text-sm transition-all font-medium ${
                          errors.title ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                        }`}
                        placeholder="e.g. Weekly Status Update"
                     />
                     <InputError message={errors.title?.message} />
                  </div>

                  {!isRecurring && (
                    <div>
                       <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest font-medium">Description</label>
                       <textarea 
                          {...register('description')}
                          className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm h-20 resize-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                          placeholder="Optional details..."
                       />
                    </div>
                  )}

                  {isRecurring ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-widest">Frequency</label>
                          <select 
                             {...register('frequency')}
                             className="w-full px-3 py-2 rounded-xl border border-primary/20 bg-background text-sm font-bold focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                          >
                             <option value="DAILY">Daily</option>
                             <option value="WEEKLY">Weekly</option>
                             <option value="MONTHLY">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-widest">Start Date</label>
                          <input 
                             {...register('startDate')}
                             type="date"
                             className="w-full px-3 py-2 rounded-xl border border-primary/20 bg-background text-sm font-bold focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                          />
                        </div>
                      </div>

                      {frequency === 'WEEKLY' && (
                        <div>
                          <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-widest">Repeat On</label>
                          <div className="flex flex-wrap gap-2">
                             {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleDay(day)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                                    selectedDays.includes(day) 
                                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20 scale-105' 
                                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                                  }`}
                                >
                                  {day.slice(0, 3)}
                                </button>
                             ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold text-primary uppercase tracking-widest">Auto-Assignees</label>
                          <button 
                            type="button" 
                            onClick={selectAllMembers}
                            className="text-[10px] font-black text-primary hover:underline uppercase tracking-tight"
                          >
                            Select All team
                          </button>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 border border-primary/10 rounded-xl bg-background/50 custom-scrollbar">
                           {members.map(m => (
                             <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedAssigneeIds.includes(m.id) ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                               <input 
                                 type="checkbox" 
                                 checked={selectedAssigneeIds.includes(m.id)}
                                 onChange={() => toggleAssignee(m.id)}
                                 className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                               />
                               <span className="text-xs font-bold text-foreground">{m.name}</span>
                             </label>
                           ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Priority</label>
                            <select 
                               {...register('priority')}
                               className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                            >
                               <option value="LOW">Low</option>
                               <option value="MEDIUM">Medium</option>
                               <option value="HIGH">High</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Assignee</label>
                            <select 
                               {...register('assigneeId')}
                               className={`w-full px-4 py-2.5 rounded-xl border bg-background text-sm transition-all font-bold ${
                                 errors.assigneeId ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                               }`}
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
                            <InputError message={errors.assigneeId?.message} />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest font-medium">Deadline</label>
                         <div className="relative">
                            <input 
                               {...register('dueDate')}
                               type="date" 
                               className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                            />
                            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                         </div>
                      </div>
                    </>
                  )}
                  <div className="flex gap-2 justify-end pt-4 border-t border-border mt-2">
                     <button type="button" onClick={()=>setIsModalOpen(false)} className="px-5 py-2 rounded-lg border border-border hover:bg-muted font-bold text-sm transition-colors">Cancel</button>
                     <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Saving...' : selectedTask ? 'Update Task' : 'Create Task'}
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
