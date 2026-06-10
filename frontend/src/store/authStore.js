import { create } from 'zustand';
import Cookies from 'js-cookie';

const useAuthStore = create((set) => ({
  user: null,
  token: Cookies.get('token') || null,
  isAuthenticated: !!Cookies.get('token'),

  setAuth: (user, token) => {
    Cookies.set('token', token, { expires: 7 }); // Expires in 7 days
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    Cookies.remove('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const api = (await import('@/services/api')).default;
      const response = await api.get('/users/me');
      const data = response.data?.data || response.data;
      set({ user: data });
      return data;
    } catch (err) {
      console.warn('Failed to fetch user profile:', err);
      Cookies.remove('token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
