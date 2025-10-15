import { create } from 'zustand';

interface AppState {
  loading: boolean;
  setLoading: (value: boolean) => void;
}

export const appStore = create<AppState>((set) => ({
  loading: false,
  setLoading: (value) => set({ loading: value }),
}));