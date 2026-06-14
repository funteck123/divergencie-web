"use client";

import { useState, useMemo } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Inbox
} from "lucide-react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  sortKey?: string;
}

interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  rowsPerPage?: number;
}

export function DataGrid<T extends { id: string | number }>({
  columns,
  data,
  searchPlaceholder = "Search records...",
  searchFields,
  rowsPerPage = 10,
}: DataGridProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Filter and Sort Data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm && searchFields && searchFields.length > 0) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((row) =>
        searchFields.some((field) => {
          const value = row[field];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(lowerSearch);
        })
      );
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const key = sortConfig.key as keyof T;
        let aVal = a[key];
        let bVal = b[key];

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, searchFields, sortConfig]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedData.slice(start, start + rowsPerPage);
  }, [processedData, currentPage, rowsPerPage]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {searchFields && searchFields.length > 0 && (
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--text-muted)]">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-[var(--border-subtle)] rounded-xl bg-white dark:bg-[var(--bg-primary)] text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-all"
          />
        </div>
      )}

      {/* Grid Container */}
      <div className="border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]/40 border-b border-[var(--border-subtle)]">
                {columns.map((col, idx) => {
                  const sortKey = col.sortKey || (typeof col.accessor === "string" ? (col.accessor as string) : "");
                  const isSortable = col.sortable !== false && !!sortKey;
                  const isSorted = sortConfig?.key === sortKey;

                  return (
                    <th
                      key={idx}
                      onClick={() => isSortable && handleSort(sortKey)}
                      className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border-r border-[var(--border-subtle)] last:border-r-0 ${
                        isSortable ? "cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.header}
                        {isSortable && (
                          <span className="text-[var(--text-muted)]">
                            {isSorted ? (
                              sortConfig.direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                            ) : (
                              <ChevronsUpDown size={12} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16">
                    <Inbox className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">
                      No Records Found
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      No matching records match the criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIdx) => (
                  <tr
                    key={row.id || rowIdx}
                    className="hover:bg-[var(--bg-secondary)]/30 dark:hover:bg-white/5 transition-colors"
                  >
                    {columns.map((col, colIdx) => {
                      const value =
                        typeof col.accessor === "function"
                          ? col.accessor(row)
                          : (row[col.accessor] as any);

                      return (
                        <td
                          key={colIdx}
                          className="px-6 py-4 text-xs font-medium text-[var(--text-primary)] border-r border-[var(--border-subtle)] last:border-r-0"
                        >
                          {value ?? <span className="text-[var(--text-muted)] opacity-50">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 dark:bg-[var(--bg-primary)]/10 flex items-center justify-between gap-4">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">
              Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
              {Math.min(currentPage * rowsPerPage, processedData.length)} of {processedData.length} entries
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)] disabled:opacity-50 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const isSelected = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      isSelected
                        ? "bg-[var(--gold)] text-white"
                        : "border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-primary)] disabled:opacity-50 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
