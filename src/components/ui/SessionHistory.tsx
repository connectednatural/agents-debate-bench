"use client";

import { memo, useCallback } from "react";
import { useSessionStore } from "@/lib/stores/session";
import type { ComparisonSession, SessionStatus } from "@/lib/types";

export interface SessionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
}

/**
 * Status badge component
 */
const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status: SessionStatus;
}) {
  const statusConfig: Record<SessionStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" },
    planning: { label: "Planning", className: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
    advocating: { label: "Advocating", className: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
    "cross-examining": { label: "Cross-Exam", className: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
    refereeing: { label: "Refereeing", className: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
    complete: { label: "Complete", className: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
    error: { label: "Error", className: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" },
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
});

/**
 * Session item component
 */
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

  // Format date
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

  // Truncate query for display
  const truncateQuery = (query: string, maxLength: number = 60) => {
    if (query.length <= maxLength) return query;
    return query.slice(0, maxLength).trim() + "...";
  };

  return (
    <div
      onClick={onSelect}
      className={`
        group relative p-3 rounded-lg cursor-pointer transition-all
        ${
          isActive
            ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-transparent"
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
            {truncateQuery(session.query)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={session.status} />
            <span className="text-xs text-zinc-400">
              {formatDate(session.createdAt)}
            </span>
          </div>
          {session.plan && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {session.plan.options.join(" vs ")}
            </p>
          )}
        </div>
        
        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          title="Delete session"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
});

/**
 * Empty state component
 */
const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        No comparisons yet
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Start a new comparison to see it here
      </p>
    </div>
  );
});


/**
 * SessionHistory Component
 * 
 * Sidebar displaying list of past comparisons with ability to select and delete.
 * Requirements: 8.2, 8.3, 8.4
 */
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
    if (confirm("Are you sure you want to delete this comparison?")) {
      deleteSession(sessionId);
    }
  }, [deleteSession]);

  const handleClearAll = useCallback(() => {
    if (confirm("Are you sure you want to delete all comparisons? This cannot be undone.")) {
      sessions.forEach((s) => deleteSession(s.id));
    }
  }, [sessions, deleteSession]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          w-80 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            History
          </h2>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Clear all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-1">
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
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
            {sessions.length} comparison{sessions.length !== 1 ? "s" : ""} saved
          </p>
        </div>
      </aside>
    </>
  );
});

export default SessionHistory;
