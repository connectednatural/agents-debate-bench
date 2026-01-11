"use client";

import React, { memo } from "react";
import type { AxisScore } from "@/lib/types";

export interface ScoreChartProps {
  scores: AxisScore[];
  options: string[];
}

const OPTION_COLORS = [
  { bg: "bg-sky-500", text: "text-sky-600", light: "bg-sky-50", gradient: "from-sky-500 to-sky-600" },
  { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50", gradient: "from-emerald-500 to-emerald-600" },
  { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50", gradient: "from-amber-500 to-amber-600" },
  { bg: "bg-violet-500", text: "text-violet-600", light: "bg-violet-50", gradient: "from-violet-500 to-violet-600" },
  { bg: "bg-rose-500", text: "text-rose-600", light: "bg-rose-50", gradient: "from-rose-500 to-rose-600" },
];

function getOptionColor(index: number) {
  return OPTION_COLORS[index % OPTION_COLORS.length];
}

const ScoreBar = memo(function ScoreBar({
  score,
  maxScore = 10,
  color,
  label,
  rank,
}: {
  score: number;
  maxScore?: number;
  color: typeof OPTION_COLORS[0];
  label: string;
  rank?: number;
}) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-28 shrink-0">
        {rank === 1 && <span className="text-sm">1st</span>}
        {rank === 2 && <span className="text-sm text-stone-400">2nd</span>}
        {rank === 3 && <span className="text-sm text-stone-400">3rd</span>}
        <span className={`text-xs font-semibold truncate ${color.text}`} title={label}>
          {label}
        </span>
      </div>
      <div className="flex-1 h-8 bg-stone-100 rounded-lg overflow-hidden relative">
        <div
          className={`h-full bg-gradient-to-r ${color.gradient} rounded-lg transition-all duration-700 ease-out flex items-center`}
          style={{ width: `${percentage}%` }}
        >
          {percentage > 20 && (
            <span className="absolute right-2 text-xs font-bold text-white drop-shadow-sm">
              {score.toFixed(1)}
            </span>
          )}
        </div>
        {percentage <= 20 && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">
            {score.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
});

const AxisScoreGroup = memo(function AxisScoreGroup({
  axisScore,
  options,
}: {
  axisScore: AxisScore;
  options: string[];
}) {
  const sortedOptions = [...options].sort((a, b) => 
    (axisScore.scores[b] ?? 0) - (axisScore.scores[a] ?? 0)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-serif font-medium text-stone-700">
          {axisScore.axis}
        </h4>
        <div className="flex-1 h-px bg-stone-200"></div>
      </div>
      <div className="space-y-2">
        {sortedOptions.map((option, sortedIndex) => {
          const score = axisScore.scores[option] ?? 0;
          const originalIndex = options.indexOf(option);
          const color = getOptionColor(originalIndex);
          return (
            <ScoreBar
              key={`${axisScore.axis}-${option}`}
              score={score}
              color={color}
              label={option}
              rank={sortedIndex + 1}
            />
          );
        })}
      </div>
    </div>
  );
});

const Legend = memo(function Legend({ options }: { options: string[] }) {
  return (
    <div className="flex flex-wrap gap-3 mb-6 pb-4 border-b border-stone-200">
      {options.map((option, index) => {
        const color = getOptionColor(index);
        return (
          <div key={option} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color.bg}`} />
            <span className="text-sm font-medium text-stone-600">{option}</span>
          </div>
        );
      })}
    </div>
  );
});

const OverallWinner = memo(function OverallWinner({
  sortedOverall,
  options,
}: {
  sortedOverall: { option: string; total: number; avg: number }[];
  options: string[];
}) {
  const winner = sortedOverall[0];
  const winnerIndex = options.indexOf(winner.option);
  const color = getOptionColor(winnerIndex);

  return (
    <div className={`p-4 rounded-xl ${color.light} border border-stone-200`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-mono text-stone-500 uppercase tracking-wider">
              [Top Pick]
            </p>
            <p className={`text-lg font-serif font-medium ${color.text}`}>{winner.option}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-stone-800">{winner.avg.toFixed(1)}</p>
          <p className="text-xs text-stone-500 font-mono">avg score</p>
        </div>
      </div>
    </div>
  );
});

export const ScoreChart = memo(function ScoreChart({
  scores,
  options,
}: ScoreChartProps) {
  if (scores.length === 0 || options.length === 0) {
    return (
      <div className="my-6 p-8 border-2 border-dashed border-stone-200 rounded-2xl text-center">
        <svg className="w-12 h-12 mx-auto mb-3 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-stone-500">No score data available</p>
      </div>
    );
  }

  const overallScores = options.map((option) => {
    const total = scores.reduce((sum, axis) => sum + (axis.scores[option] ?? 0), 0);
    const avg = total / scores.length;
    return { option, total, avg: Math.round(avg * 10) / 10 };
  });

  const sortedOverall = [...overallScores].sort((a, b) => b.avg - a.avg);

  return (
    <div className="my-6 p-5 border-2 border-stone-200 rounded-2xl bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-serif font-medium text-stone-800">
            Score Comparison
          </h3>
        </div>
        <span className="text-xs font-mono text-stone-400 bg-stone-100 px-2 py-1 rounded-full">
          Scale: 1-10
        </span>
      </div>

      {/* Legend */}
      <Legend options={options} />

      {/* Overall winner */}
      {scores.length > 0 && <OverallWinner sortedOverall={sortedOverall} options={options} />}

      {/* Score bars by axis */}
      <div className="space-y-6 mt-6">
        {scores.map((axisScore) => (
          <AxisScoreGroup
            key={axisScore.axis}
            axisScore={axisScore}
            options={options}
          />
        ))}
      </div>

      {/* Summary table */}
      {scores.length > 1 && (
        <div className="mt-6 pt-4 border-t border-stone-200">
          <h4 className="text-sm font-serif font-medium text-stone-700 mb-3">
            Overall Rankings
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sortedOverall.map((item, index) => {
              const color = getOptionColor(options.indexOf(item.option));
              return (
                <div
                  key={item.option}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${color.light} border border-stone-100`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-stone-500">
                      {index === 0 ? "1st" : index === 1 ? "2nd" : index === 2 ? "3rd" : `#${index + 1}`}
                    </span>
                    <span className={`font-medium text-sm ${color.text}`}>{item.option}</span>
                  </div>
                  <span className="font-mono font-bold text-stone-700">
                    {item.avg.toFixed(1)}
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
