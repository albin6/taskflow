'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Upload, User, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../../lib/axios';
import { TechSupportTicket } from '../types';

interface EditTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ticket: TechSupportTicket;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
}

const TICKET_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

/**
 * Converts various date formats (like 18/04/2026 15:35:38) to datetime-local format (YYYY-MM-DDTHH:MM)
 */
function toDatetimeLocal(dateStr: string): string {
  if (!dateStr) return '';
  
  // Try cleaning the string (handles "at", non-breaking spaces, etc.)
  const cleaned = dateStr.replace(/\u202f/g, ' ').replace(/\s+/g, ' ').replace(' at ', ' ').trim();
  
  // Try standard parsing
  let date = new Date(cleaned);
  
  // If standard parsing fails, try manual parsing for DD/MM/YYYY
  if (isNaN(date.getTime())) {
    const parts = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{1,2}))?/);
    if (parts) {
      const [_, d, m, y, h = '00', min = '00'] = parts;
      date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}`);
    }
  }

  if (isNaN(date.getTime())) return '';

  // Return in YYYY-MM-DDTHH:MM format
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Converts datetime-local value back to sheet-friendly format (DD/MM/YYYY HH:MM:SS)
 */
function fromDatetimeLocal(val: string): string {
  if (!val) return '';
  const [date, time] = val.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time}:00`;
}

export default function EditTicketModal({ isOpen, onClose, onSuccess, ticket }: EditTicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [formData, setFormData] = useState({
    assignedTo: ticket.assignedTo || '',
    status: ticket.firstCallStatus?.toLowerCase() || 'pending',
    remarks: ticket.firstCallRemarks || '',
    resolvedTime: toDatetimeLocal(ticket.firstCallTime || ticket.timestamp),
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSupportUsers();
      setFormData({
        assignedTo: ticket.assignedTo || '',
        status: ticket.firstCallStatus?.toLowerCase() || 'pending',
        remarks: ticket.firstCallRemarks || '',
        resolvedTime: toDatetimeLocal(ticket.firstCallTime || ticket.timestamp),
      });
      setSelectedFile(null);
      setError('');
      setSuccess(false);
    }
  }, [isOpen, ticket]);

  const fetchSupportUsers = async () => {
    setFetchingUsers(true);
    try {
      const response = await api.get('/users', {
        params: { permission: 'TECH_SUPPORT', limit: 100 },
      });
      setUsers(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch support users:', err);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const submitData = new FormData();
    submitData.append('assignedTo', formData.assignedTo);
    submitData.append('status', formData.status);
    submitData.append('remarks', formData.remarks || (selectedFile ? '' : 'Audio Recording is not Available'));
    submitData.append('resolvedTime', fromDatetimeLocal(formData.resolvedTime));
    
    if (selectedFile) {
      submitData.append('audio', selectedFile);
    }

    try {
      await api.patch(`/tech-support/${ticket.rowIndex}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Update Support Ticket</h3>
            <p className="text-sm text-muted-foreground">Editing entry for {ticket.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-4 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-green-500/10 p-4 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Ticket updated successfully!
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Assigned To</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                disabled={fetchingUsers}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              {fetchingUsers && (
                <Loader2 className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Current Status</label>
            <div className="grid grid-cols-3 gap-2">
              {TICKET_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s.value })}
                  className={`rounded-xl border border-border py-2.5 text-xs font-medium transition-all ${
                    formData.status === s.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Resolved Time & Date (24h)</label>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-border bg-background py-2.5 px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
              value={formData.resolvedTime}
              onChange={(e) => setFormData({ ...formData, resolvedTime: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground px-1">Defaulted to original ticket timestamp.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Call Recording (Audio File)</label>
            <div 
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-6 transition-colors ${
                selectedFile ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
              }`}
            >
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <Upload className={`mb-2 h-8 w-8 ${selectedFile ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-sm text-center text-foreground font-medium">
                {selectedFile ? selectedFile.name : 'Click or drag to upload audio'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">MP3, WAV, M4A supported</p>
              {selectedFile && (
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="mt-2 text-xs text-red-500 hover:underline"
                >
                  Remove file
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Remarks / Summary</label>
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-border bg-background p-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter details about the call or ticket resolution..."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
