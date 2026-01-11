"use client";

import React, { memo, useState } from "react";
import type { ParsedTableColumn, TableColumnType } from "@/lib/utils/markdown-parser";

export interface ComparisonTableProps {
  columns: ParsedTableColumn[];
  rows: Record<string, string | number | boolean>[];
}

function formatCellValue(
  value: string | number | boolean | undefined,
  type: TableColumnType
): React.ReactNode {
  if (value === undefined || value === null || value === "") {
    return <span className="text-stone-400">—</span>;
  }

  switch (type) {
    case "boolean":
      const boolValue = typeof value === "boolean" ? value : String(value).toLowerCase() === "true";
      return boolValue ? (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
          <svg
            className="w-4 h-4 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      );

    case "number":
      const numValue = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(numValue)) {
        return <span className="text-stone-400">—</span>;
      }
      return (
        <span className="font-mono text-sm tabular-nums font-medium text-stone-700">
          {numValue.toLocaleString()}
        </span>
      );

    case "string":
    default:
      return <span className="text-stone-700">{String(value)}</span>;
  }
}

const MobileCard = memo(function MobileCard({
  row,
  columns,
  index,
}: {
  row: Record<string, string | number | boolean>;
  columns: ParsedTableColumn[];
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const firstColumn = columns[0];
  const title = row[firstColumn?.name] || `Row ${index + 1}`;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
      >
        <span className="font-medium text-stone-800">{String(title)}</span>
        <svg
          className={`w-5 h-5 text-stone-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-stone-100 pt-3">
          {columns.slice(1).map((column) => (
            <div key={column.name} className="flex items-center justify-between gap-4">
              <span className="text-sm text-stone-500">{column.name}</span>
              <div className="text-right">
                {formatCellValue(row[column.name], column.type)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export const ComparisonTable = memo(function ComparisonTable({
  columns,
  rows,
}: ComparisonTableProps) {
  if (columns.length === 0) {
    return (
      <div className="my-4 p-6 border border-stone-200 rounded-xl text-center text-stone-500">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        No columns defined for table
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="my-4 p-6 border border-stone-200 rounded-xl text-center text-stone-500">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        No data available
      </div>
    );
  }

  return (
    <div className="my-6">
      {/* Mobile view - Cards */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, rowIndex) => (
          <MobileCard
            key={`mobile-row-${rowIndex}`}
            row={row}
            columns={columns}
            index={rowIndex}
          />
        ))}
      </div>

      {/* Desktop view - Table */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-stone-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead>
              <tr className="bg-stone-50">
                {columns.map((column, index) => (
                  <th
                    key={`header-${column.name}-${index}`}
                    scope="col"
                    className={`
                      px-4 py-3.5 text-left text-xs font-mono uppercase tracking-wider
                      text-stone-600
                      ${index === 0 ? "sticky left-0 bg-stone-50 z-10" : ""}
                      ${column.type === "boolean" ? "text-center" : ""}
                      ${column.type === "number" ? "text-right" : ""}
                    `}
                  >
                    <div className="flex items-center gap-1.5">
                      {column.name}
                      <span className="text-stone-400 lowercase text-[10px]">
                        {column.type}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-100">
              {rows.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className="hover:bg-stone-50 transition-colors"
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={`cell-${rowIndex}-${column.name}-${colIndex}`}
                      className={`
                        px-4 py-3.5 text-sm whitespace-nowrap
                        ${colIndex === 0 ? "sticky left-0 bg-white font-medium z-10" : ""}
                        ${column.type === "boolean" ? "text-center" : ""}
                        ${column.type === "number" ? "text-right" : ""}
                      `}
                    >
                      {formatCellValue(row[column.name], column.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row count indicator */}
      <div className="mt-2 text-xs text-stone-400 text-right font-mono">
        {rows.length} row{rows.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
});

export default ComparisonTable;
