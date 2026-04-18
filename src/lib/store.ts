import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
}

interface AppState {
  user: User | null;
  token: string | null;
  currentView: string;
  selectedAgentId: string | null;
  activeConversationId: string | null;
  sidebarOpen: boolean;
  hydrated: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setCurrentView: (view: string) => void;
  setSelectedAgentId: (id: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  currentView: "dashboard",
  selectedAgentId: null,
  activeConversationId: null,
  sidebarOpen: true,
  hydrated: false,

  setAuth: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ds_token", token);
      localStorage.setItem("ds_user", JSON.stringify(user));
    }
    set({ user, token });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ds_token");
      localStorage.removeItem("ds_user");
    }
    set({
      user: null,
      token: null,
      currentView: "dashboard",
      selectedAgentId: null,
      activeConversationId: null,
    });
  },

  setCurrentView: (currentView) =>
    set({ currentView }),
  setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setHydrated: (hydrated) => set({ hydrated }),
}));
