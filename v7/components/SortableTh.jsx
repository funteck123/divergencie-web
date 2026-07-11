"use client";

export default function SortableTh({ label, sortKeyName, sortKey, sortDir, onSort }) {
  const active = sortKey === sortKeyName;
  return (
    <th
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      onClick={() => onSort(sortKeyName)}
    >
      {label} {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}
