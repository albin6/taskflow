'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../lib/axios';
import { 
  Plus, 
  Users, 
  CheckSquare, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Calendar, 
  AlertCircle, 
  Loader2,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import ConfirmationModal from '../../components/ui/confirmation-modal';
import { ToastContainer } from '../../components/ui/toast';
import TaskCard from '../../components/tasks/task-card';
import InputError from '../../components/ui/input-error';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  assigneeId: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().optional().nullable(),
  isRecurring: z.boolean(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  daysOfWeek: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function AssignTasksPage() {
  const { user } = useAuthStore();
  const [teamSummary, setTeamSummary] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberTasks, setMemberTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
  
  // Toast State
  const [toasts, setToasts] = useState<any[]>([]);
  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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
      dueDate: '',
      isRecurring: false,
      frequency: 'DAILY',
      daysOfWeek: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      assigneeIds: [],
    },
  });

  const isRecurring = watch('isRecurring');
  const frequency = watch('frequency');
  const selectedDays = watch('daysOfWeek') || [];
  const selectedAssigneeIds = watch('assigneeIds') || [];

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
    setValue('assigneeIds', teamSummary.map(m => m.id));
  };

  const unselectAllMembers = () => {
    setValue('assigneeIds', []);
  };

  useEffect(() => {
    fetchTeamSummary();
  }, []);

  const fetchTeamSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/team-summary');
      setTeamSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch team summary', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberTasks = async (memberId: string) => {
    setTasksLoading(true);
    try {
      // Fetch tasks WHERE creator = me AND assignee = member
      const res = await api.get(`/tasks?creatorId=${user?.userId}&assigneeId=${memberId}`);
      setMemberTasks(res.data.tasks);
    } catch (err) {
      console.error('Failed to fetch member tasks', err);
    } finally {
      setTasksLoading(false);
    }
  };

  const onSelectMember = (member: any) => {
    setSelectedMember(member);
    fetchMemberTasks(member.id);
  };

  const onSaveTask: SubmitHandler<TaskFormValues> = async (data) => {
    try {
      if (data.isRecurring) {
        // ... (existing recurring logic)
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
           return;
        }

        await api.post('/tasks/recurring', payload);
      } else {
        if (editingTask) {
          await api.put(`/tasks/${editingTask.id}`, {
            title: data.title,
            description: data.description,
            priority: data.priority,
            assigneeId: data.assigneeId,
            dueDate: data.dueDate || null,
          });
        } else {
          await api.post('/tasks', {
            title: data.title,
            description: data.description,
            priority: data.priority,
            assigneeId: data.assigneeId,
            dueDate: data.dueDate || null,
            status: 'TODO'
          });
        }
      }
      addToast(editingTask ? 'Task updated successfully!' : 'Task assigned successfully!', 'success');
      setIsModalOpen(false);
      setEditingTask(null);
      reset();
      fetchTeamSummary();
      if (selectedMember) fetchMemberTasks(selectedMember.id);
    } catch (err: any) {
      addToast(err.message || 'Failed to save task.', 'error');
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    reset({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      isRecurring: false,
    });
    setIsModalOpen(true);
  };

  const handleDeleteTask = (task: any) => {
    setTaskToDelete(task);
    setIsDeleteDialogOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      addToast('Task deleted successfully!', 'success');
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
      fetchTeamSummary();
      if (selectedMember) fetchMemberTasks(selectedMember.id);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete task.', 'error');
    }
  };

  const columns = [
    { id: 'TODO', label: 'To Do', icon: CheckSquare, color: 'text-blue-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', icon: Clock, color: 'text-amber-500' },
    { id: 'DONE', label: 'Done', icon: CheckCircle2, color: 'text-green-500' }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-6">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Assign Task</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Delegate and manage team responsibilities</p>
        </div>
        <button 
          onClick={() => {
            setEditingTask(null);
            reset({ assigneeId: selectedMember?.id || '' });
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-primary/25 transition-all"
        >
          <Plus className="h-4 w-4 stroke-[3px]" />
          Create Task
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {!selectedMember ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {teamSummary.map(member => (
              <button
                key={member.id}
                onClick={() => onSelectMember(member)}
                className="group flex flex-col p-5 bg-card hover:bg-primary/5 border border-border hover:border-primary/30 rounded-2xl shadow-sm transition-all text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg group-hover:scale-110 transition-transform">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{member.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest leading-none mt-1">{member.role}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                
                <div className="flex items-center gap-6 mt-auto">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active Tasks</span>
                      <div className="flex items-center gap-2">
                         <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                         <span className="text-lg font-black text-foreground">{member.todoCount}</span>
                      </div>
                   </div>
                   <div className="flex-1 h-12 flex items-end">
                      <div className="w-full flex items-end gap-0.5 h-6">
                         {[35, 65, 45, 85, 55, 75, 45].map((h, i) => (
                            <div key={i} className="flex-1 bg-primary/20 rounded-t-xs hover:bg-primary/40 transition-colors" style={{ height: `${h}%` }} />
                         ))}
                      </div>
                   </div>
                </div>
              </button>
            ))}

            {teamSummary.length === 0 && (
               <div className="col-span-full py-20 bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 bg-muted/40 rounded-full flex items-center justify-center mb-4">
                     <Users className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">No Subordinates Found</h2>
                  <p className="text-sm text-muted-foreground mt-1">You can only assign tasks to peers and subordinates.</p>
               </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 mb-6">
               <button 
                onClick={() => setSelectedMember(null)}
                className="p-2 rounded-lg bg-muted/50 hover:bg-muted border border-border transition-colors text-muted-foreground hover:text-foreground"
               >
                 <ArrowLeft className="h-5 w-5" />
               </button>
               <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedMember.name}'s Tasks</h2>
                  <p className="text-xs text-muted-foreground font-medium italic">Viewing tasks assigned by you</p>
               </div>
               <div className="ml-auto px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                  Level {selectedMember.level}
               </div>
            </div>

            {tasksLoading ? (
               <div className="flex-1 flex items-center justify-center">
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 h-full max-h-[calc(100vh-250px)] overflow-hidden pb-4">
                {columns.map((col) => (
                  <div key={col.id} className="flex flex-col bg-muted/40 rounded-2xl border border-border/40 h-full overflow-hidden">
                    <div className="p-4 border-b border-border/30 bg-muted/40 backdrop-blur-md flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <col.icon className={`h-4 w-4 ${col.color}`} />
                        <h2 className="font-extrabold text-foreground text-sm tracking-tight">{col.label}</h2>
                        <span className="text-[10px] text-muted-foreground bg-muted/80 border border-border/40 px-2 py-0.5 rounded-full font-black">
                          {memberTasks.filter(t => t.status === col.id).length}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                      {memberTasks.filter(t => t.status === col.id).map(task => (
                        <div key={task.id} className="bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow relative group">
                           <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-sm text-foreground pr-6">{task.title}</h4>
                              <div className="flex items-center gap-2">
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  task.priority === 'HIGH' ? 'bg-red-100 text-red-600' : 
                                  task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                                }`}>
                                  {task.priority}
                                </div>
                                {task.creatorId === user?.userId && (
                                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => handleEditTask(task)}
                                      className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                      title="Edit Task"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTask(task)}
                                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                                      title="Delete Task"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                           </div>
                           <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{task.description || 'No description provided.'}</p>
                           <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                 <Calendar className="h-3 w-3" />
                                 <span className="text-[10px] font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}</span>
                              </div>
                           </div>
                        </div>
                      ))}
                      {memberTasks.filter(t => t.status === col.id).length === 0 && (
                        <div className="py-10 text-center opacity-40 italic text-xs font-medium">Empty</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl space-y-4">
               <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">{editingTask ? 'Edit Task' : 'Assign Team Task'}</h2>
                  <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="text-muted-foreground hover:text-foreground">
                    <Inbox className="h-5 w-5" />
                  </button>
               </div>
               <form onSubmit={handleSubmit(onSaveTask)} className="space-y-4">
                  {/* Recurring Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-2">
                       <div className={`p-1.5 rounded-lg ${isRecurring ? 'bg-primary/10' : 'bg-muted/50'}`}>
                         <Clock className={`h-4 w-4 ${isRecurring ? 'text-primary' : 'text-muted-foreground'}`} />
                       </div>
                       <span className="text-xs font-bold text-foreground uppercase tracking-widest leading-none">Recurring Task</span>
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

                  <div>
                     <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest leading-none">Title</label>
                     <input {...register('title')} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none" placeholder="Task title..." />
                     <InputError message={errors.title?.message} />
                  </div>

                  {isRecurring ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-widest leading-none">Frequency</label>
                          <select 
                             {...register('frequency')}
                             className="w-full px-3 py-2 rounded-xl border border-primary/20 bg-background text-sm font-bold focus:ring-2 focus:ring-primary/20 shadow-sm transition-all outline-none"
                          >
                             <option value="DAILY">Daily</option>
                             <option value="WEEKLY">Weekly</option>
                             <option value="MONTHLY">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-widest leading-none">Start Date</label>
                          <input 
                             {...register('startDate')}
                             type="date"
                             className="w-full px-3 py-2 rounded-xl border border-primary/20 bg-background text-sm font-bold focus:ring-2 focus:ring-primary/20 shadow-sm transition-all outline-none"
                          />
                        </div>
                      </div>

                      {frequency === 'WEEKLY' && (
                        <div>
                          <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-widest leading-none">Repeat On</label>
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
                        <div className="flex items-center gap-3 mb-2">
                          <label className="block text-xs font-bold text-primary uppercase tracking-widest flex-1 leading-none">Auto-Assignees</label>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={selectAllMembers}
                              className="text-[10px] font-black text-primary hover:underline uppercase tracking-tight"
                            >
                              Select All
                            </button>
                            <span className="text-[10px] text-primary/30">|</span>
                            <button 
                              type="button" 
                              onClick={unselectAllMembers}
                              className="text-[10px] font-black text-primary hover:underline uppercase tracking-tight"
                            >
                              Unselect All
                            </button>
                          </div>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 border border-primary/10 rounded-xl bg-background/50 custom-scrollbar">
                           {teamSummary.map(m => (
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
                      <div>
                         <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest leading-none">Assignee</label>
                         <select {...register('assigneeId')} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none">
                            <option value="" disabled>Select Member...</option>
                            {teamSummary.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                            ))}
                         </select>
                         <InputError message={errors.assigneeId?.message} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest leading-none">Priority</label>
                            <select {...register('priority')} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none">
                               <option value="LOW">Low</option>
                               <option value="MEDIUM">Medium</option>
                               <option value="HIGH">High</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest leading-none">Deadline</label>
                            <input {...register('dueDate')} type="date" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                         </div>
                      </div>
                    </>
                  )}
                  <div className="pt-4 flex gap-3">
                     <button type="button" onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="flex-1 px-4 py-2 rounded-xl border border-border hover:bg-muted font-bold text-sm transition-colors uppercase tracking-widest">Cancel</button>
                     <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all uppercase tracking-widest">
                       {editingTask ? 'Update Task' : 'Assign Task'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteDialogOpen}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={onConfirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </div>
  );
}
