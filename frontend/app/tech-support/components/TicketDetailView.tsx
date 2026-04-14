'use client';

import { X, User, Phone, Mail, Calendar, Clock, MessageSquare, Mic, Shield, ExternalLink, Pencil } from 'lucide-react';
import { TechSupportTicket } from '../types';


interface TicketDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  ticket: TechSupportTicket;
}

export default function TicketDetailView({ isOpen, onClose, onEdit, ticket }: TicketDetailViewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Slide-over Content */}
      <div className="relative w-full max-w-xl h-full bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">Ticket Details</h3>
            <p className="text-sm text-muted-foreground">Row #{ticket.rowIndex} • {ticket.timestamp}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button 
              onClick={onClose} 
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Section: Student Info */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              <h4 className="font-semibold uppercase tracking-wider text-xs">Student Information</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/30 p-4 border border-border">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium text-foreground">{ticket.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Batch</p>
                <p className="text-sm font-medium text-foreground">{ticket.batchNo || '-'}</p>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm text-foreground">{ticket.email || '-'}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm text-foreground">{ticket.contactNo || '-'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Issue Details */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <MessageSquare className="h-5 w-5" />
              <h4 className="font-semibold uppercase tracking-wider text-xs">Issue Description</h4>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">{ticket.domain}</span>
                <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px] font-bold uppercase">Module {ticket.module}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {ticket.description || 'No description provided.'}
              </p>
            </div>
          </section>

          {/* Section: Call Logs */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Mic className="h-5 w-5" />
              <h4 className="font-semibold uppercase tracking-wider text-xs">Support History</h4>
            </div>
            
            <div className="space-y-4">
              {/* Call 1 */}
              <div className="relative pl-6 border-l-2 border-border pb-2">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary border-4 border-card" />
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">First Call</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ticket.firstCallStatus?.toLowerCase() === 'resolved' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {ticket.firstCallStatus || 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {ticket.firstCallTime || '-'}</div>
                  </div>
                  <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-xl">
                    "{ticket.firstCallRemarks || 'No remarks yet.'}"
                  </p>
                  {ticket.firstCallRecordingLink && ticket.firstCallRecordingLink !== 'Audio Recording is not Available' && (
                    <a 
                      href={ticket.firstCallRecordingLink} 
                      target="_blank" 
                      className="inline-flex items-center gap-2 text-xs text-primary font-semibold hover:underline"
                    >
                      <Mic className="h-3 w-3" /> Listen to Recording <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Call 2 */}
              <div className="relative pl-6 border-l-2 border-border">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-muted border-4 border-card" />
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Second Call</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ticket.secondCallStatus?.toLowerCase() === 'resolved' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {ticket.secondCallStatus || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {ticket.dateOfSecondCall || '-'}</div>
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {ticket.secondCallTime || '-'}</div>
                  </div>
                  {ticket.secondCallRemarks && (
                    <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-xl">
                      "{ticket.secondCallRemarks}"
                    </p>
                  )}
                  {ticket.secondCallRecordingLink && (
                    <a 
                      href={ticket.secondCallRecordingLink} 
                      target="_blank" 
                      className="inline-flex items-center gap-2 text-xs text-primary font-semibold hover:underline"
                    >
                      <Mic className="h-3 w-3" /> Listen to Recording <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Assignment */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <h4 className="font-semibold uppercase tracking-wider text-xs">Assignment Info</h4>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-muted/30 p-4 border border-border">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {ticket.assignedTo?.[0] || '?'}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned Team Member</p>
                <p className="text-sm font-semibold text-foreground">{ticket.assignedTo || 'Unassigned'}</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer info/actions could go here */}
        <div className="h-20" /> 
      </div>
    </div>
  );
}
