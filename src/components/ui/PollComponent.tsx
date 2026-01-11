"use client";

import React, { memo, useState, useCallback } from "react";
import type { ClarificationQuestion } from "@/lib/types";

export interface PollComponentProps {
  question: ClarificationQuestion;
  onAnswer: (answer: string | string[]) => void;
  disabled?: boolean;
}

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
        w-full px-4 py-3.5 text-left rounded-xl border-2 transition-all duration-200
        ${
          isSelected
            ? "border-amber-500 bg-amber-50 shadow-sm"
            : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
            ${
              isSelected
                ? "border-amber-500 bg-amber-500"
                : "border-stone-300"
            }
          `}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <span className={`text-sm font-medium ${isSelected ? "text-amber-800" : "text-stone-700"}`}>
          {option}
        </span>
      </div>
    </button>
  );
});

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
        w-full px-4 py-3.5 text-left rounded-xl border-2 transition-all duration-200
        ${
          isSelected
            ? "border-amber-500 bg-amber-50 shadow-sm"
            : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-all
            ${
              isSelected
                ? "border-amber-500 bg-amber-500"
                : "border-stone-300"
            }
          `}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className={`text-sm font-medium ${isSelected ? "text-amber-800" : "text-stone-700"}`}>
          {option}
        </span>
      </div>
    </button>
  );
});

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
          flex-1 px-4 py-3 rounded-xl border-2 border-stone-200
          bg-white text-sm
          focus:outline-none focus:border-amber-500
          transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className={`
          px-4 py-3 rounded-xl bg-stone-100 text-sm font-medium
          hover:bg-stone-200 transition-colors
          ${disabled || !value.trim() ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        Add
      </button>
    </div>
  );
});

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
    <div className="my-4 p-5 border-2 border-stone-200 rounded-2xl bg-white shadow-sm">
      {/* Question */}
      <h4 className="text-base font-serif font-medium text-stone-800 mb-1">
        {question.question}
      </h4>

      {/* Type indicator */}
      {question.type === "multi" && (
        <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-4">[Select all that apply]</p>
      )}
      {question.type === "single" && (
        <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-4">[Choose one]</p>
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
                w-full px-4 py-3 rounded-xl border-2 border-stone-200
                bg-white text-sm resize-none
                focus:outline-none focus:border-amber-500
                transition-colors
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            />
          ) : (
            <CustomInput
              value={customInput}
              onChange={setCustomInput}
              onSubmit={handleAddCustom}
              disabled={disabled || submitted}
              placeholder="Or type your own..."
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
            w-full px-4 py-3.5 rounded-xl font-mono text-sm uppercase tracking-widest transition-all duration-200
            ${
              canSubmit && !disabled
                ? "bg-stone-900 text-white hover:bg-amber-700 shadow-lg"
                : "bg-stone-100 text-stone-400 cursor-not-allowed"
            }
          `}
        >
          Continue
        </button>
      )}

      {/* Submitted state */}
      {submitted && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-green-700">Answer submitted</span>
        </div>
      )}
    </div>
  );
});

export default PollComponent;
