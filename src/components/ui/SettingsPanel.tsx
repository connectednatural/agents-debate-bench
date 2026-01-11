"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { useSettingsStore } from "@/lib/stores/settings";

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * API Key input field with show/hide toggle
 */
const ApiKeyInput = memo(function ApiKeyInput({
  label,
  value,
  onChange,
  placeholder,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  description?: string;
}) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      {description && (
        <p className="text-xs text-stone-500">{description}</p>
      )}
      <div className="relative">
        <input
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-12 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
        >
          {showKey ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      {value && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Key configured</span>
        </div>
      )}
    </div>
  );
});

/**
 * Model selector dropdown
 */
const ModelSelector = memo(function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const models = [
    { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)", description: "Fast and efficient" },
    { id: "gemini-2.5-flash-preview-05-20", name: "Gemini 2.5 Flash", description: "Balanced performance" },
    { id: "gemini-2.5-pro-preview-05-06", name: "Gemini 2.5 Pro", description: "Most capable" },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-700">
        Model
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} - {model.description}
          </option>
        ))}
      </select>
    </div>
  );
});

/**
 * Parallelism slider
 */
const ParallelismSlider = memo(function ParallelismSlider({
  value,
  onChange,
}: {
  value: 1 | 2 | 3;
  onChange: (value: 1 | 2 | 3) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-stone-700">
          Max Parallel Agents
        </label>
        <span className="text-sm font-mono text-amber-600">{value}</span>
      </div>
      <p className="text-xs text-stone-500">
        Number of advocate agents that can run simultaneously
      </p>
      <input
        type="range"
        min={1}
        max={3}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) as 1 | 2 | 3)}
        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
      <div className="flex justify-between text-xs text-stone-400">
        <span>1 (Sequential)</span>
        <span>2</span>
        <span>3 (Max)</span>
      </div>
    </div>
  );
});


/**
 * SettingsPanel Component
 */
export const SettingsPanel = memo(function SettingsPanel({
  isOpen,
  onClose,
}: SettingsPanelProps) {
  const {
    geminiApiKey,
    exaApiKey,
    model,
    maxParallelism,
    setGeminiApiKey,
    setExaApiKey,
    setModel,
    setMaxParallelism,
  } = useSettingsStore();

  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [localExaKey, setLocalExaKey] = useState(exaApiKey);
  const [localModel, setLocalModel] = useState(model);
  const [localParallelism, setLocalParallelism] = useState(maxParallelism);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalGeminiKey(geminiApiKey);
      setLocalExaKey(exaApiKey);
      setLocalModel(model);
      setLocalParallelism(maxParallelism);
      setHasChanges(false);
    }
  }, [isOpen, geminiApiKey, exaApiKey, model, maxParallelism]);

  useEffect(() => {
    const changed =
      localGeminiKey !== geminiApiKey ||
      localExaKey !== exaApiKey ||
      localModel !== model ||
      localParallelism !== maxParallelism;
    setHasChanges(changed);
  }, [localGeminiKey, localExaKey, localModel, localParallelism, geminiApiKey, exaApiKey, model, maxParallelism]);

  const handleSave = useCallback(() => {
    setGeminiApiKey(localGeminiKey);
    setExaApiKey(localExaKey);
    setModel(localModel);
    setMaxParallelism(localParallelism);
    onClose();
  }, [localGeminiKey, localExaKey, localModel, localParallelism, setGeminiApiKey, setExaApiKey, setModel, setMaxParallelism, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 bg-[#faf9f7] rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-serif text-stone-800">
            Settings
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* API Keys Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono text-stone-500 uppercase tracking-widest">
              [ API Keys ]
            </h3>
            
            <ApiKeyInput
              label="Gemini API Key"
              value={localGeminiKey}
              onChange={setLocalGeminiKey}
              placeholder="AIza..."
              description="Get your key from Google AI Studio"
            />

            <ApiKeyInput
              label="Exa API Key"
              value={localExaKey}
              onChange={setLocalExaKey}
              placeholder="exa-..."
              description="Get your key from exa.ai (optional, enables web search)"
            />
          </div>

          {/* Model Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono text-stone-500 uppercase tracking-widest">
              [ Model Settings ]
            </h3>
            
            <ModelSelector value={localModel} onChange={setLocalModel} />
          </div>

          {/* Performance Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono text-stone-500 uppercase tracking-widest">
              [ Performance ]
            </h3>
            
            <ParallelismSlider
              value={localParallelism}
              onChange={setLocalParallelism}
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-medium">Your keys are stored locally</p>
                <p className="mt-1 text-amber-700">
                  API keys are saved in your browser&apos;s local storage and only sent to our servers when you are making a request and are never stored.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 bg-stone-50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              hasChanges
                ? "bg-stone-900 text-white hover:bg-amber-700"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
});

export default SettingsPanel;
