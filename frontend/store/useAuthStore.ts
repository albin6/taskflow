import { create } from 'zustand';

interface AuthUser {
  userId: string;
  email: string;
  name: string;
  teamId: string | null;
  roleId: string | null;
  level: number;
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (partialUser: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Safe-check hydration from localStorage if running on Client side
  const token = typeof window !== 'undefined' ? localStorage.getItem('taskflow_token') : null;
  const user = typeof window !== 'undefined' ? localStorage.getItem('taskflow_user') : null;

  return {
    user: user ? JSON.parse(user) : null,
    token: token || null,

    setAuth: (user, token) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('taskflow_token', token);
        localStorage.setItem('taskflow_user', JSON.stringify(user));
      }
      set({ user, token });
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('taskflow_token');
        localStorage.removeItem('taskflow_user');
      }
      set({ user: null, token: null });
    },

    updateUser: (partialUser) => {
      set((state) => {
        const newUser = state.user ? { ...state.user, ...partialUser } : null;
        if (typeof window !== 'undefined' && newUser) {
          localStorage.setItem('taskflow_user', JSON.stringify(newUser));
        }
        return { user: newUser };
      });
    },
  };
});
