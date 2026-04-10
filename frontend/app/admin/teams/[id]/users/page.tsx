'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import api from '../../../../../lib/axios';
import { 
  Plus, 
  UserPlus, 
  Search, 
  ArrowUpDown, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  EyeOff,
  X,
  Loader2,
  Users,
  Mail,
  ShieldCheck,
  MoreVertical,
  Trash2,
  Ban,
  CheckCircle,
  Edit,
  ShieldAlert
} from 'lucide-react';
import InputError from '../../../../../components/ui/input-error';

// Simple debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function TeamUsersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = use(params);
  const [team, setTeam] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  // Table State
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const limit = 10;

  // Modal & Action State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Define strict types for the form
  interface UserFormValues {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    roleId: string;
    status?: string | any;
  }

  // Relax password requirement during edit
  const userSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: isEditMode ? z.string().optional() : z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    roleId: z.string().min(1, 'Role is required'),
    status: z.string().optional(),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      roleId: '',
      status: 'ACTIVE'
    },
  });

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedUser(null);
    reset({
      name: '',
      email: '',
      password: '',
      phone: '',
      roleId: '',
      status: 'ACTIVE'
    });
    setServerError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: any) => {
    setIsEditMode(true);
    setSelectedUser(user);
    // Use reset to populate the form
    reset({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      roleId: user.role?.id || '',
      status: user.status || 'ACTIVE'
    });
    setServerError('');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleToggleBlock = async (user: any) => {
    try {
      const newStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      await api.patch(`/users/${user.id}`, { status: newStatus });
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to toggle user status', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchTeamDetails = useCallback(async () => {
    try {
      const res = await api.get(`/teams`);
      const currentTeam = res.data.find((t: any) => t.id === teamId);
      setTeam(currentTeam);
    } catch (err) {
      console.error('Failed to fetch team details', err);
    }
  }, [teamId]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        teamId,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await api.get(`/users?${query.toString()}`);
      setUsers(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotalUsers(res.data.total);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }, [teamId, page, sortBy, sortOrder, debouncedSearch, statusFilter]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get(`/roles?teamId=${teamId}`);
      setRoles(res.data);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeamDetails();
    fetchRoles();
  }, [fetchTeamDetails, fetchRoles]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const onSubmit = async (data: UserFormValues) => {
    setSubmitting(true);
    setServerError('');
    
    try {
      if (isEditMode && selectedUser) {
        // Handle Edit: Use PATCH
        const updateData: any = {
          name: data.name,
          phone: data.phone,
          roleId: data.roleId,
          status: data.status
        };
        // Only send password if it was changed (not typical for this modal but good to have)
        if (data.password) {
          updateData.password = data.password;
        }
        
        await api.patch(`/users/${selectedUser.id}`, updateData);
      } else {
        // Handle Create: Use POST
        await api.post('/users', { ...data, teamId, status: 'ACTIVE' });
      }
      
      setIsModalOpen(false);
      reset();
      fetchUsers();
    } catch (err: any) {
      setServerError(err.response?.data?.message || err.message || `Failed to ${isEditMode ? 'update' : 'create'} user.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 font-medium">
            <Link href="/admin/teams" className="hover:text-primary transition-colors">Teams</Link>
            <span>/</span>
            <span className="text-foreground">{team?.name || 'Loading...'}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
             <div className="p-2 rounded-xl bg-primary/10">
               <Users className="h-7 w-7 text-primary" />
             </div>
             {team?.name} Members
          </h1>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            Managing <span className="text-foreground font-bold">{totalUsers}</span> accounts within this team structure
          </p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          <UserPlus className="h-4 w-4 stroke-[3px]" />
          Add Team Member
        </button>
      </div>

      {/* Filters & Search Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-card/50 p-4 rounded-2xl border border-border/60 backdrop-blur-sm">
        <div className="md:col-span-6 relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        
        <div className="md:col-span-3 relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 text-foreground text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="md:col-span-3 flex items-center justify-end text-sm text-muted-foreground gap-2 font-medium">
           Showing {users.length} of {totalUsers}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm backdrop-blur-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/40">
                <th 
                  className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase cursor-pointer hover:text-primary transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Member Name
                    <ArrowUpDown className={`h-3 w-3 ${sortBy === 'name' ? 'text-primary' : 'opacity-30'}`} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase cursor-pointer hover:text-primary transition-colors"
                  onClick={() => toggleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email Address
                    <ArrowUpDown className={`h-3 w-3 ${sortBy === 'email' ? 'text-primary' : 'opacity-30'}`} />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Linked Role</th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase cursor-pointer hover:text-primary transition-colors"
                  onClick={() => toggleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Access Status
                    <ArrowUpDown className={`h-3 w-3 ${sortBy === 'status' ? 'text-primary' : 'opacity-30'}`} />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 italic text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                      Fetching directory data...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center italic text-muted-foreground font-medium">
                    No members matching your criteria were found.
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 opacity-40" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/5 text-orange-600 border border-orange-500/10 text-[11px] font-bold">
                        <ShieldCheck className="h-3 w-3" />
                        {user.role?.name || 'Unassigned'}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      user.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                      user.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                      user.status === 'SUSPENDED' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                      'bg-red-500/10 text-red-600 border-red-500/20'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block text-left">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                        className={`p-2 rounded-lg transition-colors ${activeMenuId === user.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {activeMenuId === user.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-card border border-border shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                             <button 
                               onClick={() => handleOpenEditModal(user)}
                               className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-colors border-b border-border/50"
                             >
                               <Edit className="h-3.5 w-3.5 text-primary" />
                               Edit Profile
                             </button>
                             <button 
                               onClick={() => { handleToggleBlock(user); setActiveMenuId(null); }}
                               className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-colors border-b border-border/50"
                             >
                               {user.status === 'SUSPENDED' ? (
                                 <>
                                   <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                   Unblock User
                                 </>
                               ) : (
                                 <>
                                   <Ban className="h-3.5 w-3.5 text-orange-500" />
                                   Block User
                                 </>
                               )}
                             </button>
                             <button 
                               onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); setActiveMenuId(null); }}
                               className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/5 transition-colors"
                             >
                               <Trash2 className="h-3.5 w-3.5" />
                               Delete Member
                             </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium">
            Page <span className="text-foreground">{page}</span> of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                    page === i + 1 
                      ? "bg-primary text-white shadow-sm" 
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-md p-7 rounded-[24px] border border-border/10 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  {isEditMode ? 'Edit Profile' : 'Provision Member'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {isEditMode ? `Updating ${selectedUser?.name}` : 'Bypasses registration approval'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="h-8 w-8 rounded-full flex items-center justify-center bg-muted hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            {serverError && <div className="p-3 text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl">{serverError}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <input 
                    {...register('name')}
                    type="text" 
                    className={`w-full px-4 py-3 rounded-xl border bg-background/50 text-sm font-medium transition-all ${
                      errors.name ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border/60 focus:ring-2 focus:ring-primary/20'
                    }`}
                    placeholder="Enter full name"
                  />
                  <InputError message={errors.name?.message} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Email Address</label>
                  <input 
                    {...register('email')}
                    type="email" 
                    readOnly={isEditMode}
                    className={`w-full px-4 py-3 rounded-xl border bg-background/50 text-sm font-medium transition-all ${
                      isEditMode ? 'opacity-60 cursor-not-allowed bg-muted/20' : 
                      errors.email ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border/60 focus:ring-2 focus:ring-primary/20'
                    }`}
                    placeholder="name@company.com"
                  />
                  <InputError message={errors.email?.message} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      {isEditMode ? 'New Password (Optional)' : 'Password'}
                    </label>
                    <div className="relative">
                      <input 
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'} 
                        className={`w-full px-4 py-3 pr-10 rounded-xl border bg-background/50 text-sm font-medium transition-all ${
                          errors.password ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border/60 focus:ring-2 focus:ring-primary/20'
                        }`}
                        placeholder={isEditMode ? 'Keep current' : '••••••••'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <InputError message={errors.password?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Phone (Optional)</label>
                    <input 
                      {...register('phone')}
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="+1..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Assigned Role</label>
                    <select 
                      {...register('roleId')}
                      className={`w-full px-4 py-3 rounded-xl border bg-background/50 text-sm font-black transition-all appearance-none cursor-pointer ${
                        errors.roleId ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border/60 focus:ring-2 focus:ring-primary/20'
                      }`}
                    >
                      <option value="">Choose a Role</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <InputError message={errors.roleId?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Status</label>
                    <select 
                      {...register('status')}
                      className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 text-sm font-black focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="PENDING">Pending</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-5 py-3 rounded-xl border border-border bg-background hover:bg-muted font-bold text-sm transition-all active:scale-95"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-[2] px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Provisioning...'}
                    </>
                  ) : (
                    isEditMode ? 'Save Changes' : 'Finish Provisioning'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-sm p-7 rounded-[24px] border border-red-500/20 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                <Trash2 size={28} />
              </div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Delete Member?</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Are you sure you want to remove <span className="text-foreground font-bold">{selectedUser?.name}</span>? This action is permanent.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="flex-1 px-5 py-3 rounded-xl border border-border bg-background hover:bg-muted font-bold text-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="flex-1 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-xl shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
