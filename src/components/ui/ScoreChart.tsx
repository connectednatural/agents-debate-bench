"use client";

import React, { memo } from "react";
import type { AxisScore } from "@/lib/types";

export interface ScoreChartProps {
  scores: AxisScore[];
  options: string[];
}

// Color palette for different options
const OPTION_COLORS = [
  { bg: "bg-blue-500", text: "text-blue-500", light: "bg-blue-100 dark:bg-blue-900/30" },
  { bg: "bg-emerald-500", text: "text-emerald-500", light: "bg-emerald-100 dark:bg-emerald-900/30" },
  { bg: "bg-amber-500", text: "text-amber-500", light: "bg-amber-100 dark:bg-amber-900/30" },
  { bg: "bg-purple-500", text: "text-purple-500", light: "bg-purple-100 dark:bg-purple-900/30" },
  { bg: "bg-rose-500", text: "text-rose-500", light: "bg-rose-100 dark:bg-rose-900/30" },
];

/**
 * Get color for an option based on its index
 */
function getOptionColor(index: number) {
  return OPTION_COLORS[index % OPTION_COLORS.length];
}

/**
 * ScoreBar Component
 * Renders a single score bar with animation
 */
const ScoreBar = memo(function ScoreBar({
  score,
  maxScore = 10,
  color,
  label,
}: {
  score: number;
  maxScore?: number;
  color: typeof OPTION_COLORS[0];
  label: string;
}) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium w-20 truncate ${color.text}`} title={label}>
        {label}
      </span>
      <div className="flex-1 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color.bg} rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2`}
          style={{ width: `${percentage}%` }}
        >
          {percentage > 15 && (
            <span className="text-xs font-bold text-white">{score}</span>
          )}
        </div>
      </div>
      {percentage <= 15 && (
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 w-6">
          {score}
        </span>
      )}
    </div>
  );
});

/**
 * AxisScoreGroup Component
 * Renders scores for a single axis across all options
 */
const AxisScoreGroup = memo(function AxisScoreGroup({
  axisScore,
  options,
}: {
  axisScore: AxisScore;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
        {axisScore.axis}
      </h4>
      <div className="space-y-2">
        {options.map((option, index) => {
          const score = axisScore.scores[option] ?? 0;
          const color = getOptionColor(index);
          return (
            <ScoreBar
              key={`${axisScore.axis}-${option}`}
              score={score}
              color={color}
              label={option}
            />
          );
        })}
      </div>
    </div>
  );
});

/**
 * Legend Component
 * Shows color mapping for each option
 */
const Legend = memo(function Legend({ options }: { options: string[] }) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {options.map((option, index) => {
        const color = getOptionColor(index);
        return (
          <div key={option} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color.bg}`} />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{option}</span>
          </div>
        );
      })}
    </div>
  );
});

/**
 * ScoreChart Component
 * 
 * Renders a visual score comparison from _Score{axis:opt1=N,opt2=N} data.
 * Displays scores for all options on each axis with colored bars.
 * 
 * @example
 * // _Score{Performance:React=8,Vue=7,Angular=6}
 * // _Score{DX:React=9,Vue=8,Angular=7}
 * <ScoreChart
 *   scores={[
 *     { axis: "Performance", scores: { React: 8, Vue: 7, Angular: 6 } },
 *     { axis: "DX", scores: { React: 9, Vue: 8, Angular: 7 } }
 *   ]}
 *   options={["React", "Vue", "Angular"]}
 * />
 */
export const ScoreChart = memo(function ScoreChart({
  scores,
  options,
}: ScoreChartProps) {
  if (scores.length === 0 || options.length === 0) {
    return (
      <div className="my-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-zinc-500">
        No score data available
      </div>
    );
  }

  // Calculate overall scores for summary
  const overallScores = options.map((option) => {
    const total = scores.reduce((sum, axis) => sum + (axis.scores[option] ?? 0), 0);
    const avg = total / scores.length;
    return { option, total, avg: Math.round(avg * 10) / 10 };
  });

  // Sort by average score descending
  const sortedOverall = [...overallScores].sort((a, b) => b.avg - a.avg);

  return (
    <div className="my-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Score Comparison
        </h3>
        <span className="text-xs text-zinc-500">Scale: 1-10</span>
      </div>

      {/* Legend */}
      <Legend options={options} />

      {/* Score bars by axis */}
      <div className="space-y-6">
        {scores.map((axisScore) => (
          <AxisScoreGroup
            key={axisScore.axis}
            axisScore={axisScore}
            options={options}
          />
        ))}
      </div>

      {/* Overall summary */}
      {scores.length > 1 && (
        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Overall Average
          </h4>
          <div className="flex flex-wrap gap-4">
            {sortedOverall.map((item, index) => {
              const color = getOptionColor(options.indexOf(item.option));
              return (
                <div
                  key={item.option}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${color.light}`}
                >
                  {index === 0 && (
                    <span className="text-yellow-500">🏆</span>
                  )}
                  <span className={`font-medium ${color.text}`}>{item.option}</span>
                  <span className="text-zinc-600 dark:text-zinc-400 font-mono">
                    {item.avg}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default ScoreChart;
