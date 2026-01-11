"use client";

import { memo, useCallback } from "react";
import { useSessionStore } from "@/lib/stores/session";
import type { ComparisonSession, SessionStatus } from "@/lib/types";

export interface SessionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
}

const StatusBadge = memo(function StatusBadge({ status }: { status: SessionStatus }) {
  const statusConfig: Record<SessionStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-stone-100 text-stone-600" },
    planning: { label: "Planning", className: "bg-sky-100 text-sky-600" },
    advocating: { label: "Research", className: "bg-violet-100 text-violet-600" },
    "cross-examining": { label: "Debate", className: "bg-amber-100 text-amber-600" },
    refereeing: { label: "Verdict", className: "bg-indigo-100 text-indigo-600" },
    complete: { label: "Done", className: "bg-green-100 text-green-600" },
    error: { label: "Error", className: "bg-red-100 text-red-600" },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono uppercase tracking-wider rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
});

const SessionItem = memo(function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: ComparisonSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const truncateQuery = (query: string, maxLength: number = 50) => {
    if (query.length <= maxLength) return query;
    return query.slice(0, maxLength).trim() + "...";
  };

  return (
    <div
      onClick={onSelect}
      className={`
        group relative p-3 rounded-xl cursor-pointer transition-all duration-200
        ${
          isActive
            ? "bg-amber-50 border-2 border-amber-300 shadow-sm"
            : "hover:bg-stone-50 border-2 border-transparent hover:border-stone-200"
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 line-clamp-2 leading-snug">
            {truncateQuery(session.query)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={session.status} />
            <span className="text-xs text-stone-400 font-mono">
              {formatDate(session.createdAt)}
            </span>
          </div>
          {session.plan && (
            <div className="flex flex-wrap gap-1 mt-2">
              {session.plan.options.slice(0, 3).map((opt, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-stone-100 text-stone-600 rounded"
                >
                  {opt}
                </span>
              ))}
              {session.plan.options.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] text-stone-400">
                  +{session.plan.options.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
});

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 mb-6 rounded-2xl bg-stone-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-base font-serif text-stone-700 mb-2">
        No comparisons yet
      </h3>
      <p className="text-sm text-stone-500 max-w-[200px]">
        Start a new comparison to see your history here
      </p>
    </div>
  );
});

export const SessionHistory = memo(function SessionHistory({
  isOpen,
  onClose,
  onSelectSession,
}: SessionHistoryProps) {
  const { sessions, currentSessionId, deleteSession, setCurrentSession } = useSessionStore();

  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSession(sessionId);
    onSelectSession(sessionId);
  }, [setCurrentSession, onSelectSession]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    if (confirm("Delete this comparison?")) {
      deleteSession(sessionId);
    }
  }, [deleteSession]);

  const handleClearAll = useCallback(() => {
    if (confirm("Delete all comparisons? This cannot be undone.")) {
      sessions.forEach((s) => deleteSession(s.id));
    }
  }, [sessions, deleteSession]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          w-80 bg-[#faf9f7]
          border-r border-stone-200
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col shadow-xl lg:shadow-none
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-base font-serif text-stone-800">
              History
            </h2>
            {sessions.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-mono bg-stone-100 text-stone-500 rounded-full">
                {sessions.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {sessions.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                title="Clear all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-3">
          {sessions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={() => handleSelectSession(session.id)}
                  onDelete={() => handleDeleteSession(session.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-stone-200 bg-stone-50">
          <p className="text-xs text-stone-400 text-center font-mono">
            Sessions stored locally
          </p>
        </div>
      </aside>
    </>
  );
});

export default SessionHistory;
