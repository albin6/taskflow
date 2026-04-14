'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Headset,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../lib/axios';
import EditTicketModal from './components/EditTicketModal';
import TicketDetailView from './components/TicketDetailView';
import SupportAnalytics from './components/SupportAnalytics';
import { TechSupportTicket } from './types';


const SORT_OPTIONS = [
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'name', label: 'Name' },
  { value: 'assignedTo', label: 'Assigned To' },
  { value: 'firstCallStatus', label: 'First Call Status' },
  { value: 'dateOfSecondCall', label: 'Second Call Date' },
  { value: 'secondCallStatus', label: 'Second Call Status' },
];

export default function TechSupportPage() {
  const { user } = useAuthStore();
  const hasAccess = !!(user?.level === 0 || user?.permissions?.includes('TECH_SUPPORT'));
  const [tickets, setTickets] = useState<TechSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [firstCallStatus, setFirstCallStatus] = useState('');
  const [secondCallStatus, setSecondCallStatus] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TechSupportTicket | null>(null);

  const fetchTickets = async () => {
    if (!hasAccess) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.get('/tech-support', {
        params: {
          page,
          limit: 20,
          search: debouncedSearch || undefined,
          domain: domain || undefined,
          assignedTo: assignedTo || undefined,
          firstCallStatus: firstCallStatus || undefined,
          secondCallStatus: secondCallStatus || undefined,
          sortBy,
          sortOrder,
        },
      });

      setTickets(response.data.data || []);
      setMeta(response.data.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || 'Failed to load Tech Support records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchTickets();
  }, [page, sortBy, sortOrder, domain, assignedTo, firstCallStatus, secondCallStatus, debouncedSearch]);

  const domains = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.domain).filter(Boolean))).sort(),
    [tickets],
  );
  const assignees = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.assignedTo).filter(Boolean))).sort(),
    [tickets],
  );
  const firstStatuses = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.firstCallStatus).filter(Boolean))).sort(),
    [tickets],
  );
  const secondStatuses = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.secondCallStatus).filter(Boolean))).sort(),
    [tickets],
  );

  if (!hasAccess) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center">
        <div className="max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tech Support Access Required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This module is available to global admins by default, and to other roles only when they include the <span className="font-semibold text-foreground">Tech Support</span> permission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tech Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and track Tech Support entries synced from Google Sheets.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="relative md:col-span-2 xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, batch, issue..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <select
          value={domain}
          onChange={(event) => {
            setDomain(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Domains</option>
          {domains.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={assignedTo}
          onChange={(event) => {
            setAssignedTo(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Assignees</option>
          {assignees.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={firstCallStatus}
          onChange={(event) => {
            setFirstCallStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All First Call Statuses</option>
          {firstStatuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={secondCallStatus}
          onChange={(event) => {
            setSecondCallStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Second Call Statuses</option>
          {secondStatuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <SupportAnalytics />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              {sortOrder === 'ASC' ? <ArrowUpAZ className="h-6 w-6" /> : <ArrowDownAZ className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sorting Options</h2>
              <p className="text-sm text-muted-foreground">
                {SORT_OPTIONS.find((option) => option.value === sortBy)?.label || 'Timestamp'} in {sortOrder} order
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortOrder((current) => (current === 'ASC' ? 'DESC' : 'ASC'))}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Toggle Order
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch / Domain</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned To</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">First Call</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Second Call</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Issue</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading Tech Support records...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-red-500">
                    {error}
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No Tech Support entries matched your current filters.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr 
                    key={ticket.rowIndex} 
                    className="align-top hover:bg-muted/20 cursor-pointer group"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setIsDetailOpen(true);
                    }}
                  >
                    <td className="px-4 py-4 text-sm text-foreground">{ticket.timestamp || '-'}</td>
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-foreground">{ticket.name || '-'}</div>
                      <div className="text-muted-foreground">{ticket.email || '-'}</div>
                      <div className="text-muted-foreground">{ticket.contactNo || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground">
                      <div>{ticket.batchNo || '-'}</div>
                      <div className="text-muted-foreground">{ticket.domain || '-'}</div>
                      <div className="text-muted-foreground">Module {ticket.module || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground">{ticket.assignedTo || '-'}</td>
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-foreground">{ticket.firstCallStatus || '-'}</div>
                      <div className="text-muted-foreground">{ticket.firstCallTime || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-foreground">{ticket.secondCallStatus || '-'}</div>
                      <div className="text-muted-foreground">{ticket.dateOfSecondCall || '-'}</div>
                    </td>
                    <td className="max-w-xl px-4 py-4 text-sm text-muted-foreground">
                      <div className="line-clamp-3">{ticket.description || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(ticket);
                          setIsModalOpen(true);
                        }}
                        className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100"
                        title="Edit Ticket"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>
            Showing page <span className="font-medium text-foreground">{meta.page}</span> of{' '}
            <span className="font-medium text-foreground">{meta.totalPages}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={meta.page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              className="rounded-lg border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedTicket && (
        <EditTicketModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            if (!isDetailOpen) setSelectedTicket(null);
          }}
          onSuccess={fetchTickets}
          ticket={selectedTicket}
        />
      )}

      {selectedTicket && (
        <TicketDetailView
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTicket(null);
          }}
          onEdit={() => {
            setIsDetailOpen(false);
            setIsModalOpen(true);
          }}
          ticket={selectedTicket}
        />
      )}
    </div>
  );
}
