"use client";

import React, { memo, useState, useCallback } from "react";
import type { ClarificationQuestion } from "@/lib/types";

export interface PollComponentProps {
  question: ClarificationQuestion;
  onAnswer: (answer: string | string[]) => void;
  disabled?: boolean;
}

/**
 * Single option button for single-select polls
 */
const SingleOption = memo(function SingleOption({
  option,
  isSelected,
  onSelect,
  disabled,
}: {
  option: string;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        w-full px-4 py-3 text-left rounded-lg border transition-all
        ${
          isSelected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center
            ${
              isSelected
                ? "border-blue-500 bg-blue-500"
                : "border-zinc-300 dark:border-zinc-600"
            }
          `}
        >
          {isSelected && (
            <div className="w-2 h-2 rounded-full bg-white" />
          )}
        </div>
        <span className="text-sm">{option}</span>
      </div>
    </button>
  );
});

/**
 * Multi-select checkbox option
 */
const MultiOption = memo(function MultiOption({
  option,
  isSelected,
  onToggle,
  disabled,
}: {
  option: string;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`
        w-full px-4 py-3 text-left rounded-lg border transition-all
        ${
          isSelected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            ${
              isSelected
                ? "border-blue-500 bg-blue-500"
                : "border-zinc-300 dark:border-zinc-600"
            }
          `}
        >
          {isSelected && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
        <span className="text-sm">{option}</span>
      </div>
    </button>
  );
});

/**
 * Custom text input field
 */
const CustomInput = memo(function CustomInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Enter your own answer...",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          flex-1 px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700
          bg-white dark:bg-zinc-900 text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className={`
          px-4 py-3 rounded-lg bg-blue-500 text-white text-sm font-medium
          hover:bg-blue-600 transition-colors
          ${disabled || !value.trim() ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        Add
      </button>
    </div>
  );
});

/**
 * PollComponent
 * 
 * Renders interactive poll components for clarification questions.
 * Supports single-select, multi-select, and text input modes.
 * 
 * @example
 * // Single select poll
 * <PollComponent
 *   question={{
 *     id: "q1",
 *     question: "Which framework are you comparing?",
 *     type: "single",
 *     options: ["React", "Vue", "Angular"],
 *     allowCustom: true
 *   }}
 *   onAnswer={(answer) => console.log(answer)}
 * />
 * 
 * @example
 * // Multi-select poll
 * <PollComponent
 *   question={{
 *     id: "q2",
 *     question: "What factors matter most?",
 *     type: "multi",
 *     options: ["Performance", "DX", "Community", "Cost"],
 *     allowCustom: false
 *   }}
 *   onAnswer={(answers) => console.log(answers)}
 * />
 */
export const PollComponent = memo(function PollComponent({
  question,
  onAnswer,
  disabled = false,
}: PollComponentProps) {
  const [selectedSingle, setSelectedSingle] = useState<string | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState("");
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Combine predefined options with custom ones
  const allOptions = [...(question.options || []), ...customOptions];

  const handleSingleSelect = useCallback((option: string) => {
    if (disabled || submitted) return;
    setSelectedSingle(option);
  }, [disabled, submitted]);

  const handleMultiToggle = useCallback((option: string) => {
    if (disabled || submitted) return;
    setSelectedMulti((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }
      return next;
    });
  }, [disabled, submitted]);

  const handleAddCustom = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed || customOptions.includes(trimmed)) return;
    
    setCustomOptions((prev) => [...prev, trimmed]);
    
    // Auto-select the custom option
    if (question.type === "single") {
      setSelectedSingle(trimmed);
    } else if (question.type === "multi") {
      setSelectedMulti((prev) => new Set([...prev, trimmed]));
    }
    
    setCustomInput("");
  }, [customInput, customOptions, question.type]);

  const handleSubmit = useCallback(() => {
    if (disabled || submitted) return;

    let answer: string | string[];
    
    if (question.type === "single") {
      if (!selectedSingle) return;
      answer = selectedSingle;
    } else if (question.type === "multi") {
      if (selectedMulti.size === 0) return;
      answer = Array.from(selectedMulti);
    } else {
      // Text type
      if (!customInput.trim()) return;
      answer = customInput.trim();
    }

    setSubmitted(true);
    onAnswer(answer);
  }, [disabled, submitted, question.type, selectedSingle, selectedMulti, customInput, onAnswer]);

  const canSubmit = 
    question.type === "single" ? !!selectedSingle :
    question.type === "multi" ? selectedMulti.size > 0 :
    !!customInput.trim();

  return (
    <div className="my-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
      {/* Question */}
      <h4 className="text-base font-medium text-zinc-800 dark:text-zinc-200 mb-4">
        {question.question}
      </h4>

      {/* Type indicator */}
      {question.type === "multi" && (
        <p className="text-xs text-zinc-500 mb-3">Select all that apply</p>
      )}

      {/* Options */}
      {question.type !== "text" && (
        <div className="space-y-2 mb-4">
          {allOptions.map((option) => (
            question.type === "single" ? (
              <SingleOption
                key={option}
                option={option}
                isSelected={selectedSingle === option}
                onSelect={() => handleSingleSelect(option)}
                disabled={disabled || submitted}
              />
            ) : (
              <MultiOption
                key={option}
                option={option}
                isSelected={selectedMulti.has(option)}
                onToggle={() => handleMultiToggle(option)}
                disabled={disabled || submitted}
              />
            )
          ))}
        </div>
      )}

      {/* Custom input */}
      {(question.allowCustom || question.type === "text") && !submitted && (
        <div className="mb-4">
          {question.type === "text" ? (
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              disabled={disabled}
              placeholder="Enter your answer..."
              rows={3}
              className={`
                w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700
                bg-white dark:bg-zinc-900 text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            />
          ) : (
            <CustomInput
              value={customInput}
              onChange={setCustomInput}
              onSubmit={handleAddCustom}
              disabled={disabled || submitted}
              placeholder="Or enter your own option..."
            />
          )}
        </div>
      )}

      {/* Submit button */}
      {!submitted && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !canSubmit}
          className={`
            w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors
            ${
              canSubmit && !disabled
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
            }
          `}
        >
          Submit Answer
        </button>
      )}

      {/* Submitted state */}
      {submitted && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm font-medium">Answer submitted</span>
        </div>
      )}
    </div>
  );
});

export default PollComponent;
