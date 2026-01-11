"use client";

import React, { memo } from "react";
import type { ParsedTableColumn, TableColumnType } from "@/lib/utils/markdown-parser";

export interface ComparisonTableProps {
  columns: ParsedTableColumn[];
  rows: Record<string, string | number | boolean>[];
}

/**
 * Formats a cell value based on its column type
 */
function formatCellValue(
  value: string | number | boolean | undefined,
  type: TableColumnType
): React.ReactNode {
  if (value === undefined || value === null) {
    return <span className="text-zinc-400">—</span>;
  }

  switch (type) {
    case "boolean":
      const boolValue = typeof value === "boolean" ? value : value === "true";
      return boolValue ? (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="w-3 h-3 text-green-600 dark:text-green-400"
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
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            className="w-3 h-3 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </span>
      );

    case "number":
      const numValue = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(numValue)) {
        return <span className="text-zinc-400">—</span>;
      }
      return (
        <span className="font-mono text-sm tabular-nums">
          {numValue.toLocaleString()}
        </span>
      );

    case "string":
    default:
      return <span>{String(value)}</span>;
  }
}

/**
 * ComparisonTable Component
 * 
 * Renders a styled comparison table from _Table{col1:type,col2:type} data.
 * Supports string, number, and boolean column types with appropriate formatting.
 * 
 * @example
 * // _Table{Feature:string,React:boolean,Vue:boolean,Angular:boolean}
 * <ComparisonTable
 *   columns={[
 *     { name: "Feature", type: "string" },
 *     { name: "React", type: "boolean" },
 *     { name: "Vue", type: "boolean" },
 *     { name: "Angular", type: "boolean" }
 *   ]}
 *   rows={[
 *     { Feature: "Virtual DOM", React: true, Vue: true, Angular: false },
 *     { Feature: "TypeScript", React: true, Vue: true, Angular: true }
 *   ]}
 * />
 */
export const ComparisonTable = memo(function ComparisonTable({
  columns,
  rows,
}: ComparisonTableProps) {
  if (columns.length === 0) {
    return (
      <div className="my-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-zinc-500">
        No columns defined for table
      </div>
    );
  }

  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={`header-${column.name}-${index}`}
                scope="col"
                className={`
                  px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider
                  text-zinc-600 dark:text-zinc-300
                  ${index === 0 ? "rounded-tl-lg" : ""}
                  ${index === columns.length - 1 ? "rounded-tr-lg" : ""}
                `}
              >
                {column.name}
                <span className="ml-1 text-zinc-400 dark:text-zinc-500 lowercase font-normal">
                  ({column.type})
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
              >
                No data available
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                className={`
                  transition-colors
                  ${rowIndex % 2 === 0 ? "" : "bg-zinc-50/50 dark:bg-zinc-800/20"}
                  hover:bg-zinc-100 dark:hover:bg-zinc-800/40
                `}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${column.name}-${colIndex}`}
                    className={`
                      px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100
                      ${column.type === "boolean" ? "text-center" : ""}
                      ${column.type === "number" ? "text-right" : ""}
                    `}
                  >
                    {formatCellValue(row[column.name], column.type)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

export default ComparisonTable;
