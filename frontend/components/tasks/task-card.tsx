'use client';

import React, { memo } from 'react';
import { Edit3, Trash2, Calendar, AlertCircle, Check, X } from 'lucide-react';

interface TaskCardProps {
  task: any;
  user: any;
  priorityColors: Record<string, string>;
  isOverdue: (task: any) => boolean;
  canManageTask: (task: any) => boolean;
  canApprove: (task: any) => boolean;
  getInitials: (name: string) => string;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  openModal: (task: any) => void;
  confirmDeleteTask: (taskId: string) => void;
  handleApproveTask: (taskId: string) => void;
  handleRejectTask: (taskId: string) => void;
}

const TaskCard = ({
  task,
  user,
  priorityColors,
  isOverdue,
  canManageTask,
  canApprove,
  getInitials,
  onDragStart,
  openModal,
  confirmDeleteTask,
  handleApproveTask,
  handleRejectTask
}: TaskCardProps) => {
  return (
    <div
      draggable={true}
      onDragStart={(e) => onDragStart(e, task.id)}
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
            <span className={`text-[10px] px-2 py-1 rounded-md font-extrabold uppercase tracking-widest shadow-xs ${
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
  );
};

export default memo(TaskCard);
