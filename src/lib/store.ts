import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  systemPrompt: string;
  icon: string;
  color: string;
  isDefault: boolean;
  creatorId?: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  agentId: string;
  updatedAt: string;
  messages?: Message[];
}

interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  configured: boolean;
  defaultModel: string;
  models: string[];
}

interface AppState {
  user: User | null;
  token: string | null;
  currentView: string;
  selectedAgentId: string | null;
  activeConversationId: string | null;
  sidebarOpen: boolean;
  hydrated: boolean;
  selectedProvider: string;
  availableProviders: ProviderInfo[];
  agents: Agent[];
  conversations: Conversation[];
  messages: Message[];
  isStreaming: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setCurrentView: (view: string) => void;
  setSelectedAgentId: (id: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  setSelectedProvider: (provider: string) => void;
  setAvailableProviders: (providers: ProviderInfo[]) => void;
  setAgents: (agents: Agent[]) => void;
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setIsStreaming: (streaming: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  currentView: "dashboard",
  selectedAgentId: null,
  activeConversationId: null,
  sidebarOpen: true,
  hydrated: false,
  selectedProvider: "auto",
  availableProviders: [],
  agents: [],
  conversations: [],
  messages: [],
  isStreaming: false,

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
      selectedProvider: "auto",
      agents: [],
      conversations: [],
      messages: [],
      isStreaming: false,
    });
  },

  setCurrentView: (currentView) => set({ currentView }),
  setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
  setActiveConversationId: (activeConversationId) =>
    set({ activeConversationId }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setHydrated: (hydrated) => set({ hydrated }),
  setSelectedProvider: (selectedProvider) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ds_provider", selectedProvider);
    }
    set({ selectedProvider });
  },
  setAvailableProviders: (availableProviders) => set({ availableProviders }),
  setAgents: (agents) => set({ agents }),
  setConversations: (conversations) => set({ conversations }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
}));
