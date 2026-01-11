/**
 * Session Store
 * Zustand store for comparison session management with localStorage persistence
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.5
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ComparisonSession, SessionStatus, Transcript, TranscriptEntry } from "@/lib/types/schemas";

/**
 * Phases that can be completed before an error
 */
export type CompletedPhase = "planning" | "advocating" | "cross-examining";

/**
 * Extended session with partial result tracking
 */
export interface PartialSession extends ComparisonSession {
  completedPhases?: CompletedPhase[];
}

interface SessionState {
  sessions: PartialSession[];
  currentSessionId: string | null;

  createSession: (query: string) => string;
  updateSession: (id: string, data: Partial<PartialSession>) => void;
  deleteSession: (id: string) => void;
  getSession: (id: string) => PartialSession | undefined;
  setCurrentSession: (id: string | null) => void;
  
  /**
   * Mark a session as errored while preserving partial results
   * Requirements: 10.5 - Preserve partial results on error
   */
  markSessionError: (id: string, error: string, completedPhases?: CompletedPhase[]) => void;
  
  /**
   * Get completed phases for a session
   */
  getCompletedPhases: (id: string) => CompletedPhase[];
  
  /**
   * Check if a session has partial results
   */
  hasPartialResults: (id: string) => boolean;

  /**
   * Add a transcript entry to a session
   */
  addTranscriptEntry: (id: string, entry: Omit<TranscriptEntry, "id" | "timestamp">) => void;

  /**
   * Get the transcript for a session
   */
  getTranscript: (id: string) => Transcript | undefined;

  /**
   * Mark transcript as complete
   */
  completeTranscript: (id: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      createSession: (query: string) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const session: PartialSession = {
          id,
          query,
          createdAt: now,
          status: "pending",
          completedPhases: [],
          transcript: {
            entries: [{
              id: crypto.randomUUID(),
              timestamp: now,
              type: "user_query",
              content: query,
            }],
            startedAt: now,
          },
        };
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: id,
        }));
        return id;
      },

      updateSession: (id: string, data: Partial<PartialSession>) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        }));
      },

      deleteSession: (id: string) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSessionId:
            state.currentSessionId === id ? null : state.currentSessionId,
        }));
      },

      getSession: (id: string) => {
        return get().sessions.find((s) => s.id === id);
      },

      setCurrentSession: (id: string | null) => {
        set({ currentSessionId: id });
      },

      markSessionError: (id: string, error: string, completedPhases?: CompletedPhase[]) => {
        const session = get().getSession(id);
        if (!session) return;

        // Determine completed phases based on what data exists
        const phases: CompletedPhase[] = completedPhases || [];
        if (!completedPhases) {
          if (session.plan) phases.push("planning");
          if (session.arguments && session.arguments.length > 0) phases.push("advocating");
          if (session.crossExaminations && session.crossExaminations.length > 0) phases.push("cross-examining");
        }

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: "error" as SessionStatus,
                  error,
                  completedPhases: phases,
                }
              : s
          ),
        }));
      },

      getCompletedPhases: (id: string) => {
        const session = get().getSession(id);
        return session?.completedPhases || [];
      },

      hasPartialResults: (id: string) => {
        const session = get().getSession(id);
        if (!session) return false;
        
        return !!(
          session.plan ||
          (session.arguments && session.arguments.length > 0) ||
          (session.crossExaminations && session.crossExaminations.length > 0)
        );
      },

      addTranscriptEntry: (id: string, entry: Omit<TranscriptEntry, "id" | "timestamp">) => {
        const session = get().getSession(id);
        if (!session) return;

        const newEntry: TranscriptEntry = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };

        const currentTranscript = session.transcript || {
          entries: [],
          startedAt: session.createdAt,
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  transcript: {
                    ...currentTranscript,
                    entries: [...currentTranscript.entries, newEntry],
                  },
                }
              : s
          ),
        }));
      },

      getTranscript: (id: string) => {
        const session = get().getSession(id);
        return session?.transcript;
      },

      completeTranscript: (id: string) => {
        const session = get().getSession(id);
        if (!session?.transcript) return;

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id && s.transcript
              ? {
                  ...s,
                  transcript: {
                    ...s.transcript,
                    completedAt: new Date(),
                  },
                }
              : s
          ),
        }));
      },
    }),
    {
      name: "tech-referee-sessions",
    }
  )
);
