"use client";

import React from "react";

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const normalizedRole = role.toLowerCase();
  
  const roleColors: Record<string, string> = {
    student: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/40",
    parent: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40",
    teacher: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/40",
    staff: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40",
    ambassador: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40",
    management: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/40",
  };

  const colorClass = roleColors[normalizedRole] || "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-900/40";

  return (
    <span className={`inline-block text-[9px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded-sm ${colorClass}`}>
      {role}
    </span>
  );
}
