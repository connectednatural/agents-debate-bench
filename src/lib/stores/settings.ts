/**
 * Settings Store
 * Zustand store for user preferences and API keys with localStorage persistence
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  geminiApiKey: string;
  exaApiKey: string;
  model: string;
  maxParallelism: 1 | 2 | 3;

  setGeminiApiKey: (key: string) => void;
  setExaApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setMaxParallelism: (n: 1 | 2 | 3) => void;
  hasRequiredKeys: () => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      geminiApiKey: "",
      exaApiKey: "",
      model: "gemini-3-flash-preview",
      maxParallelism: 2,

      setGeminiApiKey: (key: string) => set({ geminiApiKey: key }),
      setExaApiKey: (key: string) => set({ exaApiKey: key }),
      setModel: (model: string) => set({ model }),
      setMaxParallelism: (n: 1 | 2 | 3) => set({ maxParallelism: n }),
      hasRequiredKeys: () => {
        const state = get();
        return (
          (state.geminiApiKey.length > 0 ||
            !!process.env.GOOGLE_GENERATIVE_AI_API_KEY) &&
          (state.exaApiKey.length > 0 || !!process.env.EXA_API_KEY)
        );
      },
    }),
    {
      name: "tech-referee-settings",
    }
  )
);
