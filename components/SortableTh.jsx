"use client";

export default function SortableTh({ label, sortKeyName, sortKey, sortDir, onSort, className = "" }) {
  const active = sortKey === sortKeyName;
  return (
    <th
      className={className}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      onClick={() => onSort(sortKeyName)}
    >
      {label} {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}
