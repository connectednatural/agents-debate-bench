"use client";

import { useState, useCallback } from "react";
import { ComparisonChat, SettingsPanel, SessionHistory } from "@/components/ui";
import { useSettingsStore } from "@/lib/stores/settings";
import Link from "next/link";
import { Settings, Plus, Clock, Menu } from "lucide-react";

export default function BenchPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const { hasRequiredKeys } = useSettingsStore();

  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setHistoryOpen(false);
  }, []);

  const handleNewComparison = useCallback(() => {
    setSelectedSessionId(undefined);
  }, []);

  return (
    <div className="flex h-screen bg-[#faf9f7]">
      {/* Session History Sidebar */}
      <SessionHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectSession={handleSelectSession}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#faf9f7]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {/* Menu button */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2 text-stone-500 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <span className="text-xl font-serif italic text-stone-800 group-hover:text-amber-700 transition-colors">
                Tech Referee.
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* New comparison button */}
            <button
              onClick={handleNewComparison}
              className="flex items-center gap-2 px-4 py-2 text-sm font-mono uppercase tracking-wider text-stone-600 hover:text-stone-800 rounded-full hover:bg-stone-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>

            {/* History button */}
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-mono uppercase tracking-wider text-stone-600 hover:text-stone-800 rounded-full hover:bg-stone-100 transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className={`p-2.5 rounded-full transition-colors ${
                hasRequiredKeys()
                  ? "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
                  : "text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-300"
              }`}
              title={hasRequiredKeys() ? "Settings" : "Configure API keys"}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-hidden bg-[#faf9f7]">
          <div className="h-full max-w-4xl mx-auto">
            <ComparisonChat
              key={selectedSessionId || "new"}
              sessionId={selectedSessionId}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
