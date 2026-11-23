"use client";

import { useLayoutEffect } from "react";
import "@/ui2/styles/admin-white.css";

/** Marks the page as the admin portal while it is shown, so admin-white.css can turn the grey backgrounds white. Nothing is drawn. */
export function AdminWhite() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("u2-admin");
    return () => root.classList.remove("u2-admin");
  }, []);
  return null;
}
